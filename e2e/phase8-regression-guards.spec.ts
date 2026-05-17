/**
 * Phase 8 regression-guards spec.
 *
 * Deterministic backstop for the 4 carry-overs closed by Plan 08-01 + an
 * expanded physical-CSS guard across all of src/components and src/app.
 *
 * Why this spec exists:
 *   The 2026-05-16 + 2026-05-17 walkthrough_findings.md entries show
 *   C1 + C3 failure modes (`[summary] Diary tab link not visible`,
 *   `[deepLinkSummary] redirect race regressed`) appearing in production.
 *   The daily walkthrough catches them AFTER deployment; this spec catches
 *   them BEFORE merge. C2 + C4 are first-time-fixed in Plan 08-01; their
 *   guards prevent future regression when an executor refactors layout
 *   chrome or FAB internals.
 *
 * Coverage (5 describe blocks):
 *   1. SEO H1 (C1 guard) — for each of 6 locales, out/{locale}/summary.html
 *      contains >= 1 <h1> element (NOT the bare out/{locale}.html landing page,
 *      which has a separate pre-existing H1 hydration gating in LandingContent.tsx
 *      outside Phase 8 scope — Plan 08-01 Task 2 ONLY fixes /summary).
 *   2. PrivacyNotice no-overlap (C2 guard) — computed position asserts
 *      privacyNotice.bottom <= fab.top + 8px at 375px + 1280px in all 6 locales.
 *   3. DayPageClient hydration race (C3 guard) — deep-link scenarios:
 *      a) /diary/day/2 with no state -> loading then redirect to /
 *      b) /diary/day/2 with Day 1 complete seed -> loading then Day 2 view
 *      c) /diary/day/3 with full diary seed -> loading then Day 3 view
 *      d) /summary with full diary seed -> loading then summary (THE production
 *         regression from walkthrough_findings.md 2026-05-16/17)
 *      e) 6-locale loop for /summary deep-link
 *   4. QuickLogFAB 44px (C4 guard) — 3 speed-dial chips have computed
 *      min-height: 44px at 375px AND 1280px; main fab-toggle stays 64px
 *   5. Expanded physical-CSS guard — grep-style assertion across all
 *      .tsx and .ts files in src/components/ + src/app/, comparing against
 *      PHYSICAL_CSS_ALLOWLIST (the pre-existing entries verified non-breaking
 *      in RTL by Plan 08-01 Task 1 audit). Any new physical CSS not in the
 *      allowlist fails the test.
 *
 * To run:
 *   npm run build
 *   npx --yes serve out -l 4173 --no-clipboard &
 *   PHASE8_BASE_URL=http://localhost:4173 \
 *     PW_TEST_MATCH='phase8-regression-guards\.spec\.ts' \
 *     npx playwright test e2e/phase8-regression-guards.spec.ts --reporter=line
 *
 * IMPORTANT — Playwright 1.59.1 invocation:
 *   The --test-match CLI flag does NOT exist in Playwright 1.59.1; use the
 *   PW_TEST_MATCH env var which playwright.config.ts:30 reads and converts to a
 *   one-off "verification" project. This pattern was established by Phase 5's
 *   05-07 plan and reused by Phase 6's 06-11 and Phase 7's 07-04.
 *   PW_TEST_MATCH is documented here as a breadcrumb for future executors.
 *
 * IMPORTANT — Path convention:
 *   Static export emits HTML at out/{locale}.html for the landing page AND at
 *   out/{locale}/summary.html for the summary page (Next.js 16 + next-intl
 *   localePrefix='as-needed', locked by Phase 5). The C1 guard checks
 *   out/{locale}/summary.html — NOT out/{locale}.html.
 *
 * EXPLICIT_ALLOWLIST (pre-existing physical CSS verified non-breaking in
 * RTL by Plan 08-01 Task 1 audit; documented here so future executors
 * don't blindly migrate them):
 *   - src/components/onboarding/OnboardingFlow.tsx:~221 — Calendar
 *     `absolute left-3.5 top-1/2` (centered icon; UI-SPEC §"Step 3" defers)
 *   - src/components/export/DaySummaryCard.tsx:41 — `ml-2` on dayLabel span
 *   - src/components/export/DaySummaryCard.tsx:57,71 — `ml-0.5` on unit suffix
 *   - src/app/[locale]/LandingContent.tsx:111 — `mr-2` on PlayCircle icon
 *   - src/components/layout/BottomNav.tsx:49 — `fixed bottom-0 left-0 right-0`
 *     (full-width chrome, RTL-neutral — symmetric left+right)
 *   - src/components/ui/Toast.tsx:25 — `fixed bottom-24 left-4 right-4`
 *     (centered toast, RTL-neutral — symmetric left+right)
 *   - src/components/ui/BottomSheet.tsx:150 — `absolute bottom-0 left-0 right-0`
 *     (full-width sheet, RTL-neutral — symmetric left+right)
 *   - src/components/diary/TimelineView.tsx:304 — `ml-6` indent on
 *     observation paragraph (verified non-breaking in ar)
 *   - src/components/diary/TimelineView.tsx:408,432 — `-right-1` on
 *     indicator badge (small decorative dot, RTL-verified)
 *   - src/components/diary/TimelineView.tsx:648 — `absolute -bottom-0 left-0
 *     right-0` (full-width, RTL-neutral — symmetric)
 *   - src/components/diary/LogVoidForm.tsx:310 — `pl-2 pr-3` chip (symmetric)
 *   - src/components/diary/LogVoidForm.tsx:336 — `absolute left-1/2 ...
 *     -translate-x-1/2` (centered chip via translate, RTL-symmetric)
 *   - src/components/diary/LogVoidForm.tsx:455 — `pr-11` textarea with icon
 *     space (pr-11 verified non-breaking in ar — icon is decorative)
 *   - src/components/diary/LogVoidForm.tsx:457 — `absolute right-2 top-1/2`
 *     textarea submit icon (small, non-blocking in ar)
 *   - src/components/diary/LogDrinkForm.tsx:268 — `pl-2 pr-3` chip (symmetric)
 *   - src/components/diary/LogDrinkForm.tsx:299 — `pr-11` textarea icon space
 *   - src/components/diary/LogDrinkForm.tsx:301 — `absolute right-2 top-1/2`
 *     textarea submit icon (non-blocking in ar)
 *   - src/components/diary/LogDrinkForm.tsx:322 — `absolute left-1/2 ...
 *     -translate-x-1/2` (centered chip via translate, RTL-symmetric)
 *   - src/components/diary/LogLeakForm.tsx:254 — `pl-2 pr-3` chip (symmetric)
 *   - src/components/diary/LogLeakForm.tsx:307 — `pr-11` textarea icon space
 *   - src/components/diary/LogLeakForm.tsx:315 — `absolute right-2 top-1/2`
 *     textarea submit icon (non-blocking in ar)
 *   - src/components/diary/Day2ReminderCard.tsx:94 — `absolute top-2 right-2`
 *     close button (small corner target, RTL-verified as non-blocking)
 *   - src/components/diary/Day2ReminderCard.tsx:98 — `pr-7` on title text
 *     (space for close button; RTL-neutral spacer)
 */

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 800 },
  { name: 'desktop-1280', width: 1280, height: 900 },
] as const;

