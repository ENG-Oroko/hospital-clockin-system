import React from 'react';
import { AlertCircle, AlertTriangle, XCircle, Info, CheckCircle } from 'lucide-react';
import { alerts } from '../data/mockData';

const ICONS = { AlertCircle, AlertTriangle, XCircle, Info, CheckCircle };

const colorStyles = {
  red:   { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)'  },
  amber: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  blue:  { bg: 'var(--color-info-bg)',    color: 'var(--color-info)'    },
  green: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
};

export default function AlertList() {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Recent Alerts</div>
          <div className="card-subtitle">Live system notifications</div>
        </div>
        <span className="card-action" role="link" tabIndex={0} aria-label="View all alerts">View All</span>
      </div>

      <ul className="alert-list" aria-label="Recent alerts">
        {alerts.map(alert => {
          const Icon = ICONS[alert.icon];
          const styles = colorStyles[alert.color];
          return (
            <li key={alert.id} className="alert-item">
              <div
                className="alert-icon"
                style={{ background: styles.bg, color: styles.color }}
                aria-hidden="true"
              >
                <Icon size={16} />
              </div>
              <div className="alert-body">
                <div className="alert-title">{alert.title}</div>
                <div className="alert-desc">{alert.desc}</div>
              </div>
              <div className="alert-meta">
                <time>{alert.time}</time>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}