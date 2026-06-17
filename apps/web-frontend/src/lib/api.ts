const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// DEV-ONLY: while the backend and shared login page are incomplete, this lets every
// page preview real UI with a fake DEPT_HEAD session — no localStorage, no login,
// no live API needed for identity. Set NEXT_PUBLIC_DEV_MODE=true in .env.local.
// NEVER set this to true in production — it skips authentication entirely.
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export const MOCK_USER = {
  id: 'dev-user-id',
  sub: 'dev-user-id',
  firstName: 'Mercy',
  lastName: 'Achieng',
  email: 'matron.mercy@stteresa.or.ke',
  role: 'DEPT_HEAD',
  tenantId: 'dev-tenant-id',
  departmentId: 'dev-department-id',
  department: { id: 'dev-department-id', name: 'Intensive Care Unit', code: 'ICU' },
};

export function getStoredAuth() {
  if (DEV_MODE) {
    return { accessToken: 'dev-mock-token', refreshToken: 'dev-mock-refresh', user: MOCK_USER };
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('chronos_auth');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function storeAuth(data: { accessToken: string; refreshToken: string; user: any }) {
  localStorage.setItem('chronos_auth', JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem('chronos_auth');
}

export function getAccessToken(): string | null {
  return getStoredAuth()?.accessToken ?? null;
}

export function getCurrentUser() {
  return getStoredAuth()?.user ?? null;
}

async function refreshAccessToken(): Promise<string | null> {
  const auth = getStoredAuth();
  if (!auth?.refreshToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    if (!res.ok) { clearAuth(); return null; }
    const data = await res.json();
    storeAuth({ ...auth, accessToken: data.accessToken });
    return data.accessToken;
  } catch { clearAuth(); return null; }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch(path, options, false);
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    const loginPath = process.env.NEXT_PUBLIC_LOGIN_PATH || '/login';
    if (!devMode && typeof window !== 'undefined') window.location.href = loginPath;
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (tenantId: string, identifier: string, password: string) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tenantId, identifier, password }),
    }),
};

