/**
 * HOSPITAL CHRONOS SYSTEM - GLOBAL API CONTRACT LAYER
 * Location: packages/types-common/src/api-contracts.ts
 * * Strict Source of Truth for NestJS Backend and Next.js Frontend.
 * FIXED: Aligned enums perfectly with PostgreSQL DB states and secured auth inputs.
 */

// ==========================================
// 1. CORE SYSTEM ENUMS & TYPES
// ==========================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  HR_MANAGER = 'HR_MANAGER',
  DEPT_HEAD = 'DEPT_HEAD', // FIXED: Aligned with DB schema token
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE'   // FIXED: Aligned with DB schema token
}

export enum ClockAction {
  IN = 'IN',
  OUT = 'OUT',
  UNKNOWN = 'UNKNOWN'
}

export enum ShiftStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  LEAVE = 'LEAVE',
  GHOST_SESSION = 'GHOST_SESSION' // Automatically flagged >14 hour unclosed shifts
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED'
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  LOCUM = 'LOCUM',
  INTERN = 'INTERN'
}

export enum ShiftTemplateType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
  FLEXIBLE = 'FLEXIBLE',
  CUSTOM = 'CUSTOM'
}

export enum RosterAssignmentStatus {
  UNVERIFIED = 'UNVERIFIED',
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  OFF = 'OFF',
  REASSIGNED = 'REASSIGNED',
  CANCELLED = 'CANCELLED'
}

export interface PaginationQueryDTO {
  page?: number;
  limit?: number;
}

export interface ApiResponsePaginated<T> {
  success: boolean;
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

// ==========================================
// 2. AUTH & IDENTITY DOMAIN
// ==========================================

export interface JwtPayload {
  sub: string;         // User ID
  email: string;
  role: UserRole;
  tenantId: string;    // Crucial for multi-tenant isolation rows
  deptId: string | null;
}

export interface AuthLoginRequestDTO {
  email: string;
  password: string; // FIXED: Changed from passwordHash to raw text over HTTPS
}

export interface AuthResponseDTO {
  success: boolean;
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId: string;
  };
}

// ==========================================
// 3. TENANT & DEPARTMENT DOMAIN
// ==========================================

export interface TenantCreateDTO {
  name: string;
  subdomain: string;
  licenseKey: string;
}

export interface TenantResponseDTO {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
}

export interface DepartmentCreateDTO {
  name: string;
  code: string; // e.g., "ICU", "OPD"
  parentId?: string;
  costCenterCode?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  rules?: Record<string, unknown>;
}

export interface DepartmentResponseDTO {
  id: string;
  name: string;
  code: string;
  tenantId: string;
  parentId: string | null;
  costCenterCode: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  memberCount: number;
}

// ==========================================
// 3B. EMPLOYEE DOMAIN
// ==========================================

export interface EmergencyContactDTO {
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
}

export interface EmployeeCreateDTO {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  departmentId?: string;
  deviceUserId: string;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  role?: UserRole;
  hourlyRate?: number;
  emergencyContacts?: EmergencyContactDTO[];
  profileMetadata?: Record<string, unknown>;
}

export interface EmployeeUpdateDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string | null;
  employmentType?: EmploymentType;
  hourlyRate?: number;
  emergencyContacts?: EmergencyContactDTO[];
  profileMetadata?: Record<string, unknown>;
}

export interface EmployeeStatusUpdateDTO {
  employmentStatus: EmploymentStatus;
}

export interface EmployeeDepartmentUpdateDTO {
  departmentId: string | null;
}

export interface EmployeeDeviceUserUpdateDTO {
  deviceUserId: string;
}

export interface EmployeeQueryDTO extends PaginationQueryDTO {
  search?: string;
  departmentId?: string;
  employmentStatus?: EmploymentStatus;
  employmentType?: EmploymentType;
  includeDeleted?: boolean;
}

