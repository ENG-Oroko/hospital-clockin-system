import { Injectable, Logger } from '@nestjs/common';
import { set } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { LeaveService } from '../../leave/leave.service';

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
    const startOfDay = new Date(dateStr); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);   endOfDay.setHours(23, 59, 59, 999);

    // this.db.rosterAssignment works via PrismaService proxy getter
    const roster = await this.db.rosterAssignment.findFirst({
      where: { userId, tenantId, date: startOfDay },
      include: { shiftTemplate: true },
    });

    let shiftStart = roster?.shiftTemplate ? this.toDateTime(date, roster.shiftTemplate.startTime) : null;
    let shiftEnd   = roster?.shiftTemplate ? this.toDateTime(date, roster.shiftTemplate.endTime)   : null;

    if (shiftStart && shiftEnd && shiftEnd <= shiftStart) {
      shiftEnd = new Date(shiftEnd); shiftEnd.setDate(shiftEnd.getDate() + 1);
    }

    const logs = await this.db.attendanceLog.findMany({
      where: { userId, tenantId, timestamp: { gte: shiftStart ?? startOfDay, lte: shiftEnd ?? endOfDay } },
      orderBy: { timestamp: 'asc' },
    });

    if (logs.length === 0 && !roster) return null;

    const firstIn  = logs.filter(l => l.direction === 'IN')[0]?.timestamp  ?? null;
    const lastOut  = logs.filter(l => l.direction === 'OUT').slice(-1)[0]?.timestamp ?? null;

    let totalHours = 0;
    if (firstIn && lastOut) totalHours = Math.round(((lastOut.getTime() - firstIn.getTime()) / 3_600_000) * 100) / 100;

    const GRACE = 15;
    let lateMinutes = 0, overtimeHours = 0, status = 'PRESENT';

    if (roster && shiftStart) {
      if (firstIn) {
        const lateMs = firstIn.getTime() - shiftStart.getTime();
        if (lateMs > GRACE * 60_000) lateMinutes = Math.floor(lateMs / 60_000);
      }
      if (lastOut && shiftEnd) {
        const otMs = lastOut.getTime() - shiftEnd.getTime();
        if (otMs > 0) overtimeHours = Math.round((otMs / 3_600_000) * 100) / 100;
      }
      const onLeave = await this.leaveService.isUserOnLeave(userId, date);
      if (onLeave)              status = 'ON_LEAVE';
      else if (logs.length === 0) status = 'ABSENT';
      else if (lateMinutes > 30)  status = 'LATE';
    } else if (logs.length > 0) {
      status = 'UNROSTERED';
    } else {
      status = 'ABSENT';
    }

    const scheduledHours = roster?.shiftTemplate
      ? this.computeDurationHours(roster.shiftTemplate.startTime, roster.shiftTemplate.endTime)
      : null;

    const payload: any = { firstIn, lastOut, totalHours, status, lateMinutes, overtimeHours, processedAt: new Date() };
    if (roster?.shiftTemplateId)      payload.shiftId        = roster.shiftTemplateId;
    if (roster?.shiftTemplate?.name)  payload.shiftName      = roster.shiftTemplate.name;
    if (shiftStart)                   payload.scheduledStart = shiftStart;
    if (shiftEnd)                     payload.scheduledEnd   = shiftEnd;
    if (scheduledHours !== null)      payload.scheduledHours = scheduledHours;

    const summary = await this.db.attendanceSummary.upsert({
      where: { userId_date: { userId, date: startOfDay } },
      update: payload,
      create: { tenantId, userId, date: startOfDay, ...payload },
    });

    this.logger.debug(`Processed ${userId} on ${dateStr}: ${status}`);
    return summary;
  }

  async processNightShift(userId: string, tenantId: string, shiftDate: Date) {
    const roster = await this.db.rosterAssignment.findFirst({
      where: { userId, tenantId, date: shiftDate },
      include: { shiftTemplate: true },
    });

    const shiftStart = roster?.shiftTemplate
      ? this.toDateTime(shiftDate, roster.shiftTemplate.startTime)
      : (() => { const d = new Date(shiftDate); d.setHours(0, 0, 0, 0); return d; })();

    const shiftEnd = roster?.shiftTemplate
      ? (() => { const e = this.toDateTime(shiftDate, roster.shiftTemplate.endTime); if (e <= shiftStart) e.setDate(e.getDate() + 1); return e; })()
      : (() => { const d = new Date(shiftDate); d.setDate(d.getDate() + 1); d.setHours(6, 0, 0, 0); return d; })();

    const logs = await this.db.attendanceLog.findMany({
      where: { userId, tenantId, timestamp: { gte: shiftStart, lte: shiftEnd } },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.debug(`Night shift: ${logs.length} logs for ${userId}`);
    return this.processUserDay(userId, tenantId, shiftDate);
  }
}