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

const corePages: CorePage[] = [
  { path: '/', changeFrequency: 'monthly', priority: 1 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/help', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/learn', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/learn/articles', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/learn/for-men', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/learn/for-women', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/learn/glossary', changeFrequency: 'monthly', priority: 0.6 },
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
      const path =
        fm.pageType === 'glossary'
          ? `/learn/glossary/${fm.slug}`
          : `/learn/${fm.topic}/${fm.slug}`;
      const articleLastMod =
        maxDate([fm.updatedAt, fm.lastReviewedAt, fm.publishedAt]) ?? siteLastMod;
      entries.push({
        url: absolute(localizedPath(typedLocale, path)),
        lastModified: articleLastMod,
        changeFrequency: 'monthly',
        priority: fm.pageType === 'glossary' ? 0.5 : 0.6,
        alternates: { languages: buildLanguagesMap(path) },
        images: fm.hero ? [absolute(fm.hero)] : undefined,
      });
    }
  }

  for (const author of getAllAuthors()) {
    const path = `/learn/authors/${author.slug}`;
    const languages = buildLanguagesMap(path);
    for (const locale of locales) {
      entries.push({
        url: absolute(localizedPath(locale as Locale, path)),
        lastModified: siteLastMod,
        changeFrequency: 'yearly',
        priority: 0.4,
        alternates: { languages },
      });
    }
  }

  return entries;
}
