// src/components/DeviceCard.tsx
import React from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Device } from '../data/types'

interface Props {
  device:  Device
  onPing:  (id: string) => void
}

const FIELD_ROWS = [
  { label: 'Serial',    key: 'id'       },
  { label: 'IP',        key: 'ip'       },
  { label: 'Firmware',  key: 'firmware' },
  { label: 'Last Seen', key: 'lastSeen' },
] as const

const DeviceCard: React.FC<Props> = ({ device, onPing }) => {
  const isOnline = device.status === 'online'

  return (
    <div
      style={{
        border:       `1px solid ${isOnline ? '#e5e7eb' : '#fecaca'}`,
        borderRadius: 12,
        padding:      16,
        background:   isOnline ? '#ffffff' : '#fff5f5',
        display:      'flex',
        flexDirection:'column',
        gap:          12,
        transition:   'box-shadow .15s',
      }}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.07)')
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLElement).style.boxShadow = 'none')
      }
    >
      {/* ── Top row ── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            12,
        }}
      >
        {/* Icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            aria-hidden="true"
            style={{
              width:          36,
              height:         36,
              borderRadius:   8,
              background:     isOnline ? '#dcfce7' : '#fee2e2',
              color:          isOnline ? '#16a34a' : '#dc2626',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
            }}
          >
            {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#111827', lineHeight: 1.3 }}>
              {device.name}
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
              {device.location}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span
          style={{
            padding:      '3px 8px',
            borderRadius: 999,
            fontSize:     11,
            fontWeight:   600,
            whiteSpace:   'nowrap',
            flexShrink:   0,
            background:   isOnline ? '#dcfce7' : '#fee2e2',
            color:        isOnline ? '#16a34a' : '#dc2626',
          }}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* ── Meta grid ── */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 8,
          background:          '#f9fafb',
          borderRadius:        8,
          padding:             '10px 12px',
        }}
      >
        {FIELD_ROWS.map(f => (
          <div key={f.label}>
            <p
              style={{
                fontSize:      10,
                color:         '#9ca3af',
                fontWeight:    600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom:  2,
              }}
            >
              {f.label}
            </p>
            <p style={{ fontSize: 12, color: '#111827', fontWeight: 500 }}>
              {device[f.key]}
            </p>
          </div>
        ))}
      </div>

      {/* ── Reconnect button (offline only) ── */}
      {!isOnline && (
        <button
          onClick={() => onPing(device.id)}
          aria-label={`Attempt reconnect for ${device.name}`}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            6,
            width:          '100%',
            padding:        '8px 0',
            border:         '1px solid #dc2626',
            borderRadius:   8,
            background:     '#fee2e2',
            color:          '#dc2626',
            fontSize:       12,
            fontWeight:     600,
            cursor:         'pointer',
            fontFamily:     'inherit',
            transition:     'background .15s',
          }}
          onMouseEnter={e =>
            ((e.currentTarget as HTMLElement).style.background = '#fecaca')
          }
          onMouseLeave={e =>
            ((e.currentTarget as HTMLElement).style.background = '#fee2e2')
          }
        >
          <RefreshCw size={12} />
          Attempt Reconnect
        </button>
      )}
    </div>
  )
}

export default DeviceCard