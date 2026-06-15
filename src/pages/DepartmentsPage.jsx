import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users, X, Save, Building2 } from 'lucide-react';

const AVATAR_COLORS = [
  ['#DBEAFE', '#2563EB'], ['#DCFCE7', '#16A34A'], ['#FFEDD5', '#EA580C'],
  ['#FEE2E2', '#DC2626'], ['#F3E8FF', '#7C3AED'], ['#CFFAFE', '#0891B2'],
];

const ALL_STAFF = [
  { id: '#EMP-0342', name: 'Sarah Njoku',      dept: 'Nursing'       },
  { id: '#EMP-0187', name: 'Kevin Osei',         dept: 'ICU'           },
  { id: '#EMP-0561', name: 'Aisha Mensah',       dept: 'Surgery'       },
  { id: '#EMP-0294', name: 'Tunde Dada',         dept: 'Emergency'     },
  { id: '#EMP-0103', name: 'James Addo',         dept: 'Radiology'     },
  { id: '#EMP-0448', name: 'Paula Kusi',         dept: 'ICU'           },
  { id: '#EMP-0729', name: 'Lena Boateng',       dept: 'Nursing'       },
  { id: '#EMP-0215', name: 'Mark Owusu',         dept: 'Emergency'     },
  { id: '#EMP-0388', name: 'Fatima Asante',      dept: 'Nursing'       },
  { id: '#EMP-0471', name: 'Ebo Kyei',           dept: 'ICU'           },
  { id: '#EMP-0602', name: 'Ruth Acheampong',    dept: 'Surgery'       },
  { id: '#EMP-0139', name: 'Ben Sarkodie',       dept: 'Radiology'     },
  { id: '#EMP-0844', name: 'Clara Nkrumah',      dept: 'General Ward'  },
  { id: '#EMP-0912', name: 'Daniel Mensah',      dept: 'Pharmacy'      },
  { id: '#EMP-0055', name: 'Grace Ofori',        dept: 'Admin'         },
];

const INITIAL_DEPTS = [
  { id: 1, name: 'Nursing',      headId: '#EMP-0729', costCode: 'CC-001', floor: 'Floor 2' },
  { id: 2, name: 'ICU',          headId: '#EMP-0471', costCode: 'CC-002', floor: 'Floor 3' },
  { id: 3, name: 'Surgery',      headId: '#EMP-0602', costCode: 'CC-003', floor: 'Floor 4' },
  { id: 4, name: 'Emergency',    headId: '#EMP-0294', costCode: 'CC-004', floor: 'Ground'  },
  { id: 5, name: 'Radiology',    headId: '#EMP-0103', costCode: 'CC-005', floor: 'Floor 1' },
  { id: 6, name: 'General Ward', headId: '#EMP-0844', costCode: 'CC-006', floor: 'Floor 2' },
  { id: 7, name: 'Pharmacy',     headId: '#EMP-0912', costCode: 'CC-007', floor: 'Ground'  },
  { id: 8, name: 'Admin',        headId: '#EMP-0055', costCode: 'CC-008', floor: 'Floor 1' },
];

const EMPTY_FORM = { name: '', headId: '', costCode: '', floor: '' };

