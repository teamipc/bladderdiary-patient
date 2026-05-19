// Phase 12 SEO verification spec (Medical-Grade Closure milestone, M3).
//
// Asserts the three Phase 12 success criteria from ROADMAP §"Phase 12":
//   1. SEO-M3-01 BreadcrumbList JSON-LD: consistent locale-prefixed URLs + Title-Case position-3 names
//   2. SEO-M3-02 Bare-root indexability: out/index.html is substantive HTML, byte-identical to out/en.html
//   3. SEO-M3-03 Audience landing intros: >= 600 words (en/fr/es/pt/ar) or >= 1000 chars (zh)
//
// Plus a smoke regression block (D-08 in 12-04-PLAN) that confirms prior-phase
// SEO invariants (hreflang map on bare-root, MedicalWebPage JSON-LD on articles,
// canonical link on audience landings) were not unwound by Phase 12.
//
// Runs against LOCAL static-export build (out/) served at http://localhost:4173.
// NOT against production (which doesn't have Phase 12 deployed yet).
//
// Invocation:
//   npm run build
//   npx --yes serve out -l 4173 &
//   PW_TEST_MATCH='phase12-seo\.spec\.ts' npx playwright test e2e/phase12-seo.spec.ts
//
// The PW_TEST_MATCH env var is REQUIRED to override playwright.config.ts's
// testMatch regex (which excludes this file). Per Phase 5-07 lesson:
// --grep / --grep-invert filter test TITLES not file paths.
//
// Discoverability self-check:
//   PW_TEST_MATCH='phase12-seo\.spec\.ts' npx playwright test e2e/phase12-seo.spec.ts --list

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

const BASE_URL = process.env.PHASE12_BASE_URL ?? 'http://localhost:4173';
// Used only for asserting the absolute URL form in JSON-LD `item` fields; the
// BreadcrumbList implementation emits absolute production-domain URLs regardless
// of the served origin (per 12-01 D-02). Local serve at port 4173 is the
// transport; the asserted URL in the JSON-LD must still be the production URL.
const SITE_URL_PROD = 'https://myflowcheck.com';
const SCREENSHOT_DIR = resolve('test-results/phase12-seo');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const OUT_DIR = resolve(process.cwd(), 'out');
const BARE_ROOT_MIN_BYTES = 50_000;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

// next-intl localePrefix: 'as-needed' — English is at bare paths at the page-nav
// layer (used for page.goto navigation). For en, returns the input path; for
// other locales returns the prefixed path.
function localePath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  return `/${locale}${path}`;
}

// Always-prefixed path — used for JSON-LD `item` URL assertions. The
// BreadcrumbList implementation in 12-01 emits `/${locale}${path}` for ALL 4
// positions (including en) to keep the canonical contract consistent across
// positions. Page-navigation URLs (next-intl) strip the en prefix; JSON-LD
// URLs do NOT — that's the medical-grade SEO invariant SEO-M3-01 locks.
function alwaysLocalizedPath(locale: Locale, path: string): string {
  return `/${locale}${path}`;
}

// ---------------------------------------------------------------------------
// JSON-LD helpers
// ---------------------------------------------------------------------------

async function getJsonLdScripts(page: Page): Promise<unknown[]> {
  return page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    return scripts.map((s) => {
      try {
        return JSON.parse(s.textContent ?? '{}') as unknown;
      } catch {
        return null;
      }
    });
  });
}

interface BreadcrumbItem {
  position: number;
  name: string;
  item: string;
}

interface BreadcrumbList {
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbItem[];
}

