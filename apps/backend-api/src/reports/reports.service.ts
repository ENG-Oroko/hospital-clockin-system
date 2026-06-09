import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReportsRepository } from './reports.repositories';
import { StreamQueryProcessor } from './stream-query-processor';
import { DocumentCompiler } from './document-compiler';
import { ReportsQueueService } from './reports-queue.service';
import { normalizePagination, paginatedResponse } from '../common/pagination';
import {
  REPORT_TYPES,
  ReportType,
  ReportQueryDTO,
  ReportListQueryDTO,
  ReportDownloadFormat,
  QueuedReportResult,
} from './reports.types';

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatDate(value: Date, pattern: 'yyyy-MM-dd' | 'HH:mm'): string {
  const year = value.getUTCFullYear();
  const month = pad2(value.getUTCMonth() + 1);
  const day = pad2(value.getUTCDate());
  const hours = pad2(value.getUTCHours());
  const minutes = pad2(value.getUTCMinutes());

  return pattern === 'HH:mm'
    ? `${hours}:${minutes}`
    : `${year}-${month}-${day}`;
}

// Maximum date range allowed for real-time (non-async) report generation.
// Requests spanning more than 93 days are rejected and must use the async export pipeline.
const MAX_REALTIME_DAYS = 93;

type ReportRow = Record<string, unknown>;

interface PayrollReadyAggregate {
  employeeId: string;
  payrollNumber: string;
  name: string;
  department: string;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  leaveDays: number;
  absentDays: number;
  absentDeductions: number;
}

