import React, { useState } from 'react';
import { Plus, Clock, Trash2, Edit2, X, Save } from 'lucide-react';

const INITIAL_SHIFTS = [
  { id: 1, name: 'Morning Shift',   start: '06:00', end: '14:00', color: '#2563EB', bg: '#DBEAFE', depts: ['Nursing', 'Emergency', 'Radiology'] },
  { id: 2, name: 'Afternoon Shift', start: '14:00', end: '22:00', color: '#EA580C', bg: '#FFEDD5', depts: ['ICU', 'Surgery', 'General Ward']     },
  { id: 3, name: 'Night Shift',     start: '22:00', end: '06:00', color: '#6B7280', bg: '#F3F4F6', depts: ['Nursing', 'ICU', 'Emergency']         },
  { id: 4, name: 'On-Call Pool',    start: '00:00', end: '23:59', color: '#16A34A', bg: '#DCFCE7', depts: ['Surgery', 'Radiology']                },
];

const ALL_DEPTS = [
  'Nursing', 'ICU', 'Surgery', 'Emergency',
  'Radiology', 'General Ward', 'Pharmacy', 'Admin',
];

const EMPTY_FORM = { name: '', start: '07:00', end: '15:00', color: '#2563EB', bg: '#DBEAFE', depts: [] };

const COLOR_OPTIONS = [
  { color: '#2563EB', bg: '#DBEAFE', label: 'Blue'   },
  { color: '#16A34A', bg: '#DCFCE7', label: 'Green'  },
  { color: '#EA580C', bg: '#FFEDD5', label: 'Amber'  },
  { color: '#DC2626', bg: '#FEE2E2', label: 'Red'    },
  { color: '#7C3AED', bg: '#F3E8FF', label: 'Purple' },
  { color: '#6B7280', bg: '#F3F4F6', label: 'Gray'   },
];

