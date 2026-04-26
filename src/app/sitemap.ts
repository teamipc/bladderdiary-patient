import type { MetadataRoute } from 'next';
import { locales, defaultLocale, type Locale } from '@/i18n/config';
import {
  getAllArticles,
  getAllTopics,
  getAllAuthors,
  getGlossaryEntries,
} from '@/lib/content';

export const dynamic = 'force-static';

const BASE_URL = 'https://myflowcheck.com';

const corePages = [
  { path: '/', changeFrequency: 'monthly' as const, priority: 1 },
  { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/help', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/learn', changeFrequency: 'weekly' as const, priority: 0.9 },
  { path: '/learn/for-men', changeFrequency: 'weekly' as const, priority: 0.8 },
  { path: '/learn/for-women', changeFrequency: 'weekly' as const, priority: 0.8 },
  { path: '/learn/glossary', changeFrequency: 'monthly' as const, priority: 0.6 },
];

function buildUrl(locale: Locale, path: string): string {
  if (locale === defaultLocale) {
    return `${BASE_URL}${path}`;
  }
  return `${BASE_URL}/${locale}${path === '/' ? '' : path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of corePages) {
    for (const locale of locales) {
      entries.push({
        url: buildUrl(locale as Locale, page.path),
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    }
  }

  for (const locale of locales) {
    const typedLocale = locale as Locale;

    for (const topic of getAllTopics(typedLocale)) {
      entries.push({
        url: buildUrl(typedLocale, `/learn/${topic}`),
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }

    for (const article of getAllArticles(typedLocale)) {
      const fm = article.frontmatter;
      if (fm.noindex) continue;
      let path: string;
      if (fm.pageType === 'pillar') continue;
      if (fm.pageType === 'glossary') {
        path = `/learn/glossary/${fm.slug}`;
      } else {
        path = `/learn/${fm.topic}/${fm.slug}`;
      }
      entries.push({
        url: buildUrl(typedLocale, path),
        lastModified: fm.updatedAt ? new Date(fm.updatedAt) : new Date(),
        changeFrequency: 'monthly',
        priority: fm.pageType === 'glossary' ? 0.5 : 0.6,
      });
    }
  }

  for (const author of getAllAuthors()) {
    for (const locale of locales) {
      entries.push({
        url: buildUrl(locale as Locale, `/learn/authors/${author.slug}`),
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.4,
      });
    }
  }

  return entries;
}
