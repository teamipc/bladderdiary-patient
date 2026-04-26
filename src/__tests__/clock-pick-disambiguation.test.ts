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

describe('Bedtime form: stale-date trap from "last night" presets', () => {
  // Patient on Day 1 with wake at 8:25 AM today opens bedtime form. They click
  // "10 PM last night" — the preset builds (now − 24h) and stamps 10 PM on
  // that date, which is YESTERDAY. With wake on TODAY, the bedtime would land
  // before wake and validation would trip every subsequent pick (because
  // TimePicker.handleChange uses the stale value's date as anchor).
  // Fix: SetBedtimeForm.handleTimeChange runs every pick through resolve(),
  // which uses advanceIsoToAfter to push past wake.

  function resolveBedtime(rawIso: string, wakeIso: string): string {
    const corrected = correctAfterMidnight(rawIso, 1, START, TZ, wakeIso);
    if (corrected <= wakeIso) return advanceIsoToAfter(corrected, wakeIso, TZ);
    return corrected;
  }

  it('"10 PM last night" preset on Day 1 with wake today: lands tonight, not yesterday', () => {
    const wake = clk(4, 13, 8, 25); // 8:25 AM today (Day 1 = Apr 13)
    // Preset builds yesterday 10 PM (raw)
    const rawPreset = clk(4, 12, 22, 0); // Apr 12 22:00
    const resolved = resolveBedtime(rawPreset, wake);
    expect(resolved > wake).toBe(true);
    // Should land on today (Apr 13) at 22:00
    expect(getDateInTz(resolved, TZ)).toBe('2026-04-13');
  });

  it('"11 PM last night" preset on Day 1 with wake today: lands tonight', () => {
    const wake = clk(4, 13, 8, 25);
    const rawPreset = clk(4, 12, 23, 0);
    const resolved = resolveBedtime(rawPreset, wake);
    expect(getDateInTz(resolved, TZ)).toBe('2026-04-13');
  });

  it('"12 AM last night" preset on Day 1 with wake today: lands tomorrow', () => {
    const wake = clk(4, 13, 8, 25);
    // 12 AM yesterday = Apr 12 00:00 EDT
    const rawPreset = clk(4, 12, 0, 0);
    const resolved = resolveBedtime(rawPreset, wake);
    // Today 0:00 is still before today 8:25 wake → must advance to tomorrow
    expect(resolved > wake).toBe(true);
    expect(getDateInTz(resolved, TZ)).toBe('2026-04-14');
  });

  it('successive picks: preset then typing 11 PM keeps date correct', () => {
    const wake = clk(4, 13, 8, 25);
    // 1. Click "10 PM last night" → resolves to today 22:00
    const afterPreset = resolveBedtime(clk(4, 12, 22, 0), wake);
    expect(getDateInTz(afterPreset, TZ)).toBe('2026-04-13');

    // 2. User types 23:00 — TimePicker uses afterPreset as anchor
    const typed = buildIsoForClockTimeInTz(afterPreset, 23, 0, TZ);
    expect(getDateInTz(typed, TZ)).toBe('2026-04-13'); // anchor is today
    const afterType = resolveBedtime(typed, wake);
    expect(getDateInTz(afterType, TZ)).toBe('2026-04-13');
    expect(afterType > wake).toBe(true);
  });

  it('-15 wrap-around: starting from 8:30 AM, stepping -15 past midnight does not bury date in past', () => {
    const wake = clk(4, 13, 8, 25);
    // Simulate 12 clicks of -15 from 8:30 AM smart default → 5:30 AM (still on Day 1)
    // Each click stays on the same calendar date due to TimePicker's day-wrap logic.
    let state = clk(4, 13, 8, 30); // smart default
    state = resolveBedtime(state, wake); // initial resolve — no shift since 8:30 > 8:25
    expect(state).toBe(clk(4, 13, 8, 30));
    // After 12 backward steps the picker emits 5:30 AM today
    const afterSteps = clk(4, 13, 5, 30);
    const resolved = resolveBedtime(afterSteps, wake);
    // Goes-to-bed-late intent: bumped to Apr 14 5:30 AM → > wake → kept
    expect(resolved > wake).toBe(true);
    expect(getDateInTz(resolved, TZ)).toBe('2026-04-14');
  });

  it('Day 2 bedtime: "10 PM last night" preset with Day 2 wake at 7 AM resolves correctly', () => {
    // Day 2 = Apr 14. Wake at 7 AM Apr 14. Patient logs Day 2 bedtime.
    // Preset builds yesterday (Apr 13) 22:00. That IS before Day 2 wake.
    const wake = clk(4, 14, 7, 0);
    function resolveDay2(rawIso: string, wakeIso: string): string {
      const corrected = correctAfterMidnight(rawIso, 2, START, TZ, wakeIso);
      if (corrected <= wakeIso) return advanceIsoToAfter(corrected, wakeIso, TZ);
      return corrected;
    }
    const rawPreset = clk(4, 13, 22, 0); // Apr 13 22:00 EDT
    const resolved = resolveDay2(rawPreset, wake);
    // Apr 13 22:00 < Apr 14 7:00 → advance to Apr 14 22:00
    expect(getDateInTz(resolved, TZ)).toBe('2026-04-14');
    expect(resolved > wake).toBe(true);
  });
});

describe('Edit existing entries: smart default uses existing.timestampIso', () => {
  // When editing, the form's smart default returns the entry's existing ISO,
  // not "now" or a calendar default. The picker's date stays where the entry
  // was, so picks don't accidentally shift to today.

  it('editing a Day 1 void at 8 AM Apr 13 keeps date on Apr 13 when picking 9 AM', () => {
    const existingIso = clk(4, 13, 8, 0);
    const newPick = buildIsoForClockTimeInTz(existingIso, 9, 0, TZ);
    expect(getDateInTz(newPick, TZ)).toBe('2026-04-13');
  });

  it('editing a Day 1 void: picking before-wake fires the form warning, doesn\u2019t silently shift', () => {
    const wake = clk(4, 13, 7, 0);
    const existingIso = clk(4, 13, 8, 0);
    // Picker types "04:00" — handleChange builds Apr 13 04:00
    const newPick = buildIsoForClockTimeInTz(existingIso, 4, 0, TZ);
    expect(getDateInTz(newPick, TZ)).toBe('2026-04-13');
    // For event forms, intent='event': don't bump
    const corrected = correctAfterMidnight(newPick, 1, START, TZ, wake, 'event');
    expect(corrected).toBe(newPick); // not shifted
    expect(corrected < wake).toBe(true); // form will show warning
  });
});
