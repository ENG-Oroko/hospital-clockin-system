// src/components/ShiftModal.tsx
import React from 'react'
import { X, Save } from 'lucide-react'
import {
  ShiftFormValues,
  ShiftFormErrors,
} from '../data/types'

interface ColorOption { color: string; bg: string; label: string }

interface Props {
  form:         ShiftFormValues
  errors:       ShiftFormErrors
  isEdit:       boolean
  colorOptions: ColorOption[]
  allDepts:     string[]
  onSet:        (key: keyof ShiftFormValues) => (value: string) => void
  onToggleDept: (dept: string) => void
  onSave:       () => void
  onClose:      () => void
}

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const labelStyle: React.CSSProperties = {
  display:    'block',
  fontSize:   12,
  fontWeight: 600,
  color:      '#6b7280',
  marginBottom: 6,
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width:        '100%',
  padding:      '9px 12px',
  border:       `1px solid ${hasError ? '#dc2626' : '#e5e7eb'}`,
  borderRadius: 8,
  fontSize:     14,
  fontFamily:   'inherit',
  outline:      'none',
  background:   '#fff',
  boxSizing:    'border-box',
})

const ShiftModal: React.FC<Props> = ({
  form, errors, isEdit,
  colorOptions, allDepts,
  onSet, onToggleDept, onSave, onClose,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={isEdit ? 'Edit shift template' : 'Create new shift'}
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
        maxWidth:     520,
        maxHeight:    '90vh',
        overflowY:    'auto',
        boxShadow:    '0 20px 60px rgba(0,0,0,.18)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
          {isEdit ? 'Edit Shift Template' : 'Create New Shift'}
        </p>
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4, borderRadius: 6 }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Shift name */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>
          Shift Name <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => onSet('name')(e.target.value)}
          placeholder="e.g. Morning Shift"
          aria-invalid={!!errors.name}
          style={inputStyle(!!errors.name)}
        />
        {errors.name && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.name}</p>}
      </div>

      {/* Time range */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        {([
          { label: 'Start Time', key: 'start' as const, err: errors.start },
          { label: 'End Time',   key: 'end'   as const, err: errors.end   },
        ]).map(f => (
          <div key={f.key}>
            <label style={labelStyle}>
              {f.label} <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="time"
              value={form[f.key]}
              onChange={e => onSet(f.key)(e.target.value)}
              aria-invalid={!!f.err}
              style={inputStyle(!!f.err)}
            />
            {f.err && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{f.err}</p>}
          </div>
        ))}
      </div>

      {/* Duration preview */}
      {form.start && form.end && (
        <div
          style={{
            background:   '#f9fafb',
            borderRadius: 8,
            padding:      '9px 13px',
            marginBottom: 18,
            fontSize:     13,
            color:        '#6b7280',
          }}
        >
          ⏱ Duration:{' '}
          <strong style={{ color: '#111827' }}>
            {calcDuration(form.start, form.end)}
          </strong>
        </div>
      )}

      {/* Color picker */}
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Shift Colour</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {colorOptions.map(opt => (
            <button
              key={opt.color}
              type="button"
              aria-label={`Select ${opt.label} colour`}
              aria-pressed={form.color === opt.color}
              onClick={() => { onSet('color')(opt.color); onSet('bg')(opt.bg) }}
              style={{
                width:      34,
                height:     34,
                borderRadius: 8,
                background: opt.bg,
                border:     `2.5px solid ${form.color === opt.color ? opt.color : 'transparent'}`,
                cursor:     'pointer',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border .15s',
              }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 4, background: opt.color }} />
            </button>
          ))}
        </div>
      </div>

      {/* Department checkboxes */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>
          Assign to Departments <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {allDepts.map(dept => {
            const checked = form.depts.includes(dept)
            return (
              <label
                key={dept}
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        8,
                  padding:    '8px 10px',
                  border:     `1px solid ${checked ? form.color : '#e5e7eb'}`,
                  borderRadius: 8,
                  background: checked ? form.bg : '#f9fafb',
                  cursor:     'pointer',
                  fontSize:   13,
                  fontWeight: checked ? 600 : 400,
                  color:      checked ? form.color : '#111827',
                  transition: 'all .15s',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleDept(dept)}
                  style={{ accentColor: form.color, width: 14, height: 14 }}
                  aria-label={dept}
                />
                {dept}
              </label>
            )
          })}
        </div>
        {errors.depts && (
          <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{errors.depts}</p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
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
          {isEdit ? 'Save Changes' : 'Create Shift'}
        </button>
      </div>
    </div>
  </div>
)

export default ShiftModal