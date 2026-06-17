'use client';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, getCurrentUser } from '@/lib/api';
import type { AuthUser } from '@/types';
import { useState } from 'react';
import { NotificationBell } from '@/components/layout/NotificationBell';

const NAV_ITEMS = [
  {
    href: '/hod/dashboard',
    label: 'Dashboard',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/hod/roster',
    label: 'Roster',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: '/hod/attendance',
    label: 'Attendance',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/hod/staff',
    label: 'Staff',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: '/hod/leave',
    label: 'Leave',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    href: '/hod/reports',
    label: 'Reports',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: '/hod/activity',
    label: 'My Activity',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 8.25v3.75l2.25 1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function Sidebar({ user }: { user: AuthUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <aside className={`fixed left-0 top-0 h-full bg-bg-sidebar flex flex-col transition-all duration-300 z-40
      ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-info flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-base leading-none">Chronos</p>
            <p className="text-white/40 text-xs mt-0.5">HOD Portal</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-white/40 hover:text-white transition-colors p-1 rounded"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <a href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${active
                      ? 'bg-info/20 text-blue-100 border-l-2 border-info pl-[10px]'
                      : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        {user && !collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-100 text-xs font-bold">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-white/40 text-xs truncate">
                {user.department?.name ?? 'Department'}
              </p>
            </div>
            <button onClick={handleSignOut}
              className="text-white/40 hover:text-red-400 transition-colors p-1 rounded"
              title="Sign out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={handleSignOut}
            className="w-full flex justify-center text-white/40 hover:text-red-400 transition-colors py-2"
            title="Sign out">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}

export function TopBar({ title, subtitle, user }: {
  title: string;
  subtitle?: string;
  user: AuthUser | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const today = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const LOGIN_PATH = process.env.NEXT_PUBLIC_LOGIN_PATH || '/login';

  const handleSignOut = () => {
    clearAuth();
    setMenuOpen(false);
    router.push(LOGIN_PATH);
  };

  return (
    <header className="bg-bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-display font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-body font-medium text-text-primary/80 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-text-primary">
            {user ? `${user.firstName} ${user.lastName}` : 'Head of Department'}
          </p>
          <p className="text-xs font-medium text-text-primary/75">{today}</p>
        </div>

        <NotificationBell departmentId={user?.departmentId ?? null} />

        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-9 h-9 rounded-full bg-info-bg flex items-center justify-center
            hover:ring-2 hover:ring-info/30 transition-all focus:outline-none focus:ring-2 focus:ring-info"
          aria-label="Open profile menu" aria-haspopup="true" aria-expanded={menuOpen}>
          <span className="text-info text-sm font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-12 z-20 w-56 bg-bg-surface rounded-card shadow-lg border border-border py-2">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-semibold text-text-primary">
                  {user ? `${user.firstName} ${user.lastName}` : 'Head of Department'}
                </p>
                <p className="text-xs font-medium text-text-primary/75 truncate">{user?.email}</p>
              </div>
              <a href={`/hod/staff/${user?.id}`}
                className="block px-4 py-2 text-sm font-medium text-text-primary/80 hover:bg-slate-50 transition-colors">
                My Profile
              </a>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-bg transition-colors">
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
