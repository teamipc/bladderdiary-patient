/**
 * Two patient-reported bugs about clock-time picks resolving to the wrong
 * calendar date:
 *
 *   Bug A: After a 10:30 PM bedtime, picking "12:00 AM" (or any AM time)
 *          as the wake-up failed validation with "must be after last
 *          night's bedtime at 10:30 PM". The patient's mental model is
 *          that wake-up is always between bedtime and the next bedtime,
 *          regardless of midnight. The picker was leaving the date on
 *          the form's anchor (which sat before the bedtime crossed
 *          midnight in UTC), so the timestamp evaluated as < bedtime.
 *
 *   Bug B: On Day 1 with wake at 7 AM, picking "4:00 AM" for a void
 *          silently bumped the timestamp to the next calendar day and
 *          saved without warning. The patient's intent — "I peed at 4 AM
 *          before I woke" — was effectively lost: validation didn't fire,
 *          the event landed on a wrong date.
 *
 * Both fixes are time-only changes in the form helpers; the store is
 * unchanged. These tests lock the new behavior so we don't regress.
 */
import { describe, it, expect } from 'vitest';
import {
  advanceIsoToAfter,
  buildIsoForClockTimeInTz,
  correctAfterMidnight,
  getDateInTz,
  getDayNumber,
} from '@/lib/utils';
import { useDiaryStore } from '@/lib/store';

const TZ = 'America/New_York';
const START = '2026-04-13'; // Day 1 = Apr 13, Day 2 = Apr 14

function clk(month: number, day: number, h: number, m = 0): string {
  const base = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
  return buildIsoForClockTimeInTz(base, h, m, TZ);
}

describe('Bug A: wake-time clock picks after a 10:30 PM bedtime', () => {
  // SetWakeTimeForm runs the picked ISO through advanceIsoToAfter when it
  // lands at-or-before the previous bedtime — emulates what the form does.
  function pickWake(rawIso: string, prevBedtimeIso: string): string {
    if (rawIso <= prevBedtimeIso) return advanceIsoToAfter(rawIso, prevBedtimeIso, TZ);
    return rawIso;
  }

  it('"12:00 AM" picked after 10:30 PM bedtime resolves to the morning AFTER bedtime', () => {
    const bedtime = clk(4, 13, 22, 30); // 10:30 PM EDT Apr 13
    const rawPick = clk(4, 14, 0, 0);   // 12:00 AM EDT Apr 14 — already after
    const wake = pickWake(rawPick, bedtime);
    expect(wake > bedtime).toBe(true);
    expect(getDateInTz(wake, TZ)).toBe('2026-04-14');
  });

  it('"12:00 AM" picked while form sits on Day 1 calendar date advances to Day 2', () => {
    // The form's anchor is on Day 1's date (Apr 13). User types 0:00.
    // Picker emits Apr 13 0:00 (i.e. start of Day 1). That's BEFORE bedtime.
    const bedtime = clk(4, 13, 22, 30);
    const rawPick = clk(4, 13, 0, 0); // Apr 13 0:00 EDT — picker stayed on anchor date
    expect(rawPick < bedtime).toBe(true);
    const wake = pickWake(rawPick, bedtime);
    // Must advance to a date where the clock time is after bedtime
    expect(wake > bedtime).toBe(true);
    expect(getDateInTz(wake, TZ)).toBe('2026-04-14');
  });

  it('"8:35 AM" picked: lands on the morning after bedtime regardless of anchor', () => {
    const bedtime = clk(4, 13, 22, 30);
    // Picker's anchor on Day 1, typed 8:35 → Apr 13 8:35 EDT
    const rawPick = clk(4, 13, 8, 35);
    const wake = pickWake(rawPick, bedtime);
    expect(wake > bedtime).toBe(true);
    expect(getDateInTz(wake, TZ)).toBe('2026-04-14');
  });

  it('"7:00 AM" already-after picks pass through unchanged', () => {
    const bedtime = clk(4, 13, 22, 30);
    const rawPick = clk(4, 14, 7, 0); // already on Apr 14
    const wake = pickWake(rawPick, bedtime);
    expect(wake).toBe(rawPick); // no advance needed
  });

  it('idempotent: advancing twice yields the same result', () => {
    const bedtime = clk(4, 13, 22, 30);
    const rawPick = clk(4, 13, 0, 0);
    const once = advanceIsoToAfter(rawPick, bedtime, TZ);
    const twice = advanceIsoToAfter(once, bedtime, TZ);
    expect(twice).toBe(once);
  });

  it('SGT patient: 22:30 SGT bedtime + 6:00 AM pick lands on next morning SGT', () => {
    const bedtime = '2026-04-13T14:30:00.000Z'; // 22:30 SGT Apr 13
    // Picker emits Apr 13 6:00 SGT = Apr 12 22:00 UTC (before bedtime)
    const rawPick = '2026-04-12T22:00:00.000Z';
    const wake = advanceIsoToAfter(rawPick, bedtime, 'Asia/Singapore');
    expect(wake > bedtime).toBe(true);
    expect(getDateInTz(wake, 'Asia/Singapore')).toBe('2026-04-14');
  });
});

