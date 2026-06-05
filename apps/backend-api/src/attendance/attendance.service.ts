import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { Prisma,AttendanceStatus, AttendanceLog  } from '@chronos/database';
// Add this import at the top of attendance.service.ts
//impAttendanceLog } from '@chronos/database';
// ✅ Correct
export interface CreateAttendanceLogDto {
  tenantId: string;
  userId: string;
  deviceId: string;
  direction: 'IN' | 'OUT';
  timestamp: Date;
  rosterAssignmentId?: string;
}

export interface AttendanceSummaryFilters {
  tenantId: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async ingestLog(data: CreateAttendanceLogDto) {
    try {
      const user = await this.db.user.findFirst({
        where: {
          id: data.userId,
          tenantId: data.tenantId,
          isActive: true,
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid user or user not active');
      }

      const log = await this.db.attendanceLog.upsert({
        where: {
          userId_deviceId_direction_timestamp: {
            userId: data.userId,
            deviceId: data.deviceId,
            direction: data.direction,
            timestamp: data.timestamp,
          },
        },
        update: {},
        create: {
          tenantId: data.tenantId,
          userId: data.userId,
          deviceId: data.deviceId,
          direction: data.direction,
          timestamp: data.timestamp,
          rosterAssignmentId: data.rosterAssignmentId,
        },
      });

      await this.queue.add('attendance.process', {
        logId: log.id,
        userId: data.userId,
        tenantId: data.tenantId,
        date: new Date(data.timestamp).toISOString().split('T')[0],
        retryCount: 0,
      });

      this.logger.debug(`Ingested log ${log.id} for user ${data.userId}`);
      return log;
    } catch (error) {
      this.logger.error(`Failed to ingest log: ${error.message}`);
      throw error;
    }
  }

  async bulkIngest(logs: CreateAttendanceLogDto[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    const batchSize = 100;

    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (log) => {
          try {
            await this.ingestLog(log);
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push({ log, error: error.message });
          }
        }),
      );
    }

    return results;
  }

  async getSummaries(filters: AttendanceSummaryFilters) {
    const {
      tenantId,
      userId,
      startDate,
      endDate,
      status,
      departmentId,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {
      tenantId,
      ...(userId && { userId }),
      ...(status && { status }),
      ...(startDate && { date: { gte: startDate } }),
      ...(endDate && { date: { lte: endDate } }),
    };

    if (departmentId) {
      const users = await this.db.user.findMany({
        where: { tenantId, departmentId },
        select: { id: true },
      });
      where.userId = { in: users.map((u) => u.id) };
    }

    const [summaries, total] = await Promise.all([
      this.db.attendanceSummary.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              departmentId: true,
            },
          },
          shift: {
            select: {
              id: true,
              name: true,
              startTime: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.attendanceSummary.count({ where }),
    ]);

    return {
      data: summaries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDailyBreakdown(tenantId: string, date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    return this.db.attendanceSummary.findMany({
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
            department: {
              select: { id: true, name: true },
            },
          },
        },
        logs: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  async manualOverride(
    tenantId: string,
    adminUserId: string,
    summaryId: string,
    data: {
      firstIn?: Date;
      lastOut?: Date;
      status?: string;
      totalHours?: number;
      lateMinutes?: number;
      overtimeHours?: number;
      justification: string;
    },
  ) {
    const existing = await this.db.attendanceSummary.findUnique({
      where: { id: summaryId },
    });

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Attendance summary not found');
    }

    const [updated] = await this.db.$transaction([
      this.db.attendanceSummary.update({
        where: { id: summaryId },
        data: {
          firstIn: data.firstIn ?? existing.firstIn,
          lastOut: data.lastOut ?? existing.lastOut,
          status: (data.status ?? existing.status) as AttendanceStatus,
          totalHours: data.totalHours ?? existing.totalHours,
          lateMinutes: data.lateMinutes ?? existing.lateMinutes,
          overtimeHours: data.overtimeHours ?? existing.overtimeHours,
          processedAt: new Date(),
          reprocessedCount: { increment: 1 },
        },
      }),
      this.db.attendanceAudit.create({
        data: {
          tenantId,
          userId: adminUserId,
          targetSummaryId: summaryId,
          actionType: 'OVERRIDE',
          justification: data.justification,
          oldValues: JSON.stringify({
            firstIn: existing.firstIn,
            lastOut: existing.lastOut,
            status: existing.status,
            totalHours: existing.totalHours,
          }),
          newValues: JSON.stringify(data),
        },
      }),
    ]);

    this.logger.warn(`Manual override on ${summaryId} by ${adminUserId}`);
    return updated;
  }
  
  async getAuditTrail(
    tenantId: string,
    summaryId: string,
  ): Promise<any[]> {
    return this.db.attendanceAudit.findMany({
      where: {
        tenantId,
        targetSummaryId: summaryId,
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recalculateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
  ) {
    const where: any = {
      tenantId,
      date: { gte: startDate, lte: endDate },
    };

    if (userId) where.userId = userId;

    const summaries = await this.db.attendanceSummary.findMany({
      where,
      select: { id: true, userId: true, date: true },
    });

    for (const summary of summaries) {
      await this.queue.add('attendance.reprocess', {
        summaryId: summary.id,
        userId: summary.userId,
        tenantId,
        date: summary.date,
      });
    }

    return { queued: summaries.length };
  }



// Then add return type to getRawLogs method (line 328)
async getRawLogs(
  tenantId: string,
  filters: any,
): Promise<{ data: AttendanceLog[]; total: number; page: number; limit: number }> {
  const { userId, startDate, endDate, direction, page = 1, limit = 100 } = filters;

  const where: any = {
    tenantId,
    ...(userId && { userId }),
    ...(direction && { direction }),
    ...(startDate && { timestamp: { gte: startDate } }),
    ...(endDate && { timestamp: { lte: endDate } }),
  };

  const [logs, total] = await Promise.all([
    this.db.attendanceLog.findMany({
      where,
      include: {
        user: true,
        device: true,
      },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.db.attendanceLog.count({ where }),
  ]);

  return { data: logs, total, page, limit };
}


  async getDashboardStats(tenantId: string, date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const stats = await this.db.$transaction([
      this.db.attendanceSummary.count({
        where: { tenantId, date: { gte: startDate, lte: endDate } },
      }),
      this.db.attendanceSummary.count({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          status: 'PRESENT',
        },
      }),
      this.db.attendanceSummary.count({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          lateMinutes: { gt: 0 },
        },
      }),
      this.db.attendanceSummary.count({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          status: 'ABSENT',
        },
      }),
      this.db.attendanceSummary.count({
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          status: 'ON_LEAVE',
        },
      }),
      this.db.user.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    return {
      date: startDate,
      totalSummaries: stats[0],
      present: stats[1],
      late: stats[2],
      absent: stats[3],
      onLeave: stats[4],
      totalEmployees: stats[5],
      attendanceRate:
        stats[5] > 0 ? (stats[1] / stats[5]) * 100 : 0,
    };
  }
}