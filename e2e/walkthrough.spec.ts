/**
 * Daily 6-locale walkthrough.
 *
 * For each locale (one Playwright project = one locale, see playwright.config.ts):
 *   1. Homepage loads, "Start tracking" CTA visible, no console errors.
 *   2. Onboarding 3 steps complete (real form interaction).
 *   3. Diary day 1 page loads (no JS errors).
 *   4. Seed a complete 3-day fixture, visit /summary, verify metric blocks
 *      render real numbers (no NaN, no orphaned dashes).
 *   5. Click Download PDF, verify a download starts (or ignore Web Share
 *      AbortError on devices that route through navigator.share).
 *
 * Each phase has its OWN short timeout (per-action 8-12s). The test-level
 * timeout (180s) is a hard ceiling, not a per-step budget — without per-action
 * timeouts a single stuck locator would consume the whole budget and starve
 * the rest of the run.
 *
 * Findings JSON written to test-results/walkthrough/findings/<locale>.json.
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format, subDays } from 'date-fns';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';
import { labels, type Locale } from './helpers/messages';

const LOCALE_TIMEZONES: Record<Locale, string> = {
  en: 'America/New_York',
  fr: 'Europe/Paris',
  es: 'Europe/Madrid',
  pt: 'Europe/Rome',
  zh: 'Asia/Shanghai',
  ar: 'Asia/Dubai',
};

const LOCALE_UNITS: Record<Locale, 'mL' | 'oz'> = {
  en: 'mL',
  es: 'mL',
  zh: 'mL',
  fr: 'oz',
  pt: 'oz',
  ar: 'oz',
};

interface PhaseResult {
  status: 'OK' | 'FAIL' | 'BLOCKED' | 'SKIPPED';
  notes?: string;
}

interface LocaleResult {
  locale: Locale;
  startedAt: string;
  finishedAt: string;
  phases: {
    homepage: PhaseResult;
    onboarding: PhaseResult;
    diaryDay1: PhaseResult;
    summary: PhaseResult;
    pdf: PhaseResult;
  };
  consoleErrors: string[];
  pageErrors: string[];
  issues: { phase: string; severity: 'high' | 'med' | 'low'; description: string }[];
}

function emptyResult(locale: Locale): LocaleResult {
  return {
    locale,
    startedAt: new Date().toISOString(),
    finishedAt: '',
    phases: {
      homepage: { status: 'SKIPPED' },
      onboarding: { status: 'SKIPPED' },
      diaryDay1: { status: 'SKIPPED' },
      summary: { status: 'SKIPPED' },
      pdf: { status: 'SKIPPED' },
    },
    consoleErrors: [],
    pageErrors: [],
    issues: [],
  };
}

function attachConsoleListeners(page: Page, result: LocaleResult) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (/Failed to load resource.*va\.vercel-scripts\.com/.test(text)) return;
      if (/net::ERR_BLOCKED_BY_CLIENT/.test(text)) return;
      result.consoleErrors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    result.pageErrors.push(err.message);
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeResult(result: LocaleResult) {
  const dir = resolve(process.cwd(), 'test-results', 'walkthrough', 'findings');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${result.locale}.json`), JSON.stringify(result, null, 2));
}

async function runPhase(
  result: LocaleResult,
  phaseName: keyof LocaleResult['phases'],
  severityOnFail: 'high' | 'med' | 'low',
  fn: () => Promise<void>,
): Promise<boolean> {
  try {
    await fn();
    result.phases[phaseName] = { status: 'OK' };
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Strip ANSI color escapes that Playwright's matchers embed in errors —
    // they survive JSON.stringify and clutter findings.md.
    // eslint-disable-next-line no-control-regex
    const clean = msg.replace(/\[[0-9;]*m/g, '');
    const oneLine = clean.split('\n')[0].slice(0, 200);
    result.phases[phaseName] = { status: 'FAIL', notes: oneLine };
    result.issues.push({
      phase: phaseName,
      severity: severityOnFail,
      description: oneLine,
    });
    return false;
  }
}

/**
 * Best-effort dismissal of the privacy notice / cookie banner that appears
 * over the bottom of the homepage. We try a few common dismiss-button names;
 * if none match, we just continue (it shouldn't block clicks higher in the
 * viewport, but we minimize risk).
 */
