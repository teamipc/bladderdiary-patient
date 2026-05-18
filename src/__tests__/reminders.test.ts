/**
 * CRI-03 regression coverage: `anchorTimeLabel` uses the patient's stored
 * timezone (via `buildIsoForClockTimeInTz` + `formatTime`), not the browser's
 * local clock, to render the reminder-time label.
 *
 * Behavior tests cover en-US locale formatting under two real-world zones
 * (Singapore UTC+8, Kolkata UTC+5:30 half-hour offset) plus the `null`
 * anchor default and the back-compat fallback when `timeZone` is undefined.
 * A static-code drift guard catches future re-introduction of the
 * `new Date().setHours()` anti-pattern this plan eliminated.
 *
 * See docs/TIME_MODEL.md and .planning/audits/2026-05-18-comprehensive-audit/CODE-REVIEW.md HI-03.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { anchorTimeLabel } from '@/lib/reminders';

describe('anchorTimeLabel: uses stored timezone (CRI-03)', () => {
  it('Test 1: locale en-US + tz Asia/Singapore + wake anchor renders 7:00 AM', () => {
    const label = anchorTimeLabel('wake', 'en-US', 'Asia/Singapore');
    // Strip any narrow no-break space variants for a robust comparison.
    expect(label.replace(/\s+/g, ' ')).toMatch(/7:00 AM/);
  });

  it('Test 2: locale en-US + tz Asia/Kolkata + bathroom anchor renders 7:15 AM', () => {
    // Kolkata is UTC+5:30 (half-hour offset). buildIsoForClockTimeInTz
    // builds "today at 7:15 in Kolkata" and formatTime formats it back
    // in Kolkata; the half-hour offset must not corrupt the minute portion
    // of the label.
    const label = anchorTimeLabel('bathroom', 'en-US', 'Asia/Kolkata');
    expect(label.replace(/\s+/g, ' ')).toMatch(/7:15 AM/);
  });

  it('Test 3: undefined tz falls back to browser-local without throwing (back-compat)', () => {
    // When timeZone is undefined, both buildIsoForClockTimeInTz and
    // formatTime fall back to browser-local behavior. We only assert the
    // function returned a non-empty string containing the coffee hour ("8")
    // because the exact format depends on the host test environment.
    const label = anchorTimeLabel('coffee', 'en-US', undefined);
    expect(label).toContain('8');
    expect(label.length).toBeGreaterThan(0);
  });

  it('Test 4: null anchor defaults to wake (7:00)', () => {
    const label = anchorTimeLabel(null, 'en-US', 'Asia/Singapore');
    expect(label.replace(/\s+/g, ' ')).toMatch(/7:00/);
  });

  it('Test 5 (static-code drift): reminders.ts no longer calls setHours in anchorTimeLabel', () => {
    const src = readFileSync(path.join(__dirname, '../lib/reminders.ts'), 'utf8');

    // The whole-file check is the strongest assertion: setHours must NOT
    // appear anywhere in reminders.ts after Plan 10-02. Note: addDays() at
    // line ~22 uses dt.setDate(...) which is FINE — that's calendar-day
    // arithmetic, not clock-time arithmetic. Only setHours is the
    // anti-pattern this plan eliminates.
    expect(src).not.toContain('d.setHours');
    expect(src).not.toMatch(/\.setHours\(/);

    // Positive assertions: the canonical timezone-aware helpers ARE used.
    expect(src).toContain('buildIsoForClockTimeInTz');
    expect(src).toContain('formatTime');

    // Marker comment is present so future contributors see the intent.
    expect(src).toContain('CRI-03');
  });
});
