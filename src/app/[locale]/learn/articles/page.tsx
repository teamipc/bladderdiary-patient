import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildAbsoluteUrl } from '@/lib/content';
import { buildHreflangMap } from '@/i18n/seo';
import ArchiveContent from '@/components/learn/ArchiveContent';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn.archive' });
  const canonicalPath = `/${locale}/learn/articles`;
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: buildAbsoluteUrl(canonicalPath),
      languages: buildHreflangMap('/learn/articles'),
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: buildAbsoluteUrl(canonicalPath),
      type: 'website',
    },
  };
}

export default async function LearnArchivePage({ params }: PageProps) {
  const { locale } = await params;
  return <ArchiveContent locale={locale} page={1} />;
}
