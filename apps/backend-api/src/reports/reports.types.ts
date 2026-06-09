export const REPORT_TYPES = {
  MONTHLY_ATTENDANCE: 'MONTHLY_ATTENDANCE',
  DEPARTMENT_SUMMARY: 'DEPARTMENT_SUMMARY',
  OVERTIME_AUDIT: 'OVERTIME_AUDIT',
  LATENESS_AUDIT: 'LATENESS_AUDIT',
  ABSENCE_AUDIT: 'ABSENCE_AUDIT',
  SHIFT_COMPLIANCE: 'SHIFT_COMPLIANCE',
  PAYROLL_READY: 'PAYROLL_READY',
  LEAVE_ATTENDANCE_RECONCILIATION: 'LEAVE_ATTENDANCE_RECONCILIATION',
  DEVICE_HEALTH: 'DEVICE_HEALTH',
  TURNOVER_HEADCOUNT: 'TURNOVER_HEADCOUNT',
  SCHEDULED_ACTUAL_HOURS: 'SCHEDULED_ACTUAL_HOURS',
  ATTENDANCE_AUDIT_TRAIL: 'ATTENDANCE_AUDIT_TRAIL',
} as const;

export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];
export type ReportDownloadFormat = 'pdf' | 'excel';

export interface ReportQueryDTO {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  departmentId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface ReportListQueryDTO {
  reportType?: string;
  page?: number;
  limit?: number;
}

export interface ReportExportJobPayload {
  tenantId: string;
  generatedById: string;
  query: ReportQueryDTO;
}

export interface QueuedReportResult {
  queued: true;
  jobId: string;
}
