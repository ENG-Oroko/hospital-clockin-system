// src/pages/DepartmentsPage.tsx
import React, { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { Users, Edit2, Check } from 'lucide-react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { departmentsData as initialDepts, employeesData, Department } from '../data'

/* ── All Departments ── */
const AllDepartments: React.FC<{
  depts: Department[]
  onUpdate: (d: Department) => void
}> = ({ depts, onUpdate }) => {
  const [editing, setEditing]   = useState<number | null>(null)
  const [headVal, setHeadVal]   = useState<number | null>(null)

  const startEdit = (dept: Department) => {
    setEditing(dept.id)
    setHeadVal(dept.headId)
  }

  const saveEdit = (dept: Department) => {
    onUpdate({ ...dept, headId: headVal })
    setEditing(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {depts.map(dept => {
        const head      = employeesData.find(e => e.id === dept.headId)
        const members   = employeesData.filter(e => e.department === dept.name)
        const isEditing = editing === dept.id

        return (
          <div key={dept.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header stripe */}
            <div style={{ height: 5, background: dept.color }} />

            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: dept.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: dept.color }}>{dept.name[0]}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{dept.name}</p>
                    <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{dept.description}</p>
                  </div>
                </div>

                {/* Edit / Save */}
                {isEditing
                  ? (
                    <button onClick={() => saveEdit(dept)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <Check size={13} /> Save
                    </button>
                  )
                  : (
                    <button onClick={() => startEdit(dept)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#f5f6fa', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
                      <Edit2 size={13} /> Assign Head
                    </button>
                  )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {/* Staff count */}
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Users size={13} color="#9ca3af" />
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Total Staff</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: dept.color }}>{members.length}</p>
                </div>

                {/* Active */}
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14 }}>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Active</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{members.filter(e => e.status === 'active').length}</p>
                </div>

                {/* On Leave */}
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: 14 }}>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>On Leave</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#ea580c' }}>{members.filter(e => e.status === 'on-leave').length}</p>
                </div>
              </div>

              {/* Department Head */}
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>Dept Head:</span>

                {isEditing
                  ? (
                    <select
                      value={headVal ?? ''}
                      onChange={e => setHeadVal(Number(e.target.value))}
                      style={{ flex: 1, padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, background: '#fff', outline: 'none' }}
                    >
                      <option value="">— No head assigned —</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                  )
                  : head
                    ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: head.avatarColor + '22', color: head.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                          {head.initials}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{head.name}</span>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>— {head.role}</span>
                      </div>
                    )
                    : <span style={{ fontSize: 13, color: '#dc2626', fontStyle: 'italic' }}>No head assigned</span>
                }
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Create Department ── */
const CreateDepartment: React.FC<{ onAdd: (d: Department) => void }> = ({ onAdd }) => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', description: '', headId: '', color: '#2563EB' })
  const [saved, setSaved] = useState(false)

  const COLORS = ['#2563EB','#16A34A','#EA580C','#DC2626','#7C3AED','#0891B2','#DB2777','#D97706','#6B7280']

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newDept: Department = {
      id:          Date.now(),
      name:        form.name,
      headId:      form.headId ? Number(form.headId) : null,
      color:       form.color,
      description: form.description,
    }
    onAdd(newDept)
    setSaved(true)
    setTimeout(() => navigate('/departments/all'), 1500)
  }

  if (saved) return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✓</div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#16a34a' }}>Department created!</p>
      <p style={{ fontSize: 13, color: '#9ca3af' }}>Redirecting…</p>
    </div>
  )

  return (
    <Card title="Create New Department">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>
        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Department Name *</label>
          <input
            required value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Cardiology"
            style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Brief description of this department's role…"
            rows={3}
            style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* Department Head */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Assign Department Head</label>
          <select
            value={form.headId}
            onChange={e => setForm(p => ({ ...p, headId: e.target.value }))}
            style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none' }}
          >
            <option value="">— Select head (optional) —</option>
            {employeesData.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} — {emp.role} ({emp.department})</option>
            ))}
          </select>
        </div>

        {/* Color picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Department Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(p => ({ ...p, color: c }))}
                style={{
                  width: 30, height: 30, borderRadius: '50%', background: c,
                  border: form.color === c ? '3px solid #111827' : '3px solid transparent',
                  cursor: 'pointer', outline: 'none',
                }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{ background: form.color + '12', border: `1px solid ${form.color}44`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: form.color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: form.color }}>{form.name ? form.name[0].toUpperCase() : '?'}</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{form.name || 'Department Name'}</p>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>{form.description || 'Description will appear here'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Create Department
          </button>
          <button type="button" onClick={() => navigate('/departments/all')} style={{ padding: '10px 24px', background: '#f5f6fa', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#6b7280', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  )
}

/* ── Main page ── */
const DepartmentsPage: React.FC = () => {
  const [depts, setDepts] = useState<Department[]>(initialDepts)

  const subNav = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    color:      isActive ? '#2563eb' : '#6b7280',
    background: isActive ? '#dbeafe' : 'transparent',
    textDecoration: 'none',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Departments"
        subtitle="Manage departments and assign heads"
        action={
          <NavLink to="/departments/create" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            + Create Department
          </NavLink>
        }
      />

      <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        <NavLink to="/departments/all"    style={({ isActive }) => subNav(isActive)}>All Departments</NavLink>
        <NavLink to="/departments/create" style={({ isActive }) => subNav(isActive)}>Create Department</NavLink>
      </div>

      <Routes>
        <Route index          element={<AllDepartments depts={depts} onUpdate={d => setDepts(p => p.map(x => x.id === d.id ? d : x))} />} />
        <Route path="all"     element={<AllDepartments depts={depts} onUpdate={d => setDepts(p => p.map(x => x.id === d.id ? d : x))} />} />
        <Route path="create"  element={<CreateDepartment onAdd={d => setDepts(p => [...p, d])} />} />
      </Routes>
    </div>
  )
}

export default DepartmentsPage