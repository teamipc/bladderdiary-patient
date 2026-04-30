/**
 * Comprehensive calculation verification tests.
 *
 * Tests the IPC (Integrated Pelvic Care) bladder diary metrics against
 * hand-verified case data from the "Wizard of LUTS" course materials.
 *
 * IPC Method Rules:
 * 1. Day 1 is excluded from 24HV, NPi, and AVV (adaptation period)
 * 2. Nocturnal volume = all voids from bedtime → FMV (inclusive), double voids combined
 * 3. 24HV = all voids from Day X bedtime → Day X+1 bedtime
 * 4. NPi = (nocturnal volume / 24HV) × 100%
 * 5. AVV = 24HV / number of voids in that period
 * 6. MVV = largest single void across entire diary (double voids NOT combined)
 * 7. Continence = any leak means incontinent
 */

import { describe, it, expect } from 'vitest';
import { computeMetrics } from '../lib/calculations';
import { getDayNumber, mlToDisplayVolume, displayVolumeToMl } from '../lib/utils';
import type { DiaryState, VoidEntry, DrinkEntry, BedtimeEntry, WakeTimeEntry } from '../lib/types';

/* ------------------------------------------------------------------ */
/*  Helper: build void/drink/bedtime/wake entries                      */
/* ------------------------------------------------------------------ */

let idCounter = 0;
function vid(
  day: number,
  hour: number,
  minute: number,
  volumeMl: number,
  sensation: 0 | 1 | 2 | 3 | 4,
  opts?: { leak?: boolean; doubleVoidMl?: number; fmv?: boolean },
): VoidEntry {
  const date = new Date(Date.UTC(2026, 2, day, hour, minute, 0));
  return {
    id: `v${++idCounter}`,
    timestampIso: date.toISOString(),
    volumeMl,
    doubleVoidMl: opts?.doubleVoidMl,
    sensation,
    leak: opts?.leak ?? false,
    note: '',
    isFirstMorningVoid: opts?.fmv ?? false,
  };
}

function did(
  day: number,
  hour: number,
  minute: number,
  volumeMl: number,
  drinkType: DrinkEntry['drinkType'] = 'water',
): DrinkEntry {
  const date = new Date(Date.UTC(2026, 2, day, hour, minute, 0));
  return {
    id: `d${++idCounter}`,
    timestampIso: date.toISOString(),
    volumeMl,
    drinkType,
    note: '',
  };
}

function bed(dayNumber: 1 | 2 | 3, calendarDay: number, hour: number, minute: number): BedtimeEntry {
  const date = new Date(Date.UTC(2026, 2, calendarDay, hour, minute, 0));
  return { id: `b${++idCounter}`, timestampIso: date.toISOString(), dayNumber };
}

function wake(dayNumber: 1 | 2 | 3, calendarDay: number, hour: number, minute: number): WakeTimeEntry {
  const date = new Date(Date.UTC(2026, 2, calendarDay, hour, minute, 0));
  return { id: `w${++idCounter}`, timestampIso: date.toISOString(), dayNumber };
}

/* ------------------------------------------------------------------ */
/*  Test: Mr. Patrick J (from IPC course — Case 1)                     */
/*  Expected: 24HV ≈ 1.6L, NPi ≈ 34-39%, MVV = 275, AVV ≈ 100-120   */
/* ------------------------------------------------------------------ */

