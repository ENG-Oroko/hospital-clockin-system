import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { DatabaseService } from '../database/database.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const TENANT_ID = '3e6ab661-8fa0-4089-9426-6c119aec01bd';
const EMPLOYEE_DAVID_ID = '6aa6efa7-9cc5-4974-8d89-4a19d6286531';
const EMPLOYEE_MERCY_ID = '4c9b47f8-8ae7-433b-a13e-ae75bae3e4de';
const EMPLOYEE_JOSEPH_ID = '3b73f480-a8e3-49be-970d-0a8ca72df008';

// Valid UUID format for non-existent records
const FAKE_UUID = '00000000-0000-0000-0000-000000000000';
const FAKE_TENANT_UUID = '00000000-0000-0000-0000-000000000001';

describe('PayrollService — Integration Tests (Real Database)', () => {
  let service: PayrollService;
  let db: DatabaseService;
  let createdPeriodId: string;
  let createdPayslipId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollService, DatabaseService],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    db = module.get<DatabaseService>(DatabaseService);
    await db.$connect();
  });

  afterAll(async () => {
    if (createdPeriodId) {
      await db.payslip.deleteMany({ where: { periodId: createdPeriodId } });
      await db.payrollPeriod.delete({ where: { id: createdPeriodId } });
    }
    await db.$disconnect();
  });

  // ── 1. VERIFY SEEDED DATA EXISTS ──────────────────────────────
  describe('Seeded Data Verification', () => {
    it('should find the seeded tenant in the database', async () => {
      const tenant = await db.tenant.findFirst({
        where: { id: TENANT_ID },
      });
      expect(tenant).not.toBeNull();
      expect(tenant?.name).toBeDefined();
    });

    it('should find 3 active employees in the database', async () => {
      const employees = await db.user.findMany({
        where: { tenantId: TENANT_ID, isActive: true },
      });
      expect(employees.length).toBeGreaterThanOrEqual(3);
    });

    it('should find David Mwangi in the database', async () => {
      const david = await db.user.findFirst({
        where: { id: EMPLOYEE_DAVID_ID },
      });
      expect(david).not.toBeNull();
      expect(david?.firstName).toBe('David');
      expect(david?.lastName).toBe('Mwangi');
    });

    it('should find system settings with salary rules', async () => {
      const settings = await db.systemSetting.findFirst({
        where: { tenantId: TENANT_ID },
      });
      expect(settings).not.toBeNull();
      const rules = settings?.salaryRules as any;
      expect(rules.overtimeMultiplier).toBe(1.5);
    });

    it('should find at least one resolved reconciliation log', async () => {
      const logs = await db.reconciliationLog.findMany({
        where: { tenantId: TENANT_ID, isResolved: true },
      });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 2. CREATE PERIOD ──────────────────────────────────────────
  describe('createPeriod() — Real Database', () => {
    it('should create a real payroll period in the database', async () => {
      const period = await service.createPeriod(
        TENANT_ID,
        'Integration Test Period June 2026',
        '2026-06-01',
        '2026-06-30',
      );

      expect(period.id).toBeDefined();
      expect(period.status).toBe('OPEN');
      expect(period.name).toBe('Integration Test Period June 2026');
      createdPeriodId = period.id;
    });

    it('should persist the period and be retrievable', async () => {
      const periods = await service.getPeriods(TENANT_ID);
      const found = periods.find(p => p.id === createdPeriodId);
      expect(found).toBeDefined();
      expect(found?.status).toBe('OPEN');
    });
  });

  // ── 3. RUN PAYROLL ────────────────────────────────────────────
  describe('runPayroll() — Real Database', () => {
    it('should run payroll and process all active employees', async () => {
      const result = await service.runPayroll(createdPeriodId, TENANT_ID);

      expect(result.message).toBe('Payroll run completed successfully');
      expect(result.totalEmployeesProcessed).toBeGreaterThanOrEqual(3);
      expect(result.payslips).toHaveLength(result.totalEmployeesProcessed);
    });

    it('should save payslips to the real database', async () => {
      const payslips = await service.getPayslipsByPeriod(
        createdPeriodId,
        TENANT_ID,
      );
      expect(payslips.length).toBeGreaterThanOrEqual(3);
    });

    it('should finalize the period after run', async () => {
      const period = await db.payrollPeriod.findFirst({
        where: { id: createdPeriodId },
      });
      expect(period?.status).toBe('FINALIZED');
    });

    it('should throw BadRequestException when run again on finalized period', async () => {
      await expect(
        service.runPayroll(createdPeriodId, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should produce payslip for David Mwangi with empty deductions', async () => {
      const payslips = await service.getPayslipsByPeriod(
        createdPeriodId,
        TENANT_ID,
      );

      const davidPayslip = payslips.find(
        p => p.employeeId === EMPLOYEE_DAVID_ID,
      );

      expect(davidPayslip).toBeDefined();
      // Deductions always empty — integration-first approach
      expect(davidPayslip?.deductionsBreakdown).toEqual({});
      expect(Number(davidPayslip?.totalDeductions)).toBe(0);
      expect(Number(davidPayslip?.netPay)).toBe(0);
    });

    it('should produce zero gross for employees with no attendance in this period', async () => {
      const payslips = await service.getPayslipsByPeriod(
        createdPeriodId,
        TENANT_ID,
      );

      // Mercy has no reconciliation logs in seed data
      const mercyPayslip = payslips.find(
        p => p.employeeId === EMPLOYEE_MERCY_ID,
      );

      expect(mercyPayslip).toBeDefined();
      expect(Number(mercyPayslip?.totalGross)).toBe(0);
      expect(Number(mercyPayslip?.baseSalary)).toBe(0);
    });
  });

  // ── 4. GET PAYSLIPS ───────────────────────────────────────────
  describe('getPayslipsByPeriod() — Real Database', () => {
    it('should return payslips with employee names and departments', async () => {
      const payslips = await service.getPayslipsByPeriod(
        createdPeriodId,
        TENANT_ID,
      );

      expect(payslips[0].employee).toBeDefined();
      expect(payslips[0].employee.firstName).toBeDefined();
      expect(payslips[0].employee.department).toBeDefined();
    });
  });

  // ── 5. GET SINGLE PAYSLIP ─────────────────────────────────────
  describe('getEmployeePayslip() — Real Database', () => {
    it('should return David Mwangi payslip with period details', async () => {
      const payslip = await service.getEmployeePayslip(
        EMPLOYEE_DAVID_ID,
        createdPeriodId,
        TENANT_ID,
      );

      expect(payslip).not.toBeNull();
      expect(payslip.employeeId).toBe(EMPLOYEE_DAVID_ID);
      expect(payslip.period).toBeDefined();
      expect(payslip.period.name).toBe('Integration Test Period June 2026');
    });

    it('should throw NotFoundException for non-existent payslip', async () => {
      await expect(
        service.getEmployeePayslip(
          FAKE_UUID,
          createdPeriodId,
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── 6. APPROVE PAYSLIP ────────────────────────────────────────
  describe('approvePayslip() — Real Database', () => {
    it('should approve David Mwangi payslip and persist to database', async () => {
      const payslip = await service.getEmployeePayslip(
        EMPLOYEE_DAVID_ID,
        createdPeriodId,
        TENANT_ID,
      );

      createdPayslipId = payslip.id;
      const approved = await service.approvePayslip(payslip.id, TENANT_ID);

      expect(approved.status).toBe('APPROVED');

      const fromDb = await db.payslip.findFirst({
        where: { id: payslip.id },
      });
      expect(fromDb?.status).toBe('APPROVED');
    });

    it('should throw BadRequestException when approving already PAID payslip', async () => {
      await db.payslip.update({
        where: { id: createdPayslipId },
        data: { status: 'PAID' },
      });

      await expect(
        service.approvePayslip(createdPayslipId, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── 7. EXPORT PAYROLL ─────────────────────────────────────────
  describe('exportPayroll() — Real Database', () => {
    it('should return export payload with correct structure', async () => {
      const exported = await service.exportPayroll(createdPeriodId, TENANT_ID);

      expect(exported.length).toBeGreaterThanOrEqual(3);
      expect(exported[0].payrollNumber).toBeDefined();
      expect(exported[0].employeeName).toBeDefined();
      expect(exported[0].totalGross).toBeDefined();
      expect(exported[0].periodStart).toBeDefined();
      expect(exported[0].periodEnd).toBeDefined();
    });

    it('should confirm deductions are empty in export', async () => {
      const exported = await service.exportPayroll(createdPeriodId, TENANT_ID);

      exported.forEach(payslip => {
        expect(Number(payslip.totalDeductions)).toBe(0);
        expect(Number(payslip.netPay)).toBe(0);
      });
    });

    it('should include all 3 employees in export', async () => {
      const exported = await service.exportPayroll(createdPeriodId, TENANT_ID);
      const payrollNumbers = exported.map(p => p.payrollNumber);

      expect(payrollNumbers).toContain('STTR-204');
      expect(payrollNumbers).toContain('STTR-101');
      expect(payrollNumbers).toContain('STTR-001');
    });
  });

  // ── 8. TENANT ISOLATION ───────────────────────────────────────
  describe('Tenant Isolation', () => {
    it('should return empty periods for non-existent tenant', async () => {
      const periods = await service.getPeriods(FAKE_TENANT_UUID);
      expect(periods).toHaveLength(0);
    });

    it('should throw NotFoundException when running payroll for wrong tenant', async () => {
      await expect(
        service.runPayroll(createdPeriodId, FAKE_TENANT_UUID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
