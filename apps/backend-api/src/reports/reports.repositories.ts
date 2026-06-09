import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface AttendanceSummaryRow {
  userId: string;
  firstName: string;
  lastName: string;
  payrollNumber: string;
  hourlyRate: number;
  departmentId: string | null;
  departmentName: string | null;
  date: Date;
  status: string;
  firstIn: Date | null;
  lastOut: Date | null;
  totalHours: number | null;
  lateMinutes: number;
  overtimeHours: number;
  shiftName: string | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  scheduledHours: number | null;
}

export interface DepartmentAttendanceRow {
  departmentId: string;
  departmentName: string;
  totalRostered: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalOnLeave: number;
  totalUnrostered: number;
  totalHolidayOrHalfDay: number;
  totalLateMinutes: number;
  totalOvertimeHours: number;
}

export interface OvertimeAuditRow {
  userId: string;
  firstName: string;
  lastName: string;
  payrollNumber: string;
  departmentId: string | null;
  departmentName: string | null;
  date: Date;
  shiftName: string | null;
  scheduledEnd: Date | null;
  lastOut: Date | null;
  overtimeHours: number;
  totalHours: number | null;
}

export interface LatenessAuditRow {
  userId: string;
  firstName: string;
  lastName: string;
  payrollNumber: string;
  departmentId: string | null;
  departmentName: string | null;
  date: Date;
  shiftName: string | null;
  scheduledStart: Date | null;
  firstIn: Date | null;
  lateMinutes: number;
  status: string;
}

export interface AbsenceAuditRow {
  userId: string;
  firstName: string;
  lastName: string;
  payrollNumber: string;
  departmentId: string | null;
  departmentName: string | null;
  date: Date;
  status: string;
  shiftName: string | null;
}

export interface DeviceHealthRow {
  deviceId: string;
  deviceName: string;
  serialCode: string;
  ipAddress: string | null;
  isActive: boolean;
  date: Date;
  lastSuccessfulLogAt: Date | null;
  eventsLogged: number;
  zeroEvents: boolean;
  duplicateEventSpikes: number;
}

export interface TurnoverHeadcountRow {
  departmentId: string;
  departmentName: string;
  month: string;
  activeHeadcount: number;
  newJoiners: number;
  departures: number;
  threshold: number | null;
  underThreshold: boolean;
}

export interface AuditTrailRow {
  id: string;
  tenantId: string;
  userId: string;
  targetSummaryId: string | null;
  actionType: string;
  justification: string;
  oldValues: unknown;
  newValues: unknown;
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  attendanceSummary?: {
    id: string;
    date: Date;
    userId: string;
    user?: {
      firstName: string;
      lastName: string;
      payrollNumber: string;
      department?: {
        id: string;
        name: string;
      } | null;
    };
  } | null;
}

export interface LeaveAttendanceReconciliationRow {
  userId: string;
  firstName: string;
  lastName: string;
  payrollNumber: string;
  departmentId: string | null;
  departmentName: string | null;
  date: Date;
  anomalyType: 'APPROVED_LEAVE_NO_LOGS' | 'APPROVED_LEAVE_WITH_LOGS' | 'UNAUTHORIZED_ABSENCE';
  leaveRequestId?: string;
  leaveType?: string;
  leaveStatus?: string;
  attendanceLogsCount: number;
}

export interface ScheduledActualHoursRow {
  employeeId: string;
  payrollNumber: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  weekStart: Date;
  weekEnd: Date;
  scheduledHours: number;
  actualHours: number;
  hoursOverContract: number;
  exceedsLegalThreshold: boolean;
  legalThresholdHours: number;
}

export interface CompiledReportRecord {
  id: string;
  reportType: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  compiledData: any;
  createdAt: Date;
  generatedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

@Injectable()
export class ReportsRepository {
  constructor(private readonly db: PrismaService) {}

