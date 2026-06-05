import { BadRequestException, Injectable } from '@nestjs/common';
import {
  RosterAssignmentResponseDTO,
  ShiftAssignmentCreateDTO,
  ShiftAssignmentUnassignDTO,
  ShiftTemplateCreateDTO,
  ShiftTemplateQueryDTO,
  ShiftTemplateResponseDTO,
  ShiftTemplateType,
  ShiftTemplateUpdateDTO,
} from '@chronos/types-common';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { hasDepartmentScopedEmployeeAccess, hasTenantWideEmployeeAccess } from '../common/auth/role-policy';
import { normalizePagination, paginatedResponse } from '../common/pagination';
import {
  assertDate,
  assertEnumValue,
  assertOptionalDate,
  assertOptionalEnumValue,
  assertOptionalNonNegativeInteger,
  assertOptionalNumber,
  assertOptionalString,
  assertPlainObject,
  assertRequiredString,
  assertTime,
  assertUuid,
  assertUuidArray,
} from '../common/validation';
import { RosterRepository } from './roster.repository';

@Injectable()
export class RosterService {
  constructor(private readonly rosterRepository: RosterRepository) {}

  async createShiftTemplate(tenantId: string, payload: ShiftTemplateCreateDTO) {
    const startTime = assertTime(payload.startTime, 'startTime');
    const endTime = assertTime(payload.endTime, 'endTime');
    this.assertValidShiftWindow(startTime, endTime);
    const effectiveFrom = payload.effectiveFrom ? assertDate(payload.effectiveFrom, 'effectiveFrom') : null;
    const effectiveTo = payload.effectiveTo ? assertDate(payload.effectiveTo, 'effectiveTo') : null;
    this.assertDateOrder(effectiveFrom, effectiveTo);
    const shiftTemplate = await this.rosterRepository.createShiftTemplate(tenantId, {
      name: assertRequiredString(payload.name, 'name', 100),
      type: assertEnumValue(payload.type, ShiftTemplateType, 'type'),
      startTime,
      endTime,
      gracePeriodMinutes: assertOptionalNonNegativeInteger(payload.gracePeriodMinutes, 'gracePeriodMinutes') ?? 15,
      earlyClockInWindowMinutes: assertOptionalNonNegativeInteger(payload.earlyClockInWindowMinutes, 'earlyClockInWindowMinutes') ?? 30,
      overtimeThresholdMinutes: assertOptionalNonNegativeInteger(payload.overtimeThresholdMinutes, 'overtimeThresholdMinutes') ?? 0,
      isOvernight: payload.isOvernight ?? this.crossesMidnight(startTime, endTime),
      effectiveFrom,
      effectiveTo,
      rules: assertPlainObject(payload.rules, 'rules') ?? {},
    });

    return this.toShiftTemplateResponse(shiftTemplate);
  }

  async listShiftTemplates(tenantId: string, query: ShiftTemplateQueryDTO) {
    const pagination = normalizePagination(query.page, query.limit);
    const search = assertOptionalString(query.search, 'search', 100);
    const type = assertOptionalEnumValue(query.type, ShiftTemplateType, 'type');
    const isActive = query.isActive === undefined ? undefined : query.isActive === true || String(query.isActive) === 'true';
    const result = await this.rosterRepository.listShiftTemplates(tenantId, {
      ...pagination,
      search: search ?? undefined,
      type,
      isActive,
    });

    return paginatedResponse(result.items.map((item) => this.toShiftTemplateResponse(item)), result.total, pagination.page, pagination.limit);
  }

  async getShiftTemplate(tenantId: string, id: string) {
    assertUuid(id, 'id');
    return this.toShiftTemplateResponse(await this.rosterRepository.findShiftTemplateOrThrow(tenantId, id));
  }

