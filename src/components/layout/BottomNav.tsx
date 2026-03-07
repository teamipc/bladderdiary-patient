'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/diary/day/1', label: 'Day 1', day: 1 },
  { href: '/diary/day/2', label: 'Day 2', day: 2 },
  { href: '/diary/day/3', label: 'Day 3', day: 3 },
  { href: '/summary', label: 'Summary', day: null },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md
      border-t border-ipc-100 safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.day && pathname?.startsWith(`/diary/day/${item.day}`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[56px]
                transition-colors ${
                  isActive
                    ? 'text-ipc-600'
                    : 'text-ipc-400 hover:text-ipc-600'
                }`}
            >
              {item.day ? (
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                    ${
                      isActive
                        ? 'bg-ipc-500 text-white'
                        : 'bg-ipc-100 text-ipc-600'
                    }`}
                >
                  {item.day}
                </div>
              ) : (
                <div className={`w-8 h-8 flex items-center justify-center ${
                  isActive ? 'text-ipc-600' : 'text-ipc-400'
                }`}>
                  <BarChart3 size={22} />
                </div>
              )}
              <span className={`text-xs font-medium ${
                isActive ? 'text-ipc-700' : 'text-ipc-400'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
