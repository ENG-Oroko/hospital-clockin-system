import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { heatmapDepts, generateHeatmapData } from '../data/mockData';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const cellStyles = {
  present: { background: 'var(--color-success)' },
  leave:   { background: 'var(--color-warning)' },
  absent:  { background: 'var(--color-danger)'  },
  nodata:  { background: 'var(--color-border)'  },
};

const STATUS_LABELS = {
  present: '✓ Present',
  leave:   '○ On Leave',
  absent:  '✗ Absent',
  nodata:  '— No Data',
};

const LEGEND = [
  { key: 'present', label: 'Present' },
  { key: 'leave',   label: 'On Leave' },
  { key: 'absent',  label: 'Absent' },
  { key: 'nodata',  label: 'No Data' },
];

function HeatmapCell({ dept, day, status }) {
  const [showTip, setShowTip] = React.useState(false);
  const label = `${dept} May ${day}: ${STATUS_LABELS[status]}`;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        className="heatmap-cell"
        style={cellStyles[status]}
        role="img"
        aria-label={label}
        tabIndex={0}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
      />
      {showTip && (
        <div
          style={{
            position: 'absolute',
            bottom: '130%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1F2937',
            color: '#fff',
            padding: '5px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 200,
            pointerEvents: 'none',
          }}
          role="tooltip"
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default function AttendanceHeatmap() {
  const heatmapData = useMemo(() => generateHeatmapData(), []);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Attendance Heatmap</div>
          <div className="card-subtitle">Department × Day — May 2025</div>
        </div>
        <button className="period-select" aria-label="Select month: May 2025">
          May 2025 <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="heatmap-wrapper">
        <div
          className="heatmap-grid"
          role="table"
          aria-label="Attendance heatmap: departments by day"
        >
          {/* Header row */}
          <div role="row" style={{ display: 'contents' }}>
            <div className="heatmap-header-cell" role="columnheader" aria-label="Department" />
            {DAYS.map(d => (
              <div key={d} className="heatmap-header-cell" role="columnheader" aria-label={`May ${d}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Department rows */}
          {heatmapDepts.map(dept => (
            <div key={dept} role="row" style={{ display: 'contents' }}>
              <div className="heatmap-dept-label" role="rowheader">{dept}</div>
              {DAYS.map(d => (
                <HeatmapCell
                  key={d}
                  dept={dept}
                  day={d}
                  status={heatmapData[dept][d - 1]}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-legend" role="list" aria-label="Heatmap color legend">
        {LEGEND.map(({ key, label }) => (
          <div className="heatmap-legend-item" key={key} role="listitem">
            <div
              className="heatmap-legend-swatch"
              style={cellStyles[key]}
              aria-hidden="true"
            />
            <span className="heatmap-legend-text">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}