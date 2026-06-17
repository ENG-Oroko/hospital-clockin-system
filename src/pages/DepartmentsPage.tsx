// src/pages/DepartmentsPage.tsx
import React, { useState, useCallback } from 'react'
import {
  Building2, Plus, Edit2,
  Trash2, Users,
} from 'lucide-react'
import PageHeader  from '../components/PageHeader'
import DeptModal   from '../components/DeptModal'
import AvatarStack from '../components/AvatarStack'
import ToastContainer from '../components/Toast'
import {
  INITIAL_DEPARTMENTS,
  ALL_STAFF,
  AVATAR_COLORS,
} from '../data/departmentsData'
import {
  DepartmentRecord,
  DeptFormValues,
  DeptFormErrors,
  Toast,
} from '../data/types'

const EMPTY_FORM: DeptFormValues = {
  name:     '',
  headId:   '',
  costCode: '',
  floor:    '',
}

let toastId = 0

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentRecord[]>(INITIAL_DEPARTMENTS)
  const [showModal,   setShowModal]   = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [form,        setForm]        = useState<DeptFormValues>(EMPTY_FORM)
  const [errors,      setErrors]      = useState<DeptFormErrors>({})
  const [toasts,      setToasts]      = useState<Toast[]>([])
  const [confirmId,   setConfirmId]   = useState<number | null>(null)

  /* ── Toast helpers ── */
  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = ++toastId
      setToasts(p => [...p, { id, message, type }])
    },
    []
  )
  const removeToast = useCallback(
    (id: number) => setToasts(p => p.filter(t => t.id !== id)),
    []
  )

  /* ── Derived helpers ── */
  const staffFor = (deptName: string) =>
    ALL_STAFF.filter(s => s.dept === deptName)

  const headFor = (headId: string) =>
    ALL_STAFF.find(s => s.id === headId)

  /* ── Modal controls ── */
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (dept: DepartmentRecord) => {
    setForm({
      name:     dept.name,
      headId:   dept.headId,
      costCode: dept.costCode,
      floor:    dept.floor,
    })
    setEditingId(dept.id)
    setErrors({})
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setErrors({})
  }

  /* ── Field setter (curried) ── */
  const setField =
    (key: keyof DeptFormValues) =>
    (value: string) =>
      setForm(prev => ({ ...prev, [key]: value }))

  /* ── Validation ── */
  const validate = (): boolean => {
    const e: DeptFormErrors = {}
    if (!form.name.trim())     e.name     = 'Department name is required.'
    if (!form.headId)          e.headId   = 'Please assign a department head.'
    if (!form.costCode.trim()) e.costCode = 'Cost code is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── Save (create or update) ── */
  const save = () => {
    if (!validate()) return

    if (editingId !== null) {
      setDepartments(prev =>
        prev.map(d => d.id === editingId ? { ...d, ...form } : d)
      )
      addToast(`✓ "${form.name}" updated`, 'success')
    } else {
      setDepartments(prev => [
        ...prev,
        { id: Date.now(), ...form },
      ])
      addToast(`✓ "${form.name}" department created`, 'success')
    }
    closeModal()
  }

  /* ── Delete with inline confirmation ── */
  const requestDelete = (id: number) => setConfirmId(id)
  const cancelDelete  = ()           => setConfirmId(null)

  const confirmDelete = (dept: DepartmentRecord) => {
    setDepartments(prev => prev.filter(d => d.id !== dept.id))
    addToast(`"${dept.name}" department removed`, 'danger')
    setConfirmId(null)
  }

  /* ── Stats ── */
  const totalStaff     = ALL_STAFF.length
  const headsAssigned  = departments.filter(d => d.headId).length

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <PageHeader
          title="Departments"
          subtitle="Clinical and operational structure of the hospital"
          action={
            <button
              onClick={openCreate}
              aria-label="Create new department"
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                padding:      '9px 16px',
                background:   '#2563eb',
                border:       'none',
                borderRadius: 8,
                color:        '#fff',
                fontSize:     13,
                fontWeight:   600,
                cursor:       'pointer',
                fontFamily:   'inherit',
              }}
            >
              <Plus size={15} />
              Create Department
            </button>
          }
        />

        {/* ── KPI strip ── */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 20,
          }}
        >
          {[
            {
              label: 'Total Departments',
              value: departments.length,
              bg:    '#dbeafe',
              color: '#2563eb',
            },
            {
              label: 'Total Staff',
              value: totalStaff,
              bg:    '#dcfce7',
              color: '#16a34a',
            },
            {
              label: 'Dept Heads Assigned',
              value: headsAssigned,
              bg:    '#ffedd5',
              color: '#ea580c',
            },
          ].map(s => (
            <div
              key={s.label}
              style={{
                background:   '#fff',
                border:       '1px solid #e5e7eb',
                borderRadius: 12,
                padding:      '18px 20px',
                display:      'flex',
                alignItems:   'center',
                gap:          14,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width:          44,
                  height:         44,
                  borderRadius:   10,
                  background:     s.bg,
                  color:          s.color,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>
                  {s.label}
                </p>
                <p
                  style={{
                    fontSize:   24,
                    fontWeight: 700,
                    color:      '#111827',
                    lineHeight: 1.1,
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Department cards ── */}
        <div
          style={{
            background:   '#fff',
            border:       '1px solid #e5e7eb',
            borderRadius: 12,
            padding:      24,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>
              Departments
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
              {departments.length} departments · click a card to edit
            </p>
          </div>

          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap:                 16,
            }}
          >
            {departments.map((dept, idx) => {
              const [abg, ac]    = AVATAR_COLORS[idx % AVATAR_COLORS.length]
              const staff        = staffFor(dept.name)
              const head         = headFor(dept.headId)
              const headInitials = head
                ? head.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                : '?'
              const isConfirming = confirmId === dept.id

              return (
                <div
                  key={dept.id}
                  style={{
                    border:       '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding:      18,
                    background:   '#fff',
                    display:      'flex',
                    flexDirection:'column',
                    gap:          14,
                    transition:   'box-shadow .15s',
                  }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLElement).style.boxShadow =
                      '0 4px 16px rgba(0,0,0,.07)')
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.boxShadow = 'none')
                  }
                >
                  {/* ── Card top row ── */}
                  <div
                    style={{
                      display:        'flex',
                      alignItems:     'flex-start',
                      justifyContent: 'space-between',
                      gap:            12,
                    }}
                  >
                    {/* Icon + name */}
                    <div
                      style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        12,
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width:          42,
                          height:         42,
                          borderRadius:   10,
                          background:     abg,
                          color:          ac,
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          fontWeight:     700,
                          fontSize:       16,
                          flexShrink:     0,
                        }}
                      >
                        {dept.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize:   15,
                            color:      '#111827',
                            lineHeight: 1.2,
                          }}
                        >
                          {dept.name}
                        </p>
                        <p
                          style={{
                            fontSize:  11,
                            color:     '#9ca3af',
                            marginTop: 2,
                          }}
                        >
                          {dept.costCode}
                          {dept.floor ? ` · ${dept.floor}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Edit / Delete */}
                    <div
                      style={{
                        display:   'flex',
                        gap:       8,
                        flexShrink:0,
                      }}
                    >
                      <button
                        onClick={() => openEdit(dept)}
                        aria-label={`Edit ${dept.name}`}
                        style={{
                          width:          30,
                          height:         30,
                          borderRadius:   '50%',
                          background:     '#dbeafe',
                          color:          '#2563eb',
                          border:         'none',
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          cursor:         'pointer',
                          transition:     'background .15s',
                        }}
                        onMouseEnter={e =>
                          ((e.currentTarget as HTMLElement).style.background = '#bfdbfe')
                        }
                        onMouseLeave={e =>
                          ((e.currentTarget as HTMLElement).style.background = '#dbeafe')
                        }
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        onClick={() => requestDelete(dept.id)}
                        aria-label={`Delete ${dept.name}`}
                        style={{
                          width:          30,
                          height:         30,
                          borderRadius:   '50%',
                          background:     '#fee2e2',
                          color:          '#dc2626',
                          border:         'none',
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          cursor:         'pointer',
                          transition:     'background .15s',
                        }}
                        onMouseEnter={e =>
                          ((e.currentTarget as HTMLElement).style.background = '#fecaca')
                        }
                        onMouseLeave={e =>
                          ((e.currentTarget as HTMLElement).style.background = '#fee2e2')
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* ── Inline delete confirmation ── */}
                  {isConfirming && (
                    <div
                      style={{
                        background:   '#fff5f5',
                        border:       '1px solid #fecaca',
                        borderRadius: 8,
                        padding:      '10px 14px',
                        display:      'flex',
                        alignItems:   'center',
                        justifyContent:'space-between',
                        gap:          8,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color:    '#dc2626',
                          fontWeight:500,
                        }}
                      >
                        Remove <strong>{dept.name}</strong>?
                      </p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => confirmDelete(dept)}
                          style={{
                            padding:      '5px 12px',
                            background:   '#dc2626',
                            border:       'none',
                            borderRadius: 6,
                            color:        '#fff',
                            fontSize:     12,
                            fontWeight:   600,
                            cursor:       'pointer',
                            fontFamily:   'inherit',
                          }}
                        >
                          Yes, remove
                        </button>
                        <button
                          onClick={cancelDelete}
                          style={{
                            padding:      '5px 12px',
                            background:   '#f5f6fa',
                            border:       '1px solid #e5e7eb',
                            borderRadius: 6,
                            color:        '#6b7280',
                            fontSize:     12,
                            cursor:       'pointer',
                            fontFamily:   'inherit',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Department head row ── */}
                  <div
                    style={{
                      padding:    '10px 12px',
                      background: '#f9fafb',
                      borderRadius:8,
                      display:    'flex',
                      alignItems: 'center',
                      gap:        10,
                    }}
                  >
                    {/* Head avatar */}
                    <div
                      aria-hidden="true"
                      style={{
                        width:          28,
                        height:         28,
                        borderRadius:   '50%',
                        background:     abg,
                        color:          ac,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        fontSize:       10,
                        fontWeight:     700,
                        flexShrink:     0,
                      }}
                    >
                      {headInitials}
                    </div>

                    <div>
                      <p
                        style={{
                          fontSize:      10,
                          color:         '#9ca3af',
                          fontWeight:    600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom:  2,
                        }}
                      >
                        Department Head
                      </p>
                      <p
                        style={{
                          fontSize:   13,
                          fontWeight: 600,
                          color:      head ? '#111827' : '#dc2626',
                          fontStyle:  head ? 'normal' : 'italic',
                        }}
                      >
                        {head ? head.name : 'Unassigned'}
                      </p>
                    </div>

                    {head && (
                      <span
                        style={{
                          marginLeft:   'auto',
                          fontSize:     11,
                          color:        '#9ca3af',
                          fontFamily:   'monospace',
                        }}
                      >
                        {head.id}
                      </span>
                    )}
                  </div>

                  {/* ── Staff avatars + count ── */}
                  <div
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <AvatarStack staff={staff} maxShow={5} />

                    <div
                      style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        5,
                        fontSize:   12,
                        color:      '#6b7280',
                      }}
                    >
                      <Users size={13} aria-hidden="true" />
                      {staff.length} staff
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── Modal ── */}
      {showModal && (
        <DeptModal
          form={form}
          errors={errors}
          isEdit={editingId !== null}
          allStaff={ALL_STAFF}
          onSet={setField}
          onSave={save}
          onClose={closeModal}
        />
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default DepartmentsPage