import { jsPDF } from 'jspdf';
import { getDayNumber, getHoursInTz, getMinutesInTz } from '../utils';
import { SENSATION_LABELS } from '../constants';
import type { DiaryState } from '../types';
import type { DiaryMetrics } from '../calculations';
import { C, MARGIN, CONTENT_W } from './theme';
import { getPdfStrings } from './strings';
import { addLogo, dv } from './shared';

/** Pick a "nice" round step for axis ticks. Safe against 0/NaN/Infinity. */
export function niceStep(range: number, approxTicks: number): number {
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

export function pageGraphs(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics, locale: string) {
  const s = getPdfStrings(locale);
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.clinicalAnalysis, MARGIN, 20);
  doc.setFont('helvetica', 'normal');

  // ── Chart 1: Daily Fluid Balance (top) ──
  const chart1Y = 28;
  const chartH = 50;
  const chartW = CONTENT_W - 22;
  const chartX = MARGIN + 18;

  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.dailyFluidBalance, MARGIN, chart1Y);
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
    xLabels: [s.day(1), s.day(2), s.day(3)],
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
  doc.text(s.fluidIntakeLabel, chartX + 5.5, legY + 2);
  doc.setFillColor(...C.chartAmber);
  doc.rect(chartX + 30, legY, 4, 2.5, 'F');
  doc.text(s.voidedOutput, chartX + 35.5, legY + 2);

  // ── Chart 2: Frequency-Volume (time-based scatter plot) ──
  const chart2Y = legY + 12;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.freqVolChart, MARGIN, chart2Y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  doc.text(s.freqVolDesc, MARGIN, chart2Y + 4);

  const chart2Top = chart2Y + 7;
  const chart2H = 50;

  const allVoids = [...state.voids].sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
  const maxVoid = Math.max(...allVoids.map((v) => dv(v.volumeMl, state)), u === 'oz' ? 4 : 100);
  const voidHeadroom = maxVoid * 1.15;
  const voidStep = niceStep(voidHeadroom, 4);
  const roundedMaxVoid = Math.max(Math.ceil(voidHeadroom / voidStep) * voidStep, u === 'oz' ? 4 : 100);

  // 24-hour clock labels, locale-neutral. Used as the x-axis on the frequency-volume scatter plot.
  // The clinical convention starts at 06:00 (when most patients wake) and wraps through midnight.
  const timeLabels = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00'];
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
      const dayNum = getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone);
      const color = dayColors[(dayNum - 1) as 0 | 1 | 2];
      const hourOfDay = getHoursInTz(v.timestampIso, state.timeZone) + getMinutesInTz(v.timestampIso, state.timeZone) / 60;
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
    doc.text(s.day(i + 1), lx + 4, leg2Y + 2);
  }
  // Leak indicator in legend
  doc.setDrawColor(...C.leakNote);
  doc.setLineWidth(0.6);
  doc.circle(chartX + 78, leg2Y + 1, 2, 'S');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.dark);
  doc.text(s.voidLeakLegend, chartX + 81, leg2Y + 2);
  doc.setLineWidth(0.2);

  // Standalone leak markers on chart (terracotta diamonds at bottom)
  const standaloneLeaks = (state.leaks ?? []);
  if (standaloneLeaks.length > 0) {
    standaloneLeaks.forEach((l) => {
      const hourOfDay = getHoursInTz(l.timestampIso, state.timeZone) + getMinutesInTz(l.timestampIso, state.timeZone) / 60;
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
    doc.text(s.standaloneLeakLegend, chartX + 99.5, leg2Y + 2);
  }

  // ── Chart 3: Urgency Distribution (bottom) ──
  const chart3Y = leg2Y + 10;
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.urgencyDistribution, MARGIN, chart3Y);
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
    const sensLabel = s.sensLabels[i] ?? SENSATION_LABELS[i as 0 | 1 | 2 | 3 | 4].short;

    // Label on the left
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(`${i} - ${sensLabel}`, barsX - 2, by + barH2 / 2 + 1, { align: 'right' });

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
    doc.text(s.notRecorded, barsX - 2, by + barH2 / 2 + 1, { align: 'right' });
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
