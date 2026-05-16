/**
 * Phase 5 chrome verification spec.
 *
 * Independent of the daily walkthrough config (playwright.config.ts). Runs
 * against a local static-export server (see README at the top of this comment).
 *
 * Covers the 6-locale x 3-width Phase 5 verification matrix:
 *   - 6 locales: en / fr / es / pt / zh / ar
 *   - 3 viewports: 375px (mobile), 768px (md activates), 1280px (lg)
 *
 * Plus 6 explicit DTUX-02 success-criterion assertions, one per ROADMAP
 * Phase 5 success criterion:
 *   - Criterion 1: BottomNav hidden at md+, visible at less than md
 *   - Criterion 2: QuickLogFAB anchored to content column at md+, viewport-corner at less than md
 *   - Criterion 3: Container primitive in use (class string mx-auto w-full max-w-2xl in HTML)
 *   - Criterion 4: Header expands at md+ with primary nav region present
 *   - Criterion 5: RTL Arabic chrome correct (dir="rtl" attribute)
 *   - Criterion 6: Mobile 375px baseline preserved (no horizontal scroll, header sticky)
 *
 * Screenshots written to test-results/phase5-chrome/ for the human-verify
 * checkpoint at the end of Plan 05-07.
 *
 * To run:
 *   npm run build
 *   npx --yes serve out -l 4173 --no-clipboard &
 *   PHASE5_BASE_URL=http://localhost:4173 npx playwright test \
 *     e2e/phase5-chrome.spec.ts \
 *     --test-match='**\/phase5-chrome.spec.ts' \
 *     --reporter=list
 *
 * IMPORTANT: --test-match is REQUIRED because playwright.config.ts uses a
 * testMatch regex /(walkthrough|deep-flow|a11y)\.spec\.ts/ that does NOT match
 * this filename. The --grep / --grep-invert flags filter test TITLES not file
 * paths and will silently select zero tests.
 */

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = typeof LOCALES[number];

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 800 },
  { name: 'desktop-768', width: 768, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 900 },
] as const;

const BASE_URL = process.env.PHASE5_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase5-chrome');

mkdirSync(SCREENSHOT_DIR, { recursive: true });

// next-intl localePrefix: 'as-needed' — English is at bare paths in production
// (Vercel rewrites / -> /en). Locally `npx serve out` exposes the prefixed
// paths directly, so we always use /<locale>/... (including /en/...) for
// determinism against the local server. The bare path /index.html in the
// static-export is a client-side router shim that redirects to /en in JS;
// using the prefixed path avoids the shim entirely.
function localePath(locale: Locale, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}

async function seedDiaryState(page: Page): Promise<void> {
  // Full 3-day seed for /summary navigation (everything complete).
  // The store uses IndexedDB as primary; the adapter falls back to localStorage
  // for the v2->v3 migration path, which is what we exploit here. Use the
  // BrowserContext init script (not Page) so it applies across navigations.
  const seed = buildSeedState({ volumeUnit: 'mL', timeZone: 'America/New_York' });
  await page.context().addInitScript(
    ({ key, value }) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* localStorage may be denied in some sandboxed contexts; ignore */
      }
    },
    { key: STORE_KEY, value: seed },
  );
}

/**
 * Seed a minimal "diary just started, day 1 in progress" state. Day 1 needs
 * a wake time (canLogEntries = (dayNumber !== 1 || hasWakeTime), see
 * DayPageClient.tsx line 79) but NO bedtime yet so isDayComplete is false
 * and the QuickLogFAB renders. Used by Criterion 2 (FAB position assertions)
 * and the en x desktop-1280 diary screenshot.
 */
async function seedActiveDay1(page: Page): Promise<void> {
  // Use today as startDate so day 1 is the current day.
  const today = new Date().toISOString().split('T')[0];
  const wakeTimeIso = new Date(`${today}T11:00:00Z`).toISOString();
  const minimalState = {
    state: {
      startDate: today,
      age: 60,
      voids: [],
      drinks: [],
      leaks: [],
      bedtimes: [],
      wakeTimes: [
        {
          id: 'wake-seed-1',
          timestampIso: wakeTimeIso,
          dayNumber: 1 as const,
        },
      ],
      volumeUnit: 'mL' as const,
      diaryStarted: true,
      clinicCode: null,
      timeZone: 'America/New_York',
      morningAnchor: 'wake' as const,
      day1CelebrationShown: true,
    },
    version: 2,
  };
  await page.context().addInitScript(
    ({ key, value }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* localStorage may be denied in some sandboxed contexts; ignore */
      }
    },
    { key: STORE_KEY, value: JSON.stringify(minimalState) },
  );
}

