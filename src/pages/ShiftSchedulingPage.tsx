// src/pages/ShiftSchedulingPage.tsx
import React, { useState, useCallback } from 'react'
import { Plus, Clock, Edit2, Trash2 } from 'lucide-react'
import PageHeader     from '../components/PageHeader'
import ShiftModal     from '../components/ShiftModal'
import ToastContainer from '../components/Toast'
import {
  initialShifts,
  ALL_SHIFT_DEPTS,
  COLOR_OPTIONS,
  EMPTY_SHIFT_FORM,
} from '../data/shiftsData'
import {
  ShiftTemplate,
  ShiftFormValues,
  ShiftFormErrors,
  Toast,
} from '../data/types'

let toastId = 0

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const ShiftSchedulingPage: React.FC = () => {
  const [shifts,    setShifts]    = useState<ShiftTemplate[]>(initialShifts)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form,      setForm]      = useState<ShiftFormValues>(EMPTY_SHIFT_FORM)
  const [errors,    setErrors]    = useState<ShiftFormErrors>({})
  const [toasts,    setToasts]    = useState<Toast[]>([])
  const [confirmId, setConfirmId] = useState<number | null>(null)

  /* ── Toasts ── */
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(p => [...p, { id, message, type }])
  }, [])
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])

  /* ── Modal helpers ── */
  const openCreate = () => {
    setForm(EMPTY_SHIFT_FORM)
    setEditingId(null)
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (shift: ShiftTemplate) => {
    setForm({ name: shift.name, start: shift.start, end: shift.end, color: shift.color, bg: shift.bg, depts: [...shift.depts] })
    setEditingId(shift.id)
    setErrors({})
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditingId(null); setErrors({}) }

  /* ── Field setter ── */
  const setField = (key: keyof ShiftFormValues) => (value: string) =>
    setForm(p => ({ ...p, [key]: value }))

  /* ── Dept toggle ── */
  const toggleDept = (dept: string) =>
    setForm(p => ({
      ...p,
      depts: p.depts.includes(dept)
        ? p.depts.filter(d => d !== dept)
        : [...p.depts, dept],
    }))

  /* ── Validation ── */
  const validate = (): boolean => {
    const e: ShiftFormErrors = {}
    if (!form.name.trim())      e.name  = 'Shift name is required.'
    if (!form.start)            e.start = 'Start time is required.'
    if (!form.end)              e.end   = 'End time is required.'
    if (form.depts.length === 0)e.depts = 'Select at least one department.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Save ── */
  const save = () => {
    if (!validate()) return
    if (editingId !== null) {
      setShifts(p => p.map(s => s.id === editingId ? { ...s, ...form } : s))
      addToast(`✓ "${form.name}" updated successfully`, 'success')
    } else {
      setShifts(p => [...p, { id: Date.now(), ...form }])
      addToast(`✓ "${form.name}" created successfully`, 'success')
    }
    closeModal()
  }

  /* ── Delete with confirm ── */
  const requestDelete = (id: number) => setConfirmId(id)
  const cancelDelete  = ()           => setConfirmId(null)
  const confirmDelete = (shift: ShiftTemplate) => {
    setShifts(p => p.filter(s => s.id !== shift.id))
    addToast(`"${shift.name}" deleted`, 'danger')
    setConfirmId(null)
  }

  /* ── Summary stats ── */
  const totalDeptCov = [...new Set(shifts.flatMap(s => s.depts))].length
  const longestShift = shifts.reduce<{ name: string; mins: number }>(
    (acc, s) => {
      const [sh, sm] = s.start.split(':').map(Number)
      const [eh, em] = s.end.split(':').map(Number)
      let mins = (eh * 60 + em) - (sh * 60 + sm)
      if (mins < 0) mins += 1440
      return mins > acc.mins ? { name: s.name, mins } : acc
    },
    { name: '—', mins: 0 }
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHeader
          title="Shift Scheduling"
          subtitle="Define and manage all shift templates for the hospital"
          action={
            <button
              onClick={openCreate}
              aria-label="Create new shift"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Plus size={15} /> Create Shift
            </button>
          }
        />

        {/* ── KPI strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[
            { label: 'Total Shift Types',   value: shifts.length,                          bg: '#dbeafe', color: '#2563eb' },
            { label: 'Departments Covered', value: `${totalDeptCov} / ${ALL_SHIFT_DEPTS.length}`, bg: '#dcfce7', color: '#16a34a' },
            { label: 'Longest Shift',       value: longestShift.name,                      bg: '#ffedd5', color: '#ea580c' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={20} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Shift cards ── */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>Shift Templates</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
              {shifts.length} shift{shifts.length !== 1 ? 's' : ''} defined
            </p>
          </div>

          {shifts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <Clock size={36} style={{ opacity: .25, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>No shifts defined yet.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Click "Create Shift" to add your first template.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 16 }}>
              {shifts.map(shift => {
                const isConfirming = confirmId === shift.id
                return (
                  <div
                    key={shift.id}
                    style={{
                      border:        `1.5px solid ${shift.bg === '#F3F4F6' ? '#e5e7eb' : shift.bg}`,
                      borderRadius:  12,
                      padding:       18,
                      background:    '#fff',
                      display:       'flex',
                      flexDirection: 'column',
                      gap:           12,
                      transition:    'box-shadow .15s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.07)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}
                  >
                    {/* Card top row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 42, height: 42, borderRadius: 10,
                            background: shift.bg, color: shift.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 17, flexShrink: 0,
                          }}
                          aria-hidden="true"
                        >
                          {shift.name[0]}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{shift.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                              {shift.start} – {shift.end}
                            </span>
                            <span style={{ background: shift.bg, color: shift.color, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                              {calcDuration(shift.start, shift.end)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Edit / Delete */}
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => openEdit(shift)}
                          aria-label={`Edit ${shift.name}`}
                          style={{ width: 30, height: 30, borderRadius: '50%', background: '#dbeafe', color: '#2563eb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#bfdbfe')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#dbeafe')}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => requestDelete(shift.id)}
                          aria-label={`Delete ${shift.name}`}
                          style={{ width: 30, height: 30, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fecaca')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#fee2e2')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Inline delete confirm */}
                    {isConfirming && (
                      <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                          Delete <strong>{shift.name}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => confirmDelete(shift)}
                            style={{ padding: '5px 12px', background: '#dc2626', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={cancelDelete}
                            style={{ padding: '5px 12px', background: '#f5f6fa', border: '1px solid #e5e7eb', borderRadius: 6, color: '#6b7280', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Dept tags */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                        Assigned Departments
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {shift.depts.map(d => (
                          <span key={d} style={{ background: shift.bg, color: shift.color, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ShiftModal
          form={form}
          errors={errors}
          isEdit={editingId !== null}
          colorOptions={COLOR_OPTIONS}
          allDepts={ALL_SHIFT_DEPTS}
          onSet={setField}
          onToggleDept={toggleDept}
          onSave={save}
          onClose={closeModal}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default ShiftSchedulingPage