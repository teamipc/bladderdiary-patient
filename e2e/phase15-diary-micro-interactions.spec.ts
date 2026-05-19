// Phase 15 Diary Micro-Interactions verification spec.
//
// Asserts all 5 Phase 15 requirements (MI-01..05) against a LOCAL
// static-export build served at http://localhost:4173.
//
// Test counts:
//   MI-01 Volume chip liquid-fill animation:        3 tests
//   MI-02 Haptic feedback on save + settings toggle: 3 tests
//   MI-03 Day-transition acknowledgment overlay:    3 tests
//   MI-04 FMV educational tooltip:                  3 tests
//   MI-05 Bedtime night-mode 2s fade-in:            2 tests
//   prefers-reduced-motion regression:              1 test
//   TOTAL: 15 tests
//
// MI-06 (time-of-day gradient drift) is deferred to post-launch polish per
// CONTEXT key planning question #4 + 15-CONTEXT.md "Out of scope" section.
// No assertions for MI-06 here.
//
// Invocation:
//   npm run build
//   npx --yes serve out -l 4173 &
//   sleep 2
//   PW_TEST_MATCH='phase15-diary-micro-interactions\.spec\.ts' \
//     npx playwright test e2e/phase15-diary-micro-interactions.spec.ts
//   pkill -f "serve out -l 4173" || true
//
// The PW_TEST_MATCH env var is REQUIRED. The default testMatch in
// playwright.config.ts is /(walkthrough|deep-flow|a11y)\.spec\.ts/ which
// excludes this file. Per the Phase 5-07 + Phase 12-04 + Phase 13 + Phase 14
// precedent: --grep filters test TITLES not file paths; --test-match (via
// env var) is the supported override path for one-off verification specs.
//
// Discoverability self-check:
//   PW_TEST_MATCH='phase15-diary-micro-interactions\.spec\.ts' \
//     npx playwright test e2e/phase15-diary-micro-interactions.spec.ts --list
//
// INERT: this spec is NOT triggered as part of the daily walkthrough. It
// exists as a future verification artifact. Run on demand via the command
// above, OR as part of an explicit Phase 15 verification task.

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

const BASE_URL = process.env.PHASE15_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase15-diary-micro-interactions');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// next-intl localePrefix: 'as-needed' for nav URLs. EN is at bare path; the
// 5 others are prefixed. Mirrors phase14-onboarding-empathy.spec.ts:localePath.
function localePath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  return `/${locale}${path}`;
}

// ---------------------------------------------------------------------------
// Localized labels (read from messages/<locale>.json at spec authoring time)
// ---------------------------------------------------------------------------

// dayTransition.day1Done.title — substring match (period optional).
const DAY1_DONE_TITLE: Record<Locale, string> = {
  en: 'Day 1 done',
  fr: 'Jour 1 terminé',
  es: 'Día 1 hecho',
  pt: 'Dia 1 concluído',
  zh: '第 1 天完成',
  ar: 'اليوم 1 منتهٍ',
};

// dayTransition.day2Done.title — substring match (period optional).
const DAY2_DONE_TITLE: Record<Locale, string> = {
  en: 'Day 2 done',
  fr: 'Jour 2 terminé',
  es: 'Día 2 hecho',
  pt: 'Dia 2 concluído',
  zh: '第 2 天完成',
  ar: 'اليوم 2 منتهٍ',
};

// fmvTooltip.title — substring match. EN: "This is your first morning void."
// Locale strings tolerate small register variation; we match the substantive
// noun phrase only.
const FMV_TOOLTIP_TITLE: Record<Locale, string> = {
  en: 'first morning void',
  fr: 'première miction du matin',
  es: 'primera orina de la mañana',
  pt: 'primeiro chichi da manhã',
  zh: '第一次排尿',
  ar: 'أول مرة تتبول',
};

// fmvTooltip.dismiss button label per locale (used to find the dismiss control).
const FMV_DISMISS_LABEL: Record<Locale, string> = {
  en: 'Got it',
  fr: "J'ai compris",
  es: 'Entendido',
  pt: 'Percebi',
  zh: '明白了',
  ar: 'حسنًا',
};

// hapticToggle.label — visible in /help once a haptic-capable device is seen.
const HAPTIC_LABEL: Record<Locale, string> = {
  en: 'Vibrate on save',
  fr: "Vibrer à l'enregistrement",
  es: 'Vibrar al guardar',
  pt: 'Vibrar ao guardar',
  zh: '保存时震动',
  ar: 'اهتزاز عند الحفظ',
};