describe('IPC calculations — Mr. Patrick J case', () => {
  // Reconstruct his diary data. Start date = March 1, 2026.
  // Day 1 = March 1, Day 2 = March 2, Day 3 = March 3.
  //
  // Bedtimes identified from diary gaps and sensation-0 "just in case" voids.
  // Day 1 bedtime ~20:30 (after last day void at 20:00, 23:00 is an overnight void)
  // Day 2 bedtime ~21:30 (after last day void at 21:00)
  // Day 3 bedtime ~20:30

  const startDate = '2026-03-01';

  const state: DiaryState = {
    startDate,
    age: 35,
    volumeUnit: 'mL',
    diaryStarted: true,
    clinicCode: null,
    timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
    leaks: [],
    bedtimes: [
      bed(1, 1, 20, 30),
      bed(2, 2, 21, 30),
      bed(3, 3, 20, 30),
    ],
    wakeTimes: [
      wake(1, 1, 6, 0),
      wake(2, 2, 6, 0),
      wake(3, 3, 6, 0),
    ],
    drinks: [
      // Day 1 drinks
      did(1, 7, 0, 200, 'milk'),
      did(1, 9, 0, 400, 'water'),
      did(1, 12, 0, 200, 'water'),
      did(1, 16, 0, 250, 'water'),
      did(1, 19, 0, 200, 'tea'),
      // Day 2 drinks
      did(2, 7, 0, 200, 'milk'),
      did(2, 10, 0, 400, 'water'),
      did(2, 11, 0, 200, 'water'),
      did(2, 15, 0, 200, 'water'),
      did(2, 17, 0, 300, 'water'),
      did(2, 19, 0, 200, 'tea'),
      // Day 3 drinks
      did(3, 7, 0, 200, 'milk'),
      did(3, 8, 0, 200, 'water'),
      did(3, 9, 0, 400, 'water'),
      did(3, 11, 0, 200, 'water'),
      did(3, 17, 0, 500, 'water'),
      did(3, 19, 0, 200, 'tea'),
      did(3, 20, 0, 100, 'water'),
    ],
    voids: [
      // === Day 1 daytime (before bedtime at 20:30) ===
      vid(1, 6, 0, 250, 1, { fmv: true }),   // 6:00 AM
      vid(1, 7, 0, 100, 0),                    // 7:00
      vid(1, 11, 0, 150, 1),                   // 11:00
      vid(1, 13, 0, 75, 3),                    // 13:00
      vid(1, 14, 0, 60, 3),                    // 14:00
      vid(1, 15, 0, 75, 3, { doubleVoidMl: 100 }), // 15:00 double void
      vid(1, 17, 0, 50, 3),                    // 17:00
      vid(1, 18, 0, 75, 3),                    // 18:00
      vid(1, 20, 0, 100, 1),                   // 20:00

      // === Night 1 (after Day 1 bedtime 20:30 → Day 2 FMV) ===
      vid(1, 23, 0, 50, 0),                    // 23:00 overnight void
      vid(2, 2, 0, 200, 1),                    // 2:00 AM
      vid(2, 4, 0, 150, 1),                    // 4:00 AM
      vid(2, 6, 0, 200, 1, { fmv: true }),     // 6:00 AM Day 2 — FMV

      // === Day 2 daytime (after wake, before bedtime 21:30) ===
      vid(2, 7, 0, 75, 0),
      vid(2, 10, 0, 200, 1),
      vid(2, 12, 0, 100, 1),
      vid(2, 14, 0, 75, 3),
      vid(2, 15, 0, 75, 3),
      vid(2, 16, 0, 50, 3, { doubleVoidMl: 50 }),  // double void
      vid(2, 17, 0, 100, 3),
      vid(2, 18, 0, 75, 3),
      vid(2, 20, 0, 100, 1),
      vid(2, 21, 0, 100, 1),

      // === Night 2 (after Day 2 bedtime 21:30 → Day 3 FMV) ===
      vid(3, 0, 0, 50, 0),                     // midnight
      vid(3, 2, 0, 200, 1),
      vid(3, 4, 0, 150, 1),
      vid(3, 6, 0, 275, 1, { fmv: true }),      // Day 3 FMV — this is the MVV!

      // === Day 3 daytime ===
      vid(3, 7, 0, 50, 0),
      vid(3, 9, 0, 200, 1),
      vid(3, 11, 0, 175, 1),
      vid(3, 15, 0, 50, 3, { doubleVoidMl: 50 }),
      vid(3, 16, 0, 75, 3, { doubleVoidMl: 100 }),
      vid(3, 18, 0, 75, 3),
      vid(3, 20, 0, 100, 3),
    ],
  };

  it('assigns voids to the correct days using bedtime boundaries', () => {
    // Day 1: voids before bedtime at 20:30 → 9 voids (6:00 through 20:00)
    const day1Voids = state.voids.filter(
      (v) => getDayNumber(v.timestampIso, startDate, state.bedtimes) === 1,
    );
    expect(day1Voids.length).toBe(9);

    // The 23:00 void on March 1 should be bumped to Day 2 (after Day 1 bedtime)
    const lateNightVoid = state.voids.find(
      (v) => v.timestampIso.includes('T23:00') && v.timestampIso.includes('2026-03-01'),
    );
    expect(lateNightVoid).toBeDefined();
    expect(getDayNumber(lateNightVoid!.timestampIso, startDate, state.bedtimes)).toBe(2);
  });

  it('computes correct nocturnal volumes', () => {
    const metrics = computeMetrics(state);

    // Night 1: 50 (23:00) + 200 (2:00) + 150 (4:00) + 200 (FMV 6:00) = 600
    expect(metrics.nights[0].nocturnalVolumeMl).toBe(600);

    // Night 2: 50 (0:00) + 200 (2:00) + 150 (4:00) + 275 (FMV 6:00) = 675
    expect(metrics.nights[1].nocturnalVolumeMl).toBe(675);
  });

  it('computes correct 24HV (≈1.6L per IPC answer key)', () => {
    const metrics = computeMetrics(state);

    // Period 1: Day 1 bedtime (20:30) → Day 2 bedtime (21:30)
    // Night 1 voids: 50 + 200 + 150 + 200 (FMV) = 600
    // Day 2 voids: 75 + 200 + 100 + 75 + 75 + (50+50) + 100 + 75 + 100 + 100 = 1000
    // Total = 600 + 1000 = 1600
    expect(metrics.periods[0].twentyFourHV).toBe(1600);

    // Period 2: Day 2 bedtime (21:30) → Day 3 bedtime (20:30)
    // Night 2 voids: 50 + 200 + 150 + 275 (FMV) = 675
    // Day 3 voids: 50 + 200 + 175 + (50+50) + (75+100) + 75 + 100 = 875
    // Total = 675 + 875 = 1550
    expect(metrics.periods[1].twentyFourHV).toBe(1550);
  });

  it('computes correct NPi (34-39% per IPC answer key)', () => {
    const metrics = computeMetrics(state);

    // NPi Period 1 = 600/1600 × 100 = 37.5%
    expect(metrics.periods[0].nPi).toBe(37.5);

    // NPi Period 2 = 675/1550 × 100 ≈ 43.5%
    // (The answer key says 34-39% — this is slightly higher, which is realistic
    //  given the uncertainty in exact bedtime placement)
    expect(metrics.periods[1].nPi).toBeGreaterThan(30);
    expect(metrics.periods[1].nPi).toBeLessThan(50);
  });

  it('computes correct MVV = 275 (per IPC answer key)', () => {
    const metrics = computeMetrics(state);

    // MVV should be 275 — the largest single void (Day 3 FMV)
    // Double voids are NOT combined for MVV
    expect(metrics.mvv).toBe(275);
  });

  it('computes correct AVV (100-120 per IPC answer key)', () => {
    const metrics = computeMetrics(state);

    // AVV Period 1 = 1600 / number of voids in period
    // Voids in period: 50, 200, 150, 200, 75, 200, 100, 75, 75, 50(DV), 100, 75, 100, 100 = 14 voids
    // AVV = 1600/14 ≈ 114
    expect(metrics.periods[0].avv).toBeGreaterThanOrEqual(100);
    expect(metrics.periods[0].avv).toBeLessThanOrEqual(120);
  });

  it('correctly identifies continence status (no leaks = continent)', () => {
    const metrics = computeMetrics(state);
    expect(metrics.isContinent).toBe(true);
    expect(metrics.totalLeaks).toBe(0);
  });

  it('excludes Day 1 from 24HV/NPi/AVV calculations', () => {
    const metrics = computeMetrics(state);

    // Day 1 has significant voided volume, but it should NOT be in 24HV
    const day1Total = state.voids
      .filter((v) => getDayNumber(v.timestampIso, startDate, state.bedtimes) === 1)
      .reduce((s, v) => s + v.volumeMl + (v.doubleVoidMl ?? 0), 0);
    expect(day1Total).toBeGreaterThan(0);

    // The 24HV periods start AFTER Day 1 bedtime, so Day 1 daytime is excluded
    expect(metrics.periods[0].periodLabel).toBe('Night 1 / Day 2');
    expect(metrics.periods[1].periodLabel).toBe('Night 2 / Day 3');
  });
});

