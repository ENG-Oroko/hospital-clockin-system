import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const CONFIG = {
  success: { Icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' },
  danger:  { Icon: XCircle,     color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
  info:    { Icon: Info,         color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' },
  warning: { Icon: AlertTriangle,color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' },
};

export function ToastItem({ id, message, type, onRemove }) {
  const config = CONFIG[type] || CONFIG.info;
  const { Icon } = config;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 3500);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        maxWidth: '320px',
        animation: 'slideIn 0.3s ease',
      }}
    >
      <Icon size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => onRemove(id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.6,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  );
}