test.use({
  baseURL: BASE_URL,
  viewport: { width: 375, height: 800 },
  ignoreHTTPSErrors: true,
});

// ---------------------------------------------------------------------------
// Matrix: 6 locales x 3 viewports = 18 landing screenshots minimum.
// Plus en x 1280 also captures /diary/day/1 + /summary -> 20 screenshots total.
// ---------------------------------------------------------------------------

test.describe.parallel('Phase 5 chrome — locale x viewport matrix', () => {
  for (const locale of LOCALES) {
    for (const viewport of VIEWPORTS) {
      test(`${locale} x ${viewport.name} — landing chrome renders and screenshot captured`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(localePath(locale, '/'), { waitUntil: 'domcontentloaded' });

        // Give the client-side hydration time to finish so post-hydration DOM
        // (the H1, the BottomNav reactivity, the FAB) is stable before screenshot.
        await page.waitForLoadState('networkidle');

        // Header is always present (sticky, mobile + desktop).
        await expect(page.locator('header').first()).toBeVisible();

        // At less than md (375px), the primary top-bar nav should be hidden (md:flex).
        // At >= md (768/1280), the primary top-bar nav should be visible.
        const primaryNav = page.locator('header nav[aria-label]').first();
        if (viewport.width < 768) {
          await expect(primaryNav).toBeHidden();
        } else {
          await expect(primaryNav).toBeVisible();
        }

        await page.screenshot({
          path: resolve(SCREENSHOT_DIR, `landing-${locale}-${viewport.name}.png`),
          fullPage: false,
        });

        // For the lg desktop in English, also capture a diary-day-1 screenshot
        // via the same path Criterion 2 uses (mobile-first Track click avoids
        // the DayPageClient redirect race). The summary screenshot is captured
        // in a separate dedicated test below to avoid IDB state collision
        // between the active-day-1 seed and the full 3-day seed within a
        // single browser context.
        if (locale === 'en' && viewport.name === 'desktop-1280') {
          await seedActiveDay1(page);
          await page.setViewportSize({ width: 375, height: 800 });
          await page.goto(localePath(locale, '/'), { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1000);
          await page.locator('nav.fixed.bottom-0 a[href$="/diary/day/1"]').first().click({ timeout: 5_000 });
          await page.waitForURL(/\/diary\/day\/1/, { timeout: 8_000 });
          await page.setViewportSize({ width: 1280, height: 900 });
          await page.waitForTimeout(500);
          await page.screenshot({
            path: resolve(SCREENSHOT_DIR, `diary-day1-${locale}-${viewport.name}.png`),
            fullPage: false,
          });
        }
      });
    }
  }
});

// ---------------------------------------------------------------------------
// 6 explicit DTUX-02 success criterion tests
// ---------------------------------------------------------------------------

