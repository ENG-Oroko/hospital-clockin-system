// src/data/sidebarData.ts
import { NavItem, NotificationItem } from './types'

export const navItems: NavItem[] = [
  { iconName: 'LayoutDashboard', label: 'Dashboard',       path: '/'               },
  {
    iconName: 'Users',
    label: 'Department',
    path: '/departments',
    children: [
      { label: 'Departments', path: '/departments' },
      { label: 'employees', path: '/employees' },
    ],
  },
  { iconName: 'UserCheck', label: 'Attendance',       path: '/attendance'  },
  { iconName: 'Calendar',  label: 'Leave',             path: '/leave'       },
  { iconName: 'Activity',  label: 'Shift Scheduling',  path: '/shifts'      },
  { iconName: 'DollarSign',label: 'Payroll',           path: '/payroll'     },
  { iconName: 'FileText',  label: 'Reports',           path: '/reports'     },
  { iconName: 'Bell',      label: 'Notifications',     path: '/notifications', badge: 5 },
  { iconName: 'Cpu', label: 'Devices',                  path: '/devices'    },
  { iconName: 'Settings',  label: 'Settings',          path: '/settings'    },
]

export const notificationsData: NotificationItem[] = [
  { text: 'ICU staffing below minimum threshold',   time: '22 min ago', color: '#dc2626' },
]