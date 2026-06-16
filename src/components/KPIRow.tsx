// src/components/KPIRow.tsx
import React from 'react';
import {
  Users, UserCheck, Umbrella, UserX, Clock,
} from 'lucide-react';
import StatCard from './StatCard';
import { kpiData } from '../data';

const iconMap: Record<string, React.ReactNode> = {
  Users:     <Users     size={22} />,
  UserCheck: <UserCheck size={22} />,
  Umbrella:  <Umbrella  size={22} />,
  UserX:     <UserX     size={22} />,
  Clock:     <Clock     size={22} />,
};

const KPIRow: React.FC = () => (
  <div
    style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap:                 'var(--space-6)',
    }}
  >
    {kpiData.map((kpi) => (
      <StatCard
        key={kpi.label}
        label={kpi.label}
        value={kpi.value}
        delta={kpi.delta}
        deltaType={kpi.deltaType}
        colorBg={kpi.colorBg}
        colorIcon={kpi.colorIcon}
        icon={iconMap[kpi.iconName]}
      />
    ))}
  </div>
);

export default KPIRow;