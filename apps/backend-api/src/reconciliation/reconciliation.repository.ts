import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ReconciliationAuditInput {
  tenantId: string;
  actorUserId: string;
  actionType: string;
  justification: string;
  targetLogId?: string;
  oldValues?: unknown;
  newValues?: unknown;
}

export interface UnrosteredExceptionLogInput {
  exceptionId: string;
  tenantId: string;
  employeeId: string;
  attendanceDate: string;
  attendanceLogIds: string[];
  devices: Array<{
    id: string;
    name?: string | null;
    serialCode?: string | null;
  }>;
  outcome: 'UNROSTERED';
  reviewState: string;
  reason: string;
}

export const UNROSTERED_EXCEPTION_ACTIONS = [
  'UNROSTERED_EXCEPTION_CREATED',
  'UNROSTERED_EXCEPTION_REVIEWED',
  'UNROSTERED_EXCEPTION_OVERRIDE_APPROVED',
  'UNROSTERED_EXCEPTION_REPROCESSED',
  'UNROSTERED_EXCEPTION_CLEARED',
] as const;

@Injectable()
export class ReconciliationRepository {
  constructor(private readonly db: PrismaService) {}

  findPayrollReadyRecords(tenantId: string, startDate: Date, endDate: Date) {
    return this.db.reconciliationLog.findMany({
      where: {
        tenantId,
        isResolved: true,
        isFlagged: false,
        exceptionReason: null,
        rosterAssignment: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        rosterAssignment: {
          include: {
            department: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                payrollNumber: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findExceptions(tenantId: string, startDate?: Date, endDate?: Date) {
    return this.db.reconciliationLog.findMany({
      where: {
        tenantId,
        OR: [{ isFlagged: true }, { isResolved: false }],
        ...(startDate || endDate
          ? {
              rosterAssignment: {
                date: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {}),
                },
              },
            }
          : {}),
      },
      include: {
        rosterAssignment: {
          include: {
            department: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                payrollNumber: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findAttendanceLogsForUserDate(tenantId: string, employeeId: string, date: Date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    return this.db.attendanceLog.findMany({
      where: {
        tenantId,
        userId: employeeId,
        timestamp: { gte: start, lte: end },
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            serialCode: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  findUnrosteredExceptionAudits(tenantId: string) {
    return this.db.attendanceAudit.findMany({
      where: {
        tenantId,
        actionType: { in: [...UNROSTERED_EXCEPTION_ACTIONS] },
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
      orderBy: { createdAt: 'asc' },
    });
  }

  findUnrosteredExceptionAuditById(tenantId: string, exceptionId: string) {
    return this.db.attendanceAudit.findMany({
      where: {
        tenantId,
        actionType: { in: [...UNROSTERED_EXCEPTION_ACTIONS] },
        OR: [
          { id: exceptionId },
          { oldValues: { path: ['exceptionId'], equals: exceptionId } as any },
          { newValues: { path: ['exceptionId'], equals: exceptionId } as any },
        ],
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
      orderBy: { createdAt: 'asc' },
    });
  }

  upsertAssignmentResult(tenantId: string, assignmentId: string, data: any) {
    return this.db.reconciliationLog.upsert({
      where: { rosterAssignmentId: assignmentId },
      update: data,
      create: {
        tenantId,
        rosterAssignmentId: assignmentId,
        ...data,
      },
    });
  }

  findByIdOrThrow(tenantId: string, id: string) {
    return this.db.reconciliationLog.findFirstOrThrow({
      where: { tenantId, id },
      include: { rosterAssignment: true },
    });
  }

  updateById(tenantId: string, id: string, data: any) {
    return this.db.reconciliationLog.updateMany({
      where: { tenantId, id },
      data,
    });
  }

  linkLogsToAssignment(tenantId: string, logIds: string[], assignmentId: string) {
    if (!logIds.length) {
      return Promise.resolve({ count: 0 });
    }

    return this.db.attendanceLog.updateMany({
      where: { id: { in: logIds }, tenantId },
      data: { rosterAssignmentId: assignmentId },
    });
  }

  createAudit(input: ReconciliationAuditInput) {
    return this.db.attendanceAudit.create({
      data: {
        tenantId: input.tenantId,
        userId: input.actorUserId,
        targetLogId: input.targetLogId,
        actionType: input.actionType,
        justification: input.justification,
        oldValues: input.oldValues as any,
        newValues: input.newValues as any,
      },
    });
  }
}
