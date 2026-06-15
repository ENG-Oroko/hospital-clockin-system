import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HeaderBar from './components/HeaderBar';
import ToastContainer from './components/Toast';

import DashboardPage      from './pages/DashboardPage';
import EmployeesPage      from './pages/EmployeesPage';
import DepartmentsPage    from './pages/DepartmentsPage';
import AttendancePage     from './pages/AttendancePage';
import LeaveManagementPage from './pages/LeaveManagementPage';
import ShiftRosterPage    from './pages/ShiftRosterPage';
import PayrollPage        from './pages/PayrollPage';
import ReportsPage        from './pages/ReportsPage';
import DevicesPage        from './pages/DevicesPage';
import NotificationsPage  from './pages/NotificationsPage';
import SettingsPage       from './pages/SettingsPage';

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
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <HeaderBar onToast={showToast} />
          <div className="page-body">
            <Routes>
              <Route path="/"               element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"      element={<DashboardPage      onToast={showToast} />} />
              <Route path="/employees"      element={<EmployeesPage      onToast={showToast} />} />
              <Route path="/departments"    element={<DepartmentsPage    onToast={showToast} />} />
              <Route path="/attendance"     element={<AttendancePage     onToast={showToast} />} />
              <Route path="/leave"          element={<LeaveManagementPage onToast={showToast} />} />
              <Route path="/roster"         element={<ShiftRosterPage    onToast={showToast} />} />
              <Route path="/payroll"        element={<PayrollPage        onToast={showToast} />} />
              <Route path="/reports"        element={<ReportsPage        onToast={showToast} />} />
              <Route path="/devices"        element={<DevicesPage        onToast={showToast} />} />
              <Route path="/notifications"  element={<NotificationsPage  onToast={showToast} />} />
              <Route path="/settings"       element={<SettingsPage       onToast={showToast} />} />
            </Routes>
          </div>
        </main>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </BrowserRouter>
  );
}