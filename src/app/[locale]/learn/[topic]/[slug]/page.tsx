import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getArticle,
  getClusterArticles,
  getAuthor,
  getRelatedArticles,
  getArticleAlternates,
  buildAbsoluteUrl,
} from '@/lib/content';
import { locales, type Locale } from '@/i18n/config';
import { OG_LOCALE, buildArticleHreflangMap } from '@/i18n/seo';
import { RenderMdx } from '@/lib/mdx';
import ArticleCard from '@/components/learn/ArticleCard';
import AuthorByline from '@/components/learn/AuthorByline';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { formatBylineMeta } from '@/lib/authorByline';

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

  const fm = article.frontmatter;
  const canonical = `/${locale}/learn/${topic}/${slug}`;

  const author = getAuthor(fm.author);
  const alternates = getArticleAlternates(article);
  const hreflangMap = buildArticleHreflangMap(alternates);

  return {
    title: fm.title,
    description: fm.description,
    keywords: fm.keywords,
    authors: author ? [{ name: author.name }] : undefined,
    alternates: {
      canonical,
      languages: Object.keys(hreflangMap).length > 1 ? hreflangMap : undefined,
    },
    openGraph: {
      title: fm.title,
      description: fm.description,
      url: buildAbsoluteUrl(canonical),
      type: 'article',
      publishedTime: fm.publishedAt,
      modifiedTime: fm.updatedAt,
      authors: author ? [author.name] : undefined,
      tags: fm.keywords,
      section: topic.replace(/-/g, ' '),
      images: fm.hero
        ? [
            {
              url: fm.hero,
              width: 1200,
              height: 630,
              alt: fm.heroAlt ?? fm.title,
            },
          ]
        : undefined,
      locale: OG_LOCALE[locale as Locale] ?? OG_LOCALE.en,
    },
    twitter: {
      card: 'summary_large_image',
      title: fm.title,
      description: fm.description,
      images: fm.hero ? [fm.hero] : undefined,
    },
    robots: fm.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
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

  const breadcrumbs = [
    { label: tBreadcrumbs('home'), href: '/' },
    { label: tBreadcrumbs('learn'), href: '/learn' },
    { label: topic.replace(/-/g, ' '), href: `/learn/${topic}` },
    { label: fm.title },
  ];

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Breadcrumbs items={breadcrumbs} />
        <BreadcrumbJsonLd
          items={breadcrumbs.map((b) => ({
            name: b.label,
            url: b.href ?? article.urlPath,
          }))}
        />
        <ArticleJsonLd article={article} author={author} reviewer={reviewer} />

        <header className="mb-6 mt-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ipc-950 mb-4 text-balance leading-tight tracking-tight">
            {fm.title}
          </h1>
          <p className="text-lg md:text-xl text-ipc-700 leading-relaxed">
            {fm.description}
          </p>
        </header>

        <div className="mb-8">
          <AuthorByline
            author={author}
            reviewer={reviewer}
            metaLine={formatBylineMeta({
              publishedAt: fm.publishedAt,
              updatedAt: fm.updatedAt,
              lastReviewedAt: fm.lastReviewedAt,
              readingTimeMin: article.readingTimeMin,
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

        {fm.hero && (
          <figure className="-mx-4 sm:-mx-12 md:-mx-16 mb-10">
            <div className="sm:rounded-2xl overflow-hidden bg-ipc-50">
              <Image
                src={fm.hero}
                alt={fm.heroAlt ?? ''}
                width={1200}
                height={630}
                className="w-full h-auto"
                sizes="(min-width: 1024px) 800px, (min-width: 768px) 768px, 100vw"
                priority
              />
            </div>
            {fm.heroAlt && (
              <figcaption className="text-base text-ipc-600 italic text-center mt-3 px-4 sm:px-12 md:px-16 leading-relaxed">
                {fm.heroAlt}
              </figcaption>
            )}
          </figure>
        )}

        <article className="learn-prose mb-10">
          <RenderMdx source={article.body} />
        </article>

        {fm.citations && fm.citations.length > 0 && (
          <section className="mb-8 rounded-2xl bg-white border border-ipc-100 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ipc-500 mb-3">
              {t('article.citations')}
            </h2>
            <ol className="list-decimal ps-5 space-y-2 text-sm text-ipc-700">
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

        {/* Diary CTA — primary conversion on every article. The site exists to drive 3-day diary completions. */}
        <section className="mb-10 rounded-2xl bg-gradient-to-br from-ipc-100 to-ipc-50 border border-ipc-200 p-6 sm:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-ipc-950 mb-2 leading-tight tracking-tight">
            {t('article.ctaTitle')}
          </h2>
          <p className="text-base md:text-lg text-ipc-700 mb-5 max-w-md mx-auto leading-relaxed">
            {t('article.ctaDescription')}
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-ipc-700 hover:bg-ipc-800 text-white font-semibold text-base shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            <span>{t('article.ctaStartDiary')}</span>
            <ArrowRight size={18} aria-hidden className="rtl:scale-x-[-1]" />
          </Link>
        </section>

        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ipc-700 mb-5">
              {t('article.relatedArticles')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
