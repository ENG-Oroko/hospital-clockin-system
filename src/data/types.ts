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
export interface StaffMember {
  id:   string
  name: string
  dept: string
}

export interface DepartmentRecord {
  id:       number
  name:     string
  headId:   string
  costCode: string
  floor:    string
}

export interface DeptFormValues {
  name:     string
  headId:   string
  costCode: string
  floor:    string
}

export interface DeptFormErrors {
  name?:     string
  headId?:   string
  costCode?: string
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

// Add to src/data/types.ts  (append at the bottom)

export type DeviceStatus = 'online' | 'offline'

export interface Device {
  id:       string
  name:     string
  location: string
  status:   DeviceStatus
  lastSeen: string
  firmware: string
  ip:       string
}

export interface Toast {
  id:      number
  message: string
  type:    'info' | 'success' | 'warning' | 'danger'
}
// src/data/types.ts  — append these at the bottom

// ── Shift templates ───────────────────────────────────────
export interface ShiftTemplate {
  id:    number
  name:  string
  start: string
  end:   string
  color: string
  bg:    string
  depts: string[]
}

export interface ShiftFormValues {
  name:  string
  start: string
  end:   string
  color: string
  bg:    string
  depts: string[]
}

export interface ShiftFormErrors {
  name?:  string
  start?: string
  end?:   string
  depts?: string
}

// ── Notifications ─────────────────────────────────────────
export type NotifColor = 'red' | 'amber' | 'blue' | 'green'
export type NotifIcon  =
  | 'AlertCircle'
  | 'AlertTriangle'
  | 'XCircle'
  | 'Info'
  | 'CheckCircle'

export interface AppNotification {
  id:    number
  icon:  NotifIcon
  color: NotifColor
  title: string
  desc:  string
  time:  string
  read:  boolean
}

// ── Settings ──────────────────────────────────────────────
export interface HospitalSettings {
  hospitalName: string
  timezone:     string
  gracePeriod:  string
  workHours:    string
  otMultiplier: string
  emailAlerts:  boolean
  smsAlerts:    boolean
  deviceAlerts: boolean
  autoRecon:    boolean
}