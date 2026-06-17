// src/data/reportsData.ts
import { ReportItem } from './types'

export const reportsData: ReportItem[] = [
  { id: 1, title: 'Monthly Attendance Summary',    category: 'Attendance', date: 'May 31, 2025', size: '1.2 MB', type: 'pdf'  },
  { id: 2, title: 'Overtime Analysis – May 2025',  category: 'Overtime',   date: 'May 31, 2025', size: '840 KB', type: 'xlsx' },
  { id: 3, title: 'Department Headcount',          category: 'HR',         date: 'May 28, 2025', size: '560 KB', type: 'xlsx' },
  { id: 4, title: 'Shift Coverage Report',         category: 'Shifts',     date: 'May 27, 2025', size: '1.0 MB', type: 'pdf'  },
  { id: 5, title: 'Payroll Overtime Summary',      category: 'Overtime',   date: 'May 20, 2025', size: '450 KB', type: 'xlsx' },
]