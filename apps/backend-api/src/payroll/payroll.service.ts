import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PayrollService {
  constructor(private readonly db: DatabaseService) {}

  async createPeriod(tenantId: string, name: string, startDate: string, endDate: string) {
    return this.db.payrollPeriod.create({
      data: {
        tenantId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'OPEN',
      },
    });
  }

  async getPeriods(tenantId: string) {
    return this.db.payrollPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async runPayroll(periodId: string, tenantId: string) {
    const period = await this.db.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });

    if (!period) throw new NotFoundException('Payroll period not found');
    if (period.status === 'FINALIZED')
      throw new BadRequestException('This payroll period is already finalized');

    await this.db.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PROCESSING' },
    });

    const settings = await this.db.systemSetting.findFirst({
      where: { tenantId },
    });

    if (!settings) throw new NotFoundException('System settings not found');

    const salaryRules = settings.salaryRules as {
      overtimeMultiplier: number;
      nightShiftDifferential: number;
    };

    const employees = await this.db.user.findMany({
      where: { tenantId, isActive: true },
    });

    const payslips = [];

    for (const employee of employees) {
      const reconciliationLogs = await this.db.reconciliationLog.findMany({
        where: {
          tenantId,
          isResolved: true,
          rosterAssignment: {
            userId: employee.id,
            date: {
              gte: period.startDate,
              lte: period.endDate,
            },
          },
        },
        include: {
          rosterAssignment: {
            include: {
              shiftTemplate: true,
              department: true,
            },
          },
        },
      });

      let totalBaseHours = 0;
      let totalOvertimeHours = 0;
      let totalNightHours = 0;

      for (const log of reconciliationLogs) {
        totalBaseHours += Number(log.calculatedBaseHours);
        totalOvertimeHours += Number(log.calculatedOvertime);
        totalNightHours += Number(log.calculatedNightShift);
      }

      const lastAssignment = reconciliationLogs[0]?.rosterAssignment;
      const hourlyRate = lastAssignment?.overriddenHourlyRate
        ? Number(lastAssignment.overriddenHourlyRate)
        : Number(employee.hourlyRate);

      const deptRules = lastAssignment?.department?.rules as
        | { nightPremiumRate?: number }
        | null;
      const nightPremiumRate = deptRules?.nightPremiumRate ?? 0;

      const baseSalary = totalBaseHours * hourlyRate;
      const overtimePay = totalOvertimeHours * hourlyRate * salaryRules.overtimeMultiplier;
      const nightPay = totalNightHours * hourlyRate * (1 + nightPremiumRate);
      const allowances = 0;
      const totalGross = baseSalary + overtimePay + nightPay + allowances;

      await this.db.payslip.deleteMany({
        where: { periodId, employeeId: employee.id },
      });

      const payslip = await this.db.payslip.create({
        data: {
          tenantId,
          periodId,
          employeeId: employee.id,
          hourlyRate,
          regularHoursWorked: totalBaseHours,
          overtimeHoursWorked: totalOvertimeHours,
          nightHoursWorked: totalNightHours,
          baseSalary,
          overtimePay,
          allowances,
          totalGross,
          totalDeductions: 0,
          netPay: 0,
          deductionsBreakdown: {},
          allowancesBreakdown: {},
          status: 'UNPAID',
        },
      });

      payslips.push(payslip);
    }

    await this.db.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'FINALIZED' },
    });

    return {
      message: 'Payroll run completed successfully',
      periodId,
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
            department: { select: { name: true } },
          },
        },
      },
    });
  }

  async getEmployeePayslip(employeeId: string, periodId: string, tenantId: string) {
    const payslip = await this.db.payslip.findFirst({
      where: { employeeId, periodId, tenantId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            payrollNumber: true,
            department: { select: { name: true } },
          },
        },
        period: true,
      },
    });

    if (!payslip) throw new NotFoundException('Payslip not found');
    return payslip;
  }

  async approvePayslip(payslipId: string, tenantId: string) {
    const payslip = await this.db.payslip.findFirst({
      where: { id: payslipId, tenantId },
    });

    if (!payslip) throw new NotFoundException('Payslip not found');
    if (payslip.status === 'PAID')
      throw new BadRequestException('Payslip is already marked as paid');

    return this.db.payslip.update({
      where: { id: payslipId },
      data: { status: 'APPROVED' },
    });
  }

  async exportPayroll(periodId: string, tenantId: string) {
    const payslips = await this.db.payslip.findMany({
      where: { periodId, tenantId },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            payrollNumber: true,
          },
        },
        period: {
          select: { name: true, startDate: true, endDate: true },
        },
      },
    });

    return payslips.map((p) => ({
      payrollNumber: p.employee.payrollNumber,
      employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
      period: p.period.name,
      periodStart: p.period.startDate,
      periodEnd: p.period.endDate,
      hourlyRate: p.hourlyRate,
      regularHours: p.regularHoursWorked,
      overtimeHours: p.overtimeHoursWorked,
      nightHours: p.nightHoursWorked,
      baseSalary: p.baseSalary,
      overtimePay: p.overtimePay,
      allowances: p.allowances,
      totalGross: p.totalGross,
      totalDeductions: p.totalDeductions,
      netPay: p.netPay,
      status: p.status,
    }));
  }
}