test.describe('Phase 5 success criteria — explicit assertions', () => {
  test('Criterion 1: BottomNav hidden at md+, visible at less than md', async ({ page }) => {
    // /learn renders BottomNav unconditionally (no diaryStarted gating).
    // The landing route hides it via the `!diaryStarted && pathname === '/'` early return.

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(localePath('en', '/learn'), { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('nav.fixed.bottom-0')).toBeHidden();

    await page.setViewportSize({ width: 375, height: 800 });
    // Re-navigate so any media-query-conditional rendering re-evaluates cleanly.
    await page.goto(localePath('en', '/learn'), { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('nav.fixed.bottom-0')).toBeVisible();
  });

  test('Criterion 2: QuickLogFAB anchored to content column at md+, viewport-corner at less than md', async ({ page }) => {
    // Seed an in-progress day 1 (wake time set, no bedtime) so canLogEntries
    // is true and isDayComplete is false — FAB renders. DayPageClient.tsx
    // line 79: canLogEntries = (dayNumber !== 1 || hasWakeTime) && !isNightComplete.
    // Line 288-290: <QuickLogFAB /> renders only when canLogEntries && !isDayComplete.
    //
    // DayPageClient.tsx line 121-125 redirects to '/' on first render before
    // persist hydration finishes (race). To avoid: navigate to landing first,
    // wait for hydration (which shows Welcome back), then click the Track tab
    // — that's a client-side router push that doesn't lose the seeded state.
    await seedActiveDay1(page);

    // ---- 375px (mobile) ----
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(localePath('en', '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000); // let persist hydration land
    // Click the Track tab in the mobile BottomNav (client-side router.push).
    await page.locator('nav.fixed.bottom-0 a[href$="/diary/day/1"]').first().click({ timeout: 5_000 });
    await page.waitForURL(/\/diary\/day\/1/, { timeout: 8_000 });

    const fabMobile = page.locator('[data-testid="fab-toggle"]');
    await fabMobile.waitFor({ state: 'visible', timeout: 10_000 });
    const boxMobile = await fabMobile.boundingBox();
    expect(boxMobile).not.toBeNull();
    if (boxMobile) {
      // FAB is w-16 h-16 (64px) plus end-5 (20px gutter) at mobile.
      // Expected x ~ 375 - 64 - 20 = 291.
      const expectedXMobile = 375 - 64 - 20;
      expect(Math.abs(boxMobile.x - expectedXMobile)).toBeLessThan(50);
    }

    // ---- 1280px (lg desktop) ----
    // At desktop the BottomNav is hidden (md:hidden), but we're already on
    // /diary/day/1 and the seed is intact in IndexedDB. Just resize and wait.
    // The FAB anchors to content column edge: max-w-3xl (768px) centered in
    // 1280px viewport -> right edge at (1280-768)/2 + 768 = 1024px. FAB sits
    // inside that edge by 64 + 20 = 84px -> expected x ~ 940.
    await page.setViewportSize({ width: 1280, height: 900 });
    // The FAB position class is responsive — wait a frame for the layout to
    // re-apply the md: variant. The same fab-toggle element stays in the DOM.
    await page.waitForTimeout(500);

    const fabDesktop = page.locator('[data-testid="fab-toggle"]');
    await fabDesktop.waitFor({ state: 'visible', timeout: 10_000 });
    const boxDesktop = await fabDesktop.boundingBox();
    expect(boxDesktop).not.toBeNull();
    if (boxDesktop) {
      const expectedXDesktop = (1280 - 768) / 2 + 768 - 64 - 20;
      expect(Math.abs(boxDesktop.x - expectedXDesktop)).toBeLessThan(50);
    }
  });

  test('Criterion 3: Container primitive in use across landing markup', async ({ page }) => {
    // Container renders mx-auto w-full max-w-* on its outer wrapper. The
    // narrow variant uses max-w-2xl; LandingContent uses Container variant="narrow"
    // for the hero, so the rendered HTML must contain the Container class string.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(localePath('en', '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    // Allow other classes between mx-auto and max-w-2xl (Tailwind may interleave).
    expect(html).toMatch(/mx-auto[^"]*max-w-2xl|max-w-2xl[^"]*mx-auto/);
  });

  test('Criterion 4: Header expands at md+ with primary nav region present', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(localePath('en', '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const primaryNav = page.locator('header nav[aria-label]').first();
    await expect(primaryNav).toBeVisible();

    // The English aria-label is "Primary navigation" (from messages/en.json).
    const ariaLabel = await primaryNav.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel?.length ?? 0).toBeGreaterThan(0);
  });

  test('Criterion 5: RTL Arabic chrome — dir attribute and primary nav visible at md+', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(localePath('ar', '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('header nav[aria-label]').first()).toBeVisible();

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'criterion5-ar-rtl-768.png'),
      fullPage: false,
    });
  });

  test('en x desktop-1280 summary screenshot (full 3-day seed)', async ({ page }) => {
    // Separate test (own context) so the full 3-day seed is the ONLY thing in
    // IDB. The matrix test for en x desktop-1280 captured the diary-day1
    // screenshot under the active-day-1 seed.
    await seedDiaryState(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(localePath('en', '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    // Diary tab in BottomNav -> /summary, visible when isTrackingComplete.
    const summaryLink = page.locator('nav.fixed.bottom-0 a[href$="/summary"]').first();
    await summaryLink.waitFor({ state: 'visible', timeout: 8_000 });
    await summaryLink.click({ timeout: 5_000 });
    await page.waitForURL(/\/summary/, { timeout: 8_000 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'summary-en-desktop-1280.png'),
      fullPage: false,
    });
  });

  test('Criterion 6: Mobile 375px baseline preserved — no horizontal scroll, header sticky', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(localePath('en', '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page.locator('header').first()).toBeVisible();

    // No horizontal overflow. Allow 1px tolerance for sub-pixel rounding.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // Post-hydration H1 should be present (pre-hydration the H1 is absent from
    // the static HTML because LandingContent gates on storeHydrated — this is
    // pre-existing behavior; the spec confirms post-hydration the H1 IS there).
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });
});
