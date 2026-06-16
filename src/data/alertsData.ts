// src/data/alertsData.ts
import { Alert } from './types'

export const alertsData: Alert[] = [
  {
    id:          1,
    severity:    'danger',
    title:       'ICU Understaffed',
    description: 'Only 4 nurses on duty — minimum is 8',
    time:        '10 min ago',
  },
  
  {
    id:          3,
    severity:    'danger',
    title:       'No-Shows: Emergency',
    description: '3 staff absent without notice',
    time:        '1 hr ago',
  },
  {
    id:          4,
    severity:    'warning',
    title:       'Leave Spike',
    description: 'Radiology dept: 6 leave requests pending',
    time:        '2 hr ago',
  },
  {
    id:          5,
    severity:    'info',
    title:       'Shift Swap Request',
    description: 'Nurse Sharma requested a shift swap',
    time:        '3 hr ago',
  },
  {
    id:          6,
    severity:    'success',
    title:       'Target Attendance Met',
    description: 'Surgery dept hit 100% attendance',
    time:        '4 hr ago',
  },
]