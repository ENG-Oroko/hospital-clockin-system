// Location: apps/backend-api/src/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Import these from their actual locations
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';

@Global()
@Module({
  providers: [
    PrismaService,
    TenantContextService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    PrismaService,
    TenantContextService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class DatabaseModule {}