import React from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Bell, ChevronDown } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard':     { title: 'Hospital Admin Dashboard',  sub: "Welcome back, Dr. Amara — here's what's happening today." },
  '/employees':     { title: 'Employee Records',          sub: 'View all hospital staff grouped by department.'            },
  '/departments':   { title: 'Department Management',     sub: 'Create departments and assign department heads.'           },
  '/attendance':    { title: 'Attendance Tracking',       sub: 'Monitor daily attendance logs and status.'                 },
  '/leave':         { title: 'Leave Management',          sub: 'Review and process all leave requests.'                    },
  '/roster':        { title: 'Shift Management',          sub: 'Create and manage shift templates for the hospital.'       },
  '/payroll':       { title: 'Payroll',                   sub: 'Monthly payroll summaries grouped by department.'          },
  '/reports':       { title: 'Reports & Analytics',       sub: 'Generate and export detailed analytical reports.'          },
  '/devices':       { title: 'Device Management',         sub: 'Manage ZKTeco SenseFace 2A terminals.'                    },
  '/notifications': { title: 'Notifications',             sub: 'System alerts and outbound messages.'                      },
  '/settings':      { title: 'Settings',                  sub: 'Configure hospital-specific operational rules.'            },
};

export default function HeaderBar({ onToast }) {
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] || PAGE_TITLES['/dashboard'];

  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="header-title">{page.title}</div>
        <div className="header-subtitle">{page.sub}</div>
      </div>
      <div className="header-right">
        <button className="header-btn" aria-label="Select date range"
          onClick={() => onToast('Date range picker opened', 'info')}>
          <Calendar size={16} aria-hidden="true" />
          May 1 – May 31, 2025
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        <button className="notif-btn" aria-label="Notifications, 7 unread"
          onClick={() => onToast('Opening notifications…', 'info')}>
          <Bell size={18} aria-hidden="true" />
          <span className="notif-badge" aria-hidden="true">7</span>
        </button>
        <div className="user-profile" role="button" tabIndex={0} aria-label="User profile"
          onClick={() => onToast('Opening profile menu…', 'info')}
          onKeyDown={e => e.key === 'Enter' && onToast('Opening profile menu…', 'info')}>
          <div className="user-avatar" aria-hidden="true">AK</div>
          <div className="user-info">
            <span className="user-name">Dr. Amara K.</span>
            <span className="user-role">Hospital Admin</span>
          </div>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}