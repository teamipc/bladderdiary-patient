/**
 * Unit tests for notifications.ts — getNextOccurrence and scheduleDiaryCompleteReminder.
 *
 * Uses vitest fake timers (vi.useFakeTimers / vi.setSystemTime) to pin "now" to
 * specific instants and verify that computed delays are correct across timezones
 * and DST transitions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelReminders, getNextOccurrence, scheduleDiaryCompleteReminder } from '@/lib/notifications';

// Stub Notification.permission so scheduleDiaryCompleteReminder doesn't bail
// early on its permission check (jsdom doesn't define Notification by default).
Object.defineProperty(globalThis, 'Notification', {
  configurable: true,
  value: { permission: 'granted', requestPermission: vi.fn() },
});

// ---------------------------------------------------------------------------
// Suite 1 — parametrized: getNextOccurrence always returns a future date
// across all supported timezones and all reminder hours.
// ---------------------------------------------------------------------------
describe('getNextOccurrence — returns a future Date in every timezone', () => {
  const TIMEZONES = [
    'America/New_York',
    'America/Los_Angeles',
    'Pacific/Honolulu',
    'Asia/Singapore',
    'Europe/London',
    'Asia/Kolkata',
  ];
  const REMINDER_HOURS = [8, 14, 21];
  const FIXED_NOW = '2026-07-15T16:00:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  for (const tz of TIMEZONES) {
    for (const hour of REMINDER_HOURS) {
      it(`tz=${tz} hour=${hour}: delay is > 0 and <= 86_400_000 ms`, () => {
        const next = getNextOccurrence(hour, 0, tz);
        const delay = next.getTime() - Date.now();
        expect(delay).toBeGreaterThan(0);
        expect(delay).toBeLessThanOrEqual(86_400_000);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Suite 2 — BLOCKING-1 regression: west-of-UTC timezone past the reminder hour.
// 18:00 UTC = 14:00 EDT — 8 AM has already passed today, must roll to tomorrow.
// ---------------------------------------------------------------------------
describe('getNextOccurrence — BLOCKING-1 regression (America/New_York after 8 AM)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns tomorrow 8 AM EDT, not today which is in the past', () => {
    const next = getNextOccurrence(8, 0, 'America/New_York');
    expect(next.getTime()).toBeGreaterThan(Date.now());
    // 8 AM EDT next day = 2026-07-16T12:00:00.000Z
    expect(next.toISOString().startsWith('2026-07-16')).toBe(true);
  });

  it('returns tomorrow 8 AM HST for the far-west Pacific/Honolulu case', () => {
    // 18:00 UTC = 08:00 HST. At exactly 08:00 HST the today computation should
    // already be past. Roll to tomorrow's 8 AM HST = 2026-07-16T18:00:00.000Z.
    const next = getNextOccurrence(8, 0, 'Pacific/Honolulu');
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect(next.toISOString().startsWith('2026-07-16')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — boundary transitions: just before and just after the reminder hour
// ---------------------------------------------------------------------------
describe('getNextOccurrence — just before and just after transition', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('just before: delay is ~1 min when system is 1 min before 8 AM EDT', () => {
    vi.useFakeTimers();
    // 8 AM EDT = 12:00 UTC; 1 min before = 11:59:00 UTC
    vi.setSystemTime(new Date('2026-07-15T11:59:00.000Z'));
    const next = getNextOccurrence(8, 0, 'America/New_York');
    const delay = next.getTime() - Date.now();
    expect(delay).toBeGreaterThanOrEqual(55_000);
    expect(delay).toBeLessThanOrEqual(65_000);
  });

  it('just after: delay is ~24h minus 1 min when system is 1 min after 8 AM EDT', () => {
    vi.useFakeTimers();
    // 8 AM EDT = 12:00 UTC; 1 min after = 12:01:00 UTC
    vi.setSystemTime(new Date('2026-07-15T12:01:00.000Z'));
    const next = getNextOccurrence(8, 0, 'America/New_York');
    const delay = next.getTime() - Date.now();
    // Expect ~86_340_000 ms; allow ±5 s tolerance
    expect(delay).toBeGreaterThanOrEqual(86_335_000);
    expect(delay).toBeLessThanOrEqual(86_345_000);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — scheduleDiaryCompleteReminder DST safety (spring forward)
// Start on 2026-03-06 (Friday before US "spring forward" on 2026-03-08 02:00).
// Day 4 = 2026-03-09; 9 AM EDT on 2026-03-09 = 13:00 UTC (UTC-4 after DST).
// "Now" pinned to 2026-03-06T17:00:00.000Z (= 12:00 EST on the start date).
//
// Expected delay (NEW calendar-date code): 2026-03-09T13:00:00Z -
// 2026-03-06T17:00:00Z = 68 hours = 244_800_000 ms (correct = 9 AM EDT).
//
// Old flat-ms code (the bug): startIso was 9 AM EST = 14:00 UTC on day 0;
// + 3 * 86_400_000 ms = 14:00 UTC on day 4 = 10 AM EDT — 1 hour late.
// ---------------------------------------------------------------------------
describe('scheduleDiaryCompleteReminder — DST safety (spring forward)', () => {
  let setTimeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T17:00:00.000Z'));
    setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    cancelReminders();
  });

  afterEach(() => {
    cancelReminders();
    setTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  it('fires at 9 AM local on day 4 even across DST spring-forward', () => {
    scheduleDiaryCompleteReminder('2026-03-06', 'America/New_York');

    const calls = setTimeoutSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    const delay = lastCall[1] as number;

    // 2026-03-09T13:00:00Z (9 AM EDT) - 2026-03-06T17:00:00Z = 244_800_000 ms.
    // Old buggy code would produce 248_400_000 ms (= 10 AM EDT day 4, off by 1h).
    expect(delay).toBeGreaterThanOrEqual(244_799_000);
    expect(delay).toBeLessThanOrEqual(244_801_000);
  });
});
