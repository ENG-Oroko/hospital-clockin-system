// src/pages/DashboardPage.tsx
import React from 'react'
import KPIRow    from '../components/KPIRow'
import TrendsRow from '../components/TrendsRow'


const DashboardPage: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <KPIRow />
    <TrendsRow />
  </div>
)

export default DashboardPage