type AbsenceAuditReportRow = {
  employeeId: string;
  payrollNumber: string;
  name: string;
  department: string;
  date: string;
  status: string;
  shiftName: string;
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly streamQueryProcessor: StreamQueryProcessor,
    private readonly documentCompiler: DocumentCompiler,
    private readonly reportsQueue: ReportsQueueService,
  ) {}

  // ─────────────────────────────────────────────
  // GENERATE: on-demand streaming report
  // ─────────────────────────────────────────────

  /**
   * Generates a structured report by streaming attendance data in small batches.
   * Aborts if the requested range exceeds MAX_REALTIME_DAYS and instructs the
   * caller to use the async export pipeline instead.
   */
  async generateReport(
    tenantId: string,
    generatedById: string,
    query: ReportQueryDTO,
  ) {
    this.validateQuery(query);
    const { startDate, endDate } = this.parseAndValidateDates(query);

    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_REALTIME_DAYS) {
      const jobId = await this.reportsQueue.enqueueExportJob({ tenantId, generatedById, query });
      return { queued: true, jobId };
    }

    this.logger.log(
      `Generating ${query.reportType} report for tenant ${tenantId} ` +
        `[${query.startDate} → ${query.endDate}]`,
    );

    return this.generateReportInternal(tenantId, generatedById, query, startDate, endDate);
  }

  async generateReportDirect(
    tenantId: string,
    generatedById: string,
    query: ReportQueryDTO,
  ) {
    this.validateQuery(query);
    const { startDate, endDate } = this.parseAndValidateDates(query);
    this.logger.log(
      `Directly processing ${query.reportType} report for tenant ${tenantId} ` +
        `[${query.startDate} → ${query.endDate}]`,
    );
    return this.generateReportInternal(tenantId, generatedById, query, startDate, endDate);
  }

  private parseAndValidateDates(query: ReportQueryDTO) {
    const startDate = this.parseDate(query.startDate, 'startDate');
    const endDate = this.parseDate(query.endDate, 'endDate');
    this.assertDateOrder(startDate, endDate);
    return { startDate, endDate };
  }

  private validateQuery(query: ReportQueryDTO) {
    if (!query || typeof query !== 'object') {
      throw new BadRequestException('Report query payload is required.');
    }

    if (!query.reportType || typeof query.reportType !== 'string') {
      throw new BadRequestException('reportType is required.');
    }

    if (!Object.values(REPORT_TYPES).includes(query.reportType as ReportType)) {
      throw new BadRequestException(
        `reportType must be one of: ${Object.values(REPORT_TYPES).join(', ')}.`,
      );
    }

    if (!query.startDate || typeof query.startDate !== 'string') {
      throw new BadRequestException('startDate is required and must be a string.');
    }

    if (!query.endDate || typeof query.endDate !== 'string') {
      throw new BadRequestException('endDate is required and must be a string.');
    }

    if (query.departmentId !== undefined && typeof query.departmentId !== 'string') {
      throw new BadRequestException('departmentId must be a string.');
    }

    if (query.userId !== undefined && typeof query.userId !== 'string') {
      throw new BadRequestException('userId must be a string.');
    }

    if (query.page !== undefined && (!Number.isInteger(query.page) || query.page < 1)) {
      throw new BadRequestException('page must be a positive integer.');
    }

    if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1)) {
      throw new BadRequestException('limit must be a positive integer.');
    }
  }

  private async generateReportInternal(
    tenantId: string,
    generatedById: string,
    query: ReportQueryDTO,
    startDate: Date,
    endDate: Date,
  ) {
    switch (query.reportType) {
      case REPORT_TYPES.MONTHLY_ATTENDANCE:
        return this.generateAttendanceReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
          query.userId,
        );

      case REPORT_TYPES.DEPARTMENT_SUMMARY:
        return this.generateDepartmentSummaryReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
        );

      case REPORT_TYPES.OVERTIME_AUDIT:
        return this.generateOvertimeAuditReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
        );

      case REPORT_TYPES.LATENESS_AUDIT:
        return this.generateLatenessAuditReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
        );

      case REPORT_TYPES.ABSENCE_AUDIT:
        return this.generateAbsenceAuditReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
        );

      case REPORT_TYPES.SHIFT_COMPLIANCE:
        return this.generateShiftComplianceReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
          query.userId,
        );

      case REPORT_TYPES.PAYROLL_READY:
        return this.generatePayrollReadyReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
          query.userId,
        );

      case REPORT_TYPES.LEAVE_ATTENDANCE_RECONCILIATION:
        return this.generateLeaveAttendanceReconciliationReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
          query.userId,
        );

      case REPORT_TYPES.DEVICE_HEALTH:
        return this.generateDeviceHealthReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
        );

      case REPORT_TYPES.TURNOVER_HEADCOUNT:
        return this.generateTurnoverHeadcountReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
        );

      case REPORT_TYPES.SCHEDULED_ACTUAL_HOURS:
        return this.generateScheduledActualHoursReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
        );

      case REPORT_TYPES.ATTENDANCE_AUDIT_TRAIL:
        return this.generateAuditTrailReport(
          tenantId,
          generatedById,
          startDate,
          endDate,
          query.departmentId,
        );

      default:
        throw new BadRequestException(
          `reportType must be one of: ${Object.values(REPORT_TYPES).join(', ')}.`,
        );
    }
  }

  // ─────────────────────────────────────────────
  // MONTHLY ATTENDANCE REPORT
  // ─────────────────────────────────────────────

  private async generateAttendanceReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    userId?: string,
  ) {
    const rows: ReportRow[] = [];
    let totalLateMinutes = 0;
    let totalOvertimeHours = 0;
    const statusTotals: Record<string, number> = {};

    // Stream in 100-row batches — memory stays flat regardless of report size
    for await (const batch of this.streamQueryProcessor.streamAttendanceSummaries(
      tenantId,
      startDate,
      endDate,
      departmentId,
      userId,
    )) {
      for (const row of batch) {
        totalLateMinutes += row.lateMinutes;
        totalOvertimeHours += row.overtimeHours;
        statusTotals[row.status] = (statusTotals[row.status] ?? 0) + 1;

        rows.push({
          employeeId: row.userId,
          payrollNumber: row.payrollNumber,
          name: `${row.firstName} ${row.lastName}`,
          department: row.departmentName ?? 'Unassigned',
          date: formatDate(row.date, 'yyyy-MM-dd'),
          status: row.status,
          shiftName: row.shiftName ?? 'N/A',
          scheduledStart: row.scheduledStart
            ? formatDate(row.scheduledStart, 'HH:mm')
            : null,
          scheduledEnd: row.scheduledEnd
            ? formatDate(row.scheduledEnd, 'HH:mm')
            : null,
          scheduledHours: row.scheduledHours ?? null,
          firstIn: row.firstIn ? formatDate(row.firstIn, 'HH:mm') : null,
          lastOut: row.lastOut ? formatDate(row.lastOut, 'HH:mm') : null,
          totalHours: row.totalHours ?? 0,
          lateMinutes: row.lateMinutes,
          overtimeHours: row.overtimeHours,
        });
      }
    }

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalRecords: rows.length,
        statusBreakdown: statusTotals,
        totalLateMinutes,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        attendanceRate: this.computeAttendanceRate(statusTotals),
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.MONTHLY_ATTENDANCE,
      startDate,
      endDate,
      compiledData,
    );
  }

  // ─────────────────────────────────────────────
  // DEPARTMENT SUMMARY REPORT
  // ─────────────────────────────────────────────

  private async generateDepartmentSummaryReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
  ) {
    const departmentRows = await this.reportsRepository.getDepartmentAttendanceSummary(
      tenantId,
      startDate,
      endDate,
    );

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalDepartments: departmentRows.length,
      },
      rows: departmentRows.map((d) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        totalRostered: d.totalRostered,
        totalPresent: d.totalPresent,
        totalAbsent: d.totalAbsent,
        totalLate: d.totalLate,
        totalOnLeave: d.totalOnLeave,
        totalUnrostered: d.totalUnrostered,
        totalHolidayOrHalfDay: d.totalHolidayOrHalfDay,
        totalLateMinutes: d.totalLateMinutes,
        totalOvertimeHours: Math.round(d.totalOvertimeHours * 100) / 100,
        attendanceRate:
          d.totalRostered > 0
            ? Math.round((d.totalPresent / d.totalRostered) * 10000) / 100
            : 0,
      })),
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.DEPARTMENT_SUMMARY,
      startDate,
      endDate,
      compiledData,
    );
  }

  // ─────────────────────────────────────────────
  // OVERTIME AUDIT REPORT
  // ─────────────────────────────────────────────

  private async generateOvertimeAuditReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ) {
    const rows: ReportRow[] = [];
    let grandTotalOvertimeHours = 0;

    for await (const batch of this.streamQueryProcessor.streamOvertimeAudit(
      tenantId,
      startDate,
      endDate,
      departmentId,
    )) {
      for (const row of batch) {
        grandTotalOvertimeHours += row.overtimeHours;
        rows.push({
          employeeId: row.userId,
          payrollNumber: row.payrollNumber,
          name: `${row.firstName} ${row.lastName}`,
          department: row.departmentName ?? 'Unassigned',
          date: formatDate(row.date, 'yyyy-MM-dd'),
          shiftName: row.shiftName ?? 'N/A',
          scheduledEnd: row.scheduledEnd
            ? formatDate(row.scheduledEnd, 'HH:mm')
            : null,
          lastOut: row.lastOut ? formatDate(row.lastOut, 'HH:mm') : null,
          totalHoursWorked: row.totalHours ?? 0,
          overtimeHours: Math.round(row.overtimeHours * 100) / 100,
        });
      }
    }

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalOvertimeRecords: rows.length,
        grandTotalOvertimeHours: Math.round(grandTotalOvertimeHours * 100) / 100,
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.OVERTIME_AUDIT,
      startDate,
      endDate,
      compiledData,
    );
  }

  // ─────────────────────────────────────────────
  // LATENESS AUDIT REPORT
  // ─────────────────────────────────────────────

  private async generateLatenessAuditReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ) {
    const rows: ReportRow[] = [];
    let grandTotalLateMinutes = 0;

    for await (const batch of this.streamQueryProcessor.streamLatenessAudit(
      tenantId,
      startDate,
      endDate,
      departmentId,
    )) {
      for (const row of batch) {
        grandTotalLateMinutes += row.lateMinutes;
        rows.push({
          employeeId: row.userId,
          payrollNumber: row.payrollNumber,
          name: `${row.firstName} ${row.lastName}`,
          department: row.departmentName ?? 'Unassigned',
          date: formatDate(row.date, 'yyyy-MM-dd'),
          shiftName: row.shiftName ?? 'N/A',
          scheduledStart: row.scheduledStart
            ? formatDate(row.scheduledStart, 'HH:mm')
            : null,
          actualArrival: row.firstIn ? formatDate(row.firstIn, 'HH:mm') : null,
          lateMinutes: row.lateMinutes,
          status: row.status,
        });
      }
    }

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalLatenessRecords: rows.length,
        grandTotalLateMinutes,
        grandTotalLateHours: Math.round((grandTotalLateMinutes / 60) * 100) / 100,
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.LATENESS_AUDIT,
      startDate,
      endDate,
      compiledData,
    );
  }

  // ─────────────────────────────────────────────
  // ABSENCE AUDIT REPORT
  // ─────────────────────────────────────────────

  private async generateAbsenceAuditReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ) {
    const rows: AbsenceAuditReportRow[] = [];

    for await (const batch of this.streamQueryProcessor.streamAbsenceAudit(
      tenantId,
      startDate,
      endDate,
      departmentId,
    )) {
      for (const row of batch) {
        rows.push({
          employeeId: row.userId,
          payrollNumber: row.payrollNumber,
          name: `${row.firstName} ${row.lastName}`,
          department: row.departmentName ?? 'Unassigned',
          date: formatDate(row.date, 'yyyy-MM-dd'),
          status: row.status,
          shiftName: row.shiftName ?? 'N/A',
        });
      }
    }

    // Group consecutive absences per employee for summary
    const absencesPerEmployee: Record<string, number> = {};
    for (const row of rows) {
      absencesPerEmployee[row.payrollNumber] =
        (absencesPerEmployee[row.payrollNumber] ?? 0) + 1;
    }

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalAbsenceRecords: rows.length,
        uniqueEmployeesAbsent: Object.keys(absencesPerEmployee).length,
        topAbsentees: Object.entries(absencesPerEmployee)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([payrollNumber, count]) => ({ payrollNumber, absenceDays: count })),
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.ABSENCE_AUDIT,
      startDate,
      endDate,
      compiledData,
    );
  }

  // ─────────────────────────────────────────────
  // LIST & FETCH compiled reports
  // ─────────────────────────────────────────────

  async listReports(tenantId: string, query: ReportListQueryDTO) {
    const pagination = normalizePagination(query.page, query.limit);

    if (query.reportType && !Object.values(REPORT_TYPES).includes(query.reportType as ReportType)) {
      throw new BadRequestException(
        `reportType must be one of: ${Object.values(REPORT_TYPES).join(', ')}.`,
      );
    }

    const { items, total } = await this.reportsRepository.listCompiledReports(
      tenantId,
      query.reportType,
      pagination.skip,
      pagination.take,
    );

    return paginatedResponse(
      items.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        dateRangeStart: formatDate(r.dateRangeStart, 'yyyy-MM-dd'),
        dateRangeEnd: formatDate(r.dateRangeEnd, 'yyyy-MM-dd'),
        generatedBy: r.generatedBy,
        createdAt: r.createdAt,
      })),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async getReportById(tenantId: string, id: string) {
    const report = await this.reportsRepository.findCompiledReportById(tenantId, id);

    if (!report) {
      throw new NotFoundException(`Report ${id} not found.`);
    }

    return {
      id: report.id,
      reportType: report.reportType,
      dateRangeStart: formatDate(report.dateRangeStart, 'yyyy-MM-dd'),
      dateRangeEnd: formatDate(report.dateRangeEnd, 'yyyy-MM-dd'),
      generatedBy: report.generatedBy,
      createdAt: report.createdAt,
      compiledData: report.compiledData,
    };
  }

  async downloadReport(tenantId: string, id: string, format: ReportDownloadFormat) {
    const report = await this.reportsRepository.findCompiledReportById(tenantId, id);
    if (!report) throw new NotFoundException(`Report ${id} not found.`);

    if (!['pdf', 'excel'].includes(format)) {
      throw new BadRequestException('format must be either pdf or excel.');
    }

    const compiledData = report.compiledData as { summary?: Record<string, unknown>; rows?: Array<Record<string, unknown>> };

    if (format === 'excel') {
      const rows = Array.isArray(compiledData.rows) ? compiledData.rows : [];
      const buffer = await this.documentCompiler.compileToExcelBuffer(rows, report.reportType);
      return { buffer, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename: `${report.reportType}-${id}.xlsx` };
    }

    const pdfBuffer = await this.documentCompiler.compileToPdfBuffer({
      summary: compiledData.summary ?? {},
      rows: Array.isArray(compiledData.rows) ? compiledData.rows : [],
    });
    return { buffer: pdfBuffer, mimeType: 'application/pdf', filename: `${report.reportType}-${id}.pdf` };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private parseDate(value: string, fieldName: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${fieldName} must be in YYYY-MM-DD format.`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} is not a valid date.`);
    }

    return date;
  }

  private assertDateOrder(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }
  }

  private computeAttendanceRate(statusTotals: Record<string, number>): number {
    const total = Object.values(statusTotals).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;

    const present = statusTotals['PRESENT'] ?? 0;
    return Math.round((present / total) * 10000) / 100;
  }

  private getMinutesBetween(later: Date, earlier: Date): number {
    return Math.round((later.getTime() - earlier.getTime()) / (1000 * 60));
  }

  private async generateShiftComplianceReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    userId?: string,
  ) {
    const rows: ReportRow[] = [];
    let totalIncompleteShifts = 0;
    let totalLateArrivals = 0;
    let totalEarlyDepartures = 0;
    let totalEarlyDepartureMinutes = 0;

    for await (const batch of this.streamQueryProcessor.streamAttendanceSummaries(
      tenantId,
      startDate,
      endDate,
      departmentId,
      userId,
    )) {
      for (const row of batch) {
        if (!row.scheduledStart || !row.scheduledEnd) {
          continue;
        }

        const actualStart = row.firstIn;
        const actualEnd = row.lastOut;
        const scheduledStart = row.scheduledStart;
        const scheduledEnd = row.scheduledEnd;

        const lateArrivalMinutes = actualStart && actualStart > scheduledStart
          ? this.getMinutesBetween(actualStart, scheduledStart)
          : 0;

        const earlyDepartureMinutes = actualEnd && actualEnd < scheduledEnd
          ? this.getMinutesBetween(scheduledEnd, actualEnd)
          : 0;

        const incompleteShift = !actualEnd || (actualEnd < scheduledEnd);
        const complianceNotes: string[] = [];
        if (lateArrivalMinutes > 0) complianceNotes.push('LATE_ARRIVAL');
        if (earlyDepartureMinutes > 0) complianceNotes.push('EARLY_DEPARTURE');
        if (incompleteShift) complianceNotes.push('INCOMPLETE_SHIFT');

        if (lateArrivalMinutes > 0) totalLateArrivals += 1;
        if (earlyDepartureMinutes > 0) {
          totalEarlyDepartures += 1;
          totalEarlyDepartureMinutes += earlyDepartureMinutes;
        }
        if (incompleteShift) totalIncompleteShifts += 1;

        rows.push({
          employeeId: row.userId,
          payrollNumber: row.payrollNumber,
          name: `${row.firstName} ${row.lastName}`,
          department: row.departmentName ?? 'Unassigned',
          date: formatDate(row.date, 'yyyy-MM-dd'),
          shiftName: row.shiftName ?? 'N/A',
          scheduledStart: formatDate(scheduledStart, 'HH:mm'),
          scheduledEnd: formatDate(scheduledEnd, 'HH:mm'),
          actualStart: actualStart ? formatDate(actualStart, 'HH:mm') : null,
          actualEnd: actualEnd ? formatDate(actualEnd, 'HH:mm') : null,
          lateArrivalMinutes,
          earlyDepartureMinutes,
          incompleteShift,
          complianceNotes,
        });
      }
    }

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalRecords: rows.length,
        totalIncompleteShifts,
        totalLateArrivals,
        totalEarlyDepartures,
        averageEarlyDepartureMinutes:
          totalEarlyDepartures > 0
            ? Math.round((totalEarlyDepartureMinutes / totalEarlyDepartures) * 100) / 100
            : 0,
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.SHIFT_COMPLIANCE,
      startDate,
      endDate,
      compiledData,
    );
  }

  private async generatePayrollReadyReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    userId?: string,
  ) {
    const employeeAggregates: Record<string, PayrollReadyAggregate> = {};
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalGrossPay = 0;
    let totalLeaveDays = 0;
    let totalAbsentDays = 0;
    let totalAbsentDeductions = 0;

    for await (const batch of this.streamQueryProcessor.streamAttendanceSummaries(
      tenantId,
      startDate,
      endDate,
      departmentId,
      userId,
    )) {
      const overrides = await this.reportsRepository.getRosterAssignmentOverrides(
        tenantId,
        batch.map((row) => ({ userId: row.userId, date: row.date })),
      );

      for (const row of batch) {
        const rowKey = `${row.userId}:${row.date.toISOString().slice(0, 10)}`;
        const effectiveRate = overrides[rowKey] ?? row.hourlyRate ?? 0;
        const overtimeHours = Math.round(row.overtimeHours * 100) / 100;
        const regularHours = Math.max((row.totalHours ?? 0) - overtimeHours, 0);
        const regularPay = Math.round(regularHours * effectiveRate * 100) / 100;
        const overtimePay = Math.round(overtimeHours * effectiveRate * 1.5 * 100) / 100;
        const grossPay = Math.round((regularPay + overtimePay) * 100) / 100;
        const leaveDay = row.status === 'ON_LEAVE' ? 1 : 0;
        const absentDay = row.status === 'ABSENT' ? 1 : 0;
        const absentDeduction = Math.round((absentDay * (row.scheduledHours ?? 0) * effectiveRate) * 100) / 100;

        totalRegularHours += regularHours;
        totalOvertimeHours += overtimeHours;
        totalGrossPay += grossPay;
        totalLeaveDays += leaveDay;
        totalAbsentDays += absentDay;
        totalAbsentDeductions += absentDeduction;

        const employeeKey = row.userId;
        if (!employeeAggregates[employeeKey]) {
          employeeAggregates[employeeKey] = {
            employeeId: row.userId,
            payrollNumber: row.payrollNumber,
            name: `${row.firstName} ${row.lastName}`,
            department: row.departmentName ?? 'Unassigned',
            hourlyRate: effectiveRate,
            regularHours: 0,
            overtimeHours: 0,
            regularPay: 0,
            overtimePay: 0,
            grossPay: 0,
            leaveDays: 0,
            absentDays: 0,
            absentDeductions: 0,
          };
        }

        const aggregate = employeeAggregates[employeeKey];
        aggregate.regularHours += regularHours;
        aggregate.overtimeHours += overtimeHours;
        aggregate.regularPay += regularPay;
        aggregate.overtimePay += overtimePay;
        aggregate.grossPay += grossPay;
        aggregate.leaveDays += leaveDay;
        aggregate.absentDays += absentDay;
        aggregate.absentDeductions += absentDeduction;
      }
    }

    const rows = Object.values(employeeAggregates).map((employee) => ({
      ...employee,
      regularHours: Math.round(employee.regularHours * 100) / 100,
      overtimeHours: Math.round(employee.overtimeHours * 100) / 100,
      regularPay: Math.round(employee.regularPay * 100) / 100,
      overtimePay: Math.round(employee.overtimePay * 100) / 100,
      grossPay: Math.round(employee.grossPay * 100) / 100,
      absentDeductions: Math.round(employee.absentDeductions * 100) / 100,
    }));

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalEmployees: rows.length,
        totalRegularHours: Math.round(totalRegularHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
        totalGrossPay: Math.round(totalGrossPay * 100) / 100,
        totalLeaveDays,
        totalAbsentDays,
        totalAbsentDeductions: Math.round(totalAbsentDeductions * 100) / 100,
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.PAYROLL_READY,
      startDate,
      endDate,
      compiledData,
    );
  }

  private async generateLeaveAttendanceReconciliationReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    userId?: string,
  ) {
    const rows = await this.reportsRepository.getLeaveAttendanceReconciliation(
      tenantId,
      startDate,
      endDate,
      departmentId,
      userId,
    );

    const formattedRows = rows.map((row) => ({
      employeeId: row.userId,
      payrollNumber: row.payrollNumber,
      name: `${row.firstName} ${row.lastName}`,
      department: row.departmentName ?? 'Unassigned',
      date: formatDate(row.date, 'yyyy-MM-dd'),
      anomalyType: row.anomalyType,
      leaveRequestId: row.leaveRequestId ?? null,
      leaveType: row.leaveType ?? null,
      leaveStatus: row.leaveStatus ?? null,
      attendanceLogsCount: row.attendanceLogsCount,
    }));

    const anomalyTotals: Record<string, number> = {};
    for (const row of formattedRows) {
      anomalyTotals[row.anomalyType] = (anomalyTotals[row.anomalyType] ?? 0) + 1;
    }

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalRows: formattedRows.length,
        totalApprovedLeaveDays:
          (anomalyTotals['APPROVED_LEAVE_NO_LOGS'] ?? 0) + (anomalyTotals['APPROVED_LEAVE_WITH_LOGS'] ?? 0),
        totalApprovedLeaveDaysWithLogs: anomalyTotals['APPROVED_LEAVE_WITH_LOGS'] ?? 0,
        totalApprovedLeaveDaysWithoutLogs: anomalyTotals['APPROVED_LEAVE_NO_LOGS'] ?? 0,
        totalUnauthorizedAbsences: anomalyTotals['UNAUTHORIZED_ABSENCE'] ?? 0,
        uniqueEmployees: Array.from(new Set(formattedRows.map((row) => row.employeeId))).length,
      },
      rows: formattedRows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.LEAVE_ATTENDANCE_RECONCILIATION,
      startDate,
      endDate,
      compiledData,
    );
  }

  private async generateDeviceHealthReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
  ) {
    const rows = await this.reportsRepository.getDeviceHealthReport(
      tenantId,
      startDate,
      endDate,
    );

    const formattedRows = rows.map((row) => ({
      deviceId: row.deviceId,
      deviceName: row.deviceName,
      serialCode: row.serialCode,
      ipAddress: row.ipAddress,
      isActive: row.isActive,
      date: formatDate(row.date, 'yyyy-MM-dd'),
      lastSuccessfulLogAt: row.lastSuccessfulLogAt
        ? `${formatDate(row.lastSuccessfulLogAt, 'yyyy-MM-dd')} ${formatDate(row.lastSuccessfulLogAt, 'HH:mm')}`
        : null,
      eventsLogged: row.eventsLogged,
      zeroEvents: row.zeroEvents,
      duplicateEventSpikes: row.duplicateEventSpikes,
    }));

    const totalZeroDays = formattedRows.filter((r) => r.zeroEvents).length;
    const totalSpikeDays = formattedRows.filter((r) => r.duplicateEventSpikes > 0).length;

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalDeviceDays: formattedRows.length,
        totalZeroEventDays: totalZeroDays,
        totalDuplicateSpikeDays: totalSpikeDays,
        devicesMonitored: new Set(formattedRows.map((r) => r.deviceId)).size,
      },
      rows: formattedRows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.DEVICE_HEALTH,
      startDate,
      endDate,
      compiledData,
    );
  }

  private async generateTurnoverHeadcountReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ) {
    const rows = await this.reportsRepository.getTurnoverAndHeadcountReport(
      tenantId,
      startDate,
      endDate,
      departmentId,
    );

    const totalNewJoiners = rows.reduce((sum, row) => sum + row.newJoiners, 0);
    const totalDepartures = rows.reduce((sum, row) => sum + row.departures, 0);
    const totalActiveHeadcount = rows.reduce((sum, row) => sum + row.activeHeadcount, 0);
    const uniqueDepartments = new Set(rows.map((row) => row.departmentId)).size;
    const uniqueMonths = new Set(rows.map((row) => row.month)).size;
    const totalUnderstaffedPeriods = rows.filter((row) => row.underThreshold).length;

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalRows: rows.length,
        totalDepartments: uniqueDepartments,
        totalMonths: uniqueMonths,
        totalNewJoiners,
        totalDepartures,
        averageActiveHeadcount: rows.length > 0 ? Math.round((totalActiveHeadcount / rows.length) * 100) / 100 : 0,
        totalUnderstaffedPeriods,
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.TURNOVER_HEADCOUNT,
      startDate,
      endDate,
      compiledData,
    );
  }
  private async generateScheduledActualHoursReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ) {
    const rows = await this.reportsRepository.getScheduledActualHoursReport(
      tenantId,
      startDate,
      endDate,
      departmentId,
    );

    const totalRows = rows.length;
    const totalActualHours = rows.reduce((sum, row) => sum + row.actualHours, 0);
    const totalScheduledHours = rows.reduce((sum, row) => sum + row.scheduledHours, 0);
    const totalContractOverrun = rows.reduce((sum, row) => sum + row.hoursOverContract, 0);
    const totalLegalExceeds = rows.filter((row) => row.exceedsLegalThreshold).length;
    const departmentRiskCounts: Record<string, number> = {};
    const departmentOvertimeRows = new Set<string>();

    for (const row of rows) {
      if (row.exceedsLegalThreshold || row.hoursOverContract > 0) {
        departmentRiskCounts[row.departmentName] = (departmentRiskCounts[row.departmentName] ?? 0) + 1;
      }
      if (row.exceedsLegalThreshold) {
        departmentOvertimeRows.add(row.departmentName);
      }
    }

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalRows,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
        totalContractOverrun: Math.round(totalContractOverrun * 100) / 100,
        totalEmployeesAboveLegalThreshold: totalLegalExceeds,
        legalThresholdHours: 48,
        departmentsWithOvertimeRisk: Array.from(departmentOvertimeRows),
        departmentRiskCounts,
      },
      rows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.SCHEDULED_ACTUAL_HOURS,
      startDate,
      endDate,
      compiledData,
    );
  }

  private async generateAuditTrailReport(
    tenantId: string,
    generatedById: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ) {
    const rows = await this.reportsRepository.getAuditTrailReport(
      tenantId,
      startDate,
      endDate,
      departmentId,
    );

    const formattedRows = rows.map((row) => ({
      auditId: row.id,
      actionType: row.actionType,
      justification: row.justification,
      adminUserId: row.user.id,
      adminUserName: `${row.user.firstName} ${row.user.lastName}`,
      adminUserEmail: row.user.email,
      targetSummaryId: row.targetSummaryId ?? null,
      targetDate: row.attendanceSummary ? formatDate(row.attendanceSummary.date, 'yyyy-MM-dd') : null,
      employeeId: row.attendanceSummary?.userId ?? null,
      employeeName: row.attendanceSummary?.user
        ? `${row.attendanceSummary.user.firstName} ${row.attendanceSummary.user.lastName}`
        : null,
      employeePayrollNumber: row.attendanceSummary?.user?.payrollNumber ?? null,
      departmentId: row.attendanceSummary?.user?.department?.id ?? null,
      departmentName: row.attendanceSummary?.user?.department?.name ?? null,
      oldValues: row.oldValues ? JSON.stringify(row.oldValues) : null,
      newValues: row.newValues ? JSON.stringify(row.newValues) : null,
      createdAt: formatDate(row.createdAt, 'yyyy-MM-dd'),
    }));

    const compiledData = {
      summary: {
        dateRange: { start: formatDate(startDate, 'yyyy-MM-dd'), end: formatDate(endDate, 'yyyy-MM-dd') },
        totalRows: formattedRows.length,
        uniqueAdmins: new Set(formattedRows.map((row) => row.adminUserId)).size,
        uniqueEmployees: new Set(
          formattedRows.map((row) => row.employeeId).filter((id) => id !== null),
        ).size,
      },
      rows: formattedRows,
    };

    return this.reportsRepository.saveCompiledReport(
      tenantId,
      generatedById,
      REPORT_TYPES.ATTENDANCE_AUDIT_TRAIL,
      startDate,
      endDate,
      compiledData,
    );
  }
}

export { REPORT_TYPES, type ReportQueryDTO, type ReportListQueryDTO, type ReportDownloadFormat } from './reports.types';
