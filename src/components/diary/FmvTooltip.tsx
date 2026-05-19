'use client';

/**
 * Phase 15 MI-04. One-pass educational tooltip explaining the first morning
 * void (FMV) — why it's flagged and what it tells the clinician.
 *
 * Triggered by DayPageClient the first time a void on Day 2 or Day 3 is
 * auto-flagged as the first morning void AND the persisted fmvTooltipShown
 * flag is false. Dismissal is via close button, "Got it" button, ESC key,
 * or backdrop tap; the parent then calls markFmvTooltipShown() to persist
 * the flag so the tooltip never re-fires across sessions.
 *
 * Day 1 FMVs are intentionally NOT surfaced via this tooltip — Day 1 is
 * the IPC adaptation period (excluded from 24HV / NPi / AVV per CLAUDE.md
 * memory ipc-calculations.md), so teaching the patient about FMV on Day 1
 * would teach a metric that doesn't matter yet.
 *
 * Accessibility: role="dialog" + aria-modal="true" + aria-labelledby
 * pointing at the title heading. ESC key dismisses. The tooltip root is
 * focused on mount so screen readers + keyboard users land inside the
 * dialog immediately.
 */

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

interface FmvTooltipProps {
  /** Parent calls markFmvTooltipShown + unmounts when this fires. */
  onDismiss: () => void;
}

export default function FmvTooltip({ onDismiss }: FmvTooltipProps) {
  const t = useTranslations('fmvTooltip');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the tooltip on mount so screen readers + keyboard users land
  // inside the dialog. ESC dismisses.
  useEffect(() => {
    dialogRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  return (
    <>
      {/* Backdrop. Tap to dismiss. */}
      <div
        className="fixed inset-0 z-[57] bg-black/20 animate-overlay-fade-in"
        onClick={onDismiss}
        aria-hidden="true"
      />
      {/* Tooltip card with caret pointing up. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-labelledby="fmv-tooltip-title"
        aria-modal="true"
        tabIndex={-1}
        className="fixed bottom-24 start-4 end-4 mx-auto max-w-md z-[58]
          bg-white rounded-2xl shadow-2xl border border-ipc-200
          px-5 py-4 animate-overlay-fade-in"
      >
        {/* Caret (CSS triangle on the top edge) */}
        <span
          aria-hidden="true"
          className="absolute -top-2 start-1/2 -translate-x-1/2
            w-4 h-4 rotate-45 bg-white border-l border-t border-ipc-200"
        />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              id="fmv-tooltip-title"
              className="text-base font-bold text-ipc-950 mb-1.5 text-balance"
            >
              {t('title')}
            </h3>
            <p className="text-sm text-ipc-700 leading-relaxed">
              {t('body')}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('dismiss')}
            className="shrink-0 -me-1 -mt-1 p-1.5 rounded-full
              text-ipc-400 hover:text-ipc-700 hover:bg-ipc-50 transition-colors"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full px-4 py-2.5 rounded-xl bg-ipc-500 hover:bg-ipc-600
            text-white text-sm font-semibold transition-colors"
        >
          {t('dismiss')}
        </button>
      </div>
    </>
  );
}
