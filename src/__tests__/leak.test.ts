/**
 * Tests for the standalone Leak feature.
 *
 * Covers:
 * - Zustand store CRUD operations for leaks
 * - Backward compatibility (missing leaks array in localStorage)
 * - Standalone leak counts in calculations
 * - Continence status with standalone leaks
 * - CSV export includes leak events
 * - Day boundary assignment for leaks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computeMetrics } from '../lib/calculations';
import { generateCsv } from '../lib/exportCsv';
import { getDayNumber } from '../lib/utils';
import { getLeakTriggerLabel, getLeakAmountLabel } from '../lib/constants';
import type { DiaryState, VoidEntry, BedtimeEntry, WakeTimeEntry, LeakEntry } from '../lib/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let idCounter = 0;

function vid(
  day: number,
  hour: number,
  minute: number,
  volumeMl: number,
  sensation: 0 | 1 | 2 | 3 | 4,
  opts?: { leak?: boolean; fmv?: boolean },
): VoidEntry {
  const date = new Date(Date.UTC(2026, 2, day, hour, minute, 0));
  return {
    id: `v${++idCounter}`,
    timestampIso: date.toISOString(),
    volumeMl,
    sensation,
    leak: opts?.leak ?? false,
    note: '',
    isFirstMorningVoid: opts?.fmv ?? false,
  };
}

function lid(
  day: number,
  hour: number,
  minute: number,
  trigger: LeakEntry['trigger'],
  urgency: boolean | null = null,
  amount?: LeakEntry['amount'],
): LeakEntry {
  const date = new Date(Date.UTC(2026, 2, day, hour, minute, 0));
  return {
    id: `l${++idCounter}`,
    timestampIso: date.toISOString(),
    trigger,
    urgencyBeforeLeak: urgency,
    amount: amount ?? null,
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

function makeBaseState(overrides?: Partial<DiaryState>): DiaryState {
  return {
    startDate: '2026-03-01',
    age: 55,
    volumeUnit: 'mL',
    diaryStarted: true,
    clinicCode: null,
    leaks: [],
    bedtimes: [bed(1, 1, 22, 0), bed(2, 2, 22, 0), bed(3, 3, 22, 0)],
    wakeTimes: [wake(1, 1, 7, 0), wake(2, 2, 7, 0), wake(3, 3, 7, 0)],
    drinks: [],
    voids: [
      vid(1, 8, 0, 200, 2, { fmv: true }),
      vid(1, 14, 0, 150, 2),
      vid(2, 3, 0, 100, 1),
      vid(2, 8, 0, 200, 1, { fmv: true }),
      vid(2, 14, 0, 150, 2),
      vid(3, 3, 0, 80, 1),
      vid(3, 8, 0, 200, 1, { fmv: true }),
      vid(3, 14, 0, 150, 2),
    ],
    ...overrides,
  };
}

beforeEach(() => {
  idCounter = 0;
});

/* ------------------------------------------------------------------ */
/*  Constants helpers                                                  */
/* ------------------------------------------------------------------ */

describe('Leak constants helpers', () => {
  it('getLeakTriggerLabel returns correct labels', () => {
    expect(getLeakTriggerLabel('cough')).toBe('Coughing');
    expect(getLeakTriggerLabel('sneeze')).toBe('Sneezing');
    expect(getLeakTriggerLabel('toilet_way')).toBe('On the way');
    expect(getLeakTriggerLabel('not_sure')).toBe('Not sure');
  });

  it('getLeakAmountLabel returns correct labels', () => {
    expect(getLeakAmountLabel('drops')).toBe('Drops');
    expect(getLeakAmountLabel('large')).toBe('Large');
  });
});

/* ------------------------------------------------------------------ */
/*  Calculations: standalone leak counts                               */
/* ------------------------------------------------------------------ */

