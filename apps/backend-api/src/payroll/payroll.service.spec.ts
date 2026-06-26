import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { DatabaseService } from '../database/database.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ── MOCK DATABASE SERVICE ──────────────────────────────────────
const mockDb = {
  payrollPeriod: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  payslip: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  systemSetting: {
    findFirst: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  reconciliationLog: {
    findMany: jest.fn(),
  },
};

// ── TEST DATA ──────────────────────────────────────────────────
const TENANT_ID = '3e6ab661-8fa0-4089-9426-6c119aec01bd';
const PERIOD_ID = '31db692c-6d0f-4690-913c-75e2a17a4a1d';
const EMPLOYEE_ID = '6aa6efa7-9cc5-4974-8d89-4a19d6286531';
const PAYSLIP_ID = 'c68e34fa-3c33-40b2-8350-0d690857af10';

const mockPeriod = {
  id: PERIOD_ID,
  tenantId: TENANT_ID,
  name: 'May 2026 Main Cycle',
  startDate: new Date('2026-05-01'),
  endDate: new Date('2026-05-31'),
  status: 'OPEN',
};

const mockSettings = {
  tenantId: TENANT_ID,
  salaryRules: {
    overtimeMultiplier: 1.5,
    nightShiftDifferential: 0.15,
  },
  attendanceRules: {},
  holidayCalendar: {},
};

const mockEmployee = {
  id: EMPLOYEE_ID,
  firstName: 'David',
  lastName: 'Mwangi',
  hourlyRate: '500',
  payrollNumber: 'STTR-204',
  isActive: true,
  tenantId: TENANT_ID,
};

const mockReconciliationLog = {
  id: 'recon-001',
  tenantId: TENANT_ID,
  isResolved: true,
  calculatedBaseHours: '12',
  calculatedOvertime: '2',
  calculatedNightShift: '0',
  rosterAssignment: {
    userId: EMPLOYEE_ID,
    overriddenHourlyRate: null,
    shiftTemplate: { type: 'MORNING' },
    department: { rules: { nightPremiumRate: 0 } },
  },
};

const mockPayslip = {
  id: PAYSLIP_ID,
  tenantId: TENANT_ID,
  periodId: PERIOD_ID,
  employeeId: EMPLOYEE_ID,
  hourlyRate: '500',
  regularHoursWorked: '12',
  overtimeHoursWorked: '2',
  nightHoursWorked: '0',
  baseSalary: '6000',
  overtimePay: '1500',
  allowances: '0',
  totalGross: '7500',
  totalDeductions: '0',
  netPay: '0',
  deductionsBreakdown: {},
  allowancesBreakdown: {},
  status: 'UNPAID',
};

// ── TEST SUITE ─────────────────────────────────────────────────
describe('PayrollService', () => {
  let service: PayrollService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // ── 1. SERVICE INSTANTIATION ─────────────────────────────────
  describe('Service Setup', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ── 2. CREATE PERIOD ─────────────────────────────────────────
  describe('createPeriod()', () => {
    it('should create a new payroll period with OPEN status', async () => {
      mockDb.payrollPeriod.create.mockResolvedValue(mockPeriod);

      const result = await service.createPeriod(
        TENANT_ID,
        'May 2026 Main Cycle',
        '2026-05-01',
        '2026-05-31',
      );

      expect(mockDb.payrollPeriod.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          name: 'May 2026 Main Cycle',
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-05-31'),
          status: 'OPEN',
        },
      });
      expect(result.status).toBe('OPEN');
      expect(result.name).toBe('May 2026 Main Cycle');
    });
  });

  // ── 3. GET PERIODS ───────────────────────────────────────────
  describe('getPeriods()', () => {
    it('should return all periods for a tenant ordered by date', async () => {
      mockDb.payrollPeriod.findMany.mockResolvedValue([mockPeriod]);

      const result = await service.getPeriods(TENANT_ID);

      expect(mockDb.payrollPeriod.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { startDate: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('May 2026 Main Cycle');
    });

    it('should return empty array when no periods exist', async () => {
      mockDb.payrollPeriod.findMany.mockResolvedValue([]);

      const result = await service.getPeriods(TENANT_ID);

      expect(result).toHaveLength(0);
    });
  });

  // ── 4. RUN PAYROLL ───────────────────────────────────────────
  describe('runPayroll()', () => {
    it('should throw NotFoundException when period does not exist', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(null);

      await expect(
        service.runPayroll(PERIOD_ID, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when period is already FINALIZED', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue({
        ...mockPeriod,
        status: 'FINALIZED',
      });

      await expect(
        service.runPayroll(PERIOD_ID, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when system settings not found', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      mockDb.payrollPeriod.update.mockResolvedValue({
        ...mockPeriod,
        status: 'PROCESSING',
      });
      mockDb.systemSetting.findFirst.mockResolvedValue(null);
      mockDb.user.findMany.mockResolvedValue([]);

      await expect(
        service.runPayroll(PERIOD_ID, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate gross pay correctly from reconciliation logs', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      mockDb.payrollPeriod.update.mockResolvedValue({
        ...mockPeriod,
        status: 'PROCESSING',
      });
      mockDb.systemSetting.findFirst.mockResolvedValue(mockSettings);
      mockDb.user.findMany.mockResolvedValue([mockEmployee]);
      mockDb.reconciliationLog.findMany.mockResolvedValue([
        mockReconciliationLog,
      ]);
      mockDb.payslip.deleteMany.mockResolvedValue({ count: 0 });
      mockDb.payslip.create.mockResolvedValue(mockPayslip);

      const result = await service.runPayroll(PERIOD_ID, TENANT_ID);

      expect(result.message).toBe('Payroll run completed successfully');
      expect(result.totalEmployeesProcessed).toBe(1);
      expect(result.payslips).toHaveLength(1);
    });

    it('should compute baseSalary as regularHours x hourlyRate', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      mockDb.payrollPeriod.update.mockResolvedValue(mockPeriod);
      mockDb.systemSetting.findFirst.mockResolvedValue(mockSettings);
      mockDb.user.findMany.mockResolvedValue([mockEmployee]);
      mockDb.reconciliationLog.findMany.mockResolvedValue([
        mockReconciliationLog,
      ]);
      mockDb.payslip.deleteMany.mockResolvedValue({ count: 0 });
      mockDb.payslip.create.mockResolvedValue(mockPayslip);

      await service.runPayroll(PERIOD_ID, TENANT_ID);

      // 12 base hours x 500/hr = 6000
      // 2 overtime hours x 500 x 1.5 = 1500
      // total gross = 7500
      expect(mockDb.payslip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            baseSalary: 6000,
            overtimePay: 1500,
            totalGross: 7500,
            totalDeductions: 0,
            netPay: 0,
            deductionsBreakdown: {},
          }),
        }),
      );
    });

    it('should use overriddenHourlyRate when set on roster assignment', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      mockDb.payrollPeriod.update.mockResolvedValue(mockPeriod);
      mockDb.systemSetting.findFirst.mockResolvedValue(mockSettings);
      mockDb.user.findMany.mockResolvedValue([mockEmployee]);
      mockDb.reconciliationLog.findMany.mockResolvedValue([
        {
          ...mockReconciliationLog,
          rosterAssignment: {
            ...mockReconciliationLog.rosterAssignment,
            overriddenHourlyRate: '600', // override from 500 to 600
          },
        },
      ]);
      mockDb.payslip.deleteMany.mockResolvedValue({ count: 0 });
      mockDb.payslip.create.mockResolvedValue(mockPayslip);

      await service.runPayroll(PERIOD_ID, TENANT_ID);

      // Should use 600 not 500
      // 12 x 600 = 7200 base, 2 x 600 x 1.5 = 1800 overtime
      expect(mockDb.payslip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hourlyRate: 600,
            baseSalary: 7200,
            overtimePay: 1800,
            totalGross: 9000,
          }),
        }),
      );
    });

    it('should set deductionsBreakdown as empty object', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      mockDb.payrollPeriod.update.mockResolvedValue(mockPeriod);
      mockDb.systemSetting.findFirst.mockResolvedValue(mockSettings);
      mockDb.user.findMany.mockResolvedValue([mockEmployee]);
      mockDb.reconciliationLog.findMany.mockResolvedValue([
        mockReconciliationLog,
      ]);
      mockDb.payslip.deleteMany.mockResolvedValue({ count: 0 });
      mockDb.payslip.create.mockResolvedValue(mockPayslip);

      await service.runPayroll(PERIOD_ID, TENANT_ID);

      expect(mockDb.payslip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deductionsBreakdown: {},
            totalDeductions: 0,
            netPay: 0,
          }),
        }),
      );
    });

    it('should finalize period after successful run', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      mockDb.payrollPeriod.update.mockResolvedValue(mockPeriod);
      mockDb.systemSetting.findFirst.mockResolvedValue(mockSettings);
      mockDb.user.findMany.mockResolvedValue([mockEmployee]);
      mockDb.reconciliationLog.findMany.mockResolvedValue([
        mockReconciliationLog,
      ]);
      mockDb.payslip.deleteMany.mockResolvedValue({ count: 0 });
      mockDb.payslip.create.mockResolvedValue(mockPayslip);

      await service.runPayroll(PERIOD_ID, TENANT_ID);

      expect(mockDb.payrollPeriod.update).toHaveBeenLastCalledWith({
        where: { id: PERIOD_ID },
        data: { status: 'FINALIZED' },
      });
    });

    it('should handle employee with no reconciliation logs (zero hours)', async () => {
      mockDb.payrollPeriod.findFirst.mockResolvedValue(mockPeriod);
      mockDb.payrollPeriod.update.mockResolvedValue(mockPeriod);
      mockDb.systemSetting.findFirst.mockResolvedValue(mockSettings);
      mockDb.user.findMany.mockResolvedValue([mockEmployee]);
      mockDb.reconciliationLog.findMany.mockResolvedValue([]); // no logs
      mockDb.payslip.deleteMany.mockResolvedValue({ count: 0 });
      mockDb.payslip.create.mockResolvedValue({
        ...mockPayslip,
        baseSalary: '0',
        totalGross: '0',
      });

      await service.runPayroll(PERIOD_ID, TENANT_ID);

      expect(mockDb.payslip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            baseSalary: 0,
            totalGross: 0,
          }),
        }),
      );
    });
  });

  // ── 5. GET PAYSLIPS BY PERIOD ────────────────────────────────
  describe('getPayslipsByPeriod()', () => {
    it('should return all payslips for a period', async () => {
      mockDb.payslip.findMany.mockResolvedValue([mockPayslip]);

      const result = await service.getPayslipsByPeriod(PERIOD_ID, TENANT_ID);

      expect(mockDb.payslip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { periodId: PERIOD_ID, tenantId: TENANT_ID },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  // ── 6. GET EMPLOYEE PAYSLIP ──────────────────────────────────
  describe('getEmployeePayslip()', () => {
    it('should return a specific employee payslip', async () => {
      mockDb.payslip.findFirst.mockResolvedValue(mockPayslip);

      const result = await service.getEmployeePayslip(
        EMPLOYEE_ID,
        PERIOD_ID,
        TENANT_ID,
      );

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(EMPLOYEE_ID);
    });

    it('should throw NotFoundException when payslip does not exist', async () => {
      mockDb.payslip.findFirst.mockResolvedValue(null);

      await expect(
        service.getEmployeePayslip(EMPLOYEE_ID, PERIOD_ID, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── 7. APPROVE PAYSLIP ───────────────────────────────────────
  describe('approvePayslip()', () => {
    it('should change payslip status to APPROVED', async () => {
      mockDb.payslip.findFirst.mockResolvedValue(mockPayslip);
      mockDb.payslip.update.mockResolvedValue({
        ...mockPayslip,
        status: 'APPROVED',
      });

      const result = await service.approvePayslip(PAYSLIP_ID, TENANT_ID);

      expect(mockDb.payslip.update).toHaveBeenCalledWith({
        where: { id: PAYSLIP_ID },
        data: { status: 'APPROVED' },
      });
      expect(result.status).toBe('APPROVED');
    });

    it('should throw NotFoundException when payslip does not exist', async () => {
      mockDb.payslip.findFirst.mockResolvedValue(null);

      await expect(
        service.approvePayslip(PAYSLIP_ID, TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payslip is already PAID', async () => {
      mockDb.payslip.findFirst.mockResolvedValue({
        ...mockPayslip,
        status: 'PAID',
      });

      await expect(
        service.approvePayslip(PAYSLIP_ID, TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── 8. EXPORT PAYROLL ────────────────────────────────────────
  describe('exportPayroll()', () => {
    it('should return clean export payload for external SaaS', async () => {
      mockDb.payslip.findMany.mockResolvedValue([
        {
          ...mockPayslip,
          employee: {
            firstName: 'David',
            lastName: 'Mwangi',
            payrollNumber: 'STTR-204',
          },
          period: {
            name: 'May 2026 Main Cycle',
            startDate: new Date('2026-05-01'),
            endDate: new Date('2026-05-31'),
          },
        },
      ]);

      const result = await service.exportPayroll(PERIOD_ID, TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].payrollNumber).toBe('STTR-204');
      expect(result[0].employeeName).toBe('David Mwangi');
      expect(result[0].totalGross).toBeDefined();
    });

    it('should return empty array when no payslips exist', async () => {
      mockDb.payslip.findMany.mockResolvedValue([]);

      const result = await service.exportPayroll(PERIOD_ID, TENANT_ID);

      expect(result).toHaveLength(0);
    });

    it('should not include deductions in export payload', async () => {
      mockDb.payslip.findMany.mockResolvedValue([
        {
          ...mockPayslip,
          employee: {
            firstName: 'David',
            lastName: 'Mwangi',
            payrollNumber: 'STTR-204',
          },
          period: {
            name: 'May 2026 Main Cycle',
            startDate: new Date('2026-05-01'),
            endDate: new Date('2026-05-31'),
          },
        },
      ]);

      const result = await service.exportPayroll(PERIOD_ID, TENANT_ID);

      expect(result[0].totalDeductions).toBe('0');
      expect(result[0].netPay).toBe('0');
    });
  });
});
