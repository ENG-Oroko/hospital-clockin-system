HOD DASHBOARD INTEGRATION README
================================

Project
-------
Module: HOD web frontend
Path: apps/web-frontend

Purpose of this document
------------------------
This document explains:
1. Whether the HOD dashboard is ready to connect to a shared login page in a role-based access control system.
2. What other modules/services this dashboard depends on.
3. What backend endpoints the HOD dashboard requires.
4. What is already implemented, what assumptions exist, and what gaps still need backend or login-module support.


1. LOGIN / AUTH FLOW READINESS
==============================

Short answer
------------
Yes, the HOD dashboard is largely ready to connect to a separate shared login module, PROVIDED that the login module stores auth data in the format this frontend expects and redirects HOD users into the HOD routes.

Current auth design in the frontend
-----------------------------------
Main auth implementation file:
- apps/web-frontend/src/lib/api.ts

Important functions:
- getStoredAuth()
- storeAuth(...)
- clearAuth()
- getAccessToken()
- getCurrentUser()
- refreshAccessToken()
- apiFetch(...)

The frontend currently expects authentication data to be stored in browser localStorage under this key:
- chronos_auth

Expected stored structure
-------------------------
The HOD frontend expects localStorage item chronos_auth to look like this shape:

{
  accessToken: string,
  refreshToken: string,
  user: {
    id: string,
    sub?: string,
    firstName: string,
    lastName: string,
    email: string,
    role: string,
    tenantId: string,
    departmentId?: string | null,
    department?: {
      id: string,
      name: string,
      code: string
    } | null
  }
}

Minimum required user fields for HOD flow
-----------------------------------------
The HOD frontend directly depends on these user fields being available after login:
- id or sub
- firstName
- lastName
- email
- role
- tenantId

Nice to have but not guaranteed in token:
- departmentId
- department

Important note:
Even if departmentId is missing from the login token, the HOD pages already attempt to fetch the full employee profile after login using:
- employeeApi.getById(raw.id || raw.sub)

So the shared login page does NOT strictly have to provide department details in the stored user object, as long as:
- it provides the employee id/sub
- backend GET /api/employees/:id returns departmentId and department

How route protection currently works
------------------------------------
Main file:
- apps/web-frontend/src/components/layout/HODLayout.tsx

Current behavior:
1. Reads current user from getCurrentUser().
2. If no user exists, redirects to login page.
3. If user.role is not DEPT_HEAD, redirects to login page.
4. If role is DEPT_HEAD, it fetches full employee profile to get departmentId and other profile data.

Login redirect path is configurable through:
- NEXT_PUBLIC_LOGIN_PATH

If that env variable is not set, it defaults to:
- /login

This is good for team integration because your shared login module can live at:
- /login
or another route, as long as NEXT_PUBLIC_LOGIN_PATH is set correctly.

What the login teammate must do
-------------------------------
For the HOD dashboard to work with the shared login module, your teammate's login module should do all of the following after successful login:

1. Authenticate against backend.
2. Receive at least:
   - accessToken
   - refreshToken
   - user object
3. Store those values in localStorage using the same key:
   - chronos_auth
4. Ensure user.role is correctly set.
5. Redirect based on RBAC role.

Required redirect for HOD user:
- /hod/dashboard

Role expected by this HOD frontend
----------------------------------
Exact role currently checked in code:
- DEPT_HEAD

That means the login module and backend must use this exact string for HOD users.
If your backend or auth service uses a different role name like:
- HOD
- HEAD_OF_DEPARTMENT
- DEPARTMENT_HEAD
then the HOD frontend will reject the session unless the role is normalized to DEPT_HEAD.

Token refresh behavior
----------------------
File:
- apps/web-frontend/src/lib/api.ts

When API requests return 401:
1. Frontend calls:
   - POST /auth/refresh-token
2. If refresh succeeds, it updates accessToken in localStorage.
3. If refresh fails, it clears auth and redirects to login.

Therefore the shared login/auth module must be compatible with:
- access token + refresh token flow
- refresh token endpoint at POST /auth/refresh-token

Conclusion on login readiness
-----------------------------
The HOD dashboard is integration-ready if the shared login module provides:
- localStorage key: chronos_auth
- user.role === DEPT_HEAD for HOD users
- accessToken and refreshToken
- redirect to /hod/dashboard after HOD login
- backend refresh endpoint at POST /auth/refresh-token


2. CURRENT LIMITATIONS / ASSUMPTIONS IN AUTH FLOW
================================================

A. HOD-only route guard exists only inside HOD layout
-----------------------------------------------------
The HOD pages rely on HODLayout.tsx to gate access.
This is acceptable for frontend route protection, but not security by itself.
Real security must still be enforced in backend RBAC.

