import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Leave } from './entity/leave-entity';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { LeaveStatus } from './enums/leave-status.enum';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(Leave)
    private readonly repo: Repository<Leave>,
  ) {}

  async createLeave(createLeaveDto: CreateLeaveDto): Promise<Leave> {
    const start = new Date(createLeaveDto.startDate);
    const end = new Date(createLeaveDto.endDate);

    if (end < start) {
      throw new BadRequestException('End date must be after start date');
    }

    const leave = this.repo.create({
      ...createLeaveDto,
      status: LeaveStatus.PENDING,
    });

    return this.repo.save(leave);
  }

  async getAllLeaves(): Promise<Leave[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getLeaveById(id: string): Promise<Leave> {
    const leave = await this.repo.findOne({ where: { id } });

    if (!leave) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return leave;
  }

  async getLeavesByEmployee(employeeId: string): Promise<Leave[]> {
    return this.repo.find({
      where: { employeeId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLeavesByStatus(status: LeaveStatus): Promise<Leave[]> {
    return this.repo.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  async updateLeaveStatus(
    id: string,
    updateLeaveStatusDto: UpdateLeaveStatusDto,
  ): Promise<Leave> {
    const leave = await this.getLeaveById(id);

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update a leave request that is already ${leave.status.toLowerCase()}`,
      );
    }

    Object.assign(leave, updateLeaveStatusDto);

    return this.repo.save(leave);
  }

  async cancelLeave(id: string, employeeId: string): Promise<Leave> {
    const leave = await this.getLeaveById(id);

    if (leave.employeeId !== employeeId) {
      throw new BadRequestException(
        'You can only cancel your own leave requests',
      );
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel a leave request that is already ${leave.status.toLowerCase()}`,
      );
    }

    leave.status = LeaveStatus.CANCELLED;
    leave.reviewedBy = employeeId;

    return this.repo.save(leave);
  }

  async deleteLeave(id: string): Promise<void> {
    const leave = await this.getLeaveById(id);
    await this.repo.remove(leave);
  }
}