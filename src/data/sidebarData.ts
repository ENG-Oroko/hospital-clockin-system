// src/data/sidebarData.ts
import { NavItem, NotificationItem } from './types'

export const navItems: NavItem[] = [
  { iconName: 'LayoutDashboard', label: 'Dashboard',       path: '/'               },
  {
    iconName: 'Users',
    label:    'Employees',
    path:     '/employees',
    children: [
      { label: 'View by Department', path: '/employees/by-department' },
    ],
  },
  {
    iconName: 'Building2',
    label:    'Departments',
    path:     '/departments',
    children: [
      { label: 'All Departments',   path: '/departments/all'    },
      { label: 'Create Department', path: '/departments/create' },
    ],
  },
  { iconName: 'UserCheck', label: 'Attendance',       path: '/attendance'  },
  { iconName: 'Calendar',  label: 'Leave',             path: '/leave'       },
  { iconName: 'Activity',  label: 'Shift Scheduling',  path: '/shifts'      },
  { iconName: 'DollarSign',label: 'Payroll',           path: '/payroll'     },
  { iconName: 'FileText',  label: 'Reports',           path: '/reports'     },
  { iconName: 'Bell',      label: 'Notifications',     path: '/notifications', badge: 5 },
  { iconName: 'Settings',  label: 'Settings',          path: '/settings'    },
]

export const notificationsData: NotificationItem[] = [
  { text: 'ICU staffing below minimum threshold',   time: '22 min ago', color: '#dc2626' },
]