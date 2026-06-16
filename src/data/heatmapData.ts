// src/data/heatmapData.ts
import { HeatmapMatrix, CellStatus } from './types';

export const heatmapDepartments: string[] = [
  'Nursing', 'Surgery', 'Radiology', 'Emergency',
  'Pharmacy', 'Admin', 'ICU', 'Pediatrics',
];

export const heatmapDays: number[] = Array.from({ length: 31 }, (_, i) => i + 1);

/* Seeded pseudo-random so matrix is stable across renders */
const seed = (n: number) => ((Math.sin(n) * 9999) % 1 + 1) / 2;

const weightedStatus = (s: number): CellStatus => {
  if (s < 0.60) return 'present';
  if (s < 0.75) return 'leave';
  if (s < 0.90) return 'absent';
  return 'nodata';
};

const buildMatrix = (): HeatmapMatrix => {
  const matrix: HeatmapMatrix = {};

  heatmapDepartments.forEach((dept, di) => {
    matrix[dept] = {};
    heatmapDays.forEach((day) => {
      const date = new Date(2025, 4, day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      if (isWeekend) {
        matrix[dept][day] = 'nodata';
      } else {
        matrix[dept][day] = weightedStatus(seed(di * 100 + day));
      }
    });
  });

  return matrix;
};

export const heatmapMatrix: HeatmapMatrix = buildMatrix();