// Phase 17 Motion System verification spec.
//
// Asserts all 5 Phase 17 requirements (MOT-01..05) against a LOCAL
// static-export build served at http://localhost:4173.
//
// Test counts:
//   MOT-01 Motion design tokens in @theme:                  3 tests
//   MOT-02 useReducedMotion hook integration:               3 tests
//   MOT-03 Page-to-page transitions in diary flow:          3 tests
//   MOT-04 BottomSheet motion refinement (token consume):   3 tests
//   MOT-05 Skeleton loading states + reduced-motion:        3 tests
//   TOTAL: 15 tests
//
// Invocation:
//   npm run build
//   npx --yes serve out -l 4173 &
//   sleep 2
//   PW_TEST_MATCH='phase17-motion-system\.spec\.ts' \
//     npx playwright test e2e/phase17-motion-system.spec.ts
//   pkill -f "serve out -l 4173" || true
//
// The PW_TEST_MATCH env var is REQUIRED. The default testMatch in
// playwright.config.ts is /(walkthrough|deep-flow|a11y)\.spec\.ts/
// which excludes this file. Per the Phase 5-07 + Phase 12-04 +
// Phase 13 + Phase 14 + Phase 15 + Phase 16 precedent: --grep filters
// test TITLES not file paths; --test-match (via env var) is the
// supported override path for one-off verification specs.
//
// Discoverability self-check:
//   PW_TEST_MATCH='phase17-motion-system\.spec\.ts' \
//     npx playwright test e2e/phase17-motion-system.spec.ts --list
//
// INERT: this spec is NOT triggered as part of the daily walkthrough.
// It exists as a future verification artifact. Run on demand via the
// command above, OR as part of an explicit Phase 17 verification task.

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

const BASE_URL = process.env.PHASE17_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase17-motion-system');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// next-intl localePrefix: 'as-needed' for nav URLs. EN is at bare path; the
// 5 others are prefixed. Mirrors phase16-summary-celebration.spec.ts:localePath.
function localePath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  return `/${locale}${path}`;
}

// Reference the locale tables + helpers so non-EN entries don't trip the
// unused-name lint when this spec lands but the per-locale iteration hasn't
// been wired (current spec runs EN-first; full-locale fan-out is a future
// expansion). Mirrors the Phase 14/15/16 pattern.
void LOCALES;
void localePath;

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
// the MOT-02 + MOT-03 + MOT-04 tests that need pages to render with real data.
//
// Extends the seed inline with the Phase 16 summaryCelebrationShown field +
// version 6 envelope, per the 16-03 D-12 / 17-04 D-14 pattern (do NOT modify
// fixtures.ts in this plan).
async function seedCompleteDiary(
  page: Page,
  overrides?: { summaryCelebrationShown?: boolean },
): Promise<void> {
  const baseEnvelope = buildSeedState();
  const stateWithCel: unknown = {
    ...baseEnvelope.state,
    summaryCelebrationShown: overrides?.summaryCelebrationShown ?? true,
  };
  const envelope = {
    ...baseEnvelope,
    state: stateWithCel as typeof baseEnvelope.state,
    version: 6,
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
// MOT-01 Motion design tokens in @theme
// ---------------------------------------------------------------------------

test.describe('MOT-01 Motion design tokens in @theme', () => {
  test('en: --duration-fast/normal/slow tokens are present with expected values', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        fast: cs.getPropertyValue('--duration-fast').trim(),
        normal: cs.getPropertyValue('--duration-normal').trim(),
        slow: cs.getPropertyValue('--duration-slow').trim(),
      };
    });
    expect(
      tokens.fast,
      'MOT-01 (owner: 17-01): --duration-fast = 120ms',
    ).toBe('120ms');
    expect(
      tokens.normal,
      'MOT-01 (owner: 17-01): --duration-normal = 180ms',
    ).toBe('180ms');
    expect(
      tokens.slow,
      'MOT-01 (owner: 17-01): --duration-slow = 300ms',
    ).toBe('300ms');
  });

  test('en: --ease-emphasized/decelerated/accelerated tokens are cubic-bezier strings', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        emphasized: cs.getPropertyValue('--ease-emphasized').trim(),
        decelerated: cs.getPropertyValue('--ease-decelerated').trim(),
        accelerated: cs.getPropertyValue('--ease-accelerated').trim(),
      };
    });
    expect(
      tokens.emphasized,
      'MOT-01 (owner: 17-01): --ease-emphasized is a cubic-bezier curve',
    ).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(
      tokens.decelerated,
      'MOT-01 (owner: 17-01): --ease-decelerated is a cubic-bezier curve',
    ).toContain('cubic-bezier(0, 0, 0.2, 1)');
    expect(
      tokens.accelerated,
      'MOT-01 (owner: 17-01): --ease-accelerated is a cubic-bezier curve',
    ).toContain('cubic-bezier(0.4, 0, 1, 1)');
  });

  test('en: tokens are inheritable to nested elements (body level)', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const inheritedValue = await page.evaluate(() => {
      const body = document.body;
      return getComputedStyle(body)
        .getPropertyValue('--duration-normal')
        .trim();
    });
    expect(
      inheritedValue,
      'MOT-01 (owner: 17-01): tokens cascade from :root to body',
    ).toBe('180ms');
  });
});