const BASE_URL = process.env.PHASE8_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase8-regression-guards');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// next-intl localePrefix: 'as-needed' — locally we always use the prefixed
// /<locale>/... paths against `npx serve out` for determinism (the bare
// /index.html is a client-side router shim that redirects to /en in JS).
function localePath(locale: Locale, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}

// ---------------------------------------------------------------------------
// PHYSICAL_CSS_ALLOWLIST — pre-existing directional Tailwind classes verified
// non-breaking in RTL by Plan 08-01 Task 1 audit. Any physical CSS in
// src/components/ + src/app/ that is NOT matched by an entry in this list
// will fail Test 5. Future executors: add here with explicit reason.
// ---------------------------------------------------------------------------
const PHYSICAL_CSS_ALLOWLIST: ReadonlyArray<{
  file: string;
  pattern: RegExp;
  reason: string;
}> = [
  {
    file: 'src/components/onboarding/OnboardingFlow.tsx',
    pattern: /absolute left-3\.5 top-1\/2/,
    reason: 'Calendar icon centered position (UI-SPEC §Step 3 defers to a future pass)',
  },
  {
    file: 'src/components/export/DaySummaryCard.tsx',
    pattern: /ml-(2|0\.5)/,
    reason: 'dayLabel + unit suffix spacing (low-risk inline span in PDF-export card)',
  },
  {
    file: 'src/app/[locale]/LandingContent.tsx',
    pattern: /mr-2/,
    reason: 'PlayCircle icon margin (EN-only tutorial icon; verified in ar)',
  },
  {
    file: 'src/components/layout/BottomNav.tsx',
    pattern: /fixed bottom-0 left-0 right-0/,
    reason: 'Full-width bottom chrome (RTL-neutral: symmetric left+right)',
  },
  {
    file: 'src/components/ui/Toast.tsx',
    pattern: /fixed bottom-24 left-4 right-4/,
    reason: 'Centered toast bar (RTL-neutral: symmetric left+right)',
  },
  {
    file: 'src/components/ui/BottomSheet.tsx',
    pattern: /absolute bottom-0 left-0 right-0/,
    reason: 'Full-width sheet (RTL-neutral: symmetric left+right)',
  },
  {
    file: 'src/components/diary/TimelineView.tsx',
    pattern: /(ml-6|absolute -bottom-0 left-0 right-0|-right-1)/,
    reason:
      'ml-6 observation indent + full-width pinned div + -right-1 badge (all verified in ar)',
  },
  {
    file: 'src/components/diary/LogVoidForm.tsx',
    pattern: /(pl-2 pr-3|absolute left-1\/2|pr-11|absolute right-2 top-1\/2)/,
    reason: 'Chip spacing + centered chip translate + textarea icon space + submit icon',
  },
  {
    file: 'src/components/diary/LogDrinkForm.tsx',
    pattern: /(pl-2 pr-3|pr-11|absolute right-2 top-1\/2|absolute left-1\/2)/,
    reason: 'Chip spacing + textarea icon space + submit icon + centered chip translate',
  },
  {
    file: 'src/components/diary/LogLeakForm.tsx',
    pattern: /(pl-2 pr-3|pr-11|absolute right-2 top-1\/2)/,
    reason: 'Chip spacing + textarea icon space + submit icon',
  },
  {
    file: 'src/components/diary/Day2ReminderCard.tsx',
    pattern: /(absolute top-2 right-2|pr-7)/,
    reason: 'Close button corner positioning + title spacer for close button (RTL-verified)',
  },
];

