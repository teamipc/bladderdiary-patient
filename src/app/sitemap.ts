import type { MetadataRoute } from 'next';
import { locales, type Locale } from '@/i18n/config';
import { HREFLANG, localizedPath } from '@/i18n/seo';
import {
  getAllArticles,
  getAllTopics,
  getAllAuthors,
} from '@/lib/content';

export const dynamic = 'force-static';

const BASE_URL = 'https://myflowcheck.com';

interface CorePage {
  path: string;
  changeFrequency: 'monthly' | 'weekly' | 'yearly';
  priority: number;
}

// Sitemap scope policy (2026-05-17, after Search Console export showed 157 URLs
// stuck in "Discovered – currently not indexed" — i.e. crawl-budget waiting list):
//
// We deliberately EXCLUDE the following from the sitemap to focus Google's
// limited crawl budget on articles + topic hubs that actually carry search
// intent and unique content. The pages still exist on the site and remain
// reachable via internal navigation; they just don't get sitemap-driven
// crawl priority:
//
//   - /learn/for-men, /learn/for-women  — audience landings (re-add if/when
//     dedicated audience-specific keyword strategy proves search demand)
//   - /learn/glossary + per-term pages   — term definitions; better to let
//     these surface via article internal links (Disclaimer + first-occurrence
//     glossary links) than burn crawl budget on standalone term pages
//   - /learn/authors/<slug>               — author bios. E-E-A-T value is
//     delivered through article-level author byline + JSON-LD Person schema;
//     the standalone author page doesn't need to rank
//
// To re-include any of these, restore the entry to corePages or restore the
// author-pages loop further down. The pages themselves carry `index, follow`
// robots — sitemap exclusion only deprioritizes crawl, not indexability.
const corePages: CorePage[] = [
  { path: '/', changeFrequency: 'monthly', priority: 1 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/help', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/learn', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/learn/articles', changeFrequency: 'weekly', priority: 0.7 },
];

function absolute(path: string): string {
  return `${BASE_URL}${path}`;
}

function buildLanguagesMap(
  path: string,
  perLocaleOverrides?: Partial<Record<Locale, string>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of locales) {
    const localePath = perLocaleOverrides?.[locale] ?? localizedPath(locale, path);
    out[HREFLANG[locale]] = absolute(localePath);
  }
  out['x-default'] = absolute(localizedPath('en', path));
  return out;
}

/**
 * Pick the most recent valid date from a list of frontmatter date strings.
 * Used so sitemap lastmod values reflect actual content modification, not
 * build time — Google deprioritizes lastmod that flips on every build with
 * no real content change.
 */
function maxDate(dates: Array<string | undefined>): Date | undefined {
  let max = 0;
  for (const d of dates) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (Number.isFinite(t) && t > max) max = t;
  }
  return max > 0 ? new Date(max) : undefined;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const buildTime = new Date();

  // Compute "site lastmod" once: the most recent article modification across
  // all locales. Used as a sensible fallback for static pages instead of
  // building-time-now (which would change every CI run with no real content
  // change).
  const allArticlesAllLocales = locales.flatMap((l) => getAllArticles(l as Locale));
  const siteLastMod =
    maxDate(
      allArticlesAllLocales.flatMap((a) => [a.frontmatter.updatedAt, a.frontmatter.publishedAt]),
    ) ?? buildTime;

  for (const page of corePages) {
    const languages = buildLanguagesMap(page.path);
    for (const locale of locales) {
      entries.push({
        url: absolute(localizedPath(locale, page.path)),
        lastModified: siteLastMod,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages },
      });
    }
  }

  for (const locale of locales) {
    const typedLocale = locale as Locale;
    const articlesInLocale = getAllArticles(typedLocale);

    for (const topic of getAllTopics(typedLocale)) {
      const path = `/learn/${topic}`;
      // Topic page lastmod = most recent article in that topic.
      const topicArticles = articlesInLocale.filter((a) => a.frontmatter.topic === topic);
      const topicLastMod =
        maxDate(
          topicArticles.flatMap((a) => [a.frontmatter.updatedAt, a.frontmatter.publishedAt]),
        ) ?? siteLastMod;
      // The pillar's hero stands in as the topic page's image for image sitemap.
      const pillar = topicArticles.find((a) => a.frontmatter.pageType === 'pillar');
      const topicImages = pillar?.frontmatter.hero ? [absolute(pillar.frontmatter.hero)] : undefined;
      entries.push({
        url: absolute(localizedPath(typedLocale, path)),
        lastModified: topicLastMod,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages: buildLanguagesMap(path) },
        images: topicImages,
      });
    }

    for (const article of articlesInLocale) {
      const fm = article.frontmatter;
      if (fm.noindex) continue;
      if (fm.pageType === 'pillar') continue;
      // Glossary terms are excluded per the sitemap scope policy above. They
      // surface organically through article internal links; standalone term
      // pages don't warrant sitemap crawl budget while articles wait in the
      // "Discovered - not indexed" queue.
      if (fm.pageType === 'glossary') continue;
      const path = `/learn/${fm.topic}/${fm.slug}`;
      const articleLastMod =
        maxDate([fm.updatedAt, fm.lastReviewedAt, fm.publishedAt]) ?? siteLastMod;
      entries.push({
        url: absolute(localizedPath(typedLocale, path)),
        lastModified: articleLastMod,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: { languages: buildLanguagesMap(path) },
        images: fm.hero ? [absolute(fm.hero)] : undefined,
      });
    }
  }

  // Author pages excluded per sitemap scope policy above. E-E-A-T value is
  // delivered through article-level author byline + Person JSON-LD already
  // embedded in each article; standalone author pages don't need sitemap
  // priority. The `getAllAuthors` import is kept so re-enabling is a one-line
  // toggle when/if traffic warrants it.
  void getAllAuthors;

  return entries;
}
