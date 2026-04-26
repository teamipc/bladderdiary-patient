/**
 * Medical-grade QA across the wake-hour spectrum.
 *
 * Patients aren't 7-AM normies. CEOs on red-eyes wake at 3 AM in their new
 * timezone. Night-shift nurses go to bed at 8 AM. Insomniacs nap at 4 AM.
 * Older patients with prostate issues pee at 2 AM and call it morning.
 * Every one of these patterns must survive the day-boundary logic without
 * silent data loss in the clinical record.
 *
 * Each test simulates a full Day-2 session: wake → events → bedtime → check
 * everything is still on Day 2 and the diary is "complete".
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';
import {
  buildIsoForClockTimeInTz,
  correctAfterMidnight,
  correctNightDate,
  getDayNumber,
} from '@/lib/utils';

const START = '2026-04-13'; // Day 1 = Apr 13, Day 2 = Apr 14, Day 3 = Apr 15

function clk(tz: string, month: number, day: number, h: number, m = 0): string {
  const base = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
  return buildIsoForClockTimeInTz(base, h, m, tz);
}

/** Mirror what the day-view form does: bump early-AM picks past wake time logic. */
function pickedDay(tz: string, month: number, day: number, h: number, m: number, dayNumber: 1 | 2 | 3): string {
  const raw = clk(tz, month, day, h, m);
  const wake = useDiaryStore.getState().getWakeTimeForDay(dayNumber)?.timestampIso;
  return correctAfterMidnight(raw, dayNumber, START, tz, wake);
}

/** Mirror what the night-view form does: anchor early-AM to day-after-bedtime. */
function pickedNight(tz: string, month: number, day: number, h: number, m: number, dayNumber: 1 | 2 | 3): string {
  const raw = clk(tz, month, day, h, m);
  const prevBedtime = useDiaryStore.getState().getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3);
  if (!prevBedtime) return raw;
  return correctNightDate(raw, prevBedtime.timestampIso, tz);
}

beforeEach(() => {
  useDiaryStore.getState().resetDiary();
  useDiaryStore.setState({ startDate: START, timeZone: 'America/New_York' });
});

describe('Wake-hour spectrum (Day 2 in EDT)', () => {
  const TZ = 'America/New_York';

  // For every wake hour from 0 to 23, a patient should be able to:
  //  1. Set wake time
  //  2. Log a void at that wake time AND a void 1 hour later
  //  3. Set bedtime 16 hours after wake
  //  4. End up with all events on Day 2 with FMV
  for (let wakeH = 0; wakeH < 24; wakeH++) {
    it(`wake at ${String(wakeH).padStart(2, '0')}:00 — every event lands on Day 2`, () => {
      const s = useDiaryStore.getState();
      // Day 1 bedtime so the "prevDayComplete" gate is satisfied
      s.setBedtime(1, clk(TZ, 4, 13, 22, 0));

      // Wake at hour H on Day 2
      s.setWakeTime(2, clk(TZ, 4, 14, wakeH, 0));

      // First void at wake-hour:30 (30 minutes after wake), in day view
      // Time picks pass through correctAfterMidnight
      const v1 = pickedDay(TZ, 4, 14, wakeH, 30, 2);
      expect(s.addVoid({ timestampIso: v1, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false })).toBe(true);

      // A second void 1 hour after wake (handle wrap past midnight: still on the 16h window)
      const wakeH2 = (wakeH + 1) % 24;
      const dayOfV2 = wakeH2 < wakeH ? 15 : 14; // wrapped past midnight
      const v2 = pickedDay(TZ, 4, dayOfV2, wakeH2, 0, 2);
      expect(s.addVoid({ timestampIso: v2, volumeMl: 260, sensation: 2, leak: false, note: '', isFirstMorningVoid: false })).toBe(true);

      // Bedtime 16 hours after wake
      const bedH = (wakeH + 16) % 24;
      const dayOfBed = bedH < wakeH ? 15 : 14;
      // SetBedtimeForm now passes wakeTime, so picks at-or-after wake stay on the day
      const bedRaw = clk(TZ, 4, dayOfBed, bedH, 0);
      const wake = s.getWakeTimeForDay(2)!.timestampIso;
      const bedTime = correctAfterMidnight(bedRaw, 2, START, TZ, wake);
      s.setBedtime(2, bedTime);

      // All events must still be on Day 2 after bedtime is set
      const day2 = useDiaryStore.getState().getVoidsForDay(2);
      const day3 = useDiaryStore.getState().getVoidsForDay(3);
      expect(day2.length, `wake=${wakeH}h: day2 voids`).toBe(2);
      expect(day3.length, `wake=${wakeH}h: day3 voids`).toBe(0);
      expect(day2.some((v) => v.isFirstMorningVoid), `wake=${wakeH}h: FMV present`).toBe(true);
    });
  }
});

