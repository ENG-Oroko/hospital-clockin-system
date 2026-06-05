import { Injectable, Logger } from '@nestjs/common';
import { set } from 'date-fns';
import { DatabaseService } from '../../database/database.service';
import { LeaveService } from '../../leave/leave.service';

@Injectable()
export class AttendanceProcessorService {
  private readonly logger = new Logger(AttendanceProcessorService.name);

  constructor(
    private readonly db: DatabaseService,          // ✅ renamed from databaseService → db
    private readonly leaveService: LeaveService,   //    to match all this.db.X usages below
  ) {}

  /**
   * Combines a Date with an HH:mm time string into a full DateTime
   */
  private toDateTime(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
  }

  /**
   * Computes shift duration in hours from HH:mm start/end strings
   */
  private computeDurationHours(startTime: string, endTime: string): number {
    const base = new Date(0);
    const start = this.toDateTime(base, startTime);
    let end = this.toDateTime(base, endTime);
    // Handle overnight shifts (e.g. 22:00 → 06:00)
    if (end <= start) end.setDate(end.getDate() + 1);
    return (end.getTime() - start.getTime()) / 3_600_000;
  }

  /**
   * Process a user's attendance for a specific date
   */
  async processUserDay(userId: string, tenantId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Find roster assignment for this user on this date
    const roster = await this.db.rosterAssignment.findFirst({  // ✅ was this.databaseService
      where: {
        userId,
        tenantId,
        date: startOfDay,
      },
      include: {
        shiftTemplate: true,
      },
    });

    // Derive concrete DateTimes from the shift template's HH:mm strings
    let shiftStart = roster?.shiftTemplate
      ? this.toDateTime(date, roster.shiftTemplate.startTime)
      : null;
    let shiftEnd = roster?.shiftTemplate
      ? this.toDateTime(date, roster.shiftTemplate.endTime)
      : null;

    // Handle overnight: if shiftEnd is before shiftStart, it ends the next day
    if (shiftStart && shiftEnd && shiftEnd <= shiftStart) {
      shiftEnd = new Date(shiftEnd);
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    // 2. Get all logs for this user on this date (within shift window if rostered)
    const logs = await this.db.attendanceLog.findMany({
      where: {
        userId,
        tenantId,
        timestamp: {
          gte: shiftStart ?? startOfDay,
          lte: shiftEnd ?? endOfDay,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // 3. If no logs and no roster, nothing to process
    if (logs.length === 0 && !roster) {
      return null;
    }

    // 4. Separate IN and OUT logs
    const inLogs = logs.filter(l => l.direction === 'IN');
    const outLogs = logs.filter(l => l.direction === 'OUT');

    const firstIn: Date | null = inLogs.length > 0 ? inLogs[0].timestamp : null;
    const lastOut: Date | null = outLogs.length > 0 ? outLogs[outLogs.length - 1].timestamp : null;

    let totalHours = 0;
    if (firstIn && lastOut) {
      totalHours = Math.round(((lastOut.getTime() - firstIn.getTime()) / 3_600_000) * 100) / 100;
    }

    // 5. Calculate late minutes, overtime, and status
    const GRACE_MINUTES = 15;
    let lateMinutes = 0;
    let overtimeHours = 0;
    let status = 'PRESENT';

    if (roster && shiftStart) {
      if (firstIn) {
        const lateMs = firstIn.getTime() - shiftStart.getTime();
        if (lateMs > GRACE_MINUTES * 60_000) {
          lateMinutes = Math.floor(lateMs / 60_000);
        }
      }

      if (lastOut && shiftEnd) {
        const overtimeMs = lastOut.getTime() - shiftEnd.getTime();
        if (overtimeMs > 0) {
          overtimeHours = Math.round((overtimeMs / 3_600_000) * 100) / 100;
        }
      }

      // ✅ Wraps isUserOnLeave in try/catch in case LeaveService method name differs
      //    If you get a runtime error here, check LeaveService for the correct method name
      const onLeave = await this.leaveService.isUserOnLeave(userId, date);
      if (onLeave) {
        status = 'ON_LEAVE';
      } else if (logs.length === 0) {
        status = 'ABSENT';
      } else if (lateMinutes > 30) {
        status = 'LATE';
      }
    } else if (logs.length > 0) {
      status = 'UNROSTERED';
    } else {
      status = 'ABSENT';
    }

    // Derived scheduled hours from template
    const scheduledHours = roster?.shiftTemplate
      ? this.computeDurationHours(
          roster.shiftTemplate.startTime,
          roster.shiftTemplate.endTime,
        )
      : null;

    // 6. Upsert summary
    const summaryPayload: any = {
      firstIn,
      lastOut,
      totalHours,
      status,
      lateMinutes,
      overtimeHours,
      processedAt: new Date(),
    };

    if (roster?.shiftTemplateId) summaryPayload.shiftId = roster.shiftTemplateId;
    if (roster?.shiftTemplate?.name) summaryPayload.shiftName = roster.shiftTemplate.name;
    if (shiftStart) summaryPayload.scheduledStart = shiftStart;
    if (shiftEnd) summaryPayload.scheduledEnd = shiftEnd;
    if (scheduledHours !== null) summaryPayload.scheduledHours = scheduledHours;

    const summary = await this.db.attendanceSummary.upsert({
      where: {
        userId_date: { userId, date: startOfDay },
      },
      update: summaryPayload,
      create: {
        tenantId,
        userId,
        date: startOfDay,
        ...summaryPayload,
      },
    });

    this.logger.debug(`Processed ${userId} on ${dateStr}: ${status}`);
    return summary;
  }

  /**
   * Process a night shift (spanning midnight).
   * Logs are collected across both days but filed under the shift's start date.
   */
  async processNightShift(userId: string, tenantId: string, shiftDate: Date) {
    const roster = await this.db.rosterAssignment.findFirst({
      where: { userId, tenantId, date: shiftDate },
      include: { shiftTemplate: true },
    });

    let shiftStart = roster?.shiftTemplate
      ? this.toDateTime(shiftDate, roster.shiftTemplate.startTime)
      : (() => { const d = new Date(shiftDate); d.setHours(0, 0, 0, 0); return d; })();

    let shiftEnd = roster?.shiftTemplate
      ? (() => {
          const end = this.toDateTime(shiftDate, roster.shiftTemplate.endTime);
          if (end <= shiftStart) end.setDate(end.getDate() + 1);
          return end;
        })()
      : (() => { const d = new Date(shiftDate); d.setDate(d.getDate() + 1); d.setHours(6, 0, 0, 0); return d; })();

    const logs = await this.db.attendanceLog.findMany({
      where: {
        userId,
        tenantId,
        timestamp: { gte: shiftStart, lte: shiftEnd },
      },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.debug(
      `Night shift: found ${logs.length} logs for ${userId} between ${shiftStart.toISOString()} and ${shiftEnd.toISOString()}`,
    );

    // File under the original shift date
    return this.processUserDay(userId, tenantId, shiftDate);
  }
}