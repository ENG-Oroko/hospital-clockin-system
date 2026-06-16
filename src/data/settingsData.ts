// src/data/settingsData.ts
import { SettingToggle } from './types'

export const notificationSettings: SettingToggle[] = [
  { label: 'Staffing Alerts',      description: 'Get alerted when departments fall below minimum staffing', enabled: true  },
  { label: 'Leave Notifications',  description: 'Notify when new leave requests are submitted',            enabled: true  },
  { label: 'Overtime Alerts',      description: 'Alert when staff exceed overtime thresholds',             enabled: true  },
  { label: 'Shift Swap Requests',  description: 'Notify on incoming shift swap requests',                  enabled: false },
  { label: 'Daily Summary Email',  description: 'Receive a daily attendance summary by email',             enabled: true  },
  { label: 'Weekly Report Email',  description: 'Receive weekly analytics reports by email',               enabled: false },
]

export const systemSettings: SettingToggle[] = [
  { label: 'Dark Mode',            description: 'Switch the dashboard to dark theme',                      enabled: false },
  { label: 'Compact View',         description: 'Show more data with reduced spacing',                     enabled: false },
  { label: 'Auto Refresh',         description: 'Refresh dashboard data every 5 minutes',                  enabled: true  },
  { label: 'Two-Factor Auth',      description: 'Require 2FA on every login',                              enabled: true  },
]