import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip,
} from 'chart.js';
import { Download, Search, ChevronDown, ChevronRight } from 'lucide-react';
import AttendanceHeatmap from '../components/AttendanceHeatmap';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const LOG_DATA = [
  { name:'Sarah Njoku',     id:'#EMP-0342', dept:'Nursing',     clockIn:'06:58', clockOut:'15:02', hours:8.1, status:'present', late:false },
  { name:'Lena Boateng',    id:'#EMP-0729', dept:'Nursing',     clockIn:'07:18', clockOut:'14:50', hours:7.5, status:'present', late:true  },
  { name:'Fatima Asante',   id:'#EMP-0388', dept:'Nursing',     clockIn:'—',     clockOut:'—',     hours:0,   status:'leave',   late:false },
  { name:'Kevin Osei',      id:'#EMP-0187', dept:'ICU',          clockIn:'—',     clockOut:'—',     hours:0,   status:'leave',   late:false },
  { name:'Paula Kusi',      id:'#EMP-0448', dept:'ICU',          clockIn:'06:55', clockOut:'15:00', hours:8.1, status:'present', late:false },
  { name:'Ebo Kyei',        id:'#EMP-0471', dept:'ICU',          clockIn:'07:05', clockOut:'15:30', hours:8.4, status:'present', late:false },
  { name:'Aisha Mensah',    id:'#EMP-0561', dept:'Surgery',     clockIn:'07:21', clockOut:'15:15', hours:7.9, status:'present', late:true  },
  { name:'Ruth Acheampong', id:'#EMP-0602', dept:'Surgery',     clockIn:'06:59', clockOut:'15:04', hours:8.1, status:'present', late:false },
  { name:'Tunde Dada',      id:'#EMP-0294', dept:'Emergency',   clockIn:'—',     clockOut:'—',     hours:0,   status:'absent',  late:false },
  { name:'Mark Owusu',      id:'#EMP-0215', dept:'Emergency',   clockIn:'07:28', clockOut:'15:10', hours:7.7, status:'present', late:true  },
  { name:'James Addo',      id:'#EMP-0103', dept:'Radiology',   clockIn:'07:03', clockOut:'15:58', hours:8.9, status:'present', late:false },
  { name:'Ben Sarkodie',    id:'#EMP-0139', dept:'Radiology',   clockIn:'—',     clockOut:'—',     hours:0,   status:'absent',  late:false },
  { name:'Clara Nkrumah',   id:'#EMP-0844', dept:'General Ward',clockIn:'07:00', clockOut:'15:00', hours:8.0, status:'present', late:false },
  { name:'Daniel Mensah',   id:'#EMP-0912', dept:'Pharmacy',    clockIn:'08:02', clockOut:'16:05', hours:8.0, status:'present', late:false },
  { name:'Grace Ofori',     id:'#EMP-0055', dept:'Admin',       clockIn:'07:55', clockOut:'16:00', hours:8.1, status:'present', late:false },
];

const STATUS_STYLE = {
  present: { bg:'var(--color-success-bg)', color:'var(--color-success)', label:'Present'  },
  leave:   { bg:'var(--color-warning-bg)', color:'var(--color-warning)', label:'On Leave' },
  absent:  { bg:'var(--color-danger-bg)',  color:'var(--color-danger)',  label:'Absent'   },
};

const AVATAR_COLORS = [
  ['#DBEAFE','#2563EB'],['#DCFCE7','#16A34A'],['#FFEDD5','#EA580C'],
  ['#FEE2E2','#DC2626'],['#F3E8FF','#7C3AED'],['#CFFAFE','#0891B2'],
];

const weekLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const weekData   = {
  present: [312, 298, 320, 305, 315, 180, 120],
  onLeave: [55,  60,  58,  62,  57,  30,  20 ],
  absent:  [28,  37,  17,  28,  23,  15,  10 ],
};

