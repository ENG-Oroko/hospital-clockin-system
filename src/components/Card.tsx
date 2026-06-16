// src/components/Card.tsx
import React from 'react';

interface CardProps {
  title:    string;
  action?:  React.ReactNode;
  children: React.ReactNode;
  style?:   React.CSSProperties;
}

const Card: React.FC<CardProps> = ({ title, action, children, style }) => (
  <div
    style={{
      background:    'var(--color-bg-surface)',
      border:        '1px solid var(--color-border)',
      borderRadius:  'var(--radius-card)',
      padding:       'var(--space-6)',
      display:       'flex',
      flexDirection: 'column',
      gap:           'var(--space-4)',
      ...style,
    }}
  >
    {/* Header */}
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            'var(--space-4)',
      }}
    >
      <h2
        style={{
          fontSize:   'var(--text-heading)',
          fontWeight: 600,
          color:      'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h2>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>

    {/* Body */}
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

export default Card;