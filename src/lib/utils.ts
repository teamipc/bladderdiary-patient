import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns';
import type { BedtimeEntry } from './types';

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

/** Format a time string from ISO, e.g. "8:15 AM" */
export function formatTime(isoString: string): string {
  return format(parseISO(isoString), 'h:mm a');
}

/** Format a date, e.g. "Tue, Mar 10, 2026" */
export function formatDate(isoString: string): string {
  return format(parseISO(isoString), 'EEE, MMM d, yyyy');
}

/** Format full date, e.g. "March 10, 2026" */
export function formatFullDate(dateStr: string): string {
  return format(parseISO(dateStr + 'T12:00:00'), 'MMMM d, yyyy');
}

/**
 * Get day number (1, 2, or 3) for a timestamp given the diary start date.
 * When bedtimes are provided, uses bedtime-aware boundaries:
 * entries after a day's bedtime are attributed to the next day (overnight logic).
 */
export function getDayNumber(
  timestampIso: string,
  startDate: string,
  bedtimes?: BedtimeEntry[],
): 1 | 2 | 3 {
  const eventDate = parseISO(timestampIso);
  const start = parseISO(startDate + 'T00:00:00');
  const diff = differenceInCalendarDays(eventDate, start);

  let dayNum: number;
  if (diff <= 0) dayNum = 1;
  else if (diff >= 2) dayNum = 3;
  else dayNum = diff + 1;

  // Bedtime-aware: if entry is after this day's bedtime, bump to next day.
  // Once bedtime is set, it marks the end of that day — any event after it
  // belongs to the following day.
  if (bedtimes && bedtimes.length > 0 && dayNum < 3) {
    const dayBedtime = bedtimes.find((b) => b.dayNumber === dayNum);
    if (dayBedtime && timestampIso > dayBedtime.timestampIso) {
      dayNum = Math.min(3, dayNum + 1);
    }
  }

  return dayNum as 1 | 2 | 3;
}

/** Get the date string (YYYY-MM-DD) for a specific diary day. */
export function getDayDate(startDate: string, dayNumber: 1 | 2 | 3): string {
  const base = parseISO(startDate + 'T12:00:00');
  return format(addDays(base, dayNumber - 1), 'yyyy-MM-dd');
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
): string {
  const dayDate = getDayDate(startDate, dayNumber);
  const now = new Date();
  // Current time-of-day on the diary day's date
  const defaultTime = new Date(
    dayDate + 'T' + now.toTimeString().slice(0, 8),
  );

  if (afterTimestamp) {
    const after = new Date(afterTimestamp);
    if (defaultTime <= after) {
      // 5 minutes after the reference point
      return new Date(after.getTime() + 5 * 60 * 1000).toISOString();
    }
  }

  return defaultTime.toISOString();
}

/** Get the current tracking day (1, 2, or 3) based on today's date vs startDate. */
export function getCurrentDay(startDate: string): 1 | 2 | 3 {
  const diff = differenceInCalendarDays(new Date(), parseISO(startDate + 'T00:00:00'));
  if (diff <= 0) return 1;
  if (diff >= 2) return 3;
  return (diff + 1) as 1 | 2 | 3;
}
