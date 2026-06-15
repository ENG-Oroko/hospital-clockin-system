import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, UserCheck, UserX, Clock, Users } from 'lucide-react';

const EMPLOYEES = [
  { id:'#EMP-0342', name:'Sarah Njoku',     dept:'Nursing',      role:'Senior Nurse',      status:'present', phone:'+233 24 000 0001', joined:'Jan 12, 2021' },
  { id:'#EMP-0187', name:'Kevin Osei',       dept:'ICU',           role:'ICU Specialist',   status:'leave',   phone:'+233 24 000 0002', joined:'Mar 4, 2019'  },
  { id:'#EMP-0561', name:'Aisha Mensah',     dept:'Surgery',      role:'Surgical Nurse',    status:'present', phone:'+233 24 000 0003', joined:'Jul 8, 2022'  },
  { id:'#EMP-0294', name:'Tunde Dada',       dept:'Emergency',    role:'ER Physician',      status:'absent',  phone:'+233 24 000 0004', joined:'Feb 19, 2020' },
  { id:'#EMP-0103', name:'James Addo',       dept:'Radiology',    role:'Radiologist',       status:'present', phone:'+233 24 000 0005', joined:'Sep 1, 2018'  },
  { id:'#EMP-0448', name:'Paula Kusi',       dept:'ICU',           role:'ICU Nurse',         status:'present', phone:'+233 24 000 0006', joined:'Nov 22, 2021' },
  { id:'#EMP-0729', name:'Lena Boateng',     dept:'Nursing',      role:'Head Nurse',        status:'present', phone:'+233 24 000 0007', joined:'Apr 3, 2017'  },
  { id:'#EMP-0215', name:'Mark Owusu',       dept:'Emergency',    role:'ER Technician',     status:'present', phone:'+233 24 000 0008', joined:'Oct 14, 2020' },
  { id:'#EMP-0388', name:'Fatima Asante',    dept:'Nursing',      role:'Staff Nurse',       status:'leave',   phone:'+233 24 000 0009', joined:'Jun 7, 2022'  },
  { id:'#EMP-0471', name:'Ebo Kyei',         dept:'ICU',           role:'Intensivist',       status:'present', phone:'+233 24 000 0010', joined:'Aug 30, 2019' },
  { id:'#EMP-0602', name:'Ruth Acheampong',  dept:'Surgery',      role:'Scrub Nurse',       status:'present', phone:'+233 24 000 0011', joined:'Dec 12, 2021' },
  { id:'#EMP-0139', name:'Ben Sarkodie',     dept:'Radiology',    role:'Sonographer',       status:'absent',  phone:'+233 24 000 0012', joined:'May 5, 2020'  },
  { id:'#EMP-0844', name:'Clara Nkrumah',    dept:'General Ward', role:'Ward Nurse',        status:'present', phone:'+233 24 000 0013', joined:'Feb 28, 2023' },
  { id:'#EMP-0912', name:'Daniel Mensah',    dept:'Pharmacy',     role:'Pharmacist',        status:'present', phone:'+233 24 000 0014', joined:'Jan 9, 2020'  },
  { id:'#EMP-0055', name:'Grace Ofori',      dept:'Admin',        role:'Admin Officer',     status:'present', phone:'+233 24 000 0015', joined:'Mar 17, 2018' },
];

