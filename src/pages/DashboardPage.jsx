import React from 'react';
import KpiGrid            from '../components/KpiGrid';
import AttendanceLineChart from '../components/AttendanceLineChart';
import DeptDonutChart      from '../components/DeptDonutChart';
import AlertList           from '../components/AlertList';
//import ShiftSummary        from '../components/ShiftSummary';


export default function DashboardPage({ onToast }) {
  return (
    <>
      <section aria-label="Key performance indicators">
        <KpiGrid />
      </section>

      <section className="row-3col" aria-label="Attendance trends">
        <AttendanceLineChart />
        <DeptDonutChart />
        <AlertList />
      </section>

      <section className="row-3col" aria-label="Tasks and actions">
        {/* <ShiftSummary /> */}
      </section>

      <section className="row-2col" aria-label="Detailed analytics">
      </section>
    </>
  );
}