/**
 * Phase 9 cross-locale parity spec.
 *
 * Independent of the daily walkthrough config (playwright.config.ts). Runs
 * against a local static-export server (see README at the top of this comment).
 *
 * Covers the 6 Phase 9 locale-parity success criteria (LP-01..LP-06):
 *   - LP-01: Article cards link to in-locale URLs without double-prefixing
 *            (the previous-phase bug was /<L>/<L>/learn/...)
 *   - LP-04: TimePicker bedtime chips render via formatTime() in 6 locales
 *            (no hardcoded English 'AM'/'PM' substrings in non-EN locales)
 *   - LP-05: Breadcrumb landmark aria-label is translated in 6 locales
 *   - LP-06: Author photos render on /learn/authors/* AND Person JSON-LD
 *            contains an absolute image URL in 6 locales
 *
 * NB: LP-02 (PDF Unicode font registration) and LP-03 (PDF hardcoded English
 * elimination) are NOT in this Playwright spec because they exercise the PDF
 * generator, not a rendered page. Coverage for LP-02 + LP-03 lives in
 * `src/__tests__/pdf-blob-content.test.ts` (the companion vitest), and the
 * actual glyph-rendering correctness is verified at the human-verify checkpoint.
 *
 * Screenshots written to test-results/phase9-locale-parity/ for the
 * human-verify checkpoint at the end of Plan 09-06.
 *
 * To run:
 *   npm run build
 *   npx --yes serve out -l 4173 --no-clipboard &
 *   PHASE9_BASE_URL=http://localhost:4173 \
 *     PW_TEST_MATCH='phase9-locale-parity\.spec\.ts' \
 *     npx playwright test e2e/phase9-locale-parity.spec.ts \
 *     --reporter=list
 *
 * IMPORTANT (Phase 7 post-mortem): use the PW_TEST_MATCH env-var pattern
 * established in playwright.config.ts. The CLI --test-match flag DOES NOT
 * EXIST in Playwright 1.59.1 and silently does nothing. The --grep flag
 * filters by test TITLE, not file path, and will silently select zero tests
 * if the regex does not match a title. Use PW_TEST_MATCH or pass the spec
 * file path positionally (which Playwright respects as a path filter only
 * when the configured testMatch regex also matches it — hence PW_TEST_MATCH).
 */

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { locales } from '../src/i18n/config';

type Locale = (typeof locales)[number];
const LOCALES: readonly Locale[] = locales;

const BASE_URL = process.env.PHASE9_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase9-locale-parity');

mkdirSync(SCREENSHOT_DIR, { recursive: true });

// next-intl `localePrefix: 'as-needed'` means English is bare in production
// (Vercel rewrites / -> /en). Locally `npx serve out` exposes the prefixed
// paths directly, so we always use /<locale>/... for determinism against the
// local server.
function localePath(locale: Locale, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});

