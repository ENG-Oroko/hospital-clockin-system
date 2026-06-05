import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    return this.prisma.client.department.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId ?? null,
        costCenterCode: dto.costCenterCode ?? null,
        rules: dto.rules ?? {},
      },
    });
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

    return this.prisma.client.department.update({
      where: { id: departmentId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.costCenterCode !== undefined && { costCenterCode: dto.costCenterCode }),
        ...(dto.rules !== undefined && { rules: dto.rules }),
      },
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

  async delete(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    
    const children = await this.prisma.client.department.findMany({
      where: { parentId: id },
      select: { id: true },
    });

    if (children.length > 0) {
      throw new BadRequestException(
        'Cannot delete department with child departments',
      );
    }

    return this.prisma.client.department.delete({
      where: { id },
    });
  }
}