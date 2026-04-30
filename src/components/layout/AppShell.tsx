'use client';

import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';
import PrivacyNotice from './PrivacyNotice';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <div className="pb-24" aria-hidden />
      <BottomNav />
      <PrivacyNotice />
    </div>
  );
}
