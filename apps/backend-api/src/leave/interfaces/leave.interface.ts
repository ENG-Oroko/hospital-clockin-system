import { LeaveStatus } from '../enums/leave-status.enum';
import { LeaveType } from '../enums/leave-type.enum';

export interface ILeave {
  id: string;
  employeeId: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  reason: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILeaveBalance {
  employeeId: string;
  leaveType: LeaveType;
  allocated: number;
  used: number;
  remaining: number;
}