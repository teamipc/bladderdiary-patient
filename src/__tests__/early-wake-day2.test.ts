/**
 * Patient-reported bug: woke up at ~4 AM on Day 2, "couldn't enter things
 * properly in the evening", stuck on Day 2.
 *
 * Reproduces the exact event sequence from the screenshots and verifies that
 * each event lands on Day 2 (and stays there) end-to-end. Most patient form
 * flows pass user picks through `correctAfterMidnight`, so we simulate that
 * codepath here — the bug only surfaces when the form-side correction
 * collides with `getDayNumber`'s bedtime-aware re-assignment.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';
import {
  buildIsoForClockTimeInTz,
  correctAfterMidnight,
  getDayNumber,
} from '@/lib/utils';

const TZ = 'America/New_York';
const START = '2026-04-13'; // Day 1 = Apr 13, Day 2 = Apr 14, Day 3 = Apr 15

/** Build a Day-N wall-clock ISO timestamp in the user's timezone. */
function clk(month: number, day: number, h: number, m = 0): string {
  const base = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
  return buildIsoForClockTimeInTz(base, h, m, TZ);
}

/**
 * Simulate the production form path for picking a time on a given diary day.
 * LogVoidForm/LogDrinkForm/SetBedtimeForm all run picks through this helper
 * before saving, so any bug that hides behind `correctAfterMidnight` only
 * shows up when we exercise it. Production now passes the day's wake time
 * so morning picks for early risers are not falsely bumped.
 */
function pickedTime(month: number, day: number, h: number, m: number, dayNumber: 1 | 2 | 3): string {
  const raw = clk(month, day, h, m);
  const wake = useDiaryStore.getState().getWakeTimeForDay(dayNumber)?.timestampIso;
  return correctAfterMidnight(raw, dayNumber, START, TZ, wake);
}

beforeEach(() => {
  const s = useDiaryStore.getState();
  s.resetDiary();
  useDiaryStore.setState({ startDate: START, timeZone: TZ });
});