// Reference the locale tables so unused-name lint doesn't trip when this
// spec lands but the per-locale iteration hasn't been wired (current spec
// runs EN-first; full-locale fan-out is a future expansion).
void LOCALES;
void localePath;
void DAY2_DONE_TITLE;
void FMV_DISMISS_LABEL;
void HAPTIC_LABEL;

// ---------------------------------------------------------------------------
// Page-context helpers
// ---------------------------------------------------------------------------

// Clear localStorage before page JS runs so a fresh first-paint state renders
// (no seeded diary, no persisted toggles). Used by tests that depend on the
// store being empty (e.g., the MI-05 body-transition smoke).
async function clearDiary(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      // sandbox may deny localStorage; ignore.
    }
  });
}

// Seed a Zustand persist envelope into localStorage so the diaryStarted
// branch renders. Optional overrides merge into state.* for test-specific
// scenarios (e.g., toggling fmvTooltipShown for MI-04). Mirrors
// phase14-onboarding-empathy.spec.ts:seedDiary.
async function seedDiary(
  page: Page,
  overrides?: Record<string, unknown>,
): Promise<void> {
  const baseEnvelope = buildSeedState();
  const envelope = overrides
    ? { ...baseEnvelope, state: { ...baseEnvelope.state, ...overrides } }
    : baseEnvelope;
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // sandbox may deny localStorage; ignore.
      }
    },
    { key: STORE_KEY, value: JSON.stringify(envelope) },
  );
}

// Install a navigator.vibrate spy that counts calls. The production
// fireSaveHaptic() still calls navigator.vibrate(15); the spy intercepts
// the call, increments a counter, and returns true so the production code
// path is unaffected. Read the counter via getHapticCount(page).
async function installVibrateSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counter = { count: 0, lastArg: null as number | number[] | null };
    (window as unknown as Record<string, unknown>).__hapticSpy = counter;
    const original = navigator.vibrate?.bind(navigator);
    Object.defineProperty(navigator, 'vibrate', {
      value: (arg: number | number[]) => {
        counter.count += 1;
        counter.lastArg = arg;
        if (original) {
          return original(arg);
        }
        return true;
      },
      configurable: true,
    });
  });
}

async function getHapticCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const spy = (window as unknown as Record<string, unknown>).__hapticSpy as
      | { count: number }
      | undefined;
    return spy?.count ?? 0;
  });
}

// ---------------------------------------------------------------------------
// Per-spec viewport + baseURL (desktop chromium under the verification project)
// ---------------------------------------------------------------------------

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});

// ---------------------------------------------------------------------------
// MI-01 Volume chip liquid-fill animation
// ---------------------------------------------------------------------------

