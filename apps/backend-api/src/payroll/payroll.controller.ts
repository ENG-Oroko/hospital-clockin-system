import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('periods')
  createPeriod(
    @Body() body: { tenantId: string; name: string; startDate: string; endDate: string },
  ) {
    return this.payrollService.createPeriod(
      body.tenantId,
      body.name,
      body.startDate,
      body.endDate,
    );
  }

  @Get('periods')
  getPeriods(@Query('tenantId') tenantId: string) {
    return this.payrollService.getPeriods(tenantId);
  }

  @Post('periods/:periodId/run')
  runPayroll(
    @Param('periodId') periodId: string,
    @Body() body: { tenantId: string },
  ) {
    return this.payrollService.runPayroll(periodId, body.tenantId);
  }

  @Get('periods/:periodId/payslips')
  getPayslipsByPeriod(
    @Param('periodId') periodId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.payrollService.getPayslipsByPeriod(periodId, tenantId);
  }

  @Get('payslip/:periodId/employee/:employeeId')
  getEmployeePayslip(
    @Param('periodId') periodId: string,
    @Param('employeeId') employeeId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.payrollService.getEmployeePayslip(employeeId, periodId, tenantId);
  }

  @Post('payslip/:payslipId/approve')
  approvePayslip(
    @Param('payslipId') payslipId: string,
    @Body() body: { tenantId: string },
  ) {
    return this.payrollService.approvePayslip(payslipId, body.tenantId);
  }

  @Get('periods/:periodId/export')
  exportPayroll(
    @Param('periodId') periodId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.payrollService.exportPayroll(periodId, tenantId);
  }
}