describe('Bug B: event picks before wake should not silently bump to next day', () => {
  // LogVoidForm/LogDrinkForm/LogLeakForm now pass intent: 'event'.
  function pickEvent(rawIso: string, dayNumber: 1 | 2 | 3, wakeIso?: string): string {
    return correctAfterMidnight(rawIso, dayNumber, START, TZ, wakeIso, 'event');
  }
  function pickBedtime(rawIso: string, dayNumber: 1 | 2 | 3, wakeIso?: string): string {
    return correctAfterMidnight(rawIso, dayNumber, START, TZ, wakeIso /* default 'bedtime' */);
  }

  it('event pick at 4:00 AM with wake 7 AM: stays on the day (so isBeforeWakeTime fires)', () => {
    const wake = clk(4, 13, 7, 0);
    const rawPick = clk(4, 13, 4, 0); // 4 AM Apr 13 EDT
    const corrected = pickEvent(rawPick, 1, wake);
    // Must NOT bump — keep on Apr 13 so the form's isBeforeWakeTime check fires
    expect(corrected).toBe(rawPick);
    expect(corrected < wake).toBe(true);
  });

  it('event pick at 5:30 AM with wake 5 AM (early riser): stays as-is', () => {
    const wake = clk(4, 13, 5, 0);
    const rawPick = clk(4, 13, 5, 30);
    const corrected = pickEvent(rawPick, 1, wake);
    expect(corrected).toBe(rawPick);
    expect(corrected > wake).toBe(true);
  });

  it('event pick at 1:00 AM with NO wake set: bumps as before (no disambiguation)', () => {
    // No wake means we don't know — keep the late-night-intent default
    const rawPick = clk(4, 13, 1, 0);
    const corrected = pickEvent(rawPick, 1);
    expect(corrected).not.toBe(rawPick); // bumped
  });

  it('bedtime pick at 1:00 AM with wake 7 AM: STILL bumps (going-to-bed-late intent)', () => {
    const wake = clk(4, 13, 7, 0);
    const rawPick = clk(4, 13, 1, 0);
    const corrected = pickBedtime(rawPick, 1, wake);
    expect(corrected).not.toBe(rawPick); // bumped to next day
    expect(corrected > wake).toBe(true);
  });

  it('event pick at 11:30 PM (no bump regardless): unchanged', () => {
    const wake = clk(4, 13, 7, 0);
    const rawPick = clk(4, 13, 23, 30);
    const corrected = pickEvent(rawPick, 1, wake);
    expect(corrected).toBe(rawPick);
  });
});

