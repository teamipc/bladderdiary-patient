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
/*
 *  See docs/TIME_MODEL.md for the canonical reference.
 *
 *  getDayNumber assigns an ISO timestamp to diary day 1 / 2 / 3 by
 *  running three layers in order:
 *
 *    1. Calendar diff in user-tz: dayNum = clamp(dateDiff + 1, 1, 3)
 *    2. Bedtime-aware forward bump: events past Day N's bedtime move
 *       to Day N+1 (handles late-night events on Day 1/2)
 *    3. Early-AM pull-back: events at hours 0–5 on the calendar day
 *       AFTER Day N pull back to Day N when prev-day bedtime is unset
 *       OR the event is before that bedtime — handles the
 *       "patient still awake past midnight" and night-shift cases
 *
 *  Form-side correctors (correctAfterMidnight, correctNightDate) take
 *  the user's clock pick and resolve it to the calendar date that
 *  matches the patient's intent BEFORE the timestamp reaches the store.
 *  These must be kept in sync with getDayNumber's expectations: a form
 *  helper that produces a timestamp Layer 3 will then move silently is
 *  a data-loss bug.
 *
 *  Invariants every change must preserve:
 *    - All date arithmetic happens in the user's stored timeZone, NOT
 *      browser-local. Using Date.setHours / .getHours silently breaks
 *      for any patient whose browser tz != stored tz.
 *    - Day-view forms must thread the day's wake time through
 *      correctAfterMidnight so early-rising patients aren't bumped.
 *    - reassignMorningVoid must run after any change that could
 *      affect FMV: wake/bedtime set/remove, void add/update/remove.
 *      Without FMV on Day 2/3, the day cannot complete.
 */

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

  // Early-AM pull-back: events at 0:00–5:59 on the calendar day after a
  // diary day belong to that diary day when:
  //   - the prev day's bedtime isn't set yet (user is still awake), OR
  //   - the event timestamp is BEFORE the prev day's bedtime — the event
  //     happened during that day's awake window even though it landed on the
  //     next calendar date.
  // The second clause matters whenever a patient sets bedtime later in the
  // day (so events get re-evaluated against a now-existing bedtime), and
  // for night-shift patients whose "morning" overlaps the next calendar day.
  const hour = getHoursInTz(timestampIso, timeZone);
  if (hour >= 0 && hour <= 5 && dayNum > 1) {
    const prevDay = dayNum - 1;
    const prevDayBedtime = bedtimes?.find((b) => b.dayNumber === prevDay);
    if (!prevDayBedtime || timestampIso < prevDayBedtime.timestampIso) {
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
 * Smart default timestamp for a new night-view event (void, drink, or leak).
 *
 * Old behaviour was bedtime + 5 minutes. That sat the picker at "10:05 PM"
 * the moment the user opened the form to backfill a 2 AM pee — at +15 per
 * tap, that's ~16 forward taps to land on the actual time. For older,
 * arthritic, or anxious users (the target patient here) every extra tap is
 * friction and a chance to give up mid-entry.
 *
 * New behaviour:
 *   - **First overnight event** → bedtime + 3 hours. Clinical literature on
 *     nocturia puts the median first-overnight void at 2.5–4 hours after
 *     sleep onset; 3 h is the rough centre and lands the picker close to
 *     the most common log time, with the +/− chips and "Now" still
 *     available for fine-tuning.
 *   - **Subsequent overnight event** (one or more already logged in this
 *     night window) → latest existing event + 90 minutes. Inter-void
 *     intervals in nocturia patients cluster at ~1.5–3 h.
 *
 * If the resulting target lands at-or-after the day's wake-up time, we
 * clamp to wake − 30 min so the default never crosses the wake boundary.
 *
 * Why a helper, not inline duplication: LogVoidForm, LogDrinkForm, and
 * LogLeakForm all default the same way. One place to tune the offsets if
 * we learn from real patient data later.
 */
export function getNightDefaultTime(
  prevBedtimeIso: string,
  wakeIso: string | undefined,
  existingNightEventIsos: string[],
): string {
  const bedtime = new Date(prevBedtimeIso).getTime();
  const wake = wakeIso ? new Date(wakeIso).getTime() : null;

  // Latest existing event STRICTLY between bedtime and wake (or any post-bedtime
  // event when wake is unset). We use this to step forward for subsequent voids.
  const latestNightEvent = existingNightEventIsos
    .map((iso) => new Date(iso).getTime())
    .filter((t) => t > bedtime && (wake === null || t < wake))
    .reduce<number | null>((max, t) => (max === null || t > max ? t : max), null);

  let target: number;
  if (latestNightEvent === null) {
    target = bedtime + 3 * 60 * 60 * 1000; // 3 h after bedtime — see header
  } else {
    target = latestNightEvent + 90 * 60 * 1000; // 90 min after the most recent
  }

  // Never overshoot wake: keep some breathing room so the user isn't
  // immediately confronted with an "after wake" validation warning.
  if (wake !== null && target >= wake) {
    target = wake - 30 * 60 * 1000;
  }
  // And never undershoot bedtime — defensive in case of arithmetic surprises.
  if (target <= bedtime) {
    target = bedtime + 5 * 60 * 1000;
  }

  return new Date(target).toISOString();
}

/**
 * Correct the date of a night-view timestamp so it falls between bedtime and wake-up.
 * PM times (hour >= 12) are placed on the bedtime's date; AM times on the next day.
 *
 * Date arithmetic happens in the user's timezone, not UTC. A naive
 * `addDays`-in-UTC double-skips when the bedtime crosses midnight UTC
 * (e.g. 22:00 EDT = 02:00 UTC the next day) — the morning-after timestamp
 * lands 24 hours past the patient's intent. This silently moved overnight
 * pees onto a different diary day for every US-tz patient.
 */
export function correctNightDate(timeIso: string, bedtimeIso: string, timeZone?: string): string {
  const hour = getHoursInTz(timeIso, timeZone);
  const minute = getMinutesInTz(timeIso, timeZone);
  // Get the bedtime's date in the USER's tz, then pick the date the corrected
  // event should sit on (same day for PM picks, next day for AM picks).
  const bedDate = getDateInTz(bedtimeIso, timeZone); // "YYYY-MM-DD"
  const targetDate = hour >= 12 ? bedDate : addOneDayString(bedDate);
  return buildIsoForClockTimeInTz(`${targetDate}T12:00:00.000Z`, hour, minute, timeZone);
}

/** Add one calendar day to a "YYYY-MM-DD" string. */
function addOneDayString(dateStr: string): string {
  const next = addDays(parseISO(dateStr + 'T12:00:00'), 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Advance a clock-time pick to the smallest calendar date in the user's tz
 * that places it strictly after `afterIso`. Used by SetWakeTimeForm so a
 * "12:00 AM" pick after a 10:30 PM bedtime resolves to the next morning
 * instead of silently failing validation against the form's anchor date.
 */
export function advanceIsoToAfter(timeIso: string, afterIso: string, timeZone?: string): string {
  if (timeIso > afterIso) return timeIso;
  let dateStr = getDateInTz(timeIso, timeZone);
  const h = getHoursInTz(timeIso, timeZone);
  const m = getMinutesInTz(timeIso, timeZone);
  // Bound the loop — at most we need to skip across DST + 1 day. Two iterations
  // cover any IANA zone in practice.
  for (let i = 0; i < 2; i++) {
    dateStr = addOneDayString(dateStr);
    const advanced = buildIsoForClockTimeInTz(`${dateStr}T12:00:00.000Z`, h, m, timeZone);
    if (advanced > afterIso) return advanced;
  }
  return buildIsoForClockTimeInTz(`${dateStr}T12:00:00.000Z`, h, m, timeZone);
}

/**
 * Correct after-midnight times in day view.
 *
 * When a user picks a time like 1:00 AM for a bedtime or late-night event,
 * the TimePicker keeps it on the day's calendar date. But 1:00 AM "tonight"
 * actually falls on the next calendar day. This function detects early-AM
 * times (hours 0–5) that are still on the day's own date and bumps them
 * forward by one day so they sort correctly after the day's wake time.
 *
 * Early-rising patients break the simple bump: someone who woke at 4:17 AM
 * and logs a 5:00 AM event means "5 AM this morning", not "5 AM tomorrow".
 * If we bump anyway, the timestamp moves to the next calendar day, and once
 * the patient sets their bedtime, the early-AM pull-back in `getDayNumber`
 * stops compensating — the event silently re-slots to the next diary day.
 * That's silent data loss in a clinical record. Pass `wakeTimeIso` so we
 * can keep at-or-after-wake picks on the current calendar day.
 *
 * Intent matters for picks BEFORE wake:
 *   - `bedtime` (default): bump. The patient typed "1 AM" meaning
 *     "going to bed at 1 AM tonight" — the bedtime should land on the next
 *     calendar day.
 *   - `event`: do NOT bump. The patient typed "1 AM" on a day-view form
 *     while their wake is at 7 AM — they probably mean "1 AM today before
 *     I woke up", which is a mistake the form should warn about. Bumping
 *     would silently move the event to tomorrow and bypass validation.
 *     Patients staying up past midnight should use the "Now" button
 *     instead of typing a clock time.
 */
export function correctAfterMidnight(
  timeIso: string,
  dayNumber: 1 | 2 | 3,
  startDate: string,
  timeZone?: string,
  wakeTimeIso?: string,
  intent: 'bedtime' | 'event' = 'bedtime',
): string {
  const hour = getHoursInTz(timeIso, timeZone);
  if (hour > 5) return timeIso; // not an early-AM time — no correction needed

  const dayDate = getDayDate(startDate, dayNumber); // "YYYY-MM-DD"
  const timeDate = getDateInTz(timeIso, timeZone);  // date portion of the time

  if (timeDate !== dayDate) return timeIso; // already on a different date — leave it

  // Early-rising patient: a wake time on this day means the user has already
  // started their morning. An at-or-after-wake pick is a morning event, not
  // a late-night one — leave the calendar date alone.
  if (wakeTimeIso && timeIso >= wakeTimeIso) return timeIso;

  // For event forms (void/drink/leak), don't bump before-wake picks. Let
  // the form's isBeforeWakeTime validation catch the mistake.
  if (intent === 'event' && wakeTimeIso) return timeIso;

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
