// src/data/shiftsData.ts
import { ShiftTemplate } from './types'

export const initialShifts: ShiftTemplate[] = [
  {
    id:    1,
    name:  'Morning Shift',
    start: '06:00',
    end:   '14:00',
    color: '#2563EB',
    bg:    '#DBEAFE',
    depts: ['Nursing', 'Emergency', 'Radiology'],
  },
  {
    id:    2,
    name:  'Afternoon Shift',
    start: '14:00',
    end:   '22:00',
    color: '#EA580C',
    bg:    '#FFEDD5',
    depts: ['ICU', 'Surgery', 'General Ward'],
  },
  {
    id:    3,
    name:  'Night Shift',
    start: '22:00',
    end:   '06:00',
    color: '#6B7280',
    bg:    '#F3F4F6',
    depts: ['Nursing', 'ICU', 'Emergency'],
  },
  {
    id:    4,
    name:  'On-Call Pool',
    start: '00:00',
    end:   '23:59',
    color: '#16A34A',
    bg:    '#DCFCE7',
    depts: ['Surgery', 'Radiology'],
  },
]

export const ALL_SHIFT_DEPTS: string[] = [
  'Nursing', 'ICU', 'Surgery', 'Emergency',
  'Radiology', 'General Ward', 'Pharmacy', 'Admin',
]

export const COLOR_OPTIONS: { color: string; bg: string; label: string }[] = [
  { color: '#2563EB', bg: '#DBEAFE', label: 'Blue'   },
  { color: '#16A34A', bg: '#DCFCE7', label: 'Green'  },
  { color: '#EA580C', bg: '#FFEDD5', label: 'Amber'  },
  { color: '#DC2626', bg: '#FEE2E2', label: 'Red'    },
  { color: '#7C3AED', bg: '#F3E8FF', label: 'Purple' },
  { color: '#6B7280', bg: '#F3F4F6', label: 'Gray'   },
]

export const EMPTY_SHIFT_FORM: Omit<ShiftTemplate, 'id'> = {
  name:  '',
  start: '07:00',
  end:   '15:00',
  color: '#2563EB',
  bg:    '#DBEAFE',
  depts: [],
}