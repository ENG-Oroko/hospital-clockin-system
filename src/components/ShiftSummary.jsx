import React from 'react';
import { Check, Calendar, X } from 'lucide-react';
import { shifts } from '../data/mockData';

const statusPills = [
  { label: 'Present 986', type: 'present', Icon: Check },
  { label: 'On Leave 174', type: 'leave', Icon: Calendar },
  { label: 'Absent 88', type: 'absent', Icon: X },
];

const pillStyles = {
  present: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  leave:   { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  absent:  { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)'  },
};

export default function ShiftSummary() {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Today's Shifts</div>
          <div className="card-subtitle">Active shift coverage</div>
        </div>
        <span className="card-action" role="link" tabIndex={0}>View All</span>
      </div>

      <ul className="shift-list" aria-label="Today's shift summary">
        {shifts.map(shift => (
          <li key={shift.name} className="shift-item">
            <div
              className="shift-color-bar"
              style={{ background: shift.color }}
              aria-hidden="true"
            />
            <div className="shift-info">
              <div className="shift-name">{shift.name}</div>
              <div className="shift-time">{shift.time}</div>
            </div>
            <div className="shift-count" aria-label={`${shift.count} staff`}>
              <div className="shift-count-val" style={{ color: shift.color }}>{shift.count}</div>
              <div className="shift-count-label">staff</div>
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)', fontWeight: 500 }}>
          Today's Status Breakdown
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }} role="list" aria-label="Attendance status summary">
          {statusPills.map(({ label, type, Icon }) => {
            const style = pillStyles[type];
            return (
              <span
                key={type}
                className="status-pill"
                style={{ background: style.bg, color: style.color }}
                role="listitem"
              >
                <Icon size={10} aria-hidden="true" />
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}