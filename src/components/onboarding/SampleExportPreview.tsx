'use client';

import { useTranslations } from 'next-intl';

/**
 * Phase 14 EM-03. Sample-export preview.
 *
 * A static, boomer-safe inline SVG silhouette of the first page of the
 * clinician-ready PDF (the daily-summary view). Communicates to the patient
 * what they will walk away with at the end of the 3 days, before they invest
 * the effort.
 *
 * Static by design. No motion. No hover state. Per CONTEXT
 * ("Static, no motion. Boomer-safe.") and CLAUDE.md ux_philosophy memory.
 *
 * All inner SVG shapes use HARDCODED hex fills, not Tailwind utility
 * classes. Lightning CSS can silently drop utility classes attached
 * to inner SVG elements (memory: feedback_lightning_css_grouped_selectors).
 * The OUTER svg element keeps its Tailwind class because the outer
 * selector is single, not grouped.
 *
 * Locale-aware: inline text elements bind to next-intl
 * useTranslations('sampleExport'), so the document silhouette reads
 * correctly in EN / FR / ES / PT / ZH / AR (RTL-safe via text-anchor).
 */
export default function SampleExportPreview() {
  const t = useTranslations('sampleExport');

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 280 360"
        width="280"
        height="360"
        fill="none"
        role="img"
        aria-label={t('label')}
        className="text-ipc-300 mb-3 max-w-full h-auto"
      >
        {/* Page outline. Rounded rectangle as the document silhouette. */}
        <rect
          x="4"
          y="4"
          width="272"
          height="352"
          rx="10"
          ry="10"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="white"
        />

        {/* Header band. Warm cream stripe with title text inside. */}
        <rect
          x="4"
          y="4"
          width="272"
          height="44"
          rx="10"
          ry="10"
          fill="#fef3e2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <text
          x="140"
          y="22"
          textAnchor="middle"
          fill="#7c5e30"
          fontSize="11"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {t('docTitle')}
        </text>
        <text
          x="140"
          y="38"
          textAnchor="middle"
          fill="#a0815a"
          fontSize="8"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {t('docSection')}
        </text>

        {/* Stat row 1. Left label, right value pill. */}
        <text
          x="20"
          y="78"
          textAnchor="start"
          fill="currentColor"
          fontSize="9"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {t('docMetricLabel')}
        </text>
        <rect
          x="180"
          y="68"
          width="80"
          height="14"
          rx="3"
          ry="3"
          fill="#e7eef7"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        <text
          x="220"
          y="78"
          textAnchor="middle"
          fill="currentColor"
          fontSize="8"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {t('docMetricUnit')}
        </text>

        {/* Stat row 2. Placeholder label + value pill. */}
        <rect x="20" y="94" width="120" height="8" rx="2" ry="2" fill="currentColor" opacity="0.4" />
        <rect
          x="180"
          y="92"
          width="80"
          height="14"
          rx="3"
          ry="3"
          fill="#e7eef7"
          stroke="currentColor"
          strokeWidth="0.5"
        />

        {/* Mini bar chart. 5 bars of varying height in the lower-mid region. */}
        <g stroke="currentColor" strokeWidth="0.5" fill="#dceaf9">
          <rect x="30" y="200" width="32" height="50" rx="2" ry="2" />
          <rect x="72" y="180" width="32" height="70" rx="2" ry="2" />
          <rect x="114" y="160" width="32" height="90" rx="2" ry="2" />
          <rect x="156" y="190" width="32" height="60" rx="2" ry="2" />
          <rect x="198" y="170" width="32" height="80" rx="2" ry="2" />
        </g>
        {/* Chart baseline. */}
        <line x1="20" y1="252" x2="260" y2="252" stroke="currentColor" strokeWidth="1" />

        {/* Footer placeholder lines. Descending opacity reads as "more content below". */}
        <rect x="20" y="280" width="240" height="6" rx="1.5" ry="1.5" fill="currentColor" opacity="0.25" />
        <rect x="20" y="294" width="200" height="6" rx="1.5" ry="1.5" fill="currentColor" opacity="0.2" />
        <rect x="20" y="308" width="220" height="6" rx="1.5" ry="1.5" fill="currentColor" opacity="0.18" />
        <rect x="20" y="322" width="180" height="6" rx="1.5" ry="1.5" fill="currentColor" opacity="0.15" />
      </svg>

      <p className="text-sm text-ipc-600 text-center text-balance max-w-xs leading-relaxed">
        {t('caption')}
      </p>
    </div>
  );
}
