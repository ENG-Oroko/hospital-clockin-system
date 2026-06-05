import { IsOptional, IsDateString, IsString, IsEnum } from 'class-validator';
import { LeaveType } from '../enums/leave-type.enum';

export class UpdateLeaveDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(LeaveType)
  type?: LeaveType;

  @IsOptional()
  @IsString()
  reason?: string;
}