describe('Short-sleep patient (bedtime 8 PM → wake 11 PM same calendar day)', () => {
  // Patient with shift-worker pattern: sleeps 8 PM, wakes 11 PM, starts
  // their "Day 2" at 11 PM Apr 13 — events span Apr 13 23:00 → Apr 14 ~20:00.
  // The wake-time form's smart default must use NOW (real current time), not
  // the diary day's calendar date, otherwise it'd land 24h ahead of intent.

  it('getDayNumber: events between short-sleep wake and next bedtime stay on Day 2', () => {
    const day1Bedtime = clk(4, 13, 20, 0); // 8 PM Apr 13
    const day2Wake = clk(4, 13, 23, 0); // 11 PM Apr 13 (same calendar day)
    const eventLater = clk(4, 13, 23, 30); // 11:30 PM Apr 13
    const eventNextMorning = clk(4, 14, 5, 0); // 5 AM Apr 14
    const day2Bedtime = clk(4, 14, 20, 0);
    // import getDayNumber lazily to keep the file imports tidy
    const bedtimes = [{ id: 'b1', timestampIso: day1Bedtime, dayNumber: 1 as const }];

    // 23:30 Apr 13 with Day 1 bedtime 20:00 Apr 13: bedtime-bump → Day 2
    expect(getDayNumber(eventLater, START, bedtimes, TZ)).toBe(2);
    // 5 AM Apr 14: diff 1 → dayNum 2; pull-back skipped because Day 1 bedtime exists and event > bedtime
    expect(getDayNumber(eventNextMorning, START, bedtimes, TZ)).toBe(2);

    // After Day 2 bedtime is added: events still on Day 2
    const bedtimes2 = [...bedtimes, { id: 'b2', timestampIso: day2Bedtime, dayNumber: 2 as const }];
    expect(getDayNumber(eventLater, START, bedtimes2, TZ)).toBe(2);
    expect(getDayNumber(eventNextMorning, START, bedtimes2, TZ)).toBe(2);
    // wake itself
    expect(getDayNumber(day2Wake, START, bedtimes2, TZ)).toBe(2);
  });
});

describe('Bedtime delete updates state and reverts day attributions', () => {
  it('removeBedtime takes a bumped void back to its original day', () => {
    const s = useDiaryStore.getState();
    s.resetDiary();
    useDiaryStore.setState({ startDate: START, timeZone: TZ });
    s.setBedtime(1, clk(4, 13, 20, 0));
    s.addVoid({
      timestampIso: clk(4, 13, 21, 0), // after Day 1 bedtime → bumped to Day 2
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    expect(s.getVoidsForDay(1)).toHaveLength(0);
    expect(s.getVoidsForDay(2)).toHaveLength(1);

    // Delete bedtime → void goes back to Day 1
    s.removeBedtime(1);
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
    // Bedtimes array updated
    expect(useDiaryStore.getState().bedtimes.find((b: { dayNumber: number }) => b.dayNumber === 1)).toBeUndefined();
  });

  it('removeBedtime then re-add at different time slots events correctly', () => {
    const s = useDiaryStore.getState();
    s.resetDiary();
    useDiaryStore.setState({ startDate: START, timeZone: TZ });
    s.setBedtime(1, clk(4, 13, 22, 0));
    s.addVoid({
      timestampIso: clk(4, 13, 23, 0),
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    // Initially: 23:00 > 22:00 bedtime → Day 2
    expect(s.getVoidsForDay(2)).toHaveLength(1);

    // Remove bedtime, then re-add later
    s.removeBedtime(1);
    s.setBedtime(1, clk(4, 14, 0, 30)); // bedtime 12:30 AM Apr 14 (very late)
    // 23:00 Apr 13 < 0:30 Apr 14 bedtime → Day 1
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
  });
});

describe('Wake time clamps when picker emits before prev bedtime', () => {
  it('rebuilds the wake on the next calendar day with the same clock time', () => {
    const bedtime = clk(4, 13, 22, 30);
    // Picker stayed on Apr 13: emits Apr 13 0:00 EDT — before bedtime
    const rawPick = clk(4, 13, 0, 0);
    const advanced = advanceIsoToAfter(rawPick, bedtime, TZ);
    expect(advanced > bedtime).toBe(true);
    expect(getDateInTz(advanced, TZ)).toBe('2026-04-14');
  });

  it('handles short-sleep: wake at 11 PM same calendar day as bedtime works without advancing', () => {
    const bedtime = clk(4, 13, 20, 0); // 8 PM
    const wake = clk(4, 13, 23, 0); // 11 PM same day
    expect(wake > bedtime).toBe(true);
    // No advance needed — wake is already after bedtime
    const result = wake > bedtime ? wake : advanceIsoToAfter(wake, bedtime, TZ);
    expect(result).toBe(wake);
  });
});
