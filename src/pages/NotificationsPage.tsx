// src/pages/NotificationsPage.tsx
import React, { useState, useCallback } from 'react'
import {
  AlertCircle, AlertTriangle,
  XCircle, Info, CheckCircle,
  Bell, Trash2,
} from 'lucide-react'
import PageHeader     from '../components/PageHeader'
import ToastContainer from '../components/Toast'
import { initialNotifications } from '../data/notificationsPageData'
import {
  AppNotification,
  NotifIcon,
  NotifColor,
  Toast,
} from '../data/types'

/* ── Icon map ── */
const ICON_MAP: Record<NotifIcon, React.FC<{ size: number }>> = {
  AlertCircle,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle,
}

/* ── Colour map ── */
const COLOR_STYLES: Record<NotifColor, { bg: string; color: string }> = {
  red:   { bg: '#fee2e2', color: '#dc2626' },
  amber: { bg: '#ffedd5', color: '#ea580c' },
  blue:  { bg: '#dbeafe', color: '#2563eb' },
  green: { bg: '#dcfce7', color: '#16a34a' },
}

let toastId = 0
type FilterKey = 'all' | 'unread' | 'read'

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications)
  const [filter, setFilter]               = useState<FilterKey>('all')
  const [toasts, setToasts]               = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(p => [...p, { id, message, type }])
  }, [])
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])

  const markAllRead = () => {
    setNotifications(p => p.map(n => ({ ...n, read: true })))
    addToast('All notifications marked as read', 'success')
  }

  const dismiss = (id: number) => {
    setNotifications(p => p.filter(n => n.id !== id))
    addToast('Notification dismissed', 'info')
  }

  const markRead = (id: number) =>
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))

  const filtered: AppNotification[] = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read')   return  n.read
    return true
  })

  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHeader
          title="Notifications"
          subtitle="System alerts, approvals and status updates"
          action={
            unread > 0 ? (
              <button
                onClick={markAllRead}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f5f6fa', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Bell size={14} /> Mark all read
              </button>
            ) : undefined
          }
        />

        {/* Tabs + unread badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4 }}>
            {(['all', 'unread', 'read'] as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding:      '7px 16px',
                  borderRadius: 8,
                  fontSize:     13,
                  fontWeight:   filter === f ? 600 : 400,
                  color:        filter === f ? '#2563eb' : '#6b7280',
                  background:   filter === f ? '#dbeafe' : 'transparent',
                  border:       'none',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  transition:   'all .15s',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'unread' && unread > 0 && (
                  <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* List */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              <Bell size={32} style={{ opacity: .25, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>No notifications here</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {filtered.map((notif, i) => {
                const Icon   = ICON_MAP[notif.icon]
                const styles = COLOR_STYLES[notif.color]

                return (
                  <li
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    style={{
                      display:    'flex',
                      alignItems: 'flex-start',
                      gap:        16,
                      padding:    '16px 24px',
                      borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background:   notif.read ? '#fff' : '#fafbff',
                      cursor:       'pointer',
                      transition:   'background .1s',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f9fafb')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = notif.read ? '#fff' : '#fafbff')}
                  >
                    {/* Unread dot */}
                    <div
                      style={{
                        width:        8,
                        height:       8,
                        borderRadius: '50%',
                        background:   notif.read ? 'transparent' : '#2563eb',
                        marginTop:    14,
                        flexShrink:   0,
                      }}
                      aria-label={notif.read ? undefined : 'Unread'}
                    />

                    {/* Icon */}
                    <div
                      aria-hidden="true"
                      style={{
                        width:          36,
                        height:         36,
                        borderRadius:   8,
                        background:     styles.bg,
                        color:          styles.color,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        flexShrink:     0,
                      }}
                    >
                      <Icon size={16} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize:   14,
                          fontWeight: notif.read ? 500 : 700,
                          color:      '#111827',
                          lineHeight: 1.3,
                        }}
                      >
                        {notif.title}
                      </p>
                      <p style={{ fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 1.5 }}>
                        {notif.desc}
                      </p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 5 }}>
                        {notif.time}
                      </p>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(notif.id) }}
                      aria-label="Dismiss notification"
                      style={{
                        background:   'none',
                        border:       'none',
                        cursor:       'pointer',
                        color:        '#d1d5db',
                        display:      'flex',
                        alignItems:   'center',
                        padding:      4,
                        borderRadius: 6,
                        flexShrink:   0,
                        transition:   'color .15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#dc2626')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#d1d5db')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default NotificationsPage