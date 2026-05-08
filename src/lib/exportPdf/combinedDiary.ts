import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDayDate } from '../utils';
import type { DiaryState } from '../types';
import { IPC_LOGO_BASE64, IPC_LOGO_ASPECT } from '../ipcLogoBase64';
import { C } from './theme';
import { getPdfStrings, pdfFormatDate } from './strings';
import { buildHourSlots } from './slots';

export function pageCombinedDiary(doc: jsPDF, state: DiaryState, locale: string, useCurrentPage = false) {
  const s = getPdfStrings(locale);
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
  doc.text(s.threeDayTitle, M, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  const startLabel = pdfFormatDate(state.startDate + 'T12:00:00', 'PPP', locale);
  doc.text(`${s.started}: ${startLabel}  |  ${s.name}: _________________`, M, 18);

  // Build per-hour data for all 3 days
  const allSlots = [1, 2, 3].map((d) => buildHourSlots(state, d as 1 | 2 | 3, locale));
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
    return pdfFormatDate(dateStr + 'T12:00:00', 'EEE, PP', locale);
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
        { content: `${s.day(1)} — ${dayHeaders[0]}`, colSpan: 4, styles: { halign: 'center' as const } },
        { content: `${s.day(2)} — ${dayHeaders[1]}`, colSpan: 4, styles: { halign: 'center' as const } },
        { content: `${s.day(3)} — ${dayHeaders[2]}`, colSpan: 4, styles: { halign: 'center' as const } },
      ],
      // Row 2: Sub-headers
      [
        s.time,
        s.drinks, `${s.urine}\n(${u})`, s.sens, s.leak,
        s.drinks, `${s.urine}\n(${u})`, s.sens, s.leak,
        s.drinks, `${s.urine}\n(${u})`, s.sens, s.leak,
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
  doc.text(s.sensationLegend, M, legendY);
}
