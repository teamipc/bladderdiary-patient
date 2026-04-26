/**
 * Observation generator: gentle, plain-English summary observations.
 *
 * Behavioral guardrails the tests lock in:
 *   - Cap at 2 observations (decision fatigue)
 *   - Skip patterns that aren't real (avoid false alarms)
 *   - Never fire on empty/sparse data
 *   - Phrase positively when possible (consistency, hydration)
 */
import { describe, it, expect } from 'vitest';
import { generateObservations } from '@/lib/observations';
import type { DiaryState } from '@/lib/types';

const TZ = 'America/New_York';
const START = '2026-04-13'; // Day 1 = Apr 13

function ts(month: number, day: number, h: number, m = 0): string {
  // Build EDT (UTC-4) timestamp manually for tests
  return new Date(Date.UTC(2026, month - 1, day, h + 4, m, 0)).toISOString();
}

function baseState(overrides: Partial<DiaryState> = {}): DiaryState {
  return {
    startDate: START,
    age: null,
    voids: [],
    drinks: [],
    leaks: [],
    bedtimes: [],
    wakeTimes: [],
    volumeUnit: 'mL',
    diaryStarted: true,
    clinicCode: null,
    timeZone: TZ,
    morningAnchor: null,
    day1CelebrationShown: true,
    ...overrides,
  };
}

describe('generateObservations: empty/sparse data', () => {
  it('returns empty array for an empty diary', () => {
    expect(generateObservations(baseState())).toEqual([]);
  });

  it('returns empty array when there is one drink and one void (too sparse)', () => {
    const s = baseState({
      drinks: [{ id: 'd1', timestampIso: ts(4, 13, 8), volumeMl: 200, drinkType: 'coffee', note: '' }],
      voids: [{ id: 'v1', timestampIso: ts(4, 13, 9), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false }],
    });
    expect(generateObservations(s)).toEqual([]);
  });
});

