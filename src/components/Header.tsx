// src/components/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, Calendar, Menu } from 'lucide-react';
import { notificationsData } from '../data';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        gap:            'var(--space-4)',
        flexWrap:       'wrap',
      }}
    >
      {/* ── Left ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
          style={{
            color:      'var(--color-text-secondary)',
            display:    'flex',
            alignItems: 'center',
            padding:    'var(--space-1)',
          }}
        >
          <Menu size={20} />
        </button>

        <div>
          <h1
            style={{
              fontSize:   'var(--text-display)',
              fontWeight: 700,
              color:      'var(--color-text-primary)',
              lineHeight: 1.2,
            }}
          >
            Hospital Admin Dashboard
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
            CityCare Medical Center — Staff Operations Overview
          </p>
        </div>
      </div>

      {/* ── Right ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>

        {/* Date range */}
        <button
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          'var(--space-2)',
            padding:      'var(--space-2) var(--space-4)',
            background:   'var(--color-bg-surface)',
            border:       '1px solid var(--color-border)',
            borderRadius: 'var(--radius-badge)',
            color:        'var(--color-text-primary)',
            fontSize:     'var(--text-body)',
            fontWeight:   500,
          }}
        >
          <Calendar size={15} color="var(--color-text-secondary)" />
          May 1 – May 31, 2025
          <ChevronDown size={13} color="var(--color-text-secondary)" />
        </button>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotif((v) => !v)}
            aria-label={`Notifications — ${notificationsData.length} unread`}
            style={{
              background:     'var(--color-bg-surface)',
              border:         '1px solid var(--color-border)',
              borderRadius:   'var(--radius-badge)',
              width:          38,
              height:         38,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          'var(--color-text-secondary)',
              position:       'relative',
            }}
          >
            <Bell size={17} />
            <span
              aria-hidden="true"
              style={{
                position:       'absolute',
                top:            -4,
                right:          -4,
                background:     'var(--color-danger)',
                color:          'white',
                fontSize:       10,
                fontWeight:     700,
                width:          16,
                height:         16,
                borderRadius:   'var(--radius-pill)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}
            >
              {notificationsData.length}
            </span>
          </button>

          {showNotif && (
            <div
              style={{
                position:     'absolute',
                top:          'calc(100% + 8px)',
                right:        0,
                width:        290,
                background:   'var(--color-bg-surface)',
                border:       '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                boxShadow:    '0 8px 24px rgba(0,0,0,.10)',
                zIndex:       200,
                overflow:     'hidden',
              }}
            >
              <div
                style={{
                  padding:      'var(--space-4) var(--space-4) var(--space-2)',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize:     'var(--text-label)',
                  fontWeight:   600,
                  color:        'var(--color-text-primary)',
                }}
              >
                Notifications
              </div>

              {notificationsData.map((n, i) => (
                <div
                  key={i}
                  style={{
                    padding:      'var(--space-3) var(--space-4)',
                    borderBottom: i < notificationsData.length - 1 ? '1px solid var(--color-border)' : 'none',
                    display:      'flex',
                    gap:          'var(--space-3)',
                    alignItems:   'flex-start',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width:        8,
                      height:       8,
                      borderRadius: '50%',
                      background:   n.color,
                      marginTop:    5,
                      flexShrink:   0,
                    }}
                  />
                  <div>
                    <p style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                      {n.text}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {n.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User avatar */}
        <button
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          'var(--space-2)',
            padding:      'var(--space-2) var(--space-3)',
            background:   'var(--color-bg-surface)',
            border:       '1px solid var(--color-border)',
            borderRadius: 'var(--radius-badge)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width:          30,
              height:         30,
              borderRadius:   '50%',
              background:     'var(--color-info-bg)',
              color:          'var(--color-info)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       'var(--text-label)',
              fontWeight:     700,
            }}
          >
            AM
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Dr. A. Mehta
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Administrator</div>
          </div>
          <ChevronDown size={13} color="var(--color-text-tertiary)" />
        </button>
      </div>
    </header>
  );
};

export default Header;