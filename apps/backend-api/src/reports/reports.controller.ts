import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { UserRole } from '@chronos/types-common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { TenantId } from '../common/tenant/tenant-id.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ReportsService } from './reports.service';
import { ReportsQueueService } from './reports-queue.service';
import type { Response } from 'express';
import { REPORT_TYPES } from './reports.types';
import type { ReportListQueryDTO, ReportQueryDTO, ReportDownloadFormat } from './reports.types';

@Controller('api/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService, private readonly reportsQueue: ReportsQueueService) {}

  /**
   * POST /api/reports/generate
   *
   * Streams attendance data in 100-row batches, compiles a structured report,
   * persists it to compiled_reports, and returns the full compiled document.
   *
   * Allowed roles: SUPER_ADMIN, HOSPITAL_ADMIN, HR_MANAGER, DEPT_HEAD
   *
   * Body:
   *  - reportType: MONTHLY_ATTENDANCE | DEPARTMENT_SUMMARY | OVERTIME_AUDIT |
   *                LATENESS_AUDIT | ABSENCE_AUDIT | SHIFT_COMPLIANCE |
   *                PAYROLL_READY | LEAVE_ATTENDANCE_RECONCILIATION |
   *                DEVICE_HEALTH | TURNOVER_HEADCOUNT |
   *                SCHEDULED_ACTUAL_HOURS | ATTENDANCE_AUDIT_TRAIL
   *  - startDate:  YYYY-MM-DD
   *  - endDate:    YYYY-MM-DD
   *  - departmentId?: UUID   (scope to one department; omit for tenant-wide)
   *  - userId?:     UUID   (scope to one employee; for MONTHLY_ATTENDANCE only)
   *
   * Rejects any date range wider than 93 days — use async export for larger spans.
   */
  @Post('generate')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.DEPT_HEAD,
  )
  async generate(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: ReportQueryDTO,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.generateReport(tenantId, user.userId, payload);
    if ((result as { queued?: boolean }).queued) {
      return res.status(HttpStatus.ACCEPTED).json({ jobId: (result as { jobId: string }).jobId });
    }
    return res.json(result);
  }

  /**
   * GET /api/reports
   *
   * Lists previously compiled reports saved to the compiled_reports table.
   * Returns metadata only (no compiledData payload) for efficient listing.
   *
   * Query params:
   *  - reportType?: filter by report type
   *  - page?:       default 1
   *  - limit?:      default 25, max 100
   */
  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.DEPT_HEAD,
  )
  list(
    @TenantId() tenantId: string,
    @Query() query: ReportListQueryDTO,
  ) {
    return this.reportsService.listReports(tenantId, query);
  }

  /**
   * GET /api/reports/types
   *
   * Returns all supported report type identifiers.
   * Useful for populating dropdowns in the HR dashboard without hardcoding values.
   */
  @Get('types')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.DEPT_HEAD,
  )
  getReportTypes() {
    return { reportTypes: Object.values(REPORT_TYPES) };
  }

  /**
   * GET /api/reports/:id
   *
   * Fetches a single compiled report by ID, including the full compiledData payload.
   * The compiledData contains both a summary block and the full rows array.
   */
  @Get(':id/download')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.DEPT_HEAD,
  )
  async getDownload(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('format') format: ReportDownloadFormat,
    @Res() res: Response,
  ) {
    const validatedFormat = format ?? 'pdf';
    const result = await this.reportsService.downloadReport(tenantId, id, validatedFormat);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  }

  /**
   * GET /api/reports/:id
   *
   * Fetches a single compiled report by ID, including the full compiledData payload.
   * The compiledData contains both a summary block and the full rows array.
   */
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.DEPT_HEAD,
  )
  getById(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.reportsService.getReportById(tenantId, id);
  }

  @Get('jobs/:jobId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.HR_MANAGER,
    UserRole.DEPT_HEAD,
  )
  async getJobStatus(
    @Param('jobId') jobId: string,
  ) {
    const status = await this.reportsQueue.getJobStatus(jobId);
    if (!status) return { found: false };
    return status;
  }
}