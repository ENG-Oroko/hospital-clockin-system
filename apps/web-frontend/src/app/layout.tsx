// Shared application shell — required by Next.js App Router (every app needs exactly
// one root layout). This is infrastructure shared across all five role dashboards
// (Super Admin, Hospital Admin, HOD, HR, General User), not HOD-specific code.
// It intentionally contains no auth logic, no role checks, and no navigation —
// those live in each role's own layout (e.g. HODLayout) and in the shared login page
// owned elsewhere in the team.
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chronos — Hospital Workforce Management',
  description: 'Hospital staff clock-in and attendance management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-900 bg-slate-50">{children}</body>
    </html>
  );
}
