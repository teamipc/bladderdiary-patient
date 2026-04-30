'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'mfc-privacy-notice-seen';

export default function PrivacyNotice() {
  const t = useTranslations('privacyNotice');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* localStorage may be blocked in private mode — fail silently */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-20 z-40 px-3 sm:px-6 pointer-events-none"
      role="region"
      aria-label={t('ariaLabel')}
    >
      <div className="mx-auto max-w-md rounded-2xl bg-white/95 backdrop-blur-md border border-ipc-200 shadow-lg p-4 pointer-events-auto animate-fade-slide-up">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-ipc-50 flex items-center justify-center">
            <ShieldCheck size={18} className="text-ipc-700" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-ipc-950 mb-0.5 leading-tight">
              {t('title')}
            </h2>
            <p className="text-xs text-ipc-700 leading-snug mb-2.5">
              {t('body')}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center px-4 py-1.5 rounded-full bg-ipc-700 text-white text-xs font-semibold hover:bg-ipc-800 active:scale-[0.98] transition-all shadow-sm"
              >
                {t('cta')}
              </button>
              <Link
                href="/privacy"
                onClick={dismiss}
                className="text-xs text-ipc-600 hover:text-ipc-900 underline underline-offset-2 decoration-ipc-300"
              >
                {t('learnMore')}
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('dismissAria')}
            className="shrink-0 -m-1 p-1 text-ipc-500 hover:text-ipc-900 transition-colors"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
