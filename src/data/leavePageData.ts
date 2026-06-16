// src/data/leavePageData.ts
import { LeaveRecord } from './types'

export const leaveRecordsData: LeaveRecord[] = [
  { id: 1,  employeeId: 2,  name: 'Nurse A. Patel',   initials: 'AP', department: 'ICU',       type: 'Sick Leave',   from: 'May 20', to: 'May 27', days: 7,  avatarColor: '#16A34A' },
  { id: 2,  employeeId: 11, name: 'Dr. P. Joshi',     initials: 'PJ', department: 'Surgery',   type: 'Annual Leave', from: 'May 15', to: 'May 29', days: 14, avatarColor: '#7C3AED' },
  { id: 3,  employeeId: 6,  name: 'Nurse B. Rao',     initials: 'BR', department: 'Nursing',   type: 'Maternity',    from: 'May 1',  to: 'Jul 31', days: 91, avatarColor: '#DC2626' },
  { id: 4,  employeeId: 4,  name: 'J. Desai',         initials: 'JD', department: 'Radiology', type: 'Casual Leave', from: 'May 22', to: 'May 23', days: 2,  avatarColor: '#7C3AED' },
  { id: 5,  employeeId: 7,  name: 'T. Mehta',         initials: 'TM', department: 'Pharmacy',  type: 'Sick Leave',   from: 'May 18', to: 'May 21', days: 4,  avatarColor: '#16A34A' },
  { id: 6,  employeeId: 15, name: 'Dr. F. Kimani',    initials: 'FK', department: 'Radiology', type: 'Annual Leave', from: 'May 25', to: 'Jun 1',  days: 8,  avatarColor: '#D97706' },
]