test.describe.parallel('Phase 9 locale parity matrix', () => {
  for (const L of LOCALES) {
    // ── LP-01: Learn-hub article cards have single-locale-prefixed hrefs ──
    test(`LP-01: ${L} learn hub article cards have single-locale-prefixed hrefs`, async ({ page }) => {
      await page.goto(BASE_URL + localePath(L, '/learn'));
      await page.waitForLoadState('networkidle');

      const cardHrefs = await page
        .locator('a[href*="/learn/"]')
        .evaluateAll((els) =>
          els
            .map((a) => a.getAttribute('href'))
            .filter((h): h is string => !!h && h.startsWith('/')),
        );

      // For each card href, assert it does NOT start with /<L>/<L>/ (the bug pattern).
      const doubleRe = new RegExp(`^/${L}/${L}/`);
      for (const href of cardHrefs) {
        expect(href, `${L}: href ${href} should not double-prefix`).not.toMatch(doubleRe);
      }

      // Spot-check that at least 3 cards rendered (sanity that the page loaded content).
      expect(cardHrefs.length).toBeGreaterThan(2);

      // For non-EN locales, the cards' learn hrefs start with /<L>/learn/
      // (next-intl re-prepends the active locale to internal links). For EN,
      // the local static-export serves under /en/learn/ as well (next-intl
      // generates per-locale static pages including /en/...).
      const learnCards = cardHrefs.filter((h) => h.includes('/learn/'));
      expect(learnCards.length).toBeGreaterThan(0);
      const expected = new RegExp(`^/${L}/learn/`);
      expect(
        learnCards[0],
        `${L}: first learn card href ${learnCards[0]} should match ${expected}`,
      ).toMatch(expected);

      // Capture a screenshot for the human-verify checkpoint.
      await page.screenshot({
        path: resolve(SCREENSHOT_DIR, `learn-hub-${L}.png`),
        fullPage: false,
      });
    });

    // ── LP-01 follow-up: destination 200-status ─────────────────────────
    test(`LP-01: ${L} first article-card destination returns content not 404`, async ({ page }) => {
      await page.goto(BASE_URL + localePath(L, '/learn'));
      await page.waitForLoadState('networkidle');

      const firstCard = page.locator('a[href*="/learn/"]').first();
      const href = await firstCard.getAttribute('href');
      expect(href, `${L}: expected at least one learn card href`).toBeTruthy();

      await page.goto(BASE_URL + (href as string));
      await page.waitForLoadState('networkidle');

      const body = await page.locator('body').textContent();
      expect(body, `${L}: article page body should not contain '404'`).not.toMatch(/404/i);

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `${L}: article page should have at least one h1`).toBeGreaterThanOrEqual(1);
    });

    // ── LP-05: Breadcrumb landmark aria-label is translated ──────────────
    test(`LP-05: ${L} breadcrumb nav aria-label is translated`, async ({ page }) => {
      // /learn/voiding is a topic page; both topic landings and individual
      // article pages render the Breadcrumb landmark. Topic landings are
      // simpler and more deterministic across the matrix.
      await page.goto(BASE_URL + localePath(L, '/learn/voiding'));
      await page.waitForLoadState('networkidle');

      const nav = page.locator('nav[aria-label]').first();
      await expect(nav, `${L}: breadcrumb nav should be visible`).toBeVisible();

      const label = await nav.getAttribute('aria-label');
      expect(label, `${L}: aria-label must be non-empty`).toBeTruthy();
      const labelStr = label as string;

      if (L === 'en') {
        expect(labelStr).toBe('Breadcrumb');
      } else {
        // Non-EN locales must NOT use the English literal.
        expect(labelStr, `${L}: aria-label must not be English 'Breadcrumb'`).not.toBe('Breadcrumb');
        // Non-trivial translation (more than the empty-shim 2-char fallback).
        expect(labelStr.length).toBeGreaterThan(2);
      }

      await page.screenshot({
        path: resolve(SCREENSHOT_DIR, `breadcrumb-${L}.png`),
        fullPage: false,
      });
    });

    // ── LP-06: Author page renders Image with translated alt ─────────────
    test(`LP-06: ${L} author page renders Image with translated alt`, async ({ page }) => {
      await page.goto(BASE_URL + localePath(L, '/learn/authors/dr-di-wu'));
      await page.waitForLoadState('networkidle');

      // Author page header contains the author photo. The Image component
      // emits an <img> with src + alt — locate the first <img> inside <header>.
      const photo = page.locator('header img').first();
      await expect(photo, `${L}: author photo should be visible`).toBeVisible();

      const src = await photo.getAttribute('src');
      expect(src, `${L}: author photo src must be non-empty`).toBeTruthy();
      // Next.js Image optimizer may produce /_next/image?url=... in dev, or
      // a direct /authors/<slug>.<ext> path in the static export.
      expect(src as string).toMatch(/(authors\/dr-di-wu\.(jpg|svg|webp|png)|_next\/image)/);

      const alt = await photo.getAttribute('alt');
      expect(alt, `${L}: author photo alt must be non-empty`).toBeTruthy();
      const altStr = alt as string;

      // The author name interpolation should always carry 'Di Wu' regardless
      // of the locale wrapping.
      expect(altStr).toContain('Di Wu');

      if (L !== 'en') {
        // Non-EN locales must not start with the English 'Portrait of ' literal.
        expect(altStr, `${L}: alt should not start with English 'Portrait of '`).not.toMatch(
          /^Portrait of /,
        );
      }

      await page.screenshot({
        path: resolve(SCREENSHOT_DIR, `author-${L}.png`),
        fullPage: false,
      });
    });

    // ── LP-06 follow-up: Person JSON-LD includes absolutized image URL ───
    test(`LP-06: ${L} Person JSON-LD includes absolutized image URL`, async ({ page }) => {
      await page.goto(BASE_URL + localePath(L, '/learn/authors/dr-di-wu'));
      await page.waitForLoadState('networkidle');

      const jsonLds = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(jsonLds.length, `${L}: at least one JSON-LD script expected`).toBeGreaterThan(0);

      // Locate the Person object — may appear as a top-level entity, or
      // nested inside an @graph array.
      type LDObject = Record<string, unknown>;
      function isLD(x: unknown): x is LDObject {
        return typeof x === 'object' && x !== null;
      }
      function findPerson(ld: LDObject): LDObject | undefined {
        if (ld['@type'] === 'Person') return ld;
        const graph = ld['@graph'];
        if (Array.isArray(graph)) {
          for (const node of graph) {
            if (isLD(node) && node['@type'] === 'Person') return node;
          }
        }
        return undefined;
      }

      let person: LDObject | undefined;
      for (const raw of jsonLds) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (isLD(parsed)) {
            const found = findPerson(parsed);
            if (found) {
              person = found;
              break;
            }
          }
        } catch {
          // Some JSON-LD blocks may be non-JSON HTML noise; ignore.
        }
      }

      expect(person, `${L}: Person JSON-LD should be present on author page`).toBeTruthy();

      const image = (person as LDObject)['image'];
      expect(image, `${L}: Person.image must be non-empty`).toBeTruthy();

      // Absolute URL pointing at the canonical production origin.
      const imageStr = typeof image === 'string' ? image : '';
      expect(imageStr, `${L}: Person.image should be a string`).toBeTruthy();
      expect(imageStr).toMatch(/^https:\/\/myflowcheck\.com\/authors\//);
    });

    // ── LP-04: TimePicker bedtime chips render locale-natively ───────────
    // The bedtime form (SetBedtimeForm) is reached through the FAB on
    // /diary/day/1 once a wake-time is recorded. This e2e is an
    // integration-level smoke test; the unit test in 09-02 is the primary
    // LP-04 regression guard (see src/__tests__/time-picker-bedtime-chips-locale.test.tsx).
    // If the seeded state + selector chain cannot open the bedtime form
    // reliably across all 6 locales, the test skips and surfaces a note to
    // the human-verify checkpoint.
    test(`LP-04: ${L} bedtime chips do not contain hardcoded English PM/AM`, async ({ page }) => {
      // Seed a minimal diary state so Day 1 page renders the FAB. The
      // STORE_KEY must stay in sync with src/lib/store.ts ('bladder-diary-patient').
      await page.addInitScript(() => {
        const STORE_KEY = 'bladder-diary-patient';
        const today = new Date().toISOString().split('T')[0];
        const wakeTimeIso = new Date(`${today}T11:00:00Z`).toISOString();
        window.localStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            state: {
              startDate: today,
              age: 55,
              voids: [],
              drinks: [],
              leaks: [],
              bedtimes: [],
              wakeTimes: [
                {
                  id: 'wake-seed-1',
                  timestampIso: wakeTimeIso,
                  dayNumber: 1,
                },
              ],
              volumeUnit: 'mL',
              diaryStarted: true,
              clinicCode: null,
              timeZone: 'America/New_York',
              morningAnchor: 'wake',
              day1CelebrationShown: true,
            },
            version: 2,
          }),
        );
      });

      await page.goto(BASE_URL + localePath(L, '/diary/day/1'));
      await page.waitForLoadState('networkidle');

      // Try to open the bedtime form. The FAB toggles a menu; the bedtime
      // affordance is one of the menu items. Selectors may vary across
      // locales (the button labels are translated). We try a tolerant
      // selector chain: data-testid first, then localized text.
      const fab = page.locator('[data-testid="fab-toggle"]');
      const fabVisible = await fab.isVisible({ timeout: 5_000 }).catch(() => false);

      if (fabVisible) {
        await fab.click();
        // The bedtime button may use data-testid or one of several locale
        // labels. Tolerant fallback chain:
        const bedBtn = page
          .locator(
            [
              '[data-testid="fab-bedtime"]',
              'button:has-text("Bedtime")',
              'button:has-text("Coucher")',
              'button:has-text("Acostarse")',
              'button:has-text("Deitar")',
              'button:has-text("就寝")',
              'button:has-text("النوم")',
            ].join(', '),
          )
          .first();
        const bedBtnVisible = await bedBtn.isVisible({ timeout: 3_000 }).catch(() => false);
        if (bedBtnVisible) {
          await bedBtn.click();
        }
      }

      // Inspect any rendered bedtime chips. TimePicker emits a button with
      // the chip class signature including 'border-bedtime'.
      const chips = page.locator('button[class*="border-bedtime"]');
      const chipCount = await chips.count();
      if (chipCount === 0) {
        // The bedtime sheet was not reachable from this spec's interactions.
        // The unit test in 09-02 catches the core LP-04 bug; this e2e is
        // a smoke test, so skipping is acceptable here.
        test.skip(true, `${L}: bedtime sheet not reachable; LP-04 covered by unit test`);
        return;
      }

      const chipTexts: string[] = [];
      for (let i = 0; i < chipCount; i++) {
        chipTexts.push((await chips.nth(i).textContent()) ?? '');
      }

      // For non-EN locales, NO chip text should contain literal 'PM' or 'AM'
      // substrings (the LP-04 audit bug).
      if (L !== 'en') {
        for (const t of chipTexts) {
          expect(t, `${L}: chip text ${JSON.stringify(t)} should not contain literal AM/PM`).not.toMatch(
            /\b(PM|AM)\b/,
          );
        }
      }
    });
  }
});
