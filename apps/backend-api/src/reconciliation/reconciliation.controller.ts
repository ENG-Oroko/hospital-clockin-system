import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@chronos/types-common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { TenantId } from '../common/tenant/tenant-id.decorator';
import { QueueService } from '../queue/queue.service';
import {
  ReconciliationApprovalDTO,
  ReconciliationOverrideDTO,
  ReconciliationRequestDTO,
  ReprocessReconciliationDTO,
  UnrosteredExceptionOverrideDTO,
  UnrosteredExceptionReviewDTO,
} from './dto/reconciliation.dto';
import { ReconciliationService } from './reconciliation.service';

@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly queueService: QueueService,
  ) {}

  @Post('run')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  runReconciliation(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReconciliationRequestDTO,
  ) {
    if (body.assignmentId) {
      return this.reconciliationService.reconcileAssignmentById(tenantId, body.assignmentId, {
        actorUserId: user.userId,
        reason: body.reason,
      });
    }

    if (body.employeeId && body.date) {
      return this.reconciliationService.reconcileUserDate(tenantId, body.employeeId, body.date, {
        actorUserId: user.userId,
        reason: body.reason,
      });
    }

    if (body.departmentId && body.date) {
      return this.reconciliationService.reconcileDepartmentDate(tenantId, body.departmentId, body.date, {
        actorUserId: user.userId,
        reason: body.reason,
      });
    }

    return this.reconciliationService.reconcileDateRange(
      tenantId,
      body.startDate ?? body.date ?? new Date(),
      body.endDate ?? body.startDate ?? body.date ?? new Date(),
      {
        actorUserId: user.userId,
        reason: body.reason,
        employeeId: body.employeeId,
        departmentId: body.departmentId,
      },
    );
  }

  @Post('queue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  queueReconciliation(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReconciliationRequestDTO,
  ) {
    return this.queueService.addAttendanceBatchReconcileJob({
      tenantId,
      employeeId: body.employeeId,
      departmentId: body.departmentId,
      startDate: body.startDate ?? body.date ?? new Date().toISOString().slice(0, 10),
      endDate: body.endDate ?? body.startDate ?? body.date ?? new Date().toISOString().slice(0, 10),
      triggeredByUserId: user.userId,
      createdAt: new Date().toISOString(),
    });
  }

  @Post('employees/:employeeId/dates/:date')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reconcileEmployee(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('employeeId') employeeId: string,
    @Param('date') date: string,
  ) {
    return this.reconciliationService.reconcileUserDate(tenantId, employeeId, date, {
      actorUserId: user.userId,
      reason: 'Manual employee reconciliation',
    });
  }

  @Post('date-range')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reconcileDateRange(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReconciliationRequestDTO,
  ) {
    return this.reconciliationService.reconcileDateRange(tenantId, body.startDate ?? new Date(), body.endDate ?? body.startDate ?? new Date(), {
      actorUserId: user.userId,
      reason: body.reason,
      employeeId: body.employeeId,
      departmentId: body.departmentId,
    });
  }

  @Post('assignments/:assignmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reconcileAssignment(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.reconciliationService.reconcileAssignmentById(tenantId, assignmentId, {
      actorUserId: user.userId,
      reason: 'Manual assignment reconciliation',
    });
  }

  @Post('departments/:departmentId/dates/:date')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reconcileDepartmentDate(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId') departmentId: string,
    @Param('date') date: string,
  ) {
    return this.reconciliationService.reconcileDepartmentDate(tenantId, departmentId, date, {
      actorUserId: user.userId,
      reason: 'Manual department reconciliation',
    });
  }

  @Get('payroll-ready')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  getPayrollReady(@TenantId() tenantId: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.reconciliationService.getPayrollReadyRecords(tenantId, new Date(startDate), new Date(endDate));
  }

  @Get('payroll-preview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  payrollPreview(@TenantId() tenantId: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.reconciliationService.getPayrollPreview(tenantId, new Date(startDate), new Date(endDate));
  }

  @Get('exceptions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  exceptionReview(@TenantId() tenantId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reconciliationService.getExceptionReview(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('unrostered-exceptions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  listUnrosteredExceptions(@TenantId() tenantId: string) {
    return this.reconciliationService.listUnrosteredExceptions(tenantId);
  }

  @Get('unrostered-exceptions/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  getUnrosteredException(@TenantId() tenantId: string, @Param('id') exceptionId: string) {
    return this.reconciliationService.getUnrosteredException(tenantId, exceptionId);
  }

  @Patch('unrostered-exceptions/:id/review')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reviewUnrosteredException(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') exceptionId: string,
    @Body() body: UnrosteredExceptionReviewDTO,
  ) {
    return this.reconciliationService.reviewUnrosteredException(tenantId, exceptionId, user.userId, body);
  }

  @Post('unrostered-exceptions/:id/reprocess')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER, UserRole.DEPT_HEAD, UserRole.SUPERVISOR)
  reprocessUnrosteredException(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') exceptionId: string,
    @Body() body: ReprocessReconciliationDTO,
  ) {
    return this.reconciliationService.reprocessUnrosteredException(tenantId, exceptionId, user.userId, body.reason);
  }

  @Patch('unrostered-exceptions/:id/override')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  approveUnrosteredOverride(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') exceptionId: string,
    @Body() body: UnrosteredExceptionOverrideDTO,
  ) {
    return this.reconciliationService.approveUnrosteredOverride(tenantId, exceptionId, user.userId, body);
  }

  @Post('reprocess')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  reprocess(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReprocessReconciliationDTO,
  ) {
    return this.reconciliationService.reprocess(tenantId, body.startDate ?? body.date ?? new Date(), body.endDate ?? body.startDate ?? body.date ?? new Date(), {
      actorUserId: user.userId,
      reason: body.reason,
      employeeId: body.employeeId,
      departmentId: body.departmentId,
    });
  }

  @Patch(':id/override')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  override(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reconciliationLogId: string,
    @Body() body: ReconciliationOverrideDTO,
  ) {
    return this.reconciliationService.overrideResult(tenantId, reconciliationLogId, user.userId, body);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HR_MANAGER)
  approve(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reconciliationLogId: string,
    @Body() body: ReconciliationApprovalDTO,
  ) {
    return this.reconciliationService.approveResult(tenantId, reconciliationLogId, user.userId, body);
  }
}
