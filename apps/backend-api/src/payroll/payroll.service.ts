import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmployeeService } from '../employee/employee.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';

interface SalaryRules {
  overtimeMultiplier: number;
  holidayMultiplier?: number;
}

interface HolidayCalendar {
  observedHolidays: { name: string; date: string }[];
}

interface DepartmentRules {
  nightPremiumRate?: number;
}

export interface CreatePeriodDTO {
  name: string;
  startDate: string;
  endDate: string;
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly db: DatabaseService,
    private readonly employeeService: EmployeeService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  async createPeriod(tenantId: string, dto: CreatePeriodDTO) {
    const existing = await this.db.payrollPeriod.findFirst({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(`A payroll period named "${dto.name}" already exists.`);
    }

    return this.db.payrollPeriod.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'OPEN',
      },
    });
  }

  async getPeriods(tenantId: string) {
    return this.db.payrollPeriod.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async runPayroll(tenantId: string, periodId: string) {
    const period = await this.db.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) {
      throw new NotFoundException(`Payroll period ${periodId} not found.`);
    }

    if (period.status === 'FINALIZED') {
      throw new BadRequestException(`Period "${period.name}" is already FINALIZED.`);
    }

    await this.db.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PROCESSING' },
    });

    const settings = await this.db.systemSetting.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      throw new NotFoundException('SystemSetting not found for tenant.');
    }

    const salaryRules = settings.salaryRules as unknown as SalaryRules;
    const holidayCalendar = settings.holidayCalendar as unknown as HolidayCalendar;
    const observedHolidayDates = new Set((holidayCalendar?.observedHolidays || []).map((holiday) => holiday.date));
    const overtimeMultiplier = salaryRules.overtimeMultiplier ?? 1.5;
    const holidayMultiplier = salaryRules.holidayMultiplier ?? 2.0;
    const reconciliationRecords = await this.reconciliationService.getPayrollReadyRecords(tenantId, period.startDate, period.endDate);
    const recordsByEmployee = new Map<string, typeof reconciliationRecords>();

    for (const record of reconciliationRecords) {
      const employeeId = record.rosterAssignment.userId;
      const records = recordsByEmployee.get(employeeId) ?? [];
      records.push(record);
      recordsByEmployee.set(employeeId, records);
    }

    const payslips: object[] = [];

    for (const [employeeId, records] of recordsByEmployee) {
      const employee = await this.employeeService.getPayrollProfile(tenantId, employeeId);
      let regularHours = 0;
      let overtimeHours = 0;
      let nightHours = 0;
      let holidayHours = 0;

      for (const record of records) {
        const shiftDate = record.rosterAssignment.date.toISOString().split('T')[0];
        const isHoliday = observedHolidayDates.has(shiftDate);
        const baseHours = Number(record.calculatedBaseHours);
        const overtime = Number(record.calculatedOvertime);
        const night = Number(record.calculatedNightShift);

        regularHours += baseHours;
        overtimeHours += overtime;
        nightHours += night;

        if (isHoliday) {
          holidayHours += baseHours + overtime + night;
        }
      }

      const lastAssignment = records[records.length - 1].rosterAssignment;
      const hourlyRate = lastAssignment.overriddenHourlyRate === null
        ? employee.hourlyRate
        : Number(lastAssignment.overriddenHourlyRate);
      const departmentRules = lastAssignment.department?.rules as DepartmentRules | null;
      const nightPremiumRate = departmentRules?.nightPremiumRate ?? 0;
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
      const nightPay = nightHours * hourlyRate * (1 + nightPremiumRate);
      const holidayPay = holidayHours * hourlyRate * holidayMultiplier;
      const totalGross = regularPay + overtimePay + nightPay + holidayPay;

      await this.db.payslip.deleteMany({
        where: { tenantId, periodId, employeeId },
      });

      const payslip = await this.db.payslip.create({
        data: {
          tenantId,
          periodId,
          employeeId,
          hourlyRate,
          regularHoursWorked: regularHours,
          overtimeHoursWorked: overtimeHours,
          nightHoursWorked: nightHours,
          baseSalary: regularPay,
          overtimePay,
          allowances: 0,
          totalGross,
          totalDeductions: 0,
          netPay: totalGross,
          deductionsBreakdown: {},
          allowancesBreakdown: {},
          status: 'UNPAID',
        },
      });

      payslips.push({
        employeeName: `${employee.firstName} ${employee.lastName}`,
        payrollNumber: employee.payrollNumber,
        hourlyRate,
        regularHours,
        overtimeHours,
        nightHours,
        holidayHours,
        regularPay,
        overtimePay,
        nightPay,
        holidayPay,
        totalGross,
        payslipId: payslip.id,
        status: 'UNPAID',
      });
    }

    await this.db.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'FINALIZED' },
    });

    return {
      message: 'Payroll run completed successfully',
      periodId,
      periodName: period.name,
      totalEmployeesProcessed: payslips.length,
      payslips,
    };
  }

  async getPayslipsByPeriod(periodId: string, tenantId: string) {
    return this.db.payslip.findMany({
      where: { periodId, tenantId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            payrollNumber: true,
            department: { select: { name: true, code: true } },
          },
        },
        period: { select: { name: true, startDate: true, endDate: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getEmployeePayslip(periodId: string, employeeId: string, tenantId: string) {
    await this.employeeService.getPayrollProfile(tenantId, employeeId);
    const payslip = await this.db.payslip.findFirst({
      where: { periodId, employeeId, tenantId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            payrollNumber: true,
            email: true,
            department: { select: { name: true, code: true } },
          },
        },
        period: {
          select: { name: true, startDate: true, endDate: true, status: true },
        },
      },
    });

    if (!payslip) {
      throw new NotFoundException(`No payslip found for employee ${employeeId} in period ${periodId}.`);
    }

    return payslip;
  }

  async approvePayslip(payslipId: string, tenantId: string) {
    const payslip = await this.db.payslip.findFirst({
      where: { id: payslipId, tenantId },
    });

    if (!payslip) throw new NotFoundException(`Payslip ${payslipId} not found.`);

    if (payslip.status === 'PAID') {
      throw new BadRequestException('Payslip is already PAID.');
    }

    return this.db.payslip.update({
      where: { id: payslipId },
      data: { status: 'APPROVED' },
    });
  }

  async markPaid(payslipId: string, tenantId: string) {
    const payslip = await this.db.payslip.findFirst({
      where: { id: payslipId, tenantId },
    });

    if (!payslip) throw new NotFoundException(`Payslip ${payslipId} not found.`);

    if (payslip.status !== 'APPROVED') {
      throw new BadRequestException('Payslip must be APPROVED before marking as PAID.');
    }

    return this.db.payslip.update({
      where: { id: payslipId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async exportPayroll(periodId: string, tenantId: string) {
    const period = await this.db.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) throw new NotFoundException(`Period ${periodId} not found.`);

    const payslips = await this.db.payslip.findMany({
      where: { periodId, tenantId },
      include: {
        employee: {
          select: { firstName: true, lastName: true, payrollNumber: true },
        },
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      periodName: period.name,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      note: 'Deductions computed by external payroll SaaS. This payload is the verified wage ledger only.',
      records: payslips.map((payslip) => ({
        payrollNumber: payslip.employee.payrollNumber,
        employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
        period: period.name,
        periodStart: period.startDate,
        periodEnd: period.endDate,
        hourlyRate: Number(payslip.hourlyRate),
        regularHours: Number(payslip.regularHoursWorked),
        overtimeHours: Number(payslip.overtimeHoursWorked),
        nightHours: Number(payslip.nightHoursWorked),
        regularPay: Number(payslip.baseSalary),
        overtimePay: Number(payslip.overtimePay),
        allowances: Number(payslip.allowances),
        totalGross: Number(payslip.totalGross),
        status: payslip.status,
      })),
    };
  }
}
