'use client';
import { useEffect, useState } from 'react';
import { HODLayout } from '@/components/layout/HODLayout';
import { Button, EmptyState, Alert } from '@/components/ui';
import { auditLogApi, type HODActionLogEntry } from '@/lib/api';

const ACTION_ICON: Record<string, { bg: string; color: string }> = {
  ROSTER_ASSIGNED:         { bg: 'bg-info-bg',    color: 'text-info' },
  ROSTER_UNASSIGNED:       { bg: 'bg-slate-100',  color: 'text-text-secondary' },
  ROSTER_BULK_COPY:        { bg: 'bg-info-bg',    color: 'text-info' },
  EMPLOYEE_REGISTERED:     { bg: 'bg-success-bg', color: 'text-success' },
  EMPLOYEE_UPDATED:        { bg: 'bg-info-bg',    color: 'text-info' },
  EMPLOYEE_STATUS_CHANGED: { bg: 'bg-warning-bg', color: 'text-warning' },
  LEAVE_REJECTED:          { bg: 'bg-danger-bg',  color: 'text-danger' },
  ATTENDANCE_FLAGGED:      { bg: 'bg-warning-bg', color: 'text-warning' },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ActivityLogPage() {
  const [entries, setEntries] = useState<HODActionLogEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setEntries(auditLogApi.list());
  }, []);

  const handleClear = () => {
    auditLogApi.clear();
    setEntries([]);
    setConfirmClear(false);
  };

  return (
    <HODLayout title="My Activity" subtitle="A record of actions you've taken in this dashboard">
      <div className="mb-6">
        <Alert
          type="info"
          message="This log is stored only on this device/browser — it is not shared across devices and is not yet backed by the server. A durable, server-side audit trail is on the backend roadmap; this is a stand-in until that exists."
        />
      </div>

      <div className="bg-bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-heading font-semibold text-text-primary">
            Recent Actions
            <span className="ml-2 text-sm font-normal text-text-tertiary">({entries.length})</span>
          </h3>
          {entries.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-secondary">Clear all local history?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={handleClear}>Confirm Clear</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>Clear local history</Button>
            )
          )}
        </div>

        {entries.length === 0 ? (
          <EmptyState
            title="No activity recorded yet"
            message="Actions like roster assignments, employee updates, and leave rejections will appear here as you take them."
            icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        ) : (
          <ul className="divide-y divide-border">
            {entries.map(entry => {
              const cfg = ACTION_ICON[entry.action] ?? { bg: 'bg-slate-100', color: 'text-text-secondary' };
              return (
                <li key={entry.id} className="px-6 py-4 flex items-start gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                    <span className={`w-4 h-4 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{entry.description}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{timeAgo(entry.timestamp)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </HODLayout>
  );
}
