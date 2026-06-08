import { Injectable, Logger } from '@nestjs/common';
import { set } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { LeaveService } from '../../leave/leave.service';

// FIXED: DatabaseService → PrismaService (DatabaseService does not exist in this codebase)
// All this.db.X calls now correctly reference Prisma model delegates directly.

@Injectable()
export class AttendanceProcessorService {
  private readonly logger = new Logger(AttendanceProcessorService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly leaveService: LeaveService,
  ) {}

  private toDateTime(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
  }

  private computeDurationHours(startTime: string, endTime: string): number {
    const base = new Date(0);
    const start = this.toDateTime(base, startTime);
    const end = this.toDateTime(base, endTime);
    if (end <= start) end.setDate(end.getDate() + 1);
    return (end.getTime() - start.getTime()) / 3_600_000;
  }

  async processUserDay(userId: string, tenantId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const roster = await this.db.rosterAssignment.findFirst({
      where: { userId, tenantId, date: startOfDay },
      include: { shiftTemplate: true },
    });

    let shiftStart = roster?.shiftTemplate
      ? this.toDateTime(date, roster.shiftTemplate.startTime)
      : null;
    let shiftEnd = roster?.shiftTemplate
      ? this.toDateTime(date, roster.shiftTemplate.endTime)
      : null;

    if (shiftStart && shiftEnd && shiftEnd <= shiftStart) {
      shiftEnd = new Date(shiftEnd);
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    const logs = await this.db.attendanceLog.findMany({
      where: {
        userId,
        tenantId,
        timestamp: { gte: shiftStart ?? startOfDay, lte: shiftEnd ?? endOfDay },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (logs.length === 0 && !roster) return null;

    const inLogs = logs.filter(l => l.direction === 'IN');
    const outLogs = logs.filter(l => l.direction === 'OUT');
    const firstIn: Date | null = inLogs.length > 0 ? inLogs[0].timestamp : null;
    const lastOut: Date | null = outLogs.length > 0 ? outLogs[outLogs.length - 1].timestamp : null;

    let totalHours = 0;
    if (firstIn && lastOut) {
      totalHours = Math.round(((lastOut.getTime() - firstIn.getTime()) / 3_600_000) * 100) / 100;
    }

    const GRACE_MINUTES = 15;
    let lateMinutes = 0;
    let overtimeHours = 0;
    let status = 'PRESENT';

    if (roster && shiftStart) {
      if (firstIn) {
        const lateMs = firstIn.getTime() - shiftStart.getTime();
        if (lateMs > GRACE_MINUTES * 60_000) lateMinutes = Math.floor(lateMs / 60_000);
      }
      if (lastOut && shiftEnd) {
        const overtimeMs = lastOut.getTime() - shiftEnd.getTime();
        if (overtimeMs > 0) overtimeHours = Math.round((overtimeMs / 3_600_000) * 100) / 100;
      }

      const onLeave = await this.leaveService.isUserOnLeave(userId, date);
      if (onLeave) status = 'ON_LEAVE';
      else if (logs.length === 0) status = 'ABSENT';
      else if (lateMinutes > 30) status = 'LATE';
    } else if (logs.length > 0) {
      status = 'UNROSTERED';
    } else {
      status = 'ABSENT';
    }

    const scheduledHours = roster?.shiftTemplate
      ? this.computeDurationHours(roster.shiftTemplate.startTime, roster.shiftTemplate.endTime)
      : null;

    const summaryPayload: any = {
      firstIn, lastOut, totalHours, status, lateMinutes, overtimeHours, processedAt: new Date(),
    };
    if (roster?.shiftTemplateId) summaryPayload.shiftId = roster.shiftTemplateId;
    if (roster?.shiftTemplate?.name) summaryPayload.shiftName = roster.shiftTemplate.name;
    if (shiftStart) summaryPayload.scheduledStart = shiftStart;
    if (shiftEnd) summaryPayload.scheduledEnd = shiftEnd;
    if (scheduledHours !== null) summaryPayload.scheduledHours = scheduledHours;

    const summary = await this.db.attendanceSummary.upsert({
      where: { userId_date: { userId, date: startOfDay } },
      update: summaryPayload,
      create: { tenantId, userId, date: startOfDay, ...summaryPayload },
    });

    this.logger.debug(`Processed ${userId} on ${dateStr}: ${status}`);
    return summary;
  }

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
      where: { userId, tenantId, timestamp: { gte: shiftStart, lte: shiftEnd } },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.debug(`Night shift: ${logs.length} logs for ${userId}`);
    return this.processUserDay(userId, tenantId, shiftDate);
  }
}