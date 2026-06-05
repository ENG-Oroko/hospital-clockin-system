import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { DatabaseModule } from '../database/database.module';
import { EmployeeModule } from '../employee/employee.module';
import { RosterModule } from '../roster/roster.module';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [DatabaseModule, AttendanceModule, EmployeeModule, RosterModule],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
