import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { JobsModule } from './jobs/jobs.module';
import { TenantContextMiddleware } from './common/tenant/tenant-context.middleware';
import { TenantModule } from './tenant/tenant.module';
import { DepartmentModule } from './department/department.module';
import { EmployeeModule } from './employee/employee.module';
import { LeaveModule } from './leave/leave.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { DeviceModule } from './device/device.module';
import { RosterModule } from './roster/roster.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PayrollModule } from './payroll/payroll.module';

@Module({
  imports: [DatabaseModule, QueueModule, WebsocketModule, JobsModule, TenantModule, DepartmentModule, EmployeeModule, LeaveModule, SettingsModule, AuthModule, DeviceModule, RosterModule, AttendanceModule, ReconciliationModule, ReportsModule, NotificationsModule, PayrollModule],
  providers: [TenantContextMiddleware]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