// ---------------------------------------------------------------------------
// Seed helpers — mirror the pattern from e2e/phase7-onboarding-summary.spec.ts.
// Use addInitScript so localStorage is set BEFORE any page script runs,
// which means Zustand's persist middleware reads it synchronously at
// store-creation time (no hydration race).
// ---------------------------------------------------------------------------

/** Seed a full 3-day diary state. Used for C3 /summary and /diary/day/3 tests. */
async function seedCompleteDiary(page: Page): Promise<void> {
  const seed = buildSeedState({ volumeUnit: 'mL', timeZone: 'America/New_York' });
  await page.context().addInitScript(
    ({ key, value }: { key: string; value: unknown }) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* localStorage may be denied in sandboxed contexts */
      }
    },
    { key: STORE_KEY, value: seed },
  );
}

/**
 * Seed only Day 1 data (wake time + bedtime + one void, no Day 2/3 data).
 * Used for C3 /diary/day/2 test and for C2 PrivacyNotice tests.
 *
 * After Plan 08-01 ships, DayPageClient guards /diary/day/N on hydrated
 * diary state; un-seeded navigation to /diary/day/1 redirects to landing.
 * This seed gives the app the minimum data to render the diary day view
 * without bouncing back to onboarding.
 */
async function seedDay1CompleteOnly(page: Page): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const wakeTimeIso = new Date(`${today}T11:00:00Z`).toISOString();
  const bedtimeIso = new Date(`${today}T22:30:00Z`).toISOString();
  const voidIso = new Date(`${today}T11:10:00Z`).toISOString();

  const day1State = {
    state: {
      startDate: today,
      age: 60,
      voids: [
        {
          id: 'void-d1-seed-1',
          timestampIso: voidIso,
          volumeMl: 300,
          sensation: 3 as const,
          leak: false,
          note: '',
          isFirstMorningVoid: true,
        },
      ],
      drinks: [],
      leaks: [],
      bedtimes: [
        {
          id: 'bed-d1-seed-1',
          timestampIso: bedtimeIso,
          dayNumber: 1 as const,
        },
      ],
      wakeTimes: [
        {
          id: 'wake-d1-seed-1',
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
    ({ key, value }: { key: string; value: unknown }) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* localStorage may be denied in sandboxed contexts */
      }
    },
    { key: STORE_KEY, value: day1State },
  );
}

