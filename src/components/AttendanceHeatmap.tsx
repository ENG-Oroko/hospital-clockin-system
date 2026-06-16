// src/components/AttendanceHeatmap.tsx
import React, { useState } from 'react';
import Card from './Card';
import { heatmapMatrix, heatmapDepartments, heatmapDays, CellStatus } from '../data';

const STATUS_CONFIG: Record<CellStatus, { bg: string; label: string }> = {
  present: { bg: 'var(--color-success)', label: 'Present'  },
  leave:   { bg: 'var(--color-warning)', label: 'On Leave' },
  absent:  { bg: 'var(--color-danger)',  label: 'Absent'   },
  nodata:  { bg: 'var(--color-border)',  label: 'No Data'  },
};

interface TooltipState {
  dept:   string;
  day:    number;
  status: CellStatus;
}

const AttendanceHeatmap: React.FC = () => {
  const [tip, setTip] = useState<TooltipState | null>(null);

  return (
    <Card title="Attendance Heatmap — May 2025">
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 540 }}>

          {/* ── Day-number header ── */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 'var(--space-2)', paddingLeft: 92 }}>
            {heatmapDays.map((d) => (
              <div
                key={d}
                style={{
                  width:     18,
                  fontSize:  9,
                  color:     'var(--color-text-tertiary)',
                  textAlign: 'center',
                  fontWeight:500,
                  flexShrink:0,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* ── Department rows ── */}
          {heatmapDepartments.map((dept) => (
            <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
              {/* Label */}
              <div
                style={{
                  width:      88,
                  fontSize:   11,
                  color:      'var(--color-text-secondary)',
                  fontWeight: 500,
                  textAlign:  'right',
                  paddingRight:'var(--space-2)',
                  flexShrink: 0,
                  lineHeight: 1.3,
                }}
              >
                {dept}
              </div>

              {/* Cells */}
              {heatmapDays.map((day) => {
                const status = heatmapMatrix[dept][day];
                const cfg    = STATUS_CONFIG[status];
                const isHovered = tip?.dept === dept && tip?.day === day;

                return (
                  <div
                    key={day}
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`${dept}, May ${day}: ${cfg.label}`}
                    onMouseEnter={() => setTip({ dept, day, status })}
                    onMouseLeave={() => setTip(null)}
                    onFocus={() => setTip({ dept, day, status })}
                    onBlur={() => setTip(null)}
                    style={{
                      width:      18,
                      height:     18,
                      background: cfg.bg,
                      borderRadius:3,
                      flexShrink: 0,
                      cursor:     'default',
                      opacity:    isHovered ? 0.7 : 1,
                      transition: 'opacity .1s',
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* ── Tooltip strip ── */}
          <div
            style={{
              minHeight:    28,
              marginTop:    'var(--space-3)',
            }}
          >
            {tip && (
              <div
                style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          'var(--space-2)',
                  padding:      'var(--space-2) var(--space-3)',
                  background:   'var(--color-bg-page)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-badge)',
                  fontSize:     'var(--text-label)',
                  color:        'var(--color-text-primary)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width:        10,
                    height:       10,
                    borderRadius: 2,
                    background:   STATUS_CONFIG[tip.status].bg,
                    display:      'inline-block',
                  }}
                />
                <strong>{tip.dept}</strong> — May {tip.day}:&nbsp;
                <span style={{ fontWeight: 600, color: STATUS_CONFIG[tip.status].bg }}>
                  {STATUS_CONFIG[tip.status].label}
                </span>
              </div>
            )}
          </div>

          {/* ── Legend ── */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            {(Object.entries(STATUS_CONFIG) as [CellStatus, { bg: string; label: string }][]).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width:        12,
                    height:       12,
                    borderRadius: 3,
                    background:   cfg.bg,
                    display:      'inline-block',
                    border:       key === 'nodata' ? '1px solid var(--color-border)' : 'none',
                  }}
                />
                <span style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AttendanceHeatmap;