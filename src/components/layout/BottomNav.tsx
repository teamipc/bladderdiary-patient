'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Droplet, BarChart3, Lock } from 'lucide-react';
import { useDiaryStore } from '@/lib/store';
import { getCurrentDay } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const { diaryStarted, startDate, getBedtimeForDay } = useDiaryStore();

  const currentDay = diaryStarted ? getCurrentDay(startDate) : 1;
  const todayHref = `/diary/day/${currentDay}`;
  const isTrackingComplete = diaryStarted && !!getBedtimeForDay(3);

  const isHomeActive = pathname === '/';
  const isTrackActive = pathname?.startsWith('/diary/day/');
  const isResultsActive = pathname === '/summary';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md
      border-t border-ipc-100 safe-bottom">
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
            Home
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
              Track
            </span>
          </Link>
        ) : (
          <div className="flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
            text-ipc-100 cursor-not-allowed opacity-50">
            <div className="w-8 h-8 flex items-center justify-center">
              <Droplet size={22} />
            </div>
            <span className="text-xs font-medium">Track</span>
          </div>
        )}

        {/* Results tab — locked until Day 3 bedtime recorded */}
        {isTrackingComplete ? (
          <Link
            href="/summary"
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
              transition-colors ${
                isResultsActive ? 'text-ipc-600' : 'text-ipc-200 hover:text-ipc-400'
              }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center ${
              isResultsActive ? 'text-ipc-600' : 'text-ipc-200'
            }`}>
              <BarChart3 size={22} />
            </div>
            <span className={`text-xs font-medium ${
              isResultsActive ? 'text-ipc-700' : 'text-ipc-200'
            }`}>
              Results
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
            <span className="text-xs font-medium">Results</span>
          </div>
        )}
      </div>
    </nav>
  );
}