B. Shared login page is not owned by this module
------------------------------------------------
This HOD frontend intentionally does not implement or own the login screen.
It only redirects to the configured login path.

C. DEV bypass exists
--------------------
Files:
- apps/web-frontend/src/lib/api.ts
- apps/web-frontend/src/components/layout/HODLayout.tsx

Environment flag:
- NEXT_PUBLIC_DEV_MODE=true

When enabled, it bypasses real auth and injects a fake DEPT_HEAD user.
This must NOT be enabled in production.

D. Employee profile fetch is essential after login
--------------------------------------------------
Even with a valid token, many HOD pages still rely on:
- GET /api/employees/:id
because departmentId and full employee metadata are required.

So login alone is not enough; employee profile service must also work.


3. MODULES / SERVICES THE HOD DASHBOARD DEPENDS ON
==================================================

The HOD frontend depends on the following modules/services:

A. Shared Login / Auth Module
-----------------------------
Purpose:
- authenticates user
- stores auth data
- redirects by role

Needed integration points:
- localStorage key chronos_auth
- HOD role string DEPT_HEAD
- login route configured via NEXT_PUBLIC_LOGIN_PATH

B. Auth Backend Service
-----------------------
Purpose:
- login
- token refresh
- session renewal

Required endpoints:
- POST /auth/login
- POST /auth/refresh-token

C. Employee Module
------------------
Purpose:
- fetch current HOD profile
- fetch department staff list
- create/edit staff
- update employment status

The HOD dashboard depends heavily on this module.

D. Attendance Module
--------------------
Purpose:
- dashboard KPI data
- attendance summaries
- daily attendance data
- raw clock logs
- audit trail for attendance changes
- discrepancy escalation placeholder

E. Leave Module
---------------
Purpose:
- fetch leave requests for department staff
- reject leave requests
- show leave details/status

F. Roster Module
----------------
Purpose:
- list available shift templates
- assign employees to shifts
- unassign employees from shifts

G. Reports Module
-----------------
Purpose:
- generate HOD-level department reports
- list reports
- fetch full report details
- export data client-side

H. Browser Local Storage
------------------------
Purpose:
- auth persistence
- temporary HOD activity log storage

Important note:
The HOD activity log is NOT server-backed yet. It is local only.


4. BACKEND ENDPOINTS REQUIRED BY THE HOD DASHBOARD
==================================================

This section lists what endpoints the frontend currently calls.

4.1 AUTH ENDPOINTS
------------------
1. POST /auth/login
   Used by:
   - authApi.login(...)
   File:
   - apps/web-frontend/src/lib/api.ts

   Expected request body:
   {
     tenantId,
     identifier,
     password
   }

   Expected response should include:
   {
     accessToken,
     refreshToken,
     user
   }

2. POST /auth/refresh-token
   Used by:
   - refreshAccessToken()
   File:
   - apps/web-frontend/src/lib/api.ts

   Expected request body:
   {
     refreshToken
   }

   Expected response:
   {
     accessToken
   }


4.2 EMPLOYEE ENDPOINTS
----------------------
1. GET /api/employees?departmentId=...&employmentStatus=...
   Used by:
   - employeeApi.list(...)
   Pages:
   - staff page
   - leave page
   - roster page

2. GET /api/employees/:id
   Used by:
   - employeeApi.getById(id)
   Pages:
   - HOD layout/profile fetch
   - dashboard
   - attendance page
   - leave page
   - staff profile
   - reports page
   - roster page

   This endpoint is critical because it supplies:
   - departmentId
   - department
   - role
   - employee profile details

3. POST /api/employees
   Used by:
   - employeeApi.create(...)
   Page:
   - staff page

4. PATCH /api/employees/:id
   Used by:
   - employeeApi.update(...)
   Page:
   - staff page

5. PATCH /api/employees/:id/status
   Used by:
   - employeeApi.updateStatus(...)
   Page:
   - staff page


4.3 ATTENDANCE ENDPOINTS
------------------------
1. GET /attendance/dashboard/stats?date=YYYY-MM-DD
   Used by:
   - attendanceApi.getDashboardStats(date)
   Page:
   - dashboard

2. GET /attendance/summaries?...query params...
   Used by:
   - attendanceApi.getSummaries(...)
   Pages:
   - dashboard
   - attendance list
   - staff profile
   - roster (used as assignment source/hint data)

   Query params used in various places include:
   - departmentId
   - userId
   - startDate
   - endDate
   - page
   - limit
   - status

3. GET /attendance/summaries/daily/:date
   Used by:
   - attendanceApi.getDailyBreakdown(date)
   Status:
   - API wrapper exists
   - likely intended for daily attendance view

4. GET /attendance/summaries/:id
   Used by:
   - attendanceApi.getSummaryById(id)
   Page:
   - attendance detail

