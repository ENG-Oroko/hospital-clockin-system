import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly db: DatabaseService) {}

  async getBalance(tenantId: string, userId: string, year: number) {
    return this.db.leaveBalance.findFirst({
      where: { tenantId, userId, year },
    });
  }

  async createInitialBalance(
    tenantId: string,
    userId: string,
    year: number,
    totalDays: number,
  ) {
    return this.db.leaveBalance.create({
      data: {
        tenantId,
        userId,
        year,
        totalDays,
        usedDays: 0,
        remainingDays: totalDays,
      },
    });
  }

  async deductLeave(
    tenantId: string,
    userId: string,
    days: number,
    year: number,
  ) {
    const balance = await this.getBalance(tenantId, userId, year);

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    if (balance.remainingDays < days) {
      throw new Error('Insufficient leave balance');
    }

    return this.db.leaveBalance.update({
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
    days: number,
    year: number,
  ) {
    const balance = await this.getBalance(tenantId, userId, year);

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    return this.db.leaveBalance.update({
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
    year: number,
    totalDays: number,
  ) {
    const balance = await this.getBalance(tenantId, userId, year);

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    return this.db.leaveBalance.update({
      where: { id: balance.id },
      data: {
        totalDays,
        usedDays: 0,
        remainingDays: totalDays,
      },
    });
  }
}