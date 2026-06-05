import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface ShiftTemplateListFilters {
  search?: string;
  type?: string;
  isActive?: boolean;
  skip: number;
  take: number;
}

@Injectable()
export class RosterRepository {
  constructor(private readonly database: DatabaseService) {}

  async listShiftTemplates(tenantId: string, filters: ShiftTemplateListFilters) {
    const where: any = {
      tenantId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.database.client.$transaction([
      this.database.client.shiftTemplate.findMany({
        where,
        select: this.shiftTemplateSelect(),
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: filters.skip,
        take: filters.take,
      }),
      this.database.client.shiftTemplate.count({ where }),
    ]);

    return { items, total };
  }

  async findShiftTemplateOrThrow(tenantId: string, shiftTemplateId: string) {
    const shiftTemplate = await this.database.client.shiftTemplate.findFirst({
      where: { id: shiftTemplateId, tenantId },
      select: this.shiftTemplateSelect(),
    });

    if (!shiftTemplate) {
      throw new NotFoundException('Shift template was not found for this tenant.');
    }

    return shiftTemplate;
  }

  async createShiftTemplate(tenantId: string, data: any) {
    return this.database.client.shiftTemplate.create({ data: { ...data, tenantId } });
  }

  async updateShiftTemplate(tenantId: string, id: string, data: any) {
    await this.findShiftTemplateOrThrow(tenantId, id);
    return this.database.client.shiftTemplate.update({ where: { id }, data });
  }

  async assertEmployeesBelongToTenant(tenantId: string, employeeIds: string[]) {
    const employees = await this.database.client.user.findMany({
      where: { tenantId, id: { in: employeeIds }, deletedAt: null },
      select: { id: true, departmentId: true, employmentStatus: true },
    });

    if (employees.length !== employeeIds.length) {
      throw new NotFoundException('One or more employees were not found for this tenant.');
    }

    return employees;
  }

  async assertDepartmentBelongsToTenant(tenantId: string, departmentId: string): Promise<void> {
    const department = await this.database.client.department.findFirst({
      where: { tenantId, id: departmentId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException('Department was not found for this tenant.');
    }
  }

  async assignEmployees(tenantId: string, shiftTemplate: any, rows: any[]) {
    try {
      return await this.database.client.$transaction(async (tx) => {
      const results = [];

      for (const row of rows) {
        const closedAt = new Date();
        const previousAssignment = await tx.rosterAssignment.findFirst({
          where: {
            tenantId,
            userId: row.userId,
            date: row.date,
            supersededAt: null,
            status: { not: 'CANCELLED' },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (previousAssignment) {
          await tx.rosterAssignment.updateMany({
            where: {
              id: previousAssignment.id,
              tenantId,
              supersededAt: null,
            },
            data: {
              supersededAt: closedAt,
              status: 'REASSIGNED',
            },
          });
        }

        const created = await tx.rosterAssignment.create({
          data: {
            tenantId,
            userId: row.userId,
            departmentId: row.departmentId,
            shiftTemplateId: shiftTemplate.id,
            date: row.date,
            overriddenHourlyRate: row.overriddenHourlyRate,
            status: 'UNVERIFIED',
            effectiveFrom: row.effectiveFrom,
            effectiveTo: row.effectiveTo,
            assignedByUserId: row.assignedByUserId,
            startTimeSnapshot: shiftTemplate.startTime,
            endTimeSnapshot: shiftTemplate.endTime,
            gracePeriodSnapshot: shiftTemplate.gracePeriodMinutes,
            overtimeThresholdSnapshot: shiftTemplate.overtimeThresholdMinutes,
            overnightSnapshot: shiftTemplate.isOvernight,
          },
        });

        if (previousAssignment) {
          await tx.rosterAssignment.updateMany({
            where: { id: previousAssignment.id, tenantId },
            data: { supersededByAssignmentId: created.id },
          });
        }

        await tx.rosterAssignmentHistory.create({
          data: {
            tenantId,
            rosterAssignmentId: created.id,
            userId: row.userId,
            previousShiftTemplateId: previousAssignment?.shiftTemplateId,
            newShiftTemplateId: shiftTemplate.id,
            previousDepartmentId: previousAssignment?.departmentId,
            newDepartmentId: row.departmentId,
            previousStatus: previousAssignment?.status,
            newStatus: 'UNVERIFIED',
            effectiveDate: row.date,
            action: previousAssignment ? 'REASSIGNED' : 'ASSIGNED',
            reason: row.reason,
            actorUserId: row.assignedByUserId,
          },
        });

        results.push(created);
      }

      return results;
      }, { isolationLevel: 'Serializable' as any });
    } catch (error) {
      this.rethrowAssignmentConflict(error);
      throw error;
    }
  }

  async unassignEmployees(tenantId: string, shiftTemplateId: string, rows: any[]) {
    try {
      return await this.database.client.$transaction(async (tx) => {
      const results = [];

      for (const row of rows) {
        const closedAt = new Date();
        const existing = await tx.rosterAssignment.findFirst({
          where: {
            tenantId,
            userId: row.userId,
            shiftTemplateId,
            date: row.date,
            ...(row.allowedDepartmentId ? { departmentId: row.allowedDepartmentId } : {}),
            supersededAt: null,
            status: { not: 'CANCELLED' },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!existing) {
          throw new ConflictException('One or more employees are not assigned to this shift for the requested date range.');
        }

        await tx.rosterAssignment.updateMany({
          where: {
            id: existing.id,
            tenantId,
            supersededAt: null,
          },
          data: {
            supersededAt: closedAt,
          },
        });

        const cancellation = await tx.rosterAssignment.create({
          data: {
            tenantId,
            userId: row.userId,
            departmentId: existing.departmentId,
            shiftTemplateId: existing.shiftTemplateId,
            date: row.date,
            overriddenHourlyRate: existing.overriddenHourlyRate,
            status: 'CANCELLED',
            effectiveFrom: existing.effectiveFrom,
            effectiveTo: existing.effectiveTo,
            assignedByUserId: row.actorUserId,
            unassignedAt: new Date(),
            unassignedReason: row.reason,
            startTimeSnapshot: existing.startTimeSnapshot,
            endTimeSnapshot: existing.endTimeSnapshot,
            gracePeriodSnapshot: existing.gracePeriodSnapshot,
            overtimeThresholdSnapshot: existing.overtimeThresholdSnapshot,
            overnightSnapshot: existing.overnightSnapshot,
          },
        });

        await tx.rosterAssignment.updateMany({
          where: { id: existing.id, tenantId },
          data: { supersededByAssignmentId: cancellation.id },
        });

        await tx.rosterAssignmentHistory.create({
          data: {
            tenantId,
            rosterAssignmentId: cancellation.id,
            userId: row.userId,
            previousShiftTemplateId: existing.shiftTemplateId,
            previousDepartmentId: existing.departmentId,
            previousStatus: existing.status,
            newStatus: 'CANCELLED',
            effectiveDate: row.date,
            action: 'UNASSIGNED',
            reason: row.reason,
            actorUserId: row.actorUserId,
          },
        });

        results.push(cancellation);
      }

      return results;
      }, { isolationLevel: 'Serializable' as any });
    } catch (error) {
      this.rethrowAssignmentConflict(error);
      throw error;
    }
  }

  private shiftTemplateSelect() {
    return {
      id: true,
      tenantId: true,
      name: true,
      type: true,
      startTime: true,
      endTime: true,
      gracePeriodMinutes: true,
      earlyClockInWindowMinutes: true,
      overtimeThresholdMinutes: true,
      isOvernight: true,
      isActive: true,
      effectiveFrom: true,
      effectiveTo: true,
      rules: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private rethrowAssignmentConflict(error: unknown): void {
    const code = (error as { code?: string }).code;

    if (code === 'P2002' || code === 'P2034') {
      throw new ConflictException('Concurrent roster update conflict. Please retry the assignment.');
    }
  }
}
