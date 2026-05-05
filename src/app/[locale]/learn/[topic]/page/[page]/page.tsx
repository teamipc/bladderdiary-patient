import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getAllTopics,
  getPillar,
  getArticlesInTopic,
  buildAbsoluteUrl,
} from '@/lib/content';
import { locales, type Locale } from '@/i18n/config';
import { buildHreflangMap } from '@/i18n/seo';
import ArticleCard from '@/components/learn/ArticleCard';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';
import Pagination from '@/components/learn/Pagination';
import { TOPIC_PAGE_SIZE } from '@/lib/topicPagination';

interface PageParams {
  locale: string;
  topic: string;
  page: string;
}

export async function generateStaticParams() {
  const params: PageParams[] = [];
  for (const locale of locales) {
    for (const topic of getAllTopics(locale as Locale)) {
      const total = Math.max(
        1,
        Math.ceil(getArticlesInTopic(locale as Locale, topic).length / TOPIC_PAGE_SIZE),
      );
      for (let p = 2; p <= total; p += 1) {
        params.push({ locale, topic, page: String(p) });
      }
    }
  }
  if (params.length === 0) {
    return locales.map((locale) => ({ locale, topic: '__none__', page: '2' }));
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, topic, page } = await params;
  const pageNum = parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 2) return {};
  const pillar = getPillar(locale as Locale, topic);
  const baseTitle = pillar?.frontmatter.title ?? topic.replace(/-/g, ' ');
  const canonicalPath = `/${locale}/learn/${topic}/page/${pageNum}`;

  return {
    title: `${baseTitle} (${pageNum})`,
    description: pillar?.frontmatter.description,
    alternates: {
      canonical: buildAbsoluteUrl(canonicalPath),
      languages: buildHreflangMap(`/learn/${topic}/page/${pageNum}`),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function TopicPagedPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, topic, page } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });

  const pageNum = parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 2) notFound();

  const pillar = getPillar(typedLocale, topic);
  const allClusterArticles = getArticlesInTopic(typedLocale, topic).sort((a, b) =>
    (b.frontmatter.publishedAt || '').localeCompare(a.frontmatter.publishedAt || ''),
  );
  const totalPages = Math.max(1, Math.ceil(allClusterArticles.length / TOPIC_PAGE_SIZE));
  if (pageNum > totalPages) notFound();

  const start = (pageNum - 1) * TOPIC_PAGE_SIZE;
  const articles = allClusterArticles.slice(start, start + TOPIC_PAGE_SIZE);

  const topicNameKey = `hub.topicNames.${topic}`;
  const fallbackTopicName = t.has(topicNameKey)
    ? t(topicNameKey)
    : topic.replace(/-/g, ' ');
  const baseTitle = pillar?.frontmatter.title ?? fallbackTopicName;

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: tBreadcrumbs('home'), href: '/' },
            { label: tBreadcrumbs('learn'), href: '/learn' },
            { label: baseTitle, href: `/learn/${topic}` },
          ]}
        />

        <header className="mb-8 mt-2">
          <h1 className="text-3xl md:text-4xl font-bold text-ipc-950 mb-2 text-balance leading-tight tracking-tight">
            {baseTitle}
          </h1>
          <p className="text-base text-ipc-600">
            {t('archive.heading')} — {pageNum} / {totalPages}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ipc-700 mb-5">
            {t('topic.articlesInTopic')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {articles.map((a) => (
              <ArticleCard key={a.urlPath} article={a} />
            ))}
          </div>
          <Pagination
            currentPage={pageNum}
            totalPages={totalPages}
            basePath={`/learn/${topic}`}
          />
        </section>

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
