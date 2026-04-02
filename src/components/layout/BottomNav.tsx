'use client';

import { useState, useEffect, useRef } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Home, Droplet, BarChart3, Lock } from 'lucide-react';
import { useDiaryStore } from '@/lib/store';
import { getCurrentDay } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { diaryStarted, startDate, timeZone, getBedtimeForDay } = useDiaryStore();

  const currentDay = diaryStarted ? getCurrentDay(startDate, timeZone) : 1;
  const todayHref = `/diary/day/${currentDay}`;
  const isTrackingComplete = diaryStarted && !!getBedtimeForDay(3);

  const isHomeActive = pathname === '/';
  const isTrackActive = pathname?.startsWith('/diary/day/');
  const isDiaryActive = pathname === '/summary';

  // Auto-hide on scroll down, show on scroll up
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (delta > 8 && currentY > 60) {
        setHidden(true);
      } else if (delta < -8) {
        setHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-ipc-100 safe-bottom transition-transform duration-300 ${hidden ? 'translate-y-full' : 'translate-y-0'}`}>
      <div className="max-w-lg mx-auto flex">
        {/* Home tab */}
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
            transition-colors ${
              isHomeActive ? 'text-ipc-600' : 'text-ipc-200 hover:text-ipc-400'
            }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center ${
            isHomeActive ? 'text-ipc-600' : 'text-ipc-200'
          }`}>
            <Home size={22} />
          </div>
          <span className={`text-xs font-medium ${
            isHomeActive ? 'text-ipc-700' : 'text-ipc-200'
          }`}>
            {t('home')}
          </span>
        </Link>

        {/* Track tab */}
        {diaryStarted ? (
          <Link
            href={todayHref}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
              transition-colors ${
                isTrackActive ? 'text-ipc-600' : 'text-ipc-200 hover:text-ipc-400'
              }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center ${
              isTrackActive ? 'text-ipc-600' : 'text-ipc-200'
            }`}>
              <Droplet size={22} />
            </div>
            <span className={`text-xs font-medium ${
              isTrackActive ? 'text-ipc-700' : 'text-ipc-200'
            }`}>
              {t('track')}
            </span>
          </Link>
        ) : (
          <div className="flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
            text-ipc-100 cursor-not-allowed opacity-50">
            <div className="w-8 h-8 flex items-center justify-center">
              <Droplet size={22} />
            </div>
            <span className="text-xs font-medium">{t('track')}</span>
          </div>
        )}

        {/* Diary tab — locked until Day 3 bedtime recorded */}
        {isTrackingComplete ? (
          <Link
            href="/summary"
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
              transition-colors ${
                isDiaryActive ? 'text-ipc-600' : 'text-ipc-200 hover:text-ipc-400'
              }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center ${
              isDiaryActive ? 'text-ipc-600' : 'text-ipc-200'
            }`}>
              <BarChart3 size={22} />
            </div>
            <span className={`text-xs font-medium ${
              isDiaryActive ? 'text-ipc-700' : 'text-ipc-200'
            }`}>
              {t('diary')}
            </span>
          </Link>
        ) : (
          <div className="flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
            text-ipc-100 cursor-not-allowed opacity-40">
            <div className="w-8 h-8 flex items-center justify-center relative">
              <BarChart3 size={22} />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full
                bg-ipc-100 flex items-center justify-center">
                <Lock size={9} className="text-ipc-400" />
              </div>
            </div>
            <span className="text-xs font-medium">{t('diary')}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
