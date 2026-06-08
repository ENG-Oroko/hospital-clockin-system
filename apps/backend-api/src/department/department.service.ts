import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@chronos/types-common';
import type { AuthenticatedUser } from '../common/auth/authenticated-user';
import { PrismaService } from '../database/prisma.service';
import { EmployeeService } from '../employee/employee.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  private static readonly validStatuses = ['ACTIVE', 'INACTIVE'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
  ) {}

  async create(dto: CreateDepartmentDto, tenantId: string, actorUserId?: string) {
    const exists = await this.prisma.client.department.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (exists) {
      throw new BadRequestException('Department code already exists');
    }

    if (dto.parentId) {
      await this.assertParentDepartment(tenantId, dto.parentId);
    }

    const data = {
      tenantId,
      name: dto.name,
      code: dto.code,
      parentId: dto.parentId ?? null,
      costCenterCode: dto.costCenterCode ?? null,
      status: dto.status ?? 'ACTIVE',
      rules: dto.rules ?? {},
    };

    const department = await this.prisma.client.department.create({
      data: data as any,
    });

    await this.createAudit(tenantId, department.id, actorUserId, 'CREATE', null, department);
    return department;
  }

  async findAll(tenantId: string) {
    return this.prisma.client.department.findMany({
      where: { tenantId, status: 'ACTIVE' } as any,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string, includeInactive = false) {
    const department = await this.prisma.client.department.findFirst({
      where: { id, tenantId, ...(includeInactive ? {} : { status: 'ACTIVE' }) } as any,
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(departmentId: string, dto: UpdateDepartmentDto, tenantId: string, actorUserId?: string) {
    const department = await this.findOne(departmentId, tenantId, true);

    if (dto.code && dto.code !== department.code) {
      const existing = await this.prisma.client.department.findFirst({
        where: { tenantId, code: dto.code },
      });

      if (existing && existing.id !== departmentId) {
        throw new BadRequestException('Department code already exists');
      }
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === departmentId) {
        throw new BadRequestException('Department cannot be its own parent');
      }

      if (dto.parentId) {
        await this.assertParentDepartment(tenantId, dto.parentId);
      }
    }

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      ...(dto.costCenterCode !== undefined && { costCenterCode: dto.costCenterCode }),
      ...(dto.status !== undefined && { status: this.assertDepartmentStatus(dto.status) }),
      ...(dto.rules !== undefined && { rules: dto.rules }),
    };

    const updated = await this.prisma.client.department.update({
      where: { id: departmentId },
      data: data as any,
    });

    await this.createAudit(tenantId, departmentId, actorUserId, 'UPDATE', department, updated);
    return updated;
  }

  async delete(id: string, tenantId: string, actorUserId?: string) {
    const department = await this.findOne(id, tenantId, true);

    const children = await this.prisma.client.department.findMany({
      where: { tenantId, parentId: id, status: 'ACTIVE' } as any,
      select: { id: true },
    });

    if (children.length > 0) {
      throw new BadRequestException('Cannot delete department with child departments');
    }

    const updated = await this.prisma.client.department.update({
      where: { id },
      data: { status: 'INACTIVE' } as any,
    });

    await this.createAudit(tenantId, id, actorUserId, 'DEACTIVATE', department, updated);
    return updated;
  }

  async updateStatus(departmentId: string, tenantId: string, status: string, actorUserId?: string) {
    const normalizedStatus = this.assertDepartmentStatus(status);
    const department = await this.findOne(departmentId, tenantId, true);

    const updated = await this.prisma.client.department.update({
      where: { id: departmentId },
      data: { status: normalizedStatus } as any,
    });

    await this.createAudit(tenantId, departmentId, actorUserId, 'STATUS_CHANGE', department, updated);
    return updated;
  }

  async updateCostCenterCode(departmentId: string, tenantId: string, costCenterCode: string, actorUserId?: string) {
    return this.update(departmentId, { costCenterCode }, tenantId, actorUserId);
  }

  async assignDepartmentHead(tenantId: string, departmentId: string, userId: string, actor: AuthenticatedUser) {
    await this.findOne(departmentId, tenantId);
    const previous = await this.employeeService.getEmployeeById(tenantId, userId);
    await this.employeeService.updateDepartment(tenantId, actor, userId, { departmentId });
    const updated = await this.employeeService.update(tenantId, actor, userId, { role: UserRole.DEPT_HEAD } as any);

    await this.createAudit(tenantId, departmentId, actor.userId, 'ASSIGN_HEAD', previous, {
      userId,
      role: UserRole.DEPT_HEAD,
      departmentId,
    });
    return updated;
  }

  async assignDepartmentStaff(tenantId: string, departmentId: string, userId: string, actor: AuthenticatedUser) {
    await this.findOne(departmentId, tenantId);
    const previous = await this.employeeService.getEmployeeById(tenantId, userId);
    await this.employeeService.updateDepartment(tenantId, actor, userId, { departmentId });
    const updated = await this.employeeService.update(tenantId, actor, userId, { role: UserRole.EMPLOYEE } as any);

    await this.createAudit(tenantId, departmentId, actor.userId, 'ASSIGN_STAFF', previous, {
      userId,
      role: UserRole.EMPLOYEE,
      departmentId,
    });
    return updated;
  }

  async listDepartmentStaff(tenantId: string, departmentId: string) {
    await this.findOne(departmentId, tenantId);
    return this.employeeService.getDepartmentEmployees(tenantId, departmentId);
  }

  private async assertParentDepartment(tenantId: string, parentId: string) {
    const parent = await this.prisma.client.department.findFirst({
      where: { id: parentId, tenantId, status: 'ACTIVE' } as any,
      select: { id: true },
    });

    if (!parent) {
      throw new NotFoundException('Parent department not found');
    }
  }

  private assertDepartmentStatus(status: string) {
    if (!DepartmentService.validStatuses.includes(status)) {
      throw new BadRequestException('Department status must be ACTIVE or INACTIVE.');
    }

    return status;
  }

  private async createAudit(
    tenantId: string,
    departmentId: string,
    actorUserId: string | undefined,
    action: string,
    previousValue: unknown,
    newValue: unknown,
  ) {
    await (this.prisma.client as any).departmentAudit.create({
      data: {
        tenantId,
        departmentId,
        actorUserId: actorUserId ?? null,
        action,
        previousValue: this.toAuditJson(previousValue) as any,
        newValue: this.toAuditJson(newValue) as any,
      },
    });
  }

  private toAuditJson(value: unknown) {
    if (value === null || value === undefined) {
      return value;
    }

    return JSON.parse(JSON.stringify(value, (key, nestedValue) => {
      if (['passwordHash', 'password', 'refreshToken'].includes(key)) {
        return undefined;
      }
      return nestedValue;
    }));
  }
}
