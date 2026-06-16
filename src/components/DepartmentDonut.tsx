// src/components/DepartmentDonut.tsx
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from './Card';
import { deptDonutData } from '../data';

const total = deptDonutData.reduce((sum, d) => sum + d.value, 0);

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background:   'var(--color-bg-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 'var(--radius-badge)',
        padding:      'var(--space-2) var(--space-3)',
        boxShadow:    '0 4px 12px rgba(0,0,0,.10)',
      }}
    >
      <p style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{d.name}</p>
      <p style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>
        {d.value} ({((d.value / total) * 100).toFixed(1)}%)
      </p>
    </div>
  );
};

const DepartmentDonut: React.FC = () => (
  <Card title="Department Attendance">
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
      {/* Donut */}
      <div style={{ position: 'relative', width: '100%', height: 170 }}>
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie
              data={deptDonutData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              dataKey="value"
              strokeWidth={2}
              stroke="var(--color-bg-surface)"
            >
              {deptDonutData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label */}
        <div
          style={{
            position:       'absolute',
            top:            '50%',
            left:           '50%',
            transform:      'translate(-50%, -50%)',
            textAlign:      'center',
            pointerEvents:  'none',
          }}
        >
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
            {total.toLocaleString()}
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Total</p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {deptDonutData.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span
                aria-hidden="true"
                style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: 'inline-block', flexShrink: 0 }}
              />
              <span style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>{d.name}</span>
            </div>
            <span style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {d.value}{' '}
              <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>
                ({((d.value / total) * 100).toFixed(1)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

export default DepartmentDonut;