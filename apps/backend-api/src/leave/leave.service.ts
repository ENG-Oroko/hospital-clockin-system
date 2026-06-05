import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { DatabaseService } from '../database/database.service';
  import { CreateLeaveDto } from './dto/create-leave.dto';
  import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
  import { LeaveStatus } from './enums/leave-status.enum';
  import { ILeave } from './interfaces/leave.interface';
  
  @Injectable()
  export class LeaveService {
    constructor(private readonly db: DatabaseService) {}
  
    private mapToILeave(record: any): ILeave {
      return {
        id: record.id,
        employeeId: record.employeeId,
        type: record.leaveType,
        status: record.status as LeaveStatus,
        startDate: record.startDate,
        endDate: record.endDate,
        reason: record.reason ?? '',
        reviewedBy: record.approvedById ?? undefined,
        reviewNote: record.reviewNote ?? undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    }
  
    async createLeave(dto: CreateLeaveDto): Promise<ILeave> {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
  
      if (end < start) {
        throw new BadRequestException('End date must be after start date');
      }
  
      const record = await this.db.leaveRequest.create({
        data: {
          tenantId: dto.tenantId,
          employeeId: dto.employeeId,
          leaveType: dto.type,
          startDate: start,
          endDate: end,
          reason: dto.reason,
          status: LeaveStatus.PENDING,
        },
      });
  
      return this.mapToILeave(record);
    }
  
    async getAllLeaves(tenantId: string): Promise<ILeave[]> {
      const records = await this.db.leaveRequest.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r) => this.mapToILeave(r));
    }
  
    async getLeaveById(tenantId: string, id: string): Promise<ILeave> {
      const record = await this.db.leaveRequest.findFirst({
        where: { id, tenantId },
      });
  
      if (!record) {
        throw new NotFoundException(`Leave request with ID ${id} not found`);
      }
  
      return this.mapToILeave(record);
    }
  
    async getLeavesByEmployee(
      tenantId: string,
      employeeId: string,
    ): Promise<ILeave[]> {
      const records = await this.db.leaveRequest.findMany({
        where: { tenantId, employeeId },
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r) => this.mapToILeave(r));
    }
  
    async getLeavesByStatus(
      tenantId: string,
      status: LeaveStatus,
    ): Promise<ILeave[]> {
      const records = await this.db.leaveRequest.findMany({
        where: { tenantId, status },
        orderBy: { createdAt: 'desc' },
      });
      return records.map((r) => this.mapToILeave(r));
    }
  
    async updateLeaveStatus(
      tenantId: string,
      id: string,
      dto: UpdateLeaveStatusDto,
    ): Promise<ILeave> {
      const existing = await this.getLeaveById(tenantId, id);
  
      if (existing.status !== LeaveStatus.PENDING) {
        throw new BadRequestException(
          `Cannot update a leave request that is already ${existing.status.toLowerCase()}`,
        );
      }
  
      const updated = await this.db.leaveRequest.update({
        where: { id },
        data: {
          status: dto.status,
          approvedById: dto.reviewedBy,
          reviewNote: dto.reviewNote,
        },
      });
  
      return this.mapToILeave(updated);
    }
  
    async cancelLeave(
      tenantId: string,
      id: string,
      employeeId: string,
    ): Promise<ILeave> {
      const existing = await this.getLeaveById(tenantId, id);
  
      if (existing.employeeId !== employeeId) {
        throw new BadRequestException(
          'You can only cancel your own leave requests',
        );
      }
  
      if (existing.status !== LeaveStatus.PENDING) {
        throw new BadRequestException(
          `Cannot cancel a leave request that is already ${existing.status.toLowerCase()}`,
        );
      }
  
      const updated = await this.db.leaveRequest.update({
        where: { id },
        data: {
          status: LeaveStatus.CANCELLED,
          approvedById: employeeId,
        },
      });
  
      return this.mapToILeave(updated);
    }
  
    async deleteLeave(tenantId: string, id: string): Promise<void> {
      await this.getLeaveById(tenantId, id);
      await this.db.leaveRequest.delete({ where: { id } });
    }
  
    // Used by AttendanceProcessorService to mark ON_LEAVE status
    async isUserOnLeave(userId: string, date: Date): Promise<boolean> {
      const count = await this.db.leaveRequest.count({
        where: {
          employeeId: userId,
          status: LeaveStatus.APPROVED,
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });
      return count > 0;
    }
  }