  async updateShiftTemplate(tenantId: string, id: string, payload: ShiftTemplateUpdateDTO) {
    assertUuid(id, 'id');

    const data: Record<string, unknown> = {};

    if (payload.name !== undefined) data.name = assertRequiredString(payload.name, 'name', 100);
    if (payload.type !== undefined) data.type = assertEnumValue(payload.type, ShiftTemplateType, 'type');
    if (payload.startTime !== undefined) data.startTime = assertTime(payload.startTime, 'startTime');
    if (payload.endTime !== undefined) data.endTime = assertTime(payload.endTime, 'endTime');
    if (payload.gracePeriodMinutes !== undefined) data.gracePeriodMinutes = assertOptionalNonNegativeInteger(payload.gracePeriodMinutes, 'gracePeriodMinutes');
    if (payload.earlyClockInWindowMinutes !== undefined) data.earlyClockInWindowMinutes = assertOptionalNonNegativeInteger(payload.earlyClockInWindowMinutes, 'earlyClockInWindowMinutes');
    if (payload.overtimeThresholdMinutes !== undefined) data.overtimeThresholdMinutes = assertOptionalNonNegativeInteger(payload.overtimeThresholdMinutes, 'overtimeThresholdMinutes');
    if (payload.isOvernight !== undefined) data.isOvernight = Boolean(payload.isOvernight);
    if (payload.isActive !== undefined) data.isActive = Boolean(payload.isActive);
    if (payload.effectiveFrom !== undefined) data.effectiveFrom = assertOptionalDate(payload.effectiveFrom, 'effectiveFrom');
    if (payload.effectiveTo !== undefined) data.effectiveTo = assertOptionalDate(payload.effectiveTo, 'effectiveTo');
    if (payload.rules !== undefined) data.rules = assertPlainObject(payload.rules, 'rules');

    if (!Object.keys(data).length) {
      throw new BadRequestException('At least one shift template field must be provided.');
    }

    if ((data.startTime || data.endTime) && payload.isOvernight === undefined) {
      const current = await this.rosterRepository.findShiftTemplateOrThrow(tenantId, id);
      this.assertValidShiftWindow(
        String(data.startTime ?? current.startTime),
        String(data.endTime ?? current.endTime),
      );
      data.isOvernight = this.crossesMidnight(
        String(data.startTime ?? current.startTime),
        String(data.endTime ?? current.endTime),
      );
    }

    if (data.effectiveFrom !== undefined || data.effectiveTo !== undefined) {
      const current = await this.rosterRepository.findShiftTemplateOrThrow(tenantId, id);
      this.assertDateOrder(
        (data.effectiveFrom as Date | null | undefined) ?? current.effectiveFrom,
        (data.effectiveTo as Date | null | undefined) ?? current.effectiveTo,
      );
    }

    return this.toShiftTemplateResponse(await this.rosterRepository.updateShiftTemplate(tenantId, id, data));
  }

  async deactivateShiftTemplate(tenantId: string, id: string) {
    assertUuid(id, 'id');
    return this.toShiftTemplateResponse(await this.rosterRepository.updateShiftTemplate(tenantId, id, { isActive: false }));
  }

  async assignEmployees(tenantId: string, actor: AuthenticatedUser, shiftTemplateId: string, payload: ShiftAssignmentCreateDTO) {
    assertUuid(shiftTemplateId, 'shiftTemplateId');
    const shiftTemplate = await this.rosterRepository.findShiftTemplateOrThrow(tenantId, shiftTemplateId);

    if (!shiftTemplate.isActive) {
      throw new BadRequestException('Cannot assign employees to an inactive shift template.');
    }

    const employeeIds = assertUuidArray(payload.employeeIds, 'employeeIds');
    const employees = await this.rosterRepository.assertEmployeesBelongToTenant(tenantId, employeeIds);
    const effectiveFrom = assertDate(payload.effectiveFrom, 'effectiveFrom');
    const effectiveTo = payload.effectiveTo ? assertDate(payload.effectiveTo, 'effectiveTo') : effectiveFrom;

    if (effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must be on or after effectiveFrom.');
    }

    this.assertWithinTemplateEffectiveWindow(shiftTemplate, effectiveFrom, effectiveTo);

    const requestedDays = this.expandDateRange(effectiveFrom, effectiveTo);
    const overriddenHourlyRate = assertOptionalNumber(payload.overriddenHourlyRate, 'overriddenHourlyRate');
    const reason = assertOptionalString(payload.reason, 'reason', 255) ?? undefined;
    const departmentId = payload.departmentId;

    if (departmentId) {
      assertUuid(departmentId, 'departmentId');
      await this.rosterRepository.assertDepartmentBelongsToTenant(tenantId, departmentId);
    }

    const employeeById = new Map<string, { id: string; departmentId: string | null; employmentStatus: string }>(
      employees.map((employee) => [employee.id, employee]),
    );
    const rows = employeeIds.flatMap((employeeId) => {
      const employee = employeeById.get(employeeId);
      const resolvedDepartmentId = departmentId ?? employee?.departmentId;

      if (!resolvedDepartmentId) {
        throw new BadRequestException('departmentId is required when an employee has no home department.');
      }

      if (employee?.employmentStatus === 'TERMINATED' || employee?.employmentStatus === 'SUSPENDED') {
        throw new BadRequestException('Terminated or suspended employees cannot be assigned to shifts.');
      }

      this.assertCanScheduleDepartment(actor, resolvedDepartmentId);

      return requestedDays.map((date) => ({
        userId: employeeId,
        departmentId: resolvedDepartmentId,
        date,
        effectiveFrom,
        effectiveTo,
        overriddenHourlyRate,
        reason,
        assignedByUserId: actor.userId,
      }));
    });

    const assignments = await this.rosterRepository.assignEmployees(tenantId, shiftTemplate, rows);

    return assignments.map((assignment) => this.toRosterAssignmentResponse(assignment));
  }

