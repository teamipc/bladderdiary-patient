/**
 * Clinical PDF export — generates a multi-page bladder diary report.
 *
 * Pages:
 *   1       Results overview with clinical metrics
 *   2-4     Daily bladder diary (24-hour hourly grid per day)
 *   5       Combined 3-day diary (landscape, side-by-side)
 *   6       Clinical analysis graphs
 *   7       Machine-readable structured data page
 *
 * Branding: IPC gold logo top-right, footer with tagline + disclaimer.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { getDayNumber, getDayDate, formatTime, mlToDisplayVolume } from './utils';
import { getDrinkLabel, SENSATION_LABELS, PREMIUM_FEATURES_ENABLED, getLeakTriggerLabel } from './constants';
import { computeMetrics, type DiaryMetrics, type DayMetrics } from './calculations';
import { IPC_LOGO_BASE64, IPC_LOGO_ASPECT } from './ipcLogoBase64';
import type { DiaryState } from './types';

/* ================================================================== */
/*  Colour palette                                                     */
/* ================================================================== */

const C = {
  // IPC brand
  gold:       [196, 152, 74]  as [number, number, number],
  goldLight:  [253, 248, 239] as [number, number, number],
  dark:       [60,  33,  15]  as [number, number, number],
  muted:      [140, 120, 100] as [number, number, number],
  mutedLight: [200, 185, 170] as [number, number, number],

  // Functional
  inputHdr:   [0,   150, 199] as [number, number, number],  // teal
  inputCell:  [224, 242, 254] as [number, number, number],  // light blue
  outputHdr:  [196, 152, 74]  as [number, number, number],  // gold
  outputCell: [254, 243, 199] as [number, number, number],  // light amber
  wakeRow:    [237, 233, 254] as [number, number, number],  // light indigo
  bedRow:     [237, 233, 254] as [number, number, number],
  leakNote:   [180, 130, 90]  as [number, number, number],  // soft warm brown (not alarming)
  leakTerracotta: [184, 92, 74] as [number, number, number], // standalone leak events
  white:      [255, 255, 255] as [number, number, number],

  // Chart palette
  chartBlue:  [59,  130, 246] as [number, number, number],
  chartAmber: [245, 158, 11]  as [number, number, number],
  chartTeal:  [20,  184, 166] as [number, number, number],
  chartRose:  [244, 63,  94]  as [number, number, number],
  chartPurple:[139, 92,  246] as [number, number, number],
  chartGray:  [156, 163, 175] as [number, number, number],
};

/* ================================================================== */
/*  Layout constants                                                   */
/* ================================================================== */

const MARGIN = 14;
const PAGE_W = 210; // A4 portrait
const PAGE_H = 297;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_Y = PAGE_H - 18;

const LOGO_H = 14; // mm
const LOGO_W = LOGO_H * IPC_LOGO_ASPECT;

/* ================================================================== */
/*  Shared helpers                                                     */
/* ================================================================== */

