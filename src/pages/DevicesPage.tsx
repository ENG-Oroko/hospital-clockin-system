// src/pages/DevicesPage.tsx
import React, { useState, useCallback } from 'react'
import { Monitor, Search, Filter, Wifi, WifiOff, Plus } from 'lucide-react'
import PageHeader          from '../components/PageHeader'
import DeviceCard          from '../components/DeviceCard'
import DeviceRegisterModal from '../components/DeviceRegisterModal'
import ToastContainer      from '../components/Toast'
import { devicesData }     from '../data'
import { Device, Toast }   from '../data/types'

type StatusFilter = 'all' | 'online' | 'offline'
let toastId = 0

const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>(devicesData)
  const [showReg, setShowReg] = useState(false)
  const [filter, setFilter]   = useState<StatusFilter>('all')
  const [search, setSearch]   = useState('')
  const [toasts, setToasts]   = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts(p => [...p, { id, message, type }])
  }, [])
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])

  const ping = useCallback((id: string) => {
    const device = devices.find(d => d.id === id)
    addToast(`Pinging ${device?.name ?? id}…`, 'info')
    setTimeout(() => {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, status: 'online', lastSeen: 'Just now' } : d))
      addToast(`✓ ${device?.name ?? id} is back online`, 'success')
    }, 1500)
  }, [devices, addToast])

  const online  = devices.filter(d => d.status === 'online').length
  const offline = devices.filter(d => d.status === 'offline').length
  const latestFirmware = 'v2.4.1'
  const outdated = devices.filter(d => d.firmware !== latestFirmware).length

  const displayed = devices.filter(d => {
    const matchF = filter === 'all' || d.status === filter
    const matchS = search === '' || d.name.toLowerCase().includes(search.toLowerCase()) || d.location.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase())
    return matchF && matchS
  })

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHeader title="Devices" subtitle="ZKTeco SenseFace 2A biometric terminals"
          action={
            <button onClick={() => setShowReg(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={15} /> Register Device
            </button>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {[
            { label: 'Total Devices',    value: devices.length, icon: <Monitor size={20} />, bg: '#dbeafe', color: '#2563eb' },
            { label: 'Online',           value: online,          icon: <Wifi     size={20} />, bg: '#dcfce7', color: '#16a34a' },
            { label: 'Offline',          value: offline,         icon: <WifiOff  size={20} />, bg: '#fee2e2', color: '#dc2626' },
            { label: 'Outdated Firmware',value: outdated,        icon: <Filter   size={20} />, bg: '#ffedd5', color: '#ea580c' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {outdated > 0 && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: 10, fontSize: 13, color: '#ea580c', fontWeight: 500 }}>
            <Filter size={16} style={{ flexShrink: 0 }} />
            <span><strong>{outdated} device{outdated > 1 ? 's are' : ' is'} running outdated firmware</strong> — latest is {latestFirmware}.</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, location or serial…"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {([{ key: 'all' as StatusFilter, label: `All (${devices.length})` }, { key: 'online' as StatusFilter, label: `Online (${online})` }, { key: 'offline' as StatusFilter, label: `Offline (${offline})` }]).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  background: filter === f.key ? '#2563eb' : '#fff', color: filter === f.key ? '#fff' : '#6b7280',
                  border: `1px solid ${filter === f.key ? '#2563eb' : '#e5e7eb'}` }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>Registered Terminals</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{displayed.length} device{displayed.length !== 1 ? 's' : ''}</p>
          </div>
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 14 }}>No devices match.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {displayed.map(device => <DeviceCard key={device.id} device={device} onPing={ping} />)}
            </div>
          )}
        </div>
      </div>

      {showReg && <DeviceRegisterModal onClose={() => setShowReg(false)} onSuccess={() => addToast('✓ Device registration code generated', 'success')} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

export default DevicesPage