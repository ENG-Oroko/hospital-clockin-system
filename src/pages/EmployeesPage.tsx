// src/pages/EmployeesPage.tsx
import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Search, Mail, Phone, X } from 'lucide-react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { employeesData, departmentsList } from '../data'
import type { Employee } from '../data/types'

const StatusBadge: React.FC<{ status: Employee['status'] }> = ({ status }) => {
  const cfg: Record<Employee['status'], { bg: string; color: string; label: string }> = {
    active:     { bg: '#dcfce7', color: '#16a34a', label: 'Active'   },
    'on-leave': { bg: '#ffedd5', color: '#ea580c', label: 'On Leave' },
    inactive:   { bg: '#f3f4f6', color: '#6b7280', label: 'Inactive' },
  }
  const c = cfg[status]
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>
      {c.label}
    </span>
  )
}

/* ── Detail modal ── */
const EmployeeModal: React.FC<{ emp: Employee; onClose: () => void }> = ({ emp, onClose }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
    <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: emp.avatarColor + '22', color: emp.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
            {emp.initials}
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{emp.name}</p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>{emp.role}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ color: '#9ca3af', display: 'flex' }} aria-label="Close"><X size={20} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { label: 'Department',    value: emp.department },
          { label: 'Status',        value: <StatusBadge status={emp.status} /> },
          { label: 'Joined',        value: emp.joinDate },
          { label: 'Monthly Salary', value: `KSH ${emp.salary.toLocaleString()}` },
        ].map(row => (
          <div key={row.label}>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{row.label}</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{row.value}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={14} color="#6b7280" />
          <span style={{ fontSize: 14, color: '#111827' }}>{emp.email}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Phone size={14} color="#6b7280" />
          <span style={{ fontSize: 14, color: '#111827' }}>{emp.phone}</span>
        </div>
      </div>
    </div>
  </div>
)

/* ── By Department view ── */
const ByDepartment: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState('all')
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState<Employee | null>(null)

  const deptNames = ['all', ...departmentsList.map(d => d.name)]

  const filtered = employeesData.filter(e =>
    (selectedDept === 'all' || e.department === selectedDept) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) ||
     e.role.toLowerCase().includes(search.toLowerCase()))
  )

  const grouped = filtered.reduce<Record<string, Employee[]>>((acc, emp) => {
    if (!acc[emp.department]) acc[emp.department] = []
    acc[emp.department].push(emp)
    return acc
  }, {})

  return (
    <>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees…"
            style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', width: 220 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {deptNames.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                background: selectedDept === d ? '#2563eb' : '#fff',
                color:      selectedDept === d ? '#fff'    : '#6b7280',
                border:     `1px solid ${selectedDept === d ? '#2563eb' : '#e5e7eb'}`,
              }}
            >
              {d === 'all' ? 'All Departments' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Department groups */}
      {Object.entries(grouped).map(([dept, emps]) => {
        const deptInfo = departmentsList.find(d => d.name === dept)
        return (
          <div key={dept} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 24px', background: (deptInfo?.color ?? '#6b7280') + '10', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: deptInfo?.color ?? '#6b7280' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{dept}</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{emps.length} employees</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Employee', 'Role', 'Status', 'Joined', 'Contact'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 12, color: '#9ca3af', fontWeight: 500, padding: '10px 24px', borderBottom: '1px solid #f3f4f6' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emps.map(emp => (
                  <tr key={emp.id} onClick={() => setSelected(emp)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: emp.avatarColor + '22', color: emp.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {emp.initials}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{emp.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>{emp.role}</td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6' }}><StatusBadge status={emp.status} /></td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>{emp.joinDate}</td>
                    <td style={{ padding: '12px 24px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <a href={`mailto:${emp.email}`} onClick={e => e.stopPropagation()} style={{ color: '#6b7280' }}><Mail size={14} /></a>
                        <a href={`tel:${emp.phone}`} onClick={e => e.stopPropagation()} style={{ color: '#6b7280' }}><Phone size={14} /></a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {selected && <EmployeeModal emp={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

const EmployeesPage: React.FC = () => {
  const subNav = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color:      isActive ? '#2563eb' : '#6b7280',
    background: isActive ? '#dbeafe' : 'transparent',
    textDecoration: 'none',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader title="Employees" subtitle="View staff by department" />
      <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        <NavLink to="/employees/by-department" style={({ isActive }) => subNav(isActive)}>By Department</NavLink>
      </div>
      <Routes>
        <Route index element={<ByDepartment />} />
        <Route path="by-department" element={<ByDepartment />} />
      </Routes>
    </div>
  )
}

export default EmployeesPage