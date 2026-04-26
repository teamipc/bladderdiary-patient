/**
 * Reproduces a patient-reported bug: void at 6:00 AM doesn't show on Day 2
 * after the patient changes their wake-up time overnight.
 *
 * Why: there are TWO filtering points that interact when wake-up time edits.
 *  1. Store-side reassignMorningVoid — handles FMV recompute
 *  2. UI-side TimelineView — filters voids by wake time for day vs night
 * If either point silently drops a legitimate Day 2 event, the user's
 * "Pee saved" toast is followed by an empty-looking diary. Medical-grade
 * software cannot lose patient events silently.
 *
 * Simulates: Singapore patient (UTC+8) walking the full 3-day flow, with
 * realistic wake/sleep edits and event log/edit/delete operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';
import { getDayNumber } from '@/lib/utils';

const SGT = 'Asia/Singapore';
const START_DATE = '2026-04-25';

/**
 * Build an ISO timestamp from a "wall-clock" time in Singapore.
 * The test patient picks "06:00 AM Apr 26 in Singapore" — we encode that
 * as the UTC instant that Singapore reads as 06:00 on that date.
 */
function sgt(year: number, month: number, day: number, hour: number, minute: number): string {
  // Singapore is UTC+8 with no DST, so subtract 8 hours to get UTC.
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, 0)).toISOString();
}

beforeEach(() => {
  const store = useDiaryStore.getState();
  store.resetDiary();
  useDiaryStore.setState({ startDate: START_DATE, timeZone: SGT });
});