export default function AttendancePage({ onToast }) {
  const [search,    setSearch]    = useState('');
  const [collapsed, setCollapsed] = useState({});

  const departments = [...new Set(LOG_DATA.map(r => r.dept))].sort();

  const filtered = LOG_DATA.filter(r =>
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

  const chartData = {
    labels: weekLabels,
    datasets: [
      { label:'Present', data:weekData.present, borderColor:'#16A34A', borderWidth:2, pointRadius:3, tension:0.4, fill:false },
      { label:'On Leave',data:weekData.onLeave, borderColor:'#EA580C', borderWidth:2, pointRadius:3, tension:0.4, fill:false },
      { label:'Absent',  data:weekData.absent,  borderColor:'#DC2626', borderWidth:2, pointRadius:3, tension:0.4, fill:false },
    ],
  };
  const chartOptions = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ display:false }, tooltip:{ backgroundColor:'#1F2937', padding:10, cornerRadius:8 }},
    scales:{
      x:{ grid:{ color:'#F3F4F6' }, ticks:{ color:'#9CA3AF', font:{ size:11 }}},
      y:{ grid:{ color:'#F3F4F6' }, ticks:{ color:'#9CA3AF', font:{ size:11 }}},
    },
  };

  return (
    <>
      {/* Weekly trend + summary */}
      <div className="row-2col">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">This Week's Attendance</div>
              <div className="card-subtitle">Mon – Sun daily breakdown</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'var(--space-4)', marginBottom:'var(--space-4)' }}>
            {[['Present','#16A34A'],['On Leave','#EA580C'],['Absent','#DC2626']].map(([l,c]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:c }} aria-hidden="true" />
                <span style={{ fontSize:12, color:'var(--color-text-secondary)' }}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{ height:200 }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Today's Summary</div></div>
          {[
            { label:'Present',  value:986, pct:79, color:'var(--color-success)' },
            { label:'On Leave', value:174, pct:14, color:'var(--color-warning)' },
            { label:'Absent',   value:88,  pct:7,  color:'var(--color-danger)'  },
          ].map(item => (
            <div key={item.label} style={{ marginBottom:'var(--space-4)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:500, color:'var(--color-text-primary)' }}>{item.label}</span>
                <span style={{ fontSize:13, color:'var(--color-text-secondary)' }}>
                  {item.value} <span style={{ color:'var(--color-text-tertiary)' }}>({item.pct}%)</span>
                </span>
              </div>
              <div style={{ height:8, background:'var(--color-border)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${item.pct}%`, height:'100%', background:item.color, borderRadius:4, transition:'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="card" style={{ padding:'var(--space-4) var(--space-6)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'var(--space-3)' }}>
        <div style={{ position:'relative', flex:1, maxWidth:400 }}>
          <Search size={16} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-tertiary)' }} aria-hidden="true" />
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, or department…"
            aria-label="Search attendance log"
            style={{ width:'100%', padding:'9px 12px 9px 34px', border:'1px solid var(--color-border)', borderRadius:'var(--radius-badge)', fontSize:14, fontFamily:'inherit', outline:'none', background:'var(--color-bg-page)' }}
          />
        </div>
        <button className="header-btn" onClick={() => onToast('Exporting attendance log…','info')}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* Department-grouped attendance */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'var(--space-12)', color:'var(--color-text-tertiary)' }}>
          <Search size={32} style={{ opacity:0.25, marginBottom:'var(--space-3)' }} />
          <div style={{ fontSize:14, fontWeight:500 }}>No attendance records match your search.</div>
        </div>
      ) : (
        Object.entries(grouped).map(([dept, rows], dIdx) => {
          const isCollapsed  = collapsed[dept];
          const [dbg, dc]    = AVATAR_COLORS[dIdx % AVATAR_COLORS.length];
          const present = rows.filter(r => r.status === 'present').length;
          const leave   = rows.filter(r => r.status === 'leave').length;
          const absent  = rows.filter(r => r.status === 'absent').length;
          const late    = rows.filter(r => r.late).length;

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
                  <div style={{ display:'flex', gap:'var(--space-3)', marginTop:2, flexWrap:'wrap' }}>
                    <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>{rows.length} staff</span>
                    <span style={{ fontSize:11, color:'var(--color-success)', fontWeight:500 }}>{present} present</span>
                    {leave  > 0 && <span style={{ fontSize:11, color:'var(--color-warning)', fontWeight:500 }}>{leave} on leave</span>}
                    {absent > 0 && <span style={{ fontSize:11, color:'var(--color-danger)',  fontWeight:500 }}>{absent} absent</span>}
                    {late   > 0 && <span style={{ fontSize:11, color:'var(--color-warning)', fontWeight:500 }}>{late} late</span>}
                  </div>
                </div>
                {isCollapsed
                  ? <ChevronRight size={18} color="var(--color-text-tertiary)" />
                  : <ChevronDown  size={18} color="var(--color-text-tertiary)" />}
              </button>

              {!isCollapsed && (
                <div style={{ overflowX:'auto' }}>
                  <table className="data-table" style={{ margin:0 }} aria-label={`${dept} attendance`}>
                    <thead>
                      <tr>
                        <th>Employee</th><th>Clock In</th><th>Clock Out</th>
                        <th>Hours</th><th>Late?</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const [abg, ac] = AVATAR_COLORS[i % AVATAR_COLORS.length];
                        const st = STATUS_STYLE[row.status];
                        const initials = row.name.split(' ').map(n => n[0]).join('').slice(0,2);
                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="emp-cell">
                                <div className="emp-avatar" style={{ background:abg, color:ac }} aria-hidden="true">{initials}</div>
                                <div><div className="emp-name">{row.name}</div><div className="emp-id">{row.id}</div></div>
                              </div>
                            </td>
                            <td style={{ fontWeight: row.clockIn !== '—' ? 600 : 400, color: row.clockIn !== '—' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{row.clockIn}</td>
                            <td style={{ color: row.clockOut !== '—' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{row.clockOut}</td>
                            <td style={{ fontWeight:600 }}>{row.hours > 0 ? `${row.hours}h` : '—'}</td>
                            <td>
                              {row.late
                                ? <span style={{ background:'var(--color-warning-bg)', color:'var(--color-warning)', padding:'2px 8px', borderRadius:'var(--radius-pill)', fontSize:11, fontWeight:600 }}>Yes</span>
                                : <span style={{ color:'var(--color-text-tertiary)', fontSize:12 }}>—</span>}
                            </td>
                            <td>
                              <span style={{ background:st.bg, color:st.color, padding:'3px 8px', borderRadius:'var(--radius-pill)', fontSize:11, fontWeight:600 }}>
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

      {/* Heatmap */}
      <AttendanceHeatmap />
    </>
  );
}