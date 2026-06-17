// src/data/kpiData.ts
import { KPIStat } from './types'

export const kpiData: KPIStat[] = [
  {
    label:     'Total Employees',
    value:     '1,248',
    delta:     '+18 this month',
    deltaType: 'positive',
    iconName:  'Users',
    colorBg:   '#dbeafe',
    colorIcon: '#2563eb',
  },
  {
    label:     'Present Today',
    value:     '986',
    delta:     '4% vs yesterday',
    deltaType: 'positive',
    iconName:  'UserCheck',
    colorBg:   '#dcfce7',
    colorIcon: '#16a34a',
  },
  {
    label:     'On Leave Today',
    value:     '124',
    delta:     '6 since last week',
    deltaType: 'neutral',
    iconName:  'Umbrella',
    colorBg:   '#ffedd5',
    colorIcon: '#ea580c',
  },
  {
    label:     'Absent Today',
    value:     '138',
    delta:     '12 unexplained',
    deltaType: 'negative',
    iconName:  'UserX',
    colorBg:   '#fee2e2',
    colorIcon: '#dc2626',
  },
  {
    label: 'Total Overtime',
    value: '342',
    delta: '↑ hrs this month',
    deltaType: 'neutral',
    iconName: 'Clock',
    colorBg:   '#dbeafe',
    colorIcon: '#2563eb',
  },
]