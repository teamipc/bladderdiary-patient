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
  getHoursInTz,
  getDateInTz,
  detectTimeZone,
  timeZoneCity,
  getTimezoneOffset,
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
// Timezone helpers
// ──────────────────────────────────────────────
describe('getHoursInTz', () => {
  it('returns UTC hour when timeZone is UTC', () => {
    expect(getHoursInTz('2026-03-08T14:30:00.000Z', 'UTC')).toBe(14);
  });

  it('returns hour shifted by timezone offset', () => {
    // UTC 14:30 → Singapore (UTC+8) = 22:30
    expect(getHoursInTz('2026-03-08T14:30:00.000Z', 'Asia/Singapore')).toBe(22);
  });

  it('handles midnight correctly', () => {
    expect(getHoursInTz('2026-03-08T00:00:00.000Z', 'UTC')).toBe(0);
  });

  it('handles day crossover', () => {
    // UTC 20:00 → Singapore (UTC+8) = 04:00 next day
    expect(getHoursInTz('2026-03-08T20:00:00.000Z', 'Asia/Singapore')).toBe(4);
  });
});

describe('getDateInTz', () => {
  it('returns UTC date when timezone is UTC', () => {
    expect(getDateInTz('2026-03-08T14:30:00.000Z', 'UTC')).toBe('2026-03-08');
  });

  it('handles date rollover for timezone ahead of UTC', () => {
    // UTC 20:00 March 8 → Singapore = March 9 04:00
    expect(getDateInTz('2026-03-08T20:00:00.000Z', 'Asia/Singapore')).toBe('2026-03-09');
  });

  it('handles date rollback for timezone behind UTC', () => {
    // UTC 03:00 March 9 → LA (UTC-7 in March) = March 8 20:00
    expect(getDateInTz('2026-03-09T03:00:00.000Z', 'America/Los_Angeles')).toBe('2026-03-08');
  });
});

describe('detectTimeZone', () => {
  it('returns a non-empty IANA string', () => {
    const tz = detectTimeZone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });
});

describe('timeZoneCity', () => {
  it('extracts city from IANA timezone', () => {
    expect(timeZoneCity('Asia/Singapore')).toBe('Singapore');
    expect(timeZoneCity('America/New_York')).toBe('New York');
    expect(timeZoneCity('Australia/Sydney')).toBe('Sydney');
  });
});

describe('getTimezoneOffset', () => {
  it('returns a UTC offset string', () => {
    const offset = getTimezoneOffset('Asia/Singapore');
    expect(offset).toContain('GMT');
  });
});

