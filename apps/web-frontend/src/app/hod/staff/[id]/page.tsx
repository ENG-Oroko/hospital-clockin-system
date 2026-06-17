'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { HODLayout } from '@/components/layout/HODLayout';
import { StatusBadge, Spinner, Alert, Button } from '@/components/ui';
import { employeeApi, attendanceApi } from '@/lib/api';
import type { Employee, AttendanceSummary } from '@/types';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
const monthStartStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
const todayStr = () => new Date().toISOString().split('T')[0];

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    employeeApi.getById(id)
      .then(async (emp: Employee) => {
        setEmployee(emp);
        try {
          const att = await attendanceApi.getSummaries({
            userId: id, startDate: monthStartStr(), endDate: todayStr(), limit: 30,
          });
          setHistory(att.data || []);
        } catch { /* attendance history is supplementary, fail silently */ }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <HODLayout title="Staff Profile">
      <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
    </HODLayout>
  );

  if (error || !employee) return (
    <HODLayout title="Staff Profile">
      <Alert type="error" message={error || 'Employee not found.'} />
      <Button variant="secondary" className="mt-4" onClick={() => window.history.back()}>← Back</Button>
    </HODLayout>
  );

  const presentDays = history.filter(h => h.status === 'PRESENT').length;
  const lateDays    = history.filter(h => h.status === 'LATE').length;
  const absentDays  = history.filter(h => h.status === 'ABSENT').length;
  const totalHours  = history.reduce((sum, h) => sum + (h.totalHours ?? 0), 0);

  return (
    <HODLayout title="Staff Profile" subtitle={`${employee.firstName} ${employee.lastName}`}>
      <Button variant="secondary" size="sm" onClick={() => window.history.back()} className="mb-6">
        ← Back to Staff
      </Button>

      {/* Profile Header */}
      <div className="bg-bg-surface rounded-card border border-border shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center">
              <span className="text-info text-2xl font-bold">
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-sm text-text-secondary">{employee.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-mono text-xs bg-slate-100 text-text-secondary px-2 py-0.5 rounded">
                  {employee.employeeCode}
                </span>
                <span className="font-mono text-xs bg-slate-100 text-text-secondary px-2 py-0.5 rounded">
                  {employee.payrollNumber}
                </span>
              </div>
            </div>
          </div>
          <StatusBadge status={employee.employmentStatus} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Department</p>
            <p className="text-sm font-semibold text-text-primary mt-1">{employee.department?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Employment Type</p>
            <p className="text-sm font-semibold text-text-primary mt-1">{employee.employmentType?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Phone</p>
            <p className="text-sm font-semibold text-text-primary mt-1">{employee.phoneNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Hourly Rate</p>
            <p className="text-sm font-semibold text-text-primary mt-1">KES {employee.hourlyRate?.toLocaleString() ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* 30-day stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-surface rounded-card border border-border p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-success">{presentDays}</p>
          <p className="text-xs text-text-secondary mt-1 font-medium">Present (30d)</p>
        </div>
        <div className="bg-bg-surface rounded-card border border-border p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-warning">{lateDays}</p>
          <p className="text-xs text-text-secondary mt-1 font-medium">Late (30d)</p>
        </div>
        <div className="bg-bg-surface rounded-card border border-border p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-danger">{absentDays}</p>
          <p className="text-xs text-text-secondary mt-1 font-medium">Absent (30d)</p>
        </div>
        <div className="bg-bg-surface rounded-card border border-border p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-info">{totalHours.toFixed(0)}h</p>
          <p className="text-xs text-text-secondary mt-1 font-medium">Total Hours (30d)</p>
        </div>
      </div>

      {/* Attendance history table */}
      <div className="bg-bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-heading font-semibold text-text-primary">Recent Attendance</h3>
        </div>
        {history.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-text-secondary">
            No attendance records in the last 30 days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Date', 'Status', 'Clock In', 'Clock Out', 'Hours'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-info-bg/40 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/hod/attendance/${h.id}`}>
                    <td className="px-4 py-3 text-text-secondary font-medium">{fmtDate(h.date)}</td>
                    <td className="px-4 py-3"><StatusBadge status={h.status} /></td>
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">
                      {h.firstIn ? new Date(h.firstIn).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-primary">
                      {h.lastOut ? new Date(h.lastOut).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium">{h.totalHours != null ? `${h.totalHours.toFixed(1)}h` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HODLayout>
  );
}
