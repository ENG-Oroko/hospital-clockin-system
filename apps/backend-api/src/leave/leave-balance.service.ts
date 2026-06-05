import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LeaveBalance } from './leave-balance.entity';

@Injectable()
export class LeaveBalanceService {
  constructor(
    @InjectRepository(LeaveBalance)
    private readonly repo: Repository<LeaveBalance>,
  ) {}

  // GET USER LEAVE BALANCE
  async getBalance(
    userId: string,
    year: number,
  ): Promise<LeaveBalance | null> {
    return this.repo.findOne({
      where: {
        user: {
          id: userId,
        } as any,
        year,
      },
      relations: ['user'],
    });
  }

  // CREATE INITIAL BALANCE
  async createInitialBalance(
    userId: string,
    year: number,
    total: number,
  ): Promise<LeaveBalance> {
    const balance = this.repo.create({
      user: { id: userId } as any,
      year,
      totalDays: total,
      usedDays: 0,
      remainingDays: total,
    });

    return this.repo.save(balance);
  }

  // DEDUCT LEAVE DAYS
  async deductLeave(
    userId: string,
    days: number,
    year: number,
  ): Promise<LeaveBalance> {
    const balance = await this.getBalance(userId, year);

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    if (balance.remainingDays < days) {
      throw new Error('Insufficient leave balance');
    }

    balance.usedDays += days;
    balance.remainingDays -= days;

    return this.repo.save(balance);
  }

  // ADD LEAVE DAYS
  async addLeaveDays(
    userId: string,
    days: number,
    year: number,
  ): Promise<LeaveBalance> {
    const balance = await this.getBalance(userId, year);

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    balance.totalDays += days;
    balance.remainingDays += days;

    return this.repo.save(balance);
  }

  // RESET YEARLY BALANCE
  async resetBalance(
    userId: string,
    year: number,
    totalDays: number,
  ): Promise<LeaveBalance> {
    const balance = await this.getBalance(userId, year);

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    balance.totalDays = totalDays;
    balance.usedDays = 0;
    balance.remainingDays = totalDays;

    return this.repo.save(balance);
  }
}