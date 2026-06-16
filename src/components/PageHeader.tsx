// src/components/PageHeader.tsx
import React from 'react'

interface Props {
  title:    string
  subtitle: string
  action?:  React.ReactNode
}

const PageHeader: React.FC<Props> = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
)

export default PageHeader