import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getAllTopics,
  getPillar,
  getArticlesInTopic,
  getAuthor,
  buildAbsoluteUrl,
} from '@/lib/content';
import { locales, type Locale } from '@/i18n/config';
import { buildHreflangMap } from '@/i18n/seo';
import { RenderMdx } from '@/lib/mdx';
import ArticleCard from '@/components/learn/ArticleCard';
import AuthorByline from '@/components/learn/AuthorByline';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';
import Pagination from '@/components/learn/Pagination';
import { ArticleJsonLd, BreadcrumbJsonLd, CollectionPageJsonLd } from '@/components/seo/JsonLd';
import { formatBylineMeta } from '@/lib/authorByline';
import { TOPIC_PAGE_SIZE } from '@/lib/topicPagination';

interface PageParams {
  locale: string;
  topic: string;
}

export async function generateStaticParams() {
  const all: PageParams[] = [];
  for (const locale of locales) {
    for (const topic of getAllTopics(locale)) {
      all.push({ locale, topic });
    }
  }
  if (all.length === 0) {
    return locales.map((locale) => ({ locale, topic: '__none__' }));
  }
  return all;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, topic } = await params;
  const pillar = getPillar(locale as Locale, topic);
  if (!pillar) return {};

  const canonical = `/${locale}/learn/${topic}`;

  return {
    title: pillar.frontmatter.title,
    description: pillar.frontmatter.description,
    alternates: { canonical, languages: buildHreflangMap(`/learn/${topic}`) },
    openGraph: {
      title: pillar.frontmatter.title,
      description: pillar.frontmatter.description,
      url: buildAbsoluteUrl(canonical),
      type: 'article',
      images: pillar.frontmatter.hero ? [{ url: pillar.frontmatter.hero }] : undefined,
    },
  };
}

export default async function PillarPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, topic } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });

  const pillar = getPillar(typedLocale, topic);
  const allClusterArticles = getArticlesInTopic(typedLocale, topic).sort((a, b) =>
    (b.frontmatter.publishedAt || '').localeCompare(a.frontmatter.publishedAt || ''),
  );

  if (!pillar && allClusterArticles.length === 0) notFound();

  const totalPages = Math.max(1, Math.ceil(allClusterArticles.length / TOPIC_PAGE_SIZE));
  const clusterArticles = allClusterArticles.slice(0, TOPIC_PAGE_SIZE);

  const author = pillar ? getAuthor(pillar.frontmatter.author) : null;
  const reviewer = pillar?.frontmatter.medicallyReviewedBy
    ? getAuthor(pillar.frontmatter.medicallyReviewedBy)
    : null;

  const topicNameKey = `hub.topicNames.${topic}`;
  const fallbackTopicName = t.has(topicNameKey)
    ? t(topicNameKey)
    : topic.replace(/-/g, ' ');
  const breadcrumbs = [
    { label: tBreadcrumbs('home'), href: '/' },
    { label: tBreadcrumbs('learn'), href: '/learn' },
    { label: pillar?.frontmatter.title ?? fallbackTopicName },
  ];

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {pillar ? (
          <>
            <BreadcrumbJsonLd
              items={breadcrumbs.map((b) => ({
                name: b.label,
                url: b.href ?? pillar.urlPath,
              }))}
            />
            <ArticleJsonLd article={pillar} author={author} reviewer={reviewer} />

            <header className="mb-6 mt-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ipc-950 mb-4 text-balance leading-tight tracking-tight">
                {pillar.frontmatter.title}
              </h1>
              <p className="text-lg md:text-xl text-ipc-700 leading-relaxed">
                {pillar.frontmatter.description}
              </p>
            </header>

            <div className="mb-8">
              <AuthorByline
                author={author}
                reviewer={reviewer}
                metaLine={formatBylineMeta({
                  publishedAt: pillar.frontmatter.publishedAt,
                  updatedAt: pillar.frontmatter.updatedAt,
                  lastReviewedAt: pillar.frontmatter.lastReviewedAt,
                  readingTimeMin: pillar.readingTimeMin,
                  locale: typedLocale,
                  labels: {
                    published: t('article.published'),
                    updated: t('article.updated'),
                    reviewed: t('article.reviewed'),
                    readingTime: (n: number) => t('article.readingTime', { minutes: n }),
                  },
                })}
                reviewedByLabel={t('article.reviewedBy')}
              />
            </div>

            {pillar.frontmatter.hero && (
              <div className="rounded-2xl overflow-hidden mb-10 bg-ipc-50">
                <Image
                  src={pillar.frontmatter.hero}
                  alt={pillar.frontmatter.heroAlt ?? ''}
                  width={1200}
                  height={630}
                  className="w-full h-auto"
                  priority
                />
              </div>
            )}

            <article className="learn-prose mb-10">
              <RenderMdx source={pillar.body} />
            </article>
          </>
        ) : (
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-ipc-950 mb-2 capitalize text-balance">
              {topic.replace(/-/g, ' ')}
            </h1>
          </header>
        )}

        {clusterArticles.length > 0 && (
          <section className="mb-10">
            <CollectionPageJsonLd
              name={pillar?.frontmatter.title ?? fallbackTopicName}
              description={pillar?.frontmatter.description ?? fallbackTopicName}
              url={`/${locale}/learn/${topic}`}
              itemUrls={allClusterArticles.map((a) => a.urlPath)}
            />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ipc-700 mb-5">
              {t('topic.articlesInTopic')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {clusterArticles.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
            <Pagination
              currentPage={1}
              totalPages={totalPages}
              basePath={`/learn/${topic}`}
            />
          </section>
        )}

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
