// src/components/TrendsRow.tsx
import React from 'react';
import AttendanceLineChart from './AttendanceLineChart';
import DepartmentDonut    from './DepartmentDonut';
import RecentAlerts       from './RecentAlerts';

const TrendsRow: React.FC = () => (
  <div
    style={{
      display:             'grid',
      gridTemplateColumns: '1fr .7fr .7fr',
      gap:                 'var(--space-6)',
    }}
  >
    <AttendanceLineChart />
    <DepartmentDonut />
    <RecentAlerts />
  </div>
);

export default TrendsRow;