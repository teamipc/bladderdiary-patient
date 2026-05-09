import { defineConfig } from '@playwright/test';

/**
 * Daily walkthrough config — drives the same e2e spec across all 6 locales
 * against the production deployment at https://myflowcheck.com.
 *
 * One Playwright "project" per locale. Each project sets `LOCALE` in env so
 * the spec knows which subtree of `messages/<locale>.json` to use for
 * text-based selectors (button labels vary per locale).
 *
 * Mobile viewport (iPhone 14) because the typical patient is on a phone.
 *
 * Run via:   npm run e2e:walkthrough        (headless, all locales)
 *            npm run e2e:walkthrough:headed (watch it run, en only)
 */

const BASE_URL = process.env.WALKTHROUGH_BASE_URL ?? 'https://myflowcheck.com';
const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;

const isHeaded = !!process.env.HEADED;

export default defineConfig({
  testDir: './e2e',
  // All three specs: cross-locale walkthrough + en-only deep flow + a11y scan.
  testMatch: /(walkthrough|deep-flow|a11y)\.spec\.ts/,

  // Per-test (= per-locale) timeout. Each phase has its own short timeouts
  // (5-12s); 120s per locale is comfortably above their sum.
  timeout: 120_000,
  expect: { timeout: 8_000 },

  // Don't fail-fast — we WANT every locale to run so the report is complete.
  fullyParallel: false,
  retries: 0,
  workers: 1,

  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/walkthrough/results.json' }],
  ],

  outputDir: 'test-results/walkthrough/artifacts',

  use: {
    baseURL: BASE_URL,
    headless: !isHeaded,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    // Mobile UA so the app's PWA / share-API paths behave like a real phone.
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    // Decline notification permissions — the routine spec requires this.
    permissions: [],
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // PDF download support
    acceptDownloads: true,
  },

  projects: [
    // One project per locale — drives walkthrough.spec.ts.
    ...(isHeaded ? ['en'] : LOCALES).map((locale) => ({
      name: locale,
      testMatch: /walkthrough\.spec\.ts/,
      use: {
        browserName: 'chromium' as const,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        acceptDownloads: true,
      },
      metadata: { locale },
    })),
    // Deep medical-grade flow — en only, real-form 3-day simulation +
    // persistence + edit + summary metrics + PDF/CSV content checks.
    {
      name: 'deep-flow',
      testMatch: /deep-flow\.spec\.ts/,
      use: {
        browserName: 'chromium' as const,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        acceptDownloads: true,
      },
    },
    // Accessibility scan — axe-core on homepage + summary across all 6 locales.
    {
      name: 'a11y',
      testMatch: /a11y\.spec\.ts/,
      use: {
        browserName: 'chromium' as const,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        acceptDownloads: true,
      },
    },
  ],
});