5. GET /attendance/logs?...query params...
   Used by:
   - attendanceApi.getRawLogs(...)
   Page:
   - attendance detail

6. GET /attendance/summaries/:id/audit
   Used by:
   - attendanceApi.getAuditTrail(id)
   Page:
   - attendance detail

7. POST /attendance/summaries/:id/flag
   Used by:
   - attendanceApi.flagDiscrepancy(...)
   Page:
   - attendance detail

   IMPORTANT:
   This is currently treated as a placeholder in code comments.
   The frontend is wired for it, but backend support may not exist yet.


4.4 LEAVE ENDPOINTS
-------------------
1. GET /leaves
   Used by:
   - leaveApi.getAll(status?)
   Status:
   - API wrapper exists
   - not the preferred HOD path currently

2. GET /leaves/employee/:employeeId
   Used by:
   - leaveApi.getByEmployee(...)
   - leaveApi.getByDepartmentStaff(...)
   Page:
   - leave page

   IMPORTANT:
   Right now, HOD department leave listing depends on calling this once per employee.
   That means the frontend depends on the employee module first, then leave-by-employee.

3. GET /leaves/:id
   Used by:
   - leaveApi.getById(id)
   Status:
   - wrapper exists

4. PATCH /leaves/:id/status
   Used by:
   - leaveApi.updateStatus(...)
   Page:
   - leave page


4.5 ROSTER ENDPOINTS
--------------------
1. GET /api/roster/shifts?isActive=true
   Used by:
   - rosterApi.listShifts(...)
   Page:
   - roster page

2. GET /api/roster/shifts/:id
   Used by:
   - rosterApi.getShift(id)
   Status:
   - wrapper exists

3. POST /api/roster/shifts/:shiftId/assign-employees
   Used by:
   - rosterApi.assignEmployees(...)
   Page:
   - roster page

4. POST /api/roster/shifts/:shiftId/unassign-employees
   Used by:
   - rosterApi.unassignEmployees(...)
   Page:
   - roster page


4.6 REPORTS ENDPOINTS
---------------------
1. POST /api/reports/generate
   Used by:
   - reportsApi.generate(...)
   Page:
   - reports page

2. GET /api/reports?page=1&limit=25
   Used by:
   - reportsApi.list(...)
   Page:
   - reports page

3. GET /api/reports/:id
   Used by:
   - reportsApi.getById(id)
   Page:
   - reports page

4. GET /api/reports/types
   Used by:
   - reportsApi.getTypes()
   Status:
   - wrapper exists
   - current HOD page uses a hardcoded allowed list, but endpoint exists


5. FRONTEND PAGES AND WHAT EACH ONE DEPENDS ON
==============================================

5.1 Dashboard
-------------
File:
- apps/web-frontend/src/app/hod/dashboard/page.tsx

Depends on:
- current logged-in user from localStorage
- employee profile fetch
- attendance dashboard stats
- attendance summaries for department

Required backend:
- GET /api/employees/:id
- GET /attendance/dashboard/stats
- GET /attendance/summaries

5.2 Attendance list
-------------------
File:
- apps/web-frontend/src/app/hod/attendance/page.tsx

Depends on:
- current logged-in user
- employee profile fetch to determine departmentId
- attendance summaries API

Required backend:
- GET /api/employees/:id
- GET /attendance/summaries

5.3 Attendance detail
---------------------
File:
- apps/web-frontend/src/app/hod/attendance/[id]/page.tsx

Depends on:
- attendance summary by id
- raw attendance logs
- attendance audit trail
- discrepancy flag route (optional but wired)

Required backend:
- GET /attendance/summaries/:id
- GET /attendance/logs
- GET /attendance/summaries/:id/audit
- POST /attendance/summaries/:id/flag (planned/needed)

5.4 Leave
---------
File:
- apps/web-frontend/src/app/hod/leave/page.tsx

Depends on:
- logged-in user
- employee profile fetch
- department staff list
- leave-by-employee endpoint
- leave status update endpoint

Required backend:
- GET /api/employees/:id
- GET /api/employees?departmentId=...
- GET /leaves/employee/:employeeId
- PATCH /leaves/:id/status

5.5 Roster
----------
File:
- apps/web-frontend/src/app/hod/roster/page.tsx

Depends on:
- logged-in user
- employee profile fetch
- shifts list
- department staff list
- attendance summaries used as roster assignment evidence/hints
- assign/unassign endpoints

Required backend:
- GET /api/employees/:id
- GET /api/employees?departmentId=...
- GET /api/roster/shifts
- POST /api/roster/shifts/:id/assign-employees
- POST /api/roster/shifts/:id/unassign-employees
- GET /attendance/summaries

