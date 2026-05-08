import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDayDate, formatTime, getHoursInTz } from '../utils';
import type { DiaryState } from '../types';
import type { DayMetrics } from '../calculations';
import { C, MARGIN, PAGE_W, CONTENT_W, FOOTER_Y } from './theme';
import { getPdfStrings, pdfFormatDate } from './strings';
import { addLogo, dv } from './shared';
import { buildHalfHourSlots } from './slots';

export function pageDailyDiary(doc: jsPDF, state: DiaryState, dayNum: 1 | 2 | 3, dm: DayMetrics, locale: string) {
  const s = getPdfStrings(locale);
  doc.addPage('a4', 'portrait');
  addLogo(doc);

  const dayDateStr = getDayDate(state.startDate, dayNum);
  const dayLabel = pdfFormatDate(dayDateStr + 'T12:00:00', 'PPPP', locale);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(s.day(dayNum), MARGIN, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text(dayLabel, MARGIN, 26);

  // Wake / Bed summary
  let subY = 32;
  doc.setFontSize(8);
  doc.setTextColor(100, 80, 200);
  const wakeBedParts: string[] = [];
  if (dm.wakeTimeIso) wakeBedParts.push(`${s.wake}: ${formatTime(dm.wakeTimeIso, locale, state.timeZone)}`);
  if (dm.bedtimeIso) wakeBedParts.push(`${s.bed}: ${formatTime(dm.bedtimeIso, locale, state.timeZone)}`);
  if (wakeBedParts.length > 0) {
    doc.text(wakeBedParts.join('    |    '), MARGIN, subY);
    subY += 4;
  }
  subY += 1;

  // Build 30-min grid — 48 rows starting from the actual wake hour
  const { slots, startHour } = buildHalfHourSlots(state, dayNum, locale);

  // Determine sleep hours for shading
  const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);
  const wakeTime = (state.wakeTimes ?? []).find((w) => w.dayNumber === dayNum);
  const bedHour = bedtime ? getHoursInTz(bedtime.timestampIso, state.timeZone) : -1;
  const wakeHour = wakeTime ? getHoursInTz(wakeTime.timestampIso, state.timeZone) : -1;

  const body = slots.map((s) => [s.label, s.drinks || '—', s.voids || '—', s.urgency || '—', s.leak || '']);

  autoTable(doc, {
    startY: subY,
    head: [['Time', `${s.fluidIn} (${state.volumeUnit})`, `${s.voided} (${state.volumeUnit})`, s.sens, s.leak]],
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
    ? `${s.leaks}: ${dm.leakCount} ${s.voidWord} + ${dm.standaloneLeakCount} ${s.standaloneWord}`
    : `${s.leaks}: ${dm.leakCount}`;
  const totText = `${s.intake}: ${dv(dm.totalFluidIntakeMl, state).toLocaleString()} ${state.volumeUnit}    ${s.output}: ${dv(dm.totalVoidVolumeMl, state).toLocaleString()} ${state.volumeUnit} (${dm.voidCount} ${s.voids})    ${leakSummary}`;
  doc.text(totText, PAGE_W / 2, totY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
}
