import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@chronos/types-common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ReconciliationService } from './reconciliation.service';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('employees/:employeeId/dates/:date')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reconcileUserDate(@Param('employeeId') employeeId: string, @Param('date') date: string, @Req() req: any) {
    return this.reconciliationService.reconcileUserDate(req.user.tenantId, employeeId, date);
  }

  @Post('assignments/:assignmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reconcileAssignment(@Param('assignmentId') assignmentId: string, @Req() req: any) {
    return this.reconciliationService.reconcileAssignmentById(req.user.tenantId, assignmentId);
  }

  @Post('departments/:departmentId/dates/:date')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reconcileDepartmentDate(@Param('departmentId') departmentId: string, @Param('date') date: string, @Req() req: any) {
    return this.reconciliationService.reconcileDepartmentDate(req.user.tenantId, departmentId, date);
  }

  @Get('payroll-ready')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  getPayrollReady(@Query('startDate') startDate: string, @Query('endDate') endDate: string, @Req() req: any) {
    return this.reconciliationService.getPayrollReadyRecords(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