export interface EmployeeResponseDTO {
  id: string;
  tenantId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole | string;
  departmentId: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  deviceUserId: string;
  employmentType: EmploymentType | string;
  employmentStatus: EmploymentStatus | string;
  hourlyRate: number;
  emergencyContacts: EmergencyContactDTO[];
  profileMetadata: Record<string, unknown>;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. ROSTER & SCHEDULING DOMAIN
// ==========================================

export interface ShiftScheduleCreateDTO {
  userId: string;
  tenantId: string;
  deptId: string;
  startTime: string; // ISO8601 representation (e.g. 2026-05-21T06:00:00Z)
  endTime: string;   // ISO8601 representation
  gracePeriodMinutes: number; // Late calculation padding
}

export interface ShiftScheduleResponseDTO {
  id: string;
  userId: string;
  tenantId: string;
  deptId: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  isOvernight: boolean;
}

export interface ShiftTemplateCreateDTO {
  name: string;
  type: ShiftTemplateType;
  startTime: string;
  endTime: string;
  gracePeriodMinutes?: number;
  earlyClockInWindowMinutes?: number;
  overtimeThresholdMinutes?: number;
  isOvernight?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  rules?: Record<string, unknown>;
}

export interface ShiftTemplateUpdateDTO {
  name?: string;
  type?: ShiftTemplateType;
  startTime?: string;
  endTime?: string;
  gracePeriodMinutes?: number;
  earlyClockInWindowMinutes?: number;
  overtimeThresholdMinutes?: number;
  isOvernight?: boolean;
  isActive?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  rules?: Record<string, unknown>;
}

export interface ShiftTemplateQueryDTO extends PaginationQueryDTO {
  search?: string;
  type?: ShiftTemplateType;
  isActive?: boolean;
}

export interface ShiftTemplateResponseDTO {
  id: string;
  tenantId: string;
  name: string;
  type: ShiftTemplateType | string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  earlyClockInWindowMinutes: number;
  overtimeThresholdMinutes: number;
  isOvernight: boolean;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  rules: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAssignmentCreateDTO {
  employeeIds: string[];
  departmentId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  overriddenHourlyRate?: number;
  reason?: string;
}

export interface ShiftAssignmentUnassignDTO {
  employeeIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  reason?: string;
}

export interface RosterAssignmentResponseDTO {
  id: string;
  tenantId: string;
  employeeId: string;
  departmentId: string;
  shiftTemplateId: string;
  date: string;
  status: RosterAssignmentStatus | string;
  overriddenHourlyRate: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  assignedByUserId: string | null;
  unassignedAt: string | null;
  unassignedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 5. BIOMETRIC & ATTENDANCE TELEMETRY DOMAIN
// ==========================================

/**
 * Payload sent directly from Go edge-gateway-service 
 * or processed via NestJS proxy ingestion.
 */
export interface BiometricLogIngestionDTO {
  tenantId: string;        // FIXED: Absolute requirement for early tenant context routing
  deviceId: string;
  biometricUserId: string; // Pin mapping identifier from hardware device memory
  timestamp: string;       // Exact ISO8601 punch instant clock recorded
}

export interface IngestionResultDTO {
  success: boolean;
  logId: string;
  userId: string;
  tenantId: string;
  actionDetected: ClockAction;
  isDeduplicated: boolean; // True if within the 2-minute double-punch suppression window
  processedAt: string;
}

export interface AttendanceCorrectionDTO {
  logId: string;
  correctedAction: ClockAction;
  reasonForChange: string; // Enforces a strict audit log trail
  adminUserId: string;
}

// ==========================================
// 6. PAYROLL & METRICS ACCUMULATOR DOMAIN
// ==========================================

export interface PayrollQueryDTO {
  tenantId: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface EmployeePayrollSummaryDTO {
  userId: string;
  employeeName: string;
  totalRegularHoursWorked: number;
  totalOvertimeHoursWorked: number;
  totalMinutesLate: number;
  daysPresentCount: number;
  ghostSessionsCount: number;
  computedPeriodRange: {
    start: string;
    end: string;
  };
}
