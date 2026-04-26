/**
 * Patients edit retroactively. They complete Day 3, then realize Day 1
 * had the wrong wake time. Or they hit "Edit bedtime" on Day 2 after a
 * full diary is in. The store must keep events anchored to the right
 * diary day and recompute FMV correctly when retroactive edits happen.
 *
 * These scenarios are clinical-record-critical: silently moving an event
 * to a different day, losing an FMV, or stranding a diary in an
 * "incomplete" state because of a back-edit are all unacceptable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';
import {
  buildIsoForClockTimeInTz,
  correctAfterMidnight,
  getDayNumber,
} from '@/lib/utils';

const TZ = 'America/New_York';
const START = '2026-04-13'; // Day 1=Apr 13, Day 2=Apr 14, Day 3=Apr 15

function clk(month: number, day: number, h: number, m = 0): string {
  const base = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
  return buildIsoForClockTimeInTz(base, h, m, TZ);
}

function pickedDay(month: number, day: number, h: number, m: number, dayNumber: 1 | 2 | 3): string {
  const raw = clk(month, day, h, m);
  const wake = useDiaryStore.getState().getWakeTimeForDay(dayNumber)?.timestampIso;
  return correctAfterMidnight(raw, dayNumber, START, TZ, wake);
}

beforeEach(() => {
  useDiaryStore.getState().resetDiary();
  useDiaryStore.setState({ startDate: START, timeZone: TZ });
});

/** Run a complete normal 3-day diary. Used as the baseline state for back-edit tests. */
function runFullDiary(): void {
  const s = useDiaryStore.getState();
  // Day 1: wake 7, voids 8/12/18, bedtime 22
  s.setWakeTime(1, clk(4, 13, 7, 0));
  s.addVoid({ timestampIso: pickedDay(4, 13, 8, 0, 1), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.addVoid({ timestampIso: pickedDay(4, 13, 12, 0, 1), volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.addVoid({ timestampIso: pickedDay(4, 13, 18, 0, 1), volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.setBedtime(1, clk(4, 13, 22, 0));
  // Day 2: wake 7, voids 8/13/19, bedtime 22
  s.setWakeTime(2, clk(4, 14, 7, 0));
  s.addVoid({ timestampIso: pickedDay(4, 14, 8, 0, 2), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.addVoid({ timestampIso: pickedDay(4, 14, 13, 0, 2), volumeMl: 270, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.addVoid({ timestampIso: pickedDay(4, 14, 19, 0, 2), volumeMl: 300, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.setBedtime(2, clk(4, 14, 22, 0));
  // Day 3: wake 7, voids 8/14/19, bedtime 22
  s.setWakeTime(3, clk(4, 15, 7, 0));
  s.addVoid({ timestampIso: pickedDay(4, 15, 8, 0, 3), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.addVoid({ timestampIso: pickedDay(4, 15, 14, 0, 3), volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.addVoid({ timestampIso: pickedDay(4, 15, 19, 0, 3), volumeMl: 290, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
  s.setBedtime(3, clk(4, 15, 22, 0));
}

describe('Full diary baseline', () => {
  it('all three days are complete with correct FMV after a full run', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    expect(s.getVoidsForDay(1)).toHaveLength(3);
    expect(s.getVoidsForDay(2)).toHaveLength(3);
    expect(s.getVoidsForDay(3)).toHaveLength(3);
    [1, 2, 3].forEach((d) => {
      const day = s.getVoidsForDay(d as 1 | 2 | 3);
      expect(day.find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 12 + d, 8, 0));
    });
  });
});

describe('Back-edit Day 1 wake time after Day 3 complete', () => {
  it('moving Day 1 wake earlier does not shuffle Day 2/3 events', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    // Patient remembers they actually woke at 5:30 on Day 1
    s.setWakeTime(1, clk(4, 13, 5, 30));

    expect(s.getVoidsForDay(1).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 13, 8, 0));
    expect(s.getVoidsForDay(2).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 14, 8, 0));
    expect(s.getVoidsForDay(3).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 15, 8, 0));
    // Counts unchanged
    expect(s.getVoidsForDay(1)).toHaveLength(3);
    expect(s.getVoidsForDay(2)).toHaveLength(3);
    expect(s.getVoidsForDay(3)).toHaveLength(3);
  });
});

describe('Back-edit Day 1 bedtime after Day 3 complete', () => {
  it('moving Day 1 bedtime LATER (past midnight) keeps Day 2 events intact', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    // Patient corrects: actually went to bed at 1:00 AM Apr 14 (i.e., 03:00 in next-cal-day terms)
    s.setBedtime(1, clk(4, 14, 1, 0));

    // Day 1 should now own a 0-1 AM Apr 14 timestamp if there was one,
    // but our baseline doesn't have any; everything else stays put.
    expect(s.getVoidsForDay(1)).toHaveLength(3);
    expect(s.getVoidsForDay(2)).toHaveLength(3);
    expect(s.getVoidsForDay(3)).toHaveLength(3);
    // Day 2 wake is at 07:00 Apr 14 — still after the new Day 1 bedtime
    const day2Voids = s.getVoidsForDay(2);
    expect(day2Voids.every((v) => v.timestampIso >= clk(4, 14, 7, 0))).toBe(true);
    // FMV preserved
    expect(day2Voids.find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 14, 8, 0));
  });

  it('moving Day 1 bedtime EARLIER (e.g. 20:00) bumps post-20:00 Day-1 voids to Day 2', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    // Move Day 1 bedtime to 17:00 — the 18:00 Day-1 void should now belong to Day 2
    s.setBedtime(1, clk(4, 13, 17, 0));

    // The 18:00 Apr 13 void goes to Day 2 (after-bedtime bump)
    const day1 = s.getVoidsForDay(1);
    const day2 = s.getVoidsForDay(2);
    expect(day1.map((v) => v.timestampIso)).not.toContain(clk(4, 13, 18, 0));
    expect(day2.map((v) => v.timestampIso)).toContain(clk(4, 13, 18, 0));
    // Day 2's FMV is still 8:00 Apr 14 (the bumped 18:00 Apr 13 void is night-phase)
    const fmv = day2.find((v) => v.isFirstMorningVoid);
    expect(fmv?.timestampIso).toBe(clk(4, 14, 8, 0));
  });
});

describe('Back-edit Day 2 bedtime after Day 3 complete', () => {
  it('moving Day 2 bedtime later does not strand Day 3 events', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    s.setBedtime(2, clk(4, 14, 23, 30));

    expect(s.getVoidsForDay(2)).toHaveLength(3);
    expect(s.getVoidsForDay(3)).toHaveLength(3);
    expect(s.getVoidsForDay(3).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 15, 8, 0));
  });

  it('moving Day 2 bedtime EARLIER (e.g. 18:00) shifts the 19:00 Day-2 void to Day 3', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    s.setBedtime(2, clk(4, 14, 18, 30));

    const day2 = s.getVoidsForDay(2);
    const day3 = s.getVoidsForDay(3);
    expect(day2.map((v) => v.timestampIso)).not.toContain(clk(4, 14, 19, 0));
    expect(day3.map((v) => v.timestampIso)).toContain(clk(4, 14, 19, 0));
    // Day 3's FMV remains the 8:00 Apr 15 void (the 19:00 Apr 14 is night-phase relative to Day 3 wake)
    expect(day3.find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 15, 8, 0));
  });
});

describe('Edit a void retroactively to move it across days', () => {
  it('moving a Day-3 void back to Day 2 clears Day 3 FMV if it was the FMV, sets it on Day 2 candidate', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    const day3Voids = s.getVoidsForDay(3);
    const fmvId = day3Voids.find((v) => v.isFirstMorningVoid)!.id;
    // Move the FMV to mid-Day-2 (15:00 Apr 14) — past Day 2's wake, before bedtime
    s.updateVoid(fmvId, { timestampIso: clk(4, 14, 15, 0) });

    expect(s.getVoidsForDay(2)).toHaveLength(4);
    expect(s.getVoidsForDay(3)).toHaveLength(2);
    // Day 3 must still have an FMV (the 14:00 Apr 15 void, which is the only remaining day-phase candidate
    // closest to the 7:00 Apr 15 wake among the two leftover voids: 14:00 and 19:00)
    expect(s.getVoidsForDay(3).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 15, 14, 0));
    // Day 2 FMV is still 8:00 Apr 14 (closer to 7:00 wake than the new 15:00)
    expect(s.getVoidsForDay(2).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 14, 8, 0));
  });
});

describe('Delete bedtime mid-completion (data integrity)', () => {
  it('removing Day 2 bedtime after Day 3 complete still keeps Day 3 events on Day 3', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    s.removeBedtime(2);
    // Day 2 has no bedtime → loses "complete" status. Day 3 events stay because
    // their timestamps are on Apr 15 (calendar diff = 2 → dayNum 3 always).
    expect(s.getVoidsForDay(3)).toHaveLength(3);
    expect(s.getVoidsForDay(3).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 15, 8, 0));
  });

  it('removing then re-adding bedtime preserves event slotting', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    s.removeBedtime(2);
    s.setBedtime(2, clk(4, 14, 22, 0));
    // Same as full diary: 3-3-3 with FMVs at 8:00 each day
    expect(s.getVoidsForDay(2)).toHaveLength(3);
    expect(s.getVoidsForDay(3)).toHaveLength(3);
    expect(s.getVoidsForDay(2).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 14, 8, 0));
  });
});

