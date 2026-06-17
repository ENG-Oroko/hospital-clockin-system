'use client';
import { useEffect, useState, useCallback } from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { Button, Input, Select, Spinner, Alert, Modal, EmptyState } from '@/components/ui';
import { reportsApi, employeeApi, getCurrentUser } from '@/lib/api';
import { exportReportToExcel, exportReportToPDF } from '@/lib/export';
import type { CompiledReport } from '@/types';

const HOD_REPORT_TYPES = [
  { value: 'MONTHLY_ATTENDANCE', label: 'Monthly Attendance', desc: 'Per-employee daily breakdown with status and hours' },
  { value: 'LATENESS_AUDIT',     label: 'Lateness Audit',     desc: 'All late arrivals, worst offenders first' },
  { value: 'ABSENCE_AUDIT',      label: 'Absence Audit',      desc: 'All unexcused absences with top absentees' },
  { value: 'OVERTIME_AUDIT',     label: 'Overtime Audit',     desc: 'All overtime hours logged, highest first' },
];

const MAX_DAYS = 93;
const todayStr = () => new Date().toISOString().split('T')[0];
const monthStartStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

export default function ReportsPage() {
  const [deptId, setDeptId]       = useState<string | null>(null);
  const [reports, setReports]     = useState<CompiledReport[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [form, setForm] = useState({
    reportType: 'MONTHLY_ATTENDANCE',
    startDate: monthStartStr(),
    endDate: todayStr(),
  });
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState('');
  const [rangeError, setRangeError]   = useState('');

  const [viewing, setViewing] = useState<CompiledReport | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await reportsApi.list({ page: 1, limit: 25 });
      setReports(data.data || data.items || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const raw = getCurrentUser();
    if (!raw) return;
    employeeApi.getById(raw.id || raw.sub).then((emp: any) => setDeptId(emp.departmentId));
    load();
  }, [load]);

  useEffect(() => {
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (end < start) setRangeError('End date must be on or after start date.');
    else if (diffDays > MAX_DAYS) setRangeError(`Range cannot exceed ${MAX_DAYS} days.`);
    else setRangeError('');
  }, [form.startDate, form.endDate]);

  const handleGenerate = async () => {
    if (rangeError) return;
    if (!deptId) { setGenError('Could not determine your department.'); return; }
    setGenerating(true); setGenError('');
    try {
      const result = await reportsApi.generate({
        reportType: form.reportType,
        startDate: form.startDate,
        endDate: form.endDate,
        departmentId: deptId,
      });
      setReports(prev => [result, ...prev]);
      setViewing(result);
    } catch (e: any) { setGenError(e.message); }
    finally { setGenerating(false); }
  };

  const handleView = async (report: CompiledReport) => {
    if (report.compiledData) { setViewing(report); return; }
    setViewLoading(true);
    try {
      const full = await reportsApi.getById(report.id);
      setViewing(full);
    } catch (e: any) { setError(e.message); }
    finally { setViewLoading(false); }
  };

  return (
    <HODLayout title="Reports" subtitle="Generate attendance reports for your department">
      {error && <Alert type="error" message={error} onRetry={load} />}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Generator panel */}
        <div className="bg-bg-surface rounded-card border border-border shadow-sm p-6 lg:col-span-1 h-fit">
          <h3 className="text-heading font-semibold text-text-primary mb-4">Generate Report</h3>

          {genError && <div className="mb-4"><Alert type="error" message={genError} /></div>}

          <div className="space-y-4">
            <Select label="Report Type" value={form.reportType}
              onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}>
              {HOD_REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <p className="text-xs text-text-secondary -mt-2 font-medium">
              {HOD_REPORT_TYPES.find(t => t.value === form.reportType)?.desc}
            </p>

            <Input label="Start Date" type="date" value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              error={rangeError} />

            <Button onClick={handleGenerate} loading={generating} disabled={!!rangeError} className="w-full">
              Generate Report
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="bg-bg-surface rounded-card border border-border shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-heading font-semibold text-text-primary">Report History</h3>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : reports.length === 0 ? (
            <EmptyState
              title="No reports yet"
              message="Generate your first department report using the panel on the left."
              icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {['Type', 'Date Range', 'Generated', 'By', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-info-bg/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-text-primary">
                        {HOD_REPORT_TYPES.find(t => t.value === r.reportType)?.label ?? r.reportType}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs font-medium">{r.dateRangeStart} → {r.dateRangeEnd}</td>
                      <td className="px-4 py-3 text-text-tertiary text-xs">
                        {new Date(r.createdAt).toLocaleDateString('en-KE')}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs font-medium">
                        {r.generatedBy?.firstName} {r.generatedBy?.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleView(r)} loading={viewLoading}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Report Viewer Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)}
        title={HOD_REPORT_TYPES.find(t => t.value === viewing?.reportType)?.label ?? 'Report'} size="xl">
        {viewing?.compiledData && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary font-medium">
                {viewing.compiledData.rows.length} record{viewing.compiledData.rows.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => exportReportToExcel(viewing)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export Excel
                </Button>
                <Button variant="secondary" size="sm" onClick={() => exportReportToPDF(viewing)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.055 48.055 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                  </svg>
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(viewing.compiledData.summary)
                .filter(([k]) => k !== 'dateRange' && k !== 'statusBreakdown' && k !== 'topAbsentees')
                .map(([key, value]) => (
                  <div key={key} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-text-secondary uppercase tracking-wide font-semibold">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-lg font-bold text-text-primary mt-1">{String(value)}</p>
                  </div>
                ))}
            </div>

            {/* Rows table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50">
                      {viewing.compiledData.rows.length > 0 &&
                        Object.keys(viewing.compiledData.rows[0]).map(k => (
                          <th key={k} className="px-3 py-2 text-left font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap">
                            {k.replace(/([A-Z])/g, ' $1').trim()}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewing.compiledData.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-info-bg/40">
                        {Object.values(row).map((v: any, j) => (
                          <td key={j} className="px-3 py-2 text-text-primary whitespace-nowrap">{String(v ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-text-secondary text-center">
              {viewing.compiledData.rows.length} row{viewing.compiledData.rows.length !== 1 ? 's' : ''} ·
              Generated {new Date(viewing.createdAt).toLocaleString('en-KE')}
            </p>
          </div>
        )}
      </Modal>
    </HODLayout>
  );
}
