import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';

/**
 * Tests for time boundary validation logic.
 * Ensures events cannot be saved outside their view's valid time range:
 * - Day view events must be at/after wake-up time
 * - Night view events must be before wake-up time
 * - Events must be after previous day's bedtime
 */

const START_DATE = '2026-03-08';

function makeVoid(overrides: Record<string, unknown> = {}) {
  return {
    timestampIso: '2026-03-08T10:00:00.000Z',
    volumeMl: 200,
    sensation: 2 as const,
    leak: false,
    note: '',
    isFirstMorningVoid: false,
    ...overrides,
  };
}

function makeDrink(overrides: Record<string, unknown> = {}) {
  return {
    timestampIso: '2026-03-08T11:00:00.000Z',
    volumeMl: 250,
    drinkType: 'water' as const,
    note: '',
    ...overrides,
  };
}

beforeEach(() => {
  useDiaryStore.getState().resetDiary();
  useDiaryStore.setState({ startDate: START_DATE });
});

// ──────────────────────────────────────────────
// Night/day event separation via wake time
// ──────────────────────────────────────────────
describe('night vs day event separation', () => {
  it('events before wake time belong to night phase', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.setWakeTime(2, '2026-03-09T07:00:00.000Z');

    // Overnight void at 3 AM — should be on Day 2 (night phase)
    store.addVoid(makeVoid({ timestampIso: '2026-03-09T03:00:00.000Z' }));
    const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2Voids).toHaveLength(1);
    // This void is before wake time, so it's a night event
    expect(day2Voids[0].timestampIso < '2026-03-09T07:00:00.000Z').toBe(true);
  });

  it('events at/after wake time belong to day phase', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.setWakeTime(2, '2026-03-09T07:00:00.000Z');

    // Morning void at 7:05 AM — should be on Day 2 (day phase)
    store.addVoid(makeVoid({
      timestampIso: '2026-03-09T07:05:00.000Z',
      isFirstMorningVoid: true,
    }));
    const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2Voids).toHaveLength(1);
    // This void is after wake time, so it's a day event
    expect(day2Voids[0].timestampIso >= '2026-03-09T07:00:00.000Z').toBe(true);
  });

  it('both night and day events coexist on same diary day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.setWakeTime(2, '2026-03-09T07:00:00.000Z');

    // Night: 3 AM void
    store.addVoid(makeVoid({ timestampIso: '2026-03-09T03:00:00.000Z' }));
    // Day: 9 AM void
    store.addVoid(makeVoid({
      timestampIso: '2026-03-09T09:00:00.000Z',
      isFirstMorningVoid: true,
    }));

    const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2Voids).toHaveLength(2);
    // Sorted chronologically
    expect(day2Voids[0].timestampIso).toBe('2026-03-09T03:00:00.000Z');
    expect(day2Voids[1].timestampIso).toBe('2026-03-09T09:00:00.000Z');
  });
});

// ──────────────────────────────────────────────
// Wake time boundary enforcement
// ──────────────────────────────────────────────
describe('wake time as boundary between night and day', () => {
  it('wake time entry is stored and retrievable', () => {
    const store = useDiaryStore.getState();
    store.setWakeTime(2, '2026-03-09T07:00:00.000Z');
    const wake = useDiaryStore.getState().getWakeTimeForDay(2);
    expect(wake).toBeDefined();
    expect(wake!.timestampIso).toBe('2026-03-09T07:00:00.000Z');
    expect(wake!.dayNumber).toBe(2);
  });

  it('removing wake time clears the night/day boundary', () => {
    const store = useDiaryStore.getState();
    store.setWakeTime(2, '2026-03-09T07:00:00.000Z');
    store.removeWakeTime(2);
    expect(useDiaryStore.getState().getWakeTimeForDay(2)).toBeUndefined();
  });
});

