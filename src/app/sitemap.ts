import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://myflowcheck.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://myflowcheck.com/privacy',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://myflowcheck.com/terms',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://myflowcheck.com/help',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
