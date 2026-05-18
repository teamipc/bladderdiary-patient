/**
 * CRI-02 regression coverage: NextStepBanner uses the patient's stored
 * timezone (via `getHoursInTz`), not the browser's local hour, to decide
 * between the bedtime branch and the keep-logging branch.
 *
 * Two locale-divergent scenarios at the same UTC instant prove the branch
 * choice depends on the stored timeZone field in the diary store. A
 * static-code drift guard catches future regressions of the
 * `new Date().getHours()` anti-pattern this plan eliminated.
 *
 * See docs/TIME_MODEL.md and .planning/audits/2026-05-18-comprehensive-audit/CODE-REVIEW.md HI-02.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
import NextStepBanner from '@/components/diary/NextStepBanner';
import { useDiaryStore } from '@/lib/store';

// 2026-05-18T12:00:00Z == 20:00 SGT (>= 20, bedtime branch) and 08:00 EDT
// (< 20, keep-logging branch). Picking a UTC instant that straddles 20:00
// across two real-world timezones is the cleanest way to prove the banner
// reads stored tz, not browser tz.
const FIXED_NOW = '2026-05-18T12:00:00.000Z';

function wrap(node: React.ReactNode, timeZone: string) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone={timeZone}>
      {node}
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_NOW));
  useDiaryStore.getState().resetDiary();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NextStepBanner: uses stored timezone, not browser-local (CRI-02)', () => {
  it('Test 1: bedtime branch fires when stored tz is Asia/Singapore (20:00 SGT >= 20)', () => {
    // Seed Day 2 state: startDate May 17 → Day 2 = May 18.
    // wakeTime on Day 2 present (gates past the morning branch).
    // One void 30 min ago (gates past eventCount===0, not stale).
    // No bedtime on Day 2 (so we enter the bedtime-or-keep-logging branch).
    useDiaryStore.setState({
      startDate: '2026-05-17',
      timeZone: 'Asia/Singapore',
      diaryStarted: true,
      wakeTimes: [
        { id: 'w1', timestampIso: '2026-05-18T00:00:00.000Z', dayNumber: 2 },
      ],
      voids: [
        {
          id: 'v1',
          timestampIso: '2026-05-18T11:30:00.000Z',
          volumeMl: 250,
          sensation: 2,
          leak: false,
          note: '',
          isFirstMorningVoid: false,
        },
      ],
      drinks: [],
      leaks: [],
      bedtimes: [],
    });

    render(wrap(<NextStepBanner dayNumber={2} isNightView={false} />, 'Asia/Singapore'));

    expect(screen.getByText(enMessages.nextStep.bedtimeTitle)).toBeInTheDocument();
  });

  it('Test 2: keep-logging branch fires when stored tz is America/New_York (08:00 EDT < 20)', () => {
    useDiaryStore.setState({
      startDate: '2026-05-17',
      timeZone: 'America/New_York',
      diaryStarted: true,
      wakeTimes: [
        { id: 'w1', timestampIso: '2026-05-18T11:00:00.000Z', dayNumber: 2 },
      ],
      voids: [
        {
          id: 'v1',
          timestampIso: '2026-05-18T11:30:00.000Z',
          volumeMl: 250,
          sensation: 2,
          leak: false,
          note: '',
          isFirstMorningVoid: false,
        },
      ],
      drinks: [],
      leaks: [],
      bedtimes: [],
    });

    render(wrap(<NextStepBanner dayNumber={2} isNightView={false} />, 'America/New_York'));

    expect(screen.getByText(enMessages.nextStep.keepLoggingTitle)).toBeInTheDocument();
    expect(screen.queryByText(enMessages.nextStep.bedtimeTitle)).not.toBeInTheDocument();
  });

  it('Test 3 (static-code drift): NextStepBanner does not call new Date().getHours()', () => {
    const src = readFileSync(
      path.join(__dirname, '../components/diary/NextStepBanner.tsx'),
      'utf8',
    );

    // The browser-local anti-pattern must NOT come back.
    expect(src).not.toContain('new Date().getHours()');

    // Positive assertion: the canonical timezone-aware helper IS used.
    expect(src).toContain('getHoursInTz');

    // Marker comment is present so future contributors see the intent.
    expect(src).toContain('CRI-02');
  });
});
