// src/pages/NotificationsPage.tsx
import React, { useState } from 'react'
import { AlertCircle, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { notificationsFullData, Severity } from '../data'
import { NotificationFull } from '../data/types'

const CFG: Record<Severity, { bg: string; color: string; icon: React.ReactElement; label: string }> = {
  danger:  { bg: '#fee2e2', color: '#dc2626', icon: <AlertCircle  size={16} />, label: 'Critical' },
  warning: { bg: '#ffedd5', color: '#ea580c', icon: <AlertTriangle size={16} />, label: 'Warning'  },
  info:    { bg: '#dbeafe', color: '#2563eb', icon: <Info          size={16} />, label: 'Info'     },
  success: { bg: '#dcfce7', color: '#16a34a', icon: <CheckCircle  size={16} />, label: 'Good'     },
}

const NotificationsPage: React.FC = () => {
  const [items, setItems]   = useState<NotificationFull[]>(notificationsFullData)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const markAllRead = () => setItems(p => p.map(n => ({ ...n, read: true })))
  const dismiss     = (id: number) => setItems(p => p.filter(n => n.id !== id))
  const markRead    = (id: number) => setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n))

  const unread  = items.filter(n => !n.read).length
  const display = filter === 'unread' ? items.filter(n => !n.read) : items

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread notification${unread !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={markAllRead}
            style={{ padding: '8px 16px', background: '#f5f6fa', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}
          >
            Mark all as read
          </button>
        }
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'all'    as const, label: `All (${items.length})`    },
          { key: 'unread' as const, label: `Unread (${unread})`       },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: filter === t.key ? 600 : 400,
              color:      filter === t.key ? '#2563eb' : '#6b7280',
              background: filter === t.key ? '#dbeafe' : 'transparent',
              transition: 'all .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <Card title="All Notifications">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {display.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>
              No notifications to show
            </div>
          )}
          {display.map((n, i) => {
            const c = CFG[n.severity]
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  padding: '16px 0',
                  borderBottom: i < display.length - 1 ? '1px solid #e5e7eb' : 'none',
                  background: n.read ? 'transparent' : '#fafbff',
                  cursor: 'pointer',
                  borderRadius: 8,
                  paddingLeft: 8, paddingRight: 8,
                  transition: 'background .1s',
                }}
              >
                {/* Unread dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : '#2563eb', marginTop: 6, flexShrink: 0 }} />

                {/* Icon */}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {c.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.title}</p>
                    <span style={{ background: c.bg, color: c.color, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999 }}>{c.label}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{n.body}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{n.time}</p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                  aria-label="Dismiss notification"
                  style={{ color: '#d1d5db', display: 'flex', alignItems: 'center', flexShrink: 0, padding: 4, borderRadius: 4 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export default NotificationsPage