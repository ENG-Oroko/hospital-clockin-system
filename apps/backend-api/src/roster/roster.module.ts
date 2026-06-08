import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DepartmentModule } from '../department/department.module';
import { EmployeeModule } from '../employee/employee.module';
import { RosterController } from './roster.controller';
import { RosterRepository } from './roster.repository';
import { RosterService } from './roster.service';

@Module({
  imports: [DatabaseModule, DepartmentModule, EmployeeModule],
  controllers: [RosterController],
  providers: [RosterRepository, RosterService],
  exports: [RosterService],
})
export class RosterModule {}
