'use client';
import { useEffect, useState, useCallback } from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { StatusBadge, Spinner, Alert, Button, Modal, Select, EmptyState } from '@/components/ui';
import { leaveApi, employeeApi, getCurrentUser, auditLogApi } from '@/lib/api';
import type { LeaveRequest, Employee, LeaveStatus } from '@/types';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });

function daysBetween(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

export default function LeavePage() {
  const [leaves, setLeaves]       = useState<LeaveRequest[]>([]);
  const [staffMap, setStaffMap]   = useState<Record<string, Employee>>({});
  const [deptId, setDeptId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusFilter, setStatus] = useState<LeaveStatus | ''>('');

  // Detail / reject modal
  const [selected, setSelected]       = useState<LeaveRequest | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason]     = useState('');
  const [rejecting, setRejecting]     = useState(false);
  const [rejectError, setRejectError] = useState('');

  const load = useCallback(async (depId: string) => {
    setLoading(true); setError('');
    try {
      // Get department staff first — we need their IDs to scope leave queries
      const staffData = await employeeApi.list({ departmentId: depId });
      const staffList: Employee[] = staffData.data || staffData.items || [];
      const map: Record<string, Employee> = {};
      staffList.forEach(e => { map[e.id] = e; });
      setStaffMap(map);

      // Fetch leave requests scoped to this department's staff only — avoids pulling
      // the entire tenant's leave table over the wire (see leaveApi.getByDepartmentStaff
      // for why GET /leaves alone isn't department-scoped on the backend yet).
      const leaveData = await leaveApi.getByDepartmentStaff(
        staffList.map(e => e.id),
        statusFilter || undefined,
      );
      setLeaves(leaveData.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    const raw = getCurrentUser();
    if (!raw) return;
    employeeApi.getById(raw.id || raw.sub).then((emp: any) => {
      setDeptId(emp.departmentId);
      if (emp.departmentId) load(emp.departmentId);
    });
  }, []); // eslint-disable-line

  useEffect(() => { if (deptId) load(deptId); }, [deptId, statusFilter, load]);

  const handleReject = async () => {
    if (!selected) return;
    setRejecting(true); setRejectError('');
    try {
      await leaveApi.updateStatus(selected.id, 'REJECTED', rejectReason || undefined);
      const emp = staffMap[selected.employeeId];
      auditLogApi.log(
        'LEAVE_REJECTED',
        `Rejected ${emp ? `${emp.firstName} ${emp.lastName}'s` : 'a'} ${selected.leaveType?.replace('_', ' ').toLowerCase()} request`,
      );
      setSelected(null);
      setShowRejectForm(false);
      setRejectReason('');
      if (deptId) load(deptId);
    } catch (e: any) { setRejectError(e.message); }
    finally { setRejecting(false); }
  };

  const closeModal = () => {
    setSelected(null);
    setShowRejectForm(false);
    setRejectReason('');
    setRejectError('');
  };

  const STATUS_OPTIONS: (LeaveStatus | '')[] = ['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

  return (
    <HODLayout title="Leave Requests" subtitle="Review your department's leave requests">
      {error && <Alert type="error" message={error} onRetry={() => deptId && load(deptId)} />}

      <div className="mb-6">
        <Alert type="info" message="As Head of Department, you can review and reject pending requests. Final approval is handled by HR." />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="w-44">
          <Select value={statusFilter} onChange={e => setStatus(e.target.value as LeaveStatus | '')}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </Select>
        </div>
        <p className="text-sm font-medium text-text-secondary">{leaves.length} request{leaves.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : leaves.length === 0 ? (
        <EmptyState
          title="No leave requests"
          message="There are no leave requests matching this filter in your department."
          icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
        />
      ) : (
        <div className="bg-bg-surface rounded-card border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Employee', 'Type', 'From', 'To', 'Days', 'Status', 'Requested', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaves.map(l => {
                  const emp = staffMap[l.employeeId];
                  return (
                    <tr key={l.id} className="hover:bg-info-bg/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-info-bg flex items-center justify-center flex-shrink-0">
                            <span className="text-info text-xs font-bold">
                              {emp?.firstName?.[0]}{emp?.lastName?.[0]}
                            </span>
                          </div>
                          <span className="font-semibold text-text-primary">
                            {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-medium">{l.leaveType?.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-text-secondary font-medium">{fmtDate(l.startDate)}</td>
                      <td className="px-4 py-3 text-text-secondary font-medium">{fmtDate(l.endDate)}</td>
                      <td className="px-4 py-3 text-text-secondary font-medium">{daysBetween(l.startDate, l.endDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3 text-text-tertiary text-xs">{fmtDate(l.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(l)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail / Reject Modal */}
      <Modal open={!!selected} onClose={closeModal} title="Leave Request Details" size="md">
        {selected && (
          <div className="space-y-4">
            {rejectError && <Alert type="error" message={rejectError} />}

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-primary">
                  {staffMap[selected.employeeId]?.firstName} {staffMap[selected.employeeId]?.lastName}
                </p>
                <p className="text-xs text-text-secondary">{staffMap[selected.employeeId]?.payrollNumber}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase">Leave Type</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{selected.leaveType?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase">Duration</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{daysBetween(selected.startDate, selected.endDate)} days</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase">From</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{fmtDate(selected.startDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase">To</p>
                <p className="text-sm font-semibold text-text-primary mt-1">{fmtDate(selected.endDate)}</p>
              </div>
            </div>

            {selected.reason && (
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Reason</p>
                <p className="text-sm text-text-primary bg-slate-50 rounded-lg p-3">{selected.reason}</p>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              {selected.status === 'PENDING' ? (
                showRejectForm ? (
                  <div className="space-y-3">
                    <p className="text-xs text-text-secondary font-medium">
                      Add a note explaining the rejection. HR and the employee will see this.
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="e.g. Department is short-staffed during this period…"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary
                        focus:outline-none focus:ring-2 focus:ring-info focus:border-info" />
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setShowRejectForm(false)}>
                        Back
                      </Button>
                      <Button variant="danger" size="sm" onClick={handleReject} loading={rejecting}>
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-text-secondary">
                      Approval is processed by HR. You may reject this request.
                    </p>
                    <Button variant="danger" onClick={() => setShowRejectForm(true)}>
                      Reject Request
                    </Button>
                  </div>
                )
              ) : (
                <p className="text-xs text-text-secondary">
                  This request has already been {selected.status.toLowerCase()} and can no longer be modified.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </HODLayout>
  );
}