export default function DepartmentsPage({ onToast }) {
  const [departments, setDepartments] = useState(INITIAL_DEPTS);
  const [showModal,   setShowModal]   = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});

  const staffFor  = (deptName) => ALL_STAFF.filter(s => s.dept === deptName);
  const headFor   = (headId)   => ALL_STAFF.find(s => s.id === headId);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setForm({ name: dept.name, headId: dept.headId, costCode: dept.costCode, floor: dept.floor });
    setEditingId(dept.id);
    setErrors({});
    setShowModal(true);
  };

  const close = () => { setShowModal(false); setEditingId(null); setErrors({}); };

  const setF = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Department name is required.';
    if (!form.headId)         e.headId  = 'Please assign a department head.';
    if (!form.costCode.trim())e.costCode = 'Cost code is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    if (editingId) {
      setDepartments(prev => prev.map(d =>
        d.id === editingId ? { ...d, ...form } : d));
      onToast(`✓ "${form.name}" updated`, 'success');
    } else {
      setDepartments(prev => [...prev, { ...form, id: Date.now() }]);
      onToast(`✓ "${form.name}" department created`, 'success');
    }
    close();
  };

  const deleteDept = (dept) => {
    setDepartments(prev => prev.filter(d => d.id !== dept.id));
    onToast(`"${dept.name}" department removed`, 'danger');
  };

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-6)' }}>
        {[
          { label: 'Total Departments', value: departments.length,  bg: 'var(--color-info-bg)',    color: 'var(--color-info)'    },
          { label: 'Total Staff',        value: ALL_STAFF.length,    bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
          { label: 'Dept Heads Assigned',value: departments.filter(d => d.headId).length, bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
        ].map(s => (
          <div className="card" key={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Department cards */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Departments</div>
            <div className="card-subtitle">Clinical and operational structure of the hospital</div>
          </div>
          <button
            onClick={openCreate}
            aria-label="Create new department"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', background: 'var(--color-info)',
              border: 'none', borderRadius: 'var(--radius-badge)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={15} /> Create Department
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-4)' }}>
          {departments.map((dept, idx) => {
            const [abg, ac] = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const staff     = staffFor(dept.name);
            const head      = headFor(dept.headId);
            const headInitials = head ? head.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';

            return (
              <div key={dept.id}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: 'var(--space-5)',
                  background: 'var(--color-bg-surface)',
                }}>
                {/* header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: abg, color: ac,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {dept.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>{dept.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                        {dept.costCode} · {dept.floor}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                    <button
                      className="action-btn"
                      style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
                      aria-label={`Edit ${dept.name}`}
                      onClick={() => openEdit(dept)}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="action-btn"
                      style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}
                      aria-label={`Delete ${dept.name}`}
                      onClick={() => deleteDept(dept)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* dept head */}
                <div style={{ marginBottom: 'var(--space-3)', padding: '8px 10px',
                  background: 'var(--color-bg-page)', borderRadius: 'var(--radius-badge)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: abg, color: ac,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {headInitials}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department Head</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {head ? head.name : <span style={{ color: 'var(--color-danger)', fontStyle: 'italic' }}>Unassigned</span>}
                    </div>
                  </div>
                </div>

                {/* staff count + avatars */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {staff.slice(0, 5).map((s, i) => {
                      const [sbg, sc] = AVATAR_COLORS[i % AVATAR_COLORS.length];
                      const ini = s.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                      return (
                        <div key={s.id}
                          title={s.name}
                          style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: sbg, color: sc, fontSize: 9, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid #fff',
                            marginLeft: i === 0 ? 0 : -8,
                          }}>
                          {ini}
                        </div>
                      );
                    })}
                    {staff.length > 5 && (
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'var(--color-border)', color: 'var(--color-text-secondary)',
                        fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', border: '2px solid #fff', marginLeft: -8,
                      }}>
                        +{staff.length - 5}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    <Users size={13} aria-hidden="true" />
                    {staff.length} staff
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <DeptModal
          form={form}
          errors={errors}
          isEdit={!!editingId}
          allStaff={ALL_STAFF}
          onSet={setF}
          onSave={save}
          onClose={close}
        />
      )}
    </>
  );
}

function DeptModal({ form, errors, isEdit, allStaff, onSet, onSave, onClose }) {
  return (
    <div
      role="dialog" aria-modal="true"
      aria-label={isEdit ? 'Edit department' : 'Create department'}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 500, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
          <div style={{ fontSize: 'var(--text-heading)', fontWeight: 700 }}>
            {isEdit ? 'Edit Department' : 'Create Department'}
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Department Name <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text" value={form.name}
              onChange={e => onSet('name')(e.target.value)}
              placeholder="e.g. Paediatrics"
              aria-invalid={!!errors.name}
              style={{
                width: '100%', padding: '9px 12px',
                border: `1px solid ${errors.name ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-badge)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
            {errors.name && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errors.name}</div>}
          </div>

          {/* dept head */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Assign Department Head <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              value={form.headId}
              onChange={e => onSet('headId')(e.target.value)}
              aria-invalid={!!errors.headId}
              style={{
                width: '100%', padding: '9px 12px',
                border: `1px solid ${errors.headId ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-badge)', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', background: '#fff', cursor: 'pointer',
              }}
            >
              <option value="">— Select a staff member —</option>
              {allStaff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id}) · {s.dept}
                </option>
              ))}
            </select>
            {errors.headId && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errors.headId}</div>}
          </div>

          {/* cost code */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Cost Centre Code <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text" value={form.costCode}
              onChange={e => onSet('costCode')(e.target.value)}
              placeholder="e.g. CC-009"
              aria-invalid={!!errors.costCode}
              style={{
                width: '100%', padding: '9px 12px',
                border: `1px solid ${errors.costCode ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-badge)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
            {errors.costCode && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errors.costCode}</div>}
          </div>

          {/* floor / location */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
              Floor / Location
            </label>
            <input
              type="text" value={form.floor}
              onChange={e => onSet('floor')(e.target.value)}
              placeholder="e.g. Floor 2, East Wing"
              style={{
                width: '100%', padding: '9px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-badge)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
          <button className="header-btn" onClick={onClose}>Cancel</button>
          <button
            onClick={onSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', background: 'var(--color-info)',
              border: 'none', borderRadius: 'var(--radius-badge)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Save size={14} /> {isEdit ? 'Save Changes' : 'Create Department'}
          </button>
        </div>
      </div>
    </div>
  );
}