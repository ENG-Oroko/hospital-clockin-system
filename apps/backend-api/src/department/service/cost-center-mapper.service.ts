import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CostCenterMapperService {
  constructor(private readonly prisma: PrismaService) {}

  async getCostCenterCode(departmentId: string, tenantId: string): Promise<string | null> {
    const department = await this.prisma.client.department.findFirst({
      where: { id: departmentId, tenantId, status: 'ACTIVE' } as any,
      select: { costCenterCode: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department.costCenterCode;
  }

  async getAllCostCenters(tenantId: string) {
    return this.prisma.client.department.findMany({
      where: { tenantId, status: 'ACTIVE' } as any,
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
