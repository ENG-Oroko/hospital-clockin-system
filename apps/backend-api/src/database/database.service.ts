// src/database/database.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  // Compatibility layer for code expecting .client
  get client(): this {
    return this;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // Enhanced transaction with tenant context support
  async secureTransaction<T>(
    callback: (tx: this) => Promise<T>,
    tenantId?: string
  ): Promise<T> {
    if (tenantId) {
      return this.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true);`;
        return callback(tx as this);
      });
    }
    return this.$transaction((tx) => callback(tx as this));
  }
}
// Add this line at the end of the file
export { DatabaseService as PrismaService };