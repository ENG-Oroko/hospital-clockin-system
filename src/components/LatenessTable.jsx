import React from 'react';
import { latenessData } from '../data/mockData';

export default function LatenessTable() {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Top Lateness</div>
          <div className="card-subtitle">Staff with most late arrivals this month</div>
        </div>
        <span className="card-action" role="link" tabIndex={0} aria-label="View all lateness records">View All</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" aria-label="Top lateness records">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Employee</th>
              <th scope="col">Dept</th>
              <th scope="col">Late Arrivals</th>
              <th scope="col">Avg. Mins Late</th>
            </tr>
          </thead>
          <tbody>
            {latenessData.map(row => (
              <tr key={row.rank}>
                <td>
                  <div
                    className="rank-num"
                    aria-label={`Rank ${row.rank}`}
                  >
                    {row.rank}
                  </div>
                </td>
                <td>
                  <div className="emp-cell">
                    <div
                      className="emp-avatar"
                      style={{ background: row.avatarBg, color: row.avatarColor }}
                      aria-hidden="true"
                    >
                      {row.initials}
                    </div>
                    <div>
                      <div className="emp-name">{row.name}</div>
                      <div className="emp-id">{row.empId}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="dept-badge">{row.dept}</span>
                </td>
                <td>
                  <div className="lateness-bar-cell">
                    <div className="lateness-bar" aria-hidden="true">
                      <div
                        className="lateness-bar-fill"
                        style={{ width: `${row.barWidth}%` }}
                      />
                    </div>
                    <span
                      className="lateness-val"
                      aria-label={`${row.count} late arrivals`}
                    >
                      {row.count}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    className="lateness-val"
                    aria-label={`Average ${row.avgMins} late`}
                  >
                    {row.avgMins}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="table-footer"
        role="link"
        tabIndex={0}
        aria-label="View full lateness report"
      >
        View full lateness report →
      </div>
    </div>
  );
}