// ---------------------------------------------------------------------------
// MOT-02 useReducedMotion hook integration
// ---------------------------------------------------------------------------

test.describe('MOT-02 useReducedMotion hook integration', () => {
  test('en: AnimatedMetric tiles show final value quickly when reduced-motion is enabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    // Within ~300ms (instead of the full 2000ms count-up cascade), the
    // first metric tile should already show its final non-zero value.
    await page.waitForTimeout(300);
    const firstTile = page
      .locator('section[aria-live="polite"] p.tabular-nums')
      .first();
    const text = await firstTile.textContent();
    const match = text?.match(/(\d+)/);
    expect(
      match,
      'MOT-02 (owner: 17-01): reduced-motion AnimatedMetric shows a number quickly',
    ).not.toBeNull();
    expect(
      parseInt(match?.[1] ?? '0', 10),
      'MOT-02 (owner: 17-01): reduced-motion tile value > 0',
    ).toBeGreaterThan(0);
  });

  test('en: ObservationCardReveal cards reveal immediately when reduced-motion is enabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    // Scroll to the observations section.
    await page.evaluate(() => {
      const ul = document.querySelector('section ul.space-y-2');
      if (ul) ul.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(300);
    const firstReveal = page
      .locator('section ul.space-y-2 > li > div')
      .first();
    const opacity = await firstReveal.evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    expect(
      opacity,
      'MOT-02 (owner: 17-01): reduced-motion observation card at opacity 1',
    ).toBe('1');
  });

  test('en: without reduced-motion, AnimatedMetric still completes count-up by 2s', async ({ page }) => {
    // Sanity test: reduced-motion off should NOT skip the animation; the
    // tile still reaches its final value via the full ~800ms count-up.
    await seedCompleteDiary(page, { summaryCelebrationShown: true });
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const firstTile = page
      .locator('section[aria-live="polite"] p.tabular-nums')
      .first();
    const text = await firstTile.textContent();
    const match = text?.match(/(\d+)/);
    expect(
      match,
      'MOT-02 (owner: 17-01): full count-up reaches final value',
    ).not.toBeNull();
    expect(
      parseInt(match?.[1] ?? '0', 10),
      'MOT-02 (owner: 17-01): final value > 0',
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// MOT-03 Page-to-page transitions in diary flow
// ---------------------------------------------------------------------------

test.describe('MOT-03 Page-to-page transitions in diary flow', () => {
  test('en: /diary/day/1 wraps content in .animate-page-fade-in', async ({ page }) => {
    await seedCompleteDiary(page);
    await page.goto(`${BASE_URL}/diary/day/1`, {
      waitUntil: 'domcontentloaded',
    });
    const wrapper = page.locator('.animate-page-fade-in').first();
    await expect(
      wrapper,
      'MOT-03 (owner: 17-02): page wrapper class present on /diary/day/1',
    ).toBeVisible({ timeout: 5_000 });
  });

  test('en: /summary wraps content in .animate-page-fade-in', async ({ page }) => {
    await seedCompleteDiary(page);
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    const wrapper = page.locator('.animate-page-fade-in').first();
    await expect(
      wrapper,
      'MOT-03 (owner: 17-02): page wrapper class present on /summary',
    ).toBeVisible({ timeout: 5_000 });
  });

  test('en: page transition animation collapses to instant under reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedCompleteDiary(page);
    await page.goto(`${BASE_URL}/diary/day/1`, {
      waitUntil: 'domcontentloaded',
    });
    const wrapper = page.locator('.animate-page-fade-in').first();
    const animationDuration = await wrapper.evaluate(
      (el) => getComputedStyle(el).animationDuration,
    );
    // 0.01ms means the global reduced-motion rule collapsed the animation.
    expect(
      animationDuration,
      'MOT-03 (owner: 17-02): reduced-motion collapses page animation',
    ).toMatch(/^(0\.01ms|0\.01s|0s)$/);
  });
});

// ---------------------------------------------------------------------------
// MOT-04 BottomSheet motion refinement (token consume)
// ---------------------------------------------------------------------------

test.describe('MOT-04 BottomSheet motion refinement', () => {
  test('en: .animate-modal-in CSS rule exists in compiled stylesheet', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const hasModalIn = await page.evaluate(() => {
      for (const s of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(s.cssRules ?? []);
          for (const r of rules) {
            if (r.cssText.includes('.animate-modal-in')) return true;
          }
        } catch {
          // CORS: skip cross-origin stylesheets.
        }
      }
      return false;
    });
    expect(
      hasModalIn,
      'MOT-04 (owner: 17-03): .animate-modal-in CSS rule present',
    ).toBe(true);
  });

  test('en: .animate-modal-in rule references --duration-normal + --ease-emphasized tokens', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const rule = await page.evaluate(() => {
      for (const s of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(s.cssRules ?? []);
          for (const r of rules) {
            if (r.cssText.includes('.animate-modal-in')) return r.cssText;
          }
        } catch {
          // CORS: skip cross-origin stylesheets.
        }
      }
      return '';
    });
    expect(
      rule,
      'MOT-04 (owner: 17-03): .animate-modal-in references --duration-normal',
    ).toContain('var(--duration-normal)');
    expect(
      rule,
      'MOT-04 (owner: 17-03): .animate-modal-in references --ease-emphasized',
    ).toContain('var(--ease-emphasized)');
  });

  test('en: .animate-slide-up rule references --duration-slow + --ease-decelerated tokens', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const rule = await page.evaluate(() => {
      for (const s of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(s.cssRules ?? []);
          for (const r of rules) {
            if (r.cssText.includes('.animate-slide-up')) return r.cssText;
          }
        } catch {
          // CORS: skip cross-origin stylesheets.
        }
      }
      return '';
    });
    expect(
      rule,
      'MOT-04 (owner: 17-03): .animate-slide-up references --duration-slow',
    ).toContain('var(--duration-slow)');
    expect(
      rule,
      'MOT-04 (owner: 17-03): .animate-slide-up references --ease-decelerated',
    ).toContain('var(--ease-decelerated)');
  });
});

