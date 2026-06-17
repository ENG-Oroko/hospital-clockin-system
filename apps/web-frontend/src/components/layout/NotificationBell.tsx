'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { attendanceApi, leaveApi, employeeApi } from '@/lib/api';

export interface Notification {
  id: string;
  type: 'ABSENT' | 'LATE' | 'LEAVE_REQUEST' | 'LEAVE_REJECTED' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  href?: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const STORAGE_KEY = 'chronos_hod_notif_read_ids';

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function markRead(ids: string[]) {
  const current = getReadIds();
  ids.forEach(id => current.add(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
}

/**
 * Derives notifications from existing attendance/leave data rather than a dedicated
 * push endpoint. The backend's notifications/websocket modules are currently stubs
 * (no real implementation), so this polls on an interval instead of subscribing to
 * a live socket. Structured so that swapping in a real GET /notifications endpoint
 * later is a single function change — the Notification shape and UI stay the same.
 */
async function fetchDerivedNotifications(departmentId: string): Promise<Notification[]> {
  const date = todayStr();
  const notifications: Notification[] = [];

  const [summaryRes, leaveRes, staffRes] = await Promise.allSettled([
    attendanceApi.getSummaries({ departmentId, startDate: date, endDate: date, limit: 100 }),
    leaveApi.getAll('PENDING'),
    employeeApi.list({ departmentId }),
  ]);

  if (summaryRes.status === 'fulfilled') {
    const summaries = summaryRes.value.data || [];
    summaries
      .filter((s: any) => s.status === 'ABSENT')
      .forEach((s: any) => {
        notifications.push({
          id: `absent-${s.id}`,
          type: 'ABSENT',
          title: 'Unexcused Absence',
          message: `${s.user.firstName} ${s.user.lastName} has not clocked in today.`,
          timestamp: s.date,
          read: getReadIds().has(`absent-${s.id}`),
          href: `/hod/attendance/${s.id}`,
        });
      });
    summaries
      .filter((s: any) => s.status === 'LATE')
      .forEach((s: any) => {
        notifications.push({
          id: `late-${s.id}`,
          type: 'LATE',
          title: 'Late Arrival',
          message: `${s.user.firstName} ${s.user.lastName} clocked in ${s.lateMinutes} min late.`,
          timestamp: s.firstIn || s.date,
          read: getReadIds().has(`late-${s.id}`),
          href: `/hod/attendance/${s.id}`,
        });
      });
  }

  if (leaveRes.status === 'fulfilled' && staffRes.status === 'fulfilled') {
    const staffIds = new Set((staffRes.value.data || []).map((e: any) => e.id));
    const leaves = leaveRes.value.data || leaveRes.value || [];
    leaves
      .filter((l: any) => staffIds.has(l.employeeId))
      .forEach((l: any) => {
        notifications.push({
          id: `leave-${l.id}`,
          type: 'LEAVE_REQUEST',
          title: 'New Leave Request',
          message: `A pending ${l.leaveType?.replace('_', ' ').toLowerCase()} request needs your review.`,
          timestamp: l.createdAt,
          read: getReadIds().has(`leave-${l.id}`),
          href: '/hod/leave',
        });
      });
  }

  return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const TYPE_ICON: Record<Notification['type'], { bg: string; color: string; icon: React.ReactNode }> = {
  ABSENT: {
    bg: 'bg-red-100', color: 'text-red-600',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  LATE: {
    bg: 'bg-amber-100', color: 'text-amber-600',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  LEAVE_REQUEST: {
    bg: 'bg-blue-100', color: 'text-blue-600',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
  },
  LEAVE_REJECTED: {
    bg: 'bg-slate-100', color: 'text-slate-500',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
  },
  SYSTEM: {
    bg: 'bg-teal-100', color: 'text-teal-600',
    icon: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a7.66 7.66 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /></svg>,
  },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell({ departmentId }: { departmentId: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const data = await fetchDerivedNotifications(departmentId);
      setNotifications(data);
    } catch {
      // Silent failure — bell just shows nothing new rather than an error banner.
      // A failed backend shouldn't produce a disruptive alert about alerts.
    } finally { setLoading(false); }
  }, [departmentId]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpen = () => setOpen(o => !o);

  const handleMarkAllRead = () => {
    markRead(notifications.map(n => n.id));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleItemClick = (n: Notification) => {
    markRead([n.id]);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    if (n.href) window.location.href = n.href;
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-primary/70
          hover:bg-slate-100 hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-info"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="true" aria-expanded={open}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500
            text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-80 bg-bg-surface rounded-card shadow-lg border border-border max-h-[28rem] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-text-primary">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-info hover:text-blue-700 font-semibold">
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-medium text-text-secondary">Checking for updates…</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-text-primary">All caught up — nothing needs your attention.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map(n => {
                    const cfg = TYPE_ICON[n.type];
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => handleItemClick(n)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-info-bg/40 transition-colors
                            ${!n.read ? 'bg-info-bg/30' : ''}`}>
                          <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cfg.bg}`}>
                            <span className={`w-4 h-4 ${cfg.color}`}>{cfg.icon}</span>
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-text-primary">{n.title}</span>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-info flex-shrink-0" />}
                            </span>
                            <span className="block text-xs font-medium text-text-primary/80 mt-0.5">{n.message}</span>
                            <span className="block text-xs text-text-secondary mt-1">{timeAgo(n.timestamp)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
