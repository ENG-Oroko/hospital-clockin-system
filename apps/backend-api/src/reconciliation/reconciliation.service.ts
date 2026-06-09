import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AttendanceService } from '../attendance/attendance.service';
import { DepartmentService } from '../department/department.service';
import { EmployeeService } from '../employee/employee.service';
import { assertUuid } from '../common/validation';
import { RosterService } from '../roster/roster.service';
import {
  PayrollReadyRecordDTO,
  ReconciliationApprovalDTO,
  ReconciliationOverrideDTO,
  ReconciliationResultDTO,
  UnrosteredExceptionOverrideDTO,
  UnrosteredExceptionReviewDTO,
} from './dto/reconciliation.dto';
import { ReconciliationRepository } from './reconciliation.repository';

const UNROSTERED_REASON = 'Attendance recorded without roster assignment';
const UNROSTERED_ACTIVE_STATES = new Set(['REQUIRES_REVIEW', 'REVIEWED']);

interface ReconciliationSnapshot {
  id: string;
  employeeId: string;
  departmentId: string;
  shiftTemplateId: string;
  date: Date;
  overriddenHourlyRate: number | null;
  startTimeSnapshot: string;
  endTimeSnapshot: string;
  gracePeriodSnapshot: number;
  overtimeThresholdSnapshot: number;
  overnightSnapshot: boolean;
  department?: { id?: string; code?: string; rules?: unknown } | null;
  employee?: { id: string; firstName?: string; lastName?: string; payrollNumber?: string } | null;
}

interface ReconcileOptions {
  actorUserId?: string;
  reason?: string;
  employeeId?: string;
  departmentId?: string;
}

