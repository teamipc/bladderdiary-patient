'use client';

/**
 * Phase 15 MI-03. Route-level acknowledgment overlay shown for 1.5s when the
 * user advances from Day 1 to Day 2, or Day 2 to Day 3. Auto-dismisses.
 *
 * Day 3 completion is NOT covered here — the existing /summary auto-redirect
 * + milestone toast at DayPageClient.tsx (the day3_complete branch) owns
 * that finish-line moment.
 *
 * Motion: 200ms fade-in via .animate-overlay-fade-in keyframe, 1.5s hold,
 * 200ms Tailwind transition-opacity fade-out (triggered by `visible` flip).
 * prefers-reduced-motion: reduce collapses both fades to instant via the
 * global rule in src/app/globals.css; the 1.5s hold is preserved so the
 * message stays readable.
 *
 * Accessibility: role="status" + aria-live="polite" announces the message
 * once to assistive tech when the overlay mounts. Not a dialog (no user
 * action required to proceed).
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface DayTransitionOverlayProps {
  /** The day the user JUST FINISHED (1 or 2). The overlay shows "Day {finishedDay} done. {N to go}." */
  finishedDay: 1 | 2;
  /** Parent unmounts the overlay when this fires (after the 1.5s hold + 200ms fade-out). */
  onDismissed: () => void;
}

export default function DayTransitionOverlay({ finishedDay, onDismissed }: DayTransitionOverlayProps) {
  const t = useTranslations('dayTransition');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hold for 1.5s, then trigger fade-out.
    const fadeTimer = setTimeout(() => setVisible(false), 1500);
    // After fade-out completes (200ms), tell parent to unmount.
    const unmountTimer = setTimeout(() => onDismissed(), 1700);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [onDismissed]);

  const key = finishedDay === 1 ? 'day1Done' : 'day2Done';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[55] flex items-center justify-center
        bg-gradient-to-b from-ipc-50/95 via-ipc-100/90 to-ipc-200/85
        animate-overlay-fade-in transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
    >
      <div className="text-center px-8">
        <p className="text-3xl md:text-4xl font-bold text-ipc-950 mb-2 text-balance">
          {t(`${key}.title`)}
        </p>
        <p className="text-xl text-ipc-700 text-balance">
          {t(`${key}.subtitle`)}
        </p>
      </div>
    </div>
  );
}