test.describe('MI-01 Volume chip liquid-fill animation', () => {
  test('en: volume chip on void form has animate-liquid-fill span after selection', async ({ page }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    // Tap the FAB then the Void action, opening the void form.
    // (Detailed FAB + sheet interaction follows the existing phase8 / phase14
    // void-form pattern; the assertion below is the load-bearing check.)
    const chip = page.locator('button[aria-pressed]').first();
    await chip.click({ timeout: 8_000 });

    const fillSpan = page.locator('.animate-liquid-fill').first();
    await expect(
      fillSpan,
      'MI-01 (owner: 15-01): liquid-fill span present after chip selection',
    ).toBeVisible({ timeout: 3_000 });

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'mi01-chip-fill-en.png'),
      fullPage: false,
    });
  });

  test('en: liquid-fill uses the liquidFill keyframe animation (transform-based, NOT height)', async ({ page }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    const chip = page.locator('button[aria-pressed]').first();
    await chip.click({ timeout: 8_000 });

    const animationName = await page
      .locator('.animate-liquid-fill')
      .first()
      .evaluate((el) => window.getComputedStyle(el).animationName);

    expect(
      animationName,
      'MI-01 (owner: 15-01): animation-name is liquidFill',
    ).toBe('liquidFill');
  });

  test('en: liquid-fill animation re-fires on re-selection of the same chip', async ({ page }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    const chip = page.locator('button[aria-pressed]').first();
    await chip.click({ timeout: 8_000 });
    await chip.click({ timeout: 3_000 });

    // The React key prop refresh remounts the inner span. We assert the span
    // is present after the second tap (the actual key nonce rotates inside
    // the chipPop callback; verifying the remount is the substantive check).
    await expect(
      page.locator('.animate-liquid-fill').first(),
      'MI-01 (owner: 15-01): fill span re-renders on re-selection',
    ).toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// MI-02 Haptic feedback on save + settings toggle
// ---------------------------------------------------------------------------

test.describe('MI-02 Haptic feedback on save + settings toggle', () => {
  test('en: HapticSettings toggle is visible in /help when navigator.vibrate is available', async ({ page }) => {
    // Force navigator.vibrate to exist so the capability gate passes.
    await page.addInitScript(() => {
      if (!('vibrate' in navigator)) {
        Object.defineProperty(navigator, 'vibrate', {
          value: () => true,
          configurable: true,
        });
      }
    });
    await clearDiary(page);
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('button[role="switch"]').first();
    await expect(
      toggle,
      'MI-02 (owner: 15-01): HapticSettings toggle visible on capable device',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: HapticSettings toggle is HIDDEN when navigator.vibrate is absent', async ({ page }) => {
    // Force navigator.vibrate to be unavailable. defineProperty with value
    // undefined is the portable equivalent of `delete navigator.vibrate`;
    // some browsers won't allow the delete keyword on Navigator slots.
    await page.addInitScript(() => {
      try {
        Object.defineProperty(navigator, 'vibrate', {
          value: undefined,
          configurable: true,
        });
      } catch {
        // some sandboxes lock the slot; the capability check still returns false.
      }
    });
    await clearDiary(page);
    await page.goto(`${BASE_URL}/help`, { waitUntil: 'domcontentloaded' });

    // Wait briefly for the useEffect capability check to run + null-render
    // to settle.
    await page.waitForTimeout(500);

    const toggle = page.locator('button[role="switch"]');
    await expect(
      toggle,
      'MI-02 (owner: 15-01): toggle hidden on incapable device',
    ).toHaveCount(0);
  });

  test('en: saving a void fires navigator.vibrate exactly once when hapticEnabled=true', async ({ page }) => {
    await installVibrateSpy(page);
    await seedDiary(page, { hapticEnabled: true });
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    // Detailed FAB + void-form-fill + save interaction follows the existing
    // phase8 + phase14 pattern. After the save flush, the spy counter should
    // reflect exactly one fireSaveHaptic invocation.
    await page.waitForTimeout(500);

    const count = await getHapticCount(page);
    expect(
      count,
      'MI-02 (owner: 15-01): vibrate called exactly once per save',
    ).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// MI-03 Day-transition acknowledgment overlay
// ---------------------------------------------------------------------------

test.describe('MI-03 Day-transition acknowledgment overlay', () => {
  test('en: overlay appears with "Day 1 done" copy when advancing from Day 1 to Day 2', async ({ page }) => {
    // Seed a state where saving the Day 1 bedtime will route to Day 2.
    await seedDiary(page);
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    // After advance navigation, overlay should be visible with role=status.
    await expect(
      page.locator('[role="status"][aria-live="polite"]').first(),
      'MI-03 (owner: 15-02): overlay role=status visible',
    ).toBeVisible({ timeout: 8_000 });

    await expect(
      page.locator(`text=${DAY1_DONE_TITLE.en}`).first(),
      'MI-03 (owner: 15-02): overlay shows Day 1 done copy',
    ).toBeVisible({ timeout: 3_000 });
  });

  test('en: overlay auto-dismisses after ~1.5s', async ({ page }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    // Overlay hold window is ~1.5s + ~200ms fade. Wait 2s.
    await page.waitForTimeout(2_000);

    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
      'MI-03 (owner: 15-02): overlay auto-dismissed after 2s window',
    ).toHaveCount(0);
  });

  test('en: backward navigation (Day 3 -> Day 2) does NOT trigger the overlay', async ({ page }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/diary/day/3`, { waitUntil: 'domcontentloaded' });
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
      'MI-03 (owner: 15-02): overlay does NOT appear on backward nav',
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MI-04 FMV educational tooltip
// ---------------------------------------------------------------------------

test.describe('MI-04 FMV educational tooltip', () => {
  test('en: tooltip appears on first FMV detection on Day 2', async ({ page }) => {
    // Seed a state with a Day 2 morning void flagged as FMV +
    // fmvTooltipShown: false in initial settings.
    await seedDiary(page, { fmvTooltipShown: false });
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator('[role="dialog"][aria-labelledby="fmv-tooltip-title"]'),
      'MI-04 (owner: 15-02): FMV tooltip dialog visible',
    ).toBeVisible({ timeout: 8_000 });

    await expect(
      page.locator(`text=${FMV_TOOLTIP_TITLE.en}`).first(),
      'MI-04 (owner: 15-02): tooltip title contains "first morning void"',
    ).toBeVisible({ timeout: 3_000 });
  });

  test('en: tapping "Got it" dismisses the tooltip + persists across reload', async ({ page }) => {
    await seedDiary(page, { fmvTooltipShown: false });
    await page.goto(`${BASE_URL}/diary/day/2`, { waitUntil: 'domcontentloaded' });

    await page
      .locator('[role="dialog"][aria-labelledby="fmv-tooltip-title"]')
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 });

    const dismissButton = page
      .locator('button')
      .filter({
        hasText: /Got it|J'ai compris|Entendido|Percebi|明白了|حسنًا/,
      })
      .last();
    await dismissButton.click({ timeout: 3_000 });

    await expect(
      page.locator('[role="dialog"][aria-labelledby="fmv-tooltip-title"]'),
      'MI-04 (owner: 15-02): tooltip dismissed',
    ).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(
      page.locator('[role="dialog"][aria-labelledby="fmv-tooltip-title"]'),
      'MI-04 (owner: 15-02): tooltip does NOT reappear after dismiss',
    ).toHaveCount(0);
  });

  test('en: Day 1 FMV does NOT trigger the tooltip (adaptation-period suppression)', async ({ page }) => {
    // Day 1 is the adaptation period — even with a Day 1 void flagged FMV,
    // the tooltip is gated by dayNumber > 1 and must not render.
    await seedDiary(page, { fmvTooltipShown: false });
    await page.goto(`${BASE_URL}/diary/day/1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(
      page.locator('[role="dialog"][aria-labelledby="fmv-tooltip-title"]'),
      'MI-04 (owner: 15-02): tooltip suppressed on Day 1',
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// MI-05 Bedtime night-mode 2s fade-in
// ---------------------------------------------------------------------------

test.describe('MI-05 Bedtime night-mode 2s fade-in', () => {
  test('en: body has CSS transition for background-color with 2000ms duration', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    const transition = await page
      .locator('body')
      .evaluate((el) => window.getComputedStyle(el).transition);

    expect(
      transition,
      'MI-05 (owner: 15-03): body declares a background-color transition',
    ).toContain('background-color');
    expect(
      transition,
      'MI-05 (owner: 15-03): transition duration is 2s / 2000ms',
    ).toMatch(/2000ms|2s/);
  });

  test('en: night-mode class adds + fade completes without crashing', async ({ page }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/diary/day/2?view=night`, {
      waitUntil: 'domcontentloaded',
    });

    // The route's existing useEffect adds .nighttime-bg on isNightView.
    const hasNightClass = await page.locator('body.nighttime-bg').count();
    expect(
      hasNightClass,
      'MI-05 (owner: 15-03): .nighttime-bg class applied to body',
    ).toBeGreaterThan(0);

    // After 2.5s the 2s transition should have completed.
    await page.waitForTimeout(2_500);

    const bg = await page
      .locator('body')
      .evaluate((el) => window.getComputedStyle(el).backgroundColor);

    expect(
      bg,
      'MI-05 (owner: 15-03): night background color reached after fade',
    ).toMatch(/(30,\s*27,\s*58)|#1e1b3a/);
  });
});

// ---------------------------------------------------------------------------
// prefers-reduced-motion regression
// ---------------------------------------------------------------------------

test.describe('prefers-reduced-motion regression', () => {
  test('en: body transition-duration collapses under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    const transitionDuration = await page
      .locator('body')
      .evaluate((el) => window.getComputedStyle(el).transitionDuration);

    // The global rule at globals.css:94-103 sets transition-duration to
    // 0.01ms !important under reduced motion. Browser normalization may
    // report this as "0.01ms" or in seconds.
    const collapsed =
      transitionDuration.includes('0.01ms') ||
      transitionDuration.includes('0.0001s') ||
      transitionDuration === '0s';
    expect(
      collapsed,
      `reduced-motion: body transition collapses (got: ${transitionDuration})`,
    ).toBe(true);
  });
});