  async unassignEmployees(tenantId: string, actor: AuthenticatedUser, shiftTemplateId: string, payload: ShiftAssignmentUnassignDTO) {
    assertUuid(shiftTemplateId, 'shiftTemplateId');
    await this.rosterRepository.findShiftTemplateOrThrow(tenantId, shiftTemplateId);

    const employeeIds = assertUuidArray(payload.employeeIds, 'employeeIds');
    await this.rosterRepository.assertEmployeesBelongToTenant(tenantId, employeeIds);
    const effectiveFrom = assertDate(payload.effectiveFrom, 'effectiveFrom');
    const effectiveTo = payload.effectiveTo ? assertDate(payload.effectiveTo, 'effectiveTo') : effectiveFrom;

    if (effectiveTo < effectiveFrom) {
      throw new BadRequestException('effectiveTo must be on or after effectiveFrom.');
    }

    const reason = assertOptionalString(payload.reason, 'reason', 255) ?? undefined;
    const rows = employeeIds.flatMap((employeeId) =>
      this.expandDateRange(effectiveFrom, effectiveTo).map((date) => ({
        userId: employeeId,
        date,
        reason,
        actorUserId: actor.userId,
        allowedDepartmentId: hasDepartmentScopedEmployeeAccess(actor.role) ? actor.deptId : undefined,
      })),
    );

    const assignments = await this.rosterRepository.unassignEmployees(tenantId, shiftTemplateId, rows);

    return assignments.map((assignment) => this.toRosterAssignmentResponse(assignment));
  }

  async getActiveAssignmentForUserDate(tenantId: string, userId: string, date: Date | string) {
    assertUuid(userId, 'userId');
    const normalizedDate = typeof date === 'string' ? assertDate(date, 'date') : this.normalizeDateOnly(date);
    const assignment = await this.rosterRepository.findActiveAssignmentForUserDate(tenantId, userId, normalizedDate);
    return assignment ? this.toRosterAssignmentSnapshot(assignment) : null;
  }

  async getAssignmentSnapshot(tenantId: string, assignmentId: string) {
    assertUuid(assignmentId, 'assignmentId');
    return this.toRosterAssignmentSnapshot(
      await this.rosterRepository.findAssignmentSnapshotOrThrow(tenantId, assignmentId),
    );
  }

  async getCurrentAssignment(tenantId: string, userId: string, date: Date | string = new Date()) {
    return this.getActiveAssignmentForUserDate(tenantId, userId, date);
  }

  async getAssignmentHistory(tenantId: string, assignmentId: string) {
    assertUuid(assignmentId, 'assignmentId');
    return this.rosterRepository.getAssignmentHistory(tenantId, assignmentId);
  }

  async getDepartmentRoster(tenantId: string, departmentId: string, date: Date | string) {
    assertUuid(departmentId, 'departmentId');
    const normalizedDate = typeof date === 'string' ? assertDate(date, 'date') : this.normalizeDateOnly(date);
    const assignments = await this.rosterRepository.getDepartmentRoster(tenantId, departmentId, normalizedDate);
    return assignments.map((assignment) => this.toRosterAssignmentSnapshot(assignment));
  }

  private expandDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const cursor = new Date(start);
    const maxDays = 366;

    while (cursor <= end) {
      if (dates.length >= maxDays) {
        throw new BadRequestException('Date range cannot exceed 366 days.');
      }

      dates.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return dates;
  }

  private normalizeDateOnly(date: Date): Date {
    return new Date(date.toISOString().slice(0, 10));
  }

