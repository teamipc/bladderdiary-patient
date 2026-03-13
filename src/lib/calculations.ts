/**
 * Clinical bladder diary calculations.
 *
 * Implements IPC (Integrated Pelvic Care) standard metrics:
 * - 24HV  (24-hour voided volume)
 * - NPi   (Nocturnal Polyuria Index)
 * - MVV   (Maximum Voided Volume)
 * - AVV   (Average Voided Volume)
 * - Nocturnal volume per night
 *
 * Day 1 is excluded from 24HV / NPi / AVV calculations (adaptation period).
 * Double-void volumes are combined for volume calculations but NOT for MVV.
 * Double voids count as 2 individual voids for AVV and void count purposes.
 */

import { getDayNumber } from './utils';
import type { DiaryState, VoidEntry, LeakEntry, BedtimeEntry, WakeTimeEntry } from './types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DayMetrics {
  dayNumber: 1 | 2 | 3;
  totalFluidIntakeMl: number;
  totalVoidVolumeMl: number;
  voidCount: number;
  drinkCount: number;
  leakCount: number;           // void-associated leaks
  standaloneLeakCount: number; // standalone leak events
  wakeTimeIso?: string;
  bedtimeIso?: string;
}

export interface NightMetrics {
  nightLabel: string;        // "Night 1" or "Night 2"
  nocturnalVolumeMl: number; // all voids from bedtime → FMV inclusive
  nocturnalVoidCount: number;
  bedtimeIso?: string;
  fmvIso?: string;
}

export interface PeriodMetrics {
  periodLabel: string;       // "Night 1 / Day 2" or "Night 2 / Day 3"
  twentyFourHV: number;      // 24-hour voided volume (mL)
  nocturnalVolumeMl: number;
  nPi: number | null;        // nocturnal polyuria index (%) — null if can't compute
  avv: number | null;        // average voided volume (mL) — null if 0 voids
  voidCount: number;
}

export interface DiaryMetrics {
  periods: PeriodMetrics[];
  nights: NightMetrics[];
  dayMetrics: DayMetrics[];
  mvv: number;               // maximum voided volume across all days
  totalFluidIntakeMl: number;
  totalVoidVolumeMl: number;
  totalVoidCount: number;
  totalLeaks: number;           // void-associated leaks
  totalStandaloneLeaks: number; // standalone leak events
  isContinent: boolean;
  age: number | null;
  startDate: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Total volume of a void including double-void. */
function voidTotalMl(v: VoidEntry): number {
  return v.volumeMl + (v.doubleVoidMl ?? 0);
}

/** Get bedtime entry for a day. */
function bedtimeFor(state: DiaryState, day: 1 | 2 | 3): BedtimeEntry | undefined {
  return state.bedtimes.find((b) => b.dayNumber === day);
}

/** Get wake-time entry for a day. */
function wakeFor(state: DiaryState, day: 1 | 2 | 3): WakeTimeEntry | undefined {
  return (state.wakeTimes ?? []).find((w) => w.dayNumber === day);
}

/** Get voids for a specific diary day (bedtime-aware). */
function voidsForDay(state: DiaryState, day: number): VoidEntry[] {
  return state.voids
    .filter((v) => getDayNumber(v.timestampIso, state.startDate, state.bedtimes) === day)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
}

/** Get drinks for a specific diary day (bedtime-aware). */
function drinksForDay(state: DiaryState, day: number) {
  return state.drinks
    .filter((d) => getDayNumber(d.timestampIso, state.startDate, state.bedtimes) === day)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
}

/** Get standalone leaks for a specific diary day (bedtime-aware). */
function leaksForDay(state: DiaryState, day: number): LeakEntry[] {
  return (state.leaks ?? [])
    .filter((l) => getDayNumber(l.timestampIso, state.startDate, state.bedtimes) === day)
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso));
}

/* ------------------------------------------------------------------ */
/*  Nocturnal Volume                                                   */
/* ------------------------------------------------------------------ */

