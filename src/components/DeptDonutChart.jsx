import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { deptDonutData } from '../data/mockData';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DeptDonutChart() {
  const data = {
    labels: deptDonutData.labels,
    datasets: [{
      data: deptDonutData.values,
      backgroundColor: deptDonutData.colors,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      hoverBorderWidth: 3,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#F9FAFB',
        bodyColor: '#D1D5DB',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: item => ` ${item.label}: ${item.raw} (${((item.raw / deptDonutData.total) * 100).toFixed(1)}%)`,
        },
      },
    },
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Dept. Attendance</div>
          <div className="card-subtitle">By department today</div>
        </div>
      </div>

      <div className="donut-layout">
        <div
          className="donut-container"
          role="img"
          aria-label={`Department attendance donut chart. Total: ${deptDonutData.total} staff`}
        >
          <Doughnut data={data} options={options} />
          <div className="donut-center" aria-hidden="true">
            <div className="donut-center-value">{deptDonutData.total.toLocaleString()}</div>
            <div className="donut-center-label">Total</div>
          </div>
        </div>

        <div className="donut-legend" aria-label="Department legend">
          {deptDonutData.labels.map((label, i) => (
            <div className="donut-legend-item" key={label}>
              <div className="donut-legend-dot" style={{ background: deptDonutData.colors[i] }} aria-hidden="true" />
              <div className="donut-legend-text">
                <div className="donut-legend-name">{label}</div>
                <div className="donut-legend-val">
                  {deptDonutData.values[i]} ({((deptDonutData.values[i] / deptDonutData.total) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}