  private crossesMidnight(startTime: string, endTime: string): boolean {
    return endTime <= startTime;
  }

  private assertValidShiftWindow(startTime: string, endTime: string): void {
    if (startTime === endTime) {
      throw new BadRequestException('Shift startTime and endTime cannot be equal.');
    }
  }

  private assertDateOrder(start: Date | null | undefined, end: Date | null | undefined): void {
    if (start && end && end < start) {
      throw new BadRequestException('effectiveTo must be on or after effectiveFrom.');
    }
  }

  private assertWithinTemplateEffectiveWindow(shiftTemplate: any, start: Date, end: Date): void {
    if (shiftTemplate.effectiveFrom && start < shiftTemplate.effectiveFrom) {
      throw new BadRequestException('Assignment starts before the shift template effective date.');
    }
    if (shiftTemplate.effectiveTo && end > shiftTemplate.effectiveTo) {
      throw new BadRequestException('Assignment ends after the shift template effective date.');
    }
  }

  private assertCanScheduleDepartment(actor: AuthenticatedUser, departmentId: string): void {
    if (hasTenantWideEmployeeAccess(actor.role)) {
      return;
    }

    if (hasDepartmentScopedEmployeeAccess(actor.role) && actor.deptId === departmentId) {
      return;
    }

    throw new BadRequestException('You can only schedule employees in your assigned department.');
  }

  private toShiftTemplateResponse(shiftTemplate: any): ShiftTemplateResponseDTO {
    return {
      id: shiftTemplate.id,
      tenantId: shiftTemplate.tenantId,
      name: shiftTemplate.name,
      type: shiftTemplate.type,
      startTime: shiftTemplate.startTime,
      endTime: shiftTemplate.endTime,
      gracePeriodMinutes: shiftTemplate.gracePeriodMinutes,
      earlyClockInWindowMinutes: shiftTemplate.earlyClockInWindowMinutes,
      overtimeThresholdMinutes: shiftTemplate.overtimeThresholdMinutes,
      isOvernight: shiftTemplate.isOvernight,
      isActive: shiftTemplate.isActive,
      effectiveFrom: shiftTemplate.effectiveFrom?.toISOString().slice(0, 10) ?? null,
      effectiveTo: shiftTemplate.effectiveTo?.toISOString().slice(0, 10) ?? null,
      rules: shiftTemplate.rules ?? {},
      createdAt: shiftTemplate.createdAt.toISOString(),
      updatedAt: shiftTemplate.updatedAt.toISOString(),
    };
  }

  private toRosterAssignmentResponse(assignment: any): RosterAssignmentResponseDTO {
    return {
      id: assignment.id,
      tenantId: assignment.tenantId,
      employeeId: assignment.userId,
      departmentId: assignment.departmentId,
      shiftTemplateId: assignment.shiftTemplateId,
      date: assignment.date.toISOString().slice(0, 10),
      status: assignment.status,
      overriddenHourlyRate: assignment.overriddenHourlyRate === null ? null : Number(assignment.overriddenHourlyRate),
      effectiveFrom: assignment.effectiveFrom?.toISOString().slice(0, 10) ?? null,
      effectiveTo: assignment.effectiveTo?.toISOString().slice(0, 10) ?? null,
      assignedByUserId: assignment.assignedByUserId,
      unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
      unassignedReason: assignment.unassignedReason,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }

  private toRosterAssignmentSnapshot(assignment: any) {
    return {
      id: assignment.id,
      tenantId: assignment.tenantId,
      employeeId: assignment.userId,
      departmentId: assignment.departmentId,
      shiftTemplateId: assignment.shiftTemplateId,
      date: assignment.date,
      status: assignment.status,
      overriddenHourlyRate: assignment.overriddenHourlyRate === null ? null : Number(assignment.overriddenHourlyRate),
      startTimeSnapshot: assignment.startTimeSnapshot,
      endTimeSnapshot: assignment.endTimeSnapshot,
      gracePeriodSnapshot: assignment.gracePeriodSnapshot,
      overtimeThresholdSnapshot: assignment.overtimeThresholdSnapshot,
      overnightSnapshot: assignment.overnightSnapshot,
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo,
      assignedByUserId: assignment.assignedByUserId,
      unassignedAt: assignment.unassignedAt,
      unassignedReason: assignment.unassignedReason,
      department: assignment.department ?? null,
      employee: assignment.user ?? null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }
}
