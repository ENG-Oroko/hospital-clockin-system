import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AttendanceLog, Prisma } from '@chronos/database';
import { PrismaService } from '../database/prisma.service';
import { EmployeeService } from '../employee/employee.service';
import { QueueService } from '../queue/queue.service';
import { RosterService } from '../roster/roster.service';

export interface CreateAttendanceLogDto {
  tenantId: string;
  userId?: string;
  deviceId: string;
  devicePin?: string;
  direction: 'IN' | 'OUT';
  timestamp: Date;
  rosterAssignmentId?: string;
}

export interface AttendanceLogFilters {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  direction?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly rosterService: RosterService,
    private readonly queue: QueueService,
  ) {}

  async ingestLog(data: CreateAttendanceLogDto) {
    const employee = data.devicePin
      ? await this.employeeService.resolveEmployeeByDevicePin(data.tenantId, data.devicePin)
      : data.userId
        ? await this.employeeService.assertEmployeeEligible(data.tenantId, data.userId)
        : null;

    if (!employee) {
      throw new BadRequestException('Either userId or devicePin is required to resolve an employee.');
    }

    const punchDate = new Date(data.timestamp.toISOString().slice(0, 10));
    const assignment = data.rosterAssignmentId
      ? await this.rosterService.getAssignmentSnapshot(data.tenantId, data.rosterAssignmentId)
      : await this.rosterService.getActiveAssignmentForUserDate(data.tenantId, employee.id, punchDate);

    try {
      const log = await this.db.attendanceLog.upsert({
        where: {
          userId_deviceId_direction_timestamp: {
            userId: employee.id,
            deviceId: data.deviceId,
            direction: data.direction,
            timestamp: data.timestamp,
          },
        },
        update: {
          rosterAssignmentId: assignment?.id ?? data.rosterAssignmentId ?? null,
        },
        create: {
          tenantId: data.tenantId,
          userId: employee.id,
          deviceId: data.deviceId,
          direction: data.direction,
          timestamp: data.timestamp,
          rosterAssignmentId: assignment?.id ?? data.rosterAssignmentId ?? null,
        },
      });

      await this.queue.addAttendanceJob({
        tenantId: data.tenantId,
        userId: employee.id,
        date: punchDate.toISOString().slice(0, 10),
        attendanceLogId: log.id,
        deviceSerialNumber: data.deviceId,
        processingMode: 'realtime',
        createdAt: new Date().toISOString(),
      });

      this.logger.debug(`Ingested raw attendance log ${log.id} for employee ${employee.id}`);
      return log;
    } catch (error) {
      this.logger.error(`Failed to ingest attendance log: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async bulkIngest(logs: CreateAttendanceLogDto[]) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ log: CreateAttendanceLogDto; error: string }>,
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
            results.errors.push({
              log,
              error: error instanceof Error ? error.message : 'Unknown ingestion error',
            });
          }
        }),
      );
    }

    return results;
  }

  async getRawLogs(
    tenantId: string,
    filters: AttendanceLogFilters,
  ): Promise<{ data: AttendanceLog[]; total: number; page: number; limit: number }> {
    const { userId, startDate, endDate, direction, page = 1, limit = 100 } = filters;
    const where = this.rawLogWhere(tenantId, { userId, startDate, endDate, direction });

    const [logs, total] = await Promise.all([
      this.db.attendanceLog.findMany({
        where,
        include: { user: true, device: true, rosterAssignment: true },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.attendanceLog.count({ where }),
    ]);

    return { data: logs, total, page, limit };
  }

  async getRawLogById(tenantId: string, id: string) {
    return this.db.attendanceLog.findFirst({
      where: { tenantId, id },
      include: { user: true, device: true, rosterAssignment: true },
    });
  }

  async findRawLogsForUserWindow(tenantId: string, userId: string, startDate: Date, endDate: Date) {
    await this.employeeService.assertEmployeeEligible(tenantId, userId);

    return this.db.attendanceLog.findMany({
      where: this.rawLogWhere(tenantId, { userId, startDate, endDate }),
      orderBy: { timestamp: 'asc' },
    });
  }

  private rawLogWhere(
    tenantId: string,
    filters: { userId?: string; startDate?: Date; endDate?: Date; direction?: string },
  ): Prisma.AttendanceLogWhereInput {
    return {
      tenantId,
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.direction ? { direction: filters.direction } : {}),
      ...((filters.startDate || filters.endDate)
        ? {
            timestamp: {
              ...(filters.startDate ? { gte: filters.startDate } : {}),
              ...(filters.endDate ? { lte: filters.endDate } : {}),
            },
          }
        : {}),
    };
  }
}