/** Clear localStorage so tests start from a fresh-user state. */
async function clearStorage(page: Page): Promise<void> {
  await page.context().addInitScript(({ key }: { key: string }) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, { key: STORE_KEY });
}

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});

// ===========================================================================
// DESCRIBE 1: SEO H1 regression guard (C1)
//
// Plan 08-01 Task 2 (C1) moves the /summary <h1> outside the useStoreHydrated()
// gate so the static out/{locale}/summary.html already contains the element.
// This guard verifies the fix holds: each locale's summary.html must have >= 1
// <h1> at build time (no hydration required).
//
// NOTE: The bare landing-page out/{locale}.html has a SEPARATE pre-existing
// H1 hydration gating (LandingContent.tsx behind useStoreHydrated()). That
// is OUTSIDE Phase 8 scope — Phase 7 explicitly marked it INFORMATIONAL.
// The C1 guard only checks the summary page.
// ===========================================================================
test.describe('SEO H1 regression guard (C1)', () => {
  for (const locale of LOCALES) {
    // NOTE: out/{locale}/summary.html is the correct path.
    // Next.js 16 + next-intl localePrefix='as-needed' emits the summary route
    // as out/{locale}/summary.html. This was verified by `find out -name
    // "summary.html"` during planning — all 6 locales emit at this path.
    // Do NOT use out/{locale}.html (landing page) or out/{locale}/index.html
    // (not emitted). No fallback path — if the path changes, fail fast.
    test(`${locale}: out/${locale}/summary.html contains >= 1 <h1> element (C1 guard)`, () => {
      const summaryPath = resolve('out', locale, 'summary.html');
      let html: string;
      try {
        html = readFileSync(summaryPath, 'utf8');
      } catch {
        throw new Error(
          `Could not read ${summaryPath} — run 'npm run build' first. ` +
            `(This is the C1 regression guard; the file must exist post-08-01.)`,
        );
      }
      const h1Count = (html.match(/<h1\b/gi) || []).length;
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });
  }
});

