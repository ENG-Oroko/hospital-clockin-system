
// QUEUE NAME CONSTANTS

export const QUEUE_NAMES = {
 
  ATTENDANCE_PROCESSING: 'attendance-processing',

  
  PAYROLL_CALCULATION: 'payroll-calculation',

  
  REPORT_GENERATION: 'report-generation',
} as const;

// TYPE DEFINITIONS


export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];


// Job name constants for attendance processing queue
 
export const ATTENDANCE_JOB_NAMES = {
 
   //* Standard attendance log processing job
   
  PROCESS_LOG: 'process-attendance-log',

  
   //* Batch reconciliation job 
   
  BATCH_RECONCILE: 'batch-reconcile-attendance',
} as const;

export type AttendanceJobName = typeof ATTENDANCE_JOB_NAMES[keyof typeof ATTENDANCE_JOB_NAMES];