5.6 Staff directory
-------------------
File:
- apps/web-frontend/src/app/hod/staff/page.tsx

Depends on:
- logged-in user
- employee profile fetch
- employee list
- create employee
- update employee
- update employment status

Required backend:
- GET /api/employees/:id
- GET /api/employees
- POST /api/employees
- PATCH /api/employees/:id
- PATCH /api/employees/:id/status

5.7 Staff profile
-----------------
File:
- apps/web-frontend/src/app/hod/staff/[id]/page.tsx

Depends on:
- employee profile by id
- attendance summaries for that employee

Required backend:
- GET /api/employees/:id
- GET /attendance/summaries?userId=...

5.8 Reports
-----------
File:
- apps/web-frontend/src/app/hod/reports/page.tsx

Depends on:
- logged-in user
- employee profile fetch for departmentId
- generate report
- list reports
- get report detail

Required backend:
- GET /api/employees/:id
- POST /api/reports/generate
- GET /api/reports
- GET /api/reports/:id

5.9 Activity log
----------------
File:
- apps/web-frontend/src/app/hod/activity/page.tsx

Depends on:
- browser localStorage only

No backend required currently.


6. GAPS / RISKS / THINGS TO ALIGN WITH TEAMMATES
===============================================

Gap 1: Exact role string must match
-----------------------------------
Frontend expects:
- DEPT_HEAD

Action:
Your login module and backend auth payload must use DEPT_HEAD exactly, or map to it before storage.

Gap 2: Shared login must write auth data in expected format
-----------------------------------------------------------
If your teammate stores auth under a different key or structure, this dashboard will not see the session.

Action:
Agree on:
- localStorage key = chronos_auth
- same property names as described above

Gap 3: Leave department filtering is not backend-native yet
-----------------------------------------------------------
The leave page currently fetches leave requests by calling:
- GET /leaves/employee/:id
for each employee in the department.

This works, but it is not ideal.

Recommended backend improvement:
- GET /leaves?departmentId=...&status=...

Gap 4: Attendance discrepancy flagging route may not exist yet
--------------------------------------------------------------
Frontend is already wired to call:
- POST /attendance/summaries/:id/flag

But code comments explicitly say backend may not have this yet.

Gap 5: HOD activity log is not server-backed
--------------------------------------------
Current activity trail is local-only and device-specific.

Recommended future backend endpoint:
- GET /audit-log?actorId=...
or similar HOD audit trail route

Gap 6: Frontend auth is client-side only
----------------------------------------
This is fine for routing UX, but backend must still enforce role/tenant/department authorization.


7. FINAL READINESS SUMMARY
==========================

Is the HOD dashboard ready for integration with a shared login page?
-------------------------------------------------------------------
YES, mostly ready.

It is ready if your teammate provides:
- successful login response with accessToken, refreshToken, and user
- localStorage write to chronos_auth
- role value DEPT_HEAD
- redirect to /hod/dashboard for HOD users
- working POST /auth/refresh-token

Core modules your dashboard depends on
--------------------------------------
- shared login/auth module
- auth backend/token refresh
- employee module
- attendance module
- leave module
- roster module
- reports module
- browser localStorage for local action log

Biggest backend/API dependencies
--------------------------------
Critical endpoints:
- POST /auth/refresh-token
- GET /api/employees/:id
- GET /attendance/summaries
- GET /attendance/dashboard/stats
- GET /leaves/employee/:employeeId
- GET /api/roster/shifts
- POST /api/reports/generate

Most important integration agreements to make with your teammate
---------------------------------------------------------------
1. localStorage key name: chronos_auth
2. exact HOD role string: DEPT_HEAD
3. redirect target after HOD login: /hod/dashboard
4. refresh token endpoint shape
5. employee profile endpoint must return departmentId


8. RECOMMENDED TEAM HANDOFF CHECKLIST
=====================================

For login teammate
------------------
[ ] After login, store auth in localStorage key chronos_auth
[ ] Ensure stored user object includes id or sub, role, tenantId, email, firstName, lastName
[ ] Use role value DEPT_HEAD for HOD users
[ ] Redirect HOD users to /hod/dashboard
[ ] Support POST /auth/refresh-token

For backend/API teammate
------------------------
[ ] Confirm GET /api/employees/:id returns departmentId and department
[ ] Confirm GET /attendance/dashboard/stats works for HOD
[ ] Confirm GET /attendance/summaries supports departmentId/userId/date filters
[ ] Confirm GET /attendance/logs and GET /attendance/summaries/:id/audit exist
[ ] Confirm leave endpoints work as listed above
[ ] Confirm roster endpoints work as listed above
[ ] Confirm reports endpoints work as listed above
[ ] Decide whether POST /attendance/summaries/:id/flag will be implemented now or later


End of document.