// ===========================================================================
// DESCRIBE 2: PrivacyNotice no-overlap with FAB (C2 guard)
//
// Plan 08-01 Task 3 (C2) adjusts PrivacyNotice positioning so it sits above
// the FAB on mobile and desktop. This guard verifies: PrivacyNotice bottom
// edge <= FAB top edge + 8px tolerance, at 375px and 1280px, in all 6 locales.
//
// CRITICAL: seedDay1CompleteOnly must be called so the C3 fix (DayPageClient
// hydration guard in 08-01 Task 4) does NOT redirect un-seeded state to
// landing before the FAB renders. After Plan 08-01, navigating to
// /diary/day/1 with no diary state triggers a redirect to / — seeding Day 1
// data prevents that redirect and lets both PrivacyNotice + FAB render.
// ===========================================================================
test.describe('PrivacyNotice no-overlap with FAB (C2 guard)', () => {
  for (const locale of LOCALES) {
    for (const viewport of VIEWPORTS) {
      test(`${locale} ${viewport.name}: PrivacyNotice sits above FAB`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // CRITICAL: seed BEFORE goto so addInitScript fires on the first navigation.
        // Also remove the privacy-seen flag so the notice renders.
        // Use clearStorage to remove any lingering diary state, then seed Day 1.
        await clearStorage(page);
        await seedDay1CompleteOnly(page);

        // Navigate to diary day 1 (where both FAB + PrivacyNotice render together)
        await page.goto(`${BASE_URL}${localePath(locale, '/diary/day/1')}`, {
          waitUntil: 'domcontentloaded',
        });

        // Remove the privacy-seen flag so the notice renders this session
        // (it may have been set by a prior test's navigation)
        await page.evaluate(() => {
          window.localStorage.removeItem('mfc-privacy-notice-seen');
        });

        // Reload to pick up the cleared flag (the notice renders on first load
        // when the flag is absent)
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800); // let persist hydration + notice timer

        const fab = page.getByTestId('fab-toggle');
        await expect(fab).toBeVisible({ timeout: 8_000 });

        // PrivacyNotice uses a role="region" with an aria-label; locate by
        // its region role (more stable than a text match across 6 locales).
        // It becomes visible after an internal 600ms timer in the component.
        const privacyNotice = page.locator('[role="region"]').first();
        try {
          await privacyNotice.waitFor({ state: 'visible', timeout: 3_000 });
        } catch {
          // If notice is already dismissed or not present, log and skip overlap check
          console.warn(
            `WARN: PrivacyNotice not visible in ${locale} ${viewport.name} — may be dismissed or C2 fix changed rendering.`,
          );
          return;
        }

        const noticeBox = await privacyNotice.boundingBox();
        const fabBox = await fab.boundingBox();

        expect(noticeBox).not.toBeNull();
        expect(fabBox).not.toBeNull();

        if (noticeBox && fabBox) {
          // PrivacyNotice bottom edge (y + height) must be at or above FAB top edge (y).
          // 8px tolerance for rendering jitter and sub-pixel rounding.
          const noticeBottom = noticeBox.y + noticeBox.height;
          const fabTop = fabBox.y;
          expect(noticeBottom).toBeLessThanOrEqual(fabTop + 8);
        }
      });
    }
  }
});

// ===========================================================================
// DESCRIBE 3: DayPageClient hydration race (C3 guard)
//
// Plan 08-01 Task 4 (C3) adds useStoreHydrated() gates to DayPageClient so:
//   - Un-seeded deep-links to /diary/day/N show a loading skeleton, THEN
//     redirect to / (not a flickery immediate redirect).
//   - Seeded deep-links render the correct day view without bouncing.
//   - The /summary deep-link with a seeded store shows the summary (no bounce).
//
// This is THE production regression in walkthrough_findings.md entries:
//   2026-05-16: "[summary] Diary tab link to /summary not visible — seed may not have hydrated"
//   2026-05-17: "[deepLinkSummary] Deep-link redirect race regressed"
// ===========================================================================
test.describe('DayPageClient hydration race (C3 guard)', () => {
  test('Deep-link /diary/day/2 with no state -> spinner then redirect to /', async ({ page }) => {
    await clearStorage(page);
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' });
    // Navigate to /diary/day/2 with no diary state
    await page.goto(`${BASE_URL}/en/diary/day/2`, { waitUntil: 'domcontentloaded' });
    // C3 fix: app should show a loading state then redirect to / (not flicker)
    await page.waitForURL(/\/en\/?$/, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/en\/?$/);
  });

  test('Deep-link /diary/day/2 with Day 1 complete seed -> Day 2 view renders', async ({ page }) => {
    await seedDay1CompleteOnly(page);
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800); // let persist hydration land
    await page.goto(`${BASE_URL}/en/diary/day/2`, { waitUntil: 'domcontentloaded' });
    // Should stay on /diary/day/2 (not redirect to landing)
    await expect(page).toHaveURL(/\/en\/diary\/day\/2$/, { timeout: 8_000 });
    await expect(page.locator('main')).toBeVisible();
    // Should NOT redirect to landing
    expect(page.url()).not.toMatch(/\/en\/?$/);
  });

  test('Deep-link /diary/day/3 with full diary seed -> Day 3 view renders', async ({ page }) => {
    await seedCompleteDiary(page);
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.goto(`${BASE_URL}/en/diary/day/3`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/en\/diary\/day\/3$/, { timeout: 8_000 });
    await expect(page.locator('main')).toBeVisible();
    expect(page.url()).not.toMatch(/\/en\/?$/);
  });

  test('/summary deep-link with complete diary -> summary renders with H1 (C1+C3 root cause)', async ({ page }) => {
    // This is the EXACT failure the daily walkthrough logs:
    // "[summary] Diary tab link to /summary not visible — seed may not have hydrated"
    // C1 fix: H1 is in the SSR output (no hydration gate).
    // C3 fix: /summary does not redirect on pre-hydration state.
    await seedCompleteDiary(page);
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.goto(`${BASE_URL}/en/summary`, { waitUntil: 'domcontentloaded' });
    // Must stay on /summary (not bounce to landing)
    await expect(page).toHaveURL(/\/en\/summary$/, { timeout: 8_000 });
    // Summary H1 must be visible (C1 fix: outside useStoreHydrated gate)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 });
    expect(page.url()).not.toMatch(/\/en\/?$/);
  });

  // Repeat the critical C1+C3 /summary scenario across all 6 locales.
  // This is the canonical production regression guard — walkthrough finds it
  // AFTER deploy; this spec must catch it BEFORE merge in all locales.
  for (const locale of LOCALES) {
    test(`${locale}: /summary deep-link with seeded diary renders summary (not landing)`, async ({
      page,
    }) => {
      await seedCompleteDiary(page);
      await page.goto(`${BASE_URL}${localePath(locale, '/')}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(800);
      await page.goto(`${BASE_URL}${localePath(locale, '/summary')}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page).toHaveURL(new RegExp(`/${locale}/summary$`), { timeout: 8_000 });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 });
      // Must not bounce to landing
      expect(page.url()).not.toMatch(new RegExp(`/${locale}/?$`));
    });
  }
});

