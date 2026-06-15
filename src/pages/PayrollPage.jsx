import React, { useState } from 'react';
import { Download, Lock, ChevronDown, ChevronRight } from 'lucide-react';

const PAYROLL = [
  { name:'Sarah Njoku',     id:'#EMP-0342', dept:'Nursing',      basePay:32000, overtime:4800, deductions:1200, net:35600, status:'processed', initials:'SN', avatarBg:'#DBEAFE', avatarColor:'#2563EB' },
  { name:'Lena Boateng',    id:'#EMP-0729', dept:'Nursing',      basePay:35000, overtime:3500, deductions:1750, net:36750, status:'processed', initials:'LB', avatarBg:'#DCFCE7', avatarColor:'#16A34A' },
  { name:'Fatima Asante',   id:'#EMP-0388', dept:'Nursing',      basePay:29000, overtime:0,    deductions:2900, net:26100, status:'pending',   initials:'FA', avatarBg:'#FFEDD5', avatarColor:'#EA580C' },
  { name:'Kevin Osei',      id:'#EMP-0187', dept:'ICU',          basePay:41000, overtime:0,    deductions:4100, net:36900, status:'processed', initials:'KO', avatarBg:'#DCFCE7', avatarColor:'#16A34A' },
  { name:'Paula Kusi',      id:'#EMP-0448', dept:'ICU',          basePay:31000, overtime:1550, deductions:620,  net:31930, status:'processed', initials:'PK', avatarBg:'#DBEAFE', avatarColor:'#2563EB' },
  { name:'Ebo Kyei',        id:'#EMP-0471', dept:'ICU',          basePay:44000, overtime:4400, deductions:2200, net:46200, status:'pending',   initials:'EK', avatarBg:'#FEE2E2', avatarColor:'#DC2626' },
  { name:'Aisha Mensah',    id:'#EMP-0561', dept:'Surgery',      basePay:38000, overtime:1900, deductions:950,  net:38950, status:'pending',   initials:'AM', avatarBg:'#FFEDD5', avatarColor:'#EA580C' },
  { name:'Ruth Acheampong', id:'#EMP-0602', dept:'Surgery',      basePay:33000, overtime:0,    deductions:1650, net:31350, status:'processed', initials:'RA', avatarBg:'#DCFCE7', avatarColor:'#16A34A' },
  { name:'Tunde Dada',      id:'#EMP-0294', dept:'Emergency',    basePay:45000, overtime:9000, deductions:2250, net:51750, status:'processed', initials:'TD', avatarBg:'#FEE2E2', avatarColor:'#DC2626' },
  { name:'Mark Owusu',      id:'#EMP-0215', dept:'Emergency',    basePay:30000, overtime:3000, deductions:1500, net:31500, status:'processed', initials:'MO', avatarBg:'#DBEAFE', avatarColor:'#2563EB' },
  { name:'James Addo',      id:'#EMP-0103', dept:'Radiology',    basePay:36000, overtime:3600, deductions:1800, net:37800, status:'pending',   initials:'JA', avatarBg:'#DBEAFE', avatarColor:'#2563EB' },
  { name:'Ben Sarkodie',    id:'#EMP-0139', dept:'Radiology',    basePay:32000, overtime:0,    deductions:1600, net:30400, status:'processed', initials:'BS', avatarBg:'#FFEDD5', avatarColor:'#EA580C' },
  { name:'Clara Nkrumah',   id:'#EMP-0844', dept:'General Ward', basePay:28000, overtime:0,    deductions:1400, net:26600, status:'processed', initials:'CN', avatarBg:'#FEE2E2', avatarColor:'#DC2626' },
  { name:'Daniel Mensah',   id:'#EMP-0912', dept:'Pharmacy',     basePay:31000, overtime:1550, deductions:930,  net:31620, status:'processed', initials:'DM', avatarBg:'#F3E8FF', avatarColor:'#7C3AED' },
  { name:'Grace Ofori',     id:'#EMP-0055', dept:'Admin',        basePay:27000, overtime:0,    deductions:1350, net:25650, status:'processed', initials:'GO', avatarBg:'#CFFAFE', avatarColor:'#0891B2' },
];

const AVATAR_COLORS = [
  ['#DBEAFE','#2563EB'],['#DCFCE7','#16A34A'],['#FFEDD5','#EA580C'],
  ['#FEE2E2','#DC2626'],['#F3E8FF','#7C3AED'],['#CFFAFE','#0891B2'],
];

const fmt = n => `KSH ${n.toLocaleString()}`;

