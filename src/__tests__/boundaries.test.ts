import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';
import { getDayNumber, getCurrentDay, getDayDate } from '@/lib/utils';
import type { BedtimeEntry } from '@/lib/types';

/**
 * Edge-case and boundary tests for the bladder diary.
 * Covers overnight bedtime logic, day clamping, and store
 * interactions that combine multiple operations.
 */

const START_DATE = '2026-03-08';

beforeEach(() => {
  useDiaryStore.getState().resetDiary();
  useDiaryStore.setState({ startDate: START_DATE });
});

// ──────────────────────────────────────────────
// Overnight bedtime boundaries (the core tricky logic)
// ──────────────────────────────────────────────
describe('overnight bedtime boundaries', () => {
  const bedtimes: BedtimeEntry[] = [
    { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
    { id: 'bt2', timestampIso: '2026-03-09T21:30:00.000Z', dayNumber: 2 },
  ];

  it('event 1 second after bedtime goes to next day', () => {
    expect(getDayNumber('2026-03-08T22:00:01.000Z', START_DATE, bedtimes)).toBe(2);
  });

  it('event exactly at bedtime stays on current day', () => {
    expect(getDayNumber('2026-03-08T22:00:00.000Z', START_DATE, bedtimes)).toBe(1);
  });

  it('3 AM event (after Day 1 bedtime, before Day 2 calendar) → Day 2', () => {
    expect(getDayNumber('2026-03-09T03:00:00.000Z', START_DATE, bedtimes)).toBe(2);
  });

  it('event after Day 2 bedtime goes to Day 3', () => {
    expect(getDayNumber('2026-03-09T22:00:00.000Z', START_DATE, bedtimes)).toBe(3);
  });

  it('late night event on Day 3 stays at Day 3 (max clamped)', () => {
    const allBedtimes: BedtimeEntry[] = [
      ...bedtimes,
      { id: 'bt3', timestampIso: '2026-03-10T22:00:00.000Z', dayNumber: 3 },
    ];
    expect(getDayNumber('2026-03-10T23:59:00.000Z', START_DATE, allBedtimes)).toBe(3);
  });
});

// ──────────────────────────────────────────────
// Day clamping edge cases
// ──────────────────────────────────────────────
describe('day clamping', () => {
  it('event weeks before start date clamps to Day 1', () => {
    expect(getDayNumber('2026-02-01T10:00:00.000Z', START_DATE)).toBe(1);
  });

  it('event weeks after start date clamps to Day 3', () => {
    expect(getDayNumber('2026-04-01T10:00:00.000Z', START_DATE)).toBe(3);
  });

  it('getCurrentDay clamps very old start dates to 3', () => {
    expect(getCurrentDay('2020-01-01')).toBe(3);
  });

  it('getCurrentDay clamps future start dates to 1', () => {
    expect(getCurrentDay('2030-01-01')).toBe(1);
  });
});

// ──────────────────────────────────────────────
// getDayDate round-trip consistency
// ──────────────────────────────────────────────
describe('getDayDate consistency', () => {
  it('getDayDate returns sequential dates', () => {
    expect(getDayDate(START_DATE, 1)).toBe('2026-03-08');
    expect(getDayDate(START_DATE, 2)).toBe('2026-03-09');
    expect(getDayDate(START_DATE, 3)).toBe('2026-03-10');
  });

  it('getDayNumber + getDayDate are consistent for daytime events', () => {
    for (let day = 1; day <= 3; day++) {
      const dateStr = getDayDate(START_DATE, day as 1 | 2 | 3);
      const eventIso = `${dateStr}T12:00:00.000Z`;
      expect(getDayNumber(eventIso, START_DATE)).toBe(day);
    }
  });
});

// ──────────────────────────────────────────────
// Store integration: bedtime sets + void attribution
// ──────────────────────────────────────────────
describe('store: bedtime-aware void attribution', () => {
  it('void added before bedtime stays on Day 1', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-08T20:00:00.000Z',
      volumeMl: 200,
      sensation: 2,
      leak: false,
      note: '',
      isFirstMorningVoid: false,
    });
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
  });

  it('void added after bedtime moves to Day 2', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-08T23:30:00.000Z',
      volumeMl: 150,
      sensation: 1,
      leak: false,
      note: '',
      isFirstMorningVoid: false,
    });
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(0);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
  });

  it('removing bedtime re-attributes voids to calendar day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-08T23:30:00.000Z',
      volumeMl: 150,
      sensation: 1,
      leak: false,
      note: '',
      isFirstMorningVoid: false,
    });
    // After bedtime → Day 2
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
    // Remove bedtime → back to calendar Day 1
    store.removeBedtime(1);
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// Store integration: full 3-day flow
// ──────────────────────────────────────────────
describe('store: full 3-day tracking flow', () => {
  it('tracks complete 3-day diary lifecycle', () => {
    const store = useDiaryStore.getState();
    store.setAge(65);
    store.startDiary();

    // Day 1
    store.setWakeTime(1, '2026-03-08T07:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-08T07:05:00.000Z',
      volumeMl: 300,
      sensation: 2,
      leak: false,
      note: '',
      isFirstMorningVoid: true,
    });
    store.addDrink({
      timestampIso: '2026-03-08T08:00:00.000Z',
      volumeMl: 250,
      drinkType: 'coffee',
      note: '',
    });
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');

    // Day 2
    store.setWakeTime(2, '2026-03-09T06:30:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-09T06:35:00.000Z',
      volumeMl: 250,
      sensation: 1,
      leak: false,
      note: '',
      isFirstMorningVoid: true,
    });
    store.setBedtime(2, '2026-03-09T21:30:00.000Z');

    // Day 3
    store.setWakeTime(3, '2026-03-10T07:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-10T07:05:00.000Z',
      volumeMl: 200,
      sensation: 2,
      leak: false,
      note: '',
      isFirstMorningVoid: true,
    });
    store.setBedtime(3, '2026-03-10T22:00:00.000Z');

    const s = useDiaryStore.getState();
    expect(s.diaryStarted).toBe(true);
    expect(s.age).toBe(65);
    expect(s.getVoidsForDay(1)).toHaveLength(1);
    expect(s.getVoidsForDay(2)).toHaveLength(1);
    expect(s.getVoidsForDay(3)).toHaveLength(1);
    expect(s.getDrinksForDay(1)).toHaveLength(1);
    expect(s.getBedtimeForDay(1)).toBeDefined();
    expect(s.getBedtimeForDay(2)).toBeDefined();
    expect(s.getBedtimeForDay(3)).toBeDefined();
    expect(s.getWakeTimeForDay(1)).toBeDefined();
    expect(s.getWakeTimeForDay(2)).toBeDefined();
    expect(s.getWakeTimeForDay(3)).toBeDefined();
    expect(s.hasData()).toBe(true);
  });
});