// ── Attendance ─────────────────────────────────────────────────────────────
export const attendanceApi = {
  getDashboardStats: (date: string) =>
    apiFetch(`/attendance/dashboard/stats?date=${date}`),

  getSummaries: (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return apiFetch(`/attendance/summaries?${q}`);
  },

  getDailyBreakdown: (date: string) =>
    apiFetch(`/attendance/summaries/daily/${date}`),

  getSummaryById: (id: string) =>
    apiFetch(`/attendance/summaries/${id}`),

  getRawLogs: (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return apiFetch(`/attendance/logs?${q}`);
  },

  getAuditTrail: (summaryId: string) =>
    apiFetch(`/attendance/summaries/${summaryId}/audit`),

  /**
   * PLACEHOLDER — no backend route exists for this yet. There is currently no way
   * for an HOD to escalate a suspicious attendance record (duplicate clock-ins,
   * missing clock-out, impossible gaps) to HR for review; the only thing that
   * exists today is the read-only audit trail of changes HR/Admin already made.
   * This call is wired exactly like every other endpoint in this file so that
   * when POST /attendance/summaries/:id/flag is built on the backend, the only
   * change needed is removing this comment — the request shape, error handling,
   * and calling code in the attendance detail page stay the same.
   */
  flagDiscrepancy: (summaryId: string, body: { reason: string; note?: string }) =>
    apiFetch(`/attendance/summaries/${summaryId}/flag`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Roster ─────────────────────────────────────────────────────────────────
export const rosterApi = {
  listShifts: (params?: Record<string, string | boolean | undefined>) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return apiFetch(`/api/roster/shifts?${q}`);
  },

  getShift: (id: string) => apiFetch(`/api/roster/shifts/${id}`),

  assignEmployees: (shiftId: string, body: object) =>
    apiFetch(`/api/roster/shifts/${shiftId}/assign-employees`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  unassignEmployees: (shiftId: string, body: object) =>
    apiFetch(`/api/roster/shifts/${shiftId}/unassign-employees`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Employees ──────────────────────────────────────────────────────────────
export const employeeApi = {
  list: (params?: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, v));
    return apiFetch(`/api/employees?${q}`);
  },

  getById: (id: string) => {
    if (DEV_MODE && (id === MOCK_USER.id || id === MOCK_USER.sub)) {
      return Promise.resolve({
        ...MOCK_USER,
        payrollNumber: 'PR-1042',
        employeeCode: 'EMP-0042',
        phoneNumber: '+254712345678',
        employmentType: 'FULL_TIME',
        employmentStatus: 'ACTIVE',
        hourlyRate: 650,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
    return apiFetch(`/api/employees/${id}`);
  },

  create: (body: object) =>
    apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: object) =>
    apiFetch(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  updateStatus: (id: string, employmentStatus: string) =>
    apiFetch(`/api/employees/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ employmentStatus }),
    }),
};

// ── Leave ──────────────────────────────────────────────────────────────────
export const leaveApi = {
  getAll: (status?: string) =>
    apiFetch(`/leaves${status ? `?status=${status}` : ''}`),

  getByEmployee: (employeeId: string) =>
    apiFetch(`/leaves/employee/${employeeId}`),

  /**
   * Fetches leave requests scoped to a specific list of employee IDs by calling
   * GET /leaves/employee/:id once per employee in parallel, rather than pulling
   * the entire tenant's leave table via GET /leaves and filtering client-side.
   *
   * This avoids transferring every other department's leave data over the wire
   * just to discard it. It does mean N parallel requests for N staff — acceptable
   * for a department-sized staff list (tens of people), but if this hospital's
   * departments grow into the hundreds, the right fix is a real
   * GET /leaves?departmentId=... query param on the backend. Until that exists,
   * this is the most correct option available using only existing endpoints.
   */
  getByDepartmentStaff: async (employeeIds: string[], status?: string) => {
    const results = await Promise.allSettled(
      employeeIds.map(id => apiFetch(`/leaves/employee/${id}`)),
    );
    const all: any[] = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        const data = r.value.data || r.value.items || r.value || [];
        all.push(...(Array.isArray(data) ? data : []));
      }
    });
    const filtered = status ? all.filter(l => l.status === status) : all;
    return { data: filtered };
  },

  getById: (id: string) => apiFetch(`/leaves/${id}`),

  updateStatus: (id: string, status: string, comment?: string) =>
    apiFetch(`/leaves/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment }),
    }),
};

// ── Reports ────────────────────────────────────────────────────────────────
export const reportsApi = {
  generate: (body: object) =>
    apiFetch('/api/reports/generate', { method: 'POST', body: JSON.stringify(body) }),

  list: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return apiFetch(`/api/reports?${q}`);
  },

  getById: (id: string) => apiFetch(`/api/reports/${id}`),

  getTypes: () => apiFetch('/api/reports/types'),
};

// ── HOD Action Log ───────────────────────────────────────────────────────
/**
 * PLACEHOLDER — no backend endpoint exists for this yet. Today, nothing shows the
 * HOD "you did this, here's a record" for their own actions (roster assignments,
 * employee status changes, leave rejections). If HR later asks why an employee was
 * suspended, or two HODs share oversight of a department, there's no in-app trail
 * to answer that — the action either worked or it didn't, with no durable record
 * of who did what and when, visible to the HOD themselves.
 *
 * Wired exactly like every other endpoint in this file: when the backend ships a
 * real audit log table and GET /audit-log?actorId=... route, the only change
 * needed is removing this comment and pointing log() and list() at it. Until then,
 * this records actions to localStorage scoped to the current browser/device only —
 * it is NOT shared across devices or persisted server-side, and is explicitly
 * labeled as such in the UI so nobody mistakes it for a real audit trail.
 */
const ACTION_LOG_KEY = 'chronos_hod_action_log';
const ACTION_LOG_MAX = 200;

export interface HODActionLogEntry {
  id: string;
  action: string;
  description: string;
  timestamp: string;
}

export const auditLogApi = {
  log: (action: string, description: string) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(ACTION_LOG_KEY);
      const entries: HODActionLogEntry[] = raw ? JSON.parse(raw) : [];
      entries.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        action,
        description,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(entries.slice(0, ACTION_LOG_MAX)));
    } catch { /* localStorage unavailable — action logging is best-effort only */ }
  },

  list: (): HODActionLogEntry[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(ACTION_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACTION_LOG_KEY);
  },
};