describe('Insomniac patient: 1 AM wake-up logged via day view', () => {
  it('events stay on Day 2 across the bedtime threshold', () => {
    const TZ = 'America/New_York';
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(TZ, 4, 13, 22, 0));
    s.setWakeTime(2, clk(TZ, 4, 14, 1, 0));

    // Voids at 1:30, 3:00 (still early-AM picks)
    const v1 = pickedDay(TZ, 4, 14, 1, 30, 2);
    const v2 = pickedDay(TZ, 4, 14, 3, 0, 2);
    s.addVoid({ timestampIso: v1, volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: v2, volumeMl: 220, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });

    // Bedtime at 17:00 (5 PM — short waking day)
    s.setBedtime(2, clk(TZ, 4, 14, 17, 0));

    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(2);
    expect(useDiaryStore.getState().getVoidsForDay(3)).toHaveLength(0);
    expect(useDiaryStore.getState().getVoidsForDay(2).some((v) => v.isFirstMorningVoid)).toBe(true);
  });
});

describe('Night-view path: overnight pee logged at 2:30 AM (regression for correctNightDate)', () => {
  it('Day 1 bedtime 22:00 EDT, overnight pee at 2:30 AM Apr 14 lands on Apr 14 — not Apr 15', () => {
    // Regression: correctNightDate used to addDays-in-UTC. For NY EDT bedtime
    // that crossed midnight UTC, that double-skipped — overnight pees landed
    // on the wrong calendar day for every US-tz patient.
    const TZ = 'America/New_York';
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(TZ, 4, 13, 22, 0));

    // pickedNight mirrors LogVoidForm's correctNightDate path
    const overnight = pickedNight(TZ, 4, 14, 2, 30, 2);
    // The corrected date in NY EDT must be Apr 14 (the morning AFTER bedtime),
    // not Apr 15 (which is what the buggy version produced).
    expect(getDayNumber(overnight, START, useDiaryStore.getState().bedtimes, TZ)).toBe(2);

    s.addVoid({ timestampIso: overnight, volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false });
    s.setWakeTime(2, clk(TZ, 4, 14, 7, 0));

    const day2 = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2).toHaveLength(1);
    const wake = useDiaryStore.getState().getWakeTimeForDay(2)!;
    const nightPhase = day2.filter((v) => v.timestampIso < wake.timestampIso);
    expect(nightPhase).toHaveLength(1);
  });
});

