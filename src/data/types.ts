// src/data/types.ts
export type DeltaType   = 'positive' | 'negative' | 'neutral'
export type Severity    = 'danger' | 'warning' | 'info' | 'success'
export type CellStatus  = 'present' | 'leave' | 'absent' | 'nodata'
export type TabKey      = 'leave' | 'overtime' | 'shiftswap'

export interface KPIStat {
  label:     string
  value:     string
  delta:     string
  deltaType: DeltaType
  iconName:  string
  colorBg:   string
  colorIcon: string
}

export interface Alert {
  id:          number
  severity:    Severity
  title:       string
  description: string
  time:        string
}

export interface ShiftItem {
  iconName: string
  label:    string
  subtitle: string
  count:    number
  capacity: number
  colorBg:  string
  color:    string
}

export interface DepartmentSlice {
  name:  string
  value: number
  color: string
}

export interface AttendancePoint {
  day:     string
  Present: number | null
  OnLeave: number | null
  Absent:  number | null
}

export type HeatmapRow    = Record<number, CellStatus>
export type HeatmapMatrix = Record<string, HeatmapRow>

export interface NavChild {
  label:   string
  path?:   string
  active?: boolean
}

export interface NavItem {
  iconName:  string
  label:     string
  path?:     string
  badge?:    number
  active?:   boolean
  children?: NavChild[]
}

export interface NotificationItem {
  text:  string
  time:  string
  color: string
}

// ── Employee ─────────────────────────────────────────────
export interface Employee {
  id:          number
  name:        string
  initials:    string
  role:        string
  department:  string
  status:      'active' | 'on-leave' | 'inactive'
  joinDate:    string
  email:       string
  phone:       string
  avatarColor: string
  salary:      number   // monthly gross in KSH
}

// ── Department ───────────────────────────────────────────
export interface Department {
  id:          number
  name:        string
  headId:      number | null   // employee id of dept head
  color:       string
  description: string
}

// ── Leave ─────────────────────────────────────────────────
export interface LeaveRecord {
  id:          number
  employeeId:  number
  name:        string
  initials:    string
  department:  string
  type:        string
  from:        string
  to:          string
  days:        number
  avatarColor: string
}

// ── Shift ────────────────────────────────────────────────
export interface ShiftEntry {
  id:          number
  name:        string
  department:  string
  shiftType:   'Morning' | 'Afternoon' | 'Night'
  startTime:   string
  endTime:     string
  days:        string[]   // e.g. ['Mon','Tue','Wed']
  createdDate: string
}

// ── Report ───────────────────────────────────────────────
export interface ReportItem {
  id:       number
  title:    string
  category: string
  date:     string
  size:     string
  type:     'pdf' | 'xlsx' | 'csv'
}

// ── Notifications ─────────────────────────────────────────
export interface NotificationFull {
  id:       number
  severity: Severity
  title:    string
  body:     string
  time:     string
  read:     boolean
}

// ── Settings ──────────────────────────────────────────────
export interface SettingToggle {
  label:       string
  description: string
  enabled:     boolean
}

// ── Payroll ───────────────────────────────────────────────
export interface PayrollRecord {
  employeeId:  number
  name:        string
  initials:    string
  department:  string
  role:        string
  avatarColor: string
  basicSalary: number   // KSH
  allowances:  number   // KSH
  overtime:    number   // KSH
  deductions:  number   // KSH
  net:         number   // KSH
}