// src/pages/AttendancePage.tsx
import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Card               from '../components/Card'
import PageHeader         from '../components/PageHeader'
import AttendanceHeatmap  from '../components/AttendanceHeatmap'
import { lineChartData, employeesData, departmentsList } from '../data'

const summaryByDept = departmentsList.map(d => {
  const members = employeesData.filter(e => e.department === d.name)
  return {
    dept:    d.name,
    color:   d.color,
    total:   members.length,
    present: members.filter(e => e.status === 'active').length,
    onLeave: members.filter(e => e.status === 'on-leave').length,
    absent:  members.filter(e => e.status === 'inactive').length,
  }
})

const AttendancePage: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState('all')

  const displayed = selectedDept === 'all'
    ? summaryByDept
    : summaryByDept.filter(r => r.dept === selectedDept)

  const totals = displayed.reduce((acc, r) => ({
    total: acc.total + r.total, present: acc.present + r.present,
    onLeave: acc.onLeave + r.onLeave, absent: acc.absent + r.absent,
  }), { total: 0, present: 0, onLeave: 0, absent: 0 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="Attendance" subtitle="Daily attendance view per department" />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['all', ...departmentsList.map(d => d.name)].map(d => (
          <button key={d} onClick={() => setSelectedDept(d)}
            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: selectedDept === d ? '#2563eb' : '#fff',
              color:      selectedDept === d ? '#fff'    : '#6b7280',
              border: `1px solid ${selectedDept === d ? '#2563eb' : '#e5e7eb'}` }}>
            {d === 'all' ? 'All Departments' : d}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {[
          { label: 'Total Staff', value: totals.total,   color: '#2563eb', bg: '#dbeafe' },
          { label: 'Present',     value: totals.present, color: '#16a34a', bg: '#dcfce7' },
          { label: 'On Leave',    value: totals.onLeave, color: '#ea580c', bg: '#ffedd5' },
          { label: 'Absent',      value: totals.absent,  color: '#dc2626', bg: '#fee2e2' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 24px' }}>
            <p style={{ fontSize: 13, color: '#6b7280' }}>{k.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <Card title="Attendance by Department">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {displayed.map((row, i) => {
            const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0
            return (
              <div key={row.dept} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 80px 80px 90px', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < displayed.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{row.dept}</span>
                </div>
                <div style={{ height: 8, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 85 ? '#16a34a' : pct >= 65 ? '#ea580c' : '#dc2626', borderRadius: 999 }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Present</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{row.present}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>On Leave</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#ea580c' }}>{row.onLeave}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', display: 'block' }}>Absent</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{row.absent}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: pct >= 85 ? '#16a34a' : pct >= 65 ? '#ea580c' : '#dc2626' }}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Attendance Trend — May 2025">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="Present" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="OnLeave" stroke="#ea580c" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Absent"  stroke="#dc2626" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <AttendanceHeatmap />
    </div>
  )
}

export default AttendancePage