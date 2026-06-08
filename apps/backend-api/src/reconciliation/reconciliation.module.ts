import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { DatabaseModule } from '../database/database.module';
import { DepartmentModule } from '../department/department.module';
import { EmployeeModule } from '../employee/employee.module';
import { QueueModule } from '../queue/queue.module';
import { RosterModule } from '../roster/roster.module';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationProcessor } from './reconciliation.processor';
import { ReconciliationRepository } from './reconciliation.repository';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [DatabaseModule, AttendanceModule, DepartmentModule, EmployeeModule, QueueModule, RosterModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationRepository, ReconciliationService, ReconciliationProcessor],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