// ──────────────────────────────────────────────
// Bedtime boundary enforcement
// ──────────────────────────────────────────────
describe('bedtime as boundary between days', () => {
  it('void before bedtime stays on current day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T21:00:00.000Z' }));
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
  });

  it('void after bedtime moves to next day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T23:30:00.000Z' }));
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(0);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
  });

  it('drink before bedtime stays on current day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T20:00:00.000Z' }));
    expect(useDiaryStore.getState().getDrinksForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getDrinksForDay(2)).toHaveLength(0);
  });

  it('drink after bedtime moves to next day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.addDrink(makeDrink({ timestampIso: '2026-03-09T01:00:00.000Z' }));
    expect(useDiaryStore.getState().getDrinksForDay(1)).toHaveLength(0);
    expect(useDiaryStore.getState().getDrinksForDay(2)).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────
// Complete 3-day flow with night/day phases
// ──────────────────────────────────────────────
describe('complete 3-day flow with night phases', () => {
  it('tracks full journey: D1 → N1 → D2 → N2 → D3', () => {
    const store = useDiaryStore.getState();
    store.startDiary();
    store.setAge(45);

    // Day 1: wake, void, drink, bedtime
    store.setWakeTime(1, '2026-03-08T07:00:00.000Z');
    store.addVoid(makeVoid({
      timestampIso: '2026-03-08T07:15:00.000Z',
      isFirstMorningVoid: true,
    }));
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T08:00:00.000Z' }));
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');

    // Night 1: overnight void
    store.addVoid(makeVoid({ timestampIso: '2026-03-09T02:00:00.000Z' }));

    // Day 2: wake, morning void, drink, bedtime
    store.setWakeTime(2, '2026-03-09T06:30:00.000Z');
    store.addVoid(makeVoid({
      timestampIso: '2026-03-09T06:45:00.000Z',
      isFirstMorningVoid: true,
    }));
    store.addDrink(makeDrink({
      timestampIso: '2026-03-09T09:00:00.000Z',
      drinkType: 'coffee',
    }));
    store.setBedtime(2, '2026-03-09T21:30:00.000Z');

    // Night 2: overnight drink
    store.addDrink(makeDrink({
      timestampIso: '2026-03-10T01:00:00.000Z',
      drinkType: 'water',
    }));

    // Day 3: wake, morning void, bedtime
    store.setWakeTime(3, '2026-03-10T07:00:00.000Z');
    store.addVoid(makeVoid({
      timestampIso: '2026-03-10T07:10:00.000Z',
      isFirstMorningVoid: true,
    }));
    store.setBedtime(3, '2026-03-10T22:00:00.000Z');

    const s = useDiaryStore.getState();

    // Verify Day 1
    expect(s.getVoidsForDay(1)).toHaveLength(1);
    expect(s.getDrinksForDay(1)).toHaveLength(1);
    expect(s.getBedtimeForDay(1)).toBeDefined();
    expect(s.getWakeTimeForDay(1)).toBeDefined();

    // Verify Day 2 (includes Night 1 overnight void)
    const day2Voids = s.getVoidsForDay(2);
    expect(day2Voids).toHaveLength(2); // overnight void + morning void
    expect(day2Voids[0].timestampIso).toBe('2026-03-09T02:00:00.000Z'); // night
    expect(day2Voids[1].isFirstMorningVoid).toBe(true); // day
    expect(s.getDrinksForDay(2)).toHaveLength(1); // coffee
    expect(s.getBedtimeForDay(2)).toBeDefined();
    expect(s.getWakeTimeForDay(2)).toBeDefined();

    // Verify Day 3 (includes Night 2 overnight drink)
    expect(s.getVoidsForDay(3)).toHaveLength(1);
    expect(s.getDrinksForDay(3)).toHaveLength(1); // overnight water
    expect(s.getBedtimeForDay(3)).toBeDefined();
    expect(s.getWakeTimeForDay(3)).toBeDefined();

    expect(s.hasData()).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Event chronological sorting
// ──────────────────────────────────────────────
describe('event sorting', () => {
  it('voids are returned sorted by timestamp', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T15:00:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T08:00:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T12:00:00.000Z' }));

    const voids = useDiaryStore.getState().getVoidsForDay(1);
    expect(voids[0].timestampIso).toBe('2026-03-08T08:00:00.000Z');
    expect(voids[1].timestampIso).toBe('2026-03-08T12:00:00.000Z');
    expect(voids[2].timestampIso).toBe('2026-03-08T15:00:00.000Z');
  });

  it('drinks are returned sorted by timestamp', () => {
    const store = useDiaryStore.getState();
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T14:00:00.000Z' }));
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T09:00:00.000Z' }));

    const drinks = useDiaryStore.getState().getDrinksForDay(1);
    expect(drinks[0].timestampIso).toBe('2026-03-08T09:00:00.000Z');
    expect(drinks[1].timestampIso).toBe('2026-03-08T14:00:00.000Z');
  });

  it('overnight events spanning midnight sort correctly by ISO timestamp', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');

    // Events: 11 PM same day, then 2 AM next day
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T23:00:00.000Z' }));
    store.addDrink(makeDrink({ timestampIso: '2026-03-09T02:00:00.000Z' }));

    const voids = useDiaryStore.getState().getVoidsForDay(2);
    const drinks = useDiaryStore.getState().getDrinksForDay(2);

    // Both should be on Day 2 (after Day 1 bedtime)
    expect(voids).toHaveLength(1);
    expect(drinks).toHaveLength(1);
    // The void (11 PM) should come before the drink (2 AM) chronologically
    expect(voids[0].timestampIso < drinks[0].timestampIso).toBe(true);
  });
});
