import { describe, it, expect } from 'vitest';
import { format, subDays } from 'date-fns';
import {
  generateId,
  formatTime,
  formatDate,
  formatFullDate,
  getDayNumber,
  getDayDate,
  roundToMinutes,
  getCurrentDay,
} from '@/lib/utils';
import type { BedtimeEntry } from '@/lib/types';

// ──────────────────────────────────────────────
// generateId
// ──────────────────────────────────────────────
describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ──────────────────────────────────────────────
// formatTime — uses local timezone so we build
// expected values from the same local offset.
// ──────────────────────────────────────────────
describe('formatTime', () => {
  /** Helper: build a local time string for a given UTC ISO, matching formatTime output. */
  function localExpected(iso: string): string {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${ampm}`;
  }

  it('returns a non-empty string in h:mm AM/PM format', () => {
    const result = formatTime('2026-03-08T08:15:00.000Z');
    expect(result).toMatch(/^\d{1,2}:\d{2}\s(AM|PM)$/);
  });

  it('formats morning time correctly (local)', () => {
    const iso = '2026-03-08T08:15:00.000Z';
    expect(formatTime(iso)).toBe(localExpected(iso));
  });

  it('formats afternoon time correctly (local)', () => {
    const iso = '2026-03-08T14:30:00.000Z';
    expect(formatTime(iso)).toBe(localExpected(iso));
  });

  it('formats midnight UTC correctly (local)', () => {
    const iso = '2026-03-08T00:00:00.000Z';
    expect(formatTime(iso)).toBe(localExpected(iso));
  });

  it('formats noon UTC correctly (local)', () => {
    const iso = '2026-03-08T12:00:00.000Z';
    expect(formatTime(iso)).toBe(localExpected(iso));
  });
});

// ──────────────────────────────────────────────
// formatDate
// ──────────────────────────────────────────────
describe('formatDate', () => {
  it('includes year in output', () => {
    const result = formatDate('2026-03-08T12:00:00');
    expect(result).toContain('2026');
  });

  it('includes month name', () => {
    const result = formatDate('2026-03-08T12:00:00');
    expect(result).toContain('March');
  });

  it('formats French date with correct order', () => {
    const result = formatDate('2026-03-08T12:00:00', 'fr');
    expect(result).toContain('mars');
    expect(result).toContain('2026');
  });
});

// ──────────────────────────────────────────────
// formatFullDate
// ──────────────────────────────────────────────
describe('formatFullDate', () => {
  it('formats as full month name with year', () => {
    const result = formatFullDate('2026-03-08');
    expect(result).toContain('March');
    expect(result).toContain('2026');
    expect(result).toContain('8');
  });
});

// ──────────────────────────────────────────────
// getDayNumber — core day boundary logic
// ──────────────────────────────────────────────
describe('getDayNumber', () => {
  const startDate = '2026-03-08';

  describe('without bedtimes (calendar-day based)', () => {
    it('assigns events on start date to Day 1', () => {
      expect(getDayNumber('2026-03-08T10:00:00.000Z', startDate)).toBe(1);
    });

    it('assigns events on day after start to Day 2', () => {
      expect(getDayNumber('2026-03-09T10:00:00.000Z', startDate)).toBe(2);
    });

    it('assigns events two days after start to Day 3', () => {
      expect(getDayNumber('2026-03-10T10:00:00.000Z', startDate)).toBe(3);
    });

    it('clamps events before start date to Day 1', () => {
      expect(getDayNumber('2026-03-07T23:00:00.000Z', startDate)).toBe(1);
    });

    it('clamps events far in the future to Day 3', () => {
      expect(getDayNumber('2026-03-15T10:00:00.000Z', startDate)).toBe(3);
    });
  });

  describe('with bedtimes (overnight boundary)', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
    ];

    it('assigns events before Day 1 bedtime to Day 1', () => {
      expect(getDayNumber('2026-03-08T21:00:00.000Z', startDate, bedtimes)).toBe(1);
    });

    it('assigns events after Day 1 bedtime to Day 2 (overnight bump)', () => {
      expect(getDayNumber('2026-03-08T23:00:00.000Z', startDate, bedtimes)).toBe(2);
    });

    it('assigns events at exactly bedtime to Day 1 (not strictly after)', () => {
      expect(getDayNumber('2026-03-08T22:00:00.000Z', startDate, bedtimes)).toBe(1);
    });

    it('does not bump Day 3 events beyond Day 3', () => {
      const allBedtimes: BedtimeEntry[] = [
        ...bedtimes,
        { id: 'bt2', timestampIso: '2026-03-09T22:00:00.000Z', dayNumber: 2 },
        { id: 'bt3', timestampIso: '2026-03-10T22:00:00.000Z', dayNumber: 3 },
      ];
      // Event after Day 3 bedtime stays on Day 3
      expect(getDayNumber('2026-03-10T23:00:00.000Z', startDate, allBedtimes)).toBe(3);
    });
  });

  describe('multi-day bedtime boundaries', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
      { id: 'bt2', timestampIso: '2026-03-09T21:30:00.000Z', dayNumber: 2 },
    ];

    it('assigns overnight event between Day 1 and Day 2 to Day 2', () => {
      expect(getDayNumber('2026-03-08T23:30:00.000Z', startDate, bedtimes)).toBe(2);
    });

    it('assigns event after Day 2 bedtime to Day 3', () => {
      expect(getDayNumber('2026-03-09T22:00:00.000Z', startDate, bedtimes)).toBe(3);
    });

    it('assigns daytime Day 2 event to Day 2', () => {
      expect(getDayNumber('2026-03-09T14:00:00.000Z', startDate, bedtimes)).toBe(2);
    });
  });
});

// ──────────────────────────────────────────────
// getDayDate
// ──────────────────────────────────────────────
describe('getDayDate', () => {
  const startDate = '2026-03-08';

  it('returns start date for Day 1', () => {
    expect(getDayDate(startDate, 1)).toBe('2026-03-08');
  });

  it('returns next day for Day 2', () => {
    expect(getDayDate(startDate, 2)).toBe('2026-03-09');
  });

  it('returns two days later for Day 3', () => {
    expect(getDayDate(startDate, 3)).toBe('2026-03-10');
  });
});

// ──────────────────────────────────────────────
// roundToMinutes
// ──────────────────────────────────────────────
describe('roundToMinutes', () => {
  it('rounds down to nearest 5 minutes', () => {
    const date = new Date('2026-03-08T10:12:00.000Z');
    const rounded = roundToMinutes(date, 5);
    expect(rounded.getUTCMinutes()).toBe(10);
  });

  it('rounds up to nearest 5 minutes', () => {
    const date = new Date('2026-03-08T10:13:00.000Z');
    const rounded = roundToMinutes(date, 5);
    expect(rounded.getUTCMinutes()).toBe(15);
  });

  it('keeps exact 5-minute boundaries unchanged', () => {
    const date = new Date('2026-03-08T10:15:00.000Z');
    const rounded = roundToMinutes(date, 5);
    expect(rounded.getUTCMinutes()).toBe(15);
  });
});

// ──────────────────────────────────────────────
// getCurrentDay
// ──────────────────────────────────────────────
describe('getCurrentDay', () => {
  // getCurrentDay uses differenceInCalendarDays with local dates,
  // so test dates must also be computed in local time (not UTC).

  it('returns 1 when start date is today', () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    expect(getCurrentDay(today)).toBe(1);
  });

  it('returns 2 when start date was yesterday', () => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    expect(getCurrentDay(yesterday)).toBe(2);
  });

  it('returns 3 when start date was 2+ days ago', () => {
    const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
    expect(getCurrentDay(twoDaysAgo)).toBe(3);
  });

  it('clamps future start dates to Day 1', () => {
    const tomorrow = format(subDays(new Date(), -1), 'yyyy-MM-dd');
    expect(getCurrentDay(tomorrow)).toBe(1);
  });

  it('clamps very old start dates to Day 3', () => {
    expect(getCurrentDay('2020-01-01')).toBe(3);
  });
});