describe('generateObservations: caffeine to bathroom', () => {
  it('fires when ≥2 caffeine drinks are followed by a void within 2h', () => {
    const s = baseState({
      drinks: [
        { id: 'd1', timestampIso: ts(4, 13, 8), volumeMl: 200, drinkType: 'coffee', note: '' },
        { id: 'd2', timestampIso: ts(4, 14, 8), volumeMl: 200, drinkType: 'coffee', note: '' },
        { id: 'd3', timestampIso: ts(4, 15, 8), volumeMl: 200, drinkType: 'coffee', note: '' },
      ],
      voids: [
        { id: 'v1', timestampIso: ts(4, 13, 9, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v2', timestampIso: ts(4, 14, 9, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v3', timestampIso: ts(4, 15, 9, 45), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
      ],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'caffeineToBathroom')).toBe(true);
  });

  it('does NOT fire when caffeine drinks are not followed by voids', () => {
    const s = baseState({
      drinks: [
        { id: 'd1', timestampIso: ts(4, 13, 8), volumeMl: 200, drinkType: 'coffee', note: '' },
        { id: 'd2', timestampIso: ts(4, 14, 8), volumeMl: 200, drinkType: 'coffee', note: '' },
      ],
      voids: [
        // voids 5+ hours after the coffee — not a clear pattern
        { id: 'v1', timestampIso: ts(4, 13, 14, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v2', timestampIso: ts(4, 14, 14, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
      ],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'caffeineToBathroom')).toBe(false);
  });

  it('does NOT fire on a single caffeine drink (sample size too small)', () => {
    const s = baseState({
      drinks: [{ id: 'd1', timestampIso: ts(4, 13, 8), volumeMl: 200, drinkType: 'coffee', note: '' }],
      voids: [{ id: 'v1', timestampIso: ts(4, 13, 9, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false }],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'caffeineToBathroom')).toBe(false);
  });
});

describe('generateObservations: fluid timing', () => {
  it('fires "eveningFluids" when >40% of fluid volume is in evening', () => {
    const s = baseState({
      drinks: [
        { id: 'd1', timestampIso: ts(4, 13, 19, 0), volumeMl: 500, drinkType: 'water', note: '' },
        { id: 'd2', timestampIso: ts(4, 13, 20, 0), volumeMl: 500, drinkType: 'water', note: '' },
        { id: 'd3', timestampIso: ts(4, 14, 19, 0), volumeMl: 500, drinkType: 'water', note: '' },
        { id: 'd4', timestampIso: ts(4, 14, 8, 0), volumeMl: 200, drinkType: 'coffee', note: '' },
      ],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'eveningFluids')).toBe(true);
  });

  it('does NOT fire fluid-timing observation when drinks are spread evenly', () => {
    const s = baseState({
      drinks: [
        { id: 'd1', timestampIso: ts(4, 13, 8, 0), volumeMl: 200, drinkType: 'water', note: '' },
        { id: 'd2', timestampIso: ts(4, 13, 12, 0), volumeMl: 200, drinkType: 'water', note: '' },
        { id: 'd3', timestampIso: ts(4, 13, 16, 0), volumeMl: 200, drinkType: 'water', note: '' },
        { id: 'd4', timestampIso: ts(4, 13, 19, 0), volumeMl: 200, drinkType: 'water', note: '' },
      ],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'eveningFluids' || o.key === 'morningFluids')).toBe(false);
  });
});

describe('generateObservations: night wakings (gentle)', () => {
  it('fires "oneNightWaking" when patient got up exactly once', () => {
    const s = baseState({
      bedtimes: [
        { id: 'b1', timestampIso: ts(4, 13, 22, 0), dayNumber: 1 },
        { id: 'b2', timestampIso: ts(4, 14, 22, 0), dayNumber: 2 },
      ],
      wakeTimes: [
        { id: 'w2', timestampIso: ts(4, 14, 7, 0), dayNumber: 2 },
        { id: 'w3', timestampIso: ts(4, 15, 7, 0), dayNumber: 3 },
      ],
      voids: [
        { id: 'v1', timestampIso: ts(4, 14, 3, 0), volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false }, // nocturnal
      ],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'oneNightWaking')).toBe(true);
  });

  it('does NOT fire when the patient got up multiple times (defer to clinician)', () => {
    const s = baseState({
      bedtimes: [{ id: 'b1', timestampIso: ts(4, 13, 22, 0), dayNumber: 1 }],
      wakeTimes: [{ id: 'w2', timestampIso: ts(4, 14, 7, 0), dayNumber: 2 }],
      voids: [
        { id: 'v1', timestampIso: ts(4, 14, 1, 0), volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v2', timestampIso: ts(4, 14, 4, 0), volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
      ],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'oneNightWaking')).toBe(false);
  });
});

describe('generateObservations: positive framing', () => {
  it('fires "consistentPattern" when void counts are similar across days', () => {
    const s = baseState({
      bedtimes: [
        { id: 'b1', timestampIso: ts(4, 13, 22, 0), dayNumber: 1 },
        { id: 'b2', timestampIso: ts(4, 14, 22, 0), dayNumber: 2 },
        { id: 'b3', timestampIso: ts(4, 15, 22, 0), dayNumber: 3 },
      ],
      wakeTimes: [
        { id: 'w1', timestampIso: ts(4, 13, 7, 0), dayNumber: 1 },
        { id: 'w2', timestampIso: ts(4, 14, 7, 0), dayNumber: 2 },
        { id: 'w3', timestampIso: ts(4, 15, 7, 0), dayNumber: 3 },
      ],
      voids: [
        // Day 1: 4 voids
        { id: 'v1', timestampIso: ts(4, 13, 8, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
        { id: 'v2', timestampIso: ts(4, 13, 12, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v3', timestampIso: ts(4, 13, 16, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v4', timestampIso: ts(4, 13, 20, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        // Day 2: 4 voids
        { id: 'v5', timestampIso: ts(4, 14, 8, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
        { id: 'v6', timestampIso: ts(4, 14, 12, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v7', timestampIso: ts(4, 14, 16, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v8', timestampIso: ts(4, 14, 20, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        // Day 3: 4 voids
        { id: 'v9', timestampIso: ts(4, 15, 8, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: true },
        { id: 'v10', timestampIso: ts(4, 15, 12, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v11', timestampIso: ts(4, 15, 16, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v12', timestampIso: ts(4, 15, 20, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
      ],
    });
    const obs = generateObservations(s);
    expect(obs.some((o) => o.key === 'consistentPattern')).toBe(true);
  });
});

describe('generateObservations: cap at 2 (decision fatigue guard)', () => {
  it('returns at most 2 observations even when many patterns trigger', () => {
    const s = baseState({
      drinks: [
        { id: 'd1', timestampIso: ts(4, 13, 19, 0), volumeMl: 500, drinkType: 'coffee', note: '' },
        { id: 'd2', timestampIso: ts(4, 14, 19, 0), volumeMl: 500, drinkType: 'coffee', note: '' },
        { id: 'd3', timestampIso: ts(4, 15, 19, 0), volumeMl: 500, drinkType: 'tea', note: '' },
        { id: 'd4', timestampIso: ts(4, 13, 20, 0), volumeMl: 500, drinkType: 'water', note: '' },
      ],
      bedtimes: [{ id: 'b1', timestampIso: ts(4, 13, 23, 0), dayNumber: 1 }],
      wakeTimes: [{ id: 'w2', timestampIso: ts(4, 14, 7, 0), dayNumber: 2 }],
      voids: [
        // Caffeine-following voids
        { id: 'v1', timestampIso: ts(4, 13, 20, 0), volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v2', timestampIso: ts(4, 14, 20, 0), volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        { id: 'v3', timestampIso: ts(4, 15, 20, 0), volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false },
        // Single nocturnal void on Day 2
        { id: 'v4', timestampIso: ts(4, 14, 3, 0), volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false },
      ],
    });
    const obs = generateObservations(s);
    expect(obs.length).toBeLessThanOrEqual(2);
  });
});
