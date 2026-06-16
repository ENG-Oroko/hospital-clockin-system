// src/data/chartData.ts
import { DepartmentSlice, AttendancePoint } from './types';

export const deptDonutData: DepartmentSlice[] = [
  { name: 'Nursing',    value: 320, color: '#2563EB' },
  { name: 'Surgery',    value: 180, color: '#16A34A' },
  { name: 'Radiology',  value: 140, color: '#EA580C' },
  { name: 'Emergency',  value: 210, color: '#DC2626' },
  { name: 'Pharmacy',   value: 98,  color: '#7C3AED' },
  { name: 'Admin',      value: 145, color: '#0891B2' },
  { name: 'Others',     value: 155, color: '#9CA3AF' },
];

/* Deterministic "random" data so the chart doesn't
   flicker on every re-render.                        */
const seed = (n: number) => ((Math.sin(n) * 10000) % 1 + 1) / 2;

export const lineChartData: AttendancePoint[] = Array.from({ length: 31 }, (_, i) => {
  const d = i + 1;
  const date = new Date(2025, 4, d);           // May 2025
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  if (isWeekend) {
    return { day: `May ${d}`, Present: null, OnLeave: null, Absent: null };
  }
  return {
    day:     `May ${d}`,
    Present: Math.round(900 + seed(d * 3)  * 120),
    OnLeave: Math.round(80  + seed(d * 7)  * 60),
    Absent:  Math.round(60  + seed(d * 11) * 80),
  };
});