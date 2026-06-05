import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { DatabaseModule } from '../database/database.module';
import { RosterModule } from '../roster/roster.module';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [
    DatabaseModule,
    EmployeeModule,
    RosterModule,
  ],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
