/**
 * Accessibility scan via axe-core, all 6 locales.
 *
 * For a medical app serving an older population (typical patient 50+), a11y
 * isn't optional. We run axe on:
 *   - The homepage (the entry point).
 *   - The summary page with seeded state (the most data-dense screen).
 *
 * Violations of impact >= "serious" become "high" findings; "moderate"
 * become "med"; "minor" become "low". This catches contrast issues, missing
 * labels, broken ARIA, RTL leaks, and color-only-info patterns — all
 * relevant to the patient population (poor eyesight, mobility limits).
 *
 * Output: test-results/walkthrough/findings/a11y.json
 */

import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

type Locale = 'en' | 'fr' | 'es' | 'pt' | 'zh' | 'ar';
const LOCALES: Locale[] = ['en', 'fr', 'es', 'pt', 'zh', 'ar'];

interface A11yViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  description: string;
  helpUrl: string;
  nodeCount: number;
}

interface A11yPageResult {
  url: string;
  violations: A11yViolation[];
  scannedAt: string;
}

interface A11yResult {
  spec: 'a11y';
  startedAt: string;
  finishedAt: string;
  byLocale: Record<Locale, { homepage: A11yPageResult | null; summary: A11yPageResult | null }>;
  issues: { phase: string; severity: 'high' | 'med' | 'low'; description: string }[];
  consoleErrors: string[];
  pageErrors: string[];
}

function emptyResult(): A11yResult {
  return {
    spec: 'a11y',
    startedAt: new Date().toISOString(),
    finishedAt: '',
    byLocale: Object.fromEntries(LOCALES.map((l) => [l, { homepage: null, summary: null }])) as A11yResult['byLocale'],
    issues: [],
    consoleErrors: [],
    pageErrors: [],
  };
}

function writeResult(result: A11yResult) {
  const dir = resolve(process.cwd(), 'test-results', 'walkthrough', 'findings');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'a11y.json'), JSON.stringify(result, null, 2));
}

function severityFromImpact(impact: A11yViolation['impact']): 'high' | 'med' | 'low' {
  if (impact === 'critical' || impact === 'serious') return 'high';
  if (impact === 'moderate') return 'med';
  return 'low';
}

test.describe.configure({ mode: 'serial' });

test('a11y', async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'a11y', 'only runs in a11y project');
  test.setTimeout(180_000);

  const result = emptyResult();

  page.on('console', (msg) => {
    if (msg.type() === 'error') result.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => result.pageErrors.push(err.message));

  // Seed once on the context so /summary is reachable in each locale.
  // The seed is locale-agnostic; the URL drives which locale the app renders.
  const seed = buildSeedState({ timeZone: 'America/New_York' });
  await page.context().addInitScript(
    ({ key, value }) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
    { key: STORE_KEY, value: seed },
  );

  try {
    for (const locale of LOCALES) {
      // ── Homepage ──
      try {
        await page.goto(`/${locale}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        await page.waitForTimeout(500);
        const homeScan = await new AxeBuilder({ page })
          // Run only WCAG 2 A/AA rules — best practice rules add noise that's
          // not actionable for a public site.
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        result.byLocale[locale].homepage = {
          url: page.url(),
          scannedAt: new Date().toISOString(),
          violations: homeScan.violations.map((v) => ({
            id: v.id,
            impact: v.impact ?? null,
            description: v.description,
            helpUrl: v.helpUrl,
            nodeCount: v.nodes.length,
          })),
        };
        for (const v of homeScan.violations) {
          result.issues.push({
            phase: `a11y/${locale}/homepage`,
            severity: severityFromImpact(v.impact ?? null),
            description: `${v.id} (${v.nodes.length}× nodes): ${v.help}`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.issues.push({
          phase: `a11y/${locale}/homepage`,
          severity: 'med',
          description: `Scan failed: ${msg.slice(0, 160)}`,
        });
      }

      // ── Summary (seeded) ──
      try {
        // Visit diary first (no redirect race) then SPA-link to summary.
        await page.goto(`/${locale}/diary/day/1`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        await page.waitForTimeout(800);
        const summaryLink = page.locator('a[href$="/summary"]').first();
        if (await summaryLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await summaryLink.click({ timeout: 3_000 });
          await page.waitForURL(/\/summary/, { timeout: 8_000 }).catch(() => {});
          await page.waitForTimeout(500);

          const summaryScan = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
          result.byLocale[locale].summary = {
            url: page.url(),
            scannedAt: new Date().toISOString(),
            violations: summaryScan.violations.map((v) => ({
              id: v.id,
              impact: v.impact ?? null,
              description: v.description,
              helpUrl: v.helpUrl,
              nodeCount: v.nodes.length,
            })),
          };
          for (const v of summaryScan.violations) {
            result.issues.push({
              phase: `a11y/${locale}/summary`,
              severity: severityFromImpact(v.impact ?? null),
              description: `${v.id} (${v.nodes.length}× nodes): ${v.help}`,
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.issues.push({
          phase: `a11y/${locale}/summary`,
          severity: 'med',
          description: `Scan failed: ${msg.slice(0, 160)}`,
        });
      }
    }
  } finally {
    result.finishedAt = new Date().toISOString();
    writeResult(result);
  }
});
