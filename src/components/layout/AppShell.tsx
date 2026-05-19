'use client';

import { useTranslations } from 'next-intl';
import Header from './Header';
import BottomNav from './BottomNav';
import Footer from './Footer';
import PrivacyNotice from './PrivacyNotice';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-ipc-950 focus:text-white focus:font-semibold focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-ipc-400 focus:ring-offset-2"
      >
        {t('skipToContent')}
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
      <div className="pb-24 md:pb-0" aria-hidden />
      <BottomNav />
      <PrivacyNotice />
    </div>
  );
}
