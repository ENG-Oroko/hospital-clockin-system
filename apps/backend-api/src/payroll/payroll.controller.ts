import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@chronos/types-common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { TenantId } from '../common/tenant/tenant-id.decorator';
import { PayrollService } from './payroll.service';
import type { CreatePeriodDTO } from './payroll.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('periods')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  getPeriods(@TenantId() tenantId: string) {
    return this.payrollService.getPeriods(tenantId);
  }

  @Post('periods')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  createPeriod(@TenantId() tenantId: string, @Body() dto: CreatePeriodDTO) {
    return this.payrollService.createPeriod(tenantId, dto);
  }

  @Post('periods/:id/run')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  runPayroll(@TenantId() tenantId: string, @Param('id') periodId: string) {
    return this.payrollService.runPayroll(tenantId, periodId);
  }

  @Get('periods/:id/payslips')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  getPayslipsByPeriod(@TenantId() tenantId: string, @Param('id') periodId: string) {
    return this.payrollService.getPayslipsByPeriod(periodId, tenantId);
  }

  @Get('periods/:id/export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  exportPayroll(@TenantId() tenantId: string, @Param('id') periodId: string) {
    return this.payrollService.exportPayroll(periodId, tenantId);
  }

  @Get('payslip/:pid/employee/:eid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  getEmployeePayslip(
    @TenantId() tenantId: string,
    @Param('pid') periodId: string,
    @Param('eid') employeeId: string,
  ) {
    return this.payrollService.getEmployeePayslip(periodId, employeeId, tenantId);
  }

  @Patch('payslip/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  approvePayslip(@TenantId() tenantId: string, @Param('id') payslipId: string) {
    return this.payrollService.approvePayslip(payslipId, tenantId);
  }

  @Patch('payslip/:id/paid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  markPaid(@TenantId() tenantId: string, @Param('id') payslipId: string) {
    return this.payrollService.markPaid(payslipId, tenantId);
  }
}
