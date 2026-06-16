// src/pages/SettingsPage.tsx
import React, { useState } from 'react'
import { User, Bell, Shield, Monitor } from 'lucide-react'
import Card       from '../components/Card'
import PageHeader from '../components/PageHeader'
import { notificationSettings, systemSettings, SettingToggle } from '../data'

/* Toggle switch component */
const Toggle: React.FC<{ enabled: boolean; onToggle: () => void; label: string }> = ({ enabled, onToggle, label }) => (
  <button
    role="switch"
    aria-checked={enabled}
    aria-label={label}
    onClick={onToggle}
    style={{
      width: 44, height: 24, borderRadius: 999, padding: 2,
      background: enabled ? '#2563eb' : '#e5e7eb',
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center',
      justifyContent: enabled ? 'flex-end' : 'flex-start',
      transition: 'background .2s',
      flexShrink: 0,
    }}
  >
    <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'all .2s' }} />
  </button>
)

/* Reusable settings section */
const SettingsSection: React.FC<{
  title: string
  icon: React.ReactElement
  items: SettingToggle[]
  onToggle: (i: number) => void
}> = ({ title, icon, items, onToggle }) => (
  <Card title={title} action={icon}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < items.length - 1 ? '1px solid #e5e7eb' : 'none', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{s.label}</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{s.description}</p>
          </div>
          <Toggle enabled={s.enabled} onToggle={() => onToggle(i)} label={s.label} />
        </div>
      ))}
    </div>
  </Card>
)

const SettingsPage: React.FC = () => {
  const [notifSettings, setNotifSettings] = useState<SettingToggle[]>(notificationSettings)
  const [sysSettings,   setSysSettings]   = useState<SettingToggle[]>(systemSettings)
  const [saved, setSaved] = useState(false)

  const toggleNotif = (i: number) =>
    setNotifSettings(p => p.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s))

  const toggleSys = (i: number) =>
    setSysSettings(p => p.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader
        title="Settings"
        subtitle="Manage your dashboard preferences"
        action={
          <button
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              background: saved ? '#16a34a' : '#2563eb',
              color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'background .2s',
            }}
          >
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        }
      />

      {/* Profile */}
      <Card title="Profile" action={<User size={18} color="#6b7280" />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { label: 'Full Name',    value: 'Dr. A. Mehta',          type: 'text'  },
            { label: 'Role',         value: 'Administrator',          type: 'text'  },
            { label: 'Email',        value: 'a.mehta@citycare.in',    type: 'email' },
            { label: 'Phone',        value: '+91 98000 00001',        type: 'tel'   },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{f.label}</label>
              <input
                type={f.type}
                defaultValue={f.value}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none' }}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Notification settings */}
      <SettingsSection
        title="Notification Preferences"
        icon={<Bell size={18} color="#6b7280" />}
        items={notifSettings}
        onToggle={toggleNotif}
      />

      {/* System settings */}
      <SettingsSection
        title="System Preferences"
        icon={<Monitor size={18} color="#6b7280" />}
        items={sysSettings}
        onToggle={toggleSys}
      />

      {/* Security */}
      <Card title="Security" action={<Shield size={18} color="#6b7280" />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button style={{ width: 'fit-content', padding: '8px 20px', background: '#f5f6fa', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#111827', cursor: 'pointer' }}>
            Change Password
          </button>
          <button style={{ width: 'fit-content', padding: '8px 20px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 14, color: '#dc2626', cursor: 'pointer' }}>
            Revoke All Sessions
          </button>
        </div>
      </Card>
    </div>
  )
}

export default SettingsPage