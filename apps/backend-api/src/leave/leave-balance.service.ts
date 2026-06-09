import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly db: PrismaService) {}

  async getBalance(tenantId: string, userId: string, leaveType: string, year: number) {
    return this.db.client.leaveBalance.findFirst({
      where: { userId, leaveType, year },
    });
  }

  async createInitialBalance(
    tenantId: string,
    userId: string,
    leaveType: string,
    year: number,
    totalDays: number,
  ) {
    return this.db.client.leaveBalance.create({
      data: {
        leaveType,
        totalDays,
        usedDays: 0,
        remainingDays: totalDays,
        year,
        tenant: { connect: { id: tenantId } },
        user:   { connect: { id: userId } },
      },
    });
  }

  async deductLeave(
    tenantId: string,
    userId: string,
    leaveType: string,
    days: number,
    year: number,
  ) {
    const balance = await this.getBalance(tenantId, userId, leaveType, year);

    if (!balance) throw new NotFoundException('Leave balance not found');
    if (balance.remainingDays < days) throw new Error('Insufficient leave balance');

    return this.db.client.leaveBalance.update({
      where: { id: balance.id },
      data: {
        usedDays: balance.usedDays + days,
        remainingDays: balance.remainingDays - days,
      },
    });
  }

  async addLeaveDays(
    tenantId: string,
    userId: string,
    leaveType: string,
    days: number,
    year: number,
  ) {
    const balance = await this.getBalance(tenantId, userId, leaveType, year);

    if (!balance) throw new NotFoundException('Leave balance not found');

    return this.db.client.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalDays: balance.totalDays + days,
        remainingDays: balance.remainingDays + days,
      },
    });
  }

  async resetBalance(
    tenantId: string,
    userId: string,
    leaveType: string,
    year: number,
    totalDays: number,
  ) {
    const balance = await this.getBalance(tenantId, userId, leaveType, year);

    if (!balance) throw new NotFoundException('Leave balance not found');

    return this.db.client.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalDays,
        usedDays: 0,
        remainingDays: totalDays,
      },
    });
  }
}
