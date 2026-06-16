// src/data/shiftsPageData.ts
import { ShiftEntry } from './types'

export const shiftEntriesData: ShiftEntry[] = [
  { id: 1, name: 'Morning ICU Shift',        department: 'ICU',       shiftType: 'Morning',   startTime: '06:00', endTime: '14:00', days: ['Mon','Tue','Wed','Thu','Fri'], createdDate: 'May 10, 2025' },
  { id: 2, name: 'Night Surgery Cover',      department: 'Surgery',   shiftType: 'Night',     startTime: '22:00', endTime: '06:00', days: ['Mon','Wed','Fri'],              createdDate: 'May 12, 2025' },
  { id: 3, name: 'Emergency Afternoon',      department: 'Emergency', shiftType: 'Afternoon', startTime: '14:00', endTime: '22:00', days: ['Mon','Tue','Wed','Thu','Fri','Sat'], createdDate: 'May 14, 2025' },
  { id: 4, name: 'Nursing Morning Round',    department: 'Nursing',   shiftType: 'Morning',   startTime: '06:00', endTime: '14:00', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], createdDate: 'May 15, 2025' },
  { id: 5, name: 'Radiology Day Shift',      department: 'Radiology', shiftType: 'Morning',   startTime: '07:00', endTime: '15:00', days: ['Mon','Tue','Wed','Thu','Fri'], createdDate: 'May 16, 2025' },
  { id: 6, name: 'Pharmacy Evening',         department: 'Pharmacy',  shiftType: 'Afternoon', startTime: '14:00', endTime: '22:00', days: ['Mon','Tue','Wed','Thu','Fri'], createdDate: 'May 17, 2025' },
]