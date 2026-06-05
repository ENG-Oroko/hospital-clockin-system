import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { UserRole } from '@chronos/types-common';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE
  async create(dto: CreateDepartmentDto, tenantId: string) {
    const exists = await this.prisma.client.department.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (exists) {
      throw new BadRequestException(
        'Department code already exists',
      );
    }

    return this.prisma.client.department.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        rules: dto.rules ?? {},
      },
    });
  }

  // UPDATE
  async updateDepartment(
    departmentId: string,
    dto: UpdateDepartmentDto,
    tenantId: string,
  ) {
    const department = await this.getDepartmentOrThrow(tenantId, departmentId);

    if (dto.code && dto.code !== department.code) {
      const existingDepartment = await this.prisma.client.department.findFirst({
        where: { tenantId, code: dto.code },
      });

      if (existingDepartment && existingDepartment.id !== departmentId) {
        throw new BadRequestException('Department code already exists');
      }
    }

    return this.prisma.client.department.update({
      where: { id: departmentId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
        ...(dto.rules && { rules: dto.rules }),
      },
    });
  }

  // LIST
  async listDepartments(tenantId: string) {
    return this.prisma.client.department.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // DELETE
  async deleteDepartment(departmentId: string, tenantId: string) {
    await this.getDepartmentOrThrow(tenantId, departmentId);

    return this.prisma.client.department.delete({
      where: { id: departmentId },
    });
  }

  // ASSIGN HEAD
  async assignDepartmentHead(tenantId: string, departmentId: string, userId: string) {
    await this.getDepartmentOrThrow(tenantId, departmentId);
    await this.getUserOrThrow(tenantId, userId);

    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        departmentId,
        role: UserRole.DEPT_HEAD,
      },
    });
  }

  // ASSIGN STAFF
  async assignDepartmentStaff(tenantId: string, departmentId: string, userId: string) {
    await this.getDepartmentOrThrow(tenantId, departmentId);
    await this.getUserOrThrow(tenantId, userId);

    return this.prisma.client.user.update({
      where: { id: userId },
      data: {
        departmentId,
        role: UserRole.EMPLOYEE,
      },
    });
  }

  // STAFF LIST
  async listDepartmentStaff(tenantId: string, departmentId: string) {
    await this.getDepartmentOrThrow(tenantId, departmentId);

    return this.prisma.client.user.findMany({
      where: { tenantId, departmentId },
    });
  }

  // HELPERS
  private async getDepartmentOrThrow(tenantId: string, id: string) {
    const dept = await this.prisma.client.department.findFirst({
      where: { id, tenantId },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  private async getUserOrThrow(tenantId: string, id: string) {
    const user = await this.prisma.client.user.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
