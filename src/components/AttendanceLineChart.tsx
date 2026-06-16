// src/components/AttendanceLineChart.tsx
import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import Card from './Card';
import { lineChartData } from '../data';

const LINES = [
  { key: 'Present', color: 'var(--color-success)' },
  { key: 'OnLeave', color: 'var(--color-warning)' },
  { key: 'Absent',  color: 'var(--color-danger)'  },
];

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background:   'var(--color-bg-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-badge)',
        padding:      'var(--space-3) var(--space-4)',
        boxShadow:    '0 4px 12px rgba(0,0,0,.10)',
      }}
    >
      <p style={{ fontSize: 'var(--text-label)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
        {label}
      </p>
      {payload.map((entry: any) => (
        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
          <span style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>
            {entry.name}:{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

const AttendanceLineChart: React.FC = () => {
  const [period, setPeriod] = useState('This Month');

  const periodBtn = (
    <button
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          'var(--space-1)',
        background:   'var(--color-bg-page)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-badge)',
        padding:      '4px var(--space-3)',
        fontSize:     'var(--text-label)',
        color:        'var(--color-text-secondary)',
      }}
    >
      {period}
      <ChevronDown size={12} />
    </button>
  );

  return (
    <Card title="Attendance Overview" action={periodBtn}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
        {LINES.map((l) => (
          <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span
              aria-hidden="true"
              style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }}
            />
            <span style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>
              {l.key === 'OnLeave' ? 'On Leave' : l.key}
            </span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={lineChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {LINES.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Accessible summary for screen readers */}
      <details style={{ marginTop: 'var(--space-3)' }}>
        <summary style={{ fontSize: 12, color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
          Data table (accessibility)
        </summary>
        <div style={{ overflowX: 'auto', marginTop: 'var(--space-2)' }}>
          <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Day', 'Present', 'On Leave', 'Absent'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '2px 6px', color: 'var(--color-text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineChartData.filter((d) => d.Present !== null).map((d) => (
                <tr key={d.day}>
                  <td style={{ padding: '2px 6px' }}>{d.day}</td>
                  <td style={{ padding: '2px 6px' }}>{d.Present}</td>
                  <td style={{ padding: '2px 6px' }}>{d.OnLeave}</td>
                  <td style={{ padding: '2px 6px' }}>{d.Absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
};

export default AttendanceLineChart;