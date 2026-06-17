// src/components/Toast.tsx
import React, { useEffect } from 'react'
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { Toast as ToastType } from '../data/types'

interface Props {
  toasts:   ToastType[]
  onRemove: (id: number) => void
}

const CFG = {
  success: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0', icon: <CheckCircle  size={16} /> },
  info:    { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe', icon: <Info          size={16} /> },
  warning: { bg: '#ffedd5', color: '#ea580c', border: '#fed7aa', icon: <AlertTriangle size={16} /> },
  danger:  { bg: '#fee2e2', color: '#dc2626', border: '#fecaca', icon: <XCircle       size={16} /> },
}

const ToastItem: React.FC<{ toast: ToastType; onRemove: (id: number) => void }> = ({
  toast,
  onRemove,
}) => {
  const cfg = CFG[toast.type]

  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 3500)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  return (
    <div
      role="alert"
      style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          10,
        padding:      '12px 14px',
        background:   cfg.bg,
        border:       `1px solid ${cfg.border}`,
        borderRadius: 10,
        boxShadow:    '0 4px 16px rgba(0,0,0,.10)',
        minWidth:     280,
        maxWidth:     360,
        animation:    'slideIn .2s ease',
      }}
    >
      {/* Icon */}
      <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>
        {cfg.icon}
      </span>

      {/* Message */}
      <span
        style={{
          flex:       1,
          fontSize:   13,
          fontWeight: 500,
          color:      cfg.color,
          lineHeight: 1.45,
        }}
      >
        {toast.message}
      </span>

      {/* Dismiss */}
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          flexShrink:     0,
          background:     'none',
          border:         'none',
          color:          cfg.color,
          opacity:        0.6,
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          padding:        2,
          borderRadius:   4,
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

const ToastContainer: React.FC<Props> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
      <div
        style={{
          position:      'fixed',
          bottom:        24,
          right:         24,
          zIndex:        999,
          display:       'flex',
          flexDirection: 'column',
          gap:           10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={onRemove} />
          </div>
        ))}
      </div>
    </>
  )
}

export default ToastContainer