function addLogo(doc: jsPDF) {
  doc.addImage(
    IPC_LOGO_BASE64,
    'PNG',
    PAGE_W - MARGIN - LOGO_W,
    8,
    LOGO_W,
    LOGO_H,
  );
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  // Detect page dimensions (handles both portrait and landscape pages)
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 18;
  doc.setDrawColor(...C.mutedLight);
  doc.line(MARGIN, y, pageW - MARGIN, y);

  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(
    'IPC \u2014 Integrated Pelvic Care believes that better data leads to better care.',
    MARGIN,
    y + 4,
  );
  doc.text(
    'This report is for informational purposes only and does not replace medical advice. Always consult your health professional.',
    MARGIN,
    y + 7.5,
  );
  doc.text('myflowcheck.com', MARGIN, y + 11);
  doc.text(`Page ${pageNum} / ${totalPages}`, pageW - MARGIN, y + 11, { align: 'right' });
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(13);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

/* ================================================================== */
/*  Page 1: Results Overview                                           */
/* ================================================================== */

function dv(ml: number, state: DiaryState): number {
  return mlToDisplayVolume(ml, state.volumeUnit);
}

function pageResultsOverview(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics) {
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  // Title block
  doc.setFontSize(22);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('My Flow Check', MARGIN, 22);
  doc.setFont('helvetica', 'normal');

  doc.setFontSize(11);
  doc.setTextColor(...C.muted);
  doc.text('3-Day Bladder Diary Report', MARGIN, 28);

  // Patient info
  let y = 36;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  const startLabel = format(parseISO(state.startDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy');
  const infoLines = [
    `Start date: ${startLabel}`,
    state.age ? `Age: ${state.age}` : '',
    state.clinicCode ? `Clinic code: ${state.clinicCode}` : '',
    `Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
  ].filter(Boolean);

  for (const line of infoLines) {
    doc.text(line, MARGIN, y);
    y += 4.5;
  }
  y += 4;

  const u = state.volumeUnit;
  const fmtV = (v: number | null) => (v !== null && v !== undefined ? `${v.toLocaleString()}` : '\u2014');
  const fmtVol = (ml: number | null) => (ml !== null && ml !== undefined ? `${dv(ml, state).toLocaleString()}` : '\u2014');

  // ── Clinical Metrics table (premium only) ──
  if (PREMIUM_FEATURES_ENABLED) {
    y = sectionTitle(doc, 'Clinical Metrics', y);

    const p1 = metrics.periods[0];
    const p2 = metrics.periods[1];
    const fmtPct = (v: number | null) => (v !== null && v !== undefined ? `${v.toFixed(1)}%` : '\u2014');

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Night 1 / Day 2', 'Night 2 / Day 3', 'Overall']],
      body: [
        [`24HV (${u})`, fmtVol(p1?.twentyFourHV), fmtVol(p2?.twentyFourHV), '\u2014'],
        ['NPi (%)', fmtPct(p1?.nPi), fmtPct(p2?.nPi), '\u2014'],
        [`AVV (${u})`, fmtVol(p1?.avv), fmtVol(p2?.avv), '\u2014'],
        [`Nocturnal Vol (${u})`, fmtVol(metrics.nights[0]?.nocturnalVolumeMl), fmtVol(metrics.nights[1]?.nocturnalVolumeMl), '\u2014'],
        [`MVV (${u})`, '\u2014', '\u2014', fmtVol(metrics.mvv)],
        [`Total Intake (${u})`, '\u2014', '\u2014', fmtVol(metrics.totalFluidIntakeMl)],
        [`Total Output (${u})`, '\u2014', '\u2014', fmtVol(metrics.totalVoidVolumeMl)],
        ['Void Count', '\u2014', '\u2014', fmtV(metrics.totalVoidCount)],
        ['Void Leak Count', '\u2014', '\u2014', fmtV(metrics.totalLeaks)],
        ['Standalone Leaks', '\u2014', '\u2014', fmtV(metrics.totalStandaloneLeaks)],
        ['Continence', '\u2014', '\u2014', metrics.isContinent ? 'Continent' : 'Incontinent'],
      ],
      margin: { left: MARGIN, right: MARGIN },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: C.dark },
      headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.goldLight },
    });

    // @ts-expect-error jspdf-autotable adds lastAutoTable
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Per-Day Summary ──
  y = sectionTitle(doc, 'Daily Summary', y);

  autoTable(doc, {
    startY: y,
    head: [['', 'Day 1', 'Day 2', 'Day 3']],
    body: [
      [`Fluid Intake (${u})`, ...metrics.dayMetrics.map((d) => fmtVol(d.totalFluidIntakeMl))],
      [`Void Volume (${u})`,  ...metrics.dayMetrics.map((d) => fmtVol(d.totalVoidVolumeMl))],
      ['Void Count',        ...metrics.dayMetrics.map((d) => fmtV(d.voidCount))],
      ['Drink Count',       ...metrics.dayMetrics.map((d) => fmtV(d.drinkCount))],
      ['Void Leaks',        ...metrics.dayMetrics.map((d) => fmtV(d.leakCount))],
      ['Standalone Leaks',  ...metrics.dayMetrics.map((d) => fmtV(d.standaloneLeakCount))],
      ['Wake Time',         ...metrics.dayMetrics.map((d) => d.wakeTimeIso ? formatTime(d.wakeTimeIso) : '\u2014')],
      ['Bedtime',           ...metrics.dayMetrics.map((d) => d.bedtimeIso ? formatTime(d.bedtimeIso) : '\u2014')],
    ],
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.dark },
    headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.goldLight },
  });
}

/* ================================================================== */
/*  Pages 2-4: Daily Bladder Diary (hourly grid)                       */
/* ================================================================== */

interface HourSlot {
  label: string;
  drinks: string;
  voids: string;
  urgency: string;
  leak: string;
  hasDrink: boolean;
  hasVoid: boolean;
  isWake: boolean;
  isBed: boolean;
}

function buildHourSlots(state: DiaryState, dayNum: 1 | 2 | 3): { slots: HourSlot[]; startHour: number } {
  const dayVoids = state.voids
    .filter((v) => getDayNumber(v.timestampIso, state.startDate, state.bedtimes) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayDrinks = state.drinks
    .filter((d) => getDayNumber(d.timestampIso, state.startDate, state.bedtimes) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayLeaks = (state.leaks ?? [])
    .filter((l) => getDayNumber(l.timestampIso, state.startDate, state.bedtimes) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);

  const bedHour = bedtime ? parseISO(bedtime.timestampIso).getHours() : -1;
  const wakeHour = wakeTime ? parseISO(wakeTime.timestampIso).getHours() : -1;

  // Start the 24-hour grid from the actual wake hour (default 6 AM)
  const startHour = wakeHour >= 0 ? wakeHour : 6;

  const slots: HourSlot[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = (startHour + i) % 24;
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

    // Drinks in this hour
    const hourDrinks = dayDrinks.filter((d) => parseISO(d.timestampIso).getHours() === hour);
    const u = state.volumeUnit;
    const multiDrink = hourDrinks.length > 1;
    const drinksText = hourDrinks.map((d) => {
      const prefix = multiDrink ? `${formatTime(d.timestampIso)} ` : '';
      return `${prefix}${dv(d.volumeMl, state)} ${u} ${getDrinkLabel(d.drinkType)}`;
    }).join('\n');

    // Voids in this hour
    const hourVoids = dayVoids.filter((v) => parseISO(v.timestampIso).getHours() === hour);
    const multiVoid = hourVoids.length > 1;
    const voidsText = hourVoids
      .map((v) => {
        const prefix = multiVoid ? `${formatTime(v.timestampIso)} ` : '';
        let txt = `${prefix}${dv(v.volumeMl, state)} ${u}`;
        if (v.doubleVoidMl) txt += `\n  DV: +${dv(v.doubleVoidMl, state)} ${u}`;
        if (v.isFirstMorningVoid) txt += ' *FMV';
        return txt;
      })
      .join('\n');

    const urgText = hourVoids.map((v) => v.sensation !== null ? `${v.sensation}` : '-').join('\n');

    // Standalone leaks in this hour
    const hourLeaks = dayLeaks.filter((l) => parseISO(l.timestampIso).getHours() === hour);
    const leakParts: string[] = [];
    if (hourVoids.some((v) => v.leak)) leakParts.push('Yes');
    for (const l of hourLeaks) {
      leakParts.push(getLeakTriggerLabel(l.trigger));
    }
    const leakText = leakParts.join('\n');

    slots.push({
      label: `${hourStr}\n${ampm}`,
      drinks: drinksText,
      voids: voidsText,
      urgency: urgText,
      leak: leakText,
      hasDrink: hourDrinks.length > 0,
      hasVoid: hourVoids.length > 0,
      isWake: hour === wakeHour,
      isBed: hour === bedHour,
    });
  }

  return { slots, startHour };
}

interface HalfHourSlot {
  label: string;
  drinks: string;
  voids: string;
  urgency: string;
  leak: string;
  hasDrink: boolean;
  hasVoid: boolean;
  hasLeak: boolean;
  isWake: boolean;
  isBed: boolean;
}

function buildHalfHourSlots(state: DiaryState, dayNum: 1 | 2 | 3): { slots: HalfHourSlot[]; startHour: number } {
  const dayVoids = state.voids
    .filter((v) => getDayNumber(v.timestampIso, state.startDate, state.bedtimes) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayDrinks = state.drinks
    .filter((d) => getDayNumber(d.timestampIso, state.startDate, state.bedtimes) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const dayLeaks = (state.leaks ?? [])
    .filter((l) => getDayNumber(l.timestampIso, state.startDate, state.bedtimes) === dayNum)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);

  const bedHour = bedtime ? parseISO(bedtime.timestampIso).getHours() : -1;
  const wakeHour = wakeTime ? parseISO(wakeTime.timestampIso).getHours() : -1;

  const startHour = wakeHour >= 0 ? wakeHour : 6;
  const u = state.volumeUnit;

  const slots: HalfHourSlot[] = [];
  for (let i = 0; i < 48; i++) {
    const hour = (startHour + Math.floor(i / 2)) % 24;
    const isSecondHalf = i % 2 === 1;
    const minStart = isSecondHalf ? 30 : 0;
    const minEnd = isSecondHalf ? 59 : 29;

    // Label: AM/PM only on :00 rows
    const hourStr = `${hour.toString().padStart(2, '0')}:${isSecondHalf ? '30' : '00'}`;
    let label: string;
    if (!isSecondHalf) {
      const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      label = `${hourStr}\n${ampm}`;
    } else {
      label = hourStr;
    }

    // Filter events in this 30-min window
    const inSlot = (iso: string) => {
      const d = parseISO(iso);
      return d.getHours() === hour && d.getMinutes() >= minStart && d.getMinutes() <= minEnd;
    };

    const slotDrinks = dayDrinks.filter((d) => inSlot(d.timestampIso));
    const multiDrink = slotDrinks.length > 1;
    const drinksText = slotDrinks.map((d) => {
      const prefix = multiDrink ? `${formatTime(d.timestampIso)} ` : '';
      return `${prefix}${dv(d.volumeMl, state)} ${u} ${getDrinkLabel(d.drinkType)}`;
    }).join('\n');

    const slotVoids = dayVoids.filter((v) => inSlot(v.timestampIso));
    const multiVoid = slotVoids.length > 1;
    const voidsText = slotVoids
      .map((v) => {
        const prefix = multiVoid ? `${formatTime(v.timestampIso)} ` : '';
        let txt = `${prefix}${dv(v.volumeMl, state)} ${u}`;
        if (v.doubleVoidMl) txt += `\n  DV: +${dv(v.doubleVoidMl, state)} ${u}`;
        if (v.isFirstMorningVoid) txt += ' *FMV';
        return txt;
      })
      .join('\n');

    const urgText = slotVoids.map((v) => v.sensation !== null ? `${v.sensation}` : '-').join('\n');

    const slotLeaks = dayLeaks.filter((l) => inSlot(l.timestampIso));
    const leakParts: string[] = [];
    if (slotVoids.some((v) => v.leak)) leakParts.push('Yes');
    for (const l of slotLeaks) {
      leakParts.push(getLeakTriggerLabel(l.trigger));
    }
    const leakText = leakParts.join('\n');

    slots.push({
      label,
      drinks: drinksText,
      voids: voidsText,
      urgency: urgText,
      leak: leakText,
      hasDrink: slotDrinks.length > 0,
      hasVoid: slotVoids.length > 0,
      hasLeak: leakText !== '',
      isWake: hour === wakeHour && !isSecondHalf,
      isBed: hour === bedHour && !isSecondHalf,
    });
  }

  return { slots, startHour };
}

function pageDailyDiary(doc: jsPDF, state: DiaryState, dayNum: 1 | 2 | 3, dm: DayMetrics) {
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  const dayDateStr = getDayDate(state.startDate, dayNum);
  const dayLabel = format(parseISO(dayDateStr + 'T12:00:00'), 'EEEE, MMM d, yyyy');

  // Title
  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(`Day ${dayNum}`, MARGIN, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text(dayLabel, MARGIN, 26);

  // Wake / Bed summary
  let subY = 32;
  doc.setFontSize(8);
  doc.setTextColor(100, 80, 200);
  const wakeBedParts: string[] = [];
  if (dm.wakeTimeIso) wakeBedParts.push(`Wake: ${formatTime(dm.wakeTimeIso)}`);
  if (dm.bedtimeIso) wakeBedParts.push(`Bed: ${formatTime(dm.bedtimeIso)}`);
  if (wakeBedParts.length > 0) {
    doc.text(wakeBedParts.join('    |    '), MARGIN, subY);
    subY += 4;
  }
  subY += 1;

  // Build 30-min grid — 48 rows starting from the actual wake hour
  const { slots, startHour } = buildHalfHourSlots(state, dayNum);

  // Determine sleep hours for shading
  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);
  const bedHour = bedtime ? parseISO(bedtime.timestampIso).getHours() : -1;
  const wakeHour = wakeTime ? parseISO(wakeTime.timestampIso).getHours() : -1;

  const body = slots.map((s) => [s.label, s.drinks || '\u2014', s.voids || '\u2014', s.urgency || '\u2014', s.leak || '']);

  autoTable(doc, {
    startY: subY,
    head: [['Time', `Fluid In (${state.volumeUnit})`, `Voided (${state.volumeUnit})`, 'Sens', 'Leak']],
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 5.5,
      cellPadding: 0.8,
      textColor: C.dark,
      minCellHeight: 4.2,
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
      overflow: 'ellipsize',
    },
    headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold', fontSize: 6 },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', halign: 'center', fontSize: 5 },
      1: { cellWidth: 68 },
      2: { cellWidth: 46 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const slot = slots[data.row.index];
      if (!slot) return;
      const hour = (startHour + Math.floor(data.row.index / 2)) % 24;

      // Sleep hours: shade with light indigo
      const isSleepHour = (() => {
        if (bedHour < 0) return false;
        const wk = wakeHour >= 0 ? wakeHour : startHour;
        if (bedHour > wk) {
          return hour >= bedHour || hour < wk;
        }
        return hour >= bedHour && hour < wk;
      })();

      if (isSleepHour && !slot.hasDrink && !slot.hasVoid) {
        data.cell.styles.fillColor = [245, 243, 255];
        if (data.column.index === 0) {
          data.cell.styles.textColor = [130, 120, 190];
        }
      }

      // Color-code cells with actual data
      if (data.column.index === 1 && slot.hasDrink) {
        data.cell.styles.fillColor = C.inputCell;
        data.cell.styles.textColor = [0, 100, 160];
      }
      if (data.column.index === 2 && slot.hasVoid) {
        data.cell.styles.fillColor = C.outputCell;
        data.cell.styles.textColor = [140, 100, 20];
      }
      if (data.column.index === 4 && slot.hasLeak) {
        data.cell.styles.fillColor = [255, 240, 235];
        data.cell.styles.textColor = C.leakTerracotta;
      }

      // Empty cells: lighter text color for the dash
      if (!slot.hasDrink && data.column.index === 1) {
        data.cell.styles.textColor = [210, 210, 210];
      }
      if (!slot.hasVoid && data.column.index === 2) {
        data.cell.styles.textColor = [210, 210, 210];
      }
      if (!slot.hasVoid && data.column.index === 3) {
        data.cell.styles.textColor = [210, 210, 210];
      }

      // Wake / Bed hour highlight — full row
      if (slot.isWake || slot.isBed) {
        data.cell.styles.fillColor = C.wakeRow;
        if (data.column.index === 0) {
          data.cell.styles.textColor = [80, 60, 180];
        }
      }
    },
  });

  // @ts-expect-error jspdf-autotable adds lastAutoTable
  const tableEndY: number = doc.lastAutoTable.finalY;

  // Day totals summary box
  const totY = Math.min(tableEndY + 3, FOOTER_Y - 12);
  doc.setFillColor(250, 248, 245);
  doc.roundedRect(MARGIN, totY, CONTENT_W, 8, 1.5, 1.5, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.dark);
  const leakSummary = dm.standaloneLeakCount > 0
    ? `Leaks: ${dm.leakCount} void + ${dm.standaloneLeakCount} standalone`
    : `Leaks: ${dm.leakCount}`;
  const totText = `Intake: ${dv(dm.totalFluidIntakeMl, state).toLocaleString()} ${state.volumeUnit}    Output: ${dv(dm.totalVoidVolumeMl, state).toLocaleString()} ${state.volumeUnit} (${dm.voidCount} voids)    ${leakSummary}`;
  doc.text(totText, PAGE_W / 2, totY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
}

/* ================================================================== */
/*  Combined 3-Day Bladder Diary (landscape, side-by-side)             */
/* ================================================================== */

function pageCombinedDiary(doc: jsPDF, state: DiaryState, useCurrentPage = false) {
  // Add landscape page (unless we're using the initial page)
  if (!useCurrentPage) doc.addPage('a4', 'landscape');

  const LW = 297; // A4 landscape width
  const LH = 210; // A4 landscape height
  const M = 10;   // tighter margins for landscape

  // Logo — smaller for landscape
  const logoH = 10;
  const logoW = logoH * IPC_LOGO_ASPECT;
  doc.addImage(IPC_LOGO_BASE64, 'PNG', LW - M - logoW, 6, logoW, logoH);

  // Title
  doc.setFontSize(14);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('3-Day Bladder Diary', M, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const startLabel = format(parseISO(state.startDate + 'T12:00:00'), 'MMM d, yyyy');
  doc.text(`Started: ${startLabel}  |  Name: _________________`, M, 18);

  // Build per-hour data for all 3 days
  const allSlots = [1, 2, 3].map((d) => buildHourSlots(state, d as 1 | 2 | 3));
  const u = state.volumeUnit;

  // Use 24 rows from 6 AM (standard diary convention)
  const baseHour = allSlots[0].startHour;
  const rows: string[][] = [];

  for (let i = 0; i < 24; i++) {
    const hour = (baseHour + i) % 24;
    const ampm = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    const row: string[] = [timeLabel];

    for (let d = 0; d < 3; d++) {
      const slot = allSlots[d].slots[i];
      // Drinks: compact "amount type"
      const drinks = slot ? slot.drinks : '';
      // Voids: volume
      const voids = slot ? slot.voids : '';
      // Sensation
      const sens = slot ? slot.urgency : '';
      // Other: leak + notes (includes standalone leaks from buildHourSlots)
      const other: string[] = [];
      if (slot?.leak) other.push(slot.leak);
      row.push(drinks || '', voids || '', sens || '', other.join(', '));
    }

    rows.push(row);
  }

  // Column headers: TIME | Day 1 (4 cols) | Day 2 (4 cols) | Day 3 (4 cols) = 13 cols
  const dayHeaders = [1, 2, 3].map((d) => {
    const dateStr = getDayDate(state.startDate, d as 1 | 2 | 3);
    return format(parseISO(dateStr + 'T12:00:00'), 'EEE, MMM d');
  });

  // We use autoTable with custom column spans simulated via styling
  const contentW = LW - 2 * M;
  const timeW = 14;
  const dayW = (contentW - timeW) / 3;
  const drinkW = dayW * 0.32;
  const voidW = dayW * 0.30;
  const sensW = dayW * 0.16;
  const otherW = dayW * 0.22;

  autoTable(doc, {
    startY: 22,
    head: [
      // Row 1: Day headers spanning 4 cols each
      [
        { content: '', colSpan: 1 },
        { content: `Day 1 — ${dayHeaders[0]}`, colSpan: 4, styles: { halign: 'center' as const } },
        { content: `Day 2 — ${dayHeaders[1]}`, colSpan: 4, styles: { halign: 'center' as const } },
        { content: `Day 3 — ${dayHeaders[2]}`, colSpan: 4, styles: { halign: 'center' as const } },
      ],
      // Row 2: Sub-headers
      [
        'TIME',
        `Drinks`, 'Urine\n(${u})','Sens', 'Leak',
        `Drinks`, 'Urine\n(${u})','Sens', 'Leak',
        `Drinks`, 'Urine\n(${u})','Sens', 'Leak',
      ],
    ],
    body: rows,
    margin: { left: M, right: M },
    styles: {
      fontSize: 5,
      cellPadding: 0.8,
      textColor: C.dark,
      minCellHeight: 5.8,
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [210, 210, 210],
      overflow: 'ellipsize',
    },
    headStyles: {
      fillColor: C.gold,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 5.5,
      halign: 'center',
    },
    columnStyles: {
      0:  { cellWidth: timeW, fontStyle: 'bold', halign: 'center', fontSize: 5 },
      // Day 1
      1:  { cellWidth: drinkW },
      2:  { cellWidth: voidW },
      3:  { cellWidth: sensW, halign: 'center' },
      4:  { cellWidth: otherW },
      // Day 2
      5:  { cellWidth: drinkW },
      6:  { cellWidth: voidW },
      7:  { cellWidth: sensW, halign: 'center' },
      8:  { cellWidth: otherW },
      // Day 3
      9:  { cellWidth: drinkW },
      10: { cellWidth: voidW },
      11: { cellWidth: sensW, halign: 'center' },
      12: { cellWidth: otherW },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const col = data.column.index;

      // Color-code drink columns (1, 5, 9)
      if ((col === 1 || col === 5 || col === 9) && data.cell.raw && data.cell.raw !== '') {
        data.cell.styles.fillColor = C.inputCell;
        data.cell.styles.textColor = [0, 100, 160];
      }

      // Color-code void columns (2, 6, 10)
      if ((col === 2 || col === 6 || col === 10) && data.cell.raw && data.cell.raw !== '') {
        data.cell.styles.fillColor = C.outputCell;
        data.cell.styles.textColor = [140, 100, 20];
      }

      // Color-code leak columns (4, 8, 12)
      if ((col === 4 || col === 8 || col === 12) && data.cell.raw && data.cell.raw !== '') {
        data.cell.styles.fillColor = [255, 240, 235];
        data.cell.styles.textColor = C.leakTerracotta;
      }

      // Day separators: thicker left border on day start cols (1, 5, 9)
      if (col === 1 || col === 5 || col === 9) {
        data.cell.styles.lineWidth = { left: 0.4, right: 0.1, top: 0.1, bottom: 0.1 };
        data.cell.styles.lineColor = [180, 180, 180];
      }
    },
  });

  // Sensation code legend at bottom
  // @ts-expect-error jspdf-autotable adds lastAutoTable
  const tableEndY: number = doc.lastAutoTable.finalY;
  const legendY = Math.min(tableEndY + 3, LH - 18);
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);
  doc.text(
    'Bladder sensation codes:  0 = No urge (went just in case)  |  1 = Mild (normal desire)  |  2 = Moderate (urgency, but passed)  |  3 = Strong (barely made it)  |  4 = Leaked (couldn\'t make it)',
    M,
    legendY,
  );
}

/* ================================================================== */
/*  Page 5: Clinical Graphs                                            */
/* ================================================================== */

/** Pick a "nice" round step for axis ticks. Safe against 0/NaN/Infinity. */
function niceStep(range: number, approxTicks: number): number {
  if (!range || !isFinite(range) || range <= 0) return 1; // safety fallback
  const rough = range / approxTicks;
  if (!rough || !isFinite(rough) || rough <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  if (!magnitude || !isFinite(magnitude) || magnitude <= 0) return 1;
  const residual = rough / magnitude;
  const nice = residual <= 1.5 ? 1 : residual <= 3 ? 2 : residual <= 7 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Draw axes with smart tick labels, gridlines, and proper margins.
 * Returns nothing — draws directly on the doc.
 */
function drawAxis(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  yLabel: string, maxVal: number,
  options?: { gridlines?: boolean; xLabels?: string[]; xLabelEvery?: number },
) {
  const { gridlines = true, xLabels, xLabelEvery = 1 } = options ?? {};

  doc.setDrawColor(...C.mutedLight);
  doc.setLineWidth(0.2);

  // Y-axis
  doc.line(x, y, x, y + h);
  // X-axis
  doc.line(x, y + h, x + w, y + h);

  // Y ticks — use smart step with safety guard
  const safeMax = maxVal > 0 ? maxVal : 100;
  const step = Math.max(niceStep(safeMax, 4), 1); // Never zero
  doc.setFontSize(5.5);
  doc.setTextColor(...C.muted);

  for (let val = 0; val <= safeMax; val += step) {
    const ty = y + h - (val / safeMax) * h;
    doc.line(x - 1, ty, x, ty);
    doc.text(val.toLocaleString(), x - 2, ty + 1.2, { align: 'right' });

    // Gridlines
    if (gridlines && val > 0) {
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(x, ty, x + w, ty);
      doc.setDrawColor(...C.mutedLight);
      doc.setLineWidth(0.2);
    }
  }

  // Y label (rotated)
  doc.setFontSize(6);
  doc.text(yLabel, x - 12, y + h / 2, { angle: 90 });

  // X labels
  if (xLabels) {
    const spacing = w / xLabels.length;
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    for (let i = 0; i < xLabels.length; i++) {
      if (i % xLabelEvery !== 0) continue;
      const lx = x + i * spacing + spacing / 2;
      doc.text(xLabels[i], lx, y + h + 3.5, { align: 'center' });
    }
  }
}

function pageGraphs(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics) {
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Analysis', MARGIN, 20);
  doc.setFont('helvetica', 'normal');

  // ── Chart 1: Daily Fluid Balance (top) ──
  const chart1Y = 28;
  const chartH = 50;
  const chartW = CONTENT_W - 22;
  const chartX = MARGIN + 18;

  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Daily Fluid Balance', MARGIN, chart1Y);
  doc.setFont('helvetica', 'normal');

  const u = state.volumeUnit;
  const maxBalanceDisplay = Math.max(
    ...metrics.dayMetrics.map((d) => Math.max(dv(d.totalFluidIntakeMl, state), dv(d.totalVoidVolumeMl, state))),
    u === 'oz' ? 7 : 200,
  );
  // Round up to nice number with 20% headroom
  const headroom = maxBalanceDisplay * 1.15;
  const balanceStep = niceStep(headroom, 4);
  const roundedMax = Math.max(Math.ceil(headroom / balanceStep) * balanceStep, u === 'oz' ? 5 : 100);

  drawAxis(doc, chartX, chart1Y + 4, chartW, chartH, u, roundedMax, {
    xLabels: ['Day 1', 'Day 2', 'Day 3'],
  });

  const groupW = chartW / 3;
  const barW = groupW * 0.28;
  const barGap = 3;

  for (let i = 0; i < 3; i++) {
    const dm = metrics.dayMetrics[i];
    const gCenter = chartX + (i + 0.5) * groupW;

    // Intake bar (left)
    const intakeDisplay = dv(dm.totalFluidIntakeMl, state);
    const intakeH = Math.max((intakeDisplay / roundedMax) * chartH, 0.5);
    doc.setFillColor(...C.chartBlue);
    doc.rect(gCenter - barW - barGap / 2, chart1Y + 4 + chartH - intakeH, barW, intakeH, 'F');

    // Value label on top of intake bar
    if (intakeDisplay > 0) {
      doc.setFontSize(5);
      doc.setTextColor(...C.chartBlue);
      doc.text(
        intakeDisplay.toLocaleString(),
        gCenter - barGap / 2 - barW / 2,
        chart1Y + 4 + chartH - intakeH - 1.5,
        { align: 'center' },
      );
    }

    // Output bar (right)
    const outputDisplay = dv(dm.totalVoidVolumeMl, state);
    const outputH = Math.max((outputDisplay / roundedMax) * chartH, 0.5);
    doc.setFillColor(...C.chartAmber);
    doc.rect(gCenter + barGap / 2, chart1Y + 4 + chartH - outputH, barW, outputH, 'F');

    // Value label on top of output bar
    if (outputDisplay > 0) {
      doc.setFontSize(5);
      doc.setTextColor(...C.chartAmber);
      doc.text(
        outputDisplay.toLocaleString(),
        gCenter + barGap / 2 + barW / 2,
        chart1Y + 4 + chartH - outputH - 1.5,
        { align: 'center' },
      );
    }
  }

  // Legend
  const legY = chart1Y + 4 + chartH + 8;
  doc.setFillColor(...C.chartBlue);
  doc.rect(chartX, legY, 4, 2.5, 'F');
  doc.setFontSize(6);
  doc.setTextColor(...C.dark);
  doc.text('Fluid Intake', chartX + 5.5, legY + 2);
  doc.setFillColor(...C.chartAmber);
  doc.rect(chartX + 30, legY, 4, 2.5, 'F');
  doc.text('Voided Output', chartX + 35.5, legY + 2);

  // ── Chart 2: Frequency-Volume (time-based scatter plot) ──
  const chart2Y = legY + 12;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Frequency-Volume Chart', MARGIN, chart2Y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text('Each dot = one void, positioned by time of day. Red circle = leak. Dashed line = MVV.', MARGIN, chart2Y + 4);

  const chart2Top = chart2Y + 7;
  const chart2H = 50;

  const allVoids = [...state.voids].sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
  const maxVoid = Math.max(...allVoids.map((v) => dv(v.volumeMl, state)), u === 'oz' ? 4 : 100);
  const voidHeadroom = maxVoid * 1.15;
  const voidStep = niceStep(voidHeadroom, 4);
  const roundedMaxVoid = Math.max(Math.ceil(voidHeadroom / voidStep) * voidStep, u === 'oz' ? 4 : 100);

  // X-axis: 24h time from 6am to 5am (clinical convention)
  const timeLabels = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm', '12am', '2am', '4am'];
  // Show every label but use 12 slots for 24 hours (every 2 hours)
  drawAxis(doc, chartX, chart2Top, chartW, chart2H, u, roundedMaxVoid, {
    gridlines: true,
    xLabels: timeLabels,
    xLabelEvery: 1,
  });

  // Map void timestamps to x position (0-24 on a 6am-based clock)
  if (allVoids.length > 0) {
    const dayColors = [C.chartBlue, C.chartAmber, C.chartTeal] as const;

    allVoids.forEach((v) => {
      const dayNum = getDayNumber(v.timestampIso, state.startDate, state.bedtimes);
      const color = dayColors[(dayNum - 1) as 0 | 1 | 2];
      const dt = parseISO(v.timestampIso);
      const hourOfDay = dt.getHours() + dt.getMinutes() / 60;
      // Shift so 6am = 0, 5am = 23
      const shifted = hourOfDay >= 6 ? hourOfDay - 6 : hourOfDay + 18;
      const dotX = chartX + (shifted / 24) * chartW;
      const dotH = (dv(v.volumeMl, state) / roundedMaxVoid) * chart2H;
      const dotY = chart2Top + chart2H - dotH;

      doc.setFillColor(...color);
      doc.circle(dotX, dotY, 1.8, 'F');

      // Mark leaks with red ring
      if (v.leak) {
        doc.setDrawColor(...C.leakNote);
        doc.setLineWidth(0.6);
        doc.circle(dotX, dotY, 3, 'S');
        doc.setLineWidth(0.2);
      }
    });
  }

  // MVV dashed line
  if (metrics.mvv > 0) {
    const mvvDisplay = dv(metrics.mvv, state);
    const mvvY = chart2Top + chart2H - (mvvDisplay / roundedMaxVoid) * chart2H;
    doc.setDrawColor(...C.leakNote);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 1], 0);
    doc.line(chartX, mvvY, chartX + chartW, mvvY);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.leakNote);
    doc.text(`MVV ${mvvDisplay} ${u}`, chartX + chartW - 1, mvvY - 1.5, { align: 'right' });
  }

  // Legend
  const leg2Y = chart2Top + chart2H + 7;
  const dayColors2 = [C.chartBlue, C.chartAmber, C.chartTeal];
  for (let i = 0; i < 3; i++) {
    const lx = chartX + i * 25;
    doc.setFillColor(...dayColors2[i]);
    doc.circle(lx + 1.5, leg2Y + 1, 1.5, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.dark);
    doc.text(`Day ${i + 1}`, lx + 4, leg2Y + 2);
  }
  // Leak indicator in legend
  doc.setDrawColor(...C.leakNote);
  doc.setLineWidth(0.6);
  doc.circle(chartX + 78, leg2Y + 1, 2, 'S');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.dark);
  doc.text('= Void leak', chartX + 81, leg2Y + 2);
  doc.setLineWidth(0.2);

  // Standalone leak markers on chart (terracotta diamonds at bottom)
  const standaloneLeaks = (state.leaks ?? []);
  if (standaloneLeaks.length > 0) {
    standaloneLeaks.forEach((l) => {
      const dt = parseISO(l.timestampIso);
      const hourOfDay = dt.getHours() + dt.getMinutes() / 60;
      const shifted = hourOfDay >= 6 ? hourOfDay - 6 : hourOfDay + 18;
      const lx = chartX + (shifted / 24) * chartW;
      const ly = chart2Top + chart2H - 2; // Near bottom of chart

      // Diamond marker
      doc.setFillColor(...C.leakTerracotta);
      doc.setDrawColor(...C.leakTerracotta);
      doc.setLineWidth(0.3);
      const size = 1.8;
      // Draw diamond as polygon path
      doc.lines(
        [[size, -size], [size, size], [-size, size], [-size, -size]],
        lx - size, ly,
        [1, 1],
        'F',
      );
    });

    // Standalone leak legend entry
    doc.setFillColor(...C.leakTerracotta);
    doc.rect(chartX + 95, leg2Y - 0.5, 3, 3, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.dark);
    doc.text('= Standalone leak', chartX + 99.5, leg2Y + 2);
  }

  // ── Chart 3: Urgency Distribution (bottom) ──
  const chart3Y = leg2Y + 10;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Urgency Distribution', MARGIN, chart3Y);
  doc.setFont('helvetica', 'normal');

  const sensCount = [0, 0, 0, 0, 0];
  let notRecordedCount = 0;
  state.voids.forEach((v) => {
    if (v.sensation !== null) sensCount[v.sensation]++;
    else notRecordedCount++;
  });
  const totalSens = sensCount.reduce((s, c) => s + c, 0) + notRecordedCount || 1;
  const maxSens = Math.max(...sensCount, notRecordedCount, 1);

  const barsX = chartX + 28; // Leave space for labels
  const barsW = chartW - 32;
  const barH2 = 7;
  const sensColors = [C.chartTeal, C.chartTeal, C.chartBlue, C.chartAmber, C.chartRose] as const;

  for (let i = 0; i < 5; i++) {
    const by = chart3Y + 5 + i * (barH2 + 2.5);
    const sensLabel = SENSATION_LABELS[i as 0 | 1 | 2 | 3 | 4];

    // Label on the left
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(`${i} - ${sensLabel.short}`, barsX - 2, by + barH2 / 2 + 1, { align: 'right' });

    // Bar background
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(barsX, by, barsW, barH2, 1, 1, 'F');

    // Bar fill
    const fillW = Math.max((sensCount[i] / maxSens) * barsW, sensCount[i] > 0 ? 3 : 0);
    doc.setFillColor(...sensColors[i]);
    if (fillW > 0) {
      doc.roundedRect(barsX, by, fillW, barH2, 1, 1, 'F');
    }

    // Count and percentage
    const pct = Math.round((sensCount[i] / totalSens) * 100);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.dark);
    doc.text(`${sensCount[i]}  (${pct}%)`, barsX + fillW + 2, by + barH2 / 2 + 1);
  }

  // "Not recorded" row
  if (notRecordedCount > 0) {
    const by = chart3Y + 5 + 5 * (barH2 + 2.5);
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text('Not recorded', barsX - 2, by + barH2 / 2 + 1, { align: 'right' });
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(barsX, by, barsW, barH2, 1, 1, 'F');
    const fillW = Math.max((notRecordedCount / maxSens) * barsW, 3);
    doc.setFillColor(180, 180, 180);
    doc.roundedRect(barsX, by, fillW, barH2, 1, 1, 'F');
    const pct = Math.round((notRecordedCount / totalSens) * 100);
    doc.setTextColor(...C.dark);
    doc.text(`${notRecordedCount}  (${pct}%)`, barsX + fillW + 2, by + barH2 / 2 + 1);
  }
}

/* ================================================================== */
/*  Page 6: Machine-Readable Data                                      */
/* ================================================================== */

function pageMachineData(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics) {
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  doc.setFontSize(13);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Structured Data', MARGIN, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text('For clinical software ingestion. This page may be scanned or parsed electronically.', MARGIN, 25);

  // ── Metadata table ──
  let y = 30;
  const metadataRows: string[][] = [
    ['patient_age', state.age?.toString() ?? ''],
    ['start_date', state.startDate],
    ['clinic_code', state.clinicCode ?? ''],
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
  doc.text('Events', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 3;

  // Merge all events into one sorted list
  type EventRow = [string, string, string, string, string, string, string, string];
  const rows: EventRow[] = [];

  for (const w of (state.wakeTimes ?? [])) {
    rows.push(['wake', w.timestampIso, w.dayNumber.toString(), '', '', '', '', '']);
  }
  for (const v of state.voids) {
    const day = getDayNumber(v.timestampIso, state.startDate, state.bedtimes);
    rows.push([
      'void',
      v.timestampIso,
      day.toString(),
      dv(v.volumeMl, state).toString(),
      v.doubleVoidMl ? dv(v.doubleVoidMl, state).toString() : '',
      v.sensation !== null ? v.sensation.toString() : '',
      v.isFirstMorningVoid ? 'Y' : '',
      v.leak ? 'Y' : '',
    ]);
  }
  for (const d of state.drinks) {
    const day = getDayNumber(d.timestampIso, state.startDate, state.bedtimes);
    rows.push([
      'drink',
      d.timestampIso,
      day.toString(),
      dv(d.volumeMl, state).toString(),
      '',
      '',
      '',
      d.drinkType,
    ]);
  }
  for (const l of (state.leaks ?? [])) {
    const day = getDayNumber(l.timestampIso, state.startDate, state.bedtimes);
    rows.push([
      'leak',
      l.timestampIso,
      day.toString(),
      '',
      '',
      '',
      l.urgencyBeforeLeak === true ? 'Y' : l.urgencyBeforeLeak === false ? 'N' : '',
      `${l.trigger}${l.amount ? ' ' + l.amount : ''}`,
    ]);
  }
  for (const b of state.bedtimes) {
    rows.push(['bedtime', b.timestampIso, b.dayNumber.toString(), '', '', '', '', '']);
  }

  // Sort by timestamp
  rows.sort((a, b) => a[1].localeCompare(b[1]));

  autoTable(doc, {
    startY: y,
    head: [['type', 'timestamp', 'day', 'vol', 'dbl', 'sens', 'fmv', 'extra']],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 5.5, cellPadding: 1, textColor: C.dark, font: 'courier', overflow: 'ellipsize' },
    headStyles: { fillColor: [80, 80, 80], textColor: C.white, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 52 },
      2: { cellWidth: 8 },
      3: { cellWidth: 14 },
      4: { cellWidth: 12 },
      5: { cellWidth: 10 },
      6: { cellWidth: 10 },
      7: { cellWidth: 16 },
    },
  });
}

/* ================================================================== */
/*  Main entry point                                                   */
/* ================================================================== */

/** Generate the PDF blob without triggering a download. */
export function generatePdfBlob(state: DiaryState): { blob: Blob; filename: string } {
  // Start landscape — the combined 3-day diary is the first page
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const metrics = computeMetrics(state);

  // Page 1: Combined 3-day diary (landscape) — uses the initial page
  pageCombinedDiary(doc, state, true);

  // Page 2: Results overview
  pageResultsOverview(doc, state, metrics);

  // Pages 3-5: Daily diary grids
  for (const dayNum of [1, 2, 3] as const) {
    pageDailyDiary(doc, state, dayNum, metrics.dayMetrics[dayNum - 1]);
  }

  // Page 6: Graphs
  pageGraphs(doc, state, metrics);

  // Page 7: Machine-readable data
  pageMachineData(doc, state, metrics);

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount);
  }

  return {
    blob: doc.output('blob'),
    filename: `my-flow-check-${state.startDate}.pdf`,
  };
}

/** Generate and download the PDF (desktop fallback). */
export function generatePdf(state: DiaryState): void {
  const { blob, filename } = generatePdfBlob(state);
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
