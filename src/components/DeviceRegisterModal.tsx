// src/components/DeviceRegisterModal.tsx
import React, { useEffect, useState } from 'react'
import { Key, Copy, Check, X } from 'lucide-react'

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

/** Generate a 6-digit one-time code */
const makeCode = () =>
  String(Math.floor(100000 + Math.random() * 900000))

const DeviceRegisterModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [code]      = useState(makeCode)
  const [copied,  setCopied]  = useState(false)
  const [seconds, setSeconds] = useState(600)   // 10-minute countdown

  /* Countdown timer */
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const copyCode = () => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Register new device"
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,.45)',
        zIndex:         500,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background:   '#fff',
          borderRadius: 16,
          padding:      32,
          width:        '100%',
          maxWidth:     420,
          boxShadow:    '0 20px 60px rgba(0,0,0,.18)',
          position:     'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position:       'absolute',
            top:            16,
            right:          16,
            background:     'none',
            border:         'none',
            color:          '#9ca3af',
            cursor:         'pointer',
            display:        'flex',
            padding:        4,
            borderRadius:   6,
          }}
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width:          36,
              height:         36,
              borderRadius:   8,
              background:     '#dbeafe',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <Key size={18} color="#2563eb" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Register New Terminal
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              ZKTeco SenseFace 2A
            </p>
          </div>
        </div>

        {/* OTP display */}
        <div
          style={{
            textAlign:    'center',
            padding:      '24px 20px',
            background:   '#dbeafe',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize:      11,
              color:         '#6b7280',
              marginBottom:  8,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight:    600,
            }}
          >
            One-Time Activation Code
          </p>

          {/* Code + copy button */}
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            12,
            }}
          >
            <span
              style={{
                fontSize:    48,
                fontWeight:  700,
                color:       '#2563eb',
                letterSpacing: 12,
                fontFamily:  'monospace',
                lineHeight:  1,
              }}
            >
              {code}
            </span>
            <button
              onClick={copyCode}
              aria-label="Copy activation code"
              title="Copy code"
              style={{
                background:     copied ? '#dcfce7' : 'rgba(255,255,255,.7)',
                border:         `1px solid ${copied ? '#bbf7d0' : '#bfdbfe'}`,
                borderRadius:   8,
                padding:        '6px 8px',
                cursor:         'pointer',
                color:          copied ? '#16a34a' : '#2563eb',
                display:        'flex',
                alignItems:     'center',
                transition:     'all .15s',
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>

          {/* Countdown */}
          <p
            style={{
              fontSize:   12,
              color:      seconds < 60 ? '#dc2626' : '#6b7280',
              marginTop:  10,
              fontWeight: seconds < 60 ? 600 : 400,
            }}
          >
            {seconds > 0
              ? `Expires in ${mm}:${ss}`
              : '⚠ Code expired — close and try again'}
          </p>
        </div>

        {/* Instructions */}
        <ol
          style={{
            fontSize:      13,
            color:         '#6b7280',
            lineHeight:    1.7,
            marginBottom:  24,
            paddingLeft:   18,
          }}
        >
          <li>On the terminal, open <strong style={{ color: '#111827' }}>Menu</strong></li>
          <li>Go to <strong style={{ color: '#111827' }}>Network → Cloud Registration</strong></li>
          <li>Enter the code above and tap <strong style={{ color: '#111827' }}>Confirm</strong></li>
          <li>The device will pair automatically within 30 seconds</li>
        </ol>

        {/* Done */}
        <button
          disabled={seconds === 0}
          onClick={() => {
            onSuccess()
            onClose()
          }}
          style={{
            width:        '100%',
            padding:      11,
            background:   seconds === 0 ? '#93c5fd' : '#2563eb',
            border:       'none',
            borderRadius: 8,
            color:        '#fff',
            fontSize:     14,
            fontWeight:   600,
            cursor:       seconds === 0 ? 'not-allowed' : 'pointer',
            fontFamily:   'inherit',
            transition:   'background .15s',
          }}
        >
          {seconds === 0 ? 'Code Expired' : 'Done — Device Paired'}
        </button>
      </div>
    </div>
  )
}

export default DeviceRegisterModal