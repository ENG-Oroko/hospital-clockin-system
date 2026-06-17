// src/pages/PayrollPage.tsx
import React, { useState } from 'react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { payrollData, departmentsList } from '../data'

const fmt = (n: number) => `KSH ${n.toLocaleString()}`

const PayrollPage: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState('all')

  const filtered = payrollData.filter(r =>
    selectedDept === 'all' || r.department === selectedDept
  )

  const deptTotals = departmentsList.map(d => {
    const rows = payrollData.filter(r => r.department === d.name)
    return { name: d.name, color: d.color, count: rows.length, total: rows.reduce((s, r) => s + r.net, 0) }
  }).filter(d => d.count > 0)

  const grandTotal  = filtered.reduce((s, r) => s + r.net, 0)
  const totalBasic  = filtered.reduce((s, r) => s + r.basicSalary, 0)
  const totalAllow  = filtered.reduce((s, r) => s + r.allowances, 0)
  const totalOT     = filtered.reduce((s, r) => s + r.overtime, 0)
  const totalDeduct = filtered.reduce((s, r) => s + r.deductions, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader title="Payroll" subtitle="Monthly payroll overview — May 2025 (KSH)" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16 }}>
        {[
          { label: 'Total Net Pay',    value: fmt(grandTotal),  color: '#2563eb', bg: '#dbeafe' },
          { label: 'Basic Salaries',   value: fmt(totalBasic),  color: '#111827', bg: '#f3f4f6' },
          { label: 'Allowances',       value: fmt(totalAllow),  color: '#16a34a', bg: '#dcfce7' },
          { label: 'Overtime Pay',     value: fmt(totalOT),     color: '#ea580c', bg: '#ffedd5' },
          { label: 'Deductions',       value: fmt(totalDeduct), color: '#dc2626', bg: '#fee2e2' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, color: '#6b7280' }}>{k.label}</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: k.color, marginTop: 4, lineHeight: 1.2 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        <button onClick={() => setSelectedDept('all')}
          style={{ flexShrink: 0, padding: '10px 16px', background: selectedDept === 'all' ? '#2563eb' : '#fff', color: selectedDept === 'all' ? '#fff' : '#6b7280', border: `1px solid ${selectedDept === 'all' ? '#2563eb' : '#e5e7eb'}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          All — {fmt(payrollData.reduce((s, r) => s + r.net, 0))}
        </button>
        {deptTotals.map(d => (
          <button key={d.name} onClick={() => setSelectedDept(d.name)}
            style={{ flexShrink: 0, padding: '10px 16px', background: selectedDept === d.name ? d.color : '#fff', color: selectedDept === d.name ? '#fff' : '#111827', border: `1px solid ${selectedDept === d.name ? d.color : '#e5e7eb'}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {d.name} — {fmt(d.total)}
          </button>
        ))}
      </div>

      <Card title={`Payroll Records${selectedDept !== 'all' ? ` — ${selectedDept}` : ''} (${filtered.length} employees)`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Employee', 'Department', 'Role', 'Basic (KSH)', 'Allowances', 'Overtime', 'Deductions', 'Net Pay'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 600, padding: '10px 14px', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.employeeId} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: row.avatarColor + '22', color: row.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                        {row.initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{row.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>{row.department}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>{row.role}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#111827' }}>{row.basicSalary.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#16a34a' }}>+{row.allowances.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#ea580c' }}>{row.overtime > 0 ? `+${row.overtime.toLocaleString()}` : '—'}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#dc2626' }}>−{row.deductions.toLocaleString()}</td>
                  <td style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>{row.net.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f0f4ff' }}>
                <td colSpan={3} style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#111827' }}>Total ({filtered.length} employees)</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700 }}>{totalBasic.toLocaleString()}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>+{totalAllow.toLocaleString()}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#ea580c' }}>+{totalOT.toLocaleString()}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>−{totalDeduct.toLocaleString()}</td>
                <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: '#2563eb' }}>{grandTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default PayrollPage