// ──────────────────────────────────────────────
// formatTime — uses Intl.DateTimeFormat with explicit timezone
// ──────────────────────────────────────────────
describe('formatTime', () => {
  it('returns a non-empty string', () => {
    const result = formatTime('2026-03-08T08:15:00.000Z');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats morning UTC time in UTC timezone correctly', () => {
    const result = formatTime('2026-03-08T08:15:00.000Z', 'en', 'UTC');
    expect(result).toBe('8:15 AM');
  });

  it('formats afternoon UTC time in UTC timezone correctly', () => {
    const result = formatTime('2026-03-08T14:30:00.000Z', 'en', 'UTC');
    expect(result).toBe('2:30 PM');
  });

  it('converts to Singapore timezone correctly', () => {
    // UTC 08:15 → SGT 16:15
    const result = formatTime('2026-03-08T08:15:00.000Z', 'en', 'Asia/Singapore');
    expect(result).toBe('4:15 PM');
  });

  it('uses 24h format for French locale', () => {
    const result = formatTime('2026-03-08T14:30:00.000Z', 'fr', 'UTC');
    expect(result).toBe('14:30');
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

  it('formats French date with mars', () => {
    const result = formatDate('2026-03-08T12:00:00', 'fr');
    expect(result.toLowerCase()).toContain('mars');
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
// Uses UTC timezone to match UTC timestamps in tests
// ──────────────────────────────────────────────
describe('getDayNumber', () => {
  const startDate = '2026-03-08';
  const tz = 'UTC';

  describe('without bedtimes (calendar-day based)', () => {
    it('assigns events on start date to Day 1', () => {
      expect(getDayNumber('2026-03-08T10:00:00.000Z', startDate, undefined, tz)).toBe(1);
    });

    it('assigns events on day after start to Day 2', () => {
      expect(getDayNumber('2026-03-09T10:00:00.000Z', startDate, undefined, tz)).toBe(2);
    });

    it('assigns events two days after start to Day 3', () => {
      expect(getDayNumber('2026-03-10T10:00:00.000Z', startDate, undefined, tz)).toBe(3);
    });

    it('clamps events before start date to Day 1', () => {
      expect(getDayNumber('2026-03-07T23:00:00.000Z', startDate, undefined, tz)).toBe(1);
    });

    it('clamps events far in the future to Day 3', () => {
      expect(getDayNumber('2026-03-15T10:00:00.000Z', startDate, undefined, tz)).toBe(3);
    });
  });

  describe('with bedtimes (overnight boundary)', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
    ];

    it('assigns events before Day 1 bedtime to Day 1', () => {
      expect(getDayNumber('2026-03-08T21:00:00.000Z', startDate, bedtimes, tz)).toBe(1);
    });

    it('assigns events after Day 1 bedtime to Day 2 (overnight bump)', () => {
      expect(getDayNumber('2026-03-08T23:00:00.000Z', startDate, bedtimes, tz)).toBe(2);
    });

    it('assigns events at exactly bedtime to Day 1 (not strictly after)', () => {
      expect(getDayNumber('2026-03-08T22:00:00.000Z', startDate, bedtimes, tz)).toBe(1);
    });

    it('does not bump Day 3 events beyond Day 3', () => {
      const allBedtimes: BedtimeEntry[] = [
        ...bedtimes,
        { id: 'bt2', timestampIso: '2026-03-09T22:00:00.000Z', dayNumber: 2 },
        { id: 'bt3', timestampIso: '2026-03-10T22:00:00.000Z', dayNumber: 3 },
      ];
      // Event after Day 3 bedtime stays on Day 3
      expect(getDayNumber('2026-03-10T23:00:00.000Z', startDate, allBedtimes, tz)).toBe(3);
    });
  });

  describe('multi-day bedtime boundaries', () => {
    const bedtimes: BedtimeEntry[] = [
      { id: 'bt1', timestampIso: '2026-03-08T22:00:00.000Z', dayNumber: 1 },
      { id: 'bt2', timestampIso: '2026-03-09T21:30:00.000Z', dayNumber: 2 },
    ];

    it('assigns overnight event between Day 1 and Day 2 to Day 2', () => {
      expect(getDayNumber('2026-03-08T23:30:00.000Z', startDate, bedtimes, tz)).toBe(2);
    });

    it('assigns event after Day 2 bedtime to Day 3', () => {
      expect(getDayNumber('2026-03-09T22:00:00.000Z', startDate, bedtimes, tz)).toBe(3);
    });

    it('assigns daytime Day 2 event to Day 2', () => {
      expect(getDayNumber('2026-03-09T14:00:00.000Z', startDate, bedtimes, tz)).toBe(2);
    });
  });

  describe('timezone-aware day boundaries', () => {
    it('assigns early-AM SGT event to previous day when no bedtime (pull-back)', () => {
      // UTC 20:00 March 8 = SGT 04:00 March 9 → early AM pull-back to Day 1 (no bedtime set)
      expect(getDayNumber('2026-03-08T20:00:00.000Z', startDate, undefined, 'Asia/Singapore')).toBe(1);
    });

    it('assigns SGT daytime event to correct day', () => {
      // UTC 02:00 March 9 = SGT 10:00 March 9 → Day 2
      expect(getDayNumber('2026-03-09T02:00:00.000Z', startDate, undefined, 'Asia/Singapore')).toBe(2);
    });

    it('assigns SGT event to Day 2 after bedtime is set', () => {
      // UTC 20:00 March 8 = SGT 04:00 March 9 → with Day 1 bedtime, stays on Day 2
      const bedtimes: BedtimeEntry[] = [
        { id: 'bt1', timestampIso: '2026-03-08T14:00:00.000Z', dayNumber: 1 }, // SGT 22:00 bedtime
      ];
      expect(getDayNumber('2026-03-08T20:00:00.000Z', startDate, bedtimes, 'Asia/Singapore')).toBe(2);
    });

    it('assigns event to correct day in America/Los_Angeles', () => {
      // UTC 03:00 March 9 = LA 19:00 March 8 (PST, UTC-8 in March before DST)
      // Start date March 8 → still Day 1 in LA timezone
      expect(getDayNumber('2026-03-09T03:00:00.000Z', startDate, undefined, 'America/Los_Angeles')).toBe(1);
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