describe('CEO patient: NY → Tokyo flight mid-diary', () => {
  it('events do not vanish after timezone change', () => {
    useDiaryStore.setState({ timeZone: 'America/New_York', startDate: '2026-04-13' });
    const s = useDiaryStore.getState();
    s.setWakeTime(1, clk('America/New_York', 4, 13, 7, 0));
    s.addVoid({
      timestampIso: clk('America/New_York', 4, 13, 9, 0),
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    s.setBedtime(1, clk('America/New_York', 4, 13, 22, 0));

    // Patient takes overnight flight, lands in Tokyo, app updates timezone
    useDiaryStore.setState({ timeZone: 'Asia/Tokyo' });

    // The Day 1 void should still exist in some day (not vanish from store)
    const allVoids = useDiaryStore.getState().voids;
    expect(allVoids).toHaveLength(1);
  });
});

describe('Tokyo patient: very late timezone, day boundary at +9 UTC', () => {
  it('5 AM JST event on Day 2 stays on Day 2 (early-AM pull-back works in JST)', () => {
    const TZ = 'Asia/Tokyo';
    useDiaryStore.setState({ timeZone: TZ, startDate: START });
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(TZ, 4, 13, 22, 0));
    s.setWakeTime(2, clk(TZ, 4, 14, 5, 0));

    // 5 AM picked → wake at 5 AM, picked time = wake → don't bump (5 ≥ 5)
    const v1 = pickedDay(TZ, 4, 14, 5, 0, 2);
    s.addVoid({ timestampIso: v1, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(2, clk(TZ, 4, 14, 22, 0));

    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(3)).toHaveLength(0);
  });
});

describe('DST: spring forward in Europe/London, March 29 2026', () => {
  it('06:00 BST event lands on Day 2 even across DST start', () => {
    const TZ = 'Europe/London';
    // Day 1 = Mar 28 (GMT), Day 2 = Mar 29 (DST starts at 01:00→02:00 BST)
    useDiaryStore.setState({ timeZone: TZ, startDate: '2026-03-28' });
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(TZ, 3, 28, 22, 0));
    s.setWakeTime(2, clk(TZ, 3, 29, 6, 0));

    const v1 = correctAfterMidnight(clk(TZ, 3, 29, 6, 0), 2, '2026-03-28', TZ, s.getWakeTimeForDay(2)!.timestampIso);
    s.addVoid({ timestampIso: v1, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(2, clk(TZ, 3, 29, 22, 0));

    expect(getDayNumber(v1, '2026-03-28', useDiaryStore.getState().bedtimes, TZ)).toBe(2);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
  });
});

describe('Repeated picker touches: same time picked many times', () => {
  it('correctAfterMidnight is idempotent — repeated calls produce the same result', () => {
    const TZ = 'America/New_York';
    useDiaryStore.setState({ timeZone: TZ });
    const wake = clk(TZ, 4, 14, 4, 17);
    const raw = clk(TZ, 4, 14, 5, 0);
    const once = correctAfterMidnight(raw, 2, START, TZ, wake);
    const twice = correctAfterMidnight(once, 2, START, TZ, wake);
    const thrice = correctAfterMidnight(twice, 2, START, TZ, wake);
    expect(once).toBe(twice);
    expect(twice).toBe(thrice);
  });

  it('without wake time + late-night intent: still bumps once, then stable', () => {
    const TZ = 'America/New_York';
    const raw = clk(TZ, 4, 14, 1, 0);
    const once = correctAfterMidnight(raw, 2, START, TZ);
    // Bumped to Apr 15
    expect(once).not.toBe(raw);
    // Second call: timeDate (Apr 15) != dayDate (Apr 14) → no further bump
    const twice = correctAfterMidnight(once, 2, START, TZ);
    expect(twice).toBe(once);
  });
});

describe('Patient changes wake time after logging events', () => {
  it('wake later than morning event: event stays on Day 2 day-phase', () => {
    const TZ = 'America/New_York';
    useDiaryStore.setState({ timeZone: TZ });
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(TZ, 4, 13, 22, 0));
    s.setWakeTime(2, clk(TZ, 4, 14, 7, 0));

    // Morning void at 7:30
    const v1 = pickedDay(TZ, 4, 14, 7, 30, 2);
    s.addVoid({ timestampIso: v1, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });

    // Patient remembers actually woke at 4:17 AM, edits wake
    s.setWakeTime(2, clk(TZ, 4, 14, 4, 17));

    // The 7:30 void must still be on Day 2 (not silently moved)
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
    // FMV should follow wake-time change (still 7:30 since it's the only void)
    expect(useDiaryStore.getState().getVoidsForDay(2)[0].isFirstMorningVoid).toBe(true);
  });
});

describe('Day 2 with no wake time set yet: form must default conservatively', () => {
  it('correctAfterMidnight without wakeTimeIso bumps as before (back-compat)', () => {
    const TZ = 'America/New_York';
    const raw = clk(TZ, 4, 14, 3, 0);
    // No wake time → bump (treats as late-night intent)
    const corrected = correctAfterMidnight(raw, 2, START, TZ);
    expect(corrected).not.toBe(raw);
  });
});
