// Phase 14 Onboarding Empathy Beats verification spec.
//
// Asserts all 5 Phase 14 requirements (EM-01..05) against a LOCAL
// static-export build served at http://localhost:4173.
//
// Test counts:
//   EM-01 Welcome panel + sticky CTA:         2 tests
//   EM-02 Privacy graphic + disclosure:        3 tests
//   EM-03 Sample-export preview:               3 tests
//   EM-04 Per-step time estimates:             3 tests
//   EM-05 Step-transition micro-celebration:   3 tests
//   Prior-phase regression smoke:              1 test
//   TOTAL: 15 tests
//
// Invocation:
//   npm run build
//   npx --yes serve out -l 4173 &
//   sleep 2
//   PW_TEST_MATCH='phase14-onboarding-empathy\.spec\.ts' \
//     npx playwright test e2e/phase14-onboarding-empathy.spec.ts
//   pkill -f "serve out -l 4173" || true
//
// The PW_TEST_MATCH env var is REQUIRED. The default testMatch in
// playwright.config.ts is /(walkthrough|deep-flow|a11y)\.spec\.ts/
// which excludes this file. Per the Phase 5-07 + Phase 12-04 +
// Phase 13 precedent: --grep filters test TITLES not file paths;
// --test-match (via env var) is the supported override path for
// one-off verification specs.
//
// Discoverability self-check:
//   PW_TEST_MATCH='phase14-onboarding-empathy\.spec\.ts' \
//     npx playwright test e2e/phase14-onboarding-empathy.spec.ts --list
//
// INERT: this spec is NOT triggered as part of the daily walkthrough.
// It exists as a future verification artifact. Run on demand via the
// command above, OR as part of an explicit Phase 14 verification task.

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

const BASE_URL = process.env.PHASE14_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase14-onboarding-empathy');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// next-intl localePrefix: 'as-needed' for nav URLs. EN is at bare path; the
// 5 others are prefixed. Mirrors phase13-export-package.spec.ts:localePath.
function localePath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  return `/${locale}${path}`;
}

// ---------------------------------------------------------------------------
// Localized labels (read from messages/<locale>.json at spec authoring time)
// ---------------------------------------------------------------------------

// welcome.startCta. Sticky CTA on the WelcomePanel.
const WELCOME_CTA_LABEL: Record<Locale, string> = {
  en: 'Start tracking',
  fr: 'Commencer le suivi',
  es: 'Comenzar el seguimiento',
  pt: 'Começar o registo',
  zh: '开始记录',
  ar: 'ابدأ التتبع',
};

// welcome.privacyDisclosureLabel. Privacy disclosure summary text.
const PRIVACY_DISCLOSURE_LABEL: Record<Locale, string> = {
  en: 'How is my data protected?',
  fr: 'Comment mes données sont-elles protégées ?',
  es: '¿Cómo se protegen mis datos?',
  pt: 'Como são protegidos os meus dados?',
  zh: '我的数据是怎么受到保护的?',
  ar: 'كيف تتم حماية بياناتي؟',
};

// sampleExport.caption substring match (loose) so locale-natural register
// variations still hit. EN: "Your clinician will see something like this...".
const SAMPLE_CAPTION_TERM: Record<Locale, string> = {
  en: 'clinician will see',
  fr: 'verra',
  es: 'verá',
  pt: 'verá',
  zh: '会看到',
  ar: 'سيرى',
};

// onboarding.timeEstimate.step1 substring match.
const TIME_ESTIMATE_STEP1_TERM: Record<Locale, string> = {
  en: '~10 seconds',
  fr: '~10 secondes',
  es: '~10 segundos',
  pt: '~10 segundos',
  zh: '约 10 秒',
  ar: 'حوالي 10',
};

// onboarding.timeEstimate.step3 substring match.
const TIME_ESTIMATE_STEP3_TERM: Record<Locale, string> = {
  en: '~30 seconds',
  fr: '~30 secondes',
  es: '~30 segundos',
  pt: '~30 segundos',
  zh: '约 30 秒',
  ar: 'حوالي 30',
};

// Reference the locale tables so non-EN entries don't trip the unused-name
// lint when this spec lands but the per-locale iteration hasn't been wired
// (current spec runs EN-first; full-locale fan-out is a future expansion).
void LOCALES;
void localePath;
void SAMPLE_CAPTION_TERM;
void PRIVACY_DISCLOSURE_LABEL;

// ---------------------------------------------------------------------------
// Page-context helpers
// ---------------------------------------------------------------------------