describe('Wake-time edit bug: void at 6 AM disappears on Day 2', () => {
  it('void at 6 AM still appears on Day 2 day-view after wake-time is changed', () => {
    const store = useDiaryStore.getState();

    // Day 1: a couple of voids and bedtime.
    store.addVoid({
      timestampIso: sgt(2026, 4, 25, 9, 0),
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    store.addVoid({
      timestampIso: sgt(2026, 4, 25, 18, 30),
      volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    store.setBedtime(1, sgt(2026, 4, 25, 23, 0));

    // Overnight: patient logs an early-morning trip. (night view, no wake yet)
    store.addVoid({
      timestampIso: sgt(2026, 4, 26, 3, 30),
      volumeMl: 220, sensation: 3, leak: false, note: '', isFirstMorningVoid: false,
    });

    // Patient first sets Day 2 wake-up time to 6:30 AM, then changes mind
    // and sets it to 4:45 AM (matches the in-app screenshot).
    store.setWakeTime(2, sgt(2026, 4, 26, 6, 30));
    store.setWakeTime(2, sgt(2026, 4, 26, 4, 45));

    // Patient now logs the 6:00 AM void from Day 2 day-view.
    store.addVoid({
      timestampIso: sgt(2026, 4, 26, 6, 0),
      volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });

    // Sanity: every void should be in the store (no silent duplicate drops).
    const allVoids = useDiaryStore.getState().voids;
    expect(allVoids).toHaveLength(4);

    // Day 2's selector should return the 3:30 AM (overnight) and the 6:00 AM void.
    const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
    const day2Times = day2Voids.map((v) => v.timestampIso).sort();
    expect(day2Times).toContain(sgt(2026, 4, 26, 3, 30));
    expect(day2Times).toContain(sgt(2026, 4, 26, 6, 0));
    expect(day2Voids).toHaveLength(2);

    // Day-view filter (mirrors TimelineView): voids at/after wake time.
    const wake = useDiaryStore.getState().getWakeTimeForDay(2)!;
    const dayPhase = day2Voids.filter((v) => v.timestampIso >= wake.timestampIso);
    expect(dayPhase.map((v) => v.timestampIso)).toContain(sgt(2026, 4, 26, 6, 0));

    // FMV must be set so day-2 isn't "incomplete" forever.
    expect(day2Voids.some((v) => v.isFirstMorningVoid)).toBe(true);
  });

  it('void logged BEFORE wake-time change still appears in correct phase after change', () => {
    const store = useDiaryStore.getState();

    // Day 1 setup.
    store.addVoid({
      timestampIso: sgt(2026, 4, 25, 10, 0),
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    store.setBedtime(1, sgt(2026, 4, 25, 23, 0));

    // Patient first sets wake at 6:30 AM, then logs a 6:00 AM void in night-view.
    store.setWakeTime(2, sgt(2026, 4, 26, 6, 30));
    store.addVoid({
      timestampIso: sgt(2026, 4, 26, 6, 0),
      volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false,
    });

    // Then patient realizes they actually woke at 4:45 AM and edits wake.
    store.setWakeTime(2, sgt(2026, 4, 26, 4, 45));

    // The 6:00 AM void should now be a DAY-phase event (>= 4:45 AM wake).
    const wake = useDiaryStore.getState().getWakeTimeForDay(2)!;
    const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
    const dayPhase = day2Voids.filter((v) => v.timestampIso >= wake.timestampIso);

    // The void exists in Day 2 voids
    expect(day2Voids.map((v) => v.timestampIso)).toContain(sgt(2026, 4, 26, 6, 0));
    // And it's now in day-phase (after the new earlier wake time)
    expect(dayPhase.map((v) => v.timestampIso)).toContain(sgt(2026, 4, 26, 6, 0));
    // FMV recomputed: 6:00 AM is the earliest day-phase void → it's the FMV
    const fmv = day2Voids.find((v) => v.isFirstMorningVoid);
    expect(fmv?.timestampIso).toBe(sgt(2026, 4, 26, 6, 0));
  });

  it('addVoid signals duplicate-minute drops so UI never falsely confirms a save', () => {
    const store = useDiaryStore.getState();
    expect(store.addVoid({
      timestampIso: sgt(2026, 4, 25, 6, 0),
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    })).toBe(true);
    // Same minute UTC — must be reported as not-added
    expect(store.addVoid({
      timestampIso: sgt(2026, 4, 25, 6, 0),
      volumeMl: 999, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    })).toBe(false);
    expect(useDiaryStore.getState().voids).toHaveLength(1);
  });
});

describe('Patient simulation: full 3-day flow with edits and deletes', () => {
  it('events stay slotted correctly through realistic wake/sleep edits', () => {
    const store = useDiaryStore.getState();

    /* ── Day 1 ─────────────────────────────────────────────────────── */
    store.setWakeTime(1, sgt(2026, 4, 25, 7, 0));
    store.addVoid({ timestampIso: sgt(2026, 4, 25, 7, 30), volumeMl: 300, sensation: 3, leak: false, note: '', isFirstMorningVoid: false });
    store.addVoid({ timestampIso: sgt(2026, 4, 25, 12, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    store.addVoid({ timestampIso: sgt(2026, 4, 25, 18, 0), volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    store.setBedtime(1, sgt(2026, 4, 25, 22, 30));

    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(3);

    /* ── Night 1 / Day 2 morning ───────────────────────────────────── */
    // Overnight pee in night-view (before wake-up set)
    store.addVoid({ timestampIso: sgt(2026, 4, 26, 2, 30), volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false });
    // Patient sets wake-up
    store.setWakeTime(2, sgt(2026, 4, 26, 7, 0));
    // Logs morning void
    store.addVoid({ timestampIso: sgt(2026, 4, 26, 7, 15), volumeMl: 320, sensation: 4, leak: false, note: '', isFirstMorningVoid: false });

    // PATIENT-INDUCED EDIT: realizes wake was actually earlier, changes to 4:45 AM
    store.setWakeTime(2, sgt(2026, 4, 26, 4, 45));
    // Patient remembers another overnight pee they missed
    store.addVoid({ timestampIso: sgt(2026, 4, 26, 6, 0), volumeMl: 260, sensation: 3, leak: false, note: '', isFirstMorningVoid: false });

    // PATIENT-INDUCED DELETE: deletes the 2:30 AM void by mistake then re-adds
    const voids = useDiaryStore.getState().voids;
    const v230 = voids.find((v) => v.timestampIso === sgt(2026, 4, 26, 2, 30))!;
    store.removeVoid(v230.id);
    store.addVoid({ timestampIso: sgt(2026, 4, 26, 2, 30), volumeMl: 200, sensation: 3, leak: false, note: '', isFirstMorningVoid: false });

    /* ── End of Day 2 ──────────────────────────────────────────────── */
    store.addVoid({ timestampIso: sgt(2026, 4, 26, 13, 0), volumeMl: 240, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    store.addVoid({ timestampIso: sgt(2026, 4, 26, 19, 0), volumeMl: 290, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    store.setBedtime(2, sgt(2026, 4, 26, 23, 0));

    /* ── Day 3 ─────────────────────────────────────────────────────── */
    store.setWakeTime(3, sgt(2026, 4, 27, 6, 30));
    store.addVoid({ timestampIso: sgt(2026, 4, 27, 6, 45), volumeMl: 310, sensation: 3, leak: false, note: '', isFirstMorningVoid: false });
    store.addVoid({ timestampIso: sgt(2026, 4, 27, 14, 0), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    store.setBedtime(3, sgt(2026, 4, 27, 22, 30));

    /* ── Verify Day 2 has all the events at the right times ────────── */
    const day2 = useDiaryStore.getState().getVoidsForDay(2).map((v) => v.timestampIso).sort();
    expect(day2).toEqual([
      sgt(2026, 4, 26, 2, 30),
      sgt(2026, 4, 26, 4, 45) /* not a void — sanity that picker isn't here */,
      sgt(2026, 4, 26, 6, 0),
      sgt(2026, 4, 26, 7, 15),
      sgt(2026, 4, 26, 13, 0),
      sgt(2026, 4, 26, 19, 0),
    ].filter((t) => t !== sgt(2026, 4, 26, 4, 45)).sort()); // strip the sentinel

    // Day-phase filter (mirrors TimelineView)
    const wake2 = useDiaryStore.getState().getWakeTimeForDay(2)!;
    const day2DayPhase = useDiaryStore.getState().getVoidsForDay(2)
      .filter((v) => v.timestampIso >= wake2.timestampIso);
    // 4:45 AM wake → 6:00 AM, 7:15 AM, 13:00, 19:00 are day-phase
    expect(day2DayPhase).toHaveLength(4);

    // Night-phase voids on Day 2 (before wake)
    const day2NightPhase = useDiaryStore.getState().getVoidsForDay(2)
      .filter((v) => v.timestampIso < wake2.timestampIso);
    expect(day2NightPhase).toHaveLength(1); // 2:30 AM
    expect(day2NightPhase[0].timestampIso).toBe(sgt(2026, 4, 26, 2, 30));

    // FMV: closest day-phase void to 4:45 AM wake → 6:00 AM
    const fmv = useDiaryStore.getState().getVoidsForDay(2).find((v) => v.isFirstMorningVoid);
    expect(fmv?.timestampIso).toBe(sgt(2026, 4, 26, 6, 0));
  });
});

describe('getDayNumber: 6 AM on Day 2 calendar date', () => {
  it('always assigns 6 AM Apr 26 to Day 2 (Singapore TZ)', () => {
    const ts = sgt(2026, 4, 26, 6, 0);
    expect(getDayNumber(ts, START_DATE, [], SGT)).toBe(2);

    // With Day 1 bedtime set
    const bedtimes = [{ id: 'b1', timestampIso: sgt(2026, 4, 25, 23, 0), dayNumber: 1 as const }];
    expect(getDayNumber(ts, START_DATE, bedtimes, SGT)).toBe(2);
  });
});

/**
 * Root-cause regression: TimePicker was using `setHours()` (browser-local)
 * but day boundaries use the user's stored timeZone. When those don't match
 * (browser is UTC but user picked Asia/Singapore, or vice versa), typing
 * "06:00" produced a UTC instant whose calendar day in the user's tz was
 * the wrong diary day — events vanished from the day view, but the toast
 * still confirmed "Pee saved".
 *
 * The helper buildIsoForClockTimeInTz must construct the same UTC instant
 * regardless of the browser's local zone.
 */
describe('buildIsoForClockTimeInTz — timezone alignment', () => {
  it('"06:00 in Asia/Singapore on Apr 26" produces 22:00 UTC Apr 25', async () => {
    const { buildIsoForClockTimeInTz } = await import('@/lib/utils');
    const baseIso = '2026-04-25T22:30:00.000Z'; // some moment that's already Apr 26 in SGT
    expect(buildIsoForClockTimeInTz(baseIso, 6, 0, SGT)).toBe('2026-04-25T22:00:00.000Z');
  });

  it('"06:00 in UTC on Apr 26" produces 06:00 UTC Apr 26', async () => {
    const { buildIsoForClockTimeInTz } = await import('@/lib/utils');
    const baseIso = '2026-04-26T05:30:00.000Z';
    expect(buildIsoForClockTimeInTz(baseIso, 6, 0, 'UTC')).toBe('2026-04-26T06:00:00.000Z');
  });

  it('result independent of base ISO time-of-day (only date matters)', async () => {
    const { buildIsoForClockTimeInTz } = await import('@/lib/utils');
    // Different base times that all read as Apr 26 in Singapore:
    expect(buildIsoForClockTimeInTz('2026-04-25T16:01:00.000Z', 6, 0, SGT)).toBe('2026-04-25T22:00:00.000Z');
    expect(buildIsoForClockTimeInTz('2026-04-26T15:59:00.000Z', 6, 0, SGT)).toBe('2026-04-25T22:00:00.000Z');
  });

  it('clock display matches input across tz: round-trip is stable', async () => {
    const { buildIsoForClockTimeInTz, getClockTimeInTz } = await import('@/lib/utils');
    const baseIso = '2026-04-25T22:30:00.000Z';
    const out = buildIsoForClockTimeInTz(baseIso, 6, 0, SGT);
    expect(getClockTimeInTz(out, SGT)).toBe('06:00');
  });

  it('regression: 6 AM SGT void on Day 2 must land on Day 2 (not Day 1)', async () => {
    const { buildIsoForClockTimeInTz } = await import('@/lib/utils');
    // The TimePicker sees a base ISO that is already Apr 26 in SGT,
    // user types "06:00", expects this to fall on Day 2 (Apr 26).
    const baseIso = '2026-04-25T22:30:00.000Z'; // 06:30 SGT Apr 26
    const result = buildIsoForClockTimeInTz(baseIso, 6, 0, SGT);
    expect(getDayNumber(result, START_DATE, [], SGT)).toBe(2);
  });
});

/**
 * International coverage. Patients live everywhere — North America (EST/EDT,
 * PST/PDT), Europe (CET/CEST, GMT/BST), Asia (SGT, IST, JST). Every clinic
 * uses the same web app. The slotting logic must produce the same diary day
 * regardless of timezone, including across DST boundaries.
 */
describe('Multi-timezone patient flows', () => {
  const cases = [
    { tz: 'America/New_York', label: 'EDT (Apr — DST in effect)' },
    { tz: 'America/Los_Angeles', label: 'PDT' },
    { tz: 'America/Toronto', label: 'EDT (Toronto)' },
    { tz: 'Europe/London', label: 'BST (London — DST)' },
    { tz: 'Europe/Paris', label: 'CEST (Paris — DST)' },
    { tz: 'Europe/Berlin', label: 'CEST (Berlin)' },
    { tz: 'Asia/Singapore', label: 'SGT' },
    { tz: 'Asia/Tokyo', label: 'JST' },
    { tz: 'Asia/Kolkata', label: 'IST (offset 5:30)' },
    { tz: 'Australia/Sydney', label: 'AEST (Apr — non-DST)' },
    { tz: 'UTC', label: 'UTC' },
  ];

  for (const { tz, label } of cases) {
    it(`6:00 AM void lands on Day 2 day-phase view in ${label}`, async () => {
      const { buildIsoForClockTimeInTz, getClockTimeInTz } = await import('@/lib/utils');
      const store = useDiaryStore.getState();
      useDiaryStore.setState({ startDate: START_DATE, timeZone: tz });

      // Build wake at 4:45 AM Day 2 and a void at 6:00 AM Day 2 — both
      // expressed via the same picker codepath (buildIsoForClockTimeInTz).
      // Use an arbitrary base ISO that lands on Apr 26 in this tz.
      const baseDay2 = buildIsoForClockTimeInTz(
        // anchor at 12:00 UTC on Apr 26 — every IANA zone reads this as Apr 26
        '2026-04-26T12:00:00.000Z', 12, 0, tz,
      );
      const wakeIso = buildIsoForClockTimeInTz(baseDay2, 4, 45, tz);
      const voidIso = buildIsoForClockTimeInTz(baseDay2, 6, 0, tz);

      // Sanity: both round-trip through the picker display layer.
      expect(getClockTimeInTz(wakeIso, tz)).toBe('04:45');
      expect(getClockTimeInTz(voidIso, tz)).toBe('06:00');

      // Day assignment: void must be Day 2.
      expect(getDayNumber(voidIso, START_DATE, [], tz)).toBe(2);

      // Wire into store: bedtime + wake + void.
      store.setBedtime(1, buildIsoForClockTimeInTz(
        // Day 1 = Apr 25
        buildIsoForClockTimeInTz('2026-04-25T12:00:00.000Z', 12, 0, tz),
        23, 0, tz,
      ));
      store.setWakeTime(2, wakeIso);
      const ok = store.addVoid({
        timestampIso: voidIso,
        volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
      });
      expect(ok).toBe(true);

      // Day 2 view filter (mirrors TimelineView day-phase filter)
      const day2Voids = useDiaryStore.getState().getVoidsForDay(2);
      const dayPhase = day2Voids.filter((v) => v.timestampIso >= wakeIso);
      expect(dayPhase.map((v) => v.timestampIso)).toContain(voidIso);

      // FMV is set so the day isn't "incomplete" forever.
      expect(day2Voids.some((v) => v.isFirstMorningVoid)).toBe(true);

      store.resetDiary();
    });
  }
});

describe('Silent duplicate drop is no longer silent', () => {
  it('addVoid returns false when a void already exists at that minute', () => {
    const store = useDiaryStore.getState();
    store.resetDiary();
    useDiaryStore.setState({ startDate: START_DATE, timeZone: 'America/New_York' });
    const first = store.addVoid({
      timestampIso: '2026-04-26T10:00:00.000Z', volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    expect(first).toBe(true);
    const second = store.addVoid({
      timestampIso: '2026-04-26T10:00:30.000Z', volumeMl: 999, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    expect(second).toBe(false); // signal so the UI never shows "Pee saved"
    expect(useDiaryStore.getState().voids).toHaveLength(1);
  });

  it('addDrink and addLeak signal duplicate drops too', () => {
    const store = useDiaryStore.getState();
    store.resetDiary();
    expect(store.addDrink({
      timestampIso: '2026-04-26T10:00:00.000Z', volumeMl: 250, drinkType: 'water', note: '',
    })).toBe(true);
    expect(store.addDrink({
      timestampIso: '2026-04-26T10:00:00.000Z', volumeMl: 999, drinkType: 'water', note: '',
    })).toBe(false);
    expect(store.addLeak({
      timestampIso: '2026-04-26T11:00:00.000Z', trigger: 'cough', urgencyBeforeLeak: false, amount: 'drops',
    })).toBe(true);
    expect(store.addLeak({
      timestampIso: '2026-04-26T11:00:00.000Z', trigger: 'cough', urgencyBeforeLeak: false, amount: 'drops',
    })).toBe(false);
  });
});

describe('Bedtime edits recompute FMV (latent slotting bug)', () => {
  it('changing Day 1 bedtime later moves voids back to Day 1 and clears stale FMV', () => {
    const store = useDiaryStore.getState();
    store.resetDiary();
    useDiaryStore.setState({ startDate: START_DATE, timeZone: 'UTC' });

    // Day 1 bedtime at 22:00 UTC
    store.setBedtime(1, '2026-04-25T22:00:00.000Z');
    // Wake on Day 2 at 7:00 UTC Apr 26
    store.setWakeTime(2, '2026-04-26T07:00:00.000Z');
    // A void at 23:00 UTC Apr 25 (after Day 1 bedtime) → Day 2 (bumped)
    store.addVoid({
      timestampIso: '2026-04-25T23:00:00.000Z',
      volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    // A morning void at 7:30 UTC Apr 26 (Day 2)
    store.addVoid({
      timestampIso: '2026-04-26T07:30:00.000Z',
      volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });

    // Initially: 7:30 should be FMV (closest day-phase void to 7:00 wake)
    let day2 = useDiaryStore.getState().getVoidsForDay(2);
    let fmv = day2.find((v) => v.isFirstMorningVoid);
    expect(fmv?.timestampIso).toBe('2026-04-26T07:30:00.000Z');

    // Patient realizes they went to bed later (00:30 UTC = 12:30 AM Apr 26).
    // The 23:00 Apr 25 void should now belong to Day 1 (before bedtime).
    store.setBedtime(1, '2026-04-26T00:30:00.000Z');

    day2 = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2.map((v) => v.timestampIso)).not.toContain('2026-04-25T23:00:00.000Z');
    expect(day2.map((v) => v.timestampIso)).toContain('2026-04-26T07:30:00.000Z');
    fmv = day2.find((v) => v.isFirstMorningVoid);
    expect(fmv?.timestampIso).toBe('2026-04-26T07:30:00.000Z');

    // Day 1 should now have the 23:00 void
    const day1 = useDiaryStore.getState().getVoidsForDay(1);
    expect(day1.map((v) => v.timestampIso)).toContain('2026-04-25T23:00:00.000Z');
  });
});

describe('Cross-day void edits clear stale FMV', () => {
  it('editing a void to move it from Day 2 to Day 3 clears Day 2 FMV', () => {
    const store = useDiaryStore.getState();
    store.resetDiary();
    useDiaryStore.setState({ startDate: START_DATE, timeZone: 'UTC' });
    store.setWakeTime(2, '2026-04-26T07:00:00.000Z');
    store.setWakeTime(3, '2026-04-27T07:00:00.000Z');
    store.setBedtime(2, '2026-04-26T22:00:00.000Z');
    store.addVoid({
      timestampIso: '2026-04-26T07:30:00.000Z',
      volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false,
    });
    let day2 = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2[0].isFirstMorningVoid).toBe(true);
    const id = day2[0].id;

    // Edit time to Day 3
    store.updateVoid(id, { timestampIso: '2026-04-27T07:30:00.000Z' });

    day2 = useDiaryStore.getState().getVoidsForDay(2);
    const day3 = useDiaryStore.getState().getVoidsForDay(3);
    expect(day2).toHaveLength(0);
    expect(day3).toHaveLength(1);
    expect(day3[0].isFirstMorningVoid).toBe(true);
  });
});