function findBreadcrumbList(scripts: unknown[]): BreadcrumbList | null {
  for (const s of scripts) {
    if (typeof s !== 'object' || s === null) continue;
    const typeField = (s as { '@type'?: unknown })['@type'];
    if (typeField === 'BreadcrumbList') {
      return s as BreadcrumbList;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Content-folder helpers
// ---------------------------------------------------------------------------

// Reads `content/articles/<locale>/<topic>/_pillar.mdx` from disk and extracts
// the `title:` frontmatter via regex. Returns null if the file does not exist
// or the title cannot be parsed (caller falls back to the Title-Case slug
// expansion per 12-01 D-02).
function getPillarTitle(locale: Locale, topic: string): string | null {
  try {
    const filePath = resolve(
      process.cwd(),
      'content',
      'articles',
      locale,
      topic,
      '_pillar.mdx',
    );
    const content = readFileSync(filePath, 'utf8');
    // Match a YAML frontmatter line `title: "<value>"` or `title: '<value>'`.
    const m = content.match(/^title:\s*["'](.+?)["']\s*$/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// At module load, inspects `content/articles/en/voiding/` and returns the first
// non-`_pillar.mdx` filename without extension. Falls back to a known-good
// default if the directory inspection fails.
function pickVoidingClusterSlug(): string {
  const fallback = 'feeling-bladder-is-not-empty';
  try {
    const dirPath = resolve(process.cwd(), 'content', 'articles', 'en', 'voiding');
    const entries = readdirSync(dirPath);
    const clusterFiles = entries.filter(
      (f) => f.endsWith('.mdx') && f !== '_pillar.mdx',
    );
    if (clusterFiles.length === 0) return fallback;
    return clusterFiles[0].replace(/\.mdx$/, '');
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const VOIDING_CLUSTER_SLUG = pickVoidingClusterSlug();

const SAMPLE_ARTICLES: ReadonlyArray<{ topic: string; slug: string }> = [
  { topic: 'nocturia', slug: 'waking-up-to-pee-at-night' },
  { topic: 'bladder-irritants', slug: 'foods-that-irritate-the-bladder' },
  { topic: 'voiding', slug: VOIDING_CLUSTER_SLUG },
];

const AUDIENCE_PATHS = ['/learn/for-men', '/learn/for-women'] as const;

// ---------------------------------------------------------------------------
// Per-spec viewport + baseURL (desktop for stable intro screenshots)
// ---------------------------------------------------------------------------

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});

// ---------------------------------------------------------------------------
// SEO-M3-01 — BreadcrumbList JSON-LD shape
// ---------------------------------------------------------------------------

test.describe('SEO-M3-01 BreadcrumbList JSON-LD shape', () => {
  for (const locale of LOCALES) {
    for (const { topic, slug } of SAMPLE_ARTICLES) {
      test(`${locale} x ${topic}/${slug}: BreadcrumbList has 4 locale-prefixed URLs and Title-Case position-3 name`, async ({
        page,
      }) => {
        const articlePath = localePath(locale, `/learn/${topic}/${slug}`);
        const articleUrl = `${BASE_URL}${articlePath}`;

        // Some locales may lag on a specific article — skip rather than fail
        // if the article is not present in this locale.
        const response = await page.goto(articleUrl, { waitUntil: 'domcontentloaded' });
        if (!response || response.status() !== 200) {
          test.skip(
            true,
            `Article not present at ${articlePath} (status ${response?.status() ?? 'no response'})`,
          );
          return;
        }

        const scripts = await getJsonLdScripts(page);
        const bcl = findBreadcrumbList(scripts);
        expect(bcl, `BreadcrumbList JSON-LD not found on ${articlePath}`).not.toBeNull();
        if (!bcl) return;

        const items = bcl.itemListElement;
        expect(items, `BreadcrumbList itemListElement length on ${articlePath}`).toHaveLength(4);

        // Position 1 (Home): /<locale> — JSON-LD always prefixes (even for en),
        // unlike page-nav URLs.
        expect(items[0].item, `position 1 URL on ${articlePath}`).toBe(
          `${SITE_URL_PROD}${alwaysLocalizedPath(locale, '')}`,
        );
        // Position 2 (Learn): /<locale>/learn
        expect(items[1].item, `position 2 URL on ${articlePath}`).toBe(
          `${SITE_URL_PROD}${alwaysLocalizedPath(locale, '/learn')}`,
        );
        // Position 3 (Topic): /<locale>/learn/<topic>
        expect(items[2].item, `position 3 URL on ${articlePath}`).toBe(
          `${SITE_URL_PROD}${alwaysLocalizedPath(locale, `/learn/${topic}`)}`,
        );
        // Position 4 (Article): full localized article URL.
        expect(items[3].item, `position 4 URL on ${articlePath}`).toBe(
          `${SITE_URL_PROD}${articlePath}`,
        );

        // None of the URLs should be the previous bare-path forms that 404'd
        // live (the SEO-REVIEW §T-2 regression case).
        for (let i = 0; i < items.length; i++) {
          expect(
            items[i].item,
            `position ${i + 1} URL must not be bare-root on ${articlePath}`,
          ).not.toBe(`${SITE_URL_PROD}/`);
          expect(
            items[i].item,
            `position ${i + 1} URL must not be bare /learn on ${articlePath}`,
          ).not.toBe(`${SITE_URL_PROD}/learn`);
          expect(
            items[i].item,
            `position ${i + 1} URL must not be bare /learn/${topic} on ${articlePath}`,
          ).not.toBe(`${SITE_URL_PROD}/learn/${topic}`);
        }

        // Position 3 name must be the localized pillar title (NOT the lowercase
        // slug). If a pillar file is present for this locale, assert the exact
        // localized title; otherwise assert the Title-Case slug expansion that
        // 12-01 D-02 mandates as the fallback.
        const expectedPillarTitle = getPillarTitle(locale, topic);
        if (expectedPillarTitle) {
          expect(items[2].name, `position 3 name on ${articlePath}`).toBe(
            expectedPillarTitle,
          );
        } else {
          const expectedFallback = topic
            .split('-')
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ');
          expect(
            items[2].name,
            `position 3 name (fallback) on ${articlePath}`,
          ).toBe(expectedFallback);
        }
        // Always: position 3 name is NOT the lowercase slug — neither as-is
        // nor with hyphens swapped for spaces.
        expect(
          items[2].name,
          `position 3 name must not be lowercase slug on ${articlePath}`,
        ).not.toBe(topic);
        expect(
          items[2].name,
          `position 3 name must not be dash-replaced-lowercase on ${articlePath}`,
        ).not.toBe(topic.replace(/-/g, ' '));
      });
    }
  }
});

// ---------------------------------------------------------------------------
// SEO-M3-02 — Bare-root indexability
// ---------------------------------------------------------------------------

test.describe('SEO-M3-02 Bare-root indexability', () => {
  test('out/index.html is at least 50KB on disk', () => {
    const stat = statSync(resolve(OUT_DIR, 'index.html'));
    expect(
      stat.size,
      'out/index.html size after post-build copy',
    ).toBeGreaterThanOrEqual(BARE_ROOT_MIN_BYTES);
  });

  test('out/index.html is byte-identical to out/en.html', () => {
    const enHtml = readFileSync(resolve(OUT_DIR, 'en.html'));
    const indexHtml = readFileSync(resolve(OUT_DIR, 'index.html'));
    expect(
      indexHtml.equals(enHtml),
      'out/index.html and out/en.html must be byte-identical (post-build copy contract from 12-02)',
    ).toBe(true);
  });

  test('HTTP fetch of / returns substantive HTML with title and canonical to /en', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title, 'bare-root <title>').toContain('My Flow Check');
    const html = await page.content();
    expect(
      html,
      'bare-root canonical link must point to https://myflowcheck.com/en',
    ).toMatch(
      /<link[^>]+rel="canonical"[^>]+href="https:\/\/myflowcheck\.com\/en\/?"/,
    );
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, 'bare-root.png'),
      fullPage: false,
    });
  });
});

// ---------------------------------------------------------------------------
// SEO-M3-03 — Audience landing intros
// ---------------------------------------------------------------------------

test.describe('SEO-M3-03 Audience landing intros', () => {
  for (const locale of LOCALES) {
    for (const pagePath of AUDIENCE_PATHS) {
      test(`${locale} x ${pagePath}: intro meets word or character floor`, async ({
        page,
      }) => {
        const url = `${BASE_URL}${localePath(locale, pagePath)}`;
        const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
        expect(response?.status(), `audience landing ${url} status`).toBe(200);

        // The intro <p> is the paragraph at line 85 of for-men/page.tsx and
        // for-women/page.tsx. Selector `p.leading-relaxed.mb-8` is unique to
        // the intro: the <p> inside <header> has leading-relaxed but NOT mb-8;
        // the CTA section <p> has leading-relaxed but is inside a <section>
        // wrapper and uses different margin classes.
        const intro = page.locator('p.leading-relaxed.mb-8').first();
        await expect(intro, `intro <p> presence at ${url}`).toBeVisible();
        const text = (await intro.textContent()) ?? '';

        if (locale === 'zh') {
          const chars = [...text.replace(/\s/g, '')].length;
          expect(
            chars,
            `ZH intro character count at ${url}`,
          ).toBeGreaterThanOrEqual(1000);
        } else {
          const words = text.split(/\s+/).filter(Boolean).length;
          expect(
            words,
            `${locale} intro word count at ${url}`,
          ).toBeGreaterThanOrEqual(600);
        }

        await page.screenshot({
          path: resolve(
            SCREENSHOT_DIR,
            `audience-${locale}-${pagePath.replace(/\//g, '_')}.png`,
          ),
          fullPage: true,
        });
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Prior-phase SEO regression smoke (D-08)
// ---------------------------------------------------------------------------

test.describe('Prior-phase SEO regression smoke', () => {
  test('hreflang map present on bare-root', async ({ page }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    for (const L of LOCALES) {
      // Match either `hreflang` or `hrefLang` (React serializes the prop both
      // ways depending on the path) and either single or double quotes.
      // Chinese uses `zh-Hans` in the hreflang map (per src/i18n/seo.ts).
      const re = new RegExp(
        `href[lL]ang=["']${L === 'zh' ? 'zh-Hans' : L}["']`,
      );
      expect(html, `hreflang for ${L} on bare-root`).toMatch(re);
    }
    expect(html, 'hreflang x-default on bare-root').toMatch(
      /href[lL]ang=["']x-default["']/,
    );
  });

  test('MedicalWebPage JSON-LD still emitted on a sample article (12-01 did not break ArticleJsonLd)', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}${localePath('en', '/learn/nocturia/waking-up-to-pee-at-night')}`,
      { waitUntil: 'domcontentloaded' },
    );
    const scripts = await getJsonLdScripts(page);
    const hasMedical = scripts.some((s) => {
      if (typeof s !== 'object' || s === null) return false;
      const t = (s as { '@type'?: unknown })['@type'];
      if (Array.isArray(t)) return t.includes('MedicalWebPage');
      return t === 'MedicalWebPage';
    });
    expect(
      hasMedical,
      'MedicalWebPage JSON-LD present on sample article',
    ).toBe(true);
  });

  test('Canonical link present on audience landing (12-03 did not break metadata)', async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}${localePath('en', '/learn/for-men')}`,
      { waitUntil: 'domcontentloaded' },
    );
    const html = await page.content();
    expect(
      html,
      'canonical link on /en/learn/for-men',
    ).toMatch(
      /<link[^>]+rel="canonical"[^>]+href="https:\/\/myflowcheck\.com\/en\/learn\/for-men"/,
    );
  });
});
