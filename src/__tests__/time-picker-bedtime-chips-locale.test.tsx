/**
 * LP-04 regression guard: TimePicker bedtime preset chips must render their
 * time portion via formatTime() in the active locale, NOT as hardcoded
 * English "10 PM" / "11 PM" / "12 AM" literals embedded inside the translated
 * `lastNightAt` wrapper.
 *
 * The original bug: `tc('lastNightAt', { time: '10 PM' })` produced
 *   FR: "10 PM hier soir"      ← English-PM inside French wrapper
 *   AR: "10 PM ليلة أمس"        ← Latin-script fragment inside RTL line
 * The fix (this plan, Task 4): `tc('lastNightAt', { time: formatBedtimeChip(22) })`
 *   which routes through `formatTime(buildIsoForClockTimeInTz(value, 22, 0, tz), locale, tz)`
 *   so each locale's Intl.DateTimeFormat decides the time presentation.
 *
 * What this file proves:
 *   1. The chips render in EN, FR, and AR locales.
 *   2. The EN render still contains "PM"/"AM" (the locale-correct EN output).
 *   3. The FR render does NOT contain ASCII "PM" or "AM" (the regression guard).
 *   4. The FR render preserves the `lastNightAt` wrapper translation
 *      ("hier soir" substring is present).
 *   5. The AR render does NOT contain ASCII "PM" or "AM" (the bidi-leak guard).
 *   6. The chip LABEL is consistent with the CLICK outcome: the time portion
 *      of the chip label equals what formatTime(savedIso, locale, tz) produces,
 *      proving `formatBedtimeChip(h)` and `handleLastNightAt(h)` use the same
 *      underlying ISO construction.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach } from 'vitest';
import TimePicker from '@/components/ui/TimePicker';
import { formatTime } from '@/lib/utils';
import enMessages from '../../messages/en.json';
import frMessages from '../../messages/fr.json';
import arMessages from '../../messages/ar.json';

// A stable reference instant. The chips compute their times relative to the
// calendar date of `value` in the user's tz, so the exact instant doesn't
// matter for label content; only the tz + hour24 pair drives the rendered
// time. We pick a mid-afternoon EST instant on a fixed date.
const REFERENCE_ISO = '2026-05-18T18:00:00.000Z';
const TZ = 'America/New_York';

type Locale = 'en' | 'fr' | 'ar';

function renderInLocale(
  locale: Locale,
  messages: Record<string, unknown>,
  onChange: (iso: string) => void = () => {},
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={TZ}>
      <TimePicker value={REFERENCE_ISO} onChange={onChange} variant="bedtime" timeZone={TZ} />
    </NextIntlClientProvider>,
  );
}

// Locate the three bedtime preset chips via their unique class signature
// (`border-bedtime/25`, only the bedtime preset buttons carry this).
function getBedtimeChips(): HTMLElement[] {
  const buttons = screen.getAllByRole('button');
  return buttons.filter((b) => b.className.includes('border-bedtime/25'));
}

afterEach(() => {
  cleanup();
});

describe('TimePicker bedtime preset chips (LP-04)', () => {
  it('renders all three bedtime chips in EN locale', () => {
    renderInLocale('en', enMessages as Record<string, unknown>);
    const chips = getBedtimeChips();
    expect(chips).toHaveLength(3);
  });

  it('EN chip labels contain locale-correct PM/AM (10 PM, 11 PM, 12 AM)', () => {
    renderInLocale('en', enMessages as Record<string, unknown>);
    const chips = getBedtimeChips();
    const texts = chips.map((c) => c.textContent ?? '');

    // EN render produces "10:00 PM", "11:00 PM", "12:00 AM" (Intl en-US) inside
    // the wrapper "{time} last night" → "10:00 PM last night", etc.
    expect(texts.some((t) => /\b10:00\s*PM\b/.test(t))).toBe(true);
    expect(texts.some((t) => /\b11:00\s*PM\b/.test(t))).toBe(true);
    expect(texts.some((t) => /\b12:00\s*AM\b/.test(t))).toBe(true);
    // Wrapper text from messages/en.json#common.lastNightAt is "{time} last night".
    texts.forEach((t) => {
      expect(t).toMatch(/last night/i);
    });
  });

  it('FR chip labels do NOT contain hardcoded English "PM" or "AM" (the LP-04 regression guard)', () => {
    renderInLocale('fr', frMessages as Record<string, unknown>);
    const chips = getBedtimeChips();
    expect(chips).toHaveLength(3);

    chips.forEach((chip) => {
      const text = chip.textContent ?? '';
      // The regressed code produced "10 PM hier soir". The fix produces a
      // FR-locale time ("22:00" or "22 h 00") inside "{time} hier soir".
      expect(text).not.toMatch(/\bPM\b/);
      expect(text).not.toMatch(/\bAM\b/);
    });
  });

  it('FR chip labels preserve the lastNightAt wrapper translation ("hier soir")', () => {
    renderInLocale('fr', frMessages as Record<string, unknown>);
    const chips = getBedtimeChips();
    const frWrapper = (frMessages as { common: { lastNightAt: string } }).common.lastNightAt;
    // Extract the wrapper's non-placeholder portion ("hier soir") to verify
    // the translated wrapper is still being applied around the time.
    const wrapperFragment = frWrapper.replace('{time}', '').trim();
    expect(wrapperFragment.length).toBeGreaterThan(0);

    chips.forEach((chip) => {
      expect(chip.textContent).toContain(wrapperFragment);
    });
  });

  it('AR chip labels do NOT contain Latin "PM" or "AM" characters (RTL bidi-flow guard)', () => {
    renderInLocale('ar', arMessages as Record<string, unknown>);
    const chips = getBedtimeChips();
    expect(chips).toHaveLength(3);

    chips.forEach((chip) => {
      const text = chip.textContent ?? '';
      // The regressed code would have produced "10 PM ليلة أمس", a Latin
      // PM fragment inside an RTL line. The fix produces an Arabic-locale
      // time (e.g. "١٠:٠٠ م") inside the translated wrapper.
      expect(text).not.toContain('PM');
      expect(text).not.toContain('AM');
    });
  });

  it('chip label is consistent with the click outcome (label ≡ what clicking saves)', async () => {
    let saved = '';
    const user = userEvent.setup();
    renderInLocale('en', enMessages as Record<string, unknown>, (iso) => {
      saved = iso;
    });
    const chips = getBedtimeChips();
    expect(chips).toHaveLength(3);

    // Click the first (10 PM) chip and capture its rendered label BEFORE
    // any state change so the assertion runs against the same render.
    const firstChip = chips[0];
    const firstLabel = firstChip.textContent ?? '';

    await user.click(firstChip);
    expect(saved).not.toBe('');

    // Reformat the saved ISO through the SAME formatter the chip uses. The
    // time-portion that formatTime() produces MUST be a substring of the
    // chip's visible label. That's the label-equals-click-outcome invariant.
    const reformatted = formatTime(saved, 'en', TZ);
    expect(firstLabel).toContain(reformatted);
  });
});
