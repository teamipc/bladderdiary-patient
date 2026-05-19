'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

/**
 * PrivacyGraphic — Phase 14 EM-02 (animated privacy reassurance).
 *
 * Renders a small inline cloud SVG with a diagonal strike-through line that
 * draws on first paint (cloud fades in over 200ms, then the strike-through
 * line draws across in 300ms via `stroke-dasharray` + `stroke-dashoffset`).
 *
 * Below the graphic, a native `<details>/<summary>` disclosure exposes the
 * existing `landing.privacyBody` text — reusing the canonical 6-locale
 * register-checked key rather than introducing a duplicate.
 *
 * Both animations honor the global `prefers-reduced-motion: reduce` rule at
 * `src/app/globals.css:94-103`, which collapses all `animation-duration` /
 * `animation-delay` to ~0ms — reduced-motion users see the final state
 * (cloud at opacity 1, strike line fully drawn) on first paint.
 *
 * The disclosure mirrors the canonical pattern from
 * `src/app/[locale]/help/page.tsx:69-87` (native details/summary, chevron
 * rotation, RTL-safe via `rtl:scale-x-[-1]`).
 */
export default function PrivacyGraphic() {
  const t = useTranslations('welcome');
  const tLanding = useTranslations('landing');

  return (
    <div className="w-full mt-6">
      <div className="flex flex-col items-center mb-3">
        <svg
          viewBox="0 0 80 80"
          width="80"
          height="80"
          fill="none"
          role="img"
          aria-label={t('privacyGraphicLabel')}
          className="text-ipc-500"
        >
          {/* Cloud silhouette — hand-traced as a single closed path so the
              whole shape can be grouped and faded as one unit. Stroke uses
              currentColor so the parent's text-* class drives the tint. */}
          <g className="animate-fade-cloud">
            <path
              d="M22 50 C16 50 12 46 12 40 C12 34 17 30 23 30 C24 23 30 18 38 18 C46 18 52 23 53 30 C60 30 66 35 66 42 C66 47 62 50 56 50 Z"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
          {/* Strike-through diagonal — drawn 200ms after the cloud appears
              via the .animate-draw-strike class (300ms ease-out 200ms both).
              stroke-dasharray + stroke-dashoffset is the universally-supported
              line-draw technique; the inline style sets the rest length (80)
              and starting offset (80, hidden) which the keyframe animates
              down to 0 (fully drawn). */}
          <line
            x1="14"
            y1="62"
            x2="66"
            y2="20"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="animate-draw-strike"
            style={{ strokeDasharray: 80, strokeDashoffset: 80 }}
          />
        </svg>
        <p className="text-sm font-medium text-ipc-600 text-center text-balance max-w-xs">
          {t('privacyGraphicLabel')}
        </p>
      </div>

      <details className="group rounded-2xl bg-white border border-ipc-100 overflow-hidden mt-4">
        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer
          list-none text-sm font-semibold text-ipc-800
          [&::-webkit-details-marker]:hidden">
          {t('privacyDisclosureLabel')}
          <ChevronLeft
            size={18}
            className="text-ipc-400 transition-transform -rotate-90
              group-open:rotate-[-270deg] shrink-0 ms-2 rtl:scale-x-[-1]"
          />
        </summary>
        <div className="px-5 pb-4 text-sm text-ipc-600 leading-relaxed">
          {tLanding('privacyBody')}
        </div>
      </details>
    </div>
  );
}
