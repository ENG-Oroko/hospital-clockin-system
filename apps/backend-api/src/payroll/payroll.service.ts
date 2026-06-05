import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface RunPayrollDTO {
  tenantId: string;
}

export interface ApprovePayslipDTO {
  tenantId: string;
}

@Injectable()
export class PayrollService {
  constructor(private readonly db: DatabaseService) {}

  async createPeriod(dto: CreatePeriodDTO) {
    const existing = await this.db.payrollPeriod.findFirst({
      where: { tenantId: dto.tenantId, name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(
        `A payroll period named "${dto.name}" already exists.`,
      );
    }
    return this.db.payrollPeriod.create({
      data: {
        tenantId:  dto.tenantId,
        name:      dto.name,
        startDate: new Date(dto.startDate),
        endDate:   new Date(dto.endDate),
        status:    'OPEN',
      },
    });
  }

  async getPeriods(tenantId: string) {
    return this.db.payrollPeriod.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async runPayroll(periodId: string, dto: RunPayrollDTO) {
    const period = await this.db.payrollPeriod.findFirst({
      where: { id: periodId, tenantId: dto.tenantId },
    });
    if (!period) {
      throw new NotFoundException(`Payroll period ${periodId} not found.`);
    }
    if (period.status === 'FINALIZED') {
      throw new BadRequestException(
        `Period "${period.name}" is already FINALIZED.`,
      );
    }

    await this.db.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PROCESSING' },
    });

    const settings = await this.db.systemSetting.findUnique({
      where: { tenantId: dto.tenantId },
    });
    if (!settings) {
      throw new NotFoundException(`SystemSetting not found for tenant.`);
    }

    const salaryRules      = settings.salaryRules as unknown as SalaryRules;
    const holidayCalendar  = settings.holidayCalendar as unknown as HolidayCalendar;
    const observedHolidayDates = new Set(
      (holidayCalendar?.observedHolidays || []).map((h) => h.date),
    );

    const overtimeMultiplier = salaryRules.overtimeMultiplier ?? 1.5;
    const holidayMultiplier  = salaryRules.holidayMultiplier  ?? 2.0;

    const employees = await this.db.user.findMany({
      where: { tenantId: dto.tenantId, isActive: true },
    });

    const payslips: object[] = [];

    for (const employee of employees) {
      const reconLogs = await this.db.reconciliationLog.findMany({
        where: {
          tenantId: dto.tenantId,
          isResolved: true,
          rosterAssignment: {
            userId: employee.id,
            date: { gte: period.startDate, lte: period.endDate },
          },
        },
        include: {
          rosterAssignment: {
            include: { department: true, shiftTemplate: true },
          },
        },
      });

      // ── Accumulate hours ──────────────────────────────────────────
      let regularHours  = 0;
      let overtimeHours = 0;
      let nightHours    = 0;
      let holidayHours  = 0;

      for (const log of reconLogs) {
        const shiftDate = log.rosterAssignment.date.toISOString().split('T')[0];
        const isHoliday = observedHolidayDates.has(shiftDate);

        regularHours  += Number(log.calculatedBaseHours);
        overtimeHours += Number(log.calculatedOvertime);
        nightHours    += Number(log.calculatedNightShift);

        if (isHoliday) {
          holidayHours +=
            Number(log.calculatedBaseHours) +
            Number(log.calculatedOvertime) +
            Number(log.calculatedNightShift);
        }
      }

      // ── Resolve hourly rate ───────────────────────────────────────
      let hourlyRate = Number(employee.hourlyRate);
      if (reconLogs.length > 0) {
        const last = reconLogs[reconLogs.length - 1].rosterAssignment;
        if (last.overriddenHourlyRate !== null) {
          hourlyRate = Number(last.overriddenHourlyRate);
        }
      }

      // ── Resolve night premium from department rules ───────────────
      let nightPremiumRate = 0;
      if (reconLogs.length > 0) {
        const dept     = reconLogs[reconLogs.length - 1].rosterAssignment.department;
        const rules    = dept.rules as unknown as DepartmentRules;
        nightPremiumRate = rules?.nightPremiumRate ?? 0;
      }

      // ── Compute wage components (hours × rates only) ──────────────
      const regularPay  = regularHours  * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
      const nightPay    = nightHours    * hourlyRate * (1 + nightPremiumRate);
      const holidayPay  = holidayHours  * hourlyRate * holidayMultiplier;
      const totalGross  = regularPay + overtimePay + nightPay + holidayPay;

      // ── Delete any existing draft for idempotency ─────────────────
      await this.db.payslip.deleteMany({
        where: { tenantId: dto.tenantId, periodId, employeeId: employee.id },
      });

      // ── Save ledger record ────────────────────────────────────────
      const payslip = await this.db.payslip.create({
        data: {
          tenantId:            dto.tenantId,
          periodId,
          employeeId:          employee.id,
          hourlyRate,
          regularHoursWorked:  regularHours,
          overtimeHoursWorked: overtimeHours,
          nightHoursWorked:    nightHours,
          baseSalary:          regularPay,
          overtimePay,
          allowances:          0,
          totalGross,
          totalDeductions:     0,
          netPay:              totalGross,
          deductionsBreakdown: {},
          allowancesBreakdown: {},
          status:              'UNPAID',
        },
      });

      payslips.push({
        employeeName:  `${employee.firstName} ${employee.lastName}`,
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
        status:    'UNPAID',
      });
    }

    await this.db.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'FINALIZED' },
    });

    return {
      message:                 'Payroll run completed successfully',
      periodId,
      periodName:              period.name,
      totalEmployeesProcessed: employees.length,
      payslips,
    };
  }

  async getPayslipsByPeriod(periodId: string, tenantId: string) {
    return this.db.payslip.findMany({
      where: { periodId, tenantId },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true, payrollNumber: true,
            department: { select: { name: true, code: true } },
          },
        },
        period: { select: { name: true, startDate: true, endDate: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getEmployeePayslip(periodId: string, employeeId: string, tenantId: string) {
    const payslip = await this.db.payslip.findFirst({
      where: { periodId, employeeId, tenantId },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true, payrollNumber: true, email: true,
            department: { select: { name: true, code: true } },
          },
        },
        period: {
          select: { name: true, startDate: true, endDate: true, status: true },
        },
      },
    });
    if (!payslip) {
      throw new NotFoundException(
        `No payslip found for employee ${employeeId} in period ${periodId}.`,
      );
    }
    return payslip;
  }

  async approvePayslip(payslipId: string, dto: ApprovePayslipDTO) {
    const payslip = await this.db.payslip.findFirst({
      where: { id: payslipId, tenantId: dto.tenantId },
    });
    if (!payslip) throw new NotFoundException(`Payslip ${payslipId} not found.`);
    if (payslip.status === 'PAID') {
      throw new BadRequestException(`Payslip is already PAID.`);
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
      throw new BadRequestException(
        `Payslip must be APPROVED before marking as PAID.`,
      );
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
      exportedAt:  new Date().toISOString(),
      periodName:  period.name,
      periodStart: period.startDate,
      periodEnd:   period.endDate,
      note:        'Deductions computed by external payroll SaaS. This payload is the verified wage ledger only.',
      records: payslips.map((p) => ({
        payrollNumber:  p.employee.payrollNumber,
        employeeName:   `${p.employee.firstName} ${p.employee.lastName}`,
        period:         period.name,
        periodStart:    period.startDate,
        periodEnd:      period.endDate,
        hourlyRate:     Number(p.hourlyRate),
        regularHours:   Number(p.regularHoursWorked),
        overtimeHours:  Number(p.overtimeHoursWorked),
        nightHours:     Number(p.nightHoursWorked),
        regularPay:     Number(p.baseSalary),
        overtimePay:    Number(p.overtimePay),
        allowances:     Number(p.allowances),
        totalGross:     Number(p.totalGross),
        status:         p.status,
      })),
    };
  }
}
