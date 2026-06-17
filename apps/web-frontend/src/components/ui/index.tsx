'use client';
import { type ReactNode } from 'react';
import type { AttendanceStatus, LeaveStatus, EmploymentStatus } from '@/types';

// ── StatusBadge ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  PRESENT:     { label: 'Present',         classes: 'bg-success-bg text-success ring-success/20',  dot: 'bg-success' },
  LATE:        { label: 'Late',            classes: 'bg-warning-bg text-warning ring-warning/20',  dot: 'bg-warning' },
  ABSENT:      { label: 'Absent',          classes: 'bg-danger-bg text-danger ring-danger/20',     dot: 'bg-danger' },
  NOT_STARTED: { label: 'Not started yet', classes: 'bg-slate-100 text-text-secondary ring-slate-300', dot: 'bg-slate-400' },
  ON_LEAVE:    { label: 'On Leave',        classes: 'bg-info-bg text-info ring-info/20',           dot: 'bg-info' },
  HALF_DAY:    { label: 'Half Day',        classes: 'bg-info-bg text-info ring-info/20',           dot: 'bg-info' },
  HOLIDAY:     { label: 'Holiday',         classes: 'bg-slate-100 text-text-secondary ring-slate-300', dot: 'bg-slate-400' },
  UNROSTERED:  { label: 'Unrostered',      classes: 'bg-warning-bg text-warning ring-warning/20',  dot: 'bg-warning' },
  PENDING:     { label: 'Pending',         classes: 'bg-warning-bg text-warning ring-warning/20',  dot: 'bg-warning' },
  APPROVED:    { label: 'Approved',        classes: 'bg-success-bg text-success ring-success/20', dot: 'bg-success' },
  REJECTED:    { label: 'Rejected',        classes: 'bg-danger-bg text-danger ring-danger/20',     dot: 'bg-danger' },
  CANCELLED:   { label: 'Cancelled',       classes: 'bg-slate-100 text-text-secondary ring-slate-300', dot: 'bg-slate-500' },
  ACTIVE:      { label: 'Active',          classes: 'bg-success-bg text-success ring-success/20', dot: 'bg-success' },
  INACTIVE:    { label: 'Inactive',        classes: 'bg-slate-100 text-text-secondary ring-slate-300', dot: 'bg-slate-500' },
  SUSPENDED:   { label: 'Suspended',       classes: 'bg-warning-bg text-warning ring-warning/20', dot: 'bg-warning' },
  TERMINATED:  { label: 'Terminated',      classes: 'bg-danger-bg text-danger ring-danger/20',    dot: 'bg-danger' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-slate-100 text-text-secondary ring-slate-300', dot: 'bg-slate-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cfg.classes}`}
      aria-label={cfg.label}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: 'success' | 'warning' | 'danger' | 'info';
  icon: ReactNode;
}

const ACCENT_MAP = {
  success: { bg: 'bg-success-bg', icon: 'text-success', num: 'text-text-primary' },
  warning: { bg: 'bg-warning-bg', icon: 'text-warning', num: 'text-text-primary' },
  danger:  { bg: 'bg-danger-bg',  icon: 'text-danger',  num: 'text-text-primary' },
  info:    { bg: 'bg-info-bg',    icon: 'text-info',    num: 'text-text-primary' },
};

export function StatCard({ label, value, sub, accent = 'info', icon }: StatCardProps) {
  const a = ACCENT_MAP[accent];
  return (
    <div className="bg-bg-surface rounded-card border border-border p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`rounded-badge p-2.5 ${a.bg}`}>
        <span className={`block w-6 h-6 ${a.icon}`}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-label font-semibold text-text-primary truncate">{label}</p>
        <p className={`text-stat mt-0.5 ${a.num}`}>{value}</p>
        {sub && <p className="text-label font-medium text-text-secondary mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_MAP = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-bg-surface rounded-card shadow-2xl w-full ${SIZE_MAP[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-heading text-text-primary">{title}</h2>
          <button onClick={onClose}
            className="rounded-badge p-1.5 text-text-tertiary hover:text-text-primary hover:bg-slate-100 transition-colors"
            aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, message, action }: {
  icon?: ReactNode; title: string; message: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-text-secondary mb-4 w-12 h-12">{icon}</div>}
      <h3 className="text-body font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-label font-medium text-text-primary max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return (
    <svg className={`animate-spin text-info ${s}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const BTN_VARIANT = {
  primary:   'bg-info text-white hover:bg-blue-700 focus-visible:ring-info disabled:bg-blue-300',
  secondary: 'bg-bg-surface text-text-primary border border-border hover:bg-slate-50 focus-visible:ring-slate-400',
  danger:    'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger disabled:bg-red-300',
  ghost:     'text-text-secondary hover:bg-slate-100 focus-visible:ring-slate-400',
};
const BTN_SIZE = {
  sm:  'px-3 py-1.5 text-xs gap-1.5',
  md:  'px-4 py-2 text-sm gap-2',
  lg:  'px-5 py-2.5 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-badge transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:cursor-not-allowed
        ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}>
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-label font-medium text-text-primary">{label}</label>}
      <input
        id={inputId}
        {...props}
        className={`block w-full rounded-badge border px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary
          focus:outline-none focus:ring-2 focus:ring-info focus:border-info
          disabled:bg-slate-50 disabled:cursor-not-allowed
          ${error ? 'border-danger bg-danger-bg' : 'border-border bg-bg-surface'}
          ${className}`}
      />
      {hint && !error && <p className="text-label font-medium text-text-secondary">{hint}</p>}
      {error && <p className="text-label text-danger">{error}</p>}
    </div>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, className = '', id, children, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={selectId} className="text-label font-medium text-text-primary">{label}</label>}
      <select
        id={selectId}
        {...props}
        className={`block w-full rounded-badge border px-3 py-2 text-body text-text-primary
          focus:outline-none focus:ring-2 focus:ring-info focus:border-info
          ${error ? 'border-danger bg-danger-bg' : 'border-border bg-bg-surface'}
          ${className}`}>
        {children}
      </select>
      {error && <p className="text-label text-danger">{error}</p>}
    </div>
  );
}

// ── Alert ──────────────────────────────────────────────────────────────────
export function Alert({ type = 'error', message, onRetry }: {
  type?: 'error' | 'info' | 'success';
  message: string;
  onRetry?: () => void;
}) {
  const styles = {
    error:   'bg-danger-bg border-danger/20 text-danger',
    info:    'bg-info-bg border-info/20 text-info',
    success: 'bg-success-bg border-success/20 text-success',
  };
  return (
    <div className={`flex items-center gap-3 rounded-card border px-4 py-3 text-body ${styles[type]}`}>
      <span className="flex-1 font-medium">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-medium underline hover:no-underline">Retry</button>}
    </div>
  );
}

// ── PulseStrip ─────────────────────────────────────────────────────────────
export function PulseStrip({ active = true }: { active?: boolean }) {
  return (
    <div className="h-0.5 w-full bg-slate-100 overflow-hidden">
      {active && (
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-info to-transparent
          animate-[pulse-slide_2s_ease-in-out_infinite]" />
      )}
    </div>
  );
}
