'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { locales, defaultLocale } from '@/i18n/config';

export default function LocaleRedirect() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('preferred-locale');
    if (saved && (locales as readonly string[]).includes(saved)) {
      router.replace(`/${saved}`);
      return;
    }

    const browserLangs = navigator.languages || [navigator.language];
    for (const lang of browserLangs) {
      const prefix = lang.split('-')[0].toLowerCase();
      if ((locales as readonly string[]).includes(prefix)) {
        router.replace(`/${prefix}`);
        return;
      }
    }

    router.replace(`/${defaultLocale}`);
  }, [router]);

  return (
    // Crawlers + no-JS users get the full EN landing page from the
    // post-build copy of out/en.html → out/index.html (Phase 12-02).
    // This spinner is only seen by JS users during the client-side
    // locale-detect + router.replace cycle (typically <100ms).
    <div className="flex items-center justify-center py-24 bg-surface">
      <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
    </div>
  );
}
