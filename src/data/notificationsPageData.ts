// src/data/notificationsPageData.ts
import { NotificationFull } from './types'

export const notificationsFullData: NotificationFull[] = [
  { id: 1,  severity: 'danger',  title: 'ICU Understaffed',           body: 'Only 4 nurses on duty — minimum is 8. Immediate action required.',         time: '10 min ago',  read: false },
  { id: 2,  severity: 'danger',  title: 'Emergency Dept No-Shows',    body: '3 staff members absent without notice in the Emergency department.',        time: '1 hr ago',    read: false },
  { id: 3,  severity: 'warning', title: 'Leave Request Spike',        body: 'Radiology has 6 pending leave requests this week.',                        time: '2 hr ago',    read: true  },
  { id: 4,  severity: 'info',    title: 'Shift Swap Request',         body: 'Nurse Sharma has requested a swap with Nurse Rao for May 22.',             time: '3 hr ago',    read: true  },
  { id: 5,  severity: 'success', title: 'Surgery Dept Full Attendance','body': 'Surgery department achieved 100% attendance for the week.',              time: '4 hr ago',    read: true  },
  { id: 6,  severity: 'info',    title: 'New Policy Published',       body: 'Updated leave policy effective June 1, 2025 has been published.',          time: '1 day ago',   read: true  },
  { id: 7,  severity: 'warning', title: 'Overtime Budget 80% Used',   body: 'The monthly overtime budget is 80% consumed with 10 days remaining.',      time: '1 day ago',   read: true  },
  { id: 8,  severity: 'success', title: 'New Employee Onboarded',     body: 'Dr. K. Sharma has been onboarded to the Pediatrics department.',           time: '2 days ago',  read: true  },
  { id: 9,  severity: 'info',    title: 'System Maintenance',         body: 'Scheduled system maintenance on May 25, 2025 from 2:00–4:00 AM.',          time: '3 days ago',  read: true  },
]