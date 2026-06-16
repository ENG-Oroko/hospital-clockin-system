// src/data/payrollData.ts
import { PayrollRecord } from './types'

export const payrollData: PayrollRecord[] = [
  { employeeId: 1,  name: 'Dr. R. Sharma',    initials: 'RS', department: 'Surgery',    role: 'Senior Surgeon',      avatarColor: '#2563EB', basicSalary: 280000, allowances: 35000, overtime: 12000, deductions: 28000,  net: 299000 },
  { employeeId: 5,  name: 'Dr. S. Gupta',     initials: 'SG', department: 'Surgery',    role: 'Cardiologist',        avatarColor: '#0891B2', basicSalary: 310000, allowances: 40000, overtime: 8000,  deductions: 32000,  net: 326000 },
  { employeeId: 11, name: 'Dr. P. Joshi',     initials: 'PJ', department: 'Surgery',    role: 'Orthopedic Surgeon',  avatarColor: '#7C3AED', basicSalary: 295000, allowances: 38000, overtime: 0,     deductions: 29500,  net: 303500 },
  { employeeId: 2,  name: 'Nurse A. Patel',   initials: 'AP', department: 'ICU',        role: 'ICU Nurse',           avatarColor: '#16A34A', basicSalary: 95000,  allowances: 12000, overtime: 9500,  deductions: 9500,   net: 107000 },
  { employeeId: 8,  name: 'Nurse P. Singh',   initials: 'PS', department: 'ICU',        role: 'ICU Nurse',           avatarColor: '#2563EB', basicSalary: 90000,  allowances: 11000, overtime: 7200,  deductions: 9000,   net: 99200  },
  { employeeId: 6,  name: 'Nurse B. Rao',     initials: 'BR', department: 'Nursing',    role: 'Staff Nurse',         avatarColor: '#DC2626', basicSalary: 85000,  allowances: 10000, overtime: 6800,  deductions: 8500,   net: 93300  },
  { employeeId: 14, name: 'Nurse C. Wanjiru', initials: 'CW', department: 'Nursing',    role: 'Head Nurse',          avatarColor: '#0891B2', basicSalary: 110000, allowances: 15000, overtime: 0,     deductions: 11000,  net: 114000 },
  { employeeId: 3,  name: 'Dr. M. Khan',      initials: 'MK', department: 'Emergency',  role: 'Emergency Physician', avatarColor: '#EA580C', basicSalary: 250000, allowances: 32000, overtime: 18000, deductions: 25000,  net: 275000 },
  { employeeId: 9,  name: 'Dr. A. Nair',      initials: 'AN', department: 'Emergency',  role: 'Emergency Physician', avatarColor: '#EA580C', basicSalary: 240000, allowances: 30000, overtime: 14400, deductions: 24000,  net: 260400 },
  { employeeId: 4,  name: 'J. Desai',         initials: 'JD', department: 'Radiology',  role: 'Radiologist',         avatarColor: '#7C3AED', basicSalary: 200000, allowances: 25000, overtime: 0,     deductions: 20000,  net: 205000 },
  { employeeId: 15, name: 'Dr. F. Kimani',    initials: 'FK', department: 'Radiology',  role: 'Radiologist',         avatarColor: '#D97706', basicSalary: 195000, allowances: 24000, overtime: 9750,  deductions: 19500,  net: 209250 },
  { employeeId: 7,  name: 'T. Mehta',         initials: 'TM', department: 'Pharmacy',   role: 'Pharmacist',          avatarColor: '#16A34A', basicSalary: 120000, allowances: 15000, overtime: 0,     deductions: 12000,  net: 123000 },
  { employeeId: 12, name: 'T. Kulkarni',      initials: 'TK', department: 'Pharmacy',   role: 'Pharmacist',          avatarColor: '#16A34A', basicSalary: 115000, allowances: 14000, overtime: 5750,  deductions: 11500,  net: 123250 },
  { employeeId: 10, name: 'M. Iyer',          initials: 'MI', department: 'Admin',      role: 'Admin Officer',       avatarColor: '#2563EB', basicSalary: 75000,  allowances: 9000,  overtime: 3750,  deductions: 7500,   net: 80250  },
  { employeeId: 13, name: 'Dr. L. Omondi',    initials: 'LO', department: 'Pediatrics', role: 'Pediatrician',        avatarColor: '#DB2777', basicSalary: 230000, allowances: 29000, overtime: 11500, deductions: 23000,  net: 247500 },
]