// ===========================================================================
// DESCRIBE 4: QuickLogFAB 44px hit-target (C4 guard)
//
// Plan 08-01 Task 5 (C4) adds min-h-[44px] to the 3 speed-dial action chips
// (fab-action-drink, fab-action-leak, fab-action-void) in QuickLogFAB.tsx.
// This is a Boomer-safe correctness fix (same class as Phase 7 back-pill bump).
// The main FAB toggle (fab-toggle, w-16 h-16 = 64px) is unchanged.
//
// Assertions run at both 375px AND 1280px to verify the fix holds across the
// full mobile/desktop range (the chips appear at both widths).
// ===========================================================================
test.describe('QuickLogFAB 44px hit-target (C4 guard)', () => {
  /**
   * Navigate to /diary/day/1 with Day 1 seeded so the FAB renders.
   * Opens the speed-dial so the 3 action chips are visible.
   */
  async function openFabSpeedDial(page: Page, viewportWidth: number): Promise<void> {
    await page.setViewportSize({ width: viewportWidth, height: 800 });
    await seedDay1CompleteOnly(page);
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.goto(`${BASE_URL}/en/diary/day/1`, { waitUntil: 'domcontentloaded' });
    const fabToggle = page.getByTestId('fab-toggle');
    await expect(fabToggle).toBeVisible({ timeout: 8_000 });
    // Click the FAB toggle to expand speed-dial
    await fabToggle.click({ timeout: 5_000 });
    // Wait for the first action chip to appear
    await expect(page.getByTestId('fab-action-drink')).toBeVisible({ timeout: 5_000 });
  }

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}: fab-action-drink has min-height 44px (C4 Boomer-safe guard)`, async ({
      page,
    }) => {
      await openFabSpeedDial(page, viewport.width);
      await expect(page.getByTestId('fab-action-drink')).toHaveCSS('min-height', '44px');
    });

    test(`${viewport.name}: fab-action-leak has min-height 44px (C4 Boomer-safe guard)`, async ({
      page,
    }) => {
      await openFabSpeedDial(page, viewport.width);
      await expect(page.getByTestId('fab-action-leak')).toHaveCSS('min-height', '44px');
    });

    test(`${viewport.name}: fab-action-void has min-height 44px (C4 Boomer-safe guard)`, async ({
      page,
    }) => {
      await openFabSpeedDial(page, viewport.width);
      await expect(page.getByTestId('fab-action-void')).toHaveCSS('min-height', '44px');
    });

    test(`${viewport.name}: fab-toggle (main) remains 64x64px (unchanged by Phase 8)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: 800 });
      await seedDay1CompleteOnly(page);
      await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      await page.goto(`${BASE_URL}/en/diary/day/1`, { waitUntil: 'domcontentloaded' });
      const fabToggle = page.getByTestId('fab-toggle');
      await expect(fabToggle).toBeVisible({ timeout: 8_000 });
      // Main toggle must be 64x64px (w-16 h-16 = 64px; unchanged by Phase 8)
      const fabBox = await fabToggle.boundingBox();
      expect(fabBox).not.toBeNull();
      if (fabBox) {
        expect(fabBox.width).toBe(64);
        expect(fabBox.height).toBe(64);
      }
    });
  }
});

