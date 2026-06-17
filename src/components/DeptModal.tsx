// src/components/DeptModal.tsx
import React from 'react'
import { X, Save } from 'lucide-react'
import {
  StaffMember,
  DeptFormValues,
  DeptFormErrors,
} from '../data/types'

interface Props {
  form:     DeptFormValues
  errors:   DeptFormErrors
  isEdit:   boolean
  allStaff: StaffMember[]
  onSet:    (key: keyof DeptFormValues) => (value: string) => void
  onSave:   () => void
  onClose:  () => void
}

/* ── Reusable field wrapper ── */
const Field: React.FC<{
  label:    string
  required?: boolean
  error?:   string
  children: React.ReactNode
}> = ({ label, required, error, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label
      style={{
        fontSize:   12,
        fontWeight: 600,
        color:      '#6b7280',
      }}
    >
      {label}
      {required && (
        <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>
      )}
    </label>
    {children}
    {error && (
      <p style={{ fontSize: 12, color: '#dc2626', marginTop: 2 }}>
        {error}
      </p>
    )}
  </div>
)

/* ── Shared input style ── */
const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width:        '100%',
  padding:      '9px 12px',
  border:       `1px solid ${hasError ? '#dc2626' : '#e5e7eb'}`,
  borderRadius: 8,
  fontSize:     14,
  fontFamily:   'inherit',
  outline:      'none',
  color:        '#111827',
  background:   '#fff',
  boxSizing:    'border-box',
})

const DeptModal: React.FC<Props> = ({
  form, errors, isEdit, allStaff, onSet, onSave, onClose,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={isEdit ? 'Edit department' : 'Create department'}
    style={{
      position:       'fixed',
      inset:          0,
      background:     'rgba(0,0,0,.45)',
      zIndex:         500,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        24,
    }}
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div
      style={{
        background:   '#fff',
        borderRadius: 16,
        padding:      32,
        width:        '100%',
        maxWidth:     480,
        boxShadow:    '0 20px 60px rgba(0,0,0,.18)',
        maxHeight:    '90vh',
        overflowY:    'auto',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   24,
        }}
      >
        <p style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
          {isEdit ? 'Edit Department' : 'Create Department'}
        </p>
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            background:   'none',
            border:       'none',
            cursor:       'pointer',
            color:        '#9ca3af',
            display:      'flex',
            alignItems:   'center',
            padding:      4,
            borderRadius: 6,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Fields ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Department name */}
        <Field label="Department Name" required error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={e => onSet('name')(e.target.value)}
            placeholder="e.g. Paediatrics"
            aria-invalid={!!errors.name}
            style={inputStyle(!!errors.name)}
          />
        </Field>

        {/* Department head */}
        <Field label="Assign Department Head" required error={errors.headId}>
          <select
            value={form.headId}
            onChange={e => onSet('headId')(e.target.value)}
            aria-invalid={!!errors.headId}
            style={{ ...inputStyle(!!errors.headId), cursor: 'pointer' }}
          >
            <option value="">— Select a staff member —</option>
            {allStaff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id}) · {s.dept}
              </option>
            ))}
          </select>
        </Field>

        {/* Cost centre code */}
        <Field label="Cost Centre Code" required error={errors.costCode}>
          <input
            type="text"
            value={form.costCode}
            onChange={e => onSet('costCode')(e.target.value)}
            placeholder="e.g. CC-009"
            aria-invalid={!!errors.costCode}
            style={inputStyle(!!errors.costCode)}
          />
        </Field>

        {/* Floor / location */}
        <Field label="Floor / Location">
          <input
            type="text"
            value={form.floor}
            onChange={e => onSet('floor')(e.target.value)}
            placeholder="e.g. Floor 2, East Wing"
            style={inputStyle(false)}
          />
        </Field>
      </div>

      {/* ── Actions ── */}
      <div
        style={{
          display:        'flex',
          gap:            12,
          justifyContent: 'flex-end',
          marginTop:      28,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding:      '9px 18px',
            background:   '#f5f6fa',
            border:       '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize:     13,
            color:        '#6b7280',
            cursor:       'pointer',
            fontFamily:   'inherit',
          }}
        >
          Cancel
        </button>

        <button
          onClick={onSave}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '9px 20px',
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
          <Save size={14} />
          {isEdit ? 'Save Changes' : 'Create Department'}
        </button>
      </div>
    </div>
  </div>
)

export default DeptModal