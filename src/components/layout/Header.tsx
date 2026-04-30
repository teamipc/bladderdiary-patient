'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import Image from 'next/image';
import { locales, type Locale } from '@/i18n/config';
import { LOCALE_LABEL } from '@/i18n/seo';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('common');
  const tLang = useTranslations('language');
  const tNav = useTranslations('nav');
  const displayTitle = title ?? t('appName');

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleHomeClick = () => {
    router.push('/');
  };

  const switchLocale = (locale: Locale) => {
    localStorage.setItem('preferred-locale', locale);
    router.replace(pathname, { locale });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-ipc-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-14">
        <button
          type="button"
          onClick={handleHomeClick}
          className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
        >
          <Image src="/app-logo.png" alt="My Flow Check" width={36} height={36} className="rounded" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-lg font-bold text-ipc-900 tracking-tight">
              {displayTitle}
            </span>
            <span className="flex items-center gap-1 -mt-0.5">
              <Image src="/ipc-logo.png" alt="IPC" width={10} height={10} />
              <span className="text-[10px] text-ipc-700">{t('poweredByIpc')}</span>
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <Link
            href="/learn"
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors active:bg-ipc-200 ${
              pathname.startsWith('/learn')
                ? 'bg-ipc-100 text-ipc-900'
                : 'text-ipc-800 underline decoration-ipc-400 underline-offset-4 decoration-2 hover:bg-ipc-100 hover:decoration-ipc-600'
            }`}
          >
            {tNav('learn')}
          </Link>

          {/* Language switcher */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-ipc-800 hover:bg-ipc-50 active:bg-ipc-100 transition-colors"
              aria-label={tLang('switchLanguage')}
              aria-expanded={open}
              aria-haspopup="true"
            >
              <Globe className="w-5 h-5" />
              <span className="text-xs font-medium uppercase">{currentLocale}</span>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-ipc-100 py-1 min-w-[140px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => switchLocale(locale)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      locale === currentLocale
                        ? 'bg-ipc-50 text-ipc-700 font-semibold'
                        : 'text-ipc-600 hover:bg-ipc-50'
                    }`}
                  >
                    {LOCALE_LABEL[locale]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
