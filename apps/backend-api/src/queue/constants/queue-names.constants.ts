// src/queue/constants/queue-names.constants.ts

export const QUEUE_NAMES = {
    ATTENDANCE_PROCESSING: 'attendance-processing',
    PAYROLL_CALCULATION: 'payroll-calculation',
    REPORT_GENERATION: 'report-generation',
  } as const;
  
  export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
  
  export const ATTENDANCE_JOB_NAMES = {
    PROCESS_LOG: 'process-attendance-log',
    BATCH_RECONCILE: 'batch-reconcile-attendance',
    REPROCESS_LOG: 'reprocess-attendance-log', // ✅ Added missing constant
  } as const;
  
  export type AttendanceJobName =
    typeof ATTENDANCE_JOB_NAMES[keyof typeof ATTENDANCE_JOB_NAMES];