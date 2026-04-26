import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getArticle,
  getClusterArticles,
  getAuthor,
  getRelatedArticles,
  buildAbsoluteUrl,
} from '@/lib/content';
import { locales, type Locale } from '@/i18n/config';
import { RenderMdx } from '@/lib/mdx';
import ArticleCard from '@/components/learn/ArticleCard';
import AuthorByline from '@/components/learn/AuthorByline';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

interface PageParams {
  locale: string;
  topic: string;
  slug: string;
}

export async function generateStaticParams() {
  const all: PageParams[] = [];
  for (const locale of locales) {
    for (const a of getClusterArticles(locale)) {
      all.push({ locale, topic: a.frontmatter.topic, slug: a.frontmatter.slug });
    }
  }
  if (all.length === 0) {
    return locales.map((locale) => ({ locale, topic: '__none__', slug: '__none__' }));
  }
  return all;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, topic, slug } = await params;
  const article = getArticle(locale as Locale, topic, slug);
  if (!article) return {};

  const canonical =
    locale === 'en'
      ? `/learn/${topic}/${slug}`
      : `/${locale}/learn/${topic}/${slug}`;

  return {
    title: article.frontmatter.title,
    description: article.frontmatter.description,
    alternates: { canonical },
    openGraph: {
      title: article.frontmatter.title,
      description: article.frontmatter.description,
      url: buildAbsoluteUrl(canonical),
      type: 'article',
      publishedTime: article.frontmatter.publishedAt,
      modifiedTime: article.frontmatter.updatedAt,
      images: article.frontmatter.hero ? [{ url: article.frontmatter.hero }] : undefined,
    },
    robots: article.frontmatter.noindex ? { index: false } : undefined,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, topic, slug } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });

  const article = getArticle(typedLocale, topic, slug);
  if (!article) notFound();

  const fm = article.frontmatter;
  const author = getAuthor(fm.author);
  const reviewer = fm.medicallyReviewedBy ? getAuthor(fm.medicallyReviewedBy) : null;
  const related = getRelatedArticles(article);

  const audienceForCta = fm.audience.length === 1 ? fm.audience[0] : null;

  const breadcrumbs = [
    { label: tBreadcrumbs('home'), href: '/' },
    { label: tBreadcrumbs('learn'), href: '/learn' },
    { label: topic.replace(/-/g, ' '), href: `/learn/${topic}` },
    { label: fm.title },
  ];

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />
        <BreadcrumbJsonLd
          items={breadcrumbs.map((b) => ({
            name: b.label,
            url: b.href ?? article.urlPath,
          }))}
        />
        <ArticleJsonLd article={article} author={author} reviewer={reviewer} />

        {fm.hero && (
          <div className="rounded-2xl overflow-hidden mb-6 bg-ipc-50">
            <Image
              src={fm.hero}
              alt={fm.heroAlt ?? ''}
              width={1200}
              height={630}
              className="w-full h-auto"
              priority
            />
          </div>
        )}

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-ipc-950 mb-3 text-balance leading-tight">
            {fm.title}
          </h1>
          <p className="text-lg text-ipc-700 leading-relaxed">{fm.description}</p>
        </header>

        <div className="mb-6">
          <AuthorByline
            author={author}
            reviewer={reviewer}
            lastReviewedAt={fm.lastReviewedAt}
            updatedAt={fm.updatedAt}
            readingTimeMin={article.readingTimeMin}
            labels={{
              by: t('article.by'),
              reviewedBy: t('article.reviewedBy'),
              lastReviewed: t('article.lastReviewed'),
              updated: t('article.updated'),
              readingTime: (n: number) => t('article.readingTime', { minutes: n }),
            }}
          />
        </div>

        <article className="mb-10">
          <RenderMdx source={article.body} />
        </article>

        {fm.citations && fm.citations.length > 0 && (
          <section className="mb-8 rounded-2xl bg-white border border-ipc-100 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ipc-500 mb-3">
              {t('article.citations')}
            </h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-ipc-700">
              {fm.citations.map((c, i) => (
                <li key={i}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ipc-900"
                  >
                    {c.title}
                  </a>
                  <span className="text-ipc-500">
                    . {c.source}, {c.year}.
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {audienceForCta === 'men' && (
          <section className="mb-8 rounded-2xl bg-ipc-50 border border-ipc-100 p-5">
            <h2 className="text-base font-semibold text-ipc-950 mb-1">
              {t('article.ctaForMen')}
            </h2>
            <Link
              href="/"
              className="inline-flex items-center mt-3 px-4 py-2 rounded-full bg-ipc-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              {t('article.ctaStartDiary')}
            </Link>
          </section>
        )}

        {audienceForCta === 'women' && (
          <section className="mb-8 rounded-2xl bg-ipc-50 border border-ipc-100 p-5">
            <h2 className="text-base font-semibold text-ipc-950 mb-1">
              {t('article.ctaForWomen')}
            </h2>
            <Link
              href="/learn/for-women"
              className="inline-flex items-center mt-3 px-4 py-2 rounded-full bg-ipc-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              {t('article.ctaFindSpecialist')}
            </Link>
          </section>
        )}

        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ipc-500 mb-3">
              {t('article.relatedArticles')}
            </h2>
            <div className="space-y-2">
              {related.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
          </section>
        )}

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