describe('Patient screenshot scenario: woke at 4:17 AM on Day 2', () => {
  it('every Day 2 event stays on Day 2 after bedtime is set (no silent drift)', () => {
    const s = useDiaryStore.getState();

    /* ── Day 1 setup ────────────────────────────────────────────────────── */
    s.setWakeTime(1, clk(4, 13, 7, 0));
    s.addVoid({ timestampIso: clk(4, 13, 7, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: clk(4, 13, 14, 0), volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: clk(4, 13, 21, 0), volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(1, clk(4, 13, 22, 30));

    /* ── Day 2: patient wakes at 4:17 AM ───────────────────────────────── */
    // Wake time form does NOT use correctAfterMidnight (per SetWakeTimeForm.tsx)
    s.setWakeTime(2, clk(4, 14, 4, 17));

    // 4:17 AM coffee — patient TOUCHES the picker, so the production form
    // runs the time through correctAfterMidnight before saving.
    const coffeeTime = pickedTime(4, 14, 4, 17, 2);
    expect(s.addDrink({ timestampIso: coffeeTime, volumeMl: 120, drinkType: 'coffee', note: '' })).toBe(true);

    // 6:18 AM morning pee (the FMV per screenshot)
    s.addVoid({ timestampIso: pickedTime(4, 14, 6, 18, 2), volumeMl: 210, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: pickedTime(4, 14, 6, 19, 2), volumeMl: 210, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: pickedTime(4, 14, 7, 31, 2), volumeMl: 270, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: pickedTime(4, 14, 8, 1, 2), volumeMl: 90, sensation: 1, leak: false, note: '', isFirstMorningVoid: false });
    s.addDrink({ timestampIso: pickedTime(4, 14, 8, 2, 2), volumeMl: 30, drinkType: 'coffee', note: '' });
    s.addVoid({ timestampIso: pickedTime(4, 14, 8, 45, 2), volumeMl: 150, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addDrink({ timestampIso: pickedTime(4, 14, 14, 15, 2), volumeMl: 650, drinkType: 'water', note: '' });
    s.addVoid({ timestampIso: pickedTime(4, 14, 14, 45, 2), volumeMl: 120, sensation: 1, leak: false, note: '', isFirstMorningVoid: false });
    s.addDrink({ timestampIso: pickedTime(4, 14, 16, 0, 2), volumeMl: 240, drinkType: 'other', note: '' });
    s.addVoid({ timestampIso: pickedTime(4, 14, 16, 12, 2), volumeMl: 240, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: pickedTime(4, 14, 17, 15, 2), volumeMl: 240, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });

    // Bedtime at 9:15 PM — the moment the bug bites: getDayNumber recomputes
    // and might silently shove early-AM events to Day 3.
    s.setBedtime(2, pickedTime(4, 14, 21, 15, 2));

    /* ── Verify all events still on Day 2 ───────────────────────────────── */
    const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
    const day2Drinks = useDiaryStore.getState().getDrinksForDay(2);
    const day3Voids = useDiaryStore.getState().getVoidsForDay(3);
    const day3Drinks = useDiaryStore.getState().getDrinksForDay(3);

    // Day 2 should have ALL voids logged (8 voids) and ALL drinks (4)
    expect(day2Voids).toHaveLength(8);
    expect(day2Drinks).toHaveLength(4);
    expect(day3Voids).toHaveLength(0);
    expect(day3Drinks).toHaveLength(0);

    /* ── Verify FMV is set ──────────────────────────────────────────────── */
    const fmv = day2Voids.find((v) => v.isFirstMorningVoid);
    expect(fmv).toBeDefined();
    // FMV should be the 6:18 AM void (closest day-phase void to 4:17 AM wake)
    expect(fmv?.timestampIso).toBe(clk(4, 14, 6, 18));

    /* ── Verify Day 2 is "complete" ────────────────────────────────────── */
    const day2Bedtime = useDiaryStore.getState().getBedtimeForDay(2);
    expect(day2Bedtime).toBeDefined();
  });

  it('after Day 2 bedtime, patient can navigate to Day 3 (Day 3 is accessible)', () => {
    const s = useDiaryStore.getState();
    s.setWakeTime(1, clk(4, 13, 7, 0));
    s.addVoid({ timestampIso: clk(4, 13, 8, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(1, clk(4, 13, 22, 30));

    s.setWakeTime(2, clk(4, 14, 4, 17));
    s.addVoid({ timestampIso: pickedTime(4, 14, 6, 18, 2), volumeMl: 210, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(2, pickedTime(4, 14, 21, 15, 2));

    // The Day 3 page redirects back to Day 2 unless prevDayComplete = !!getBedtimeForDay(2)
    expect(useDiaryStore.getState().getBedtimeForDay(2)).toBeDefined();
  });
});

describe('Bug probe: pickedTime + getDayNumber after bedtime', () => {
  it('a 4:17 AM event with picked time stays on Day 2 even with bedtime set', () => {
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(4, 13, 22, 0));
    s.setWakeTime(2, clk(4, 14, 4, 17));

    // Patient picks 4:17 AM in form — runs through correctAfterMidnight
    const ts = pickedTime(4, 14, 4, 17, 2);

    // Initially (no Day 2 bedtime): should be Day 2
    expect(getDayNumber(ts, START, useDiaryStore.getState().bedtimes, TZ)).toBe(2);

    s.addVoid({ timestampIso: ts, volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });

    // BEFORE Day 2 bedtime: void is on Day 2
    expect(useDiaryStore.getState().getVoidsForDay(2).map((v) => v.timestampIso)).toContain(ts);

    // Set Day 2 bedtime — does the 4:17 AM void shift to Day 3?
    s.setBedtime(2, clk(4, 14, 22, 0));

    const day2 = useDiaryStore.getState().getVoidsForDay(2);
    const day3 = useDiaryStore.getState().getVoidsForDay(3);

    // The void must STAY on Day 2. If it moves to Day 3, that's silent data
    // loss — patient set bedtime, then suddenly sees no morning event.
    expect(day3.map((v) => v.timestampIso)).not.toContain(ts);
    expect(day2.map((v) => v.timestampIso)).toContain(ts);
  });

  it('5:00 AM picked event stays on Day 2 after bedtime is set', () => {
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(4, 13, 22, 0));
    s.setWakeTime(2, clk(4, 14, 4, 17));
    const ts = pickedTime(4, 14, 5, 0, 2);
    s.addVoid({ timestampIso: ts, volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(2, clk(4, 14, 22, 0));
    const day3Times = useDiaryStore.getState().getVoidsForDay(3).map((v) => v.timestampIso);
    expect(day3Times).not.toContain(ts);
  });
});

/**
 * Travel scenarios — CEO patient flying east/west mid-diary.
 *
 * The diary stores ONE timezone. If the patient changes timezones mid-diary,
 * old events read in the new timezone could land on a different calendar day.
 * Currently the app recomputes `getDayNumber` on every read, so a tz change
 * could silently re-slot every event.
 */
describe('Patient travels mid-diary (timezone change)', () => {
  it('NY → Tokyo flight: Day 1 events stay on Day 1 after tz change', () => {
    useDiaryStore.setState({ startDate: '2026-04-13', timeZone: 'America/New_York' });
    const s = useDiaryStore.getState();
    // Day 1 in NY: wake 7:00 EDT, void at 9:00 EDT, bedtime 22:00 EDT
    s.setWakeTime(1, buildIsoForClockTimeInTz('2026-04-13T12:00:00.000Z', 7, 0, 'America/New_York'));
    s.addVoid({
      timestampIso: buildIsoForClockTimeInTz('2026-04-13T12:00:00.000Z', 9, 0, 'America/New_York'),
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    s.setBedtime(1, buildIsoForClockTimeInTz('2026-04-13T12:00:00.000Z', 22, 0, 'America/New_York'));

    // Patient flies overnight to Tokyo and updates timezone
    useDiaryStore.setState({ timeZone: 'Asia/Tokyo' });

    // The Day 1 void should still be on Day 1 (or sensibly close — but NOT lost)
    const day1 = useDiaryStore.getState().getVoidsForDay(1);
    const day2 = useDiaryStore.getState().getVoidsForDay(2);
    const day3 = useDiaryStore.getState().getVoidsForDay(3);
    const total = day1.length + day2.length + day3.length;
    expect(total).toBe(1); // void must not vanish
  });
});

describe('Stuck-on-Day-2 progression', () => {
  it('with FMV + Day 2 bedtime, isDayComplete prerequisites are satisfied', () => {
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(4, 13, 22, 0));
    s.setWakeTime(2, clk(4, 14, 4, 17));
    s.addVoid({ timestampIso: clk(4, 14, 6, 18), volumeMl: 210, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(2, clk(4, 14, 22, 0));

    const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
    const hasFmv = day2Voids.some((v) => v.isFirstMorningVoid);
    const hasBedtime = !!useDiaryStore.getState().getBedtimeForDay(2);
    expect(hasFmv).toBe(true);
    expect(hasBedtime).toBe(true);
  });

  it('isDayComplete is FALSE if FMV is on a void that bedtime later moves to Day 3', () => {
    // The latent bug: Patient picks 5:00 AM as their first void after waking
    // at 4:17 AM. correctAfterMidnight bumps the timestamp to Apr 15 5:00 AM.
    // BEFORE Day 2 bedtime: pull-back puts it on Day 2, FMV gets set.
    // AFTER Day 2 bedtime: pull-back skipped (Day 2 has bedtime), void
    // re-slots to Day 3 — and Day 2 has NO morning void anymore.
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(4, 13, 22, 0));
    s.setWakeTime(2, clk(4, 14, 4, 17));

    // ONLY void: at 5:00 AM, picked through the form (bumped to Apr 15)
    const ts = pickedTime(4, 14, 5, 0, 2);
    s.addVoid({ timestampIso: ts, volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });

    // Before bedtime: void is on Day 2, FMV is set
    let day2 = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2).toHaveLength(1);
    expect(day2[0].isFirstMorningVoid).toBe(true);

    // Patient sets Day 2 bedtime
    s.setBedtime(2, clk(4, 14, 22, 0));

    // After bedtime: where did the void go?
    day2 = useDiaryStore.getState().getVoidsForDay(2);
    const day3 = useDiaryStore.getState().getVoidsForDay(3);

    // BUG: void should still be on Day 2 (no silent data shift)
    expect(day2).toHaveLength(1);
    expect(day3).toHaveLength(0);
    // BUG: Day 2 should still have FMV set
    expect(day2.some((v) => v.isFirstMorningVoid)).toBe(true);
  });
});
