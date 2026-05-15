'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import Image from 'next/image';
import { locales, type Locale } from '@/i18n/config';
import { LOCALE_LABEL } from '@/i18n/seo';
import Container from '@/components/layout/Container';
import { useDiaryStore } from '@/lib/store';
import { getCurrentDay } from '@/lib/utils';

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

  // Conditional nav-item state — mirrors BottomNav.tsx lines 13-21 so Track/Diary
  // visibility matches across mobile bottom-tab bar and desktop top-bar nav.
  // See UI-SPEC §"Conditional nav-item logic (locked)".
  const { diaryStarted, startDate, timeZone, getBedtimeForDay } = useDiaryStore();
  const currentDay = diaryStarted ? getCurrentDay(startDate, timeZone) : 1;
  const todayHref = `/diary/day/${currentDay}`;
  const isTrackingComplete = diaryStarted && !!getBedtimeForDay(3);

  const isHomeActive = pathname === '/';
  const isTrackActive = pathname?.startsWith('/diary/day/') ?? false;
  const isDiaryActive = pathname === '/summary';

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
      <Container variant="wide" as="div" className="flex items-center justify-between h-14">
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

        {/* Primary nav (desktop only) — hidden below md, three-region flex with logo (left) and utility cluster (right).
            See UI-SPEC §"3. Header (MODIFIED — adds top-bar nav)" + §"Conditional nav-item logic (locked)". */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label={tNav('primaryNavAriaLabel')}
        >
          <NavLink href="/" active={isHomeActive}>{tNav('home')}</NavLink>
          {diaryStarted && (
            <NavLink href={todayHref} active={isTrackActive}>{tNav('track')}</NavLink>
          )}
          {isTrackingComplete && (
            <NavLink href="/summary" active={isDiaryActive}>{tNav('diary')}</NavLink>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/learn"
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors active:bg-ipc-200 ${
              pathname.startsWith('/learn')
                ? 'bg-ipc-100 text-ipc-900'
                : 'text-ipc-800 underline decoration-ipc-400 underline-offset-4 decoration-2 hover:bg-ipc-100 hover:decoration-ipc-600'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface`}
          >
            {tNav('learn')}
          </Link>

          {/* Language switcher */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-ipc-800 hover:bg-ipc-50 active:bg-ipc-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              aria-label={tLang('switchLanguage')}
              aria-expanded={open}
              aria-haspopup="true"
            >
              <Globe className="w-5 h-5" />
              <span className="text-xs font-medium uppercase">{currentLocale}</span>
            </button>

            {open && (
              <div className="absolute end-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-ipc-100 py-1 min-w-[140px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => switchLocale(locale)}
                    className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
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
      </Container>
    </header>
  );
}

// NavLink — inline helper for the primary top-bar <nav> above. NOT exported.
// One-use component; kept inline per UI-SPEC §"3. Header" point 2 to avoid
// inflating the layout/ directory. Uses the locale-aware <Link> from
// @/i18n/navigation already imported at the top of the file.
//
// Visual + interaction spec: UI-SPEC §"NavLink helper component" + §"Hover-affordance spec"
// + §"Focus-visible ring spec". The min-h-[44px] enforces the boomer-safe + WCAG 2.5.5
// minimum hit target (CONTEXT.md §"Boomer-safe overrides" rule 1).
function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const baseClasses =
    'inline-flex items-center min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';
  const stateClasses = active
    ? 'bg-ipc-100 text-ipc-900 underline decoration-ipc-400 underline-offset-4 decoration-2'
    : 'text-ipc-800 hover:text-ipc-950 hover:bg-ipc-50';
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${baseClasses} ${stateClasses}`}
    >
      {children}
    </Link>
  );
}
