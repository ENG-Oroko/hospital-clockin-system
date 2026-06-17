'use client';
import { useEffect, useState, useCallback } from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { StatusBadge, Spinner, Alert, EmptyState, Button, Input, Select } from '@/components/ui';
import { attendanceApi, employeeApi, getCurrentUser } from '@/lib/api';
import type { AttendanceSummary } from '@/types';

const fmt = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
const todayStr = () => new Date().toISOString().split('T')[0];
const monthStartStr = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
};

export default function AttendancePage() {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    startDate: monthStartStr(),
    endDate: todayStr(),
    status: '',
    search: '',
  });

  const load = useCallback(async (depId: string) => {
    setLoading(true); setError('');
    try {
      const params: any = {
        departmentId: depId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page,
        limit: 50,
      };
      if (filters.status) params.status = filters.status;
      const data = await attendanceApi.getSummaries(params);
      setSummaries(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => {
    const raw = getCurrentUser();
    if (!raw) return;
    employeeApi.getById(raw.id || raw.sub).then((emp: any) => {
      setDeptId(emp.departmentId);
      if (emp.departmentId) load(emp.departmentId);
    });
  }, []); // eslint-disable-line

  useEffect(() => { if (deptId) load(deptId); }, [deptId, filters, page, load]);

  const displayed = filters.search
    ? summaries.filter(s =>
        `${s.user.firstName} ${s.user.lastName}`.toLowerCase().includes(filters.search.toLowerCase()))
    : summaries;

  const STATUS_OPTIONS = ['', 'PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'HALF_DAY', 'HOLIDAY', 'UNROSTERED'];

  return (
    <HODLayout title="Attendance" subtitle="Department attendance records">
      {error && <Alert type="error" message={error} onRetry={() => deptId && load(deptId)} />}

      {/* Filters */}
      <div className="bg-bg-surface rounded-card border border-border p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-36">
            <Input label="From" type="date" value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-36">
            <Input label="To" type="date" value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-36">
            <Select label="Status" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
            </Select>
          </div>
          <div className="flex-1 min-w-48">
            <Input label="Search name" placeholder="Filter by name…" value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <Button variant="secondary" size="md" onClick={() => {
            setFilters({ startDate: monthStartStr(), endDate: todayStr(), status: '', search: '' });
            setPage(1);
          }}>Reset</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-2xl font-bold text-text-primary">
            Attendance Records
            <span className="ml-2 text-base font-semibold text-text-primary">({total} total)</span>
          </h3>
          <a href="/hod/attendance/daily" className="text-sm text-info hover:text-blue-700 font-bold transition-colors">
            Daily view →
          </a>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : displayed.length === 0 ? (
          <EmptyState
            title="No records found"
            message="Try adjusting your date range or status filter."
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {['Employee', 'Date', 'Shift', 'Status', 'Clock In', 'Clock Out', 'Hours', 'Late (min)', 'OT (hrs)'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold text-text-primary text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayed.map(s => (
                    <tr key={s.id}
                      className="hover:bg-info-bg/40 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/hod/attendance/${s.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-info-bg flex items-center justify-center flex-shrink-0">
                            <span className="text-info text-xs font-bold">
                              {s.user.firstName?.[0]}{s.user.lastName?.[0]}
                            </span>
                          </div>
                          <span className="font-semibold text-text-primary">{s.user.firstName} {s.user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-primary font-medium">{fmtDate(s.date)}</td>
                      <td className="px-4 py-3 text-text-primary font-medium">{s.shiftName ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 font-mono text-text-primary text-xs">{fmt(s.firstIn)}</td>
                      <td className="px-4 py-3 font-mono text-text-primary text-xs">{fmt(s.lastOut)}</td>
                      <td className="px-4 py-3 text-text-primary font-semibold">{s.totalHours != null ? `${s.totalHours.toFixed(1)}h` : '—'}</td>
                      <td className="px-4 py-3">
                        {s.lateMinutes > 0
                          ? <span className="text-warning font-bold">{s.lateMinutes}</span>
                          : <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.overtimeHours > 0
                          ? <span className="text-info font-bold">{s.overtimeHours.toFixed(1)}</span>
                          : <span className="text-text-secondary">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {total > 50 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border">
                <p className="text-sm font-bold text-text-primary">Page {page} of {Math.ceil(total / 50)}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </HODLayout>
  );
}