function calcDuration(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ShiftRosterPage({ onToast }) {
  const [shifts,     setShifts]     = useState(INITIAL_SHIFTS);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [errors,     setErrors]     = useState({});

  /* ── helpers ── */
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (shift) => {
    setForm({ name: shift.name, start: shift.start, end: shift.end, color: shift.color, bg: shift.bg, depts: [...shift.depts] });
    setEditingId(shift.id);
    setErrors({});
    setShowModal(true);
  };

  const close = () => { setShowModal(false); setEditingId(null); setErrors({}); };

  const set = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }));

  const toggleDept = (dept) =>
    setForm(prev => ({
      ...prev,
      depts: prev.depts.includes(dept)
        ? prev.depts.filter(d => d !== dept)
        : [...prev.depts, dept],
    }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name  = 'Shift name is required.';
    if (!form.start)         e.start = 'Start time is required.';
    if (!form.end)           e.end   = 'End time is required.';
    if (form.depts.length === 0) e.depts = 'Select at least one department.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editingId) {
      setShifts(prev => prev.map(s =>
        s.id === editingId ? { ...s, ...form } : s));
      onToast(`✓ "${form.name}" updated successfully`, 'success');
    } else {
      const newShift = { ...form, id: Date.now() };
      setShifts(prev => [...prev, newShift]);
      onToast(`✓ "${form.name}" created successfully`, 'success');
    }
    close();
  };

  const deleteShift = (shift) => {
    setShifts(prev => prev.filter(s => s.id !== shift.id));
    onToast(`"${shift.name}" deleted`, 'danger');
  };

  /* ── summary stats ── */
  const totalShifts  = shifts.length;
  const totalDeptCov = [...new Set(shifts.flatMap(s => s.depts))].length;
  const longestShift = shifts.reduce((acc, s) => {
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 1440;
    return mins > acc.mins ? { name: s.name, mins } : acc;
  }, { name: '—', mins: 0 });

  return (
    <>
      {/* ── Summary stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-6)' }}>
        {[
          { label: 'Total Shift Types', value: totalShifts,        bg: 'var(--color-info-bg)',    color: 'var(--color-info)'    },
          { label: 'Departments Covered', value: `${totalDeptCov} / ${ALL_DEPTS.length}`, bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
          { label: 'Longest Shift',     value: longestShift.name,  bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
        ].map(s => (
          <div className="card" key={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Shift list ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Shift Templates</div>
            <div className="card-subtitle">Define and manage all shift types for the hospital</div>
          </div>
          <button
            onClick={openCreate}
            aria-label="Create new shift"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', background: 'var(--color-info)',
              border: 'none', borderRadius: 'var(--radius-badge)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={15} aria-hidden="true" /> Create Shift
          </button>
        </div>

        {shifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-tertiary)' }}>
            <Clock size={36} style={{ opacity: 0.25, marginBottom: 'var(--space-3)' }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>No shifts defined yet.</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click "Create Shift" to add your first shift template.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-4)' }}>
            {shifts.map(shift => (
              <div key={shift.id}
                style={{
                  border: `1.5px solid ${shift.bg === '#F3F4F6' ? 'var(--color-border)' : shift.bg}`,
                  borderRadius: 'var(--radius-card)',
                  padding: 'var(--space-5)',
                  background: 'var(--color-bg-surface)',
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                }}>
                {/* header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: shift.bg, color: shift.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 17, flexShrink: 0,
                    }}>
                      {shift.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{shift.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {shift.start} – {shift.end}
                        <span style={{ marginLeft: 6, background: shift.bg, color: shift.color,
                          padding: '1px 7px', borderRadius: 'var(--radius-pill)', fontSize: 11, fontWeight: 600 }}>
                          {calcDuration(shift.start, shift.end)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      className="action-btn"
                      style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
                      aria-label={`Edit ${shift.name}`}
                      onClick={() => openEdit(shift)}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="action-btn"
                      style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                      aria-label={`Delete ${shift.name}`}
                      onClick={() => deleteShift(shift)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* departments */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    Assigned Departments
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {shift.depts.map(d => (
                      <span key={d} style={{
                        background: shift.bg, color: shift.color,
                        padding: '3px 9px', borderRadius: 'var(--radius-pill)',
                        fontSize: 11, fontWeight: 500,
                      }}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <ShiftModal
          form={form}
          errors={errors}
          isEdit={!!editingId}
          onSet={set}
          onToggleDept={toggleDept}
          onSave={save}
          onClose={close}
          colorOptions={COLOR_OPTIONS}
          allDepts={ALL_DEPTS}
        />
      )}
    </>
  );
}

/* ── Shift create/edit modal ── */
function ShiftModal({ form, errors, isEdit, onSet, onToggleDept, onSave, onClose, colorOptions, allDepts }) {
  return (
    <div
      role="dialog" aria-modal="true"
      aria-label={isEdit ? 'Edit shift' : 'Create new shift'}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 500, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 'var(--space-8)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <div style={{ fontSize: 'var(--text-heading)', fontWeight: 700 }}>
            {isEdit ? 'Edit Shift Template' : 'Create New Shift'}
          </div>
          <button onClick={onClose} aria-label="Close modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Shift name */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Shift Name <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            type="text" value={form.name}
            onChange={e => onSet('name')(e.target.value)}
            placeholder="e.g. Morning Shift"
            aria-invalid={!!errors.name}
            style={{
              width: '100%', padding: '9px 12px',
              border: `1px solid ${errors.name ? 'var(--color-danger)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-badge)', fontSize: 14,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          {errors.name && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errors.name}</div>}
        </div>

        {/* Time range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          {[
            { label: 'Start Time', key: 'start', err: errors.start },
            { label: 'End Time',   key: 'end',   err: errors.end   },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                {f.label} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="time" value={form[f.key]}
                onChange={e => onSet(f.key)(e.target.value)}
                aria-invalid={!!f.err}
                style={{
                  width: '100%', padding: '9px 12px',
                  border: `1px solid ${f.err ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-badge)', fontSize: 14,
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
              {f.err && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{f.err}</div>}
            </div>
          ))}
        </div>

        {/* Duration preview */}
        {form.start && form.end && (
          <div style={{ background: 'var(--color-bg-page)', borderRadius: 'var(--radius-badge)', padding: '8px 12px', marginBottom: 'var(--space-4)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            ⏱ Duration: <strong style={{ color: 'var(--color-text-primary)' }}>{calcDuration(form.start, form.end)}</strong>
          </div>
        )}

        {/* Color picker */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            Shift Color
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {colorOptions.map(opt => (
              <button
                key={opt.color}
                aria-label={`Select ${opt.label} color`}
                aria-pressed={form.color === opt.color}
                onClick={() => { onSet('color')(opt.color); onSet('bg')(opt.bg); }}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: opt.bg, border: `2.5px solid ${form.color === opt.color ? opt.color : 'transparent'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: form.color === opt.color ? `0 0 0 3px ${opt.bg}` : 'none',
                  transition: 'border 0.15s',
                }}
              >
                <div style={{ width: 16, height: 16, borderRadius: 4, background: opt.color }} />
              </button>
            ))}
          </div>
        </div>

        {/* Department checkboxes */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            Assign to Departments <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {allDepts.map(dept => {
              const checked = form.depts.includes(dept);
              return (
                <label
                  key={dept}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px',
                    border: `1px solid ${checked ? form.color : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-badge)',
                    background: checked ? form.bg : 'var(--color-bg-page)',
                    cursor: 'pointer', fontSize: 13, fontWeight: checked ? 600 : 400,
                    color: checked ? form.color : 'var(--color-text-primary)',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox" checked={checked}
                    onChange={() => onToggleDept(dept)}
                    style={{ accentColor: form.color, width: 14, height: 14 }}
                    aria-label={dept}
                  />
                  {dept}
                </label>
              );
            })}
          </div>
          {errors.depts && (
            <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>{errors.depts}</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button
            className="header-btn"
            onClick={onClose}
            aria-label="Cancel"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            aria-label={isEdit ? 'Save changes' : 'Create shift'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', background: 'var(--color-info)',
              border: 'none', borderRadius: 'var(--radius-badge)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Save size={14} /> {isEdit ? 'Save Changes' : 'Create Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}