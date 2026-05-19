'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { useDiaryStore } from '@/lib/store';

/**
 * Phase 16 CEL-01 + CEL-05 — one-time completion hero shown at the top of
 * /summary when the patient first lands on a completed 3-day diary.
 *
 * Boomer-safe: subtle marker (CheckCircle2 in a tinted disc), warm 2-line
 * copy, and a courtesy "Got it" dismiss button. NO confetti, NO particles,
 * NO bouncy easing. Reuses the existing animate-fade-slide-up keyframe.
 *
 * Gating is performed by the PARENT (src/app/[locale]/summary/page.tsx) via
 * a ref-locked capture of summaryCelebrationShown so a mid-visit store update
 * does not unmount this component during the current visit. The next visit
 * sees the flag true and the parent gate suppresses the mount entirely.
 */
export default function CompletionHero() {
  const t = useTranslations('summary.completionHero');
  const markSummaryCelebrationShown = useDiaryStore((s) => s.markSummaryCelebrationShown);
  const [dismissed, setDismissed] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  // One-shot: mark the celebration as shown on mount. The flag persists to
  // IndexedDB via Zustand persist; subsequent /summary visits see the flag as
  // true and the parent gate suppresses this component entirely. Idempotent.
  useEffect(() => {
    markSummaryCelebrationShown();
  }, [markSummaryCelebrationShown]);

  const handleDismiss = () => {
    // 240ms opacity fade, then unmount via the dismissed flag. Matches the
    // Tailwind transition-opacity duration-200 class with a hair of headroom
    // so the fade completes visually before React removes the node.
    setFadingOut(true);
    setTimeout(() => setDismissed(true), 240);
  };

  if (dismissed) return null;

  return (
    <section
      role="status"
      aria-live="polite"
      className={`rounded-2xl bg-ipc-50 border border-ipc-100 p-4 animate-fade-slide-up ${
        fadingOut ? 'opacity-0 transition-opacity duration-200' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 size={20} className="text-success" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-ipc-950 leading-tight">
            {t('title')}
          </p>
          <p className="text-sm text-ipc-600 leading-relaxed mt-1">
            {t('body')}
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('dismiss')}
            className="mt-3 text-sm font-medium text-ipc-700 hover:text-ipc-900 underline underline-offset-2 transition-colors"
          >
            {t('dismiss')}
          </button>
        </div>
      </div>
    </section>
  );
}
