// test/department/department.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/database/prisma.service';
import { DepartmentService } from '../../src/department/department.service';
import { HierarchyRegistryService } from '../../src/department/service/hierarchy-registry.service';
import { CostCenterMapperService } from '../../src/department/service/cost-center-mapper.service';
import { TenantStorage } from '../../src/database/tenant.storage';
import { randomUUID } from 'crypto';

describe('Department Module Integration Tests', () => {
  let prismaService: PrismaService;
  let departmentService: DepartmentService;
  let hierarchyRegistry: HierarchyRegistryService;
  let costCenterMapper: CostCenterMapperService;
  let currentTenantId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        DepartmentService,
        HierarchyRegistryService,
        CostCenterMapperService,
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    departmentService = module.get<DepartmentService>(DepartmentService);
    hierarchyRegistry = module.get<HierarchyRegistryService>(HierarchyRegistryService);
    costCenterMapper = module.get<CostCenterMapperService>(CostCenterMapperService);

    await prismaService.onModuleInit();
  });

  const createTenant = async (name: string): Promise<string> => {
    const tenantId = randomUUID();
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniqueSlug = `${name.toLowerCase().replace(/\s/g, '-')}-${timestamp}-${randomSuffix}`;
    
    await prismaService.rawClient.tenant.create({
      data: {
        id: tenantId,
        name,
        subdomain: uniqueSlug,
        slug: uniqueSlug,
        licenseKey: `TEST-${randomUUID().slice(0, 8)}`,
        isActive: true,
      },
    });
    
    return tenantId;
  };

  const runWithTenant = async <T>(
    tenantId: string,
    callback: () => Promise<T>
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      TenantStorage.run(tenantId, async () => {
        try {
          await new Promise(res => setImmediate(res));
          const result = await callback();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  beforeEach(async () => {
    currentTenantId = await createTenant('Test Hospital');
  });

  afterEach(async () => {
    await prismaService.rawClient.department.deleteMany({
      where: { tenantId: currentTenantId },
    });
    await prismaService.rawClient.tenant.deleteMany({
      where: { id: currentTenantId },
    });
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
  });

  describe('CRUD Operations', () => {
    it('should create a department', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({
          name: 'Intensive Care Unit',
          code: 'ICU',
          rules: { gracePeriodMinutes: 10 },
        }, currentTenantId);
      });

      expect(dept).toBeDefined();
      expect(dept.id).toBeDefined();
      expect(dept.name).toBe('Intensive Care Unit');
      expect(dept.code).toBe('ICU');
      expect(dept.tenantId).toBe(currentTenantId);
    });

    it('should create a department with parentId and costCenterCode', async () => {
      const parent = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({
          name: 'Emergency Wing',
          code: 'ER',
        }, currentTenantId);
      });

      const child = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({
          name: 'ICU',
          code: 'ICU',
          parentId: parent.id,
          costCenterCode: 'CC-ICU-4012',
        }, currentTenantId);
      });

      expect(child.parentId).toBe(parent.id);
      expect(child.costCenterCode).toBe('CC-ICU-4012');
    });

    it('should enforce unique department code per tenant', async () => {
      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });

      await expect(runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU Main', code: 'ICU' }, currentTenantId);
      })).rejects.toThrow('Department code already exists');
    });

    it('should allow same code across different tenants', async () => {
      const tenant2Id = await createTenant('Second Hospital');
      
      const dept1 = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });
      
      const dept2 = await runWithTenant(tenant2Id, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, tenant2Id);
      });
      
      expect(dept1.code).toBe('ICU');
      expect(dept2.code).toBe('ICU');
      expect(dept1.tenantId).toBe(currentTenantId);
      expect(dept2.tenantId).toBe(tenant2Id);

      await prismaService.rawClient.department.deleteMany({ where: { tenantId: tenant2Id } });
      await prismaService.rawClient.tenant.deleteMany({ where: { id: tenant2Id } });
    });

    it('should find all departments for a tenant', async () => {
      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
        await departmentService.create({ name: 'OPD', code: 'OPD' }, currentTenantId);
        await departmentService.create({ name: 'Radiology', code: 'RAD' }, currentTenantId);
      });

      const departments = await runWithTenant(currentTenantId, async () => {
        return departmentService.findAll(currentTenantId);
      });
      
      expect(departments).toHaveLength(3);
      expect(departments.map(d => d.code)).toEqual(expect.arrayContaining(['ICU', 'OPD', 'RAD']));
    });

    it('should find one department by id', async () => {
      const created = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });

      const found = await runWithTenant(currentTenantId, async () => {
        return departmentService.findOne(created.id, currentTenantId);
      });
      
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('ICU');
    });

    it('should throw NotFoundException when department not found', async () => {
      const fakeId = randomUUID();
      
      await expect(runWithTenant(currentTenantId, async () => {
        return departmentService.findOne(fakeId, currentTenantId);
      })).rejects.toThrow('Department not found');
    });

    it('should update a department', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });
      
      const updated = await runWithTenant(currentTenantId, async () => {
        return departmentService.update(dept.id, {
          name: 'Intensive Care Unit',
          costCenterCode: 'CC-ICU-NEW',
        }, currentTenantId);
      });

      expect(updated.name).toBe('Intensive Care Unit');
      expect(updated.costCenterCode).toBe('CC-ICU-NEW');
    });

    it('should prevent updating code to an existing one', async () => {
      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
        const opd = await departmentService.create({ name: 'OPD', code: 'OPD' }, currentTenantId);

        await expect(departmentService.update(opd.id, { code: 'ICU' }, currentTenantId)).rejects.toThrow('Department code already exists');
      });
    });

    it('should delete a department', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });
      
      await runWithTenant(currentTenantId, async () => {
        await departmentService.delete(dept.id, currentTenantId);
      });
      
      await expect(runWithTenant(currentTenantId, async () => {
        return departmentService.findOne(dept.id, currentTenantId);
      })).rejects.toThrow('Department not found');
    });

    it('should prevent deleting a department with children', async () => {
      const parent = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'Emergency', code: 'ER' }, currentTenantId);
      });
      
      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'ICU', code: 'ICU', parentId: parent.id }, currentTenantId);
      });

      await expect(runWithTenant(currentTenantId, async () => {
        return departmentService.delete(parent.id, currentTenantId);
      })).rejects.toThrow('Cannot delete department with child departments');
    });
  });

  describe('HierarchyRegistry', () => {
    it('should build department tree hierarchy', async () => {
      await runWithTenant(currentTenantId, async () => {
        const medical = await departmentService.create({ name: 'Medical Services', code: 'MED' }, currentTenantId);
        const emergency = await departmentService.create({ name: 'Emergency Wing', code: 'ER', parentId: medical.id }, currentTenantId);
        await departmentService.create({ name: 'ICU', code: 'ICU', parentId: emergency.id }, currentTenantId);
        await departmentService.create({ name: 'OPD', code: 'OPD', parentId: emergency.id }, currentTenantId);
      });

      const tree = await runWithTenant(currentTenantId, async () => {
        return hierarchyRegistry.getHierarchy(currentTenantId);
      });
      
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe('Medical Services');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe('Emergency Wing');
      expect(tree[0].children[0].children).toHaveLength(2);
    });

    it('should get children of a department', async () => {
      const parent = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'Emergency', code: 'ER' }, currentTenantId);
      });
      
      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'ICU', code: 'ICU', parentId: parent.id }, currentTenantId);
        await departmentService.create({ name: 'OPD', code: 'OPD', parentId: parent.id }, currentTenantId);
      });

      const children = await runWithTenant(currentTenantId, async () => {
        return hierarchyRegistry.getChildren(parent.id, currentTenantId);
      });
      
      expect(children).toHaveLength(2);
      expect(children.map(c => c.name)).toEqual(expect.arrayContaining(['ICU', 'OPD']));
    });

    it('should get root departments (no parent)', async () => {
      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'Medical Services', code: 'MED' }, currentTenantId);
        await departmentService.create({ name: 'Administration', code: 'ADMIN' }, currentTenantId);
      });

      const roots = await runWithTenant(currentTenantId, async () => {
        return hierarchyRegistry.getRootDepartments(currentTenantId);
      });
      
      expect(roots).toHaveLength(2);
      expect(roots.map(r => r.name)).toEqual(expect.arrayContaining(['Medical Services', 'Administration']));
    });
  });

  describe('CostCenterMapper', () => {
    it('should get cost center code for a department', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({
          name: 'ICU',
          code: 'ICU',
          costCenterCode: 'CC-ICU-4012',
        }, currentTenantId);
      });

      const costCenter = await runWithTenant(currentTenantId, async () => {
        return costCenterMapper.getCostCenterCode(dept.id, currentTenantId);
      });
      
      expect(costCenter).toBe('CC-ICU-4012');
    });

    it('should return null when no cost center code set', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });

      const costCenter = await runWithTenant(currentTenantId, async () => {
        return costCenterMapper.getCostCenterCode(dept.id, currentTenantId);
      });
      
      expect(costCenter).toBeNull();
    });

    it('should update cost center code', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });
      
      const updated = await runWithTenant(currentTenantId, async () => {
        return costCenterMapper.updateCostCenterCode(dept.id, 'CC-ICU-UPDATED', currentTenantId);
      });
      
      expect(updated.costCenterCode).toBe('CC-ICU-UPDATED');
    });

    it('should get all cost centers for a tenant', async () => {
      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'ICU', code: 'ICU', costCenterCode: 'CC-ICU' }, currentTenantId);
        await departmentService.create({ name: 'OPD', code: 'OPD', costCenterCode: 'CC-OPD' }, currentTenantId);
        await departmentService.create({ name: 'Radiology', code: 'RAD' }, currentTenantId);
      });

      const allCenters = await runWithTenant(currentTenantId, async () => {
        return costCenterMapper.getAllCostCenters(currentTenantId);
      });
      
      expect(allCenters).toHaveLength(3);
      expect(allCenters.find(c => c.code === 'ICU')?.costCenterCode).toBe('CC-ICU');
      expect(allCenters.find(c => c.code === 'OPD')?.costCenterCode).toBe('CC-OPD');
      expect(allCenters.find(c => c.code === 'RAD')?.costCenterCode).toBeNull();
    });
  });

  describe('Tenant Isolation', () => {
    it('should prevent cross-tenant access to departments', async () => {
      const tenant2Id = await createTenant('Second Hospital');

      const dept1 = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({ name: 'ICU', code: 'ICU' }, currentTenantId);
      });

      await expect(runWithTenant(tenant2Id, async () => {
        return departmentService.findOne(dept1.id, tenant2Id);
      })).rejects.toThrow('Department not found');

      await prismaService.rawClient.department.deleteMany({ where: { tenantId: tenant2Id } });
      await prismaService.rawClient.tenant.deleteMany({ where: { id: tenant2Id } });
    });

    it('should only return departments for the current tenant', async () => {
      const tenant2Id = await createTenant('Second Hospital');

      await runWithTenant(currentTenantId, async () => {
        await departmentService.create({ name: 'Tenant1 ICU', code: 'ICU' }, currentTenantId);
      });
      
      await runWithTenant(tenant2Id, async () => {
        await departmentService.create({ name: 'Tenant2 ICU', code: 'ICU' }, tenant2Id);
      });

      const departments = await runWithTenant(currentTenantId, async () => {
        return departmentService.findAll(currentTenantId);
      });
      
      expect(departments).toHaveLength(1);
      expect(departments[0].name).toBe('Tenant1 ICU');

      await prismaService.rawClient.department.deleteMany({ where: { tenantId: tenant2Id } });
      await prismaService.rawClient.tenant.deleteMany({ where: { id: tenant2Id } });
    });
  });

  describe('Department Rules', () => {
    it('should store department-specific rules as JSON', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({
          name: 'ICU',
          code: 'ICU',
          rules: {
            gracePeriodMinutes: 15,
            autoDeductBreakMinutes: 30,
            overtimeMultiplier: 1.5,
          },
        }, currentTenantId);
      });

      expect(dept.rules).toEqual({
        gracePeriodMinutes: 15,
        autoDeductBreakMinutes: 30,
        overtimeMultiplier: 1.5,
      });
    });

    it('should default rules to empty object when not provided', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({
          name: 'ICU',
          code: 'ICU',
        }, currentTenantId);
      });

      expect(dept.rules).toEqual({});
    });

    it('should update department rules', async () => {
      const dept = await runWithTenant(currentTenantId, async () => {
        return departmentService.create({
          name: 'ICU',
          code: 'ICU',
          rules: { oldRule: 'value' },
        }, currentTenantId);
      });

      const updated = await runWithTenant(currentTenantId, async () => {
        return departmentService.update(dept.id, {
          rules: { newRule: 'updated' },
        }, currentTenantId);
      });

      expect(updated.rules).toEqual({ newRule: 'updated' });
    });
  });
});