/**
 * Calculate nocturnal volume for a night.
 *
 * Nocturnal volume = all voids from Day X bedtime to the Day (X+1) first
 * morning void (FMV), inclusive. Double-void volumes are combined.
 *
 * Night 1 = Day 1 bedtime → Day 2 FMV
 * Night 2 = Day 2 bedtime → Day 3 FMV
 */
function calcNocturnalVolume(
  state: DiaryState,
  nightNum: 1 | 2,
): NightMetrics {
  const fromDay = nightNum as 1 | 2;
  const toDay = (nightNum + 1) as 2 | 3;

  const bedtime = bedtimeFor(state, fromDay);
  const nextDayVoids = voidsForDay(state, toDay);
  const fmv = nextDayVoids.find((v) => v.isFirstMorningVoid);

  const label = `Night ${nightNum}`;

  if (!bedtime) {
    return { nightLabel: label, nocturnalVolumeMl: 0, nocturnalVoidCount: 0 };
  }

  // End boundary = FMV timestamp, or wake time if no FMV marked
  const wakeTime = wakeFor(state, toDay);
  const endIso = fmv?.timestampIso ?? wakeTime?.timestampIso;

  if (!endIso) {
    return {
      nightLabel: label,
      nocturnalVolumeMl: 0,
      nocturnalVoidCount: 0,
      bedtimeIso: bedtime.timestampIso,
    };
  }

  // Nocturnal voids: all voids strictly after bedtime and up to (inclusive) FMV / wake
  const nocturnalVoids = state.voids.filter(
    (v) => v.timestampIso > bedtime.timestampIso && v.timestampIso <= endIso,
  );

  const nocturnalVolumeMl = nocturnalVoids.reduce((s, v) => s + voidTotalMl(v), 0);
  const nocturnalVoidCount = nocturnalVoids.reduce((count, v) => count + 1 + (v.doubleVoidMl ? 1 : 0), 0);

  return {
    nightLabel: label,
    nocturnalVolumeMl,
    nocturnalVoidCount,
    bedtimeIso: bedtime.timestampIso,
    fmvIso: fmv?.timestampIso ?? endIso,
  };
}

/* ------------------------------------------------------------------ */
/*  24HV                                                               */
/* ------------------------------------------------------------------ */

/**
 * 24-hour voided volume for a period.
 *
 * Period 1 (Day 2) = all voids from Day 1 bedtime to Day 2 bedtime.
 * Period 2 (Day 3) = all voids from Day 2 bedtime to Day 3 bedtime.
 */
function calc24HV(state: DiaryState, periodNum: 1 | 2): number {
  const fromDay = periodNum as 1 | 2;
  const toDay = (periodNum + 1) as 2 | 3;

  const startBedtime = bedtimeFor(state, fromDay);
  const endBedtime = bedtimeFor(state, toDay);

  if (!startBedtime || !endBedtime) return 0;

  const periodVoids = state.voids.filter(
    (v) =>
      v.timestampIso > startBedtime.timestampIso &&
      v.timestampIso <= endBedtime.timestampIso,
  );

  return periodVoids.reduce((s, v) => s + voidTotalMl(v), 0);
}

/** Count individual voids in a 24HV period (double voids count as 2). */
function count24HVVoids(state: DiaryState, periodNum: 1 | 2): number {
  const fromDay = periodNum as 1 | 2;
  const toDay = (periodNum + 1) as 2 | 3;

  const startBedtime = bedtimeFor(state, fromDay);
  const endBedtime = bedtimeFor(state, toDay);

  if (!startBedtime || !endBedtime) return 0;

  return state.voids
    .filter(
      (v) =>
        v.timestampIso > startBedtime.timestampIso &&
        v.timestampIso <= endBedtime.timestampIso,
    )
    .reduce((count, v) => count + 1 + (v.doubleVoidMl ? 1 : 0), 0);
}

/* ------------------------------------------------------------------ */
/*  MVV                                                                */
/* ------------------------------------------------------------------ */

