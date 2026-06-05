import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { DatabaseModule } from '../database/database.module';
import { EmployeeModule } from '../employee/employee.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';

@Module({
  imports: [DatabaseModule, EmployeeModule, ReconciliationModule],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
