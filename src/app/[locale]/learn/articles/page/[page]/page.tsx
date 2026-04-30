import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { buildAbsoluteUrl } from '@/lib/content';
import { buildHreflangMap } from '@/i18n/seo';
import { locales, type Locale } from '@/i18n/config';
import ArchiveContent, { getArchivePages } from '@/components/learn/ArchiveContent';

interface PageProps {
  params: Promise<{ locale: string; page: string }>;
}

export async function generateStaticParams() {
  const params: { locale: string; page: string }[] = [];
  for (const locale of locales) {
    const total = getArchivePages(locale as Locale);
    for (let p = 2; p <= total; p += 1) {
      params.push({ locale, page: String(p) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, page } = await params;
  const t = await getTranslations({ locale, namespace: 'learn.archive' });
  const pageNum = parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 2) return {};
  const canonicalPath = `/${locale}/learn/articles/page/${pageNum}`;
  return {
    title: `${t('metaTitle')} (${pageNum})`,
    description: t('metaDescription'),
    alternates: {
      canonical: buildAbsoluteUrl(canonicalPath),
      languages: buildHreflangMap(`/learn/articles/page/${pageNum}`),
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: buildAbsoluteUrl(canonicalPath),
      type: 'website',
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function LearnArchivePagedPage({ params }: PageProps) {
  const { locale, page } = await params;
  const pageNum = parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 2) notFound();
  const totalPages = getArchivePages(locale as Locale);
  if (pageNum > totalPages) notFound();
  return <ArchiveContent locale={locale} page={pageNum} />;
}
