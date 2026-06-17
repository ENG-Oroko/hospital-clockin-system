// src/pages/LeavePage.tsx
import React, { useState } from 'react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { leaveRecordsData, departmentsList } from '../data'

const typeColors: Record<string, { bg: string; color: string }> = {
  'Sick Leave':   { bg: '#fee2e2', color: '#dc2626' },
  'Annual Leave': { bg: '#dbeafe', color: '#2563eb' },
  'Casual Leave': { bg: '#ffedd5', color: '#ea580c' },
  'Maternity':    { bg: '#fae8ff', color: '#a21caf' },
  'Earned Leave': { bg: '#dcfce7', color: '#16a34a' },
}

const LeavePage: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState('all')

  const filtered = leaveRecordsData.filter(r =>
    selectedDept === 'all' || r.department === selectedDept
  )

  const countByDept = departmentsList.map(d => ({
    name:  d.name,
    color: d.color,
    count: leaveRecordsData.filter(r => r.department === d.name).length,
  })).filter(d => d.count > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="Staff on Leave" subtitle="View employees currently on leave — per department" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        <div style={{ background: '#fff', border: `2px solid ${selectedDept === 'all' ? '#2563eb' : '#e5e7eb'}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setSelectedDept('all')}>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>All Departments</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>{leaveRecordsData.length}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>on leave</p>
        </div>
        {countByDept.map(d => (
          <div key={d.name} style={{ background: '#fff', border: `2px solid ${selectedDept === d.name ? d.color : '#e5e7eb'}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setSelectedDept(d.name)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
              <p style={{ fontSize: 12, color: '#9ca3af' }}>{d.name}</p>
            </div>
            <p style={{ fontSize: 26, fontWeight: 700, color: d.color }}>{d.count}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>on leave</p>
          </div>
        ))}
      </div>

      <Card title={`Employees on Leave ${selectedDept !== 'all' ? `— ${selectedDept}` : ''} (${filtered.length})`}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 14 }}>No staff currently on leave in this department.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Department', 'Leave Type', 'From', 'To', 'Days'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 12, color: '#9ca3af', fontWeight: 500, padding: '8px 16px', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const tc = typeColors[row.type] ?? { bg: '#f3f4f6', color: '#6b7280' }
                  return (
                    <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: row.avatarColor + '22', color: row.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {row.initials}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>{row.department}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ background: tc.bg, color: tc.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{row.type}</span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>{row.from}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>{row.to}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.days}d</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default LeavePage