// ──────────────────────────────────────────────
// After-midnight events: stay on current day when no bedtime set
// (user still awake past midnight — any schedule)
// ──────────────────────────────────────────────
describe('after-midnight events without bedtime (all 3 days)', () => {
  // START_DATE = 2026-03-08 → Day 1 = Mar 8, Day 2 = Mar 9, Day 3 = Mar 10

  it('Day 1: 12:30 AM on Mar 9 stays on Day 1 when no bedtime set', () => {
    expect(getDayNumber('2026-03-09T00:30:00.000Z', START_DATE)).toBe(1);
  });

  it('Day 1: 3:00 AM on Mar 9 stays on Day 1 when no bedtime set', () => {
    expect(getDayNumber('2026-03-09T03:00:00.000Z', START_DATE)).toBe(1);
  });

  it('Day 1: 5:59 AM on Mar 9 stays on Day 1 when no bedtime set', () => {
    expect(getDayNumber('2026-03-09T05:59:00.000Z', START_DATE)).toBe(1);
  });

  it('Day 1: noon on Mar 9 moves to Day 2 (clearly past early-AM window)', () => {
    expect(getDayNumber('2026-03-09T18:00:00.000Z', START_DATE)).toBe(2);
  });

  it('Day 2: 1:00 AM on Mar 10 stays on Day 2 when no Day 2 bedtime', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
    ];
    expect(getDayNumber('2026-03-10T01:00:00.000Z', START_DATE, bedtimes)).toBe(2);
  });

  it('Day 2: 4:00 AM on Mar 10 stays on Day 2 when no Day 2 bedtime', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
    ];
    expect(getDayNumber('2026-03-10T04:00:00.000Z', START_DATE, bedtimes)).toBe(2);
  });

  it('Day 3: 2:00 AM on Mar 11 stays on Day 3 when no Day 3 bedtime', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
      { id: 'bt2', timestampIso: '2026-03-09T21:30:00.000Z', dayNumber: 2 },
    ];
    // Mar 11 = Day 3+1 date, but clamped to Day 3 first, then pull-back doesn't apply (dayNum=3 > 1 is true, but prevDay=2 has bedtime)
    // Actually: diff = 3 → dayNum = 3 (clamped). Early AM check: prevDay=2, bedtime exists → no pullback. Stays Day 3.
    expect(getDayNumber('2026-03-11T02:00:00.000Z', START_DATE, bedtimes)).toBe(3);
  });

  it('Day 1: 12:30 AM moves to Day 2 when Day 1 bedtime IS set', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
    ];
    // 12:30 AM on Mar 9 → dayNum = 2 by calendar. Day 1 has bedtime → no pull-back.
    expect(getDayNumber('2026-03-09T00:30:00.000Z', START_DATE, bedtimes)).toBe(2);
  });
});

describe('after-midnight store integration', () => {
  it('void at 1 AM on next calendar day shows on Day 1 when no bedtime', () => {
    const store = useDiaryStore.getState();
    store.setWakeTime(1, '2026-03-08T21:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-09T01:00:00.000Z', // 1 AM next day
      volumeMl: 200,
      sensation: 2,
      leak: false,
      note: '',
      isFirstMorningVoid: false,
    });
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
  });

  it('setting bedtime later re-attributes after-midnight void to Day 2', () => {
    const store = useDiaryStore.getState();
    store.setWakeTime(1, '2026-03-08T21:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-03-09T01:00:00.000Z',
      volumeMl: 200,
      sensation: 2,
      leak: false,
      note: '',
      isFirstMorningVoid: false,
    });
    // Before bedtime: on Day 1
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    // Set bedtime at 11 PM → void at 1 AM is after bedtime → moves to Day 2
    store.setBedtime(1, '2026-03-08T23:00:00.000Z');
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(0);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────
// Empty/edge selectors
// ──────────────────────────────────────────────
describe('selectors on empty store', () => {
  it('getVoidsForDay returns empty array', () => {
    expect(useDiaryStore.getState().getVoidsForDay(1)).toEqual([]);
  });

  it('getDrinksForDay returns empty array', () => {
    expect(useDiaryStore.getState().getDrinksForDay(1)).toEqual([]);
  });

  it('getBedtimeForDay returns undefined', () => {
    expect(useDiaryStore.getState().getBedtimeForDay(1)).toBeUndefined();
  });

  it('getWakeTimeForDay returns undefined', () => {
    expect(useDiaryStore.getState().getWakeTimeForDay(1)).toBeUndefined();
  });

  it('hasData returns false', () => {
    expect(useDiaryStore.getState().hasData()).toBe(false);
  });
});
