import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/*/diary/', '/*/diary', '/*/summary/', '/*/summary', '/api/'],
    },
    sitemap: 'https://myflowcheck.com/sitemap.xml',
    host: 'https://myflowcheck.com',
  };
}
