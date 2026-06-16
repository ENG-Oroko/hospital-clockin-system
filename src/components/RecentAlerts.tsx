// src/components/RecentAlerts.tsx
import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import Card from './Card';
import { alertsData, Severity } from '../data';

const severityConfig: Record<Severity, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  danger:  { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  icon: <AlertCircle  size={14} />, label: 'Critical' },
  warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', icon: <AlertTriangle size={14} />, label: 'Warning' },
  info:    { bg: 'var(--color-info-bg)',    color: 'var(--color-info)',    icon: <Info          size={14} />, label: 'Info'    },
  success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', icon: <CheckCircle  size={14} />, label: 'Good'    },
};

const RecentAlerts: React.FC = () => {
  const viewAll = (
    <a href="#" style={{ fontSize: 'var(--text-label)', color: 'var(--color-info)', fontWeight: 500 }}>
      View All
    </a>
  );

  return (
    <Card title="Recent Alerts" action={viewAll}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {alertsData.map((alert, i) => {
          const cfg = severityConfig[alert.severity];
          return (
            <div
              key={alert.id}
              style={{
                display:       'flex',
                gap:           'var(--space-3)',
                alignItems:    'flex-start',
                paddingBottom: 'var(--space-3)',
                borderBottom:  i < alertsData.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {/* Icon badge */}
              <div
                aria-label={cfg.label}
                style={{
                  width:          28,
                  height:         28,
                  borderRadius:   'var(--radius-badge)',
                  background:     cfg.bg,
                  color:          cfg.color,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}
              >
                {cfg.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                  {alert.title}
                </p>
                <p style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                  {alert.description}
                </p>
              </div>

              {/* Timestamp */}
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {alert.time}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RecentAlerts;