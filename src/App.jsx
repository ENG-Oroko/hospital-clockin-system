import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import KpiGrid from './components/KpiGrid';
import AttendanceLineChart from './components/AttendanceLineChart';
import DeptDonutChart from './components/DeptDonutChart';
import AlertList from './components/AlertList';
import PendingApprovals from './components/PendingApprovals';
import ShiftSummary from './components/ShiftSummary';
import QuickActions from './components/QuickActions';
import AttendanceHeatmap from './components/AttendanceHeatmap';
import LatenessTable from './components/LatenessTable';
import ToastContainer from './components/Toast';
import './styles/dashboard.css';

let toastIdCounter = 0;

export default function App() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="app-shell">
      <Sidebar onToast={showToast} />

      <main className="main-content">
        <HeaderBar onToast={showToast} />

        <div className="page-body">
          {/* Row 1: KPI */}
          <section aria-label="Key performance indicators">
            <KpiGrid />
          </section>

          {/* Row 2: Trends */}
          <section className="row-3col" aria-label="Attendance trends">
            <AttendanceLineChart />
            <DeptDonutChart />
            <AlertList />
          </section>

          {/* Row 3: Tasks */}
          <section className="row-3col" aria-label="Tasks and actions">
            <PendingApprovals onToast={showToast} />
            <ShiftSummary />
            <QuickActions onToast={showToast} />
          </section>

          {/* Row 4: Detail */}
          <section className="row-2col" aria-label="Detailed analytics">
            <AttendanceHeatmap />
            <LatenessTable />
          </section>
        </div>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}