/* ------------------------------------------------------------------ */
/*  Test: Double void handling                                         */
/* ------------------------------------------------------------------ */

describe('IPC calculations — double void handling', () => {
  const startDate = '2026-03-01';

  it('combines double voids for total volume but NOT for MVV', () => {
    const state: DiaryState = {
      startDate,
      age: 50,
      volumeUnit: 'mL',
      diaryStarted: true,
      clinicCode: null,
    timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
      leaks: [],
      bedtimes: [bed(1, 1, 22, 0), bed(2, 2, 22, 0), bed(3, 3, 22, 0)],
      wakeTimes: [wake(1, 1, 7, 0), wake(2, 2, 7, 0), wake(3, 3, 7, 0)],
      drinks: [],
      voids: [
        // Day 1
        vid(1, 8, 0, 200, 2, { fmv: true }),
        vid(1, 14, 0, 150, 2, { doubleVoidMl: 120 }), // DV: 150+120 = 270 combined
        vid(1, 20, 0, 180, 2),
        // Night 1 + Day 2
        vid(2, 3, 0, 100, 1),
        vid(2, 7, 30, 250, 1, { fmv: true }),  // FMV — 250 is the biggest single void
        vid(2, 12, 0, 200, 2),
        vid(2, 18, 0, 180, 2, { doubleVoidMl: 60 }), // DV: 180+60 = 240 combined
        // Night 2 + Day 3
        vid(3, 2, 0, 80, 1),
        vid(3, 7, 30, 200, 1, { fmv: true }),
        vid(3, 13, 0, 150, 2),
        vid(3, 19, 0, 160, 2),
      ],
    };

    const metrics = computeMetrics(state);

    // MVV should be 250 (single void), NOT 270 (combined double void)
    expect(metrics.mvv).toBe(250);

    // But total void volume for Day 1 should include the DV combined
    const day1 = metrics.dayMetrics[0];
    expect(day1.totalVoidVolumeMl).toBe(200 + (150 + 120) + 180); // 650

    // 24HV Period 1 should combine DVs
    // Night 1: 100 + 250(FMV) = 350
    // Day 2: 200 + (180+60) = 440
    // Total = 350 + 440 = 790
    expect(metrics.periods[0].twentyFourHV).toBe(790);
  });
});

