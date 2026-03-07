import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns';

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

/** Format a date, e.g. "Tue, Mar 10" */
export function formatDate(isoString: string): string {
  return format(parseISO(isoString), 'EEE, MMM d');
}

/** Format full date, e.g. "March 10, 2026" */
export function formatFullDate(dateStr: string): string {
  return format(parseISO(dateStr + 'T12:00:00'), 'MMMM d, yyyy');
}

/** Get day number (1, 2, or 3) for a timestamp given the diary start date. */
export function getDayNumber(timestampIso: string, startDate: string): 1 | 2 | 3 {
  const eventDate = parseISO(timestampIso);
  const start = parseISO(startDate + 'T00:00:00');
  const diff = differenceInCalendarDays(eventDate, start);
  if (diff <= 0) return 1;
  if (diff >= 2) return 3;
  return (diff + 1) as 1 | 2 | 3;
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
