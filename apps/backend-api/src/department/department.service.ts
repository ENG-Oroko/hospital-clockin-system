import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@chronos/types-common';
import { PrismaService } from '../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto, tenantId: string) {
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
      rules: dto.rules ?? {},
    };

    return this.prisma.client.department.create({
      data: data as any,
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.client.department.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const department = await this.prisma.client.department.findFirst({
      where: { id, tenantId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(departmentId: string, dto: UpdateDepartmentDto, tenantId: string) {
    const department = await this.findOne(departmentId, tenantId);

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
      ...(dto.rules !== undefined && { rules: dto.rules }),
    };

    return this.prisma.client.department.update({
      where: { id: departmentId },
      data: data as any,
    });
  }

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId);

    const children = await this.prisma.client.department.findMany({
      where: { tenantId, parentId: id } as any,
      select: { id: true },
    });

    if (children.length > 0) {
      throw new BadRequestException('Cannot delete department with child departments');
    }

    return this.prisma.client.department.delete({
      where: { id },
    });
  }

  async assignDepartmentHead(tenantId: string, departmentId: string, userId: string) {
    await this.findOne(departmentId, tenantId);
    await this.getUserOrThrow(tenantId, userId);

    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        departmentId,
        role: UserRole.DEPT_HEAD,
      },
    });
  }

  async assignDepartmentStaff(tenantId: string, departmentId: string, userId: string) {
    await this.findOne(departmentId, tenantId);
    await this.getUserOrThrow(tenantId, userId);

    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        departmentId,
        role: UserRole.EMPLOYEE,
      },
    });
  }

  async listDepartmentStaff(tenantId: string, departmentId: string) {
    await this.findOne(departmentId, tenantId);

    return this.prisma.client.user.findMany({
      where: { tenantId, departmentId },
    });
  }

  private async assertParentDepartment(tenantId: string, parentId: string) {
    const parent = await this.prisma.client.department.findFirst({
      where: { id: parentId, tenantId },
      select: { id: true },
    });

    if (!parent) {
      throw new NotFoundException('Parent department not found');
    }
  }

  private async getUserOrThrow(tenantId: string, id: string) {
    const user = await this.prisma.client.user.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
