// src/attendance/attendance.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';  // ← Changed from DatabaseService
import { QueueService } from '../queue/queue.service';
import { Prisma, AttendanceStatus, AttendanceLog } from '@chronos/database';

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
    private readonly db: PrismaService,  // ← Changed from DatabaseService
    private readonly queue: QueueService,
  ) {}

  async ingestLog(data: CreateAttendanceLogDto) {
    try {
      const user = await this.db.client.user.findFirst({  // ← Note: use .client
        where: {
          id: data.userId,
          tenantId: data.tenantId,
          isActive: true,
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid user or user not active');
      }

      const log = await this.db.client.attendanceLog.upsert({  // ← use .client
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

      await this.queue.addAttendanceJob({
        tenantId: log.tenantId,
        userId: log.userId,
        date: log.timestamp.toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        attendanceLogId: log.id,
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
      const users = await this.db.client.user.findMany({  // ← use .client
        where: { tenantId, departmentId },
        select: { id: true },
      });
      where.userId = { in: users.map((u) => u.id) };
    }

    const [summaries, total] = await Promise.all([
      this.db.client.attendanceSummary.findMany({  // ← use .client
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
      this.db.client.attendanceSummary.count({ where }),  // ← use .client
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

    return this.db.client.attendanceSummary.findMany({  // ← use .client
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
    // Remove .client - use this.db directly
    const existing = await this.db.attendanceSummary.findUnique({
      where: { id: summaryId },
    });
  
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException('Attendance summary not found');
    }
  
    // ✅ FIXED: Complete transaction with both operations
    const results = await this.db.$transaction([
      // Operation 1: Update the summary
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
      
      // Operation 2: Create audit record
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
  
    const updated = results[0]; // First result is the updated summary
    const audit = results[1];   // Second result is the audit record
  
    this.logger.warn(`Manual override on ${summaryId} by ${adminUserId}`);
    return updated;
  }

  async getAuditTrail(
    tenantId: string,
    summaryId: string,
  ): Promise<any[]> {
    return this.db.client.attendanceAudit.findMany({  // ← use .client
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

    const summaries = await this.db.client.attendanceSummary.findMany({  // ← use .client
      where,
      select: { id: true, userId: true, date: true },
    });
 

    for (const summary of summaries) {
      await this.queue.addAttendanceJob({
        tenantId: tenantId,
        userId: summary.userId,
        date: summary.date,
        createdAt: new Date().toISOString(),
        attendanceLogId: summary.id,
        correlationId: `reprocess-${summary.id}`,
      }, 3); // Priority 3 for reprocess
    }

    return { queued: summaries.length };
  }

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
      this.db.client.attendanceLog.findMany({  // ← use .client
        where,
        include: {
          user: true,
          device: true,
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.client.attendanceLog.count({ where }),  // ← use .client
    ]);

    return { data: logs, total, page, limit };
  }

  async getDashboardStats(tenantId: string, date: Date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const stats = await this.db.client.$transaction([  // ← use .client
      this.db.client.attendanceSummary.count({  // ← use .client
        where: { tenantId, date: { gte: startDate, lte: endDate } },
      }),
      this.db.client.attendanceSummary.count({  // ← use .client
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          status: 'PRESENT',
        },
      }),
      this.db.client.attendanceSummary.count({  // ← use .client
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          lateMinutes: { gt: 0 },
        },
      }),
      this.db.client.attendanceSummary.count({  // ← use .client
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          status: 'ABSENT',
        },
      }),
      this.db.client.attendanceSummary.count({  // ← use .client
        where: {
          tenantId,
          date: { gte: startDate, lte: endDate },
          status: 'ON_LEAVE',
        },
      }),
      this.db.client.user.count({  // ← use .client
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