import { parseISO, addDays } from 'date-fns';
import type { BedtimeEntry } from './types';

/* ------------------------------------------------------------------ */
/*  Intl locale mapping                                                */
/* ------------------------------------------------------------------ */

const INTL_LOCALES: Record<string, string> = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' };

function toIntlLocale(locale?: string): string {
  return (locale && INTL_LOCALES[locale]) || 'en-US';
}

/* ------------------------------------------------------------------ */
/*  Timezone helpers                                                   */
/* ------------------------------------------------------------------ */

/** Detect the browser's IANA timezone (e.g. "Asia/Singapore"). */
export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/** Extract the hour (0–23) of an ISO timestamp in a specific timezone. */
export function getHoursInTz(isoString: string, timeZone?: string): number {
  const d = new Date(isoString);
  if (!timeZone) return d.getHours(); // fallback to browser local
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).formatToParts(d);
  const hourPart = parts.find((p) => p.type === 'hour');
  const h = parseInt(hourPart?.value ?? '0', 10);
  return h === 24 ? 0 : h; // midnight is sometimes "24" in formatToParts
}

/** Extract the minute (0–59) of an ISO timestamp in a specific timezone. */
export function getMinutesInTz(isoString: string, timeZone?: string): number {
  const d = new Date(isoString);
  if (!timeZone) return d.getMinutes();
  const parts = new Intl.DateTimeFormat('en-US', {
    minute: 'numeric',
    hour12: false,
    timeZone,
  }).formatToParts(d);
  const m = parts.find((p) => p.type === 'minute');
  return parseInt(m?.value ?? '0', 10);
}

/** Get the clock time (HH:mm) of an ISO timestamp in a specific timezone. */
export function getClockTimeInTz(isoString: string, timeZone?: string): string {
  const h = getHoursInTz(isoString, timeZone);
  const m = getMinutesInTz(isoString, timeZone);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Build an ISO timestamp for a clock-time (hours/minutes) on the same calendar
 * date as `baseIso`, interpreted in the user's chosen `timeZone`.
 *
 * Why: `Date.setHours()` operates in the BROWSER's local timezone, not the
 * user's chosen timezone. When those don't match (patient travels, browser
 * misreports, fallback-to-UTC), times slide by hours and events land on the
 * wrong diary day. This helper preserves the user's intent regardless of
 * what timezone the browser reports.
 *
 * Iterates twice to handle DST transitions where the offset changes between
 * the naive guess and the corrected instant.
 */
export function buildIsoForClockTimeInTz(
  baseIso: string,
  hours: number,
  minutes: number,
  timeZone?: string,
): string {
  if (!timeZone) {
    const d = new Date(baseIso);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }
  const dateStr = getDateInTz(baseIso, timeZone); // "YYYY-MM-DD" in user's tz
  const y = Number(dateStr.slice(0, 4));
  const mo = Number(dateStr.slice(5, 7)) - 1;
  const d = Number(dateStr.slice(8, 10));

  // Iteratively converge on the UTC instant that reads as `dateStr hours:minutes` in `timeZone`.
  let utcMs = Date.UTC(y, mo, d, hours, minutes, 0, 0);
  for (let i = 0; i < 3; i++) {
    const offsetMin = tzOffsetMinutes(utcMs, timeZone);
    const next = Date.UTC(y, mo, d, hours, minutes, 0, 0) - offsetMin * 60_000;
    if (next === utcMs) break;
    utcMs = next;
  }
  return new Date(utcMs).toISOString();
}

/** Offset in minutes between `timeZone` and UTC at the given UTC instant. Positive when east of UTC. */
function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  const date = new Date(utcMs);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  const tzAsUtc = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')) % 24,
    Number(get('minute')),
    Number(get('second')),
  );
  return Math.round((tzAsUtc - utcMs) / 60_000);
}

