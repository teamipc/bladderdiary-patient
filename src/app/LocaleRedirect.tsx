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
    <>
      {/* Crawler / no-JS fallback: client useEffect above handles JS users
          with locale preference; this kicks in for everyone else. */}
      <noscript>
        <meta httpEquiv="refresh" content="0;url=/en" />
      </noscript>
      <div className="flex items-center justify-center py-24 bg-surface">
        <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
      </div>
    </>
  );
}
