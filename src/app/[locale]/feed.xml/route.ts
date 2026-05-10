import { locales, type Locale } from '@/i18n/config';
import { getAllArticles, getAuthor, buildAbsoluteUrl, SITE_URL } from '@/lib/content';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const MAX_ITEMS = 30;
const CONTENT_EXCERPT_CHARS = 1800;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/**
 * Strip MDX components and convert a leading excerpt of an article body to
 * basic HTML for RSS `<content:encoded>`. Aimed at giving feed readers real
 * preview content without shipping a full MDX-to-HTML pipeline.
 */
function bodyToRssHtml(md: string): string {
  let body = md
    .replace(/<[A-Z]\w*[^>]*\/>/g, '')
    .replace(/<[A-Z]\w*[^>]*>[\s\S]*?<\/[A-Z]\w*>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .trim();

  let truncated = false;
  if (body.length > CONTENT_EXCERPT_CHARS) {
    const cut = body.slice(0, CONTENT_EXCERPT_CHARS);
    const lastPara = cut.lastIndexOf('\n\n');
    body = (lastPara > CONTENT_EXCERPT_CHARS / 2 ? cut.slice(0, lastPara) : cut);
    truncated = true;
  }

  const html = body
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('## ')) return `<h3>${inlineMd(trimmed.slice(3))}</h3>`;
      if (trimmed.startsWith('### ')) return `<h4>${inlineMd(trimmed.slice(4))}</h4>`;
      if (/^[-*] /m.test(trimmed) && trimmed.split('\n').every((l) => /^[-*] /.test(l) || !l.trim())) {
        const items = trimmed
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => `<li>${inlineMd(l.replace(/^[-*] /, ''))}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${inlineMd(trimmed)}</p>`;
    })
    .filter(Boolean)
    .join('\n');

  return html + (truncated ? '\n<p>...</p>' : '');
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
      const contentHtml = bodyToRssHtml(a.body);
      return `    <item>
      <title>${escapeXml(fm.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc2822(fm.publishedAt)}</pubDate>
      <description>${escapeXml(fm.description)}</description>
      <content:encoded><![CDATA[${contentHtml}]]></content:encoded>
      ${authorTag}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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
