// src/data/shiftsData.ts
import { ShiftItem } from './types';

export const shiftsData: ShiftItem[] = [
  {
    iconName:  'Sun',
    label:     'Morning Shift',
    subtitle:  '06:00 – 14:00',
    count:     342,
    capacity:  360,
    colorBg:   'var(--color-warning-bg)',
    color:     'var(--color-warning)',
  },
  {
    iconName:  'Coffee',
    label:     'Afternoon Shift',
    subtitle:  '14:00 – 22:00',
    count:     298,
    capacity:  320,
    colorBg:   'var(--color-info-bg)',
    color:     'var(--color-info)',
  },
  {
    iconName:  'Moon',
    label:     'Night Shift',
    subtitle:  '22:00 – 06:00',
    count:     189,
    capacity:  240,
    colorBg:   'var(--color-danger-bg)',
    color:     'var(--color-danger)',
  },
  {
    iconName:  'Zap',
    label:     'On-call / PRN',
    subtitle:  'As needed',
    count:     57,
    capacity:  80,
    colorBg:   'var(--color-success-bg)',
    color:     'var(--color-success)',
  },
];