// src/components/StatCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DeltaType } from '../data';

interface StatCardProps {
  label:     string;
  value:     string;
  delta:     string;
  deltaType: DeltaType;
  icon:      React.ReactNode;
  colorBg:   string;
  colorIcon: string;
}

const deltaColor: Record<DeltaType, string> = {
  positive: 'var(--color-success)',
  negative: 'var(--color-danger)',
  neutral:  'var(--color-text-secondary)',
};

const DeltaIcon: React.FC<{ type: DeltaType }> = ({ type }) => {
  const props = { size: 12 };
  if (type === 'positive') return <TrendingUp  {...props} />;
  if (type === 'negative') return <TrendingDown {...props} />;
  return <Minus {...props} />;
};

const StatCard: React.FC<StatCardProps> = ({
  label, value, delta, deltaType, icon, colorBg, colorIcon,
}) => (
  <div
    style={{
      background:   'var(--color-bg-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)',
      padding:      'var(--space-6)',
      display:      'flex',
      gap:          'var(--space-4)',
      alignItems:   'flex-start',
    }}
  >
    {/* Icon square */}
    <div
      aria-hidden="true"
      style={{
        width:          44,
        height:         44,
        borderRadius:   'var(--radius-badge)',
        background:     colorBg,
        color:          colorIcon,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}
    >
      {icon}
    </div>

    {/* Text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          fontSize:     'var(--text-label)',
          color:        'var(--color-text-secondary)',
          fontWeight:   500,
          marginBottom: 'var(--space-1)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize:   'var(--text-stat)',
          fontWeight: 700,
          color:      'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      <div
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        'var(--space-1)',
          marginTop:  'var(--space-1)',
          color:      deltaColor[deltaType],
          fontSize:   'var(--text-label)',
          fontWeight: 500,
        }}
      >
        <DeltaIcon type={deltaType} />
        <span>{delta}</span>
      </div>
    </div>
  </div>
);

export default StatCard;