// src/pages/SettingsPage.tsx
import React, { useState, useCallback } from 'react'
import { Save, Clock, DollarSign, Bell, Shield } from 'lucide-react'
import PageHeader     from '../components/PageHeader'
import ToastContainer from '../components/Toast'
import { defaultSettings, TIMEZONE_OPTIONS } from '../data/settingsData'
import { HospitalSettings, Toast } from '../data/types'

let toastId = 0

/* ── Reusable toggle switch ── */
const Toggle: React.FC<{
  id:       string
  label:    string
  value:    boolean
  onChange: (v: boolean) => void
}> = ({ id, label, value, onChange }) => (
  <div
    style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '12px 0',
      borderBottom:   '1px solid #f3f4f6',
    }}
  >
    <label htmlFor={id} style={{ fontSize: 14, color: '#111827', cursor: 'pointer' }}>
      {label}
    </label>
    <button
      id={id}
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      style={{
        width:      44,
        height:     24,
        borderRadius: 12,
        border:     'none',
        cursor:     'pointer',
        background: value ? '#2563eb' : '#e5e7eb',
        position:   'relative',
        transition: 'background .2s',
        padding:    0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width:        18,
          height:       18,
          borderRadius: '50%',
          background:   '#fff',
          position:     'absolute',
          top:          3,
          left:         value ? 23 : 3,
          transition:   'left .2s',
          boxShadow:    '0 1px 3px rgba(0,0,0,.2)',
        }}
      />
    </button>
  </div>
)

/* ── Reusable text / number field ── */
const Field: React.FC<{
  label:    string
  value:    string
  onChange: (v: string) => void
  type?:    string
  min?:     string
  max?:     string
  step?:    string
  suffix?:  string
}> = ({ label, value, onChange, type = 'text', min, max, step, suffix }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
      {label}
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        style={{
          flex:         1,
          padding:      '9px 12px',
          border:       '1px solid #e5e7eb',
          borderRadius: 8,
          fontSize:     14,
          fontFamily:   'inherit',
          outline:      'none',
          background:   '#fff',
        }}
      />
      {suffix && (
        <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>
          {suffix}
        </span>
      )}
    </div>
  </div>
)

/* ── Section card wrapper ── */
const Section: React.FC<{
  title:    string
  iconBg:   string
  iconColor:string
  icon:     React.ReactNode
  children: React.ReactNode
  btnLabel: string
  btnColor: string
  onSave:   () => void
}> = ({ title, iconBg, iconColor, icon, children, btnLabel, btnColor, onSave }) => (
  <div
    style={{
      background:   '#fff',
      border:       '1px solid #e5e7eb',
      borderRadius: 12,
      padding:      24,
      display:      'flex',
      flexDirection:'column',
      gap:          0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div
        style={{
          width:          36,
          height:         36,
          borderRadius:   10,
          background:     iconBg,
          color:          iconColor,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{title}</p>
    </div>

    {children}

    <button
      onClick={onSave}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          6,
        padding:      '9px 16px',
        background:   btnColor,
        border:       'none',
        borderRadius: 8,
        color:        '#fff',
        fontSize:     13,
        fontWeight:   600,
        cursor:       'pointer',
        fontFamily:   'inherit',
        width:        'fit-content',
        marginTop:    16,
      }}
    >
      <Save size={14} /> {btnLabel}
    </button>
  </div>
)

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<HospitalSettings>(defaultSettings)
  const [toasts,   setToasts]   = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(p => [...p, { id, message, type }])
  }, [])
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])

  const set = <K extends keyof HospitalSettings>(key: K) =>
    (value: HospitalSettings[K]) =>
      setSettings(p => ({ ...p, [key]: value }))

  const otRate = parseFloat(settings.otMultiplier || '1') || 1

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHeader title="Settings" subtitle="Configure hospital operations and system preferences" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ── Hospital Profile ── */}
          <Section
            title="Hospital Profile"
            iconBg="#dbeafe" iconColor="#2563eb"
            icon={<Shield size={18} />}
            btnLabel="Save Profile" btnColor="#2563eb"
            onSave={() => addToast('✓ Hospital profile saved', 'success')}
          >
            <Field
              label="Hospital Name"
              value={settings.hospitalName}
              onChange={set('hospitalName')}
            />
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={e => set('timezone')(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff', cursor: 'pointer' }}
              >
                {TIMEZONE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </Section>

          {/* ── Attendance Rules ── */}
          <Section
            title="Attendance Rules"
            iconBg="#ffedd5" iconColor="#ea580c"
            icon={<Clock size={18} />}
            btnLabel="Save Rules" btnColor="#ea580c"
            onSave={() => addToast('✓ Attendance rules saved', 'success')}
          >
            <Field
              label="Grace Period (Lateness Margin)"
              value={settings.gracePeriod}
              onChange={set('gracePeriod')}
              type="number" min="0" max="60" suffix="minutes"
            />
            <Field
              label="Standard Working Hours per Shift"
              value={settings.workHours}
              onChange={set('workHours')}
              type="number" min="4" max="16" suffix="hours"
            />
          </Section>

          {/* ── Payroll Policy ── */}
          <Section
            title="Payroll Policy"
            iconBg="#dcfce7" iconColor="#16a34a"
            icon={<DollarSign size={18} />}
            btnLabel="Save Policy" btnColor="#16a34a"
            onSave={() => addToast('✓ Payroll policy saved', 'success')}
          >
            <Field
              label="Overtime Rate Multiplier"
              value={settings.otMultiplier}
              onChange={set('otMultiplier')}
              type="number" min="1" max="3" step="0.1" suffix="× base rate"
            />
            <div
              style={{
                padding:      '12px 14px',
                background:   '#f9fafb',
                borderRadius: 8,
                marginBottom: 4,
                fontSize:     13,
                color:        '#6b7280',
                lineHeight:   1.6,
              }}
            >
              Example: staff earning{' '}
              <strong style={{ color: '#111827' }}>KSH 2,000/hr</strong> at{' '}
              <strong style={{ color: '#111827' }}>{settings.otMultiplier}×</strong> earns{' '}
              <strong style={{ color: '#16a34a' }}>
                KSH {(2000 * otRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}/hr
              </strong>{' '}
              for overtime.
            </div>
          </Section>

          {/* ── Notification Preferences ── */}
          <Section
            title="Notification Preferences"
            iconBg="#fee2e2" iconColor="#dc2626"
            icon={<Bell size={18} />}
            btnLabel="Save Preferences" btnColor="#dc2626"
            onSave={() => addToast('✓ Notification preferences saved', 'success')}
          >
            <Toggle id="email-alerts"  label="Email Alerts for Absences"          value={settings.emailAlerts}  onChange={set('emailAlerts')}  />
            <Toggle id="sms-alerts"    label="SMS Alerts to Managers"              value={settings.smsAlerts}    onChange={set('smsAlerts')}    />
            <Toggle id="device-alerts" label="Device Offline Notifications"        value={settings.deviceAlerts} onChange={set('deviceAlerts')} />
            <Toggle id="auto-recon"    label="Automatic Nightly Reconciliation"    value={settings.autoRecon}    onChange={set('autoRecon')}    />
          </Section>

        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default SettingsPage