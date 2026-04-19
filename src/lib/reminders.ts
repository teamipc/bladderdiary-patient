/**
 * Client-side reminder generators. No server, no storage, no PII leaves the device.
 * - Calendar (.ics): downloaded as a file the user adds to their phone's calendar.
 * - Share: native share sheet (mobile) falling back to mailto (desktop).
 */

import type { MorningAnchor } from './types';

/** Local clock time the user will see in their reminder, keyed to chosen anchor. */
export function anchorTimeLabel(anchor: MorningAnchor | null, locale: string): string {
  const d = new Date();
  d.setHours(anchor === 'coffee' ? 8 : 7, anchor === 'bathroom' ? 15 : 0, 0, 0);
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

function anchorHourMinute(anchor: MorningAnchor | null): { h: number; m: number } {
  if (anchor === 'coffee') return { h: 8, m: 0 };
  if (anchor === 'bathroom') return { h: 7, m: 15 };
  return { h: 7, m: 0 }; // wake or null default
}

/** Add days to a YYYY-MM-DD string, returning a new YYYY-MM-DD. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Format a YYYY-MM-DD date + hour/minute as an .ics floating local timestamp. */
function toIcsLocal(dateStr: string, h: number, m: number): string {
  const ymd = dateStr.replace(/-/g, '');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ymd}T${pad(h)}${pad(m)}00`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

interface IcsOpts {
  startDate: string; // YYYY-MM-DD of Day 1
  anchor: MorningAnchor | null;
  locale: string;
  url: string;
  day2Title: string;
  day3Title: string;
  description: string;
  alarmDescription: string;
}

/** Build an RFC 5545 .ics string with Day 2 and Day 3 morning reminders (floating local time). */
export function buildDiaryIcs(opts: IcsOpts): string {
  const { h, m } = anchorHourMinute(opts.anchor);
  const day2Date = addDays(opts.startDate, 1);
  const day3Date = addDays(opts.startDate, 2);
  const day2Start = toIcsLocal(day2Date, h, m);
  const day3Start = toIcsLocal(day3Date, h, m);
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const uidBase = `${opts.startDate}-${Math.random().toString(36).slice(2, 8)}@myflowcheck`;

  const event = (uid: string, start: string, title: string) => [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DURATION:PT15M`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(opts.description + '\n' + opts.url)}`,
    `URL:${opts.url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(opts.alarmDescription)}`,
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My Flow Check//Diary Reminders//EN',
    'CALSCALE:GREGORIAN',
    event(`day2-${uidBase}`, day2Start, opts.day2Title),
    event(`day3-${uidBase}`, day3Start, opts.day3Title),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/** Trigger a browser download of the given .ics content. */
export function downloadIcs(ics: string, filename = 'bladder-diary-reminders.ics'): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Share the diary link via native share sheet (mobile) or mailto fallback (desktop). */
export async function shareDiaryLink(opts: { title: string; text: string; url: string }): Promise<'shared' | 'cancelled' | 'fallback'> {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  // Desktop fallback: open mailto with subject + body
  const body = `${opts.text}\n\n${opts.url}`;
  window.location.href = `mailto:?subject=${encodeURIComponent(opts.title)}&body=${encodeURIComponent(body)}`;
  return 'fallback';
}
