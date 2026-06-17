// src/data/settingsData.ts
import { HospitalSettings } from './types'

export const defaultSettings: HospitalSettings = {
  hospitalName: 'CityCare General Hospital',
  timezone:     'Africa/Nairobi',
  gracePeriod:  '15',
  workHours:    '8',
  otMultiplier: '1.5',
  emailAlerts:  true,
  smsAlerts:    true,
  deviceAlerts: true,
  autoRecon:    true,
}

export const TIMEZONE_OPTIONS: string[] = [
  'Africa/Nairobi',
  'Africa/Accra',
  'Africa/Lagos',
  'Europe/London',
  'America/New_York',
]