// src/pages/ReportsPage.tsx
import React, { useState } from 'react'
import { FileText, Download, Search } from 'lucide-react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { reportsData } from '../data'

const typeCfg = {
  pdf:  { bg: '#fee2e2', color: '#dc2626', label: 'PDF'  },
  xlsx: { bg: '#dcfce7', color: '#16a34a', label: 'XLSX' },
  csv:  { bg: '#dbeafe', color: '#2563eb', label: 'CSV'  },
}

const ReportsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [generated, setGenerated] = useState(false)

  const filtered = reportsData.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Reports"
        subtitle="Generate and download hospital operations reports"
        action={
          <button
            onClick={() => { setGenerated(true); setTimeout(() => setGenerated(false), 2000) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <FileText size={15} />
            {generated ? '✓ Generating…' : 'Generate Report'}
          </button>
        }
      />

      {/* Quick generate cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {[
          { label: 'Attendance Summary', sub: 'Daily / Monthly',  color: '#2563eb', bg: '#dbeafe' },
          { label: 'Leave Analysis',     sub: 'By dept & type',   color: '#16a34a', bg: '#dcfce7' },
          { label: 'Overtime Report',    sub: 'Hours & cost',     color: '#ea580c', bg: '#ffedd5' },
          { label: 'Headcount Report',   sub: 'Dept breakdown',   color: '#7c3aed', bg: '#ede9fe' },
        ].map(r => (
          <button
            key={r.label}
            style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
              padding: '20px', textAlign: 'left', cursor: 'pointer',
              transition: 'box-shadow .15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <FileText size={18} color={r.color} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.label}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.sub}</p>
          </button>
        ))}
      </div>

      {/* Reports list */}
      <Card
        title="Recent Reports"
        action={
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…"
              style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', width: 180 }}
            />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.map((r, i) => {
            const cfg = typeCfg[r.type]
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < filtered.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{r.title}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.category} · {r.date} · {r.size}</p>
                </div>
                <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>{cfg.label}</span>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f5f6fa', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}
                  aria-label={`Download ${r.title}`}
                >
                  <Download size={13} /> Download
                </button>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export default ReportsPage