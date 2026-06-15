import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { ChevronDown } from 'lucide-react';
import { attendanceLineData } from '../data/mockData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const LEGEND_ITEMS = [
  { label: 'Present',  color: '#16A34A' },
  { label: 'On Leave', color: '#EA580C' },
  { label: 'Absent',   color: '#DC2626' },
];

export default function AttendanceLineChart() {
  const data = {
    labels: attendanceLineData.labels,
    datasets: [
      {
        label: 'Present',
        data: attendanceLineData.present,
        borderColor: '#16A34A',
        backgroundColor: 'rgba(22,163,74,0.07)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: false,
      },
      {
        label: 'On Leave',
        data: attendanceLineData.onLeave,
        borderColor: '#EA580C',
        backgroundColor: 'rgba(234,88,12,0.07)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Absent',
        data: attendanceLineData.absent,
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220,38,38,0.05)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: items => `May ${items[0].dataIndex + 1}, 2025`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#F3F4F6', drawBorder: false },
        ticks: { color: '#9CA3AF', font: { size: 11 }, maxRotation: 0 },
      },
      y: {
        grid: { color: '#F3F4F6', drawBorder: false },
        ticks: { color: '#9CA3AF', font: { size: 11 } },
        min: 0,
        max: 1100,
      },
    },
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Attendance Overview</div>
          <div className="card-subtitle">Daily trends for May 2025</div>
        </div>
        <button className="period-select" aria-label="Select period: This Month">
          This Month <ChevronDown size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="chart-legend" aria-hidden="true">
        {LEGEND_ITEMS.map(item => (
          <div className="legend-item" key={item.label}>
            <div className="legend-dot" style={{ background: item.color }} />
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="chart-container" role="img" aria-label="Attendance overview line chart showing Present, On Leave, and Absent trends for May 2025">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}