/** Extract YYYY-MM-DD of an ISO timestamp in a specific timezone. */
export function getDateInTz(isoString: string, timeZone?: string): string {
  const d = new Date(isoString);
  if (!timeZone) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${day}`;
}

/** Calendar day difference between two ISO timestamps in a specific timezone. */
function diffCalendarDaysInTz(isoA: string, isoB: string, timeZone?: string): number {
  const dateA = getDateInTz(isoA, timeZone);
  const dateB = getDateInTz(isoB, timeZone);
  const msA = Date.parse(dateA + 'T00:00:00');
  const msB = Date.parse(dateB + 'T00:00:00');
  return Math.round((msA - msB) / 86_400_000);
}

/** Get the current time-of-day (HH:MM:SS) in a specific timezone. */
function getTimeOfDayInTz(timeZone?: string): string {
  const now = new Date();
  if (!timeZone) return now.toTimeString().slice(0, 8);
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const s = parts.find((p) => p.type === 'second')?.value ?? '00';
  return `${h}:${m}:${s}`;
}

/** Get the short timezone abbreviation (e.g. "SGT", "CET", "EST"). */
export function getTimezoneAbbr(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short',
      timeZone,
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** Get the UTC offset string (e.g. "UTC+8", "UTC-5"). */
export function getTimezoneOffset(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'shortOffset',
      timeZone,
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** Extract the city name from an IANA timezone (e.g. "Asia/Singapore" → "Singapore"). */
export function timeZoneCity(tz: string): string {
  const city = tz.split('/').pop() ?? tz;
  return city.replace(/_/g, ' ');
}

/* ------------------------------------------------------------------ */
/*  Volume unit conversion                                             */
/* ------------------------------------------------------------------ */

const ML_PER_OZ = 29.5735;

/** Convert internal mL value to the user's display unit. */
export function mlToDisplayVolume(ml: number, unit: 'mL' | 'oz'): number {
  if (unit === 'oz') return Math.round(ml / ML_PER_OZ);
  return ml;
}

/** Convert a value in the user's display unit back to mL for storage. */
export function displayVolumeToMl(value: number, unit: 'mL' | 'oz'): number {
  if (unit === 'oz') return Math.round(value * ML_PER_OZ);
  return value;
}

/** Generate a unique ID. */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/* ------------------------------------------------------------------ */
/*  Timezone-aware formatting                                          */
/* ------------------------------------------------------------------ */

/** Format a time string from ISO. Uses locale-aware pattern (e.g. "8:15 AM" en, "8h15" fr). */
export function formatTime(isoString: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(isoString));
}

/** Format a date, e.g. "Mar 10, 2026" (en) / "10 mars 2026" (fr). */
export function formatDate(isoString: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'medium',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(isoString));
}

/** Format full date, e.g. "March 10, 2026" (en) / "10 mars 2026" (fr). */
export function formatFullDate(dateStr: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'long',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(dateStr + 'T12:00:00'));
}

/** Format full day name + date, e.g. "Sunday, March 8, 2026". */
export function formatFullDayDate(dateStr: string, locale?: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'));
}

/* ------------------------------------------------------------------ */
/*  Day boundary logic                                                 */
/* ------------------------------------------------------------------ */

/**
 * Get day number (1, 2, or 3) for a timestamp given the diary start date.
 * When bedtimes are provided, uses bedtime-aware boundaries:
 * entries after a day's bedtime are attributed to the next day (overnight logic).
 *
 * Early-AM events (0:00–5:59) on the calendar day *after* a diary day are
 * attributed to that diary day when it has no bedtime set yet — the user was
 * still awake past midnight and logged the event on the current day.
 */
export function getDayNumber(
  timestampIso: string,
  startDate: string,
  bedtimes?: BedtimeEntry[],
  timeZone?: string,
): 1 | 2 | 3 {
  // Get the event's calendar date in the user's timezone, then diff against startDate directly
  const eventDateStr = getDateInTz(timestampIso, timeZone); // "YYYY-MM-DD"
  const diff = Math.round(
    (Date.parse(eventDateStr + 'T00:00:00') - Date.parse(startDate + 'T00:00:00')) / 86_400_000,
  );

  let dayNum: number;
  if (diff <= 0) dayNum = 1;
  else if (diff >= 2) dayNum = 3;
  else dayNum = diff + 1;

  // Bedtime-aware: if entry is after this day's bedtime, bump to next day.
  if (bedtimes && bedtimes.length > 0 && dayNum < 3) {
    const dayBedtime = bedtimes.find((b) => b.dayNumber === dayNum);
    if (dayBedtime && timestampIso > dayBedtime.timestampIso) {
      dayNum = Math.min(3, dayNum + 1);
    }
  }

  // Early-AM pull-back: events at 0:00–5:59 on the day after a diary day
  // belong to that diary day if bedtime hasn't been set yet (user still awake).
  const hour = getHoursInTz(timestampIso, timeZone);
  if (hour >= 0 && hour <= 5 && dayNum > 1) {
    const prevDay = dayNum - 1;
    const prevDayBedtime = bedtimes?.find((b) => b.dayNumber === prevDay);
    if (!prevDayBedtime) {
      dayNum = prevDay;
    }
  }

  return dayNum as 1 | 2 | 3;
}

/** Get the date string (YYYY-MM-DD) for a specific diary day. */
export function getDayDate(startDate: string, dayNumber: 1 | 2 | 3): string {
  const base = parseISO(startDate + 'T12:00:00');
  const d = addDays(base, dayNumber - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Round a Date to the nearest N minutes. */
export function roundToMinutes(date: Date, minutes: number): Date {
  const ms = minutes * 60 * 1000;
  return new Date(Math.round(date.getTime() / ms) * ms);
}

/** Create an ISO timestamp for "now" rounded to 5 minutes. */
export function nowRounded(): string {
  return roundToMinutes(new Date(), 5).toISOString();
}

/** Create an ISO timestamp for the exact current time. */
export function nowExact(): string {
  return new Date().toISOString();
}

/**
 * Smart default time for a diary day.
 *
 * Anchors the timestamp to the diary day's actual date so entries are always
 * assigned to the correct day by getDayNumber(). Uses current clock
 * hours/minutes on that date, then clamps to be after `afterTimestamp`
 * (e.g. wake-up time, prev bedtime, or last event).
 */
export function getDefaultTimeForDay(
  startDate: string,
  dayNumber: 1 | 2 | 3,
  afterTimestamp?: string,
  timeZone?: string,
): string {
  const dayDate = getDayDate(startDate, dayNumber);
  const timeOfDay = getTimeOfDayInTz(timeZone);
  // Current time-of-day on the diary day's date — built in user's timezone,
  // not browser-local, so the resulting instant lands on the right calendar
  // day for that user (e.g. UTC-stored TZ but Singapore browser).
  const [hh, mm] = timeOfDay.split(':').map(Number);
  const defaultIso = buildIsoForClockTimeInTz(dayDate + 'T12:00:00.000Z', hh, mm, timeZone);
  const defaultTime = new Date(defaultIso);

  if (afterTimestamp) {
    const after = new Date(afterTimestamp);
    if (defaultTime <= after) {
      // 5 minutes after the reference point
      return new Date(after.getTime() + 5 * 60 * 1000).toISOString();
    }
  }

  return defaultTime.toISOString();
}

/**
 * Correct the date of a night-view timestamp so it falls between bedtime and wake-up.
 * PM times (hour >= 12) are placed on the bedtime's date; AM times on the next day.
 */
export function correctNightDate(timeIso: string, bedtimeIso: string, timeZone?: string): string {
  const bed = parseISO(bedtimeIso);
  const hour = getHoursInTz(timeIso, timeZone);
  // PM → same date as bedtime; AM → day after bedtime
  const anchor = hour >= 12 ? bed : addDays(bed, 1);
  // Preserve the UTC hours/minutes from the original timestamp on the new anchor date
  const orig = new Date(timeIso);
  const corrected = new Date(anchor);
  corrected.setUTCHours(orig.getUTCHours(), orig.getUTCMinutes(), orig.getUTCSeconds(), 0);
  return corrected.toISOString();
}

/**
 * Correct after-midnight times in day view.
 *
 * When a user picks a time like 1:00 AM for a bedtime or late-night event,
 * the TimePicker keeps it on the day's calendar date. But 1:00 AM "tonight"
 * actually falls on the next calendar day. This function detects early-AM
 * times (hours 0–5) that are still on the day's own date and bumps them
 * forward by one day so they sort correctly after the day's wake time.
 */
export function correctAfterMidnight(
  timeIso: string,
  dayNumber: 1 | 2 | 3,
  startDate: string,
  timeZone?: string,
): string {
  const hour = getHoursInTz(timeIso, timeZone);
  if (hour > 5) return timeIso; // not an early-AM time — no correction needed

  const dayDate = getDayDate(startDate, dayNumber); // "YYYY-MM-DD"
  const timeDate = getDateInTz(timeIso, timeZone);  // date portion of the time

  if (timeDate !== dayDate) return timeIso; // already on a different date — leave it

  // Bump to next calendar day, keeping the same clock time
  const corrected = addDays(parseISO(timeIso), 1);
  return corrected.toISOString();
}

/** Get the current tracking day (1, 2, or 3) based on today's date vs startDate. */
export function getCurrentDay(startDate: string, timeZone?: string): 1 | 2 | 3 {
  const todayStr = getDateInTz(new Date().toISOString(), timeZone); // "YYYY-MM-DD"
  const diff = Math.round(
    (Date.parse(todayStr + 'T00:00:00') - Date.parse(startDate + 'T00:00:00')) / 86_400_000,
  );
  if (diff <= 0) return 1;
  if (diff >= 2) return 3;
  return (diff + 1) as 1 | 2 | 3;
}
