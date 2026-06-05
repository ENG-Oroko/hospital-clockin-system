import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { LeaveStatus } from '../enums/leave-status.enum';

export class UpdateLeaveStatusDto {
  @IsEnum(LeaveStatus)
  @IsNotEmpty()
  status: LeaveStatus;

  @IsUUID()
  @IsNotEmpty()
  reviewedBy: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reviewNote?: string;
}