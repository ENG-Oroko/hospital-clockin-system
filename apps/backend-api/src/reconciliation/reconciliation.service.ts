import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { EmployeeService } from '../employee/employee.service';
import { PrismaService } from '../database/prisma.service';
import { RosterService } from '../roster/roster.service';

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
  department?: { rules?: unknown } | null;
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly db: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly employeeService: EmployeeService,
    private readonly rosterService: RosterService,
  ) {}

  async reconcileUserDate(tenantId: string, employeeId: string, date: Date | string) {
    await this.employeeService.assertEmployeeEligible(tenantId, employeeId);
    const shiftDate = this.normalizeDateOnly(date);
    const assignment = await this.rosterService.getActiveAssignmentForUserDate(tenantId, employeeId, shiftDate);

    if (!assignment) {
      return this.reconcileUnrosteredLogs(tenantId, employeeId, shiftDate);
    }

    return this.reconcileAssignment(tenantId, assignment as ReconciliationSnapshot);
  }

  async reconcileAssignmentById(tenantId: string, assignmentId: string) {
    const assignment = await this.rosterService.getAssignmentSnapshot(tenantId, assignmentId);
    await this.employeeService.assertEmployeeEligible(tenantId, assignment.employeeId);
    return this.reconcileAssignment(tenantId, assignment as ReconciliationSnapshot);
  }

  async reconcileDepartmentDate(tenantId: string, departmentId: string, date: Date | string) {
    const shiftDate = this.normalizeDateOnly(date);
    const assignments = await this.rosterService.getDepartmentRoster(tenantId, departmentId, shiftDate);
    const results = [];

    for (const assignment of assignments) {
      results.push(await this.reconcileAssignment(tenantId, assignment as ReconciliationSnapshot));
    }

    return { processed: results.length, results };
  }

  async getPayrollReadyRecords(tenantId: string, startDate: Date, endDate: Date) {
    return this.db.reconciliationLog.findMany({
      where: {
        tenantId,
        isResolved: true,
        rosterAssignment: {
          date: {
            gte: this.normalizeDateOnly(startDate),
            lte: this.normalizeDateOnly(endDate),
          },
        },
      },
      include: {
        rosterAssignment: {
          include: {
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async reconcileAssignment(tenantId: string, assignment: ReconciliationSnapshot) {
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
    const exceptionReason = this.resolveExceptionReason({
      absent,
      missingIn,
      missingOut,
      lateMinutes,
    });
    const isFlagged = Boolean(exceptionReason);
    const isResolved = !missingIn && !missingOut;

    const reconciliationLog = await this.db.reconciliationLog.upsert({
      where: { rosterAssignmentId: assignment.id },
      update: {
        clockInTime: firstIn,
        clockOutTime: lastOut,
        calculatedBaseHours: this.minutesToHours(baseMinutes),
        calculatedOvertime: this.minutesToHours(overtimeMinutes),
        calculatedNightShift: this.minutesToHours(nightMinutes),
        isFlagged,
        exceptionReason,
        isResolved,
      },
      create: {
        tenantId,
        rosterAssignmentId: assignment.id,
        clockInTime: firstIn,
        clockOutTime: lastOut,
        calculatedBaseHours: this.minutesToHours(baseMinutes),
        calculatedOvertime: this.minutesToHours(overtimeMinutes),
        calculatedNightShift: this.minutesToHours(nightMinutes),
        isFlagged,
        exceptionReason,
        isResolved,
      },
    });

    if (logs.length > 0) {
      await this.db.attendanceLog.updateMany({
        where: { id: { in: logs.map((log) => log.id) }, tenantId },
        data: { rosterAssignmentId: assignment.id },
      });
    }

    return {
      reconciliationLog,
      summary: {
        tenantId,
        userId: assignment.employeeId,
        date: assignment.date,
        firstIn,
        lastOut,
        totalHours: this.minutesToHours(workedMinutes),
        status: this.resolveAttendanceStatus(absent, lateMinutes),
        shiftId: assignment.shiftTemplateId,
        scheduledStart,
        scheduledEnd,
        scheduledHours: this.minutesToHours(scheduledMinutes),
        lateMinutes,
        overtimeHours: this.minutesToHours(overtimeMinutes),
      },
    };
  }

  private async reconcileUnrosteredLogs(tenantId: string, employeeId: string, date: Date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    const logs = await this.attendanceService.findRawLogsForUserWindow(tenantId, employeeId, start, end);

    if (logs.length === 0) {
      throw new NotFoundException('No roster assignment or attendance logs were found for this employee date.');
    }

    const firstIn = logs.find((log) => log.direction === 'IN')?.timestamp ?? null;
    const outLogs = logs.filter((log) => log.direction === 'OUT');
    const lastOut = outLogs[outLogs.length - 1]?.timestamp ?? null;
    const workedMinutes = firstIn && lastOut ? Math.max(0, Math.floor((lastOut.getTime() - firstIn.getTime()) / 60000)) : 0;

    return {
      reconciliationLog: null,
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
}
