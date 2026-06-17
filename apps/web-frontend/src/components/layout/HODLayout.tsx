'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, employeeApi } from '@/lib/api';
import { Sidebar, TopBar } from '@/components/layout/Sidebar';
import { PulseStrip, Spinner } from '@/components/ui';
import type { AuthUser } from '@/types';

interface HODLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function HODLayout({ children, title, subtitle }: HODLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // The login page is owned and built elsewhere in this RBAC system (single shared
  // login, role-based redirect). This dashboard never renders or owns that page —
  // it only redirects to it when no valid session is found. The target path is
  // configurable so this module doesn't hardcode assumptions about another team's route.
  const LOGIN_PATH = process.env.NEXT_PUBLIC_LOGIN_PATH || '/login';

  // DEV-ONLY BYPASS: while the backend and shared login page are incomplete, this lets
  // you preview and test every HOD page without a real session or working API.
  // Set NEXT_PUBLIC_DEV_MODE=true in .env.local to enable. Never set this in production —
  // it skips authentication entirely and injects a fake DEPT_HEAD user.
  const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  const MOCK_USER: AuthUser = {
    id: 'dev-user-id',
    firstName: 'Mercy',
    lastName: 'Achieng',
    email: 'matron.mercy@stteresa.or.ke',
    role: 'DEPT_HEAD',
    tenantId: 'dev-tenant-id',
    departmentId: 'dev-department-id',
    department: { id: 'dev-department-id', name: 'Intensive Care Unit', code: 'ICU' },
  };

  useEffect(() => {
    if (DEV_MODE) { setUser(MOCK_USER); setLoading(false); return; }

    const raw = getCurrentUser();
    if (!raw) { router.push(LOGIN_PATH); return; }
    if (raw.role !== 'DEPT_HEAD') { router.push(LOGIN_PATH); return; }

    // Fetch full profile to get departmentId (not in JWT)
    employeeApi.getById(raw.id || raw.sub)
      .then((emp: any) => {
        setUser({
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          role: emp.role,
          tenantId: emp.tenantId,
          departmentId: emp.departmentId,
          department: emp.department,
        });
      })
      .catch(() => {
        // fallback to raw JWT data if profile fetch fails
        setUser({
          id: raw.id || raw.sub,
          firstName: raw.firstName || '',
          lastName: raw.lastName || '',
          email: raw.email || '',
          role: raw.role,
          tenantId: raw.tenantId,
          departmentId: raw.departmentId || null,
          department: null,
        });
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-secondary">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-page">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col ml-64 transition-all duration-300">
        <PulseStrip active />
        <TopBar title={title} subtitle={subtitle} user={user} />
        <main className="flex-1 p-6 overflow-auto">
          {/* Pass user down via context would be ideal; for now children consume from HODLayout */}
          {children}
        </main>
      </div>
    </div>
  );
}

// Auth context hook for child pages to get the current HOD user
import { createContext, useContext } from 'react';
export const UserContext = createContext<AuthUser | null>(null);
export function useHODUser() { return useContext(UserContext); }
