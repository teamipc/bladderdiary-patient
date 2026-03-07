/**
 * Patient-friendly PDF export.
 * Generates a clean, readable PDF of the 3-day bladder diary.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { getDayNumber, getDayDate, formatTime } from './utils';
import { getDrinkLabel, SENSATION_LABELS } from './constants';
import type { DiaryState } from './types';

export function generatePdf(state: DiaryState): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(60, 33, 15); // ipc-950
  doc.text('Bladder Diary', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(100, 80, 60);
  doc.text(
    `Start date: ${format(parseISO(state.startDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}`,
    pageWidth / 2,
    28,
    { align: 'center' },
  );

  let yOffset = 36;

  // Generate tables for each day
  for (const dayNum of [1, 2, 3] as const) {
    const dayDateStr = getDayDate(state.startDate, dayNum);
    const dayLabel = format(parseISO(dayDateStr + 'T12:00:00'), 'EEEE, MMM d');

    // Day header
    doc.setFontSize(14);
    doc.setTextColor(60, 33, 15);
    doc.text(`Day ${dayNum} — ${dayLabel}`, 14, yOffset);
    yOffset += 4;

    // Get events for this day
    const dayVoids = state.voids
      .filter((v) => getDayNumber(v.timestampIso, state.startDate) === dayNum)
      .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

    const dayDrinks = state.drinks
      .filter((d) => getDayNumber(d.timestampIso, state.startDate) === dayNum)
      .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));

    const bedtime = state.bedtimes.find((b) => b.dayNumber === dayNum);

    // Merge all events
    type RowEvent = { time: string; type: string; detail: string; volume: string; iso: string };
    const rows: RowEvent[] = [];

    for (const v of dayVoids) {
      const sensLabel = SENSATION_LABELS[v.sensation]?.short ?? '';
      const fmv = v.isFirstMorningVoid ? ' [FMV]' : '';
      const leak = v.sensation === 4 ? ' [LEAK]' : '';
      rows.push({
        time: formatTime(v.timestampIso),
        type: 'Void',
        detail: `Sensation ${v.sensation} (${sensLabel})${fmv}${leak}${v.note ? ` — ${v.note}` : ''}`,
        volume: `${v.volumeMl} mL`,
        iso: v.timestampIso,
      });
    }

    for (const d of dayDrinks) {
      rows.push({
        time: formatTime(d.timestampIso),
        type: getDrinkLabel(d.drinkType),
        detail: d.note || '',
        volume: `${d.volumeMl} mL`,
        iso: d.timestampIso,
      });
    }

    if (bedtime) {
      rows.push({
        time: formatTime(bedtime.timestampIso),
        type: 'Bedtime',
        detail: '',
        volume: '',
        iso: bedtime.timestampIso,
      });
    }

    // Sort by time
    rows.sort((a, b) => a.iso.localeCompare(b.iso));

    if (rows.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 130, 110);
      doc.text('No entries recorded', 14, yOffset + 6);
      yOffset += 14;
    } else {
      autoTable(doc, {
        startY: yOffset,
        head: [['Time', 'Type', 'Volume', 'Details']],
        body: rows.map((r) => [r.time, r.type, r.volume, r.detail]),
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: [60, 33, 15],
        },
        headStyles: {
          fillColor: [196, 152, 74], // ipc-500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [253, 248, 239], // ipc-50
        },
      });

      // @ts-expect-error jspdf-autotable adds lastAutoTable
      yOffset = doc.lastAutoTable.finalY + 4;

      // Day totals
      const totalFluids = dayDrinks.reduce((s, d) => s + d.volumeMl, 0);
      const totalVoids = dayVoids.reduce((s, v) => s + v.volumeMl, 0);
      doc.setFontSize(9);
      doc.setTextColor(100, 80, 60);
      doc.text(
        `Fluid intake: ${totalFluids.toLocaleString()} mL  |  Voided: ${totalVoids.toLocaleString()} mL (${dayVoids.length} times)`,
        14,
        yOffset,
      );
      yOffset += 10;
    }

    // Page break if needed
    if (yOffset > 260 && dayNum < 3) {
      doc.addPage();
      yOffset = 20;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(180, 160, 140);
  doc.text(
    `Generated ${format(new Date(), 'MMM d, yyyy h:mm a')} — IPC Bladder Diary`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' },
  );

  doc.save(`bladder-diary-${state.startDate}.pdf`);
}
