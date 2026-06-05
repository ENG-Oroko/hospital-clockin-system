// Location: apps/backend-api/src/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { db } from '@chronos/database';
import { TenantStorage } from './tenant.storage';

/**
 * ============================================================================
 * MODULE-LEVEL CONFIGURATION & UTILITIES (Decoupled from Class Lifecycle)
 * ============================================================================
 */
const TENANT_KEY = 'tenantId';
const GLOBAL_MODELS = ['Tenant', 'LicenseKey', 'SystemAuditLog'];
const MUTATION_OPERATIONS = ['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany'];

function injectTenantPredicate(whereClause: any, tenantId: string): void {
  if (whereClause.AND) {
    const internalAnds = Array.isArray(whereClause.AND) ? whereClause.AND : [whereClause.AND];
    whereClause.AND = [...internalAnds, { [TENANT_KEY]: tenantId }];
  } else {
    whereClause.AND = [{ [TENANT_KEY]: tenantId }];
  }
}

function traverseAndHardenAST(node: any, tenantId: string): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const element of node) traverseAndHardenAST(element, tenantId);
    return;
  }

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value || typeof value !== 'object') continue;

    if ((key === 'include' || key === 'select') && typeof value === 'object') {
      for (const relKey of Object.keys(value)) {
        if (value[relKey] === true && key === 'include') {
          value[relKey] = { where: { AND: [{ [TENANT_KEY]: tenantId }] } };
        } else if (typeof value[relKey] === 'object' && value[relKey] !== null) {
          value[relKey].where = value[relKey].where || {};
          injectTenantPredicate(value[relKey].where, tenantId);
          traverseAndHardenAST(value[relKey], tenantId);
        }
      }
    } else if (key === 'data' && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') item[TENANT_KEY] = tenantId;
        }
      } else {
        value[TENANT_KEY] = tenantId;
      }
      traverseAndHardenAST(value, tenantId);
    } else {
      traverseAndHardenAST(value, tenantId);
    }
  }
}

function cloneQueryPayload(source: any): any {
  if (source === null || typeof source !== 'object') return source;
  if (source instanceof Date) return new Date(source.getTime());
  if (source instanceof Buffer) return Buffer.from(source);
  if (typeof source === 'bigint') return BigInt(source.toString());

  if (Array.isArray(source)) {
    const cloneArr = new Array(source.length);
    for (let i = 0; i < source.length; i++) {
      cloneArr[i] = cloneQueryPayload(source[i]);
    }
    return cloneArr;
  }

  const cloneObj = Object.create(Object.getPrototypeOf(source));
  for (const key of Object.keys(source)) {
    cloneObj[key] = cloneQueryPayload(source[key]);
  }
  return cloneObj;
}

/**
 * ============================================================================
 * ISOLATED PRISMA EXTENSION ENGINE FACTORY (Provides Direct Type Resolution)
 * ============================================================================
 */
export function instantiateSecureClient(baseClient: PrismaClient) {
  return baseClient.$extends({
    name: 'ChronosZeroTrustIsolationEngine',
    client: {
      async $transaction<T>(this: any, args: any, options?: any): Promise<T> {
        const tenantId = TenantStorage.getTenantId();
        
        if (!tenantId) {
          const directResult = await baseClient.$transaction(args, options);
          return directResult as unknown as T;
        }

        if (typeof args === 'function') {
          let transactionPromise: Promise<any>;
          
          TenantStorage.run(tenantId, () => {
            transactionPromise = baseClient.$transaction(async (tx) => {
              await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
              return args(tx);
            }, options);
          }, true);
          
          const interactiveResult = await transactionPromise!;
          return interactiveResult as unknown as T;
        }

        if (Array.isArray(args)) {
          let batchPromise: Promise<any[]>;
          
          TenantStorage.run(tenantId, () => {
            const setConfigPromise = baseClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
            batchPromise = baseClient.$transaction([setConfigPromise, ...args], options);
          }, true);

          const resolvedBatch = await batchPromise!;
          return resolvedBatch.slice(1) as unknown as T;
        }

        const fallbackResult = await baseClient.$transaction(args, options);
        return fallbackResult as unknown as T;
      }
    },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = TenantStorage.getTenantId();
          const isRlsSet = TenantStorage.isRlsSet();
          const isGlobal = GLOBAL_MODELS.includes(model);

          if (!tenantId) {
            if (isGlobal) return query(args);
            
            throw new InternalServerErrorException({
              error: 'Isolation Boundary Breach',
              message: `Aborting execution. Unauthenticated context access denied for entity "${model}".`,
            });
          }

          const securedArgs = cloneQueryPayload(args ?? {});

          if (!isGlobal && !MUTATION_OPERATIONS.includes(operation)) {
            securedArgs.where = securedArgs.where || {};
            injectTenantPredicate(securedArgs.where, tenantId);
            traverseAndHardenAST(securedArgs, tenantId);
          }

          if (!isGlobal && MUTATION_OPERATIONS.includes(operation)) {
            traverseAndHardenAST(securedArgs, tenantId);
          }

          let dynamicQuery = query;
          let finalArgs = securedArgs;
          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            const targetOp = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
            const modelProperty = model.charAt(0).toLowerCase() + model.slice(1);
            dynamicQuery = (innerArgs: any) => (baseClient as any)[modelProperty][targetOp](innerArgs);
          }

          if (isRlsSet) {
            return dynamicQuery(finalArgs);
          }

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

// Statically infer the complete extension type signature outside the scope of the class framework.
export type ChronosSecureClient = ReturnType<typeof instantiateSecureClient>;

/**
 * ============================================================================
 * NESTJS INFRASTRUCTURE LAYER SERVICE
 * ============================================================================
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  
  public readonly rawClient: PrismaClient = db;
  public readonly client: ChronosSecureClient;

  constructor() {
    this.client = instantiateSecureClient(this.rawClient);

    // Runtime Proxy Trap: Forwards property lookups transparently down to the extended client engine instance
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }
        return Reflect.get(target.client, prop);
      },
    });
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.rawClient.$connect();
      this.logger.log('Zero-Trust multi-tenant isolation database engine online.');
    } catch (error) {
      throw new InternalServerErrorException('Database link layer connection initialization failure.');
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.rawClient.$disconnect();
  }
}

/**
 * ============================================================================
 * SOLID TYPE DECLARATION MERGING
 * ============================================================================
 */
// Establishes a clean directional graph: PrismaService -> ChronosSecureClient -> Prisma Core contracts.
// There is now a 0% possibility of a circular evaluation loop.
export interface PrismaService extends ChronosSecureClient {}
