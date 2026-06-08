import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class HierarchyRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHierarchy(tenantId: string) {
    const departments = await this.prisma.client.department.findMany({
      where: { tenantId, status: 'ACTIVE' } as any,
      orderBy: { name: 'asc' },
    });

    return this.buildTree(departments);
  }

  async getChildren(departmentId: string, tenantId: string) {
    const department = await this.prisma.client.department.findFirst({
      where: { id: departmentId, tenantId, status: 'ACTIVE' } as any,
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.client.department.findMany({
      where: { parentId: departmentId, tenantId, status: 'ACTIVE' } as any,
      orderBy: { name: 'asc' },
    });
  }

  async getRootDepartments(tenantId: string) {
    return this.prisma.client.department.findMany({
      where: { tenantId, parentId: null, status: 'ACTIVE' } as any,
      orderBy: { name: 'asc' },
    });
  }

  private buildTree(departments: any[]): any[] {
    const map = new Map();
    const roots: any[] = [];

    departments.forEach(dept => {
      map.set(dept.id, { ...dept, children: [] });
    });

    departments.forEach(dept => {
      const node = map.get(dept.id);
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
