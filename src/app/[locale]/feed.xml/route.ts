import { locales, type Locale } from '@/i18n/config';
import { getAllArticles, getAuthor, buildAbsoluteUrl, SITE_URL } from '@/lib/content';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const MAX_ITEMS = 30;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc2822(date: string | undefined): string {
  if (!date) return new Date().toUTCString();
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    return new Response('Not found', { status: 404 });
  }
  const typedLocale = locale as Locale;

  const articles = getAllArticles(typedLocale)
    .filter((a) => a.frontmatter.pageType === 'cluster' && !a.frontmatter.noindex)
    .sort((a, b) =>
      (b.frontmatter.publishedAt || '').localeCompare(a.frontmatter.publishedAt || ''),
    )
    .slice(0, MAX_ITEMS);

  const channelTitle = 'My Flow Check — Learn';
  const channelDescription =
    'Articles on bladder health, urinary symptoms, pelvic floor, and the bladder diary.';
  const channelLink = `${SITE_URL}/${locale}/learn/articles`;
  const feedSelf = `${SITE_URL}/${locale}/feed.xml`;
  const lastBuildDate = articles[0]?.frontmatter.updatedAt
    ? rfc2822(articles[0].frontmatter.updatedAt)
    : new Date().toUTCString();

  const items = articles
    .map((a) => {
      const fm = a.frontmatter;
      const url = buildAbsoluteUrl(a.urlPath);
      const author = getAuthor(fm.author);
      const authorTag = author
        ? `<dc:creator>${escapeXml(author.name)}</dc:creator>`
        : '';
      return `    <item>
      <title>${escapeXml(fm.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc2822(fm.publishedAt)}</pubDate>
      <description>${escapeXml(fm.description)}</description>
      ${authorTag}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${channelLink}</link>
    <atom:link href="${feedSelf}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(channelDescription)}</description>
    <language>${locale}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
