'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';

const CONTACT_EMAIL = 'hello@myflowcheck.com';

export default function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-ipc-100 bg-gradient-to-b from-surface to-ipc-50/40">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-ipc-950 tracking-tight mb-1">
          {t('contactTitle')}
        </h2>
        <p className="text-sm text-ipc-700 mb-5">{t('contactBody')}</p>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-white border border-ipc-200 text-ipc-900 font-semibold text-sm sm:text-base shadow-sm hover:border-ipc-400 hover:shadow-md transition-all active:scale-[0.98]"
          aria-label={`${t('emailLabel')} ${CONTACT_EMAIL}`}
        >
          <Mail size={18} className="text-ipc-600" aria-hidden />
          <span dir="ltr">{CONTACT_EMAIL}</span>
        </a>

        <nav
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-8 text-sm text-ipc-700"
          aria-label={t('navAriaLabel')}
        >
          <Link href="/privacy" className="hover:text-ipc-950 hover:underline underline-offset-4 decoration-ipc-300">
            {t('privacy')}
          </Link>
          <span className="text-ipc-300" aria-hidden>·</span>
          <Link href="/terms" className="hover:text-ipc-950 hover:underline underline-offset-4 decoration-ipc-300">
            {t('terms')}
          </Link>
          <span className="text-ipc-300" aria-hidden>·</span>
          <Link href="/help" className="hover:text-ipc-950 hover:underline underline-offset-4 decoration-ipc-300">
            {t('help')}
          </Link>
        </nav>

        <p className="text-xs text-ipc-500 mt-5 leading-relaxed">
          {t('rights', { year })}
        </p>
      </div>
    </footer>
  );
}
