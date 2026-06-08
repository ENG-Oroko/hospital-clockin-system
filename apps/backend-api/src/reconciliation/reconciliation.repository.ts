import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ReconciliationAuditInput {
  tenantId: string;
  actorUserId: string;
  actionType: string;
  justification: string;
  oldValues?: unknown;
  newValues?: unknown;
}

@Injectable()
export class ReconciliationRepository {
  constructor(private readonly db: PrismaService) {}

  findPayrollReadyRecords(tenantId: string, startDate: Date, endDate: Date) {
    return this.db.reconciliationLog.findMany({
      where: {
        tenantId,
        isResolved: true,
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
        actionType: input.actionType,
        justification: input.justification,
        oldValues: input.oldValues as any,
        newValues: input.newValues as any,
      },
    });
  }
}
