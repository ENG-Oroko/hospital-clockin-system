// src/App.tsx
import React, { useState } from 'react'
import { Routes, Route }   from 'react-router-dom'
import Sidebar             from './components/Sidebar'
import Header              from './components/Header'

import DashboardPage       from './pages/DashboardPage'
import EmployeesPage       from './pages/EmployeesPage'
import DepartmentsPage     from './pages/DepartmentsPage'
import AttendancePage      from './pages/AttendancePage'
import LeavePage           from './pages/LeavePage'
import ShiftSchedulingPage from './pages/ShiftSchedulingPage'
import PayrollPage         from './pages/PayrollPage'
import ReportsPage         from './pages/ReportsPage'
import NotificationsPage   from './pages/NotificationsPage'
import SettingsPage        from './pages/SettingsPage'
import DevicesPage         from './pages/DevicesPage'

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(p => !p)}
      />

      <main
        style={{
          flex:          1,
          overflowY:     'auto',
          background:    '#f5f6fa',
          display:       'flex',
          flexDirection: 'column',
          gap:           24,
          padding:       24,
          minWidth:      0,
        }}
      >
        <Header onMenuToggle={() => setCollapsed(p => !p)} />

        <Routes>
          <Route path="/"              element={<DashboardPage />}       />
          <Route path="/employees/*"   element={<EmployeesPage />}       />
          <Route path="/departments/*" element={<DepartmentsPage />}     />
          <Route path="/attendance"    element={<AttendancePage />}      />
          <Route path="/leave"         element={<LeavePage />}           />
          <Route path="/shifts"        element={<ShiftSchedulingPage />} />
          <Route path="/payroll"       element={<PayrollPage />}         />
          <Route path="/reports"       element={<ReportsPage />}         />
          <Route path="/notifications" element={<NotificationsPage />}   />
          <Route path="/settings"      element={<SettingsPage />}        />
          <Route path="/devices"       element={<DevicesPage />}         />
        </Routes>

        <div style={{ height: 32 }} />
      </main>
    </div>
  )
}

export default App