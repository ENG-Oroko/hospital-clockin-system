import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { db } from '@chronos/database';
import { TenantStorage } from './tenant.storage';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  private static readonly TENANT_KEY = 'tenantId';
  private static readonly GLOBAL_MODELS = ['Tenant', 'LicenseKey', 'SystemAuditLog'];
  private static readonly MUTATION_OPERATIONS = [
    'create', 'update', 'upsert', 'delete',
    'createMany', 'updateMany', 'deleteMany',
  ];

  public readonly rawClient: PrismaClient = db;
  public readonly client: ReturnType<typeof this.createSecureClient>;

  constructor() {
    // PrismaService no longer extends PrismaClient — no super() needed.
    // All model access goes through this.client (tenant-isolated) or
    // this.rawClient (bypass — only for system/global queries).
    this.client = this.createSecureClient();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Model proxy getters
  //
  // These forward this.db.modelName → this.client.modelName so every service
  // can keep writing `this.db.user.findFirst(...)` without changing anything.
  // All calls still go through the Zero-Trust isolation engine on `this.client`.
  // ─────────────────────────────────────────────────────────────────────────

  // Core
  get user()                    { return this.client.user; }
  get tenant()                  { return this.client.tenant; }
  get session()                 { return this.client.session; }
  get device()                  { return this.client.device; }
  get department()              { return this.client.department; }

  // Attendance
  get attendanceLog()           { return this.client.attendanceLog; }
  get attendanceSummary()       { return this.client.attendanceSummary; }
  get attendanceAudit()         { return this.client.attendanceAudit; }

  // Roster & Leave
  get rosterAssignment()        { return this.client.rosterAssignment; }
  get shiftTemplate()           { return this.client.shiftTemplate; }
  get leaveRequest()            { return this.client.leaveRequest; }

  // Notifications
  get notificationLog()         { return this.client.notificationLog; }
  get notificationPreference()  { return this.client.notificationPreference; }
  get userSettings()            { return this.client.userSettings; }
  get userNotificationSettings() { return this.client.userNotificationSettings; }

  // Payroll & reporting

  // $transaction proxy — routes through the secured client's transaction handler
  get $transaction() {
    return this.client.$transaction.bind(this.client);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Zero-Trust isolation engine
  // ─────────────────────────────────────────────────────────────────────────

  private createSecureClient() {
    const baseClient = this.rawClient;
    const tenantKey = PrismaService.TENANT_KEY;
    const globalModels = PrismaService.GLOBAL_MODELS;
    const mutationOperations = PrismaService.MUTATION_OPERATIONS;

    return baseClient.$extends({
      name: 'ChronosZeroTrustIsolationEngine',
      client: {
        async $transaction<T>(this: any, args: any): Promise<T> {
          const tenantId = TenantStorage.getTenantId();

          if (!tenantId) {
            const directResult = await baseClient.$transaction(args);
            return directResult as unknown as T;
          }

          if (typeof args === 'function') {
            let transactionPromise: Promise<any>;
            TenantStorage.run(tenantId, () => {
              transactionPromise = baseClient.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
                return args(tx);
              });
            }, true);
            return (await transactionPromise!) as unknown as T;
          }

          if (Array.isArray(args)) {
            let batchPromise: Promise<any[]>;
            TenantStorage.run(tenantId, () => {
              const setConfigPromise = baseClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
              batchPromise = baseClient.$transaction([setConfigPromise, ...args]);
            }, true);
            const resolvedBatch = await batchPromise!;
            return resolvedBatch.slice(1) as unknown as T;
          }

          const fallbackResult = await baseClient.$transaction(args);
          return fallbackResult as unknown as T;
        },
      },
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = TenantStorage.getTenantId();
            const isRlsSet = TenantStorage.isRlsSet();
            const isGlobal = globalModels.includes(model);

            if (!tenantId) {
              if (isGlobal) return query(args);
              throw new InternalServerErrorException({
                error: 'Isolation Boundary Breach',
                message: `Aborting execution. Unauthenticated context access denied for entity "${model}".`,
              });
            }

            const securedArgs = PrismaService.cloneQueryPayload(args ?? {});

            if (!isGlobal && !mutationOperations.includes(operation)) {
              securedArgs.where = securedArgs.where || {};
              PrismaService.injectTenantPredicate(securedArgs.where, tenantId, tenantKey);
              PrismaService.traverseAndHardenAST(securedArgs, tenantId, tenantKey);
            }

            if (!isGlobal && mutationOperations.includes(operation)) {
              PrismaService.traverseAndHardenAST(securedArgs, tenantId, tenantKey);
            }

            let dynamicQuery = query;
            let finalArgs = securedArgs;
            if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
              const targetOp = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
              const modelProperty = model.charAt(0).toLowerCase() + model.slice(1);
              dynamicQuery = (innerArgs: any) => (baseClient as any)[modelProperty][targetOp](innerArgs);
            }

            if (isRlsSet) return dynamicQuery(finalArgs);

            const [, result] = await baseClient.$transaction([
              baseClient.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`,
              dynamicQuery(finalArgs),
            ]);
            return result;
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

  private static cloneQueryPayload(source: any): any {
    if (source === null || typeof source !== 'object') return source;
    if (source instanceof Date) return new Date(source.getTime());
    if (source instanceof Buffer) return Buffer.from(source);
    if (typeof source === 'bigint') return BigInt(source.toString());
    if (Array.isArray(source)) {
      const cloneArr = new Array(source.length);
      for (let i = 0; i < source.length; i++) cloneArr[i] = this.cloneQueryPayload(source[i]);
      return cloneArr;
    }
    const cloneObj = Object.create(Object.getPrototypeOf(source));
    for (const key of Object.keys(source)) cloneObj[key] = this.cloneQueryPayload(source[key]);
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