  /**
   * Streams attendance summaries in batches of 100 rows to keep memory usage flat.
   * Uses cursor-style pagination (skip/take) — safe for datasets of 100k+ rows.
   */
  async *streamAttendanceSummaries(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    userId?: string,
    batchSize = 100,
  ): AsyncGenerator<AttendanceSummaryRow[]> {
    let skip = 0;

    while (true) {
      const userFilter: Record<string, unknown> = { tenantId };
      if (departmentId) userFilter.departmentId = departmentId;

      const whereClause: Record<string, unknown> = {
        tenantId,
        date: { gte: startDate, lte: endDate },
      };

      if (userId) {
        whereClause.userId = userId;
      } else if (departmentId) {
        // resolve users in this department first
        const users = await this.db.user.findMany({
          where: userFilter,
          select: { id: true },
        });
        whereClause.userId = { in: users.map((u) => u.id) };
      }

      const rows = await this.db.attendanceSummary.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              payrollNumber: true,
            hourlyRate: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ date: 'asc' }, { userId: 'asc' }],
        skip,
        take: batchSize,
      });

      if (rows.length === 0) break;

      yield rows.map((r) => ({
        userId: r.userId,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        payrollNumber: r.user.payrollNumber,
        hourlyRate: Number(r.user.hourlyRate),
        departmentId: r.user.department?.id ?? null,
        departmentName: r.user.department?.name ?? null,
        date: r.date,
        status: r.status,
        firstIn: r.firstIn,
        lastOut: r.lastOut,
        totalHours: r.totalHours,
        lateMinutes: r.lateMinutes,
        overtimeHours: r.overtimeHours,
        shiftName: r.shiftName,
        scheduledStart: r.scheduledStart,
        scheduledEnd: r.scheduledEnd,
        scheduledHours: r.scheduledHours,
      }));

      if (rows.length < batchSize) break;
      skip += batchSize;
    }
  }

  async getRosterAssignmentOverrides(
    tenantId: string,
    rows: Array<{ userId: string; date: Date }>,
  ): Promise<Record<string, number | null>> {
    const uniqueKeys = new Set(rows.map((row) => `${row.userId}:${row.date.toISOString().slice(0, 10)}`));
    if (uniqueKeys.size === 0) return {};

    const conditions = Array.from(uniqueKeys).map((key) => {
      const [userId, dateString] = key.split(':');
      return {
        tenantId,
        userId,
        date: new Date(`${dateString}T00:00:00.000Z`),
        supersededAt: null,
      };
    });

    const assignments = await this.db.rosterAssignment.findMany({
      where: { OR: conditions },
      select: {
        userId: true,
        date: true,
        overriddenHourlyRate: true,
      },
    });

    const result: Record<string, number | null> = {};
    for (const assignment of assignments) {
      const key = `${assignment.userId}:${assignment.date.toISOString().slice(0, 10)}`;
      result[key] = assignment.overriddenHourlyRate !== null ? Number(assignment.overriddenHourlyRate) : null;
    }

    return result;
  }

  async getLeaveAttendanceReconciliation(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    userId?: string,
  ): Promise<LeaveAttendanceReconciliationRow[]> {
    const userFilter: Record<string, unknown> = { tenantId };
    if (departmentId) userFilter.departmentId = departmentId;
    const userIds = userId
      ? [userId]
      : departmentId
      ? (await this.db.user.findMany({ where: userFilter, select: { id: true } })).map((u) => u.id)
      : undefined;

    const leaveRequests = await this.db.leaveRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
        ...(userIds ? { employeeId: { in: userIds } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            hourlyRate: true, 
            payrollNumber: true,

            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ employeeId: 'asc' }, { startDate: 'asc' }],
    });

    const leaveDayMap = new Map<string, LeaveAttendanceReconciliationRow>();
    const normalizedStart = new Date(startDate.toISOString().slice(0, 10));
    const normalizedEnd = new Date(endDate.toISOString().slice(0, 10));

    const addDays = (date: Date, days: number) => {
      const next = new Date(date);
      next.setUTCDate(next.getUTCDate() + days);
      return next;
    };

    for (const leave of leaveRequests) {
      const windowStart = leave.startDate > normalizedStart ? leave.startDate : normalizedStart;
      const windowEnd = leave.endDate < normalizedEnd ? leave.endDate : normalizedEnd;
      for (
        let current = new Date(windowStart);
        current <= windowEnd;
        current = addDays(current, 1)
      ) {
        const key = `${leave.employeeId}:${current.toISOString().slice(0, 10)}`;
        leaveDayMap.set(key, {
          userId: leave.employeeId,
          firstName: leave.user.firstName,
          lastName: leave.user.lastName,
          payrollNumber: leave.user.payrollNumber,
          departmentId: leave.user.department?.id ?? null,
          departmentName: leave.user.department?.name ?? null,
          date: new Date(current),
          anomalyType: 'APPROVED_LEAVE_NO_LOGS',
          leaveRequestId: leave.id,
          leaveType: leave.leaveType,
          leaveStatus: leave.status,
          attendanceLogsCount: 0,
        });
      }
    }

    const attendanceLogCounts: Record<string, number> = {};
    if (userIds && userIds.length > 0) {
      const logs = await this.db.attendanceLog.findMany({
        where: {
          tenantId,
          userId: { in: userIds },
          timestamp: {
            gte: new Date(`${normalizedStart.toISOString().slice(0, 10)}T00:00:00.000Z`),
            lt: new Date(`${addDays(normalizedEnd, 1).toISOString().slice(0, 10)}T00:00:00.000Z`),
          },
        },
        select: { userId: true, timestamp: true },
      });

      for (const log of logs) {
        const dateKey = log.timestamp.toISOString().slice(0, 10);
        const key = `${log.userId}:${dateKey}`;
        attendanceLogCounts[key] = (attendanceLogCounts[key] ?? 0) + 1;
      }
    } else {
      const logs = await this.db.attendanceLog.findMany({
        where: {
          tenantId,
          timestamp: {
            gte: new Date(`${normalizedStart.toISOString().slice(0, 10)}T00:00:00.000Z`),
            lt: new Date(`${addDays(normalizedEnd, 1).toISOString().slice(0, 10)}T00:00:00.000Z`),
          },
        },
        select: { userId: true, timestamp: true },
      });

      for (const log of logs) {
        const dateKey = log.timestamp.toISOString().slice(0, 10);
        const key = `${log.userId}:${dateKey}`;
        attendanceLogCounts[key] = (attendanceLogCounts[key] ?? 0) + 1;
      }
    }

    const rows: LeaveAttendanceReconciliationRow[] = [];
    for (const [key, existing] of leaveDayMap.entries()) {
      const count = attendanceLogCounts[key] ?? 0;
      rows.push({
        ...existing,
        anomalyType: count > 0 ? 'APPROVED_LEAVE_WITH_LOGS' : 'APPROVED_LEAVE_NO_LOGS',
        attendanceLogsCount: count,
      });
    }

    const absentWhere: Record<string, unknown> = {
      tenantId,
      date: { gte: normalizedStart, lte: normalizedEnd },
      status: 'ABSENT',
    };
    if (userIds) absentWhere.userId = { in: userIds };

    const absences = await this.db.attendanceSummary.findMany({
      where: absentWhere,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            payrollNumber: true,
            hourlyRate: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { userId: 'asc' }],
    });

    for (const absence of absences) {
      const key = `${absence.userId}:${absence.date.toISOString().slice(0, 10)}`;
      if (leaveDayMap.has(key)) continue;
      rows.push({
        userId: absence.userId,
        firstName: absence.user.firstName,
        lastName: absence.user.lastName,
        payrollNumber: absence.user.payrollNumber,
        departmentId: absence.user.department?.id ?? null,
        departmentName: absence.user.department?.name ?? null,
        date: absence.date,
        anomalyType: 'UNAUTHORIZED_ABSENCE',
        attendanceLogsCount: attendanceLogCounts[key] ?? 0,
      });
    }

    return rows.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      if (a.payrollNumber !== b.payrollNumber) return a.payrollNumber.localeCompare(b.payrollNumber);
      return a.lastName.localeCompare(b.lastName);
    });
  }

  async getScheduledActualHoursReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ): Promise<ScheduledActualHoursRow[]> {
    const weekStart = (date: Date) => {
      const clone = new Date(date);
      const day = clone.getUTCDay();
      const diff = (day + 6) % 7; // Monday as start of week
      clone.setUTCDate(clone.getUTCDate() - diff);
      clone.setUTCHours(0, 0, 0, 0);
      return clone;
    };

    const weekEnd = (start: Date) => {
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      return end;
    };

    const attendanceRows = await this.db.attendanceSummary.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            payrollNumber: true,
            hourlyRate: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ userId: 'asc' }, { date: 'asc' }],
    });

    const employeeWeekMap = new Map<string, {
      employeeId: string;
      payrollNumber: string;
      name: string;
      departmentId: string | null;
      departmentName: string | null;
      weekStart: Date;
      scheduledHours: number;
      actualHours: number;
    }>();

    for (const row of attendanceRows) {
      if (departmentId && row.user.department?.id !== departmentId) continue;

      const startOfWeek = weekStart(row.date);
      const endOfWeek = weekEnd(startOfWeek);
      const key = `${row.userId}:${startOfWeek.toISOString().slice(0, 10)}`;
      const existing = employeeWeekMap.get(key);
      const scheduled = row.scheduledHours ?? 0;
      const actual = row.totalHours ?? 0;

      if (!existing) {
        employeeWeekMap.set(key, {
          employeeId: row.userId,
          payrollNumber: row.user.payrollNumber,
          name: `${row.user.firstName} ${row.user.lastName}`,
          departmentId: row.user.department?.id ?? null,
          departmentName: row.user.department?.name ?? null,
          weekStart: new Date(startOfWeek),
          scheduledHours: scheduled,
          actualHours: actual,
        });
      } else {
        existing.scheduledHours += scheduled;
        existing.actualHours += actual;
      }
    }

    const legalThreshold = 48;
    const rows: ScheduledActualHoursRow[] = [];

    for (const { employeeId, payrollNumber, name, departmentId, departmentName, weekStart, scheduledHours, actualHours } of employeeWeekMap.values()) {
      const overContract = Math.max(actualHours - scheduledHours, 0);
      rows.push({
        employeeId,
        payrollNumber,
        name,
        departmentId,
        departmentName,
        weekStart: new Date(weekStart),
        weekEnd: weekEnd(weekStart),
        scheduledHours: Math.round(scheduledHours * 100) / 100,
        actualHours: Math.round(actualHours * 100) / 100,
        hoursOverContract: Math.round(overContract * 100) / 100,
        exceedsLegalThreshold: actualHours > legalThreshold,
        legalThresholdHours: legalThreshold,
      });
    }

    return rows.sort((a, b) => {
      const aKey = `${a.departmentName ?? ''}:${a.name}:${a.weekStart.toISOString()}`;
      const bKey = `${b.departmentName ?? ''}:${b.name}:${b.weekStart.toISOString()}`;
      return aKey.localeCompare(bKey);
    });
  }

  async getAuditTrailReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ): Promise<AuditTrailRow[]> {
    const audits = await this.db.attendanceAudit.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attendanceSummary: {
          select: {
            id: true,
            date: true,
            userId: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                payrollNumber: true,
            hourlyRate: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!departmentId) return audits;

    return audits.filter((audit) =>
      audit.attendanceSummary?.user?.department?.id === departmentId,
    );
  }

  async getDeviceHealthReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DeviceHealthRow[]> {
    const devices = await this.db.device.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        serialCode: true,
        ipAddress: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    if (devices.length === 0) return [];

    const normalizedStart = new Date(startDate.toISOString().slice(0, 10));
    const normalizedEnd = new Date(endDate.toISOString().slice(0, 10));
    const nextDay = new Date(normalizedEnd);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const logsByDevice: Record<
      string,
      {
        lastLogAt: Date | null;
        dateCounts: Record<string, number>;
        spikeCounts: Record<string, number>;
      }
    > = {};

    for (const device of devices) {
      logsByDevice[device.id] = {
        lastLogAt: null,
        dateCounts: {},
        spikeCounts: {},
      };
    }

    let skip = 0;
    const batchSize = 1000;
    const spikeTracker: Record<string, Record<string, number>> = {};

    while (true) {
      const logs = await this.db.attendanceLog.findMany({
        where: {
          tenantId,
          timestamp: { gte: normalizedStart, lt: nextDay },
        },
        select: {
          deviceId: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'asc' }],
        skip,
        take: batchSize,
      });

      if (logs.length === 0) break;

      for (const log of logs) {
        const deviceData = logsByDevice[log.deviceId];
        if (!deviceData) continue;

        const dateKey = log.timestamp.toISOString().slice(0, 10);
        deviceData.dateCounts[dateKey] = (deviceData.dateCounts[dateKey] ?? 0) + 1;

        if (!deviceData.lastLogAt || log.timestamp > deviceData.lastLogAt) {
          deviceData.lastLogAt = log.timestamp;
        }

        spikeTracker[log.deviceId] = spikeTracker[log.deviceId] || {};
        const groupKey = `${dateKey}:${log.timestamp.toISOString().slice(0, 16)}`;
        spikeTracker[log.deviceId][groupKey] = (spikeTracker[log.deviceId][groupKey] ?? 0) + 1;
      }

      if (logs.length < batchSize) break;
      skip += batchSize;
    }

    for (const [deviceId, groups] of Object.entries(spikeTracker)) {
      for (const [groupKey, count] of Object.entries(groups)) {
        if (count > 4) {
          const [dateKey] = groupKey.split(':');
          const deviceData = logsByDevice[deviceId];
          deviceData.spikeCounts[dateKey] = (deviceData.spikeCounts[dateKey] ?? 0) + 1;
        }
      }
    }

    const rows: DeviceHealthRow[] = [];
    const addDays = (date: Date, days: number) => {
      const next = new Date(date);
      next.setUTCDate(next.getUTCDate() + days);
      return next;
    };

    for (const device of devices) {
      const deviceData = logsByDevice[device.id];
      for (
        let current = new Date(normalizedStart);
        current <= normalizedEnd;
        current = addDays(current, 1)
      ) {
        const dateKey = current.toISOString().slice(0, 10);
        const count = deviceData.dateCounts[dateKey] ?? 0;
        rows.push({
          deviceId: device.id,
          deviceName: device.name,
          serialCode: device.serialCode,
          ipAddress: device.ipAddress,
          isActive: device.isActive,
          date: new Date(current),
          lastSuccessfulLogAt: deviceData.lastLogAt,
          eventsLogged: count,
          zeroEvents: count === 0,
          duplicateEventSpikes: deviceData.spikeCounts[dateKey] ?? 0,
        });
      }
    }

    return rows;
  }

  async getTurnoverAndHeadcountReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
  ): Promise<TurnoverHeadcountRow[]> {
    const departments = await this.db.department.findMany({
      where: { tenantId, ...(departmentId ? { id: departmentId } : {}) },
      select: { id: true, name: true, rules: true },
      orderBy: { name: 'asc' },
    });

    if (departments.length === 0) return [];

    const employees = await this.db.user.findMany({
      where: {
        tenantId,
        ...(departmentId ? { departmentId } : {}),
        createdAt: { lte: endDate },
        AND: [
          {
            OR: [
              { deletedAt: null },
              { deletedAt: { gte: startDate } },
            ],
          },
        ],
      },
      select: { id: true, departmentId: true, createdAt: true, deletedAt: true },
    });

    const employeesByDepartment = new Map<string, Array<{ id: string; createdAt: Date; deletedAt: Date | null }>>();
    for (const employee of employees) {
      const deptId = employee.departmentId ?? 'unassigned';
      if (!employeesByDepartment.has(deptId)) {
        employeesByDepartment.set(deptId, []);
      }
      employeesByDepartment.get(deptId)!.push(employee);
    }

    const monthRanges: Array<{ month: string; start: Date; end: Date }> = [];
    const current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const lastMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

    while (current <= lastMonth) {
      const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
      const nextMonth = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1));
      const monthEnd = new Date(nextMonth);
      monthEnd.setUTCDate(monthEnd.getUTCDate() - 1);
      monthRanges.push({
        month: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`,
        start: monthStart,
        end: monthEnd,
      });
      current.setUTCMonth(current.getUTCMonth() + 1);
    }

    const rows: TurnoverHeadcountRow[] = [];

    for (const department of departments) {
      const departmentEmployees = employeesByDepartment.get(department.id) ?? [];
      const rules = department.rules as unknown as Record<string, unknown> | null;
      const threshold = rules
        ? Number(
            rules.minimumHeadcount ??
            rules.minimumStaff ??
            rules.targetHeadcount ??
            rules.staffingThreshold ??
            rules.requiredHeadcount ??
            null,
          ) || null
        : null;

      for (const range of monthRanges) {
        const activeHeadcount = departmentEmployees.filter((employee) => {
          const hiredOnOrBefore = employee.createdAt <= range.end;
          const stillActive = employee.deletedAt === null || employee.deletedAt >= range.start;
          return hiredOnOrBefore && stillActive;
        }).length;

        const newJoiners = departmentEmployees.filter((employee) =>
          employee.createdAt >= range.start && employee.createdAt <= range.end,
        ).length;

        const departures = departmentEmployees.filter((employee) =>
          employee.deletedAt !== null && employee.deletedAt >= range.start && employee.deletedAt <= range.end,
        ).length;

        rows.push({
          departmentId: department.id,
          departmentName: department.name,
          month: range.month,
          activeHeadcount,
          newJoiners,
          departures,
          threshold,
          underThreshold: threshold !== null && activeHeadcount < threshold,
        });
      }
    }

    return rows;
  }

  async getDepartmentAttendanceSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DepartmentAttendanceRow[]> {
    const departments = await this.db.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const results: DepartmentAttendanceRow[] = [];

    for (const dept of departments) {
      const users = await this.db.user.findMany({
        where: { tenantId, departmentId: dept.id },
        select: { id: true },
      });

      if (users.length === 0) continue;

      const userIds = users.map((u) => u.id);
      const whereClause = {
        tenantId,
        userId: { in: userIds },
        date: { gte: startDate, lte: endDate },
      };

      const [summaries, aggregates] = await Promise.all([
        this.db.attendanceSummary.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { status: true },
        }),
        this.db.attendanceSummary.aggregate({
          where: whereClause,
          _sum: { lateMinutes: true, overtimeHours: true },
          _count: { id: true },
        }),
      ]);

      const statusMap: Record<string, number> = {};
      for (const s of summaries) {
        statusMap[s.status] = s._count.status;
      }

      results.push({
        departmentId: dept.id,
        departmentName: dept.name,
        totalRostered: aggregates._count.id,
        totalPresent: statusMap['PRESENT'] ?? 0,
        totalAbsent: statusMap['ABSENT'] ?? 0,
        totalLate: statusMap['LATE'] ?? 0,
        totalOnLeave: statusMap['ON_LEAVE'] ?? 0,
        totalUnrostered: statusMap['UNROSTERED'] ?? 0,
        totalHolidayOrHalfDay:
          (statusMap['HOLIDAY'] ?? 0) + (statusMap['HALF_DAY'] ?? 0),
        totalLateMinutes: aggregates._sum.lateMinutes ?? 0,
        totalOvertimeHours: Number(aggregates._sum.overtimeHours ?? 0),
      });
    }

    return results;
  }

  async *streamOvertimeAudit(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    batchSize = 100,
  ): AsyncGenerator<OvertimeAuditRow[]> {
    let skip = 0;

    while (true) {
      const whereClause: Record<string, unknown> = {
        tenantId,
        date: { gte: startDate, lte: endDate },
        overtimeHours: { gt: 0 },
      };

      if (departmentId) {
        const users = await this.db.user.findMany({
          where: { tenantId, departmentId },
          select: { id: true },
        });
        whereClause.userId = { in: users.map((u) => u.id) };
      }

      const rows = await this.db.attendanceSummary.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              payrollNumber: true,
            hourlyRate: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ overtimeHours: 'desc' }, { date: 'asc' }],
        skip,
        take: batchSize,
      });

      if (rows.length === 0) break;

      yield rows.map((r) => ({
        userId: r.userId,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        payrollNumber: r.user.payrollNumber,
        departmentId: r.user.department?.id ?? null,
        departmentName: r.user.department?.name ?? null,
        date: r.date,
        shiftName: r.shiftName,
        scheduledEnd: r.scheduledEnd,
        lastOut: r.lastOut,
        overtimeHours: r.overtimeHours,
        totalHours: r.totalHours,
      }));

      if (rows.length < batchSize) break;
      skip += batchSize;
    }
  }

  async *streamLatenessAudit(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    batchSize = 100,
  ): AsyncGenerator<LatenessAuditRow[]> {
    let skip = 0;

    while (true) {
      const whereClause: Record<string, unknown> = {
        tenantId,
        date: { gte: startDate, lte: endDate },
        lateMinutes: { gt: 0 },
      };

      if (departmentId) {
        const users = await this.db.user.findMany({
          where: { tenantId, departmentId },
          select: { id: true },
        });
        whereClause.userId = { in: users.map((u) => u.id) };
      }

      const rows = await this.db.attendanceSummary.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              payrollNumber: true,
            hourlyRate: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ lateMinutes: 'desc' }, { date: 'asc' }],
        skip,
        take: batchSize,
      });

      if (rows.length === 0) break;

      yield rows.map((r) => ({
        userId: r.userId,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        payrollNumber: r.user.payrollNumber,
        departmentId: r.user.department?.id ?? null,
        departmentName: r.user.department?.name ?? null,
        date: r.date,
        shiftName: r.shiftName,
        scheduledStart: r.scheduledStart,
        firstIn: r.firstIn,
        lateMinutes: r.lateMinutes,
        status: r.status,
      }));

      if (rows.length < batchSize) break;
      skip += batchSize;
    }
  }

  async *streamAbsenceAudit(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    batchSize = 100,
  ): AsyncGenerator<AbsenceAuditRow[]> {
    let skip = 0;

    while (true) {
      const whereClause: Record<string, unknown> = {
        tenantId,
        date: { gte: startDate, lte: endDate },
        status: { in: ['ABSENT'] },
      };

      if (departmentId) {
        const users = await this.db.user.findMany({
          where: { tenantId, departmentId },
          select: { id: true },
        });
        whereClause.userId = { in: users.map((u) => u.id) };
      }

      const rows = await this.db.attendanceSummary.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              payrollNumber: true,
            hourlyRate: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ date: 'asc' }, { userId: 'asc' }],
        skip,
        take: batchSize,
      });

      if (rows.length === 0) break;

      yield rows.map((r) => ({
        userId: r.userId,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        payrollNumber: r.user.payrollNumber,
        departmentId: r.user.department?.id ?? null,
        departmentName: r.user.department?.name ?? null,
        date: r.date,
        status: r.status,
        shiftName: r.shiftName,
      }));

      if (rows.length < batchSize) break;
      skip += batchSize;
    }
  }

  async saveCompiledReport(
    tenantId: string,
    generatedById: string,
    reportType: string,
    dateRangeStart: Date,
    dateRangeEnd: Date,
    compiledData: Record<string, unknown>,
  ): Promise<CompiledReportRecord> {
    const report = await this.db.compiledReport.create({
      data: {
        tenantId,
        generatedById,
        reportType,
        dateRangeStart,
        dateRangeEnd,
        compiledData,
      },
    });

    const generatedBy = await this.db.user.findUnique({
      where: { id: generatedById },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return {
      id: report.id,
      reportType: report.reportType,
      dateRangeStart: report.dateRangeStart,
      dateRangeEnd: report.dateRangeEnd,
      compiledData: report.compiledData,
      createdAt: report.createdAt,
      generatedBy: generatedBy ?? {
        id: generatedById,
        firstName: '',
        lastName: '',
        email: '',
      },
    };
  }

  async listCompiledReports(
    tenantId: string,
    reportType?: string,
    skip = 0,
    take = 25,
  ): Promise<{ items: CompiledReportRecord[]; total: number }> {
    const where: Record<string, unknown> = { tenantId };
    if (reportType) where.reportType = reportType;

    const [items, total] = await Promise.all([
      this.db.compiledReport.findMany({
        where,
        include: {
          generatedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.db.compiledReport.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        dateRangeStart: r.dateRangeStart,
        dateRangeEnd: r.dateRangeEnd,
        compiledData: r.compiledData,
        createdAt: r.createdAt,
        generatedBy: r.generatedBy,
      })),
      total,
    };
  }

  async findCompiledReportById(
    tenantId: string,
    id: string,
  ): Promise<CompiledReportRecord | null> {
    const report = await this.db.compiledReport.findFirst({
      where: { id, tenantId },
      include: {
        generatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!report) return null;

    return {
      id: report.id,
      reportType: report.reportType,
      dateRangeStart: report.dateRangeStart,
      dateRangeEnd: report.dateRangeEnd,
      compiledData: report.compiledData,
      createdAt: report.createdAt,
      generatedBy: report.generatedBy,
    };
  }
}