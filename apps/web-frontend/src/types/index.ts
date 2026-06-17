export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'HALF_DAY' | 'HOLIDAY' | 'UNROSTERED';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'LOCUM' | 'INTERN';

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'FLEXIBLE' | 'CUSTOM';

export interface DashboardStats {
  date: string;
  totalSummaries: number;
  present: number;
  late: number;
  absent: number;
  onLeave: number;
  totalEmployees: number;
  attendanceRate: number;
}

export interface AttendanceSummary {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  firstIn: string | null;
  lastOut: string | null;
  totalHours: number | null;
  lateMinutes: number;
  overtimeHours: number;
  shiftName: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string | null;
    payrollNumber?: string;
  };
  shift?: { id: string; name: string; startTime: string } | null;
  logs?: AttendanceLog[];
}

export interface AttendanceLog {
  id: string;
  userId: string;
  deviceId: string;
  direction: 'IN' | 'OUT';
  timestamp: string;
  device?: { id: string; name: string };
}

export interface ShiftTemplate {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  earlyClockInWindowMinutes: number;
  overtimeThresholdMinutes: number;
  isOvernight: boolean;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  payrollNumber: string;
  employeeCode: string;
  role: string;
  departmentId: string | null;
  department?: { id: string; name: string; code: string } | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  hourlyRate: number;
  isActive: boolean;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
  createdAt: string;
  employee?: { firstName: string; lastName: string; payrollNumber: string };
}

export interface CompiledReport {
  id: string;
  reportType: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  generatedBy: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
  compiledData?: {
    summary: Record<string, any>;
    rows: any[];
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: string;
  departmentId: string | null;
  department?: { id: string; name: string; code: string } | null;
}
