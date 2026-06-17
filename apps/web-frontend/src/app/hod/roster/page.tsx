'use client';
import { useEffect, useState, useCallback } from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { Button, Modal, Select, Input, Spinner, Alert, StatusBadge, EmptyState } from '@/components/ui';
import { rosterApi, employeeApi, getCurrentUser, apiFetch, auditLogApi } from '@/lib/api';
import type { ShiftTemplate, Employee, AuthUser } from '@/types';

function weekDates(offset = 0): Date[] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const fmt = (d: Date) => d.toISOString().split('T')[0];
const dayLabel = (d: Date) => d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' });

const SHIFT_COLORS: Record<string, string> = {
  MORNING:   'bg-warning-bg text-warning border-warning/20',
  AFTERNOON: 'bg-info-bg text-info border-info/20',
  NIGHT:     'bg-danger-bg text-danger border-danger/20',
  FLEXIBLE:  'bg-success-bg text-success border-success/20',
  CUSTOM:    'bg-slate-100 text-text-secondary border-slate-200',
};

export default function RosterPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [staff, setStaff] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assign modal state
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeIds: [] as string[], shiftId: '',
    effectiveFrom: '', effectiveTo: '', reason: '',
  });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Unassign modal
  const [unassignModal, setUnassignModal] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<{ shiftId: string; employeeId: string; date: string } | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  // Bulk "copy last week" operation
  const [copyModal, setCopyModal] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [previousWeekAssignments, setPreviousWeekAssignments] = useState<any[]>([]);

  const dates = weekDates(weekOffset);

  const load = useCallback(async (depId: string) => {
    setLoading(true); setError('');
    try {
      const start = fmt(dates[0]);
      const end = fmt(dates[6]);
      const prevStart = new Date(dates[0]); prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(dates[6]); prevEnd.setDate(prevEnd.getDate() - 7);

      const [shiftsData, staffData, summaryData, prevSummaryData] = await Promise.all([
        rosterApi.listShifts({ isActive: true }),
        employeeApi.list({ departmentId: depId, employmentStatus: 'ACTIVE' }),
        apiFetch(`/attendance/summaries?departmentId=${depId}&startDate=${start}&endDate=${end}&limit=500`),
        apiFetch(`/attendance/summaries?departmentId=${depId}&startDate=${fmt(prevStart)}&endDate=${fmt(prevEnd)}&limit=500`)
          .catch(() => ({ data: [] })), // last-week hint is best-effort; don't fail the page if it errors
      ]);
      setShifts(shiftsData.data || shiftsData.items || []);
      setStaff(staffData.data || staffData.items || []);
      setAssignments(summaryData.data || []);
      setPreviousWeekAssignments(prevSummaryData.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [weekOffset]); // eslint-disable-line

  useEffect(() => {
    const raw = getCurrentUser();
    if (!raw) return;
    employeeApi.getById(raw.id || raw.sub).then((emp: any) => {
      setDeptId(emp.departmentId);
      if (emp.departmentId) load(emp.departmentId);
    });
  }, [load]);

  useEffect(() => { if (deptId) load(deptId); }, [weekOffset, deptId, load]);

  const getAssignment = (userId: string, date: Date) => {
    const d = fmt(date);
    return assignments.find(a => a.userId === userId && a.date?.startsWith(d));
  };

  /**
   * Looks up what shift this employee had on the same weekday the previous week.
   * This is a hint, not a guaranteed "expected shift" — the schema has no concept
   * of a recurring or default shift per employee, only actual past assignments.
   * Labeled as "Last week" in the UI so it's never mistaken for a scheduling rule.
   */
  const getLastWeekHint = (userId: string, date: Date) => {
    const prevDate = new Date(date); prevDate.setDate(prevDate.getDate() - 7);
    const d = fmt(prevDate);
    return previousWeekAssignments.find(a => a.userId === userId && a.date?.startsWith(d));
  };

  const handleAssign = async () => {
    if (!assignForm.shiftId || assignForm.employeeIds.length === 0 || !assignForm.effectiveFrom) {
      setAssignError('Shift, at least one employee, and start date are required.'); return;
    }
    setAssigning(true); setAssignError('');
    try {
      const shiftName = shifts.find(s => s.id === assignForm.shiftId)?.name ?? 'shift';
      await rosterApi.assignEmployees(assignForm.shiftId, {
        employeeIds: assignForm.employeeIds,
        departmentId: deptId,
        effectiveFrom: assignForm.effectiveFrom,
        effectiveTo: assignForm.effectiveTo || assignForm.effectiveFrom,
        reason: assignForm.reason || undefined,
      });
      auditLogApi.log(
        'ROSTER_ASSIGNED',
        `Assigned ${assignForm.employeeIds.length} employee${assignForm.employeeIds.length > 1 ? 's' : ''} to ${shiftName} (${assignForm.effectiveFrom} → ${assignForm.effectiveTo || assignForm.effectiveFrom})`,
      );
      setAssignModal(false);
      setAssignForm({ employeeIds: [], shiftId: '', effectiveFrom: '', effectiveTo: '', reason: '' });
      if (deptId) load(deptId);
    } catch (e: any) { setAssignError(e.message); }
    finally { setAssigning(false); }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    setUnassigning(true);
    try {
      const emp = staff.find(s => s.id === unassignTarget.employeeId);
      await rosterApi.unassignEmployees(unassignTarget.shiftId, {
        employeeIds: [unassignTarget.employeeId],
        effectiveFrom: unassignTarget.date,
        effectiveTo: unassignTarget.date,
        reason: 'Unassigned by HOD',
      });
      auditLogApi.log(
        'ROSTER_UNASSIGNED',
        `Removed ${emp ? `${emp.firstName} ${emp.lastName}` : 'an employee'} from their shift on ${unassignTarget.date}`,
      );
      setUnassignModal(false);
      if (deptId) load(deptId);
    } catch (e: any) { setError(e.message); }
    finally { setUnassigning(false); }
  };

  /**
   * Bulk roster operation: copies every assignment from the immediately preceding
   * week onto the current week, shift-for-shift, employee-for-employee, shifted
   * forward by exactly 7 days. Addresses the most common HOD complaint with
   * one-at-a-time assignment — recreating a recurring rotation pattern.
   *
   * This calls assignEmployees once per distinct shift+employee combination found
   * in last week's data, since the backend's assign endpoint takes one shift at a
   * time. For a department of 20 staff on a simple 2-shift rotation, that's a
   * small, fast batch of calls — not a single bulk endpoint, because no such
   * endpoint exists on the backend yet.
   */
  const handleCopyLastWeek = async () => {
    setCopying(true); setCopyError('');
    try {
      const prevStart = new Date(dates[0]); prevStart.setDate(prevStart.getDate() - 7);
      const prevEnd = new Date(dates[6]); prevEnd.setDate(prevEnd.getDate() - 7);
      const prevData = await apiFetch(
        `/attendance/summaries?departmentId=${deptId}&startDate=${fmt(prevStart)}&endDate=${fmt(prevEnd)}&limit=500`,
      );
      const prevAssignments = prevData.data || [];
      setPreviousWeekAssignments(prevAssignments);

      if (prevAssignments.length === 0) {
        setCopyError('No assignments found in the previous week to copy.');
        setCopying(false);
        return;
      }

      // Group by shiftId so each shift gets one assignEmployees call covering all its staff
      const byShift: Record<string, { employeeIds: string[]; dates: string[] }> = {};
      prevAssignments.forEach((a: any) => {
        const shiftId = a.shift?.id || a.shiftId;
        if (!shiftId) return;
        const prevDate = new Date(a.date);
        const newDate = new Date(prevDate); newDate.setDate(newDate.getDate() + 7);
        const newDateStr = fmt(newDate);
        if (!byShift[shiftId]) byShift[shiftId] = { employeeIds: [], dates: [] };
        if (!byShift[shiftId].employeeIds.includes(a.userId)) byShift[shiftId].employeeIds.push(a.userId);
        if (!byShift[shiftId].dates.includes(newDateStr)) byShift[shiftId].dates.push(newDateStr);
      });

      let totalAssigned = 0;
      for (const [shiftId, group] of Object.entries(byShift)) {
        const sortedDates = group.dates.sort();
        await rosterApi.assignEmployees(shiftId, {
          employeeIds: group.employeeIds,
          departmentId: deptId,
          effectiveFrom: sortedDates[0],
          effectiveTo: sortedDates[sortedDates.length - 1],
          reason: 'Copied forward from previous week by HOD',
        });
        totalAssigned += group.employeeIds.length;
      }

      auditLogApi.log(
        'ROSTER_BULK_COPY',
        `Copied last week's roster pattern forward to ${dayLabel(dates[0])}–${dayLabel(dates[6])} (${totalAssigned} assignment${totalAssigned !== 1 ? 's' : ''})`,
      );
      setCopyModal(false);
      if (deptId) load(deptId);
    } catch (e: any) { setCopyError(e.message); }
    finally { setCopying(false); }
  };

  const handlePrintRoster = () => {
    window.print();
  };

  const toggleEmployee = (id: string) =>
    setAssignForm(f => ({
      ...f, employeeIds: f.employeeIds.includes(id)
        ? f.employeeIds.filter(e => e !== id)
        : [...f.employeeIds, id],
    }));

  return (
    <HODLayout title="Roster" subtitle="Assign staff to shifts for the week">
      {error && <Alert type="error" message={error} onRetry={() => deptId && load(deptId)} />}

      {/* Controls */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</Button>
          <span className="text-sm font-semibold text-text-primary px-3">
            {dayLabel(dates[0])} — {dayLabel(dates[6])}, {dates[0].getFullYear()}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePrintRoster}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.055 48.055 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            Print Roster
          </Button>
          <Button variant="secondary" onClick={() => { setCopyError(''); setCopyModal(true); }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25v8.25A2.25 2.25 0 0118 21h-7.5a2.25 2.25 0 01-2.25-2.25v-2.25" />
            </svg>
            Copy Last Week
          </Button>
          <Button onClick={() => {
            setAssignForm({ employeeIds: [], shiftId: '', effectiveFrom: fmt(dates[0]), effectiveTo: fmt(dates[6]), reason: '' });
            setAssignModal(true);
          }}>
            + Assign to Shift
          </Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-bold text-text-primary">Department Roster</h1>
        <p className="text-sm text-text-secondary">{dayLabel(dates[0])} — {dayLabel(dates[6])}, {dates[0].getFullYear()}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : staff.length === 0 ? (
        <EmptyState title="No active staff" message="No active employees found in your department." />
      ) : (
        <div className="bg-bg-surface rounded-card border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-wide w-44">
                    Staff Member
                  </th>
                  {dates.map(d => (
                    <th key={d.toISOString()}
                      className={`px-2 py-3 text-center font-semibold text-xs uppercase tracking-wide
                        ${fmt(d) === fmt(new Date()) ? 'text-info' : 'text-text-secondary'}`}>
                      {dayLabel(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staff.map(emp => (
                  <tr key={emp.id} className="hover:bg-info-bg/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-info-bg flex items-center justify-center flex-shrink-0">
                          <span className="text-info text-xs font-bold">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-xs truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-text-secondary text-xs">{emp.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    {dates.map(d => {
                      const a = getAssignment(emp.id, d);
                      return (
                        <td key={d.toISOString()} className="px-2 py-3 text-center">
                          {a ? (
                            <button
                              onClick={() => {
                                setUnassignTarget({ shiftId: a.shift?.id || a.shiftId || '', employeeId: emp.id, date: fmt(d) });
                                setUnassignModal(true);
                              }}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium
                                border hover:opacity-80 transition-opacity
                                ${SHIFT_COLORS[a.shift?.type || 'CUSTOM']}`}
                              title={`${a.shiftName || a.shift?.name} — click to unassign`}>
                              {a.shiftName || a.shift?.name || 'Assigned'}
                            </button>
                          ) : (
                            (() => {
                              const hint = getLastWeekHint(emp.id, d);
                              return (
                                <button
                                  onClick={() => {
                                    setAssignForm(f => ({
                                      ...f,
                                      employeeIds: [emp.id],
                                      shiftId: hint?.shift?.id || hint?.shiftId || '',
                                      effectiveFrom: fmt(d),
                                      effectiveTo: fmt(d),
                                    }));
                                    setAssignModal(true);
                                  }}
                                  title={hint ? `Last week: ${hint.shiftName || hint.shift?.name}` : 'No shift assigned — click to assign'}
                                  className={`rounded-md border border-dashed transition-all flex items-center justify-center mx-auto
                                    ${hint
                                      ? 'w-auto px-2 py-1 gap-1 border-slate-300 text-text-secondary hover:border-info hover:text-info hover:bg-info-bg'
                                      : 'w-7 h-7 border-slate-300 text-text-tertiary hover:border-info hover:text-info hover:bg-info-bg'}`}>
                                  {hint ? (
                                    <span className="text-[10px] leading-none whitespace-nowrap">
                                      + <span className="opacity-70">{hint.shiftName || hint.shift?.name}?</span>
                                    </span>
                                  ) : '+'}
                                </button>
                              );
                            })()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift legend */}
      {shifts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {shifts.slice(0, 6).map(s => (
            <span key={s.id} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border ${SHIFT_COLORS[s.type] || SHIFT_COLORS.CUSTOM}`}>
              {s.name} · {s.startTime}–{s.endTime}
            </span>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign to Shift" size="lg">
        <div className="space-y-4">
          {assignError && <Alert type="error" message={assignError} />}

          <Select label="Shift Template" value={assignForm.shiftId}
            onChange={e => setAssignForm(f => ({ ...f, shiftId: e.target.value }))}>
            <option value="">Select a shift…</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime}–{s.endTime}) · {s.gracePeriodMinutes}min grace
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input label="From Date" type="date" value={assignForm.effectiveFrom}
              onChange={e => setAssignForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
            <Input label="To Date (optional)" type="date" value={assignForm.effectiveTo}
              onChange={e => setAssignForm(f => ({ ...f, effectiveTo: e.target.value }))} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Select Staff</p>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {staff.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox"
                    checked={assignForm.employeeIds.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                  <span className="text-sm text-slate-900">{emp.firstName} {emp.lastName}</span>
                  <span className="text-xs text-slate-400 ml-auto">{emp.employeeCode}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">{assignForm.employeeIds.length} selected</p>
          </div>

          <Input label="Reason (optional)" placeholder="e.g. Cover for annual leave"
            value={assignForm.reason}
            onChange={e => setAssignForm(f => ({ ...f, reason: e.target.value }))} />

          <div className="flex gap-2 pt-2 justify-end">
            <Button variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} loading={assigning}>Assign Staff</Button>
          </div>
        </div>
      </Modal>

      {/* Unassign Modal */}
      <Modal open={unassignModal} onClose={() => setUnassignModal(false)} title="Remove from Shift" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Remove this employee from their shift on{' '}
            <span className="font-medium text-slate-900">{unassignTarget?.date}</span>?
            This will be logged in the roster history.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setUnassignModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleUnassign} loading={unassigning}>Remove from Shift</Button>
          </div>
        </div>
      </Modal>

      {/* Copy Last Week Modal */}
      <Modal open={copyModal} onClose={() => setCopyModal(false)} title="Copy Last Week's Roster" size="md">
        <div className="space-y-4">
          {copyError && <Alert type="error" message={copyError} />}
          <p className="text-sm text-slate-600">
            This copies every shift assignment from last week (
            {dayLabel((() => { const d = new Date(dates[0]); d.setDate(d.getDate() - 7); return d; })())}
            {' – '}
            {dayLabel((() => { const d = new Date(dates[6]); d.setDate(d.getDate() - 7); return d; })())}
            ) forward onto this week, same employees, same shifts, shifted by exactly 7 days.
          </p>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            Existing assignments already on this week won&apos;t be removed — this only adds new ones.
            Review the roster afterward in case anyone needs adjusting (leave, role change, etc.).
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCopyModal(false)}>Cancel</Button>
            <Button onClick={handleCopyLastWeek} loading={copying}>Copy Forward</Button>
          </div>
        </div>
      </Modal>
    </HODLayout>
  );
}
