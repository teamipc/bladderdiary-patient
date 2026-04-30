import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getGlossaryEntry,
  getGlossaryEntries,
  buildAbsoluteUrl,
} from '@/lib/content';
import { locales, type Locale } from '@/i18n/config';
import { buildHreflangMap } from '@/i18n/seo';
import { RenderMdx } from '@/lib/mdx';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

interface PageParams {
  locale: string;
  term: string;
}

export async function generateStaticParams() {
  const all: PageParams[] = [];
  for (const locale of locales) {
    for (const e of getGlossaryEntries(locale)) {
      all.push({ locale, term: e.frontmatter.slug });
    }
  }
  if (all.length === 0) {
    return locales.map((locale) => ({ locale, term: '__none__' }));
  }
  return all;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, term } = await params;
  const entry = getGlossaryEntry(locale as Locale, term);
  if (!entry) return {};
  const canonical =
    locale === 'en' ? `/learn/glossary/${term}` : `/${locale}/learn/glossary/${term}`;

  return {
    title: entry.frontmatter.title,
    description: entry.frontmatter.description,
    alternates: { canonical, languages: buildHreflangMap(`/learn/glossary/${term}`) },
    openGraph: {
      title: entry.frontmatter.title,
      description: entry.frontmatter.description,
      url: buildAbsoluteUrl(canonical),
      type: 'article',
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, term } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });
  const typedLocale = locale as Locale;

  const entry = getGlossaryEntry(typedLocale, term);
  if (!entry) notFound();

  const breadcrumbs = [
    { label: tBreadcrumbs('home'), href: '/' },
    { label: tBreadcrumbs('learn'), href: '/learn' },
    { label: tBreadcrumbs('glossary'), href: '/learn/glossary' },
    { label: entry.frontmatter.title },
  ];

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />
        <BreadcrumbJsonLd
          items={breadcrumbs.map((b) => ({
            name: b.label,
            url: b.href ?? entry.urlPath,
          }))}
        />
        <ArticleJsonLd article={entry} author={null} reviewer={null} />

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-ipc-950 mb-3 text-balance leading-tight">
            {entry.frontmatter.title}
          </h1>
          {entry.frontmatter.description && (
            <p className="text-lg text-ipc-700 leading-relaxed">{entry.frontmatter.description}</p>
          )}
        </header>

        <article className="mb-10">
          <RenderMdx source={entry.body} />
        </article>

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