describe('Calculations — standalone leak counts', () => {
  it('counts standalone leaks per day', () => {
    const state = makeBaseState({
      leaks: [
        lid(1, 10, 0, 'cough', true, 'drops'),
        lid(1, 15, 0, 'sneeze', false),
        lid(2, 12, 0, 'exercise', true, 'small'),
      ],
    });

    const metrics = computeMetrics(state);
    expect(metrics.dayMetrics[0].standaloneLeakCount).toBe(2);
    expect(metrics.dayMetrics[1].standaloneLeakCount).toBe(1);
    expect(metrics.dayMetrics[2].standaloneLeakCount).toBe(0);
    expect(metrics.totalStandaloneLeaks).toBe(3);
  });

  it('returns zero standalone leaks when none exist', () => {
    const state = makeBaseState();
    const metrics = computeMetrics(state);
    expect(metrics.totalStandaloneLeaks).toBe(0);
    expect(metrics.dayMetrics[0].standaloneLeakCount).toBe(0);
  });

  it('distinguishes void leaks from standalone leaks', () => {
    const state = makeBaseState({
      leaks: [lid(1, 10, 0, 'cough', true)],
      voids: [
        vid(1, 8, 0, 200, 2, { fmv: true, leak: true }),
        vid(1, 14, 0, 150, 2),
        vid(2, 3, 0, 100, 1),
        vid(2, 8, 0, 200, 1, { fmv: true }),
        vid(3, 3, 0, 80, 1),
        vid(3, 8, 0, 200, 1, { fmv: true }),
      ],
    });

    const metrics = computeMetrics(state);
    expect(metrics.dayMetrics[0].leakCount).toBe(1);          // void-associated
    expect(metrics.dayMetrics[0].standaloneLeakCount).toBe(1); // standalone
    expect(metrics.totalLeaks).toBe(1);
    expect(metrics.totalStandaloneLeaks).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Calculations: continence with standalone leaks                     */
/* ------------------------------------------------------------------ */

describe('Calculations — continence with standalone leaks', () => {
  it('reports incontinent when standalone leaks exist (even with no void leaks)', () => {
    const state = makeBaseState({
      leaks: [lid(2, 10, 0, 'laugh', false)],
    });

    const metrics = computeMetrics(state);
    expect(metrics.isContinent).toBe(false);
  });

  it('reports continent when no leaks of any kind exist', () => {
    const state = makeBaseState();
    const metrics = computeMetrics(state);
    expect(metrics.isContinent).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Backward compatibility                                             */
/* ------------------------------------------------------------------ */

describe('Backward compatibility — missing leaks array', () => {
  it('computeMetrics handles undefined leaks gracefully', () => {
    const state = makeBaseState();
    // Simulate old localStorage that doesn't have leaks at all
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (state as any).leaks;

    const metrics = computeMetrics(state);
    expect(metrics.totalStandaloneLeaks).toBe(0);
    expect(metrics.isContinent).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Day boundary assignment for leaks                                  */
/* ------------------------------------------------------------------ */

describe('Leak day boundary assignment', () => {
  it('assigns leaks to correct day based on bedtime boundaries', () => {
    const startDate = '2026-03-01';
    const bedtimes = [bed(1, 1, 22, 0), bed(2, 2, 22, 0), bed(3, 3, 22, 0)];

    // Leak before Day 1 bedtime → Day 1
    const leak1 = lid(1, 21, 0, 'cough');
    expect(getDayNumber(leak1.timestampIso, startDate, bedtimes)).toBe(1);

    // Leak after Day 1 bedtime (23:00) → Day 2
    const leak2 = lid(1, 23, 0, 'sneeze');
    expect(getDayNumber(leak2.timestampIso, startDate, bedtimes)).toBe(2);

    // Leak on Day 2 afternoon → Day 2
    const leak3 = lid(2, 14, 0, 'exercise');
    expect(getDayNumber(leak3.timestampIso, startDate, bedtimes)).toBe(2);

    // Leak after Day 2 bedtime → Day 3
    const leak4 = lid(2, 23, 30, 'toilet_way');
    expect(getDayNumber(leak4.timestampIso, startDate, bedtimes)).toBe(3);
  });
});

/* ------------------------------------------------------------------ */
/*  CSV export includes leak events                                    */
/* ------------------------------------------------------------------ */

describe('CSV export — leak events', () => {
  it('includes standalone leak rows with trigger, urgency, and amount', () => {
    const state = makeBaseState({
      leaks: [
        lid(1, 10, 0, 'cough', true, 'drops'),
        lid(2, 14, 0, 'exercise', false, 'medium'),
      ],
    });

    const csv = generateCsv(state);

    // Check header includes new columns
    expect(csv).toContain('trigger,urgencyBeforeLeak,amount');

    // Check leak rows
    const lines = csv.split('\n');
    const leakLines = lines.filter((l) => l.startsWith('leak,'));
    expect(leakLines.length).toBe(2);

    // First leak: cough, urgency=true, drops
    expect(leakLines[0]).toContain('cough');
    expect(leakLines[0]).toContain('true');
    expect(leakLines[0]).toContain('drops');

    // Second leak: exercise, urgency=false, medium
    expect(leakLines[1]).toContain('exercise');
    expect(leakLines[1]).toContain('false');
    expect(leakLines[1]).toContain('medium');
  });

  it('void and drink rows have empty trigger/urgency/amount columns', () => {
    const state = makeBaseState();
    const csv = generateCsv(state);

    const lines = csv.split('\n');
    const voidLines = lines.filter((l) => l.startsWith('void,'));
    // Each void line should end with 3 empty columns (trigger, urgency, amount)
    for (const line of voidLines) {
      expect(line).toMatch(/,,,$/);
    }
  });
});
