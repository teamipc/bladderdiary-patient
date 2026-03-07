/**
 * CSV export — produces a format compatible with the clinician app.
 * One row per event, type-discriminated.
 */

import { getDayNumber } from './utils';
import type { DiaryState } from './types';

const CSV_HEADER =
  'type,timestampIso,volumeMl,drinkType,sensation,isFirstMorningVoid,leak,note,dayNumber';

export function generateCsv(state: DiaryState): string {
  const rows: string[] = [CSV_HEADER];

  // Void entries
  for (const v of state.voids) {
    const day = getDayNumber(v.timestampIso, state.startDate);
    rows.push(
      [
        'void',
        v.timestampIso,
        v.volumeMl,
        '', // drinkType
        v.sensation,
        v.isFirstMorningVoid,
        v.sensation === 4, // leak derived from sensation
        csvEscape(v.note),
        day,
      ].join(','),
    );
  }

  // Drink entries
  for (const d of state.drinks) {
    const day = getDayNumber(d.timestampIso, state.startDate);
    rows.push(
      [
        'drink',
        d.timestampIso,
        d.volumeMl,
        d.drinkType,
        '', // sensation
        '', // isFirstMorningVoid
        '', // leak
        csvEscape(d.note),
        day,
      ].join(','),
    );
  }

  // Bedtime entries
  for (const b of state.bedtimes) {
    rows.push(
      [
        'bedtime',
        b.timestampIso,
        '', // volumeMl
        '', // drinkType
        '', // sensation
        '', // isFirstMorningVoid
        '', // leak
        '', // note
        b.dayNumber,
      ].join(','),
    );
  }

  return rows.join('\n');
}

function csvEscape(value: string): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(state: DiaryState): void {
  const csv = generateCsv(state);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bladder-diary-${state.startDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
