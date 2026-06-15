import React, { useState } from 'react';
import { Download, FileText, Table, BarChart2, Loader } from 'lucide-react';

const REPORT_TYPES = [
  { id:'attendance',  label:'Attendance Summary',      icon:BarChart2, desc:'Daily/monthly attendance rates by department',    color:'blue'  },
  { id:'leave',       label:'Leave Analysis',           icon:FileText,  desc:'Leave utilisation and patterns across staff',     color:'amber' },
  { id:'overtime',    label:'Overtime Report',          icon:Table,     desc:'Overtime hours, costs, and top contributors',    color:'green' },
  { id:'lateness',    label:'Lateness & Absence Log',   icon:FileText,  desc:'Late arrivals and unexcused absences',            color:'red'   },
  { id:'payroll',     label:'Payroll Audit',            icon:BarChart2, desc:'Monthly payroll totals and deduction breakdown',  color:'blue'  },
  { id:'department',  label:'Department Summary',       icon:Table,     desc:'Headcount, attendance, and leave by department', color:'green' },
];

export default function ReportsPage({ onToast }) {
  const [generating, setGenerating] = useState(null);
  const [dateFrom, setDateFrom] = useState('2025-05-01');
  const [dateTo,   setDateTo]   = useState('2025-05-31');
  const [format,   setFormat]   = useState('pdf');

  const generate = (report) => {
    setGenerating(report.id);
    onToast(`Generating ${report.label}…`, 'info');
    setTimeout(() => {
      setGenerating(null);
      onToast(`✓ ${report.label} ready for download`, 'success');
    }, 2200);
  };

  const colorMap = {
    blue:  ['var(--color-info-bg)',    'var(--color-info)'   ],
    amber: ['var(--color-warning-bg)', 'var(--color-warning)'],
    green: ['var(--color-success-bg)', 'var(--color-success)'],
    red:   ['var(--color-danger-bg)',  'var(--color-danger)' ],
  };

  return (
    <>
      {/* Filters */}
      <div className="card">
        <div className="card-title" style={{ marginBottom:'var(--space-4)' }}>Report Configuration</div>
        <div style={{ display:'flex',gap:'var(--space-4)',flexWrap:'wrap',alignItems:'flex-end' }}>
          {[
            { label:'From Date', val:dateFrom, set:setDateFrom, type:'date' },
            { label:'To Date',   val:dateTo,   set:setDateTo,   type:'date' },
          ].map(f=>(
            <div key={f.label}>
              <label style={{ display:'block',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:6 }}>{f.label}</label>
              <input
                type={f.type} value={f.val}
                onChange={e=>f.set(e.target.value)}
                style={{ padding:'8px 12px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-badge)',fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff' }}
              />
            </div>
          ))}
          <div>
            <label style={{ display:'block',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:6 }}>Format</label>
            <select
              value={format} onChange={e=>setFormat(e.target.value)}
              style={{ padding:'8px 12px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-badge)',fontSize:13,fontFamily:'inherit',outline:'none',background:'#fff',cursor:'pointer' }}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'var(--space-6)' }}>
        {REPORT_TYPES.map(report=>{
          const [bg,color] = colorMap[report.color];
          const Icon = report.icon;
          const isGenerating = generating === report.id;
          return (
            <div className="card" key={report.id} style={{ display:'flex',flexDirection:'column',gap:'var(--space-4)' }}>
              <div style={{ display:'flex',alignItems:'flex-start',gap:'var(--space-3)' }}>
                <div style={{ width:40,height:40,borderRadius:10,background:bg,color,
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Icon size={18}/>
                </div>
                <div>
                  <div style={{ fontSize:15,fontWeight:600,color:'var(--color-text-primary)' }}>{report.label}</div>
                  <div style={{ fontSize:12,color:'var(--color-text-secondary)',marginTop:2,lineHeight:1.4 }}>{report.desc}</div>
                </div>
              </div>
              <div style={{ display:'flex',gap:'var(--space-2)',marginTop:'auto' }}>
                <button
                  style={{
                    flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                    padding:'8px',border:'1px solid var(--color-border)',
                    borderRadius:'var(--radius-badge)',fontSize:12,fontWeight:500,
                    background: isGenerating ? bg : 'var(--color-bg-page)',
                    color: isGenerating ? color : 'var(--color-text-secondary)',
                    cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',
                  }}
                  onClick={()=>generate(report)}
                  disabled={isGenerating}
                  aria-label={`Generate ${report.label}`}
                >
                  {isGenerating
                    ? <><Loader size={13} style={{ animation:'spin 1s linear infinite' }}/> Generating…</>
                    : <><Download size={13}/> Generate</>
                  }
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </>
  );
}