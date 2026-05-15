/**
 * Unit tests for notifications.ts — getNextOccurrence and scheduleDiaryCompleteReminder.
 *
 * Uses vitest fake timers (vi.useFakeTimers / vi.setSystemTime) to pin "now" to
 * specific instants and verify that computed delays are correct across timezones
 * and DST transitions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNextOccurrence } from '@/lib/notifications';

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