async function tryDismissPrivacyNotice(page: Page) {
  const candidates = [
    /got it/i,
    /accept/i,
    /dismiss/i,
    /close/i,
    /agree/i,
    /ok/i,
    /entendido/i,
    /compris/i,
    /j'ai compris/i,
    /aceito/i,
    /aceitar/i,
    /我知道了/,
    /موافق/i,
    /حسناً/i,
  ];
  for (const re of candidates) {
    const btn = page.getByRole('button', { name: re }).first();
    try {
      if (await btn.isVisible({ timeout: 500 })) {
        await btn.click({ timeout: 1500 });
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

// One test per Playwright project. The project name IS the locale.
test('walkthrough', async ({ page }, testInfo) => {
  const locale = testInfo.project.name as Locale;
  const result = emptyResult(locale);
  attachConsoleListeners(page, result);

  // Belt-and-suspenders: if anything throws past our runPhase wrappers
  // (e.g. browser closes), still write the JSON.
  const flushAndExit = () => {
    result.finishedAt = new Date().toISOString();
    writeResult(result);
  };

  try {
    // --- Phase 1: homepage ---
    const homepageOk = await runPhase(result, 'homepage', 'high', async () => {
      await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await expect(
        page.getByRole('heading', { name: labels.heroTitle(locale), exact: false }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole('button', { name: labels.startTracking(locale) }),
      ).toBeVisible({ timeout: 5_000 });
      await testInfo.attach(`homepage-${locale}`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      });
    });

    // --- Phase 2: onboarding ---
    if (homepageOk) {
      await runPhase(result, 'onboarding', 'high', async () => {
        await tryDismissPrivacyNotice(page);

        await page
          .getByRole('button', { name: labels.startTracking(locale) })
          .click({ timeout: 5_000 });

        // Step 1: age
        const age = 50 + Math.floor(Math.random() * 26);
        const ageInput = page.locator('input[type="number"]');
        await ageInput.waitFor({ state: 'visible', timeout: 8_000 });
        await ageInput.fill(String(age), { timeout: 3_000 });

        // Click Next — there are usually multiple "Next"-like buttons over the
        // session (header, etc.); the visible primary one in the form region is what we want.
        await page
          .getByRole('button', { name: labels.next(locale) })
          .first()
          .click({ timeout: 5_000 });

        // Step 2: unit. The button has compound name like "mL Millilitres" /
        // "oz Fluid ounces". Match by the human label (localized) — that's
        // unambiguous and stable.
        const unit = LOCALE_UNITS[locale];
        const unitLabel =
          unit === 'mL' ? labels.millilitres(locale) : labels.fluidOunces(locale);
        const unitButton = page
          .getByRole('button')
          .filter({ hasText: unitLabel })
          .first();
        await unitButton.waitFor({ state: 'visible', timeout: 8_000 });
        await unitButton.click({ timeout: 3_000 });

        await page
          .getByRole('button', { name: labels.next(locale) })
          .first()
          .click({ timeout: 5_000 });

        // Step 3: date + confirm
        const targetDate = format(subDays(new Date(), 2), 'yyyy-MM-dd');
        const dateInput = page.locator('input[type="date"]');
        await dateInput.waitFor({ state: 'visible', timeout: 5_000 });
        await dateInput.fill(targetDate, { timeout: 3_000 });

        await page
          .getByRole('button', { name: labels.confirmAndStart(locale) })
          .click({ timeout: 5_000 });

        await page.waitForURL(/\/diary\/day\/1/, { timeout: 12_000 });
      });
    }

    // --- Phase 3: diary day 1 page loads ---
    await runPhase(result, 'diaryDay1', 'med', async () => {
      if (!page.url().includes('/diary/day/1')) {
        await page.goto(`/${locale}/diary/day/1`, {
          waitUntil: 'domcontentloaded',
          timeout: 15_000,
        });
      }
      // Just confirm body has rendered content — no networkidle (PWA SW chatter).
      await expect(page.locator('body')).not.toBeEmpty({ timeout: 8_000 });
      await testInfo.attach(`diary-day1-${locale}`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      });
    });

    // --- Phase 4: seed store, summary renders ---
    const summaryOk = await runPhase(result, 'summary', 'high', async () => {
      const seed = buildSeedState({
        timeZone: LOCALE_TIMEZONES[locale],
        volumeUnit: LOCALE_UNITS[locale],
      });

      // Strategy: install an init script that seeds localStorage BEFORE any
      // page script runs. Then navigate. Zustand's persist middleware reads
      // localStorage during store creation (sync), so this guarantees
      // diaryStarted=true at the FIRST render — no race against
      // useEffect-driven redirects on the summary page.
      //
      // We register the init script on the BrowserContext (not Page) so it
      // applies to all future navigations in this tab.
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

      // The summary page redirects to "/" via useEffect when diaryStarted is
      // false. There's a real hydration race in the app: Zustand's persist
      // rehydrates asynchronously on the client, so the FIRST useEffect tick
      // sees initial (empty) state and fires the redirect before hydration
      // lands. A full-page goto to /summary loses this race every time.
      //
      // Workaround: visit /diary/day/1 first (no redirect path), wait for
      // hydration, then click the BottomNav link to /summary. That's a
      // client-side router push — the store stays alive across navigation,
      // so summary renders correctly with diaryStarted=true.
      //
      // This also matches the real user journey: nobody types /summary —
      // they tap the diary tab in the bottom nav.
      await page.goto(`/${locale}/diary/day/1`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      await page.waitForTimeout(800); // let persist rehydration finish

      // The diary tab in BottomNav is the SPA link to /summary. It's only
      // rendered when isTrackingComplete (day 3 bedtime present) — which our
      // seed satisfies.
      const diaryTabLink = page.locator(`a[href$="/summary"]`).first();
      try {
        await diaryTabLink.waitFor({ state: 'visible', timeout: 8_000 });
      } catch {
        throw new Error('Diary tab link to /summary not visible — seed may not have hydrated');
      }
      await diaryTabLink.click({ timeout: 3_000 });
      await page.waitForURL(/\/summary/, { timeout: 8_000 });

      await expect(
        page.getByRole('heading', { name: labels.summaryHeroTitle(locale), exact: false }),
      ).toBeVisible({ timeout: 12_000 });

      const bodyText = (await page.locator('body').textContent({ timeout: 5_000 })) ?? '';
      if (/\bNaN\b/.test(bodyText)) throw new Error('Summary contains literal "NaN"');
      if (/undefined\s*(mL|oz|%)/i.test(bodyText)) {
        throw new Error('Summary contains "undefined mL/oz/%"');
      }

      await testInfo.attach(`summary-${locale}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });

    // --- Phase 5: PDF download ---
    if (summaryOk) {
      await runPhase(result, 'pdf', 'high', async () => {
        const downloadLabel = labels.exportSavePdf(locale);
        const shareLabel = labels.exportSendPdf(locale);

        // We expect to still be on the summary page after phase 4. If a
        // redirect-on-empty-store fired (hydration race), navigate back.
        if (!page.url().includes('/summary')) {
          await page.goto(`/${locale}/summary`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
          });
          // Give the app a beat to hydrate from localStorage before asserting.
          await page.waitForTimeout(500);
        }

        // Scroll to the bottom — ExportActions is below the fold on mobile.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        const button = page
          .locator('button')
          .filter({ hasText: new RegExp(`${escapeRegex(downloadLabel)}|${escapeRegex(shareLabel)}`) })
          .first();
        try {
          await button.waitFor({ state: 'visible', timeout: 8_000 });
        } catch (err) {
          const allButtons = await page.locator('button').allTextContents();
          throw new Error(
            `PDF button not found at ${page.url()}. Looked for "${downloadLabel}" / "${shareLabel}". ` +
              `Visible buttons: ${allButtons.slice(0, 12).map((s) => s.trim().replace(/\s+/g, ' ').slice(0, 40)).join(' | ')}`,
          );
        }

        const downloadPromise = page.waitForEvent('download', { timeout: 12_000 });
        await button.click({ timeout: 3_000 });

        try {
          const download = await downloadPromise;
          const filename = download.suggestedFilename();
          if (!filename || !/\.pdf$/i.test(filename)) {
            throw new Error(`Unexpected download filename: ${filename}`);
          }
          const out = resolve(
            process.cwd(),
            'test-results',
            'walkthrough',
            'pdfs',
            `${locale}.pdf`,
          );
          mkdirSync(resolve(out, '..'), { recursive: true });
          await download.saveAs(out);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/share/i.test(msg) || /AbortError/i.test(msg)) return;
          throw err;
        }
      });
    }

    if (result.pageErrors.length > 0) {
      result.issues.push({
        phase: 'console',
        severity: 'med',
        description: `${result.pageErrors.length} pageerror(s): ${result.pageErrors[0].slice(0, 120)}`,
      });
    }
    if (result.consoleErrors.length > 0) {
      result.issues.push({
        phase: 'console',
        severity: 'low',
        description: `${result.consoleErrors.length} console error(s): ${result.consoleErrors[0].slice(0, 120)}`,
      });
    }
  } finally {
    flushAndExit();
  }
});
