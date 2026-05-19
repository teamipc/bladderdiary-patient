// Phase 16 Summary Celebration verification spec.
//
// Asserts all 5 Phase 16 requirements (CEL-01..05) against a LOCAL
// static-export build served at http://localhost:4173.
//
// Test counts:
//   CEL-01 Hero celebration moment:               3 tests
//   CEL-02 Animated metric reveal:                3 tests
//   CEL-03 Sequential observation card reveal:    2 tests
//   CEL-04 Hero CTA above metrics ordering:       2 tests
//   CEL-05 First-visit one-shot + persistence:    3 tests
//   prefers-reduced-motion regression:            2 tests
//   TOTAL: 15 tests
//
// Invocation:
//   npm run build
//   npx --yes serve out -l 4173 &
//   sleep 2
//   PW_TEST_MATCH='phase16-summary-celebration\.spec\.ts' \
//     npx playwright test e2e/phase16-summary-celebration.spec.ts
//   pkill -f "serve out -l 4173" || true
//
// The PW_TEST_MATCH env var is REQUIRED. The default testMatch in
// playwright.config.ts is /(walkthrough|deep-flow|a11y)\.spec\.ts/
// which excludes this file. Per the Phase 5-07 + Phase 12-04 +
// Phase 13 + Phase 14 + Phase 15 precedent: --grep filters test
// TITLES not file paths; --test-match (via env var) is the supported
// override path for one-off verification specs.
//
// Discoverability self-check:
//   PW_TEST_MATCH='phase16-summary-celebration\.spec\.ts' \
//     npx playwright test e2e/phase16-summary-celebration.spec.ts --list
//
// INERT: this spec is NOT triggered as part of the daily walkthrough.
// It exists as a future verification artifact. Run on demand via the
// command above, OR as part of an explicit Phase 16 verification task.

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

const BASE_URL = process.env.PHASE16_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase16-summary-celebration');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// next-intl localePrefix: 'as-needed' for nav URLs. EN is at bare path; the
// 5 others are prefixed. Mirrors phase15-diary-micro-interactions.spec.ts:localePath.
function localePath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  return `/${locale}${path}`;
}

// ---------------------------------------------------------------------------
// Localized labels (read from messages/<locale>.json at spec authoring time)
// ---------------------------------------------------------------------------

// summary.completionHero.title substring match (loose). EN full string is
// "You did it. 3 days, complete." We match the substantive opening phrase
// to tolerate small register variations.
const COMPLETION_HERO_TITLE: Record<Locale, string> = {
  en: 'You did it',
  fr: "Vous l'avez fait",
  es: 'Lo logr',
  pt: 'Conseguiste',
  zh: '你做到了',
  ar: 'أنجزتها',
};

// summary.completionHero.dismiss button label per locale.
const COMPLETION_HERO_DISMISS: Record<Locale, string> = {
  en: 'Got it',
  fr: "J'ai compris",
  es: 'Entendido',
  pt: 'Percebi',
  zh: '明白了',
  ar: 'حسنًا',
};

// summary.ipcMetrics.twentyFourHV per locale.
const METRIC_24HV: Record<Locale, string> = {
  en: '24-hour volume',
  fr: 'Volume 24 h',
  es: 'Volumen de 24 h',
  pt: 'Volume de 24 h',
  zh: '24 小时尿量',
  ar: 'حجم 24 ساعة',
};

// Reference the locale tables + helpers so non-EN entries don't trip the
// unused-name lint when this spec lands but the per-locale iteration hasn't
// been wired (current spec runs EN-first; full-locale fan-out is a future
// expansion). Mirrors the Phase 14/15 pattern.
void LOCALES;
void localePath;
void COMPLETION_HERO_TITLE;

// ---------------------------------------------------------------------------
// Page-context helpers
// ---------------------------------------------------------------------------

// Clear localStorage before page JS runs so a first-visit branch can render
// where applicable.
async function clearDiary(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      // sandbox may deny localStorage; ignore.
    }
  });
}

// Seed a complete-diary Zustand persist envelope into localStorage. Used by
// the CEL-02 + CEL-03 + CEL-04 + CEL-05 tests that need the summary page to
// render with real metric values + observations.
//
// We extend the seed inline with the Phase 16 summaryCelebrationShown field.
// The fixtures.ts SeedState interface (Phase 14-era) doesn't include this
// field; we bypass strict typing for this single test-seed construction
// rather than modify fixtures.ts (per 16-03 D-12).
async function seedCompleteDiary(
  page: Page,
  overrides?: { summaryCelebrationShown?: boolean },
): Promise<void> {
  const baseEnvelope = buildSeedState();
  const stateWithCel: unknown = {
    ...baseEnvelope.state,
    summaryCelebrationShown: overrides?.summaryCelebrationShown ?? false,
  };
  const envelope = {
    ...baseEnvelope,
    state: stateWithCel as typeof baseEnvelope.state,
    version: 6, // Phase 16 persist schema bump
  };
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

// Reference clearDiary so it isn't flagged as unused; reserved for future
// first-visit tests that don't go through seedCompleteDiary.
void clearDiary;

// ---------------------------------------------------------------------------
// Per-spec viewport + baseURL (desktop chromium under the verification project)
// ---------------------------------------------------------------------------

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});

