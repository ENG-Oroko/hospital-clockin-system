// Location: apps/backend-api/src/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { db } from '@chronos/database';
import { TenantStorage } from './tenant.storage';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  
  private static readonly TENANT_KEY = 'tenantId';
  private static readonly GLOBAL_MODELS = ['Tenant', 'LicenseKey', 'SystemAuditLog'];
  private static readonly MUTATION_OPERATIONS = ['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany'];

  public readonly rawClient: PrismaClient = db;
  public readonly client: ReturnType<typeof this.createSecureClient>;

  constructor() {
    this.client = this.createSecureClient();
  }

  private createSecureClient() {
    const baseClient = this.rawClient;
    const tenantKey = PrismaService.TENANT_KEY;
    const globalModels = PrismaService.GLOBAL_MODELS;
    const mutationOperations = PrismaService.MUTATION_OPERATIONS;

    return baseClient.$extends({
      name: 'ChronosZeroTrustIsolationEngine',
      client: {
        /**
         * Intercepts transaction lifecycles to bind the session parameters to the current connection socket.
         */
        // Location: apps/backend-api/src/database/prisma.service.ts (Fully Hardened $transaction)

async $transaction<T>(this: any, args: any): Promise<T> {
  const tenantId = TenantStorage.getTenantId();
  
  // Exit Path 1: No active tenant context - pass through directly with explicit type assertion
  if (!tenantId) {
    const directResult = await baseClient.$transaction(args);
    return directResult as unknown as T;
  }

  // Case A: Interactive Transaction (Callback pattern)
  if (typeof args === 'function') {
    let transactionPromise: Promise<any>;
    
    TenantStorage.run(tenantId, () => {
      transactionPromise = baseClient.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
        return args(tx);
      });
    }, true);
    
    const interactiveResult = await transactionPromise!;
    return interactiveResult as unknown as T;
  }

  // Case B: Sequential Batch Transaction (Array pattern)
  if (Array.isArray(args)) {
    let batchPromise: Promise<any[]>;
    
    TenantStorage.run(tenantId, () => {
      const setConfigPromise = baseClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
      batchPromise = baseClient.$transaction([setConfigPromise, ...args]);
    }, true);

    const resolvedBatch = await batchPromise!;
    
    // Slice off our injected set_config promise result at index 0
    return resolvedBatch.slice(1) as unknown as T;
  }

  // Exit Path 2: Fallthrough edge case safeguard
  const fallbackResult = await baseClient.$transaction(args);
  return fallbackResult as unknown as T;
}
},
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = TenantStorage.getTenantId();
            const isRlsSet = TenantStorage.isRlsSet();
            const isGlobal = globalModels.includes(model);

            // Fail-Closed Validation Guard
            if (!tenantId) {
              if (isGlobal) return query(args);
              
              throw new InternalServerErrorException({
                error: 'Isolation Boundary Breach',
                message: `Aborting execution. Unauthenticated context access denied for entity "${model}".`,
              });
            }

            // Safe structured deep copy preserves complex data objects (Dates, Buffers, BigInts)
            const securedArgs = PrismaService.cloneQueryPayload(args ?? {});

            // Intercept and rewrite Read Operations
            if (!isGlobal && !mutationOperations.includes(operation)) {
              securedArgs.where = securedArgs.where || {};
              PrismaService.injectTenantPredicate(securedArgs.where, tenantId, tenantKey);
              PrismaService.traverseAndHardenAST(securedArgs, tenantId, tenantKey);
            }

            // Intercept and rewrite Write Operations (Injections for inline relation writes)
            if (!isGlobal && mutationOperations.includes(operation)) {
              PrismaService.traverseAndHardenAST(securedArgs, tenantId, tenantKey);
            }

            // Standardize uniquely-constrained point lookups to prevent engine validation failures
            let dynamicQuery = query;
            let finalArgs = securedArgs;
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const targetOp = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
              const modelProperty = model.charAt(0).toLowerCase() + model.slice(1);
              dynamicQuery = (innerArgs: any) => (baseClient as any)[modelProperty][targetOp](innerArgs);
            }

            // Execute within an established transaction connection scope
            if (isRlsSet) {
              return dynamicQuery(finalArgs);
            }

            // Promote standalone commands to a transaction pair to restrict session configuration scope
            try {
              const [_, result] = await baseClient.$transaction([
                baseClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`,
                dynamicQuery(finalArgs)
              ]);
              return result;
            } catch (error) {
              throw error;
            }
          },
        },
      },
    });
  }

  private static traverseAndHardenAST(node: any, tenantId: string, tenantKey: string): void {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      for (const element of node) this.traverseAndHardenAST(element, tenantId, tenantKey);
      return;
    }

    for (const key of Object.keys(node)) {
      const value = node[key];
      if (!value || typeof value !== 'object') continue;

      if ((key === 'include' || key === 'select') && typeof value === 'object') {
        for (const relKey of Object.keys(value)) {
          if (value[relKey] === true && key === 'include') {
            value[relKey] = { where: { AND: [{ [tenantKey]: tenantId }] } };
          } else if (typeof value[relKey] === 'object' && value[relKey] !== null) {
            value[relKey].where = value[relKey].where || {};
            this.injectTenantPredicate(value[relKey].where, tenantId, tenantKey);
            this.traverseAndHardenAST(value[relKey], tenantId, tenantKey);
          }
        }
      } else if (key === 'data' && typeof value === 'object') {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object') item[tenantKey] = tenantId;
          }
        } else {
          value[tenantKey] = tenantId;
        }
        this.traverseAndHardenAST(value, tenantId, tenantKey);
      } else {
        this.traverseAndHardenAST(value, tenantId, tenantKey);
      }
    }
  }

  private static injectTenantPredicate(whereClause: any, tenantId: string, tenantKey: string): void {
    if (whereClause.AND) {
      const internalAnds = Array.isArray(whereClause.AND) ? whereClause.AND : [whereClause.AND];
      whereClause.AND = [...internalAnds, { [tenantKey]: tenantId }];
    } else {
      whereClause.AND = [{ [tenantKey]: tenantId }];
    }
  }

  /**
   * Custom structured deep cloner engineered to protect Prisma native types 
   * from primitive string serialization corruption.
   */
  private static cloneQueryPayload(source: any): any {
    if (source === null || typeof source !== 'object') return source;
    if (source instanceof Date) return new Date(source.getTime());
    if (source instanceof Buffer) return Buffer.from(source);
    if (typeof source === 'bigint') return BigInt(source.toString());

    if (Array.isArray(source)) {
      const cloneArr = new Array(source.length);
      for (let i = 0; i < source.length; i++) {
        cloneArr[i] = this.cloneQueryPayload(source[i]);
      }
      return cloneArr;
    }

    const cloneObj = Object.create(Object.getPrototypeOf(source));
    for (const key of Object.keys(source)) {
      cloneObj[key] = this.cloneQueryPayload(source[key]);
    }
    return cloneObj;
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.rawClient.$connect();
      this.logger.log('Data access infrastructure layer online.');
    } catch (error) {
      throw new InternalServerErrorException('Database link layer connection initialization failure.');
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.rawClient.$disconnect();
  }
}