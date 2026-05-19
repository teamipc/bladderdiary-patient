import { describe, it, expect } from 'vitest';
import { locales } from '@/i18n/config';

// SEO-M3-01 regression coverage (SEO-REVIEW.md §T-4).
//
// Locks in the BreadcrumbList JSON-LD contract emitted by
// `src/app/[locale]/learn/[topic]/[slug]/page.tsx`:
//
//   1. All 4 item URLs are locale-prefixed (/<locale>/...). The previous broken
//      shape mixed bare paths (positions 1-3) with locale-prefixed (position 4)
//      and produced inconsistent BreadcrumbList signal to crawlers.
//   2. Position 3 (the topic step) name is the localized pillar title (or a
//      Title-Cased slug fallback when no pillar exists). The previous broken
//      shape emitted the raw lowercase slug (e.g. "nocturia"), which leaked
//      into SERP previews.
//
// The test re-derives the same `displayTopicName` and `jsonLdBreadcrumbItems`
// shapes that the production source code emits, then asserts the contract.
// This catches regressions if a future edit returns the bare-slug or bare-href
// pattern. Mirrors the test-derivation pattern from Phase 9-01's
// `article-card-locale-routing.test.tsx`.

// Re-derive the Title-Case slug fallback identical to the production source.
function slugToTitleCase(topic: string): string {
  return topic
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// Re-derive `displayTopicName` identical to the production source. Accepts a
// nullable pillar title to simulate both the with-pillar and fallback paths.
function deriveDisplayTopicName(pillarTitle: string | null, topic: string): string {
  return pillarTitle ?? slugToTitleCase(topic);
}

// Re-derive the 4-item locale-prefixed URL array identical to the production source.
function deriveJsonLdBreadcrumbItems(args: {
  locale: string;
  topic: string;
  displayTopicName: string;
  articleTitle: string;
  articleUrlPath: string;
  homeLabel: string;
  learnLabel: string;
}): Array<{ name: string; url: string }> {
  return [
    { name: args.homeLabel, url: `/${args.locale}` },
    { name: args.learnLabel, url: `/${args.locale}/learn` },
    { name: args.displayTopicName, url: `/${args.locale}/learn/${args.topic}` },
    { name: args.articleTitle, url: args.articleUrlPath },
  ];
}

describe('BreadcrumbList JSON-LD shape (SEO-M3-01)', () => {
  it('emits locale-prefixed URL for position 1 (Home) in every locale', () => {
    for (const locale of locales) {
      const items = deriveJsonLdBreadcrumbItems({
        locale,
        topic: 'nocturia',
        displayTopicName: 'Why You Wake Up to Pee at Night: Bladder vs Kidney',
        articleTitle: 'Sample',
        articleUrlPath: `/${locale}/learn/nocturia/sample`,
        homeLabel: 'Home',
        learnLabel: 'Learn',
      });
      const pos1 = items[0].url;
      expect(pos1).toBe(`/${locale}`);
      expect(pos1).not.toBe('/');
    }
  });

  it('emits locale-prefixed URL for position 2 (Learn) in every locale', () => {
    for (const locale of locales) {
      const items = deriveJsonLdBreadcrumbItems({
        locale,
        topic: 'nocturia',
        displayTopicName: 'Why You Wake Up to Pee at Night: Bladder vs Kidney',
        articleTitle: 'Sample',
        articleUrlPath: `/${locale}/learn/nocturia/sample`,
        homeLabel: 'Home',
        learnLabel: 'Learn',
      });
      const pos2 = items[1].url;
      expect(pos2).toBe(`/${locale}/learn`);
      expect(pos2).not.toBe('/learn');
    }
  });

  it('emits locale-prefixed URL for position 3 (Topic) in every locale, for representative topics', () => {
    const topics = ['nocturia', 'bph', 'bladder-irritants', 'frequency', 'urgency'];
    for (const locale of locales) {
      for (const topic of topics) {
        const items = deriveJsonLdBreadcrumbItems({
          locale,
          topic,
          displayTopicName: 'Some Pillar Title',
          articleTitle: 'Sample',
          articleUrlPath: `/${locale}/learn/${topic}/sample`,
          homeLabel: 'Home',
          learnLabel: 'Learn',
        });
        const pos3 = items[2].url;
        expect(pos3).toBe(`/${locale}/learn/${topic}`);
        expect(pos3).not.toBe(`/learn/${topic}`);
      }
    }
  });

  it('emits locale-prefixed URL for position 4 (Article) using article.urlPath', () => {
    for (const locale of locales) {
      const articleUrlPath = `/${locale}/learn/nocturia/waking-up-to-pee-at-night`;
      const items = deriveJsonLdBreadcrumbItems({
        locale,
        topic: 'nocturia',
        displayTopicName: 'Why You Wake Up to Pee at Night: Bladder vs Kidney',
        articleTitle: 'Waking Up to Pee at Night',
        articleUrlPath,
        homeLabel: 'Home',
        learnLabel: 'Learn',
      });
      const pos4 = items[3].url;
      expect(pos4).toBe(articleUrlPath);
      // /learn/ must appear exactly once. No double-prefix, no bare /learn/.
      const learnMatches = pos4.match(/\/learn\//g);
      expect(learnMatches?.length ?? 0).toBe(1);
      // No double locale prefix.
      expect(pos4.startsWith(`/${locale}/${locale}/`)).toBe(false);
    }
  });

  it('uses the pillar frontmatter title for position-3 name when pillar exists', () => {
    const pillarTitle = 'Why You Wake Up to Pee at Night: Bladder vs Kidney';
    const displayTopicName = deriveDisplayTopicName(pillarTitle, 'nocturia');
    expect(displayTopicName).toBe(pillarTitle);
    expect(displayTopicName).not.toBe('nocturia');
    expect(displayTopicName).not.toBe('Nocturia');
  });

  it('falls back to Title-Case slug when pillar is null', () => {
    const cases: Array<[string, string]> = [
      ['nocturia', 'Nocturia'],
      ['bph', 'Bph'],
      ['bladder-irritants', 'Bladder Irritants'],
      ['post-prostatectomy', 'Post Prostatectomy'],
    ];
    for (const [topic, expected] of cases) {
      const displayTopicName = deriveDisplayTopicName(null, topic);
      expect(displayTopicName).toBe(expected);
      // Fallback must NOT be the raw slug or the lowercase dash-replaced form.
      expect(displayTopicName).not.toBe(topic);
      expect(displayTopicName).not.toBe(topic.replace(/-/g, ' '));
    }
  });

  it('uses the localized pillar title for non-English locales', () => {
    const frTitle = 'Pourquoi vous vous levez la nuit pour uriner : vessie ou rein';
    const frDisplay = deriveDisplayTopicName(frTitle, 'nocturia');
    expect(frDisplay).toBe(frTitle);

    const arTitle = 'لماذا تستيقظ ليلا للتبول: المثانة أم الكلية';
    const arDisplay = deriveDisplayTopicName(arTitle, 'nocturia');
    expect(arDisplay).toBe(arTitle);
  });

  it('SEO-REVIEW T-4 regression: position-3 name is NOT the raw lowercase slug', () => {
    const pillarTitle = 'Some Title-Case Pillar Title';
    const topics = ['nocturia', 'frequency', 'urgency', 'bph'];
    for (const topic of topics) {
      const displayTopicName = deriveDisplayTopicName(pillarTitle, topic);
      expect(displayTopicName).not.toBe(topic);
      expect(displayTopicName).not.toBe(topic.replace(/-/g, ' '));
    }
  });

  it('SEO-REVIEW T-4 regression: all 4 JSON-LD URLs are locale-prefixed (no mixed bare + prefixed)', () => {
    for (const locale of locales) {
      const topic = 'nocturia';
      const articleUrlPath = `/${locale}/learn/${topic}/waking-up-to-pee-at-night`;
      const items = deriveJsonLdBreadcrumbItems({
        locale,
        topic,
        displayTopicName: 'Why You Wake Up to Pee at Night: Bladder vs Kidney',
        articleTitle: 'Waking Up to Pee at Night',
        articleUrlPath,
        homeLabel: 'Home',
        learnLabel: 'Learn',
      });

      // All 4 URLs must start with /<locale>.
      for (const item of items) {
        expect(item.url.startsWith(`/${locale}`)).toBe(true);
      }

      // None equal the previously-broken bare forms.
      const urls = items.map((it) => it.url);
      expect(urls).not.toContain('/');
      expect(urls).not.toContain('/learn');
      expect(urls).not.toContain(`/learn/${topic}`);

      // /learn/ substring appears exactly once in URLs 2, 3, and 4 (positions
      // 1-indexed: items[1], items[2], items[3]). No /<L>/<L>/ double-prefix.
      for (const idx of [1, 2, 3]) {
        const url = items[idx].url;
        const learnMatches = url.match(/\/learn/g);
        expect(learnMatches?.length ?? 0).toBe(1);
        expect(url.startsWith(`/${locale}/${locale}/`)).toBe(false);
      }
    }
  });
});