// ---------------------------------------------------------------------------
// CEL-01 Hero celebration moment
// ---------------------------------------------------------------------------

test.describe('CEL-01 Hero celebration moment', () => {
  test('en: CompletionHero visible on first visit to /summary with complete diary', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: false });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('[role="status"][aria-live="polite"]').first(),
      'CEL-01 (owner: 16-01): hero card with role=status visible',
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.locator(`text=${COMPLETION_HERO_TITLE.en}`),
      'CEL-01 (owner: 16-01): hero title contains "You did it"',
    ).toBeVisible({ timeout: 3_000 });
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'cel01-hero-en.png'),
      fullPage: true,
    });
  });

  test('en: CompletionHero has a marker icon (lucide CheckCircle2)', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: false });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    const hero = page.locator('[role="status"][aria-live="polite"]').first();
    await expect(hero, 'CEL-01 (owner: 16-01): hero visible').toBeVisible({ timeout: 8_000 });
    const icon = hero.locator('svg').first();
    await expect(icon, 'CEL-01 (owner: 16-01): hero has a marker icon').toBeVisible();
  });

  test('en: CompletionHero dismiss button fades the card out on click', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: false });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    const hero = page.locator('[role="status"][aria-live="polite"]').first();
    await expect(hero).toBeVisible({ timeout: 8_000 });
    const dismissButton = page.locator(`button:has-text("${COMPLETION_HERO_DISMISS.en}")`).first();
    await dismissButton.click();
    // Wait for the fade + unmount.
    await page.waitForTimeout(500);
    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
      'CEL-01 (owner: 16-01): hero unmounted after dismiss',
    ).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// CEL-02 Animated metric reveal
// ---------------------------------------------------------------------------

test.describe('CEL-02 Animated metric reveal', () => {
  test('en: IpcMetricsBlock renders 4 metric tiles after page load', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    // Wait for the count-up cascade to complete (~1.5s for 4 tiles staggered).
    await page.waitForTimeout(2000);
    const metricsRegion = page
      .locator('[aria-live="polite"]')
      .filter({ has: page.locator(`text=${METRIC_24HV.en}`) });
    await expect(
      metricsRegion,
      'CEL-02 (owner: 16-02): metrics live region present',
    ).toBeVisible();
    // 4 tiles in the grid (24HV, NPi, AVV, MVV).
    const tiles = metricsRegion.locator('.rounded-2xl.bg-ipc-50.border.border-ipc-100');
    await expect(
      tiles,
      'CEL-02 (owner: 16-02): 4 metric tiles rendered',
    ).toHaveCount(4);
  });

  test('en: metric tiles use tabular-nums for stable digit widths', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const firstNumber = page
      .locator(`text=${METRIC_24HV.en}`)
      .locator('..')
      .locator('p')
      .first();
    const computed = await firstNumber.evaluate(
      (el) => getComputedStyle(el).fontVariantNumeric,
    );
    expect(
      computed,
      'CEL-02 (owner: 16-02): tabular-nums applied',
    ).toContain('tabular-nums');
  });

  test('en: 24HV tile reaches a non-zero final value with a complete diary', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const tile = page.locator(`text=${METRIC_24HV.en}`).locator('..');
    const text = await tile.textContent();
    const match = text?.match(/(\d+)/);
    expect(
      match,
      'CEL-02 (owner: 16-02): 24HV tile shows a number',
    ).not.toBeNull();
    expect(
      parseInt(match?.[1] ?? '0', 10),
      'CEL-02 (owner: 16-02): 24HV > 0',
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CEL-03 Sequential observation card reveal
// ---------------------------------------------------------------------------

test.describe('CEL-03 Sequential observation card reveal', () => {
  test('en: observation cards are wrapped in reveal wrappers with transition styles', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    // The observation list <li>s should each contain a child <div> with the
    // inline transition style for opacity + transform.
    const liItems = page.locator('section ul.space-y-2 > li');
    const count = await liItems.count();
    expect(
      count,
      'CEL-03 (owner: 16-03): at least one observation card',
    ).toBeGreaterThan(0);
    const firstReveal = liItems.first().locator('> div');
    const transitionStyle = await firstReveal.evaluate(
      (el) => (el as HTMLElement).style.transition || '',
    );
    expect(
      transitionStyle,
      'CEL-03 (owner: 16-03): reveal wrapper has opacity + transform transition',
    ).toContain('opacity');
  });

  test('en: observation cards eventually reveal to opacity 1 after scroll into view', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    // Scroll the observations section into view.
    await page.evaluate(() => {
      const ul = document.querySelector('section ul.space-y-2');
      if (ul) ul.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    // Allow the observer to fire + the staggered timeouts to complete.
    await page.waitForTimeout(2000);
    const firstReveal = page.locator('section ul.space-y-2 > li > div').first();
    const opacity = await firstReveal.evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(
      opacity,
      'CEL-03 (owner: 16-03): first observation revealed',
    ).toBe('1');
  });
});

// ---------------------------------------------------------------------------
// CEL-04 Hero CTA above metrics ordering
// ---------------------------------------------------------------------------

test.describe('CEL-04 Hero CTA above metrics ordering', () => {
  test('en: top-CTA (ExportActions) renders above IpcMetricsBlock in vertical order', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const ctaButton = page
      .locator('button:has-text("Send to your healthcare team"), button:has-text("Save the PDF")')
      .first();
    const ctaBox = await ctaButton.boundingBox();
    const metricsLabel = page.locator(`text=${METRIC_24HV.en}`).first();
    const metricsBox = await metricsLabel.boundingBox();
    expect(
      ctaBox,
      'CEL-04 (owner: 16-02): top-CTA button has bounding box',
    ).not.toBeNull();
    expect(
      metricsBox,
      'CEL-04 (owner: 16-02): metrics block has bounding box',
    ).not.toBeNull();
    if (ctaBox && metricsBox) {
      expect(
        ctaBox.y,
        'CEL-04 (owner: 16-02): top-CTA y < metrics y (CTA above metrics)',
      ).toBeLessThan(metricsBox.y);
    }
  });

  test('en: metrics section animationDelay is 260ms', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const metricsSection = page
      .locator('section')
      .filter({ has: page.locator(`text=${METRIC_24HV.en}`) })
      .first();
    const delay = await metricsSection.evaluate(
      (el) => (el as HTMLElement).style.animationDelay,
    );
    expect(
      delay,
      'CEL-04 (owner: 16-02): metrics section animationDelay is 260ms',
    ).toBe('260ms');
  });
});