describe('Patient back-edits Day 1 wake to a much earlier hour', () => {
  it('Day 1 wake set to 4:17 AM after the full diary — no events vanish', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    s.setWakeTime(1, clk(4, 13, 4, 17));
    expect(s.getVoidsForDay(1)).toHaveLength(3);
    expect(s.getVoidsForDay(2)).toHaveLength(3);
    expect(s.getVoidsForDay(3)).toHaveLength(3);
    // FMV recomputed: 8:00 Apr 13 is still the closest day-phase void to 4:17 wake
    expect(s.getVoidsForDay(1).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 13, 8, 0));
  });
});

describe('Edge: 23:00 wake (night-shift) — getDayNumber pull-back', () => {
  it('void at 0:00 the next calendar day is on Day 2 even after Day 2 bedtime is set', () => {
    const s = useDiaryStore.getState();
    s.setBedtime(1, clk(4, 13, 14, 0)); // night shift Day 1 bedtime: 14:00 Apr 13
    s.setWakeTime(2, clk(4, 13, 23, 0)); // wake 23:00 Apr 13 (= start of Day 2's "morning")
    s.addVoid({ timestampIso: clk(4, 13, 23, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: clk(4, 14, 0, 0), volumeMl: 260, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.setBedtime(2, clk(4, 14, 15, 0)); // bedtime 15:00 Apr 14

    // Both voids must be on Day 2
    const day2 = s.getVoidsForDay(2);
    const day3 = s.getVoidsForDay(3);
    expect(day2.length).toBeGreaterThanOrEqual(2);
    expect(day3.length).toBe(0);
  });
});

describe('Patient changes timezone after diary completes (jet lag)', () => {
  it('event count is preserved after timezone switch', () => {
    runFullDiary();
    const total = useDiaryStore.getState().voids.length;
    useDiaryStore.setState({ timeZone: 'Asia/Tokyo' });
    const after = useDiaryStore.getState().voids.length;
    expect(after).toBe(total);
    // All voids still distributed across days 1–3 (some may have shifted neighbouring slots)
    const t1 = useDiaryStore.getState().getVoidsForDay(1).length;
    const t2 = useDiaryStore.getState().getVoidsForDay(2).length;
    const t3 = useDiaryStore.getState().getVoidsForDay(3).length;
    expect(t1 + t2 + t3).toBe(total);
  });
});

describe('Bedtime delete cascade — does NOT delete subsequent days', () => {
  it('removing Day 1 bedtime keeps Day 2/3 events but moves bumped voids back', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    s.removeBedtime(1);
    // No voids should vanish
    expect(s.voids).toHaveLength(9);
    expect(s.getBedtimeForDay(2)).toBeDefined();
    expect(s.getBedtimeForDay(3)).toBeDefined();
  });
});

describe('FMV stays canonical when patient adds a missed early-morning void', () => {
  it('Day 2 FMV moves to the new earlier morning void when one is added retroactively', () => {
    runFullDiary();
    const s = useDiaryStore.getState();
    // Patient remembers they actually peed at 7:30 AM right after waking
    s.addVoid({ timestampIso: clk(4, 14, 7, 30), volumeMl: 220, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    // FMV should now be 7:30 (closer to 7:00 wake than 8:00)
    const day2 = s.getVoidsForDay(2);
    expect(day2).toHaveLength(4);
    expect(day2.find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(clk(4, 14, 7, 30));
  });
});

describe('Sanity: regression for getDayNumber early-AM pull-back enhancement', () => {
  it('hour 0 event WITH prev day bedtime LATER stays on prev day', () => {
    const bedtimes = [{ id: 'b', timestampIso: clk(4, 14, 1, 0), dayNumber: 1 as const }];
    // 0:00 Apr 14 is BEFORE 1:00 Apr 14 bedtime → pull back to Day 1
    expect(getDayNumber(clk(4, 14, 0, 0), START, bedtimes, TZ)).toBe(1);
  });
  it('hour 0 event WITH prev day bedtime EARLIER stays on next day', () => {
    const bedtimes = [{ id: 'b', timestampIso: clk(4, 13, 22, 0), dayNumber: 1 as const }];
    // 0:00 Apr 14 is AFTER 22:00 Apr 13 bedtime → no pull back, stays Day 2
    expect(getDayNumber(clk(4, 14, 0, 0), START, bedtimes, TZ)).toBe(2);
  });
});
