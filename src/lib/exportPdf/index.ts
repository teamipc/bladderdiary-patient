/**
 * Clinical PDF export — generates a multi-page bladder diary report.
 *
 * Pages:
 *   1       Combined 3-day diary (landscape, side-by-side)
 *   2       Results overview with clinical metrics
 *   3-5     Daily bladder diary (24-hour hourly grid per day)
 *   6       Clinical analysis graphs
 *   7       Machine-readable structured data page
 *
 * Branding: IPC gold logo top-right, footer with tagline + disclaimer.
 */

import { jsPDF } from 'jspdf';
import { computeMetrics } from '../calculations';
import type { DiaryState } from '../types';
import { addFooter } from './shared';
import { pageCombinedDiary } from './combinedDiary';
import { pageResultsOverview } from './resultsOverview';
import { pageDailyDiary } from './dailyDiary';
import { pageGraphs } from './graphs';
import { pageMachineData } from './machineData';
import { ensureLocaleFontRegistered } from './fonts';

/** Generate the PDF blob without triggering a download. */
export async function generatePdfBlob(state: DiaryState, locale: string = 'en'): Promise<{ blob: Blob; filename: string }> {
  // Start landscape — the combined 3-day diary is the first page
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const metrics = computeMetrics(state);

  // Register the locale-specific Unicode font BEFORE any page builder runs.
  // Each page module calls doc.setFont(currentFontFamily(locale), ...) somewhere
  // in its body; the addFont/VFS calls inside registerZhFont / registerArFont
  // MUST run first, otherwise setFont('NotoSansSC', ...) produces an
  // undefined-font reference and jsPDF silently falls back to courier.
  // No-op for en/fr/es/pt — helvetica is built into jsPDF.
  await ensureLocaleFontRegistered(doc, locale);

  // Page 1: Combined 3-day diary (landscape) — uses the initial page
  pageCombinedDiary(doc, state, locale, true);

  // Page 2: Results overview
  pageResultsOverview(doc, state, metrics, locale);

  // Pages 3-5: Daily diary grids
  for (const dayNum of [1, 2, 3] as const) {
    pageDailyDiary(doc, state, dayNum, metrics.dayMetrics[dayNum - 1], locale);
  }

  // Page 6: Graphs
  pageGraphs(doc, state, metrics, locale);

  // Page 7: Machine-readable data. Schema columns and field names stay English (machine-parsing surface);
  // human-readable section titles (structuredDataTitle, eventsTitle, structuredDataSubtitle) are localized.
  pageMachineData(doc, state, metrics, locale);

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount, locale);
  }

  return {
    blob: doc.output('blob'),
    filename: `my-flow-check-${state.startDate}.pdf`,
  };
}

/** Generate and download the PDF (desktop fallback). */
export async function generatePdf(state: DiaryState, locale: string = 'en'): Promise<void> {
  const { blob, filename } = await generatePdfBlob(state, locale);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup after a short delay
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}
