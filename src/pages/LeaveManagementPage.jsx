import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Calendar } from 'lucide-react';

// Only people currently / upcoming ON LEAVE — view only, no approve/reject
const ON_LEAVE = [
  { name:'Kevin Osei',    id:'#EMP-0187', dept:'ICU',        type:'Sick',     start:'May 31', end:'May 31',   days:1,  remaining:0,  initials:'KO', avatarBg:'#DCFCE7', avatarColor:'#16A34A' },
  { name:'Fatima Asante', id:'#EMP-0388', dept:'Nursing',    type:'Annual',   start:'May 28', end:'Jun 4',    days:7,  remaining:4,  initials:'FA', avatarBg:'#FFEDD5', avatarColor:'#EA580C' },
  { name:'Sarah Njoku',   id:'#EMP-0342', dept:'Nursing',    type:'Annual',   start:'Jun 2',  end:'Jun 9',    days:7,  remaining:7,  initials:'SN', avatarBg:'#DBEAFE', avatarColor:'#2563EB' },
  { name:'Aisha Mensah',  id:'#EMP-0561', dept:'Surgery',    type:'Annual',   start:'Jun 15', end:'Jun 22',   days:7,  remaining:7,  initials:'AM', avatarBg:'#FFEDD5', avatarColor:'#EA580C' },
  { name:'Tunde Dada',    id:'#EMP-0294', dept:'Emergency',  type:'Maternity',start:'Jun 1',  end:'Aug 31',   days:91, remaining:88, initials:'TD', avatarBg:'#FEE2E2', avatarColor:'#DC2626' },
  { name:'Paula Kusi',    id:'#EMP-0448', dept:'ICU',        type:'Casual',   start:'Jun 5',  end:'Jun 5',    days:1,  remaining:1,  initials:'PK', avatarBg:'#DCFCE7', avatarColor:'#16A34A' },
  { name:'Ben Sarkodie',  id:'#EMP-0139', dept:'Radiology',  type:'Sick',     start:'May 30', end:'Jun 1',    days:3,  remaining:2,  initials:'BS', avatarBg:'#DBEAFE', avatarColor:'#2563EB' },
];

const TYPE_COLORS = {
  Annual:    { bg:'var(--color-info-bg)',    color:'var(--color-info)'    },
  Sick:      { bg:'var(--color-danger-bg)',  color:'var(--color-danger)'  },
  Maternity: { bg:'var(--color-warning-bg)', color:'var(--color-warning)' },
  Casual:    { bg:'var(--color-success-bg)', color:'var(--color-success)' },
};

const AVATAR_COLORS = [
  ['#DBEAFE','#2563EB'],['#DCFCE7','#16A34A'],['#FFEDD5','#EA580C'],
  ['#FEE2E2','#DC2626'],['#F3E8FF','#7C3AED'],['#CFFAFE','#0891B2'],
];