// Clear localStorage before page JS runs so the !diaryStarted branch renders
// (WelcomePanel + PrivacyGraphic + SampleExportPreview visible on first paint).
async function clearDiary(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch {
      // sandbox may deny localStorage; ignore.
    }
  });
}

// Seed a Zustand persist envelope into localStorage so the diaryStarted branch
// renders (the "Welcome back" / resume path, NOT the WelcomePanel). Used by the
// prior-phase regression smoke. Mirrors phase13-export-package.spec.ts:seedDiary.
async function seedDiary(page: Page): Promise<void> {
  const envelope = buildSeedState();
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

// ---------------------------------------------------------------------------
// Per-spec viewport + baseURL (desktop chromium under the verification project)
// ---------------------------------------------------------------------------

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});

// ---------------------------------------------------------------------------
// EM-01 Welcome panel + sticky CTA
// ---------------------------------------------------------------------------

test.describe('EM-01 Welcome panel + sticky CTA', () => {
  test('en: WelcomePanel renders with headline + sticky CTA on first paint', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // WelcomePanel has id="welcome-heading" on its h1 (per 14-01 a11y plumbing).
    const heading = page.locator('#welcome-heading').first();
    await expect(
      heading,
      'EM-01 (owner: 14-01): WelcomePanel h1 visible',
    ).toBeVisible({ timeout: 8_000 });

    // Sticky CTA, text from welcome.startCta.
    const cta = page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first();
    await expect(
      cta,
      'EM-01 (owner: 14-01): welcome CTA button visible',
    ).toBeVisible({ timeout: 8_000 });

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'em01-welcome-en.png'),
      fullPage: true,
    });
  });

  test('en: clicking the welcome CTA mounts the OnboardingFlow wizard', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    const cta = page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first();
    await cta.click({ timeout: 3_000 });

    // OnboardingFlow step 1 = age input.
    const ageInput = page.locator('input[type="number"][inputmode="numeric"]').first();
    await expect(
      ageInput,
      'EM-01 (owner: 14-01): clicking CTA shows OnboardingFlow step 1',
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// EM-02 Privacy graphic + disclosure
// ---------------------------------------------------------------------------

test.describe('EM-02 Privacy graphic + disclosure', () => {
  test('en: PrivacyGraphic SVG has role="img" + aria-label', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    const svg = page.locator('svg[role="img"][aria-label]').first();
    await expect(
      svg,
      'EM-02 (owner: 14-01): PrivacyGraphic SVG with role+label',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: privacy disclosure summary is present and clickable', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    const summary = page
      .locator('summary')
      .filter({ hasText: 'How is my data protected' })
      .first();
    await expect(
      summary,
      'EM-02 (owner: 14-01): privacy disclosure summary visible',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: clicking the privacy disclosure summary expands the body with landing.privacyBody content', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    const summary = page
      .locator('summary')
      .filter({ hasText: 'How is my data protected' })
      .first();
    await summary.click({ timeout: 3_000 });

    // After expand, the body text (from landing.privacyBody, reused per 14-01)
    // is visible. The canonical EN value begins with "Your data never leaves...".
    await expect(
      page.locator('text=Your data never leaves your phone').first(),
      'EM-02 (owner: 14-01): disclosure body shows landing.privacyBody after expand',
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// EM-03 Sample-export preview
// ---------------------------------------------------------------------------

test.describe('EM-03 Sample-export preview', () => {
  test('en: SampleExportPreview SVG renders below the WelcomePanel', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // SampleExportPreview SVG has aria-label from sampleExport.label, which
    // begins with "Preview of the PDF report".
    const previewSvg = page.locator('svg[aria-label*="Preview"]').first();
    await expect(
      previewSvg,
      'EM-03 (owner: 14-02): SampleExportPreview SVG visible',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: SampleExportPreview caption text is visible', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // Caption: "Your clinician will see something like this when you're done."
    await expect(
      page.locator('text=clinician will see').first(),
      'EM-03 (owner: 14-02): SampleExportPreview caption visible',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: SampleExportPreview SVG contains the locale-aware "3-Day Bladder Diary" header text', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // The SVG's inline <text> renders sampleExport.docTitle = "3-Day Bladder Diary".
    await expect(
      page.locator('text=3-Day Bladder Diary').first(),
      'EM-03 (owner: 14-02): SVG header text renders sampleExport.docTitle',
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// EM-04 Per-step time estimates
// ---------------------------------------------------------------------------

test.describe('EM-04 Per-step time estimates', () => {
  test('en: step 1 of the wizard shows the ~10 seconds time estimate', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // Click the WelcomePanel CTA to enter the wizard at step 1.
    const cta = page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first();
    await cta.click({ timeout: 3_000 });

    await expect(
      page.locator(`text=${TIME_ESTIMATE_STEP1_TERM.en}`).first(),
      'EM-04 (owner: 14-02): step 1 time estimate visible',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: step 2 of the wizard shows the ~10 seconds time estimate', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // Enter wizard, advance to step 2.
    await page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first().click();
    await page.locator('input[type="number"][inputmode="numeric"]').first().fill('55');
    await page.locator('button').filter({ hasText: /Next/i }).first().click();

    await expect(
      page.locator(`text=${TIME_ESTIMATE_STEP1_TERM.en}`).first(),
      'EM-04 (owner: 14-02): step 2 time estimate visible (also ~10 seconds)',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('en: step 3 of the wizard shows the ~30 seconds time estimate', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // Enter wizard, advance to step 3.
    await page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first().click();
    await page.locator('input[type="number"][inputmode="numeric"]').first().fill('55');
    await page.locator('button').filter({ hasText: /Next/i }).first().click();
    await page.locator('button').filter({ hasText: /Next/i }).first().click();

    await expect(
      page.locator(`text=${TIME_ESTIMATE_STEP3_TERM.en}`).first(),
      'EM-04 (owner: 14-02): step 3 time estimate visible (~30 seconds)',
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ---------------------------------------------------------------------------
// EM-05 Step-transition micro-celebration
// ---------------------------------------------------------------------------

test.describe('EM-05 Step-transition micro-celebration', () => {
  test('en: active step-dot has ring halo when step 1 is current', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    await page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first().click();

    // The active step-dot has the ring-2 class applied via Tailwind. Assert
    // via computed style: box-shadow should be non-empty because Tailwind's
    // `ring-*` utility is implemented as a box-shadow.
    const activeDot = page.locator('.animate-step-pulse').first();
    await activeDot.waitFor({ state: 'attached', timeout: 8_000 });

    const activeBoxShadow = await activeDot.evaluate((el) =>
      window.getComputedStyle(el).boxShadow,
    );
    expect(
      activeBoxShadow,
      'EM-05 (owner: 14-03): active step-dot has ring (non-empty box-shadow)',
    ).not.toBe('none');
  });

  test('en: animate-step-pulse class is present on the active step-dot', async ({ page }) => {
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    await page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first().click();

    const pulsedDot = page.locator('.animate-step-pulse').first();
    await expect(
      pulsedDot,
      'EM-05 (owner: 14-03): active step-dot has animate-step-pulse class',
    ).toBeAttached({ timeout: 8_000 });
  });

  test('en: with prefers-reduced-motion: reduce, the step-pulse animation collapses to instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await clearDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    await page.locator('button').filter({ hasText: WELCOME_CTA_LABEL.en }).first().click();

    const pulsedDot = page.locator('.animate-step-pulse').first();
    await pulsedDot.waitFor({ state: 'attached', timeout: 8_000 });

    // The global prefers-reduced-motion rule sets animation-duration to 0.01ms.
    // Browser normalization may report 0.01ms as "0.01ms" or "0.0001s" or "0s".
    const animationDuration = await pulsedDot.evaluate((el) =>
      window.getComputedStyle(el).animationDuration,
    );
    const collapsed =
      animationDuration === '0.01ms' ||
      animationDuration === '0s' ||
      animationDuration === '0.0001s';
    expect(
      collapsed,
      `EM-05 (owner: 14-03): reduced-motion collapses pulse animation-duration (got: ${animationDuration})`,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Prior-phase regression smoke
// ---------------------------------------------------------------------------

test.describe('Prior-phase regression smoke', () => {
  test('Phase 7: seeded diary still bypasses the empathy beats and shows Welcome Back', async ({ page }) => {
    // With a seeded diary envelope, LandingContent renders the "Welcome back"
    // / resume path, NOT the WelcomePanel.
    await seedDiary(page);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    await expect(
      page.locator('text=Welcome back').first(),
      'Phase 7 regression: seeded diary shows Welcome Back, not WelcomePanel',
    ).toBeVisible({ timeout: 8_000 });

    // WelcomePanel's h1 (id="welcome-heading") MUST NOT be present.
    const welcomeHeading = page.locator('#welcome-heading');
    await expect(
      welcomeHeading,
      'Phase 7 regression: WelcomePanel h1 NOT rendered when diaryStarted',
    ).toHaveCount(0);
  });
});
