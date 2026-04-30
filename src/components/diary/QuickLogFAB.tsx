'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Droplets, Coffee, CloudDrizzle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type LogAction = 'void' | 'drink' | 'leak' | 'bedtime';

interface QuickLogFABProps {
  onAction: (action: LogAction) => void;
}

export default function QuickLogFAB({ onAction }: QuickLogFABProps) {
  const t = useTranslations('quickLog');
  const tc = useTranslations('common');
  const [expanded, setExpanded] = useState(false);

  // Mirror the nav's scroll-hide logic so FAB drops when nav hides
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (delta > 8 && currentY > 60) {
        setNavHidden(true);
      } else if (delta < -8) {
        setNavHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAction = useCallback(
    (action: LogAction) => {
      setExpanded(false);
      onAction(action);
    },
    [onAction],
  );

  return (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 backdrop-dim"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* FAB container — drops lower when nav auto-hides on scroll */}
      <div className={`fixed right-5 z-50 flex flex-col items-end gap-3 transition-[bottom] duration-300 ${
        navHidden ? 'bottom-6' : 'bottom-24'
      }`}>
        {/* Action buttons (shown when expanded) */}
        {expanded && (
          <div className="flex flex-col items-end gap-3 animate-fade-slide-up">
            <button
              type="button"
              onClick={() => handleAction('drink')}
              className="flex items-center justify-between gap-3 min-w-[8rem] ps-4 pe-3 py-2.5 rounded-full bg-drink
                text-white shadow-lg active:scale-[0.95] transition-transform"
            >
              <span className="text-base font-semibold">{t('drink')}</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Coffee size={20} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('leak')}
              className="flex items-center justify-between gap-3 min-w-[8rem] ps-4 pe-3 py-2.5 rounded-full bg-leak
                text-white shadow-lg active:scale-[0.95] transition-transform"
            >
              <span className="text-base font-semibold">{t('leak')}</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <CloudDrizzle size={20} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('void')}
              className="flex items-center justify-between gap-3 min-w-[8rem] ps-4 pe-3 py-2.5 rounded-full bg-void
                text-white shadow-lg active:scale-[0.95] transition-transform"
            >
              <span className="text-base font-semibold">{t('pee')}</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Droplets size={20} />
              </div>
            </button>
          </div>
        )}

        {/* Main FAB button with label */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className={`w-16 h-16 rounded-full flex items-center justify-center
              transition-all active:scale-[0.9] ${
                expanded
                  ? 'bg-ipc-800 rotate-45 shadow-xl'
                  : 'bg-ipc-500 hover:bg-ipc-600 animate-fab-glow'
              }`}
          >
            {expanded ? (
              <X size={28} className="text-white -rotate-45" />
            ) : (
              <Plus size={28} className="text-white" />
            )}
          </button>
          {!expanded && (
            <span className="text-[10px] font-semibold text-ipc-700">
              {tc('log')}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