export default function PayrollPage({ onToast }) {
  const [locked,    setLocked]    = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const departments = [...new Set(PAYROLL.map(r => r.dept))].sort();

  const grouped = departments.reduce((acc, dept) => {
    acc[dept] = PAYROLL.filter(r => r.dept === dept);
    return acc;
  }, {});

  const toggle = dept => setCollapsed(prev => ({ ...prev, [dept]: !prev[dept] }));

  const totalBase = PAYROLL.reduce((s, r) => s + r.basePay, 0);
  const totalOT   = PAYROLL.reduce((s, r) => s + r.overtime, 0);
  const totalDed  = PAYROLL.reduce((s, r) => s + r.deductions, 0);
  const totalNet  = PAYROLL.reduce((s, r) => s + r.net, 0);

  return (
    <>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-6)' }}>
        {[
          { label: 'Total Base Pay',   value: fmt(totalBase), Icon: '💰', c: ['var(--color-info-bg)',    'var(--color-info)'   ] },
          { label: 'Total Overtime',   value: fmt(totalOT),   Icon: '⏰', c: ['var(--color-warning-bg)', 'var(--color-warning)'] },
          { label: 'Total Deductions', value: fmt(totalDed),  Icon: '📉', c: ['var(--color-danger-bg)',  'var(--color-danger)' ] },
          { label: 'Total Net Pay',    value: fmt(totalNet),  Icon: '✅', c: ['var(--color-success-bg)', 'var(--color-success)'] },
        ].map(s => (
          <div className="card" key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.c[0], color: s.c[1],
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24 }}>
              {s.Icon}
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="card" style={{ padding: 'var(--space-4) var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>May 2025 Payroll</div>
          <div style={{ fontSize: 13, color: locked ? 'var(--color-danger)' : 'var(--color-text-secondary)', marginTop: 2 }}>
            {locked ? '🔒 Ledger locked — payroll finalized.' : 'Review all departments before locking the ledger.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="header-btn" onClick={() => onToast('Downloading payroll PDF…', 'info')}>
            <Download size={14} /> Export PDF
          </button>
          <button
            onClick={() => { setLocked(l => !l); onToast(locked ? 'Payroll ledger unlocked' : '🔒 Payroll finalized & locked', 'success'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: locked ? '#6B7280' : 'var(--color-info)',
              border: 'none', borderRadius: 'var(--radius-badge)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Lock size={14} /> {locked ? 'Unlock' : 'Lock Ledger'}
          </button>
        </div>
      </div>

      {/* Grouped tables */}
      {Object.entries(grouped).map(([dept, rows], dIdx) => {
        const isCollapsed  = collapsed[dept];
        const [dbg, dc]    = AVATAR_COLORS[dIdx % AVATAR_COLORS.length];
        const deptBase = rows.reduce((s, r) => s + r.basePay, 0);
        const deptOT   = rows.reduce((s, r) => s + r.overtime, 0);
        const deptDed  = rows.reduce((s, r) => s + r.deductions, 0);
        const deptNet  = rows.reduce((s, r) => s + r.net, 0);

        return (
          <div className="card" key={dept} style={{ padding: 0, overflow: 'hidden' }}>
            {/* dept header */}
            <button
              onClick={() => toggle(dept)}
              aria-expanded={!isCollapsed}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-6)',
                background: 'var(--color-bg-page)', border: 'none',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: dbg, color: dc,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {dept[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                  {dept}
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--color-text-tertiary)' }}>
                    {rows.length} staff
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Net: <strong style={{ color: 'var(--color-text-primary)' }}>{fmt(deptNet)}</strong>
                  <span style={{ margin: '0 6px', color: 'var(--color-border)' }}>|</span>
                  Base: {fmt(deptBase)}
                  <span style={{ margin: '0 6px', color: 'var(--color-border)' }}>|</span>
                  OT: <span style={{ color: 'var(--color-info)' }}>{fmt(deptOT)}</span>
                </div>
              </div>
              {isCollapsed
                ? <ChevronRight size={18} color="var(--color-text-tertiary)" />
                : <ChevronDown  size={18} color="var(--color-text-tertiary)" />
              }
            </button>

            {!isCollapsed && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ margin: 0 }} aria-label={`${dept} payroll`}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th style={{ textAlign: 'right' }}>Base Pay</th>
                        <th style={{ textAlign: 'right' }}>Overtime</th>
                        <th style={{ textAlign: 'right' }}>Deductions</th>
                        <th style={{ textAlign: 'right' }}>Net Pay</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => (
                        <tr key={row.id}>
                          <td>
                            <div className="emp-cell">
                              <div className="emp-avatar"
                                style={{ background: row.avatarBg, color: row.avatarColor }}
                                aria-hidden="true">
                                {row.initials}
                              </div>
                              <div>
                                <div className="emp-name">{row.name}</div>
                                <div className="emp-id">{row.id}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(row.basePay)}</td>
                          <td style={{ textAlign: 'right', fontSize: 13, color: row.overtime > 0 ? 'var(--color-info)' : 'var(--color-text-tertiary)', fontWeight: row.overtime > 0 ? 600 : 400 }}>
                            {row.overtime > 0 ? `+${fmt(row.overtime)}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--color-danger)', fontWeight: 500 }}>
                            -{fmt(row.deductions)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                            {fmt(row.net)}
                          </td>
                          <td>
                            <span style={{
                              background: row.status === 'processed' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                              color:      row.status === 'processed' ? 'var(--color-success)'    : 'var(--color-warning)',
                              padding: '3px 8px', borderRadius: 'var(--radius-pill)',
                              fontSize: 11, fontWeight: 600,
                            }}>
                              {row.status === 'processed' ? 'Processed' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* dept subtotal */}
                    <tfoot>
                      <tr style={{ background: 'var(--color-bg-page)' }}>
                        <td style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-secondary)', padding: 'var(--space-3)' }}>
                          {dept} Subtotal
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{fmt(deptBase)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--color-info)' }}>+{fmt(deptOT)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: 'var(--color-danger)' }}>-{fmt(deptDed)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmt(deptNet)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Grand total */}
      <div className="card" style={{ background: 'var(--color-bg-page)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>
            Grand Total — All Departments
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            {[
              { label: 'Base',       value: fmt(totalBase), color: 'var(--color-text-primary)' },
              { label: 'Overtime',   value: `+${fmt(totalOT)}`,  color: 'var(--color-info)'    },
              { label: 'Deductions', value: `-${fmt(totalDed)}`, color: 'var(--color-danger)'  },
              { label: 'Net Total',  value: fmt(totalNet),  color: 'var(--color-success)',      bold: true },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                <div style={{ fontSize: item.bold ? 18 : 15, fontWeight: item.bold ? 800 : 700, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}