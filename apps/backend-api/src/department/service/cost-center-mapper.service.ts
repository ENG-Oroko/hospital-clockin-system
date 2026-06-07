import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CostCenterMapperService {
  constructor(private readonly prisma: PrismaService) {}

  async getCostCenterCode(departmentId: string, tenantId: string): Promise<string | null> {
    const department = await this.prisma.client.department.findFirst({
      where: { id: departmentId, tenantId },
      select: { costCenterCode: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department.costCenterCode;
  }

  async updateCostCenterCode(
    departmentId: string,
    costCenterCode: string,
    tenantId: string,
  ) {
    const department = await this.prisma.client.department.findFirst({
      where: { id: departmentId, tenantId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.client.department.update({
      where: { id: departmentId },
      data: { costCenterCode },
    });
  }

  async getAllCostCenters(tenantId: string) {
    return this.prisma.client.department.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        costCenterCode: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}