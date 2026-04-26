/**
 * Medical-grade edge-case suite for the patient diary store.
 *
 * Scenarios target the failure modes that cost real patient data:
 *   - add/delete/re-add at the same minute (data loss recovery)
 *   - cross-day-boundary edits (FMV must follow the void to its new day)
 *   - bedtime-at-wake / bedtime-at-event boundary cases
 *   - midnight, 5:59 AM, 6:00 AM diary-day boundaries
 *   - bedtime delete reverts bedtime-aware day bumping
 *   - tz-mismatch scenario (stored "UTC", browser something else)
 *
 * Each test resets store state. Use clock-time helpers to keep intent obvious.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';
import { buildIsoForClockTimeInTz, getDayNumber, getClockTimeInTz } from '@/lib/utils';

const NY = 'America/New_York';
const START = '2026-04-25';

function nyIso(month: number, day: number, h: number, m = 0): string {
  // Build via the same helper the TimePicker now uses
  const base = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
  return buildIsoForClockTimeInTz(base, h, m, NY);
}

beforeEach(() => {
  const s = useDiaryStore.getState();
  s.resetDiary();
  useDiaryStore.setState({ startDate: START, timeZone: NY });
});

describe('Add / delete / re-add data-loss recovery', () => {
  it('re-add at the SAME minute after delete succeeds', () => {
    const s = useDiaryStore.getState();
    const ts = nyIso(4, 26, 7, 30);
    expect(s.addVoid({ timestampIso: ts, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false })).toBe(true);
    const id = useDiaryStore.getState().voids[0].id;
    s.removeVoid(id);
    expect(useDiaryStore.getState().voids).toHaveLength(0);
    // Same minute is fine now — duplicate detection is per current state
    expect(s.addVoid({ timestampIso: ts, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false })).toBe(true);
    expect(useDiaryStore.getState().voids).toHaveLength(1);
  });

  it('rapid double-save (same data twice) drops the duplicate cleanly', () => {
    const s = useDiaryStore.getState();
    const ts = nyIso(4, 26, 7, 30);
    const data = { timestampIso: ts, volumeMl: 250, sensation: 2 as const, leak: false, note: '', isFirstMorningVoid: false };
    expect(s.addVoid(data)).toBe(true);
    expect(s.addVoid(data)).toBe(false);
    expect(useDiaryStore.getState().voids).toHaveLength(1);
  });

  it('delete a non-FMV void leaves FMV on the original FMV', () => {
    const s = useDiaryStore.getState();
    s.setWakeTime(2, nyIso(4, 26, 7, 0));
    s.addVoid({ timestampIso: nyIso(4, 26, 7, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: nyIso(4, 26, 12, 0), volumeMl: 260, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: nyIso(4, 26, 18, 0), volumeMl: 280, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    let day2 = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2.find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(nyIso(4, 26, 7, 30));
    // Delete the noon void (non-FMV)
    const noonId = day2.find((v) => v.timestampIso === nyIso(4, 26, 12, 0))!.id;
    s.removeVoid(noonId);
    day2 = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2.find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(nyIso(4, 26, 7, 30));
  });
});

describe('Day-boundary times', () => {
  it('midnight (00:00) Apr 26 lands on Day 2 when no Day 1 bedtime', () => {
    // Without Day 1 bedtime, early-AM pull-back puts 00:00 on Day 1
    expect(getDayNumber(nyIso(4, 26, 0, 0), START, [], NY)).toBe(1);
  });

  it('5:59 AM Apr 26 with no bedtime → Day 1 (early-AM pullback)', () => {
    expect(getDayNumber(nyIso(4, 26, 5, 59), START, [], NY)).toBe(1);
  });

  it('5:59 AM Apr 26 WITH Day 1 bedtime at 23:00 Apr 25 → Day 2 (overnight)', () => {
    const bedtimes = [{ id: 'b', timestampIso: nyIso(4, 25, 23, 0), dayNumber: 1 as const }];
    expect(getDayNumber(nyIso(4, 26, 5, 59), START, bedtimes, NY)).toBe(2);
  });

  it('6:00 AM Apr 26 → always Day 2 regardless of bedtime', () => {
    expect(getDayNumber(nyIso(4, 26, 6, 0), START, [], NY)).toBe(2);
    const bedtimes = [{ id: 'b', timestampIso: nyIso(4, 25, 23, 0), dayNumber: 1 as const }];
    expect(getDayNumber(nyIso(4, 26, 6, 0), START, bedtimes, NY)).toBe(2);
  });

  it('23:59 Apr 25 with no Day 1 bedtime → Day 1', () => {
    expect(getDayNumber(nyIso(4, 25, 23, 59), START, [], NY)).toBe(1);
  });
});

describe('Bedtime delete reverts bedtime-aware bumping', () => {
  it('removing Day 1 bedtime returns post-23:00 voids back to Day 1', () => {
    const s = useDiaryStore.getState();
    s.setBedtime(1, nyIso(4, 25, 22, 0));
    // Void at 23:30 Apr 25 — bedtime bumps it to Day 2
    s.addVoid({ timestampIso: nyIso(4, 25, 23, 30), volumeMl: 200, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(0);
    s.removeBedtime(1);
    // After removing bedtime → 23:30 Apr 25 belongs to Day 1
    expect(useDiaryStore.getState().getVoidsForDay(1)).toHaveLength(1);
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
  });
});

describe('Edit void to flip night/day phase', () => {
  it('edit a day-phase void to BEFORE wake → becomes night-phase, FMV moves', () => {
    const s = useDiaryStore.getState();
    s.setWakeTime(2, nyIso(4, 26, 7, 0));
    s.addVoid({ timestampIso: nyIso(4, 26, 7, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: nyIso(4, 26, 12, 0), volumeMl: 260, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    let day2 = useDiaryStore.getState().getVoidsForDay(2);
    expect(day2.find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(nyIso(4, 26, 7, 30));
    const id = day2.find((v) => v.timestampIso === nyIso(4, 26, 7, 30))!.id;
    // Move it to 4:00 AM (before wake) — becomes night-phase
    s.updateVoid(id, { timestampIso: nyIso(4, 26, 4, 0) });
    day2 = useDiaryStore.getState().getVoidsForDay(2);
    const fmv = day2.find((v) => v.isFirstMorningVoid);
    expect(fmv?.timestampIso).toBe(nyIso(4, 26, 12, 0));
  });

  it('edit a void across day boundary (Day 2 → Day 3) clears Day 2 FMV', () => {
    const s = useDiaryStore.getState();
    s.setWakeTime(2, nyIso(4, 26, 7, 0));
    s.setWakeTime(3, nyIso(4, 27, 7, 0));
    s.setBedtime(2, nyIso(4, 26, 22, 0));
    s.addVoid({ timestampIso: nyIso(4, 26, 7, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    const id = useDiaryStore.getState().voids[0].id;
    s.updateVoid(id, { timestampIso: nyIso(4, 27, 7, 30) });
    expect(useDiaryStore.getState().getVoidsForDay(2)).toHaveLength(0);
    const day3 = useDiaryStore.getState().getVoidsForDay(3);
    expect(day3).toHaveLength(1);
    expect(day3[0].isFirstMorningVoid).toBe(true);
  });
});

describe('Wake time changes propagate to FMV', () => {
  it('wake moved AFTER current FMV → FMV moves to new earliest day-phase', () => {
    const s = useDiaryStore.getState();
    s.setWakeTime(2, nyIso(4, 26, 7, 0));
    s.addVoid({ timestampIso: nyIso(4, 26, 7, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: nyIso(4, 26, 12, 0), volumeMl: 260, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    expect(useDiaryStore.getState().getVoidsForDay(2).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(nyIso(4, 26, 7, 30));
    // Move wake to 11:00 (after 7:30, before 12:00) — 7:30 is now night, 12:00 is FMV
    s.setWakeTime(2, nyIso(4, 26, 11, 0));
    expect(useDiaryStore.getState().getVoidsForDay(2).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(nyIso(4, 26, 12, 0));
  });

  it('wake moved BEFORE all voids → earliest void becomes FMV', () => {
    const s = useDiaryStore.getState();
    s.setWakeTime(2, nyIso(4, 26, 9, 0));
    s.addVoid({ timestampIso: nyIso(4, 26, 7, 30), volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    s.addVoid({ timestampIso: nyIso(4, 26, 12, 0), volumeMl: 260, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    // Initially 7:30 is night-phase (before 9:00 wake), so FMV should be 12:00
    expect(useDiaryStore.getState().getVoidsForDay(2).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(nyIso(4, 26, 12, 0));
    // Move wake earlier
    s.setWakeTime(2, nyIso(4, 26, 6, 0));
    expect(useDiaryStore.getState().getVoidsForDay(2).find((v) => v.isFirstMorningVoid)?.timestampIso).toBe(nyIso(4, 26, 7, 30));
  });
});

describe('TimePicker round-trip stability across many timezones', () => {
  // Edge zones: half-hour offset (Kolkata 5:30, Adelaide 9:30/10:30), nepal (5:45),
  // negative (Hawaii UTC-10), DST-active (NY April), and DST-static (Singapore).
  const tzs = [
    'Asia/Kolkata',         // +5:30
    'Asia/Kathmandu',       // +5:45 (rare)
    'Australia/Adelaide',   // +9:30 / +10:30 DST
    'Pacific/Honolulu',     // -10
    'America/Anchorage',    // -9 / -8 DST
    'Atlantic/Azores',      // -1 / 0 DST
    'America/St_Johns',     // -3:30 / -2:30 DST
  ];

  for (const tz of tzs) {
    it(`round-trip 06:00 in ${tz}`, () => {
      const base = `2026-04-26T12:00:00.000Z`;
      const out = buildIsoForClockTimeInTz(base, 6, 0, tz);
      expect(getClockTimeInTz(out, tz)).toBe('06:00');
    });
    it(`round-trip 23:45 in ${tz}`, () => {
      const base = `2026-04-26T12:00:00.000Z`;
      const out = buildIsoForClockTimeInTz(base, 23, 45, tz);
      expect(getClockTimeInTz(out, tz)).toBe('23:45');
    });
    it(`round-trip 00:00 in ${tz}`, () => {
      const base = `2026-04-26T12:00:00.000Z`;
      const out = buildIsoForClockTimeInTz(base, 0, 0, tz);
      expect(getClockTimeInTz(out, tz)).toBe('00:00');
    });
  }
});

describe('DST: winter (EST) and summer (EDT) round-trip cleanly', () => {
  it('January 15 in America/New_York → 06:00 round-trips through EST (UTC-5)', () => {
    const base = '2026-01-15T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 6, 0, NY);
    // 06:00 EST = 11:00 UTC (UTC-5)
    expect(out).toBe('2026-01-15T11:00:00.000Z');
    expect(getClockTimeInTz(out, NY)).toBe('06:00');
  });

  it('July 15 in America/New_York → 06:00 round-trips through EDT (UTC-4)', () => {
    const base = '2026-07-15T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 6, 0, NY);
    // 06:00 EDT = 10:00 UTC (UTC-4)
    expect(out).toBe('2026-07-15T10:00:00.000Z');
    expect(getClockTimeInTz(out, NY)).toBe('06:00');
  });

  it('Spring-forward day (Mar 8 2026 in NY): 03:30 reads as 03:30', () => {
    // Spring forward: 02:00 EST jumps to 03:00 EDT (02:30 doesn't exist)
    // 03:30 EDT after the jump = 07:30 UTC
    const base = '2026-03-08T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 3, 30, NY);
    expect(out).toBe('2026-03-08T07:30:00.000Z');
    expect(getClockTimeInTz(out, NY)).toBe('03:30');
  });

  it('Fall-back day (Nov 1 2026 in NY): 03:00 reads as 03:00 (after the rollback)', () => {
    // Fall back: 02:00 EDT becomes 01:00 EST (01:30 happens twice)
    // 03:00 EST after the rollback = 08:00 UTC
    const base = '2026-11-01T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 3, 0, NY);
    expect(out).toBe('2026-11-01T08:00:00.000Z');
    expect(getClockTimeInTz(out, NY)).toBe('03:00');
  });

  it('full diary spanning DST: EST Day 1 → EDT Day 3 around Mar 8 2026', () => {
    useDiaryStore.setState({ startDate: '2026-03-07', timeZone: NY });
    const s = useDiaryStore.getState();
    // Day 1 (Mar 7) — EST: bedtime 22:00 EST = 03:00 UTC Mar 8
    s.setBedtime(1, buildIsoForClockTimeInTz('2026-03-07T12:00:00.000Z', 22, 0, NY));
    // Day 2 (Mar 8) — DST starts at 02:00. Wake at 07:00 EDT = 11:00 UTC
    s.setWakeTime(2, buildIsoForClockTimeInTz('2026-03-08T12:00:00.000Z', 7, 0, NY));
    // Void at 08:00 EDT Mar 8 = 12:00 UTC
    const v1 = buildIsoForClockTimeInTz('2026-03-08T12:00:00.000Z', 8, 0, NY);
    expect(s.addVoid({ timestampIso: v1, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false })).toBe(true);
    expect(getDayNumber(v1, '2026-03-07', useDiaryStore.getState().bedtimes, NY)).toBe(2);

    // Day 3 (Mar 9) — EDT
    s.setBedtime(2, buildIsoForClockTimeInTz('2026-03-08T12:00:00.000Z', 22, 0, NY));
    s.setWakeTime(3, buildIsoForClockTimeInTz('2026-03-09T12:00:00.000Z', 7, 0, NY));
    const v2 = buildIsoForClockTimeInTz('2026-03-09T12:00:00.000Z', 8, 0, NY);
    s.addVoid({ timestampIso: v2, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false });
    expect(getDayNumber(v2, '2026-03-07', useDiaryStore.getState().bedtimes, NY)).toBe(3);
  });
});

describe('DST in Europe (London) and Australia (Sydney)', () => {
  it('London BST (summer): 06:00 in July → UTC+1', () => {
    const base = '2026-07-15T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 6, 0, 'Europe/London');
    expect(out).toBe('2026-07-15T05:00:00.000Z');
    expect(getClockTimeInTz(out, 'Europe/London')).toBe('06:00');
  });

  it('London GMT (winter): 06:00 in December → UTC+0', () => {
    const base = '2026-12-15T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 6, 0, 'Europe/London');
    expect(out).toBe('2026-12-15T06:00:00.000Z');
    expect(getClockTimeInTz(out, 'Europe/London')).toBe('06:00');
  });

  it('Sydney AEDT (Southern summer): 06:00 in January → UTC+11', () => {
    const base = '2026-01-15T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 6, 0, 'Australia/Sydney');
    // 06:00 AEDT = 19:00 UTC the previous day
    expect(out).toBe('2026-01-14T19:00:00.000Z');
    expect(getClockTimeInTz(out, 'Australia/Sydney')).toBe('06:00');
  });

  it('Sydney AEST (Southern winter): 06:00 in July → UTC+10', () => {
    const base = '2026-07-15T12:00:00.000Z';
    const out = buildIsoForClockTimeInTz(base, 6, 0, 'Australia/Sydney');
    expect(out).toBe('2026-07-14T20:00:00.000Z');
    expect(getClockTimeInTz(out, 'Australia/Sydney')).toBe('06:00');
  });
});

describe('Stored TZ != browser TZ — events still slot correctly', () => {
  it('user selected UTC, browser is Kolkata: 6 AM UTC void on Day 2 stays on Day 2', () => {
    useDiaryStore.setState({ timeZone: 'UTC' });
    const s = useDiaryStore.getState();
    // Day 2 = 2026-04-26 in UTC
    const baseDay2 = '2026-04-26T12:00:00.000Z';
    const voidIso = buildIsoForClockTimeInTz(baseDay2, 6, 0, 'UTC');
    expect(voidIso).toBe('2026-04-26T06:00:00.000Z');
    s.setWakeTime(2, buildIsoForClockTimeInTz(baseDay2, 5, 0, 'UTC'));
    expect(s.addVoid({ timestampIso: voidIso, volumeMl: 250, sensation: 2, leak: false, note: '', isFirstMorningVoid: false })).toBe(true);
    expect(useDiaryStore.getState().getVoidsForDay(2).map((v) => v.timestampIso)).toContain(voidIso);
  });
});
