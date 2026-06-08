import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core / infrastructure — must come first
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { JobsModule } from './jobs/jobs.module';

// Cross-cutting
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { DeviceModule } from './device/device.module';

// Domain modules
import { DepartmentModule } from './department/department.module';
import { EmployeeModule } from './employee/employee.module';
import { LeaveModule } from './leave/leave.module';
import { RosterModule } from './roster/roster.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PayrollModule } from './payroll/payroll.module';

// Middleware
import { TenantContextMiddleware } from './common/tenant/tenant-context.middleware';

@Module({
  imports: [

    // environment variables (DB url, JWT secret, Redis host) depends on it.
    ConfigModule.forRoot({
      isGlobal: true,       // no need to import ConfigModule in every module
      cache: true,
      envFilePath: '.env',
    }),

  
    // All other modules (NotificationsModule, QueueModule, AttendanceModule)
    // call only BullModule.registerQueue({ name: '...' }) with NO redis block.
    // Without this, each module creates its own Redis connection on its own
    // config, which caused the duplicate-connection bug you saw.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // It was previously declared inside NotificationsModule which meant it
    // was only active after that module loaded. Moving it here makes the
    // event bus available to ALL modules from boot, including AttendanceModule
    // which emits events before NotificationsModule may have initialised.
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,     // bumped from 10 — you have many listeners across modules
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Infrastructure (no domain deps)
    DatabaseModule,
    QueueModule,

    // Auth & tenant context — must load before any domain module
    // that uses JwtAuthGuard or TenantContextService
    AuthModule,
    TenantModule,
    SettingsModule,
    DeviceModule,

    // Domain modules — order reflects dependency direction:
    // leaf modules first, consumers after
    DepartmentModule,
    EmployeeModule,
    LeaveModule,
    RosterModule,

    // AttendanceModule comes after Roster/Leave/Employee (it depends on them)
    // and comes BEFORE NotificationsModule intentionally — it emits events,
    // it does not import NotificationsModule
    AttendanceModule,

    // NotificationsModule listens to events from Attendance, Roster, etc.
    // It must load after the modules that emit those events
    NotificationsModule,

    // WebsocketModule comes after NotificationsModule because it imports it
    WebsocketModule,

    // Reporting / payroll depend on attendance data — load last
    ReconciliationModule,
    ReportsModule,
    PayrollModule,

    // Jobs orchestrates background work across all modules — load last
    JobsModule,
  ],

  // Middleware is not an injectable provider — it is applied via the
  // configure() method below. Listing it in providers[] causes NestJS to
  // try to inject it as a service, which either silently does nothing
  // or throws if it has unresolved dependencies.
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*');
  }
}