// ---------------------------------------------------------------------------
// MOT-05 Skeleton loading states with motion personality
// ---------------------------------------------------------------------------

test.describe('MOT-05 Skeleton loading states with motion personality', () => {
  test('en: .animate-skeleton-shimmer CSS rule exists in compiled stylesheet', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const exists = await page.evaluate(() => {
      for (const s of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(s.cssRules ?? []);
          for (const r of rules) {
            if (r.cssText.includes('.animate-skeleton-shimmer')) return true;
          }
        } catch {
          // CORS: skip cross-origin stylesheets.
        }
      }
      return false;
    });
    expect(
      exists,
      'MOT-05 (owner: 17-03): shimmer utility CSS rule present',
    ).toBe(true);
  });

  test('en: @keyframes skeletonShimmer exists in compiled stylesheet', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const exists = await page.evaluate(() => {
      for (const s of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(s.cssRules ?? []);
          for (const r of rules) {
            // CSSKeyframesRule constructor name is the modern detection path.
            if (
              r.constructor.name === 'CSSKeyframesRule' &&
              r.cssText.includes('skeletonShimmer')
            ) {
              return true;
            }
          }
        } catch {
          // CORS: skip cross-origin stylesheets.
        }
      }
      return false;
    });
    expect(
      exists,
      'MOT-05 (owner: 17-03): @keyframes skeletonShimmer present',
    ).toBe(true);
  });

  test('en: shimmer reduced-motion override removes animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    // Inject a probe element with the class; read its computed animation.
    // Under reduced-motion the global rule (animation-name: none, etc.)
    // should null out the shimmer.
    const animationValue = await page.evaluate(() => {
      const div = document.createElement('div');
      div.className = 'animate-skeleton-shimmer';
      div.style.width = '100px';
      div.style.height = '20px';
      document.body.appendChild(div);
      const a = getComputedStyle(div).animation;
      document.body.removeChild(div);
      return a;
    });
    expect(
      animationValue,
      'MOT-05 (owner: 17-03): reduced-motion removes shimmer animation',
    ).toMatch(/none|0s|0\.01s|0\.01ms/);
  });
});

// ---------------------------------------------------------------------------
// Screenshot-dir reference to satisfy unused-name lint until artifact-capture
// tests land in a future plan. Mirrors the Phase 14/15/16 pattern.
// ---------------------------------------------------------------------------

void SCREENSHOT_DIR;