export interface UnrosteredExceptionState {
  exceptionId: string;
  tenantId: string;
  employeeId: string;
  attendanceDate: string;
  attendanceLogIds: string[];
  devices: Array<{ id: string; name?: string | null; serialCode?: string | null }>;
  outcome: 'UNROSTERED';
  reviewStatus: string;
  reviewState: string;
  reason: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  actionTaken?: string;
  createdAt?: Date;
  updatedAt?: Date;
  auditTrail?: unknown[];
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly departmentService: DepartmentService,
    private readonly employeeService: EmployeeService,
    private readonly rosterService: RosterService,
    private readonly reconciliationRepository: ReconciliationRepository,
  ) {}

  async reconcileUserDate(
    tenantId: string,
    employeeId: string,
    date: Date | string,
    options: ReconcileOptions = {},
  ): Promise<ReconciliationResultDTO> {
    await this.employeeService.assertEmployeeEligible(tenantId, employeeId);
    const shiftDate = this.normalizeDateOnly(date);
    const assignment = await this.rosterService.getActiveAssignmentForUserDate(tenantId, employeeId, shiftDate);

    if (!assignment) {
      return this.reconcileUnrosteredLogs(tenantId, employeeId, shiftDate, options);
    }

    return this.reconcileAssignment(tenantId, assignment as ReconciliationSnapshot, options);
  }

  /**
   * Public integration contract for manual correction and roster-driven workflows.
   */
  async reconcileAssignmentById(
    tenantId: string,
    assignmentId: string,
    options: ReconcileOptions = {},
  ): Promise<ReconciliationResultDTO> {
    const assignment = await this.rosterService.getAssignmentSnapshot(tenantId, assignmentId);
    await this.employeeService.assertEmployeeEligible(tenantId, assignment.employeeId);
    return this.reconcileAssignment(tenantId, assignment as ReconciliationSnapshot, options);
  }

  /**
   * Public integration contract for department-level reconciliation.
   */
  async reconcileDepartmentDate(
    tenantId: string,
    departmentId: string,
    date: Date | string,
    options: ReconcileOptions = {},
  ) {
    await this.departmentService.findOne(departmentId, tenantId);
    const shiftDate = this.normalizeDateOnly(date);
    const assignments = await this.rosterService.getDepartmentRoster(tenantId, departmentId, shiftDate);
    const results = [];

    for (const assignment of assignments) {
      await this.employeeService.assertEmployeeEligible(tenantId, assignment.employeeId);
      results.push(await this.reconcileAssignment(tenantId, assignment as ReconciliationSnapshot, options));
    }

    return { processed: results.length, results };
  }

  /**
   * Public integration contract for batch queue processing and payroll-period preparation.
   */
  async reconcileDateRange(
    tenantId: string,
    startDate: Date | string,
    endDate: Date | string,
    options: ReconcileOptions = {},
  ) {
    const start = this.normalizeDateOnly(startDate);
    const end = this.normalizeDateOnly(endDate);

    if (end < start) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }

    if (options.departmentId) {
      await this.departmentService.findOne(options.departmentId, tenantId);
    }

    const assignments = await this.rosterService.getAssignmentsForDateRange(tenantId, start, end, {
      employeeId: options.employeeId,
      departmentId: options.departmentId,
    });
    const results = [];

    for (const assignment of assignments) {
      const lifecycle = await this.employeeService.getEmployeeLifecycleState(tenantId, assignment.employeeId);
      if (!lifecycle.isActive || lifecycle.deletedAt || ['TERMINATED', 'SUSPENDED'].includes(lifecycle.employmentStatus)) {
        continue;
      }
      results.push(await this.reconcileAssignment(tenantId, assignment as ReconciliationSnapshot, options));
    }

    return { processed: results.length, skipped: assignments.length - results.length, results };
  }

  /**
   * Public integration contract for Payroll.
   * Returns only tenant-scoped, resolved, unflagged reconciliation records.
   */
  async getPayrollReadyRecords(tenantId: string, startDate: Date, endDate: Date) {
    const records = await this.reconciliationRepository.findPayrollReadyRecords(
      tenantId,
      this.normalizeDateOnly(startDate),
      this.normalizeDateOnly(endDate),
    );
    return records.map((record) => this.toPayrollReadyRecord(record));
  }

  async getPayrollPreview(tenantId: string, startDate: Date, endDate: Date) {
    const records = await this.getPayrollReadyRecords(tenantId, startDate, endDate);
    const totals = records.reduce(
      (sum, record) => ({
        baseHours: sum.baseHours + record.baseHours,
        overtimeHours: sum.overtimeHours + record.overtimeHours,
        nightHours: sum.nightHours + record.nightHours,
      }),
      { baseHours: 0, overtimeHours: 0, nightHours: 0 },
    );

    return {
      records,
      totals,
      employeeCount: new Set(records.map((record) => record.employeeId)).size,
    };
  }

  async getExceptionReview(tenantId: string, startDate?: Date, endDate?: Date) {
    return this.reconciliationRepository.findExceptions(
      tenantId,
      startDate ? this.normalizeDateOnly(startDate) : undefined,
      endDate ? this.normalizeDateOnly(endDate) : undefined,
    );
  }

  /**
   * Public integration contract for exception-management consumers.
   */
  async listUnrosteredExceptions(tenantId: string) {
    const audits = await this.reconciliationRepository.findUnrosteredExceptionAudits(tenantId);
    return this.groupUnrosteredExceptionAudits(audits).filter((exception) => (
      UNROSTERED_ACTIVE_STATES.has(exception.reviewStatus)
    ));
  }

  /**
   * Public integration contract for exception-management detail views.
   */
  async getUnrosteredException(tenantId: string, exceptionId: string) {
    const exception = await this.getUnrosteredExceptionOrThrow(tenantId, exceptionId);
    const logs = await this.reconciliationRepository.findAttendanceLogsForUserDate(
      tenantId,
      exception.employeeId,
      this.normalizeDateOnly(exception.attendanceDate),
    );

    return {
      ...exception,
      logs: logs.filter((log) => exception.attendanceLogIds.includes(log.id)),
    };
  }

  async reviewUnrosteredException(
    tenantId: string,
    exceptionId: string,
    actorUserId: string,
    payload: UnrosteredExceptionReviewDTO,
  ) {
    const existing = await this.getUnrosteredExceptionOrThrow(tenantId, exceptionId);
    const next = {
      ...existing,
      reviewStatus: 'REVIEWED',
      reviewState: 'REVIEWED',
      reviewedByUserId: actorUserId,
      reviewedAt: new Date().toISOString(),
      actionTaken: payload.action,
    };

    await this.reconciliationRepository.createAudit({
      tenantId,
      actorUserId,
      actionType: 'UNROSTERED_EXCEPTION_REVIEWED',
      targetLogId: existing.attendanceLogIds[0],
      justification: payload.reason,
      oldValues: existing,
      newValues: next,
    });

    return next;
  }

  async approveUnrosteredOverride(
    tenantId: string,
    exceptionId: string,
    actorUserId: string,
    payload: UnrosteredExceptionOverrideDTO,
  ) {
    const existing = await this.getUnrosteredExceptionOrThrow(tenantId, exceptionId);
    const next = {
      ...existing,
      reviewStatus: 'APPROVED_OVERRIDE',
      reviewState: 'APPROVED_OVERRIDE',
      reviewedByUserId: actorUserId,
      reviewedAt: new Date().toISOString(),
      actionTaken: 'APPROVED_OVERRIDE',
    };

    await this.reconciliationRepository.createAudit({
      tenantId,
      actorUserId,
      actionType: 'UNROSTERED_EXCEPTION_OVERRIDE_APPROVED',
      targetLogId: existing.attendanceLogIds[0],
      justification: payload.reason,
      oldValues: existing,
      newValues: next,
    });

    return {
      ...next,
      payrollReadyRecord: null,
    };
  }

  async reprocessUnrosteredException(tenantId: string, exceptionId: string, actorUserId: string, reason?: string) {
    const existing = await this.getUnrosteredExceptionOrThrow(tenantId, exceptionId);
    const result = await this.reconcileUserDate(tenantId, existing.employeeId, existing.attendanceDate, {
      actorUserId,
      reason: reason ?? 'Reprocess unrostered exception after roster correction',
    });

    if (!result.reconciliationLog) {
      const next = {
        ...(result.exception as UnrosteredExceptionState ?? existing),
        reviewStatus: 'REQUIRES_REVIEW',
        reviewState: 'REQUIRES_REVIEW',
        reviewedByUserId: actorUserId,
        reviewedAt: new Date().toISOString(),
        actionTaken: 'REPROCESS_ATTEMPTED',
      };

      await this.reconciliationRepository.createAudit({
        tenantId,
        actorUserId,
        actionType: 'UNROSTERED_EXCEPTION_REPROCESSED',
        targetLogId: existing.attendanceLogIds[0],
        justification: reason ?? 'Reprocess attempted but roster correction is still missing',
        oldValues: existing,
        newValues: next,
      });

      return {
        exception: next,
        result,
        cleared: false,
      };
    }

    const next = {
      ...existing,
      reviewStatus: 'CLEARED',
      reviewState: 'CLEARED',
      reviewedByUserId: actorUserId,
      reviewedAt: new Date().toISOString(),
      actionTaken: 'REPROCESSED',
    };

    await this.reconciliationRepository.createAudit({
      tenantId,
      actorUserId,
      actionType: 'UNROSTERED_EXCEPTION_CLEARED',
      targetLogId: existing.attendanceLogIds[0],
      justification: reason ?? 'Roster correction reconciled successfully',
      oldValues: existing,
      newValues: {
        ...next,
        reconciliationLogId: (result.reconciliationLog as { id?: string })?.id,
      },
    });

    return {
      exception: next,
      result,
      cleared: true,
    };
  }

  async reprocess(tenantId: string, startDate: Date | string, endDate: Date | string, options: ReconcileOptions = {}) {
    const result = await this.reconcileDateRange(tenantId, startDate, endDate, options);
    await this.audit(tenantId, options.actorUserId, 'RECONCILIATION_REPROCESS', options.reason ?? 'Reprocess requested', {
      startDate,
      endDate,
      employeeId: options.employeeId,
      departmentId: options.departmentId,
      processed: result.processed,
    });
    return result;
  }

  async overrideResult(
    tenantId: string,
    reconciliationLogId: string,
    actorUserId: string,
    payload: ReconciliationOverrideDTO,
  ) {
    assertUuid(reconciliationLogId, 'reconciliationLogId');
    const existing = await this.reconciliationRepository.findByIdOrThrow(tenantId, reconciliationLogId);
    const data: Record<string, unknown> = {
      isFlagged: Boolean(payload.exceptionReason),
      exceptionReason: payload.exceptionReason ?? null,
      isResolved: !payload.exceptionReason,
    };

    if (payload.calculatedBaseHours !== undefined) data.calculatedBaseHours = payload.calculatedBaseHours;
    if (payload.calculatedOvertime !== undefined) data.calculatedOvertime = payload.calculatedOvertime;
    if (payload.calculatedNightShift !== undefined) data.calculatedNightShift = payload.calculatedNightShift;

    await this.reconciliationRepository.updateById(tenantId, reconciliationLogId, data);
    const updated = await this.reconciliationRepository.findByIdOrThrow(tenantId, reconciliationLogId);
    await this.audit(tenantId, actorUserId, 'RECONCILIATION_OVERRIDE', payload.reason, {
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  }

  async approveResult(
    tenantId: string,
    reconciliationLogId: string,
    actorUserId: string,
    payload: ReconciliationApprovalDTO,
  ) {
    assertUuid(reconciliationLogId, 'reconciliationLogId');
    const existing = await this.reconciliationRepository.findByIdOrThrow(tenantId, reconciliationLogId);
    await this.reconciliationRepository.updateById(tenantId, reconciliationLogId, {
      isResolved: true,
      isFlagged: false,
      exceptionReason: null,
    });
    const updated = await this.reconciliationRepository.findByIdOrThrow(tenantId, reconciliationLogId);
    await this.audit(tenantId, actorUserId, 'RECONCILIATION_APPROVAL', payload.reason, {
      previousValue: existing,
      newValue: updated,
    });
    return updated;
  }

  private async reconcileAssignment(
    tenantId: string,
    assignment: ReconciliationSnapshot,
    options: ReconcileOptions,
  ): Promise<ReconciliationResultDTO> {
    const { scheduledStart, scheduledEnd } = this.getScheduledWindow(assignment.date, assignment);
    const logs = await this.attendanceService.findRawLogsForUserWindow(
      tenantId,
      assignment.employeeId,
      scheduledStart,
      scheduledEnd,
    );

    const inLogs = logs.filter((log) => log.direction === 'IN');
    const outLogs = logs.filter((log) => log.direction === 'OUT');
    const firstIn = inLogs[0]?.timestamp ?? null;
    const lastOut = outLogs[outLogs.length - 1]?.timestamp ?? null;
    const missingIn = !firstIn;
    const missingOut = !lastOut;
    const absent = logs.length === 0;
    const workedMinutes = firstIn && lastOut ? Math.max(0, Math.floor((lastOut.getTime() - firstIn.getTime()) / 60000)) : 0;
    const scheduledMinutes = Math.max(0, Math.floor((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000));
    const lateMinutes = firstIn
      ? Math.max(0, Math.floor((firstIn.getTime() - scheduledStart.getTime()) / 60000) - assignment.gracePeriodSnapshot)
      : 0;
    const overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes - assignment.overtimeThresholdSnapshot);
    const baseMinutes = Math.max(0, workedMinutes - overtimeMinutes);
    const nightMinutes = assignment.overnightSnapshot ? workedMinutes : 0;
    const exceptionReason = this.resolveExceptionReason({ absent, missingIn, missingOut, lateMinutes });
    const isFlagged = Boolean(exceptionReason);
    const isResolved = !missingIn && !missingOut;

    const reconciliationLog = await this.reconciliationRepository.upsertAssignmentResult(tenantId, assignment.id, {
      clockInTime: firstIn,
      clockOutTime: lastOut,
      calculatedBaseHours: this.minutesToHours(baseMinutes),
      calculatedOvertime: this.minutesToHours(overtimeMinutes),
      calculatedNightShift: this.minutesToHours(nightMinutes),
      isFlagged,
      exceptionReason,
      isResolved,
    });

    await this.reconciliationRepository.linkLogsToAssignment(
      tenantId,
      logs.map((log) => log.id),
      assignment.id,
    );

    if (options.actorUserId) {
      await this.audit(tenantId, options.actorUserId, 'RECONCILIATION_RUN', options.reason ?? 'Reconciliation run', {
        reconciliationLogId: reconciliationLog.id,
        rosterAssignmentId: assignment.id,
      });
    }

    return {
      reconciliationLog,
      payrollReadyRecord: isResolved && !isFlagged
        ? this.toPayrollReadyRecord({ ...reconciliationLog, rosterAssignment: assignment })
        : null,
      summary: {
        tenantId,
        userId: assignment.employeeId,
        date: assignment.date,
        firstIn,
        lastOut,
        totalHours: this.minutesToHours(workedMinutes),
        status: this.resolveAttendanceStatus(absent, lateMinutes),
        scheduledStart,
        scheduledEnd,
        scheduledHours: this.minutesToHours(scheduledMinutes),
        lateMinutes,
        overtimeHours: this.minutesToHours(overtimeMinutes),
      },
    };
  }

  private async reconcileUnrosteredLogs(
    tenantId: string,
    employeeId: string,
    date: Date,
    options: ReconcileOptions,
  ): Promise<ReconciliationResultDTO> {
    const logs = await this.reconciliationRepository.findAttendanceLogsForUserDate(tenantId, employeeId, date);

    if (logs.length === 0) {
      throw new NotFoundException('No roster assignment or attendance logs were found for this employee date.');
    }

    const firstIn = logs.find((log) => log.direction === 'IN')?.timestamp ?? null;
    const outLogs = logs.filter((log) => log.direction === 'OUT');
    const lastOut = outLogs[outLogs.length - 1]?.timestamp ?? null;
    const workedMinutes = firstIn && lastOut ? Math.max(0, Math.floor((lastOut.getTime() - firstIn.getTime()) / 60000)) : 0;

    const exception = await this.ensureUnrosteredException(tenantId, employeeId, date, logs, options);

    return {
      reconciliationLog: null,
      payrollReadyRecord: null,
      exception,
      summary: {
        tenantId,
        userId: employeeId,
        date,
        firstIn,
        lastOut,
        totalHours: this.minutesToHours(workedMinutes),
        status: 'UNROSTERED',
      },
    };
  }

  private async ensureUnrosteredException(
    tenantId: string,
    employeeId: string,
    date: Date,
    logs: any[],
    options: ReconcileOptions,
  ): Promise<UnrosteredExceptionState> {
    const attendanceDate = date.toISOString().slice(0, 10);
    const existing = (await this.listUnrosteredExceptions(tenantId)).find(
      (exception) => exception.employeeId === employeeId && exception.attendanceDate === attendanceDate,
    );

    if (existing) {
      return existing;
    }

    const exception: UnrosteredExceptionState = {
      exceptionId: randomUUID(),
      tenantId,
      employeeId,
      attendanceDate,
      attendanceLogIds: logs.map((log) => log.id),
      devices: logs
        .map((log) => log.device)
        .filter(Boolean)
        .map((device) => ({
          id: device.id,
          name: device.name,
          serialCode: device.serialCode,
        })),
      outcome: 'UNROSTERED',
      reviewStatus: 'REQUIRES_REVIEW',
      reviewState: 'REQUIRES_REVIEW',
      reason: UNROSTERED_REASON,
    };

    await this.reconciliationRepository.createAudit({
      tenantId,
      actorUserId: options.actorUserId ?? employeeId,
      actionType: 'UNROSTERED_EXCEPTION_CREATED',
      targetLogId: exception.attendanceLogIds[0],
      justification: options.reason ?? UNROSTERED_REASON,
      newValues: exception,
    });

    return exception;
  }

  private async getUnrosteredExceptionOrThrow(tenantId: string, exceptionId: string) {
    const audits = await this.reconciliationRepository.findUnrosteredExceptionAuditById(tenantId, exceptionId);
    const [exception] = this.groupUnrosteredExceptionAudits(audits);

    if (!exception) {
      throw new NotFoundException('Unrostered reconciliation exception was not found for this tenant.');
    }

    return exception;
  }

  private groupUnrosteredExceptionAudits(audits: any[]): UnrosteredExceptionState[] {
    const byId = new Map<string, UnrosteredExceptionState>();

    for (const audit of audits) {
      const oldValue = this.asExceptionState(audit.oldValues);
      const newValue = this.asExceptionState(audit.newValues);
      const current = newValue ?? oldValue;

      if (!current?.exceptionId) {
        continue;
      }

      const previous = byId.get(current.exceptionId);
      byId.set(current.exceptionId, {
        ...previous,
        ...current,
        createdAt: previous?.createdAt ?? audit.createdAt,
        updatedAt: audit.createdAt,
        auditTrail: [
          ...(previous?.auditTrail ?? []),
          {
            id: audit.id,
            actionType: audit.actionType,
            justification: audit.justification,
            actorUserId: audit.userId,
            actor: audit.user,
            createdAt: audit.createdAt,
            previousState: oldValue?.reviewStatus ?? oldValue?.reviewState,
            newState: newValue?.reviewStatus ?? newValue?.reviewState,
          },
        ],
      });
    }

    return [...byId.values()];
  }

  private asExceptionState(value: unknown): UnrosteredExceptionState | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<UnrosteredExceptionState>;
    if (candidate.outcome !== 'UNROSTERED' || !candidate.exceptionId) {
      return null;
    }

    const reviewStatus = candidate.reviewStatus ?? candidate.reviewState ?? 'REQUIRES_REVIEW';
    return {
      ...candidate,
      reviewStatus,
      reviewState: candidate.reviewState ?? reviewStatus,
    } as UnrosteredExceptionState;
  }

  private getScheduledWindow(date: Date, assignment: ReconciliationSnapshot) {
    const scheduledStart = this.toDateTime(date, assignment.startTimeSnapshot);
    const scheduledEnd = this.toDateTime(date, assignment.endTimeSnapshot);

    if (assignment.overnightSnapshot || scheduledEnd <= scheduledStart) {
      scheduledEnd.setUTCDate(scheduledEnd.getUTCDate() + 1);
    }

    return { scheduledStart, scheduledEnd };
  }

  private toDateTime(date: Date, time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setUTCHours(hours, minutes, 0, 0);
    return result;
  }

  private normalizeDateOnly(date: Date | string) {
    const value = typeof date === 'string' ? new Date(date) : date;

    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException('A valid date is required.');
    }

    return new Date(value.toISOString().slice(0, 10));
  }

  private minutesToHours(minutes: number) {
    return Math.round((minutes / 60) * 100) / 100;
  }

  private resolveExceptionReason(input: { absent: boolean; missingIn: boolean; missingOut: boolean; lateMinutes: number }) {
    if (input.absent) return 'ABSENT';
    if (input.missingIn) return 'MISSED_IN';
    if (input.missingOut) return 'MISSED_OUT';
    if (input.lateMinutes > 0) return 'LATE_CHECKIN';
    return null;
  }

  private resolveAttendanceStatus(absent: boolean, lateMinutes: number) {
    if (absent) return 'ABSENT';
    if (lateMinutes > 0) return 'LATE';
    return 'PRESENT';
  }

  private toPayrollReadyRecord(record: any): PayrollReadyRecordDTO {
    const assignment = record.rosterAssignment;
    const employee = assignment?.user ?? assignment?.employee;

    return {
      reconciliationLogId: record.id,
      tenantId: record.tenantId,
      employeeId: assignment.userId ?? assignment.employeeId,
      payrollNumber: employee?.payrollNumber,
      employeeName: employee ? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() : undefined,
      departmentId: assignment.departmentId,
      departmentCode: assignment.department?.code,
      departmentRules: assignment.department?.rules,
      rosterAssignmentId: assignment.id,
      shiftDate: assignment.date.toISOString().slice(0, 10),
      baseHours: Number(record.calculatedBaseHours),
      overtimeHours: Number(record.calculatedOvertime),
      nightHours: Number(record.calculatedNightShift),
      hourlyRate: assignment.overriddenHourlyRate === null || assignment.overriddenHourlyRate === undefined
        ? null
        : Number(assignment.overriddenHourlyRate),
      isFlagged: record.isFlagged,
      isResolved: record.isResolved,
      exceptionReason: record.exceptionReason,
    };
  }

  private async audit(tenantId: string, actorUserId: string | undefined, actionType: string, justification: string, values: unknown) {
    if (!actorUserId) {
      return;
    }

    await this.reconciliationRepository.createAudit({
      tenantId,
      actorUserId,
      actionType,
      justification,
      newValues: values,
    });
  }
}
