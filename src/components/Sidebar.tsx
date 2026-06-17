// src/components/Sidebar.tsx
import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Clock, Bell,
  Settings, LogOut, HelpCircle, ChevronDown, ChevronRight,
  Activity, FileText, UserCheck,  Building2, DollarSign,
  MessageCircle, Cpu,   
} from 'lucide-react'
import { navItems } from '../data'

const ICONS: Record<string, React.ReactElement> = {
  LayoutDashboard: <LayoutDashboard size={20} />,
  Users:           <Users           size={20} />,
  Building2:       <Building2       size={20} />,
  UserCheck:       <UserCheck       size={20} />,
  Calendar:        <Calendar        size={20} />,
  Clock:           <Clock           size={20} />,
  Activity:        <Activity        size={20} />,
  DollarSign:      <DollarSign      size={20} />,
  FileText:        <FileText        size={20} />,
  Bell:            <Bell            size={20} />,
  Cpu:             <Cpu             size={20} />,
  Settings:        <Settings        size={20} />,
}

interface Props { collapsed: boolean; onToggle: () => void }

const Sidebar: React.FC<Props> = ({ collapsed, onToggle }) => {
  const location = useLocation()
  const [expanded, setExpanded] = useState<string[]>([]) // which parent items are expanded

  const toggle = (label: string) =>
    setExpanded(p =>
      p.includes(label) ? p.filter(l => l !== label) : [...p, label]
    )

  return (
    <aside
      style={{
        width:         collapsed ? 64 : 240,
        minWidth:      collapsed ? 64 : 240,
        height:        '100vh',
        background:    '#0f1b3d',
        display:       'flex',
        flexDirection: 'column',
        transition:    'width .25s ease, min-width .25s ease',
        overflow:      'hidden',
        flexShrink:    0,
        position:      'relative',
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding:        collapsed ? '16px 0' : '20px 24px',
          borderBottom:   '1px solid rgba(255,255,255,.08)',
          display:        'flex',
          alignItems:     'center',
          gap:            12,
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexShrink:     0,
        }}
      >
        <div
          style={{
            background:     '#2563eb',
            borderRadius:   8,
            width:          32,
            height:         32,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}
        >
          <Activity  size={20} color="#fff" />
        </div>

        {!collapsed && (
          <span
            style={{
              color:      '#fff',
              fontWeight: 700,
              fontSize:   15,
              whiteSpace: 'nowrap',
            }}
          >
            CityCare
          </span>
        )}
         
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            marginLeft:   collapsed ? 0 : 'auto',
            color:        'rgba(255,255,255,.4)',
            display:      'flex',
            alignItems:   'center',
            padding:      4,
            borderRadius: 6,
            flexShrink:   0,
          }}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
          }
        </button>
      </div>

      {/* ── Section label ── */}
      {!collapsed && (
        <div
          style={{
            padding:       '14px 24px 4px',
            color:         'rgba(255,255,255,.28)',
            fontSize:      11,
            fontWeight:    600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            flexShrink:    0,
          }}
        >
          Main menu
        </div>
      )}

      {/* ── Nav (scrollable, takes remaining space) ── */}
      <nav
        style={{
          flex:       1,
          overflowY:  'auto',
          overflowX:  'hidden',
          padding:    '8px 0',
          /* hide scrollbar but keep scrollability */
          scrollbarWidth: 'none',
        }}
      >
        {navItems.map(item => {
          const isExp = expanded.includes(item.label)
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' &&
              location.pathname.startsWith(item.path ?? '__'))

          /* ── Items with children ── */
          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggle(item.label)}
                  aria-label={collapsed ? item.label : undefined}
                  style={{
                    width:          isActive ? 'calc(100% - 16px)' : '100%',
                    margin:         isActive ? '0 8px' : 0,
                    display:        'flex',
                    alignItems:     'center',
                    gap:            12,
                    padding:        collapsed ? '11px 0' : '10px 16px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background:     isActive ? '#2563eb' : 'transparent',
                    borderRadius:   isActive ? 8 : 0,
                    color:          isActive ? '#fff' : 'rgba(255,255,255,.6)',
                    transition:     'background .15s',
                    border:         'none',
                    cursor:         'pointer',
                    fontFamily:     'inherit',
                  }}
                >
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    {ICONS[item.iconName]}
                  </span>
                  {!collapsed && (
                    <>
                      <span style={{ fontSize: 14, flex: 1, textAlign: 'left' }}>
                        {item.label}
                      </span>
                      {isExp
                        ? <ChevronDown  size={14} />
                        : <ChevronRight size={14} />
                      }
                    </>
                  )}
                </button>

                {!collapsed && isExp && (
                  <div style={{ paddingLeft: 32 }}>
                    {item.children.map(child => (
                      <NavLink
                        key={child.label}
                        to={child.path ?? '#'}
                        style={({ isActive: ca }) => ({
                          width:          '100%',
                          display:        'flex',
                          alignItems:     'center',
                          padding:        '7px 16px',
                          color:          ca ? '#fff' : 'rgba(255,255,255,.38)',
                          fontSize:       13,
                          textDecoration: 'none',
                        })}
                      >
                        <span
                          style={{
                            width:        4,
                            height:       4,
                            borderRadius: '50%',
                            background:   'currentColor',
                            marginRight:  12,
                            flexShrink:   0,
                          }}
                        />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          /* ── Plain NavLink ── */
          return (
            <NavLink
              key={item.label}
              to={item.path ?? '/'}
              aria-label={collapsed ? item.label : undefined}
              style={({ isActive: na }) => ({
                width:          na ? 'calc(100% - 16px)' : '100%',
                margin:         na ? '2px 8px' : '2px 0',
                display:        'flex',
                alignItems:     'center',
                gap:            12,
                padding:        collapsed ? '11px 0' : '10px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background:     na ? '#2563eb' : 'transparent',
                borderRadius:   na ? 8 : 0,
                color:          na ? '#fff' : 'rgba(255,255,255,.6)',
                textDecoration: 'none',
                transition:     'background .15s',
              })}
            >
              <span style={{ flexShrink: 0, display: 'flex' }}>
                {ICONS[item.iconName]}
              </span>
              {!collapsed && (
                <>
                  <span style={{ fontSize: 14, flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      style={{
                        background:   '#dc2626',
                        color:        '#fff',
                        fontSize:     11,
                        fontWeight:   600,
                        padding:      '1px 6px',
                        borderRadius: 999,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ══════════════════════════════════════════
          FOOTER — always visible at the bottom
      ══════════════════════════════════════════ */}
      <div
        style={{
          flexShrink:  0,                                    /* never shrink */
          borderTop:   '1px solid rgba(255,255,255,.08)',
          padding:     collapsed ? '12px 0' : 16,
          background:  '#0f1b3d',                            /* same as sidebar so it's solid */
        }}
      >
        {collapsed ? (
          /* ── Collapsed: just two icon buttons ── */
          <div
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            8,
            }}
          >
            {/* Help icon */}
            <button
              aria-label="Need Help? Contact IT support"
              title="Need Help?"
              style={{
                width:          40,
                height:         40,
                borderRadius:   10,
                background:     'rgba(255,255,255,.07)',
                border:         'none',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                color:          'rgba(255,255,255,.55)',
                cursor:         'pointer',
                transition:     'background .15s, color .15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.14)'
                ;(e.currentTarget as HTMLElement).style.color      = '#fff'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.07)'
                ;(e.currentTarget as HTMLElement).style.color      = 'rgba(255,255,255,.55)'
              }}
            >
              <HelpCircle size={18} />
            </button>

            {/* Logout icon */}
            <button
              aria-label="Logout"
              title="Logout"
              style={{
                width:          40,
                height:         40,
                borderRadius:   10,
                background:     'transparent',
                border:         'none',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                color:          'rgba(255,255,255,.45)',
                cursor:         'pointer',
                transition:     'background .15s, color .15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = '#fee2e2'
                ;(e.currentTarget as HTMLElement).style.color      = '#dc2626'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color      = 'rgba(255,255,255,.45)'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          /* ── Expanded: full help card + logout row ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Help card */}
            <div
              style={{
                background:   'rgba(255,255,255,.07)',
                borderRadius: 10,
                padding:      '12px 14px',
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width:          28,
                    height:         28,
                    borderRadius:   8,
                    background:     'rgba(37,99,235,.4)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                  }}
                >
                  <HelpCircle size={15} color="#93c5fd" />
                </div>
                <span
                  style={{
                    color:      '#fff',
                    fontSize:   13,
                    fontWeight: 600,
                  }}
                >
                  Need Help?
                </span>
              </div>

              {/* Body text */}
              <p
                style={{
                  color:        'rgba(255,255,255,.42)',
                  fontSize:     12,
                  lineHeight:   1.5,
                  marginBottom: 10,
                }}
              >
                Contact the IT support team for assistance.
              </p>

              {/* Contact button */}
              <button
                style={{
                  width:          '100%',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            6,
                  padding:        '7px 0',
                  background:     'rgba(37,99,235,.35)',
                  border:         '1px solid rgba(37,99,235,.5)',
                  borderRadius:   7,
                  color:          '#93c5fd',
                  fontSize:       12,
                  fontWeight:     600,
                  cursor:         'pointer',
                  fontFamily:     'inherit',
                  transition:     'background .15s',
                }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,.55)')
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,.35)')
                }
                onClick={() => window.open('mailto:it-support@citycare.co.ke')}
              >
                <MessageCircle size={13} />
                Contact Support
              </button>
            </div>

            {/* Logout button */}
            <button
              aria-label="Logout"
              style={{
                width:        '100%',
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                padding:      '10px 12px',
                background:   'transparent',
                border:       '1px solid rgba(255,255,255,.08)',
                borderRadius: 8,
                color:        'rgba(255,255,255,.5)',
                fontSize:     14,
                cursor:       'pointer',
                fontFamily:   'inherit',
                transition:   'background .15s, color .15s, border-color .15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background   = '#fee2e2'
                ;(e.currentTarget as HTMLElement).style.color        = '#dc2626'
                ;(e.currentTarget as HTMLElement).style.borderColor  = '#fca5a5'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background   = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color        = 'rgba(255,255,255,.5)'
                ;(e.currentTarget as HTMLElement).style.borderColor  = 'rgba(255,255,255,.08)'
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar