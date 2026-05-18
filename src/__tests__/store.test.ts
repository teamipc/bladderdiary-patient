import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import { useDiaryStore, migrateBladderDiaryState } from '@/lib/store';

/**
 * Store tests — exercises all Zustand actions and selectors.
 *
 * Uses direct store access via useDiaryStore.getState() / .setState()
 * rather than React component rendering (no need for @testing-library/react here).
 */

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const START_DATE = '2026-03-08';

/** Build a VoidEntry payload (without id). */
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

/** Build a DrinkEntry payload (without id). */
function makeDrink(overrides: Record<string, unknown> = {}) {
  return {
    timestampIso: '2026-03-08T11:00:00.000Z',
    volumeMl: 250,
    drinkType: 'water' as const,
    note: '',
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// Reset store before each test
// ──────────────────────────────────────────────
beforeEach(() => {
  const store = useDiaryStore.getState();
  store.resetDiary();
  // Set a fixed start date for deterministic day numbering
  useDiaryStore.setState({ startDate: START_DATE });
});

// ──────────────────────────────────────────────
// Setup actions
// ──────────────────────────────────────────────
describe('setup actions', () => {
  it('setStartDate updates startDate', () => {
    useDiaryStore.getState().setStartDate('2026-04-01');
    expect(useDiaryStore.getState().startDate).toBe('2026-04-01');
  });

  it('setAge updates age', () => {
    useDiaryStore.getState().setAge(65);
    expect(useDiaryStore.getState().age).toBe(65);
  });

  it('setVolumeUnit toggles unit', () => {
    useDiaryStore.getState().setVolumeUnit('oz');
    expect(useDiaryStore.getState().volumeUnit).toBe('oz');
    useDiaryStore.getState().setVolumeUnit('mL');
    expect(useDiaryStore.getState().volumeUnit).toBe('mL');
  });

  it('startDiary marks diary as started', () => {
    expect(useDiaryStore.getState().diaryStarted).toBe(false);
    useDiaryStore.getState().startDiary();
    expect(useDiaryStore.getState().diaryStarted).toBe(true);
  });

  it('setClinicCode stores clinic code', () => {
    useDiaryStore.getState().setClinicCode('ABC123');
    expect(useDiaryStore.getState().clinicCode).toBe('ABC123');
  });
});

// ──────────────────────────────────────────────
// Void actions
// ──────────────────────────────────────────────
describe('addVoid', () => {
  it('adds a void entry with generated id', () => {
    useDiaryStore.getState().addVoid(makeVoid());
    const voids = useDiaryStore.getState().voids;
    expect(voids).toHaveLength(1);
    expect(voids[0].id).toBeTruthy();
    expect(voids[0].volumeMl).toBe(200);
  });

  it('prevents duplicate voids at the same minute', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T10:05:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T10:05:30.000Z' })); // same minute
    expect(useDiaryStore.getState().voids).toHaveLength(1);
  });

  it('allows voids at different minutes', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T10:05:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T10:06:00.000Z' }));
    expect(useDiaryStore.getState().voids).toHaveLength(2);
  });

  it('auto-assigns FMV to the void closest to wake time', () => {
    const store = useDiaryStore.getState();
    // Set wake time first
    store.setWakeTime(1, '2026-03-08T06:30:00.000Z');
    // Add two voids — the 7:00 one is further from wake, the 6:35 one is closer
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T07:00:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T06:35:00.000Z' }));
    const voids = useDiaryStore.getState().getVoidsForDay(1);
    expect(voids).toHaveLength(2);
    // The 6:35 void (closer to 6:30 wake) should be FMV
    expect(voids.find(v => v.timestampIso.includes('06:35'))!.isFirstMorningVoid).toBe(true);
    expect(voids.find(v => v.timestampIso.includes('07:00'))!.isFirstMorningVoid).toBe(false);
  });
});

describe('updateVoid', () => {
  it('updates an existing void entry', () => {
    useDiaryStore.getState().addVoid(makeVoid());
    const id = useDiaryStore.getState().voids[0].id;
    useDiaryStore.getState().updateVoid(id, { volumeMl: 350, note: 'updated' });
    const updated = useDiaryStore.getState().voids[0];
    expect(updated.volumeMl).toBe(350);
    expect(updated.note).toBe('updated');
  });

  it('does not affect other entries', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T08:00:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T09:00:00.000Z' }));
    const id = useDiaryStore.getState().voids[0].id;
    useDiaryStore.getState().updateVoid(id, { volumeMl: 999 });
    expect(useDiaryStore.getState().voids[1].volumeMl).toBe(200);
  });
});

describe('removeVoid', () => {
  it('removes a void by id', () => {
    useDiaryStore.getState().addVoid(makeVoid());
    const id = useDiaryStore.getState().voids[0].id;
    useDiaryStore.getState().removeVoid(id);
    expect(useDiaryStore.getState().voids).toHaveLength(0);
  });
});

describe('markMorningVoid', () => {
  it('sets isFirstMorningVoid for the given id and clears others on same day', () => {
    const store = useDiaryStore.getState();
    store.setWakeTime(1, '2026-03-08T05:30:00.000Z');
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T06:00:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T07:00:00.000Z' }));
    // Auto-assigned FMV should be 6:00 (closest to 5:30 wake)
    expect(useDiaryStore.getState().voids[0].isFirstMorningVoid).toBe(true);
    // Manually override to mark the 7:00 void as morning void
    const voids = useDiaryStore.getState().voids;
    useDiaryStore.getState().markMorningVoid(voids[1].id, 1);
    const updated = useDiaryStore.getState().voids;
    expect(updated[0].isFirstMorningVoid).toBe(false);
    expect(updated[1].isFirstMorningVoid).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Drink actions
// ──────────────────────────────────────────────
describe('addDrink', () => {
  it('adds a drink entry with generated id', () => {
    useDiaryStore.getState().addDrink(makeDrink());
    const drinks = useDiaryStore.getState().drinks;
    expect(drinks).toHaveLength(1);
    expect(drinks[0].drinkType).toBe('water');
  });

  it('prevents duplicate drinks at the same minute', () => {
    const store = useDiaryStore.getState();
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T11:00:00.000Z' }));
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T11:00:45.000Z' }));
    expect(useDiaryStore.getState().drinks).toHaveLength(1);
  });

  it('allows drinks at different minutes', () => {
    const store = useDiaryStore.getState();
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T11:00:00.000Z' }));
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T11:01:00.000Z' }));
    expect(useDiaryStore.getState().drinks).toHaveLength(2);
  });
});

describe('updateDrink', () => {
  it('updates an existing drink entry', () => {
    useDiaryStore.getState().addDrink(makeDrink());
    const id = useDiaryStore.getState().drinks[0].id;
    useDiaryStore.getState().updateDrink(id, { drinkType: 'coffee', volumeMl: 180 });
    const updated = useDiaryStore.getState().drinks[0];
    expect(updated.drinkType).toBe('coffee');
    expect(updated.volumeMl).toBe(180);
  });
});

describe('removeDrink', () => {
  it('removes a drink by id', () => {
    useDiaryStore.getState().addDrink(makeDrink());
    const id = useDiaryStore.getState().drinks[0].id;
    useDiaryStore.getState().removeDrink(id);
    expect(useDiaryStore.getState().drinks).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// Bedtime actions
// ──────────────────────────────────────────────
describe('setBedtime / removeBedtime', () => {
  it('sets bedtime for a specific day', () => {
    useDiaryStore.getState().setBedtime(1, '2026-03-08T22:00:00.000Z');
    const bedtime = useDiaryStore.getState().getBedtimeForDay(1);
    expect(bedtime).toBeDefined();
    expect(bedtime!.timestampIso).toBe('2026-03-08T22:00:00.000Z');
    expect(bedtime!.dayNumber).toBe(1);
  });

  it('replaces bedtime if set again for same day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.setBedtime(1, '2026-03-08T23:00:00.000Z');
    expect(useDiaryStore.getState().bedtimes).toHaveLength(1);
    expect(useDiaryStore.getState().bedtimes[0].timestampIso).toBe('2026-03-08T23:00:00.000Z');
  });

  it('allows bedtimes on different days', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.setBedtime(2, '2026-03-09T21:30:00.000Z');
    expect(useDiaryStore.getState().bedtimes).toHaveLength(2);
  });

  it('removes bedtime for a specific day', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.setBedtime(2, '2026-03-09T21:30:00.000Z');
    store.removeBedtime(1);
    expect(useDiaryStore.getState().bedtimes).toHaveLength(1);
    expect(useDiaryStore.getState().bedtimes[0].dayNumber).toBe(2);
  });
});

// ──────────────────────────────────────────────
// Wake time actions
// ──────────────────────────────────────────────
describe('setWakeTime / removeWakeTime', () => {
  it('sets and retrieves wake time for a day', () => {
    useDiaryStore.getState().setWakeTime(1, '2026-03-08T07:00:00.000Z');
    const wake = useDiaryStore.getState().getWakeTimeForDay(1);
    expect(wake).toBeDefined();
    expect(wake!.timestampIso).toBe('2026-03-08T07:00:00.000Z');
  });

  it('replaces wake time if set again for same day', () => {
    const store = useDiaryStore.getState();
    store.setWakeTime(1, '2026-03-08T07:00:00.000Z');
    store.setWakeTime(1, '2026-03-08T06:30:00.000Z');
    expect(useDiaryStore.getState().wakeTimes).toHaveLength(1);
    expect(useDiaryStore.getState().wakeTimes[0].timestampIso).toBe('2026-03-08T06:30:00.000Z');
  });

  it('removes wake time for a specific day', () => {
    const store = useDiaryStore.getState();
    store.setWakeTime(1, '2026-03-08T07:00:00.000Z');
    store.removeWakeTime(1);
    expect(useDiaryStore.getState().wakeTimes).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────
// removeWakeTime FMV invariant (CRI-04)
// ──────────────────────────────────────────────
describe('removeWakeTime FMV invariant (CRI-04)', () => {
  it('Test A: setting wake after adding a void flags that void as FMV', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T11:30:00.000Z' }));
    store.setWakeTime(1, '2026-03-08T11:00:00.000Z');
    const voids = useDiaryStore.getState().voids;
    expect(voids).toHaveLength(1);
    expect(voids[0].isFirstMorningVoid).toBe(true);
  });

  it('Test B: removeWakeTime clears the FMV flag (the CRI-04 regression guard)', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T11:30:00.000Z' }));
    store.setWakeTime(1, '2026-03-08T11:00:00.000Z');
    // Sanity: FMV is set.
    expect(useDiaryStore.getState().voids[0].isFirstMorningVoid).toBe(true);
    // Action under test.
    store.removeWakeTime(1);
    // Assertion: the FMV flag MUST be cleared (was the bug under CRI-04).
    expect(useDiaryStore.getState().voids[0].isFirstMorningVoid).toBe(false);
    // And the wake itself is removed.
    expect(useDiaryStore.getState().wakeTimes).toHaveLength(0);
  });

  it('Test C: removing wake for Day 1 does not clear FMV on Day 2', () => {
    const store = useDiaryStore.getState();
    // Day 1: void + wake (sets Day 1 FMV).
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T11:30:00.000Z' }));
    store.setWakeTime(1, '2026-03-08T11:00:00.000Z');
    // Day 2: void + wake (sets Day 2 FMV).
    store.addVoid(makeVoid({ timestampIso: '2026-03-09T11:30:00.000Z' }));
    store.setWakeTime(2, '2026-03-09T11:00:00.000Z');
    const before = useDiaryStore.getState().voids;
    expect(before).toHaveLength(2);
    expect(before.find((v) => v.timestampIso.startsWith('2026-03-08'))?.isFirstMorningVoid).toBe(true);
    expect(before.find((v) => v.timestampIso.startsWith('2026-03-09'))?.isFirstMorningVoid).toBe(true);
    // Action: remove ONLY Day 1's wake.
    store.removeWakeTime(1);
    const after = useDiaryStore.getState().voids;
    // Day 1 FMV cleared.
    expect(after.find((v) => v.timestampIso.startsWith('2026-03-08'))?.isFirstMorningVoid).toBe(false);
    // Day 2 FMV preserved.
    expect(after.find((v) => v.timestampIso.startsWith('2026-03-09'))?.isFirstMorningVoid).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Day selectors (bedtime-aware boundaries)
// ──────────────────────────────────────────────
describe('getVoidsForDay', () => {
  it('returns voids attributed to the correct day', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T10:00:00.000Z' })); // Day 1
    store.addVoid(makeVoid({ timestampIso: '2026-03-09T10:00:00.000Z' })); // Day 2
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
  });

  it('returns voids sorted by timestamp', () => {
    const store = useDiaryStore.getState();
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T15:00:00.000Z' }));
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T08:00:00.000Z' }));
    const day1 = useDiaryStore.getState().getVoidsForDay(1);
    expect(day1[0].timestampIso).toBe('2026-03-08T08:00:00.000Z');
    expect(day1[1].timestampIso).toBe('2026-03-08T15:00:00.000Z');
  });

  it('uses bedtime boundaries for overnight attribution', () => {
    const store = useDiaryStore.getState();
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    // Void after Day 1 bedtime → should go to Day 2
    store.addVoid(makeVoid({ timestampIso: '2026-03-08T23:00:00.000Z' }));
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(0);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
  });
});

describe('getDrinksForDay', () => {
  it('returns drinks attributed to the correct day', () => {
    const store = useDiaryStore.getState();
    store.addDrink(makeDrink({ timestampIso: '2026-03-08T11:00:00.000Z' })); // Day 1
    store.addDrink(makeDrink({ timestampIso: '2026-03-09T11:00:00.000Z' })); // Day 2
    expect(useDiaryStore.getState().getDrinksForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getDrinksForDay(2)).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────
// hasData
// ──────────────────────────────────────────────
describe('hasData', () => {
  it('returns false when no data', () => {
    expect(useDiaryStore.getState().hasData()).toBe(false);
  });

  it('returns true when voids exist', () => {
    useDiaryStore.getState().addVoid(makeVoid());
    expect(useDiaryStore.getState().hasData()).toBe(true);
  });

  it('returns true when drinks exist', () => {
    useDiaryStore.getState().addDrink(makeDrink());
    expect(useDiaryStore.getState().hasData()).toBe(true);
  });

  it('returns true when bedtimes exist', () => {
    useDiaryStore.getState().setBedtime(1, '2026-03-08T22:00:00.000Z');
    expect(useDiaryStore.getState().hasData()).toBe(true);
  });
});

// ──────────────────────────────────────────────
// resetDiary
// ──────────────────────────────────────────────
describe('resetDiary', () => {
  it('clears all entries and resets state', () => {
    const store = useDiaryStore.getState();
    store.startDiary();
    store.setAge(65);
    store.addVoid(makeVoid());
    store.addDrink(makeDrink());
    store.setBedtime(1, '2026-03-08T22:00:00.000Z');
    store.setWakeTime(1, '2026-03-08T07:00:00.000Z');

    store.resetDiary();
    const s = useDiaryStore.getState();
    expect(s.diaryStarted).toBe(false);
    expect(s.age).toBeNull();
    expect(s.voids).toHaveLength(0);
    expect(s.drinks).toHaveLength(0);
    expect(s.bedtimes).toHaveLength(0);
    expect(s.wakeTimes).toHaveLength(0);
    expect(s.clinicCode).toBeNull();
  });

  it('sets startDate to today', () => {
    useDiaryStore.getState().resetDiary();
    // resetDiary uses format(new Date(), 'yyyy-MM-dd') which is local time
    const today = format(new Date(), 'yyyy-MM-dd');
    expect(useDiaryStore.getState().startDate).toBe(today);
  });
});

// ──────────────────────────────────────────────
// migrateBladderDiaryState
// ──────────────────────────────────────────────
describe('migrateBladderDiaryState', () => {
  it('v0 snapshot: initializes timeZone, morningAnchor flag, and all array fields', () => {
    const v0 = { age: 65, startDate: '2026-01-01' };
    const result = migrateBladderDiaryState(v0, 0) as unknown as Record<string, unknown>;
    expect(result.voids).toEqual([]);
    expect(result.drinks).toEqual([]);
    expect(result.leaks).toEqual([]);
    expect(result.bedtimes).toEqual([]);
    expect(result.wakeTimes).toEqual([]);
    expect(typeof result.timeZone).toBe('string');
    expect(result.morningAnchor).toBeNull();
    expect(result.day1CelebrationShown).toBe(false);
  });

  it('v1 snapshot: preserves timeZone, initializes v2 fields and all array fields', () => {
    const v1 = { age: 65, startDate: '2026-01-01', timeZone: 'America/New_York' };
    const result = migrateBladderDiaryState(v1, 1) as unknown as Record<string, unknown>;
    expect(result.voids).toEqual([]);
    expect(result.drinks).toEqual([]);
    expect(result.leaks).toEqual([]);
    expect(result.bedtimes).toEqual([]);
    expect(result.wakeTimes).toEqual([]);
    expect(result.timeZone).toBe('America/New_York');
    expect(result.morningAnchor).toBeNull();
    expect(result.day1CelebrationShown).toBe(false);
  });
});

// ──────────────────────────────────────────────
// migrateBladderDiaryState — v2 → v3 backend swap
// ──────────────────────────────────────────────
describe('migrateBladderDiaryState — v2 → v3 backend swap', () => {
  const STORE_KEY = 'bladder-diary-patient';

  afterEach(async () => {
    const { del: idbDel } = await import('idb-keyval');
    try { await idbDel(STORE_KEY); } catch {}
    try { localStorage.removeItem(STORE_KEY); } catch {}
  });

  it('v2 snapshot: preserves all fields — backend swap is a no-op for state shape', () => {
    const v2 = {
      age: 65,
      startDate: '2026-01-01',
      timeZone: 'America/New_York',
      voids: [{ id: 'v1', timestampIso: '2026-01-01T10:00:00.000Z', volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false }],
      drinks: [],
      leaks: [],
      bedtimes: [],
      wakeTimes: [{ id: 'w1', timestampIso: '2026-01-01T07:00:00.000Z', dayNumber: 1 }],
      morningAnchor: 'wake',
      day1CelebrationShown: true,
    };
    const result = migrateBladderDiaryState(v2, 2) as unknown as Record<string, unknown>;
    expect(result.age).toBe(65);
    expect(result.timeZone).toBe('America/New_York');
    expect(result.morningAnchor).toBe('wake');
    expect(result.day1CelebrationShown).toBe(true);
    expect((result.voids as unknown[]).length).toBe(1);
    expect((result.wakeTimes as unknown[]).length).toBe(1);
  });

  it('v2 localStorage blob is migrated to IndexedDB on first adapter read; localStorage is cleared', async () => {
    const { get: idbGet, del: idbDelKey } = await import('idb-keyval');

    // Clear IDB first — importing store.ts causes the persist middleware to write
    // the initial state to IDB as a side effect of module initialization.
    await idbDelKey(STORE_KEY);

    const v2Blob = JSON.stringify({
      state: { age: 65, startDate: '2026-01-01', voids: [], drinks: [], leaks: [], bedtimes: [], wakeTimes: [], volumeUnit: 'mL', diaryStarted: true, clinicCode: null, timeZone: 'America/New_York', morningAnchor: 'wake', day1CelebrationShown: true },
      version: 2
    });
    localStorage.setItem(STORE_KEY, v2Blob);

    // Confirm IDB is now empty (migration path should trigger)
    expect(await idbGet(STORE_KEY)).toBeUndefined();

    // Drive the adapter
    const { createIndexedDbStorage } = await import('@/lib/storage/indexedDbAdapter');
    const storage = createIndexedDbStorage();
    const read = await storage.getItem(STORE_KEY);

    // The localStorage value was returned (this is what hydration would receive)
    expect(read).toBe(v2Blob);
    // localStorage has been cleared
    expect(localStorage.getItem(STORE_KEY)).toBeNull();
    // IDB now holds the value
    expect(await idbGet(STORE_KEY)).toBe(v2Blob);

    // Second read goes straight from IDB
    const read2 = await storage.getItem(STORE_KEY);
    expect(read2).toBe(v2Blob);
    // localStorage stays clear
    expect(localStorage.getItem(STORE_KEY)).toBeNull();
  });
});
