// IMPORTS

import { IBaseJobPayload } from './job-payload.interface';

// ATTENDANCE INGESTION JOB PAYLOAD
// IAttendanceIngestionJob - Payload for attendance log processing jobs

export interface IAttendanceIngestionJob extends IBaseJobPayload {
  
  // User identifier (UUID as string)
 
  userId: string;

  
   // Target date for reconciliation (YYYY-MM-DD format)
   
  date: string;
  // Specific attendance log ID that triggered this job (optional)
  
  attendanceLogId?: string;

  
 // Processing mode flag (optional)
 
  processingMode?: 'realtime' | 'batch' | 'repair';

 
 // Device serial number that captured the log (optional)
 
  deviceSerialNumber?: string;
}

export interface IAttendanceReconciliationJob extends IBaseJobPayload {
  startDate: string;
  endDate: string;
  employeeId?: string;
  departmentId?: string;
  triggeredByUserId?: string;
}

// FUTURE JOB INTERFACES (EXAMPLES)
// IPayrollCalculationJob - Payload for payroll processing (future)
 
export interface IPayrollCalculationJob extends IBaseJobPayload {
  
   // Payroll period identifier
    payrollPeriodId: string;
   employeeIds: string[];
    startDate: string;
    endDate: string;
   mode: 'preview' | 'final';
}

export interface IReportGenerationJob extends IBaseJobPayload {
  
  //  Type of report to generate
     reportType: 'attendance-audit' | 'overtime-summary' | 'department-summary';

    // Date range start (YYYY-MM-DD)
    startDate: string;
  endDate: string;
  filters: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv';

    // User ID who requested the report (for email notification)
    requestedByUserId: string;
}
