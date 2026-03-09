'use client';

import Header from './Header';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <Header />
      <main className="flex-1 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
