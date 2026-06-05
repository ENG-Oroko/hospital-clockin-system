import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeavePolicy } from './leave-policy.entity';

@Injectable()
export class LeavePolicyService {
  constructor(
    @InjectRepository(LeavePolicy)
    private readonly repo: Repository<LeavePolicy>,
  ) {}

  async getPolicyByRole(role: string) {
    return this.repo.findOne({ where: { role, isActive: true } });
  }

  async createPolicy(data: Partial<LeavePolicy>) {
    const policy = this.repo.create(data);
    return this.repo.save(policy);
  }
}