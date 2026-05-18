import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDayNumber } from '../utils';
import { PREMIUM_FEATURES_ENABLED } from '../constants';
import type { DiaryState } from '../types';
import type { DiaryMetrics } from '../calculations';
import { C, MARGIN } from './theme';
import { addLogo, dv } from './shared';
import { getPdfStrings } from './strings';

export function pageMachineData(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics, locale: string) {
  doc.addPage('a4', 'portrait');
  addLogo(doc);
  const s = getPdfStrings(locale);

  doc.setFontSize(13);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.structuredDataTitle, MARGIN, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text(s.structuredDataSubtitle, MARGIN, 25);

  // ── Metadata table ──
  let y = 30;
  const metadataRows: string[][] = [
    ['patient_age', state.age?.toString() ?? ''],
    ['start_date', state.startDate],
    ['clinic_code', state.clinicCode ?? ''],
    ['timezone', state.timeZone ?? ''],
    ['volume_unit', state.volumeUnit],
  ];

  if (PREMIUM_FEATURES_ENABLED) {
    metadataRows.push(
      ['mvv_ml', metrics.mvv.toString()],
      ['total_intake_ml', metrics.totalFluidIntakeMl.toString()],
      ['total_output_ml', metrics.totalVoidVolumeMl.toString()],
      ['total_voids', metrics.totalVoidCount.toString()],
      ['total_leaks', metrics.totalLeaks.toString()],
      ['total_standalone_leaks', metrics.totalStandaloneLeaks.toString()],
      ['continent', metrics.isContinent ? 'true' : 'false'],
      ['24hv_period1_ml', metrics.periods[0]?.twentyFourHV.toString() ?? ''],
      ['npi_period1_pct', metrics.periods[0]?.nPi?.toFixed(1) ?? ''],
      ['avv_period1_ml', metrics.periods[0]?.avv?.toString() ?? ''],
      ['nocturnal_vol_night1_ml', metrics.nights[0]?.nocturnalVolumeMl.toString() ?? ''],
      ['24hv_period2_ml', metrics.periods[1]?.twentyFourHV.toString() ?? ''],
      ['npi_period2_pct', metrics.periods[1]?.nPi?.toFixed(1) ?? ''],
      ['avv_period2_ml', metrics.periods[1]?.avv?.toString() ?? ''],
      ['nocturnal_vol_night2_ml', metrics.nights[1]?.nocturnalVolumeMl.toString() ?? ''],
    );
  }

  // Schema columns intentionally English (machine-parsing surface). See index.ts:44.
  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: metadataRows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 7, cellPadding: 1.5, textColor: C.dark, font: 'courier' },
    headStyles: { fillColor: [80, 80, 80], textColor: C.white, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 50 } },
  });

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 6;

  // ── Events table ──
  doc.setFontSize(8);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.eventsTitle, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 3;

  // Merge all events into one sorted list
  // 9-column row. The trailing `woke` column is new (carries wokeBy for nocturnal
  // voids: 'urge' or 'awake'). Older clinician parsers ignore unknown columns.
  type EventRow = [string, string, string, string, string, string, string, string, string];
  const rows: EventRow[] = [];

  for (const w of (state.wakeTimes ?? [])) {
    rows.push(['wake', w.timestampIso, w.dayNumber.toString(), '', '', '', '', '', '']);
  }
  for (const v of state.voids) {
    const day = getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    const wokeShort = v.wokeBy === 'urge' ? 'urge' : v.wokeBy === 'awake_anyway' ? 'awake' : '';
    rows.push([
      'void',
      v.timestampIso,
      day.toString(),
      dv(v.volumeMl, state).toString(),
      v.doubleVoidMl ? dv(v.doubleVoidMl, state).toString() : '',
      v.sensation !== null ? v.sensation.toString() : '',
      v.isFirstMorningVoid ? 'Y' : '',
      v.leak ? 'Y' : '',
      wokeShort,
    ]);
  }
  for (const d of state.drinks) {
    const day = getDayNumber(d.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    rows.push([
      'drink',
      d.timestampIso,
      day.toString(),
      dv(d.volumeMl, state).toString(),
      '',
      '',
      '',
      d.drinkType,
      '',
    ]);
  }
  for (const l of (state.leaks ?? [])) {
    const day = getDayNumber(l.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    rows.push([
      'leak',
      l.timestampIso,
      day.toString(),
      '',
      '',
      '',
      l.urgencyBeforeLeak === true ? 'Y' : l.urgencyBeforeLeak === false ? 'N' : '',
      `${l.trigger}${l.amount ? ' ' + l.amount : ''}`,
      '',
    ]);
  }
  for (const b of state.bedtimes) {
    rows.push(['bedtime', b.timestampIso, b.dayNumber.toString(), '', '', '', '', '', '']);
  }

  // Sort by timestamp
  rows.sort((a, b) => a[1].localeCompare(b[1]));

  autoTable(doc, {
    startY: y,
    head: [['type', 'timestamp', 'day', 'vol', 'dbl', 'sens', 'fmv', 'extra', 'woke']],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 5.5, cellPadding: 1, textColor: C.dark, font: 'courier', overflow: 'ellipsize' },
    headStyles: { fillColor: [80, 80, 80], textColor: C.white, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 50 },
      2: { cellWidth: 7 },
      3: { cellWidth: 12 },
      4: { cellWidth: 10 },
      5: { cellWidth: 8 },
      6: { cellWidth: 8 },
      7: { cellWidth: 14 },
      8: { cellWidth: 11 },
    },
  });
}
