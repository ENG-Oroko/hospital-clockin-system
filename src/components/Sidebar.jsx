import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity, LayoutDashboard, Users, UserCheck, Calendar,
  Clock, DollarSign, BarChart2, Monitor, Bell, Settings,
  ChevronRight, LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',       path: '/dashboard'  },
  {
    icon: Users, label: 'Employees', path: '/employees',
    expandable: true,
    sub: [
      { label: 'All Staff',   path: '/employees'   },
      { label: 'Departments', path: '/departments' },
    ],
  },
  { icon: UserCheck,  label: 'Attendance',       path: '/attendance' },
  { icon: Calendar,   label: 'Leave Management', path: '/leave'      },
  { icon: Clock,      label: 'Shift Roster',     path: '/roster'     },
  { icon: DollarSign, label: 'Payroll',          path: '/payroll'    },
];

const SYSTEM_ITEMS = [
  { icon: BarChart2, label: 'Reports',       path: '/reports'        },
  { icon: Monitor,   label: 'Devices',       path: '/devices'        },
  { icon: Bell,      label: 'Notifications', path: '/notifications', badge: 5 },
  { icon: Settings,  label: 'Settings',      path: '/settings'       },
];

export default function Sidebar() {
  const location = useLocation();
  const [expanded, setExpanded] = useState({ Employees: true });

  const toggle = label =>
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  const NavItem = ({ item }) => {
    const Icon       = item.icon;
    const isExpanded = expanded[item.label];

    const anyChildActive = item.sub?.some(s =>
      location.pathname === s.path.split('?')[0]);

    if (item.expandable) {
      return (
        <>
          <div
            className={`nav-item${anyChildActive ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => toggle(item.label)}
            onKeyDown={e => e.key === 'Enter' && toggle(item.label)}
            aria-expanded={isExpanded}
          >
            <Icon size={20} aria-hidden="true" />
            <span className="nav-item-label">{item.label}</span>
            <ChevronRight
              size={16}
              className="nav-chevron"
              aria-hidden="true"
              style={{
                transform:  isExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
                opacity:    0.5,
              }}
            />
          </div>
          {isExpanded && (
            <div className="sub-nav">
              {item.sub.map(s => (
                <NavLink
                  key={s.label}
                  to={s.path}
                  className={({ isActive }) =>
                    `sub-nav-item${isActive ? ' active' : ''}`}
                >
                  <div className="sub-nav-dot" aria-hidden="true" />
                  {s.label}
                </NavLink>
              ))}
            </div>
          )}
        </>
      );
    }

    return (
      <NavLink
        to={item.path}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <Icon size={20} aria-hidden="true" />
        <span className="nav-item-label">{item.label}</span>
        {item.badge && (
          <span className="nav-badge" aria-label={`${item.badge} unread`}>
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" aria-hidden="true">
          <Activity size={20} color="#fff" />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">CityCare</span>
          <span className="sidebar-brand-sub">HOSPITAL ADMIN</span>
        </div>
      </div>

      {/* Main nav */}
      <nav aria-label="Main menu">
        <div className="sidebar-section-label">MAIN MENU</div>
        {NAV_ITEMS.map(item => <NavItem key={item.label} item={item} />)}
      </nav>

      {/* System nav */}
      <nav aria-label="System menu">
        <div className="sidebar-section-label">SYSTEM</div>
        {SYSTEM_ITEMS.map(item => <NavItem key={item.label} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-help-card">
          <div className="sidebar-help-title">Need Help?</div>
          <div className="sidebar-help-text">
            Contact support for technical assistance.
          </div>
          <button className="sidebar-help-btn">Open Support Ticket</button>
        </div>
        <div
          className="nav-item logout"
          role="button"
          tabIndex={0}
          aria-label="Logout"
        >
          <LogOut size={20} aria-hidden="true" />
          <span className="nav-item-label">Logout</span>
        </div>
      </div>
    </aside>
  );
}