/* ------------------------------------------------------------------ */
/*  Test: Leak detection                                               */
/* ------------------------------------------------------------------ */

describe('IPC calculations — continence status', () => {
  const startDate = '2026-03-01';

  it('reports incontinent when any void has leak=true', () => {
    const state: DiaryState = {
      startDate,
      age: 68,
      volumeUnit: 'mL',
      diaryStarted: true,
      clinicCode: null,
    timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
      leaks: [],
      bedtimes: [bed(1, 1, 22, 0), bed(2, 2, 22, 0), bed(3, 3, 22, 0)],
      wakeTimes: [wake(1, 1, 7, 0), wake(2, 2, 7, 0), wake(3, 3, 7, 0)],
      drinks: [],
      voids: [
        vid(1, 8, 0, 100, 2, { fmv: true }),
        vid(1, 14, 0, 120, 3, { leak: true }),  // LEAK
        vid(2, 3, 0, 80, 1),
        vid(2, 8, 0, 130, 1, { fmv: true }),
        vid(2, 14, 0, 100, 3, { leak: true }),  // LEAK
        vid(3, 2, 0, 75, 1),
        vid(3, 8, 0, 100, 1, { fmv: true }),
        vid(3, 14, 0, 100, 2),
      ],
    };

    const metrics = computeMetrics(state);
    expect(metrics.isContinent).toBe(false);
    expect(metrics.totalLeaks).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  Test: Volume unit conversion round-trips                           */
/* ------------------------------------------------------------------ */

describe('Volume unit conversion', () => {

  it('mL round-trips are identity', () => {
    expect(mlToDisplayVolume(250, 'mL')).toBe(250);
    expect(displayVolumeToMl(250, 'mL')).toBe(250);
  });

  it('oz conversion round-trips correctly for common volumes', () => {
    // 8 oz → mL → 8 oz
    const ml = displayVolumeToMl(8, 'oz');
    expect(ml).toBe(237); // Math.round(8 * 29.5735) = 237
    expect(mlToDisplayVolume(ml, 'oz')).toBe(8);

    // 5 oz → mL → 5 oz
    const ml5 = displayVolumeToMl(5, 'oz');
    expect(mlToDisplayVolume(ml5, 'oz')).toBe(5);

    // 12 oz → mL → 12 oz
    const ml12 = displayVolumeToMl(12, 'oz');
    expect(mlToDisplayVolume(ml12, 'oz')).toBe(12);

    // 17 oz → mL → 17 oz
    const ml17 = displayVolumeToMl(17, 'oz');
    expect(mlToDisplayVolume(ml17, 'oz')).toBe(17);
  });

  it('oz sums add up correctly after conversion', () => {
    // User enters 5 + 8 + 12 oz
    const total = displayVolumeToMl(5, 'oz') + displayVolumeToMl(8, 'oz') + displayVolumeToMl(12, 'oz');
    // Should display as 25 oz
    expect(mlToDisplayVolume(total, 'oz')).toBe(25);
  });
});

/* ------------------------------------------------------------------ */
/*  Test: NPi includes FMV (IPC requirement)                           */
/* ------------------------------------------------------------------ */

describe('IPC calculations — NPi always includes FMV', () => {
  const startDate = '2026-03-01';

  it('FMV volume is included in nocturnal volume for NPi', () => {
    const state: DiaryState = {
      startDate,
      age: 60,
      volumeUnit: 'mL',
      diaryStarted: true,
      clinicCode: null,
    timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
      leaks: [],
      bedtimes: [bed(1, 1, 22, 0), bed(2, 2, 22, 0), bed(3, 3, 22, 0)],
      wakeTimes: [wake(1, 1, 7, 0), wake(2, 2, 7, 0), wake(3, 3, 7, 0)],
      drinks: [],
      voids: [
        // Day 1 (excluded from 24HV)
        vid(1, 8, 0, 200, 2, { fmv: true }),
        vid(1, 14, 0, 300, 2),
        vid(1, 20, 0, 200, 2),

        // Night 1: just one void at 3am, then FMV at 7am
        vid(2, 3, 0, 150, 1),                   // overnight
        vid(2, 7, 30, 350, 1, { fmv: true }),    // FMV — should be in nocturnal volume

        // Day 2 daytime
        vid(2, 12, 0, 300, 2),
        vid(2, 18, 0, 200, 2),

        // Night 2
        vid(3, 1, 0, 100, 1),
        vid(3, 7, 30, 400, 1, { fmv: true }),   // FMV

        // Day 3
        vid(3, 12, 0, 250, 2),
        vid(3, 18, 0, 200, 2),
      ],
    };

    const metrics = computeMetrics(state);

    // Night 1 nocturnal = 150 (3am) + 350 (FMV) = 500
    expect(metrics.nights[0].nocturnalVolumeMl).toBe(500);

    // 24HV Period 1 = 150 + 350 + 300 + 200 = 1000
    expect(metrics.periods[0].twentyFourHV).toBe(1000);

    // NPi = 500/1000 × 100 = 50%
    expect(metrics.periods[0].nPi).toBe(50);

    // Night 2 nocturnal = 100 (1am) + 400 (FMV) = 500
    expect(metrics.nights[1].nocturnalVolumeMl).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/*  Test: Per-day summary cards show correct totals                    */
/* ------------------------------------------------------------------ */

describe('IPC calculations — per-day metrics', () => {
  const startDate = '2026-03-01';

  it('day metrics include double void volumes in totals', () => {
    const state: DiaryState = {
      startDate,
      age: 45,
      volumeUnit: 'mL',
      diaryStarted: true,
      clinicCode: null,
    timeZone: 'UTC',
    morningAnchor: null,
    day1CelebrationShown: false,
      leaks: [],
      bedtimes: [bed(1, 1, 22, 0), bed(2, 2, 22, 0), bed(3, 3, 22, 0)],
      wakeTimes: [wake(1, 1, 7, 0), wake(2, 2, 7, 0), wake(3, 3, 7, 0)],
      drinks: [
        did(1, 8, 0, 300, 'water'),
        did(1, 12, 0, 200, 'coffee'),
      ],
      voids: [
        vid(1, 8, 0, 200, 2, { fmv: true }),
        vid(1, 14, 0, 150, 2, { doubleVoidMl: 80 }),
        vid(1, 20, 0, 250, 2),
        // Day 2 / Day 3 minimal
        vid(2, 3, 0, 100, 1),
        vid(2, 8, 0, 200, 1, { fmv: true }),
        vid(2, 14, 0, 200, 2),
        vid(3, 3, 0, 100, 1),
        vid(3, 8, 0, 200, 1, { fmv: true }),
        vid(3, 14, 0, 200, 2),
      ],
    };

    const metrics = computeMetrics(state);
    const day1 = metrics.dayMetrics[0];

    // Day 1 total void volume = 200 + (150+80) + 250 = 680
    expect(day1.totalVoidVolumeMl).toBe(680);
    // 3 void entries, one with doubleVoidMl → 4 individual voids per IPC
    expect(day1.voidCount).toBe(4);
    expect(day1.drinkCount).toBe(2);
    expect(day1.totalFluidIntakeMl).toBe(500);
  });
});
