import React from 'react';
import { Users, UserCheck, Calendar, UserX, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { kpiData } from '../data/mockData';

const ICONS = { Users, UserCheck, Calendar, UserX, Clock };

const colorMap = {
  blue:  { bg: 'var(--color-info-bg)',    icon: 'var(--color-info)'    },
  green: { bg: 'var(--color-success-bg)', icon: 'var(--color-success)' },
  amber: { bg: 'var(--color-warning-bg)', icon: 'var(--color-warning)' },
  red:   { bg: 'var(--color-danger-bg)',  icon: 'var(--color-danger)'  },
};

const deltaColors = {
  up:      'var(--color-success)',
  down:    'var(--color-danger)',
  neutral: 'var(--color-warning)',
};

export default function KpiGrid() {
  return (
    <div className="kpi-grid" role="list" aria-label="Key performance indicators">
      {kpiData.map(kpi => {
        const Icon = ICONS[kpi.icon];
        const colors = colorMap[kpi.color];
        const DeltaIcon = kpi.deltaType === 'up' ? TrendingUp : kpi.deltaType === 'down' ? TrendingDown : Minus;

        return (
          <div className="stat-card" key={kpi.id} role="listitem">
            <div
              className="stat-icon"
              style={{ background: colors.bg, color: colors.icon }}
              aria-hidden="true"
            >
              <Icon size={22} />
            </div>
            <div className="stat-text">
              <span className="stat-label">{kpi.label}</span>
              <span className="stat-value" aria-label={`${kpi.label}: ${kpi.value}`}>{kpi.value}</span>
              <span
                className="stat-delta"
                style={{ color: deltaColors[kpi.deltaType] }}
                aria-label={kpi.delta}
              >
                <DeltaIcon size={12} aria-hidden="true" />
                {kpi.delta}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}