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

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const lastMod = new Date();

  for (const page of corePages) {
    const languages = buildLanguagesMap(page.path);
    for (const locale of locales) {
      entries.push({
        url: absolute(localizedPath(locale, page.path)),
        lastModified: lastMod,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages },
      });
    }
  }

  for (const locale of locales) {
    const typedLocale = locale as Locale;

    for (const topic of getAllTopics(typedLocale)) {
      const path = `/learn/${topic}`;
      entries.push({
        url: absolute(localizedPath(typedLocale, path)),
        lastModified: lastMod,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages: buildLanguagesMap(path) },
      });
    }

    for (const article of getAllArticles(typedLocale)) {
      const fm = article.frontmatter;
      if (fm.noindex) continue;
      if (fm.pageType === 'pillar') continue;
      const path =
        fm.pageType === 'glossary'
          ? `/learn/glossary/${fm.slug}`
          : `/learn/${fm.topic}/${fm.slug}`;
      entries.push({
        url: absolute(localizedPath(typedLocale, path)),
        lastModified: fm.updatedAt ? new Date(fm.updatedAt) : lastMod,
        changeFrequency: 'monthly',
        priority: fm.pageType === 'glossary' ? 0.5 : 0.6,
        alternates: { languages: buildLanguagesMap(path) },
      });
    }
  }

  for (const author of getAllAuthors()) {
    const path = `/learn/authors/${author.slug}`;
    const languages = buildLanguagesMap(path);
    for (const locale of locales) {
      entries.push({
        url: absolute(localizedPath(locale as Locale, path)),
        lastModified: lastMod,
        changeFrequency: 'yearly',
        priority: 0.4,
        alternates: { languages },
      });
    }
  }

  return entries;
}
