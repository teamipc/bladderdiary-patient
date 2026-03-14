import type { MetadataRoute } from 'next';
import { locales, defaultLocale } from '@/i18n/config';

export const dynamic = 'force-static';

const BASE_URL = 'https://myflowcheck.com';

const pages = [
  { path: '/', changeFrequency: 'monthly' as const, priority: 1 },
  { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
  { path: '/help', changeFrequency: 'yearly' as const, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: locale === defaultLocale
        ? `${BASE_URL}${page.path}`
        : `${BASE_URL}/${locale}${page.path === '/' ? '' : page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }))
  );
}
