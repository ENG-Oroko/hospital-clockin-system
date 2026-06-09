import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReconciliationRequestDTO {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReprocessReconciliationDTO extends ReconciliationRequestDTO {}

export class ReconciliationOverrideDTO {
  @IsOptional()
  calculatedBaseHours?: number;

  @IsOptional()
  calculatedOvertime?: number;

  @IsOptional()
  calculatedNightShift?: number;

  @IsOptional()
  @IsString()
  exceptionReason?: string | null;

  @IsString()
  reason: string;
}

export class ReconciliationApprovalDTO {
  @IsString()
  reason: string;
}

export class UnrosteredExceptionReviewDTO {
  @IsString()
  action: string;

  @IsString()
  reason: string;
}

export class UnrosteredExceptionOverrideDTO {
  @IsString()
  reason: string;
}

export interface PayrollReadyRecordDTO {
  reconciliationLogId: string;
  tenantId: string;
  employeeId: string;
  payrollNumber?: string;
  employeeName?: string;
  departmentId: string;
  departmentCode?: string;
  departmentRules?: unknown;
  rosterAssignmentId: string;
  shiftDate: string;
  baseHours: number;
  overtimeHours: number;
  nightHours: number;
  hourlyRate: number | null;
  isFlagged: boolean;
  isResolved: boolean;
  exceptionReason: string | null;
}

export interface ReconciliationResultDTO {
  reconciliationLog: unknown;
  payrollReadyRecord: PayrollReadyRecordDTO | null;
  exception?: unknown;
  summary: {
    tenantId: string;
    userId: string;
    date: Date;
    firstIn: Date | null;
    lastOut: Date | null;
    totalHours: number;
    status: string;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    scheduledHours?: number;
    lateMinutes?: number;
    overtimeHours?: number;
  };
}
