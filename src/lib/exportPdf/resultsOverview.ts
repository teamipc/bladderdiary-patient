import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatTime } from '../utils';
import { PREMIUM_FEATURES_ENABLED } from '../constants';
import type { DiaryState } from '../types';
import type { DiaryMetrics } from '../calculations';
import { C, MARGIN } from './theme';
import { getPdfStrings, getDateLocale, pdfFormatDate } from './strings';
import { addLogo, sectionTitle, dv } from './shared';
import { currentFontFamily } from './fonts';

export function pageResultsOverview(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics, locale: string) {
  const s = getPdfStrings(locale);
  const fontFamily = currentFontFamily(locale);
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  // Title block
  doc.setFontSize(22);
  doc.setTextColor(...C.dark);
  doc.setFont(fontFamily, 'bold');
  doc.text(s.appName, MARGIN, 22);
  doc.setFont(fontFamily, 'normal');

  doc.setFontSize(11);
  doc.setTextColor(...C.muted);
  doc.text(s.reportSubtitle, MARGIN, 28);

  // Patient info
  let y = 36;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  const startLabel = pdfFormatDate(state.startDate + 'T12:00:00', 'PPPP', locale);
  const infoLines = [
    `${s.startDate}: ${startLabel}`,
    state.age ? `${s.age}: ${state.age}` : '',
    state.clinicCode ? `${s.clinicCode}: ${state.clinicCode}` : '',
    `${s.generated}: ${format(new Date(), 'PPp', { locale: getDateLocale(locale) })}`,
  ].filter(Boolean);

  for (const line of infoLines) {
    doc.text(line, MARGIN, y);
    y += 4.5;
  }
  y += 4;

  const u = state.volumeUnit;
  const fmtV = (v: number | null) => (v !== null && v !== undefined ? `${v.toLocaleString()}` : '—');
  const fmtVol = (ml: number | null) => (ml !== null && ml !== undefined ? `${dv(ml, state).toLocaleString()}` : '—');

  // ── Clinical Metrics table (premium only) ──
  if (PREMIUM_FEATURES_ENABLED) {
    y = sectionTitle(doc, s.clinicalMetrics, y, locale);

    const p1 = metrics.periods[0];
    const p2 = metrics.periods[1];
    const fmtPct = (v: number | null) => (v !== null && v !== undefined ? `${v.toFixed(1)}%` : '—');

    autoTable(doc, {
      startY: y,
      head: [[s.metric, s.night1Day2, s.night2Day3, s.overall]],
      body: [
        [`24HV (${u})`, fmtVol(p1?.twentyFourHV), fmtVol(p2?.twentyFourHV), '—'],
        ['NPi (%)', fmtPct(p1?.nPi), fmtPct(p2?.nPi), '—'],
        [`AVV (${u})`, fmtVol(p1?.avv), fmtVol(p2?.avv), '—'],
        [`${s.nocturnalVol} (${u})`, fmtVol(metrics.nights[0]?.nocturnalVolumeMl), fmtVol(metrics.nights[1]?.nocturnalVolumeMl), '—'],
        [`MVV (${u})`, '—', '—', fmtVol(metrics.mvv)],
        [`${s.totalIntake} (${u})`, '—', '—', fmtVol(metrics.totalFluidIntakeMl)],
        [`${s.totalOutput} (${u})`, '—', '—', fmtVol(metrics.totalVoidVolumeMl)],
        [s.voidCount, '—', '—', fmtV(metrics.totalVoidCount)],
        [s.voidLeakCount, '—', '—', fmtV(metrics.totalLeaks)],
        [s.standaloneLeaks, '—', '—', fmtV(metrics.totalStandaloneLeaks)],
        [s.continence, '—', '—', metrics.isContinent ? s.continent : s.incontinent],
      ],
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: C.dark },
      headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.goldLight },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Per-Day Summary ──
  y = sectionTitle(doc, s.dailySummary, y, locale);

  autoTable(doc, {
    startY: y,
    head: [['', s.day(1), s.day(2), s.day(3)]],
    body: [
      [`${s.fluidIntake} (${u})`, ...metrics.dayMetrics.map((d) => fmtVol(d.totalFluidIntakeMl))],
      [`${s.voidVolume} (${u})`,  ...metrics.dayMetrics.map((d) => fmtVol(d.totalVoidVolumeMl))],
      [s.voidCount,        ...metrics.dayMetrics.map((d) => fmtV(d.voidCount))],
      [s.drinkCount,       ...metrics.dayMetrics.map((d) => fmtV(d.drinkCount))],
      [s.voidLeaks,        ...metrics.dayMetrics.map((d) => fmtV(d.leakCount))],
      [s.standaloneLeaks,  ...metrics.dayMetrics.map((d) => fmtV(d.standaloneLeakCount))],
      [s.wakeTime,         ...metrics.dayMetrics.map((d) => d.wakeTimeIso ? formatTime(d.wakeTimeIso, locale, state.timeZone) : '—')],
      [s.bedtime,          ...metrics.dayMetrics.map((d) => d.bedtimeIso ? formatTime(d.bedtimeIso, locale, state.timeZone) : '—')],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.dark },
    headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.goldLight },
  });
}