const STATUS_CONFIG = {
  present: { label: 'Present',  bg: 'var(--color-success-bg)', color: 'var(--color-success)', Icon: UserCheck },
  leave:   { label: 'On Leave', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', Icon: Clock     },
  absent:  { label: 'Absent',   bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  Icon: UserX     },
};

const AVATAR_COLORS = [
  ['#DBEAFE','#2563EB'],['#DCFCE7','#16A34A'],['#FFEDD5','#EA580C'],
  ['#FEE2E2','#DC2626'],['#F3E8FF','#7C3AED'],['#CFFAFE','#0891B2'],
];

export default function EmployeesPage() {
  const [search,    setSearch]   = useState('');
  const [collapsed, setCollapsed] = useState({});

  // group by department
  const departments = [...new Set(EMPLOYEES.map(e => e.dept))].sort();

  const filtered = EMPLOYEES.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.id.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  // rebuild grouped from filtered
  const grouped = departments.reduce((acc, dept) => {
    const members = filtered.filter(e => e.dept === dept);
    if (members.length > 0) acc[dept] = members;
    return acc;
  }, {});

  const toggleDept = (dept) =>
    setCollapsed(prev => ({ ...prev, [dept]: !prev[dept] }));

  // summary stats
  const total   = EMPLOYEES.length;
  const present = EMPLOYEES.filter(e => e.status === 'present').length;
  const onLeave = EMPLOYEES.filter(e => e.status === 'leave').length;
  const absent  = EMPLOYEES.filter(e => e.status === 'absent').length;

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-6)' }}>
        {[
          { label: 'Total Staff',   value: total,   bg: 'var(--color-info-bg)',    color: 'var(--color-info)',    Icon: Users     },
          { label: 'Present Today', value: present, bg: 'var(--color-success-bg)', color: 'var(--color-success)', Icon: UserCheck },
          { label: 'On Leave',      value: onLeave, bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', Icon: Clock     },
          { label: 'Absent',        value: absent,  bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  Icon: UserX     },
        ].map(s => (
          <div className="card" key={s.label}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.Icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{ padding: 'var(--space-4) var(--space-6)' }}>
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} aria-hidden="true" />
          <input
            type="search" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, or role…"
            aria-label="Search employees"
            style={{
              width: '100%', padding: '9px 12px 9px 34px',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-badge)',
              fontSize: 14, fontFamily: 'inherit', outline: 'none',
              background: 'var(--color-bg-page)',
            }}
          />
        </div>
      </div>

      {/* Grouped by department */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-tertiary)' }}>
          <Users size={36} style={{ opacity: 0.25, marginBottom: 'var(--space-3)' }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>No employees match your search.</div>
        </div>
      ) : (
        Object.entries(grouped).map(([dept, members], dIdx) => {
          const isCollapsed = collapsed[dept];
          const [dbg, dc]   = AVATAR_COLORS[dIdx % AVATAR_COLORS.length];
          const deptPresent = members.filter(e => e.status === 'present').length;
          const deptLeave   = members.filter(e => e.status === 'leave').length;
          const deptAbsent  = members.filter(e => e.status === 'absent').length;

          return (
            <div className="card" key={dept} style={{ padding: 0, overflow: 'hidden' }}>
              {/* Dept header — clickable to collapse */}
              <button
                onClick={() => toggleDept(dept)}
                aria-expanded={!isCollapsed}
                aria-controls={`dept-section-${dept}`}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-6)',
                  background: 'var(--color-bg-page)', border: 'none',
                  borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                {/* dept color block */}
                <div style={{ width: 38, height: 38, borderRadius: 10, background: dbg, color: dc,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {dept[0]}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                    {dept}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      {members.length} staff
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 500 }}>
                      {deptPresent} present
                    </span>
                    {deptLeave > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 500 }}>
                        {deptLeave} on leave
                      </span>
                    )}
                    {deptAbsent > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 500 }}>
                        {deptAbsent} absent
                      </span>
                    )}
                  </div>
                </div>

                {isCollapsed
                  ? <ChevronRight size={18} color="var(--color-text-tertiary)" aria-hidden="true" />
                  : <ChevronDown  size={18} color="var(--color-text-tertiary)" aria-hidden="true" />
                }
              </button>

              {/* Employee rows */}
              {!isCollapsed && (
                <div id={`dept-section-${dept}`}>
                  <table className="data-table" style={{ margin: 0 }} aria-label={`${dept} staff`}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Role</th>
                        <th>Phone</th>
                        <th>Joined</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((emp, eIdx) => {
                        const [abg, ac] = AVATAR_COLORS[eIdx % AVATAR_COLORS.length];
                        const st = STATUS_CONFIG[emp.status];
                        const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                        return (
                          <tr key={emp.id}>
                            <td>
                              <div className="emp-cell">
                                <div className="emp-avatar"
                                  style={{ background: abg, color: ac }}
                                  aria-hidden="true">
                                  {initials}
                                </div>
                                <div>
                                  <div className="emp-name">{emp.name}</div>
                                  <div className="emp-id">{emp.id}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{emp.role}</td>
                            <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{emp.phone}</td>
                            <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{emp.joined}</td>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', borderRadius: 'var(--radius-pill)',
                                fontSize: 11, fontWeight: 600,
                                background: st.bg, color: st.color,
                              }}>
                                <st.Icon size={10} aria-hidden="true" />
                                {st.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}