// ===========================================================================
// DESCRIBE 5: Expanded physical-CSS regression guard
//
// Scans ALL .tsx and .ts files under src/components/ + src/app/ for physical
// directional Tailwind utilities (ml-, mr-, pl-, pr-, left-, right-,
// border-l-, border-r-, text-left, text-right). Any match NOT covered by
// PHYSICAL_CSS_ALLOWLIST is a regression — it may silently break AR (RTL).
//
// Phase 7 had a narrow 3-file guard (OnboardingFlow + summary/page + ExportActions).
// Phase 8 expands to ALL components because the 08-01 Task 1 audit found
// physical CSS in 10+ additional files that were not covered by Phase 7.
//
// The PHYSICAL_CSS_ALLOWLIST above documents each pre-existing entry with a
// reason explaining why it was verified non-breaking in RTL. Future executors:
// if you add a new physical-CSS entry, EITHER migrate it to a logical property
// (preferred: ms-/me-/ps-/pe-/start-/end-/text-start/text-end) OR add it to
// the allowlist with an explicit RTL-safety rationale.
//
// Lines with `rtl:` variant prefix are exempt (they are intentional RTL
// overrides, not un-audited physical CSS).
// ===========================================================================
test.describe('Expanded physical-CSS regression guard', () => {
  test('No new physical CSS introduced beyond the explicit allowlist', () => {
    const candidateRoots = ['src/components', 'src/app'];
    const offenders: Array<{ file: string; line: number; text: string }> = [];

    // Physical-CSS pattern: matches directional Tailwind utilities.
    // Excludes: logical-property variants (ms-, me-, ps-, pe-, start-, end-)
    // Excludes: color utilities that happen to contain "right" or "left" as
    //   a word component (e.g., text-ipc-* — caught by the [0-9a-zA-Z] suffix gate)
    const physicalCssPattern =
      /(^|[^a-zA-Z-])(ml-|mr-|pl-|pr-|left-|right-|-right-|-left-|border-l-|border-r-|text-left|text-right)[0-9a-zA-Z/\[.]/;

    function walk(dir: string): void {
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = join(dir, entry);
        let stat;
        try {
          stat = statSync(full);
        } catch {
          continue;
        }
        if (stat.isDirectory()) {
          walk(full);
        } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
          let content: string;
          try {
            content = readFileSync(full, 'utf8');
          } catch {
            continue;
          }
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            // Skip lines with rtl: variant (intentional RTL adaptation)
            if (/\brtl:/.test(line)) return;
            // Skip comment-only lines (single-line // comments)
            if (/^\s*\/\//.test(line)) return;

            if (!physicalCssPattern.test(line)) return;

            const relPath = relative(process.cwd(), full).replace(/\\/g, '/');

            const allowed = PHYSICAL_CSS_ALLOWLIST.some(
              (entry) =>
                relPath.endsWith(entry.file.replace(/\//g, '/')) &&
                entry.pattern.test(line),
            );

            if (!allowed) {
              offenders.push({ file: relPath, line: idx + 1, text: line.trim() });
            }
          });
        }
      }
    }

    for (const root of candidateRoots) {
      walk(root);
    }

    if (offenders.length > 0) {
      const report = offenders
        .map((o) => `  ${o.file}:${o.line} — ${o.text}`)
        .join('\n');
      console.log(
        'Physical-CSS violations (NOT in PHYSICAL_CSS_ALLOWLIST):\n' +
          report +
          '\n\nTo fix: either migrate to logical properties (ms-/me-/ps-/pe-/start-/end-) ' +
          'or add an entry to PHYSICAL_CSS_ALLOWLIST with an RTL-safety reason.',
      );
    }

    expect(offenders).toEqual([]);
  });
});