// ---------------------------------------------------------------------------
// CEL-05 First-visit one-shot + persistence
// ---------------------------------------------------------------------------

test.describe('CEL-05 First-visit one-shot + persistence', () => {
  test('en: CompletionHero appears on first visit when summaryCelebrationShown=false', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: false });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('[role="status"][aria-live="polite"]').first(),
      'CEL-05 (owner: 16-01): hero visible on first visit',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: CompletionHero is suppressed on second visit when summaryCelebrationShown=true', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await expect(
      page.locator('[role="status"][aria-live="polite"]'),
      'CEL-05 (owner: 16-01): hero suppressed on second visit',
    ).toHaveCount(0);
  });

  test('en: persist version 6 envelope hydrates correctly with summaryCelebrationShown', async ({ page }) => {
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const flagFromStore = await page.evaluate(() => {
      const raw = window.localStorage.getItem('bladder-diary-patient');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { state?: { summaryCelebrationShown?: boolean } };
        return parsed.state?.summaryCelebrationShown ?? null;
      } catch {
        return null;
      }
    });
    expect(
      flagFromStore,
      'CEL-05 (owner: 16-01): summaryCelebrationShown persisted in version 6 envelope',
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// prefers-reduced-motion regression
// ---------------------------------------------------------------------------

test.describe('prefers-reduced-motion regression', () => {
  test('en: AnimatedMetric renders final values instantly when reduced-motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    // With reduced-motion, the count-up is skipped; values should be at the
    // final state on first paint. We allow ~100ms for the React mount.
    await page.waitForTimeout(100);
    const tile = page.locator(`text=${METRIC_24HV.en}`).locator('..');
    const text = await tile.textContent();
    const match = text?.match(/(\d+)/);
    expect(
      match,
      'reduced-motion: 24HV tile shows a number immediately',
    ).not.toBeNull();
    expect(
      parseInt(match?.[1] ?? '0', 10),
      'reduced-motion: value is non-zero immediately',
    ).toBeGreaterThan(0);
  });

  test('en: ObservationCardReveal renders children at final state instantly when reduced-motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(100);
    const firstReveal = page.locator('section ul.space-y-2 > li > div').first();
    const opacity = await firstReveal.evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(
      opacity,
      'reduced-motion: observation revealed immediately',
    ).toBe('1');
  });
});