/**
 * Maximum Voided Volume — largest single void across the entire diary.
 * Double-void volumes are NOT combined (each pass is considered separately).
 */
function calcMVV(state: DiaryState): number {
  let max = 0;
  for (const v of state.voids) {
    if (v.volumeMl > max) max = v.volumeMl;
    if (v.doubleVoidMl && v.doubleVoidMl > max) max = v.doubleVoidMl;
  }
  return max;
}

/* ------------------------------------------------------------------ */
/*  Day Metrics                                                        */
/* ------------------------------------------------------------------ */

function calcDayMetrics(state: DiaryState, day: 1 | 2 | 3): DayMetrics {
  const voids = voidsForDay(state, day);
  const drinks = drinksForDay(state, day);
  const leaks = leaksForDay(state, day);
  const bedtime = bedtimeFor(state, day);
  const wake = wakeFor(state, day);

  return {
    dayNumber: day,
    totalFluidIntakeMl: drinks.reduce((s, d) => s + d.volumeMl, 0),
    totalVoidVolumeMl: voids.reduce((s, v) => s + voidTotalMl(v), 0),
    voidCount: voids.reduce((count, v) => count + 1 + (v.doubleVoidMl ? 1 : 0), 0),
    drinkCount: drinks.length,
    leakCount: voids.filter((v) => v.leak).length,
    standaloneLeakCount: leaks.length,
    wakeTimeIso: wake?.timestampIso,
    bedtimeIso: bedtime?.timestampIso,
  };
}

/* ------------------------------------------------------------------ */
/*  Main: compute all metrics                                          */
/* ------------------------------------------------------------------ */

export function computeMetrics(state: DiaryState): DiaryMetrics {
  // Per-day metrics
  const day1 = calcDayMetrics(state, 1);
  const day2 = calcDayMetrics(state, 2);
  const day3 = calcDayMetrics(state, 3);

  // Nocturnal metrics
  const night1 = calcNocturnalVolume(state, 1);
  const night2 = calcNocturnalVolume(state, 2);

  // 24HV / NPi / AVV per period (Day 1 excluded)
  const periods: PeriodMetrics[] = [];

  for (const pNum of [1, 2] as const) {
    const twentyFourHV = calc24HV(state, pNum);
    const night = pNum === 1 ? night1 : night2;
    const voidCount = count24HVVoids(state, pNum);

    const nPi = twentyFourHV > 0
      ? Math.round((night.nocturnalVolumeMl / twentyFourHV) * 1000) / 10
      : null;

    const avv = voidCount > 0 ? Math.round(twentyFourHV / voidCount) : null;

    periods.push({
      periodLabel: pNum === 1 ? 'Night 1 / Day 2' : 'Night 2 / Day 3',
      twentyFourHV,
      nocturnalVolumeMl: night.nocturnalVolumeMl,
      nPi,
      avv,
      voidCount,
    });
  }

  // MVV across all days
  const mvv = calcMVV(state);

  // Totals
  const totalFluidIntakeMl = day1.totalFluidIntakeMl + day2.totalFluidIntakeMl + day3.totalFluidIntakeMl;
  const totalVoidVolumeMl = day1.totalVoidVolumeMl + day2.totalVoidVolumeMl + day3.totalVoidVolumeMl;
  const totalVoidCount = day1.voidCount + day2.voidCount + day3.voidCount;
  const totalLeaks = day1.leakCount + day2.leakCount + day3.leakCount;
  const totalStandaloneLeaks = day1.standaloneLeakCount + day2.standaloneLeakCount + day3.standaloneLeakCount;

  return {
    periods,
    nights: [night1, night2],
    dayMetrics: [day1, day2, day3],
    mvv,
    totalFluidIntakeMl,
    totalVoidVolumeMl,
    totalVoidCount,
    totalLeaks,
    totalStandaloneLeaks,
    isContinent: totalLeaks === 0 && totalStandaloneLeaks === 0,
    age: state.age,
    startDate: state.startDate,
  };
}
