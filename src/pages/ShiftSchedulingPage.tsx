// src/pages/ShiftSchedulingPage.tsx
import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { shiftEntriesData, departmentsData, ShiftEntry } from '../data'

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const shiftColors: Record<string, { bg: string; color: string }> = {
  Morning:   { bg: '#ffedd5', color: '#ea580c' },
  Afternoon: { bg: '#dbeafe', color: '#2563eb' },
  Night:     { bg: '#ede9fe', color: '#7c3aed' },
}

const ShiftSchedulingPage: React.FC = () => {
  const [shifts, setShifts]     = useState<ShiftEntry[]>(shiftEntriesData)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter]     = useState<'All' | 'Morning' | 'Afternoon' | 'Night'>('All')

  const [form, setForm] = useState({
    name:       '',
    department: departmentsData[0]?.name ?? '',
    shiftType:  'Morning' as ShiftEntry['shiftType'],
    startTime:  '06:00',
    endTime:    '14:00',
    days:       [] as string[],
  })

  const toggleDay = (day: string) =>
    setForm(p => ({ ...p, days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day] }))

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const entry: ShiftEntry = {
      id:          Date.now(),
      createdDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      ...form,
    }
    setShifts(p => [entry, ...p])
    setShowForm(false)
    setForm({ name: '', department: departmentsData[0]?.name ?? '', shiftType: 'Morning', startTime: '06:00', endTime: '14:00', days: [] })
  }

  const deleteShift = (id: number) => setShifts(p => p.filter(s => s.id !== id))

  const displayed = shifts.filter(s => filter === 'All' || s.shiftType === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Shift Scheduling"
        subtitle="Create and manage shift definitions"
        action={
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={15} /> {showForm ? 'Cancel' : 'Create Shift'}
          </button>
        }
      />

      {/* Create Shift Form */}
      {showForm && (
        <Card title="Create New Shift">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Shift name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Shift Name *</label>
                <input
                  required value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. ICU Morning Round"
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
                />
              </div>

              {/* Department */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Department *</label>
                <select
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none' }}
                >
                  {departmentsData.map(d => <option key={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Shift type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Shift Type *</label>
                <select
                  value={form.shiftType}
                  onChange={e => setForm(p => ({ ...p, shiftType: e.target.value as ShiftEntry['shiftType'] }))}
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', outline: 'none' }}
                >
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Night</option>
                </select>
              </div>

              {/* Start / End */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Start Time *</label>
                <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>End Time *</label>
                <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }} />
              </div>
            </div>

            {/* Days */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Active Days *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ALL_DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: form.days.includes(day) ? '#2563eb' : '#f3f4f6',
                      color:      form.days.includes(day) ? '#fff'    : '#6b7280',
                      border:     form.days.includes(day) ? '2px solid #2563eb' : '2px solid transparent',
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {form.days.length === 0 && <p style={{ fontSize: 12, color: '#dc2626' }}>Select at least one day</p>}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={form.days.length === 0}
                style={{ padding: '10px 24px', background: form.days.length === 0 ? '#93c5fd' : '#2563eb', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: form.days.length === 0 ? 'not-allowed' : 'pointer' }}
              >
                Create Shift
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['All', 'Morning', 'Afternoon', 'Night'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: filter === f ? '#2563eb' : '#fff', color: filter === f ? '#fff' : '#6b7280', border: `1px solid ${filter === f ? '#2563eb' : '#e5e7eb'}` }}>
            {f}
          </button>
        ))}
      </div>

      {/* Shift cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {displayed.map(shift => {
          const sc = shiftColors[shift.shiftType] ?? { bg: '#f3f4f6', color: '#6b7280' }
          const dept = departmentsData.find(d => d.name === shift.department)

          return (
            <div key={shift.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              {/* Top stripe */}
              <div style={{ height: 4, background: dept?.color ?? sc.color }} />

              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>{shift.shiftType}</span>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginTop: 6 }}>{shift.name}</p>
                    <p style={{ fontSize: 13, color: '#6b7280' }}>{shift.department}</p>
                  </div>
                  <button
                    onClick={() => deleteShift(shift.id)}
                    aria-label={`Delete ${shift.name}`}
                    style={{ color: '#fca5a5', display: 'flex', padding: 4, borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#dc2626'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#fca5a5'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Time */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                  <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>Start</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{shift.startTime}</p>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>End</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{shift.endTime}</p>
                  </div>
                </div>

                {/* Days */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {ALL_DAYS.map(day => (
                    <span
                      key={day}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                        background: shift.days.includes(day) ? sc.bg    : '#f3f4f6',
                        color:      shift.days.includes(day) ? sc.color : '#d1d5db',
                      }}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>Created {shift.createdDate}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ShiftSchedulingPage