export default function LeaveManagementPage() {
  const [search,    setSearch]    = useState('');
  const [collapsed, setCollapsed] = useState({});

  const departments = [...new Set(ON_LEAVE.map(r => r.dept))].sort();

  const filtered = ON_LEAVE.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.dept.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = departments.reduce((acc, dept) => {
    const rows = filtered.filter(r => r.dept === dept);
    if (rows.length > 0) acc[dept] = rows;
    return acc;
  }, {});

  const toggle = dept => setCollapsed(prev => ({ ...prev, [dept]: !prev[dept] }));

  // summary
  const total   = ON_LEAVE.length;
  const annual  = ON_LEAVE.filter(r => r.type === 'Annual').length;
  const sick    = ON_LEAVE.filter(r => r.type === 'Sick').length;
  const other   = total - annual - sick;

  return (
    <>
      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'var(--space-6)' }}>
        {[
          { label:'Total On Leave', value:total,  bg:'var(--color-info-bg)',    color:'var(--color-info)'    },
          { label:'Annual Leave',   value:annual, bg:'var(--color-success-bg)', color:'var(--color-success)' },
          { label:'Sick Leave',     value:sick,   bg:'var(--color-danger-bg)',  color:'var(--color-danger)'  },
          { label:'Other Leave',    value:other,  bg:'var(--color-warning-bg)', color:'var(--color-warning)' },
        ].map(s => (
          <div className="card" key={s.label} style={{ display:'flex', alignItems:'center', gap:'var(--space-4)' }}>
            <div style={{ width:44, height:44, borderRadius:10, background:s.bg, color:s.color,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize:'var(--text-label)', color:'var(--color-text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize:24, fontWeight:700, color:'var(--color-text-primary)', lineHeight:1.2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{ padding:'var(--space-4) var(--space-6)' }}>
        <div style={{ position:'relative', maxWidth:400 }}>
          <Search size={16} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-tertiary)' }} aria-hidden="true" />
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search staff on leave…"
            aria-label="Search staff on leave"
            style={{ width:'100%', padding:'9px 12px 9px 34px', border:'1px solid var(--color-border)', borderRadius:'var(--radius-badge)', fontSize:14, fontFamily:'inherit', outline:'none', background:'var(--color-bg-page)' }}
          />
        </div>
      </div>

      {/* Grouped by department */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'var(--space-12)', color:'var(--color-text-tertiary)' }}>
          <Calendar size={36} style={{ opacity:0.25, marginBottom:'var(--space-3)' }} />
          <div style={{ fontSize:14, fontWeight:500 }}>No staff on leave match your search.</div>
        </div>
      ) : (
        Object.entries(grouped).map(([dept, rows], dIdx) => {
          const isCollapsed = collapsed[dept];
          const [dbg, dc]   = AVATAR_COLORS[dIdx % AVATAR_COLORS.length];

          return (
            <div className="card" key={dept} style={{ padding:0, overflow:'hidden' }}>
              <button
                onClick={() => toggle(dept)}
                aria-expanded={!isCollapsed}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:'var(--space-3)',
                  padding:'var(--space-4) var(--space-6)', background:'var(--color-bg-page)',
                  border:'none', borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
                  cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                }}
              >
                <div style={{ width:38, height:38, borderRadius:10, background:dbg, color:dc,
                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:16, flexShrink:0 }}>
                  {dept[0]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'var(--color-text-primary)' }}>{dept}</div>
                  <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:2 }}>
                    {rows.length} {rows.length === 1 ? 'person' : 'people'} on leave
                  </div>
                </div>
                {isCollapsed
                  ? <ChevronRight size={18} color="var(--color-text-tertiary)" />
                  : <ChevronDown  size={18} color="var(--color-text-tertiary)" />}
              </button>

              {!isCollapsed && (
                <div style={{ overflowX:'auto' }}>
                  <table className="data-table" style={{ margin:0 }} aria-label={`${dept} staff on leave`}>
                    <thead>
                      <tr>
                        <th>Employee</th><th>Leave Type</th>
                        <th>Start</th><th>End</th>
                        <th>Total Days</th><th>Days Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const tc = TYPE_COLORS[row.type] || TYPE_COLORS.Casual;
                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="emp-cell">
                                <div className="emp-avatar" style={{ background:row.avatarBg, color:row.avatarColor }} aria-hidden="true">
                                  {row.initials}
                                </div>
                                <div><div className="emp-name">{row.name}</div><div className="emp-id">{row.id}</div></div>
                              </div>
                            </td>
                            <td>
                              <span style={{ background:tc.bg, color:tc.color, padding:'3px 8px', borderRadius:'var(--radius-pill)', fontSize:11, fontWeight:500 }}>
                                {row.type}
                              </span>
                            </td>
                            <td style={{ fontSize:13, color:'var(--color-text-secondary)' }}>{row.start}</td>
                            <td style={{ fontSize:13, color:'var(--color-text-secondary)' }}>{row.end}</td>
                            <td style={{ fontWeight:600 }}>{row.days}d</td>
                            <td>
                              <span style={{
                                fontWeight:600,
                                color: row.remaining === 0 ? 'var(--color-text-tertiary)' : 'var(--color-warning)',
                              }}>
                                {row.remaining === 0 ? 'Ends today' : `${row.remaining}d left`}
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