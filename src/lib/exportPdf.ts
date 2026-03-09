/**
 * Clinical PDF export — generates a multi-page bladder diary report.
 *
 * Pages:
 *   1       Results overview with clinical metrics
 *   2-4     Daily bladder diary (24-hour hourly grid per day)
 *   5       Clinical analysis graphs
 *   6       Machine-readable structured data page
 *
 * Branding: IPC gold logo top-right, footer with tagline + disclaimer.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { getDayNumber, getDayDate, formatTime, mlToDisplayVolume } from './utils';
import { getDrinkLabel, SENSATION_LABELS, PREMIUM_FEATURES_ENABLED } from './constants';
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
  const y = FOOTER_Y;
  doc.setDrawColor(...C.mutedLight);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

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
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN, y + 11, { align: 'right' });
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
        ['Leak Count', '\u2014', '\u2014', fmtV(metrics.totalLeaks)],
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
      ['Leaks',             ...metrics.dayMetrics.map((d) => fmtV(d.leakCount))],
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
    const drinksText = hourDrinks.map((d) => `${dv(d.volumeMl, state)} ${u} ${getDrinkLabel(d.drinkType)}`).join('\n');

    // Voids in this hour
    const hourVoids = dayVoids.filter((v) => parseISO(v.timestampIso).getHours() === hour);
    const voidsText = hourVoids
      .map((v) => {
        let txt = `${dv(v.volumeMl, state)} ${u}`;
        if (v.doubleVoidMl) txt += ` (+${dv(v.doubleVoidMl, state)})`;
        if (v.isFirstMorningVoid) txt += ' *FMV';
        return txt;
      })
      .join('\n');

    const urgText = hourVoids.map((v) => `${v.sensation}`).join('\n');
    const leakText = hourVoids.some((v) => v.leak) ? 'Yes' : '';

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

function pageDailyDiary(doc: jsPDF, state: DiaryState, dayNum: 1 | 2 | 3, dm: DayMetrics) {
  doc.addPage();
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

  // Build hourly grid — 24 rows starting from the actual wake hour
  const { slots, startHour } = buildHourSlots(state, dayNum);

  // Determine sleep hours for shading
  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);
  const bedHour = bedtime ? parseISO(bedtime.timestampIso).getHours() : -1;
  const wakeHour = wakeTime ? parseISO(wakeTime.timestampIso).getHours() : -1;

  const body = slots.map((s) => [s.label, s.drinks || '\u2014', s.voids || '\u2014', s.urgency || '\u2014', s.leak || '']);

  autoTable(doc, {
    startY: subY,
    head: [['Hour', `Fluid In (${state.volumeUnit})`, `Voided (${state.volumeUnit})`, 'Sensation', 'Leak']],
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      textColor: C.dark,
      minCellHeight: 8.5,
      valign: 'middle',
      lineWidth: 0.1,
      lineColor: [220, 220, 220],
    },
    headStyles: { fillColor: C.gold, textColor: C.white, fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', halign: 'center', fontSize: 6 },
      1: { cellWidth: 42 },
      2: { cellWidth: 36 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const slot = slots[data.row.index];
      if (!slot) return;
      const hour = (startHour + data.row.index) % 24;

      // Sleep hours: shade with light indigo
      // Works for both normal schedules and night-shift workers
      const isSleepHour = (() => {
        if (bedHour < 0) return false;
        const wk = wakeHour >= 0 ? wakeHour : startHour;
        if (bedHour > wk) {
          // Normal schedule: sleep is bedHour..23, 0..wakeHour
          return hour >= bedHour || hour < wk;
        }
        // Night-shift or wrapping: sleep is bedHour..wakeHour
        return hour >= bedHour && hour < wk;
      })();

      if (isSleepHour && !slot.hasDrink && !slot.hasVoid) {
        data.cell.styles.fillColor = [245, 243, 255]; // very light indigo
        if (data.column.index === 0) {
          data.cell.styles.textColor = [130, 120, 190];
        }
      }

      // Color-code cells with actual data
      if (data.column.index === 1 && slot.hasDrink) {
        data.cell.styles.fillColor = C.inputCell;
        data.cell.styles.textColor = [0, 100, 160]; // darker blue for contrast
      }
      if (data.column.index === 2 && slot.hasVoid) {
        data.cell.styles.fillColor = C.outputCell;
        data.cell.styles.textColor = [140, 100, 20]; // darker amber for contrast
      }
      if (data.column.index === 4 && slot.leak) {
        data.cell.styles.textColor = C.leakNote;
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
  const totText = `Intake: ${dv(dm.totalFluidIntakeMl, state).toLocaleString()} ${state.volumeUnit}    Output: ${dv(dm.totalVoidVolumeMl, state).toLocaleString()} ${state.volumeUnit} (${dm.voidCount} voids)    Leaks: ${dm.leakCount}`;
  doc.text(totText, PAGE_W / 2, totY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
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
  doc.addPage();
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
  doc.text('= Leak', chartX + 81, leg2Y + 2);
  doc.setLineWidth(0.2);

  // ── Chart 3: Urgency Distribution (bottom) ──
  const chart3Y = leg2Y + 10;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Urgency Distribution', MARGIN, chart3Y);
  doc.setFont('helvetica', 'normal');

  const sensCount = [0, 0, 0, 0, 0];
  state.voids.forEach((v) => { sensCount[v.sensation]++; });
  const totalSens = sensCount.reduce((s, c) => s + c, 0) || 1;
  const maxSens = Math.max(...sensCount, 1);

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
}

/* ================================================================== */
/*  Page 6: Machine-Readable Data                                      */
/* ================================================================== */

function pageMachineData(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics) {
  doc.addPage();
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
      v.sensation.toString(),
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

export function generatePdf(state: DiaryState): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const metrics = computeMetrics(state);

  // Page 1: Results overview
  pageResultsOverview(doc, state, metrics);

  // Pages 2-4: Daily diary grids
  for (const dayNum of [1, 2, 3] as const) {
    pageDailyDiary(doc, state, dayNum, metrics.dayMetrics[dayNum - 1]);
  }

  // Page 5: Graphs
  pageGraphs(doc, state, metrics);

  // Page 6: Machine-readable data
  pageMachineData(doc, state, metrics);

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount);
  }

  // Mobile-safe download: use Blob + anchor with fallback to window.open
  const filename = `my-flow-check-${state.startDate}.pdf`;
  const blob = doc.output('blob');
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
