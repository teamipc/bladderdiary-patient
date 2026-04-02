/**
 * CSV export — structured for clinical software ingestion.
 *
 * Format:
 *   Section 1: Patient metadata (key-value pairs)
 *   Section 2: All events in chronological order (type-discriminated)
 *   Section 3: Calculated clinical metrics (24HV, NPi, MVV, AVV, etc.)
 *
 * Double voids: the main void volume is in `volumeMl`, the second
 * immediate void is in `doubleVoidMl`. For volume calculations,
 * both are combined (except MVV which uses individual volumes).
 */

import { getDayNumber, mlToDisplayVolume } from './utils';
import { computeMetrics } from './calculations';
import { PREMIUM_FEATURES_ENABLED } from './constants';
import type { DiaryState } from './types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(csvEscape).join(',');
}

/* ------------------------------------------------------------------ */
/*  Generate CSV                                                       */
/* ------------------------------------------------------------------ */

export function generateCsv(state: DiaryState): string {
  const lines: string[] = [];
  const metrics = computeMetrics(state);

  // ── Section 1: Metadata ──
  lines.push('## METADATA');
  lines.push('key,value');
  lines.push(row('patient_age', state.age));
  lines.push(row('start_date', state.startDate));
  lines.push(row('clinic_code', state.clinicCode));
  lines.push(row('volume_unit', state.volumeUnit));
  lines.push(row('timezone', state.timeZone));
  lines.push('');

  // ── Section 2: Events ──
  lines.push('## EVENTS');
  lines.push('type,timestamp,dayNumber,volumeMl,doubleVoidMl,drinkType,sensation,isFirstMorningVoid,leak,note,trigger,urgencyBeforeLeak,amount');

  // Wake times
  for (const w of (state.wakeTimes ?? [])) {
    lines.push(row('wake', w.timestampIso, w.dayNumber, '', '', '', '', '', '', '', '', '', ''));
  }

  const dv = (ml: number) => mlToDisplayVolume(ml, state.volumeUnit);

  // Voids
  for (const v of state.voids) {
    const day = getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    lines.push(row(
      'void',
      v.timestampIso,
      day,
      dv(v.volumeMl),
      v.doubleVoidMl ? dv(v.doubleVoidMl) : '',
      '',
      v.sensation !== null ? v.sensation : '',
      v.isFirstMorningVoid,
      v.leak,
      v.note,
      '', '', '',
    ));
  }

  // Drinks
  for (const d of state.drinks) {
    const day = getDayNumber(d.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    lines.push(row(
      'drink',
      d.timestampIso,
      day,
      dv(d.volumeMl),
      '',
      d.drinkType,
      '',
      '',
      '',
      d.note,
      '', '', '',
    ));
  }

  // Standalone leaks
  for (const l of (state.leaks ?? [])) {
    const day = getDayNumber(l.timestampIso, state.startDate, state.bedtimes, state.timeZone);
    lines.push(row(
      'leak',
      l.timestampIso,
      day,
      '', '', '', '', '', '', l.notes,
      l.trigger,
      l.urgencyBeforeLeak !== null ? l.urgencyBeforeLeak : '',
      l.amount ?? '',
    ));
  }

  // Bedtimes
  for (const b of state.bedtimes) {
    lines.push(row('bedtime', b.timestampIso, b.dayNumber, '', '', '', '', '', '', '', '', '', ''));
  }

  lines.push('');

  // ── Section 3: Calculated Metrics (premium only) ──
  if (PREMIUM_FEATURES_ENABLED) {
    lines.push('## CALCULATED_METRICS');
    lines.push('metric,period,value');
    lines.push(row('mvv_ml', 'overall', metrics.mvv));
    lines.push(row('total_intake_ml', 'overall', metrics.totalFluidIntakeMl));
    lines.push(row('total_output_ml', 'overall', metrics.totalVoidVolumeMl));
    lines.push(row('total_voids', 'overall', metrics.totalVoidCount));
    lines.push(row('total_leaks', 'overall', metrics.totalLeaks));
    lines.push(row('total_standalone_leaks', 'overall', metrics.totalStandaloneLeaks));
    lines.push(row('continent', 'overall', metrics.isContinent));

    // Period 1 (Night 1 / Day 2)
    const p1 = metrics.periods[0];
    if (p1) {
      lines.push(row('24hv_ml', 'night1_day2', p1.twentyFourHV));
      lines.push(row('npi_pct', 'night1_day2', p1.nPi));
      lines.push(row('avv_ml', 'night1_day2', p1.avv));
      lines.push(row('nocturnal_vol_ml', 'night1', metrics.nights[0]?.nocturnalVolumeMl));
      lines.push(row('void_count', 'night1_day2', p1.voidCount));
    }

    // Period 2 (Night 2 / Day 3)
    const p2 = metrics.periods[1];
    if (p2) {
      lines.push(row('24hv_ml', 'night2_day3', p2.twentyFourHV));
      lines.push(row('npi_pct', 'night2_day3', p2.nPi));
      lines.push(row('avv_ml', 'night2_day3', p2.avv));
      lines.push(row('nocturnal_vol_ml', 'night2', metrics.nights[1]?.nocturnalVolumeMl));
      lines.push(row('void_count', 'night2_day3', p2.voidCount));
    }

    // Per-day metrics
    for (const dm of metrics.dayMetrics) {
      lines.push(row('day_intake_ml', `day${dm.dayNumber}`, dm.totalFluidIntakeMl));
      lines.push(row('day_output_ml', `day${dm.dayNumber}`, dm.totalVoidVolumeMl));
      lines.push(row('day_voids', `day${dm.dayNumber}`, dm.voidCount));
      lines.push(row('day_leaks', `day${dm.dayNumber}`, dm.leakCount));
      lines.push(row('day_standalone_leaks', `day${dm.dayNumber}`, dm.standaloneLeakCount));
    }
  }

  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Download / share helpers                                           */
/* ------------------------------------------------------------------ */

/** Generate CSV blob without triggering a download. */
export function generateCsvBlob(state: DiaryState): { blob: Blob; filename: string } {
  const csv = generateCsv(state);
  return {
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    filename: `my-flow-check-${state.startDate}.csv`,
  };
}

/** Generate and download CSV (desktop fallback). */
export function downloadCsv(state: DiaryState): void {
  const { blob, filename } = generateCsvBlob(state);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
