import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { ChevronRight, BookOpen } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getAllTopics,
  getClusterArticles,
  getPillar,
  getGlossaryEntries,
  buildAbsoluteUrl,
} from '@/lib/content';
import type { Locale } from '@/i18n/config';
import ArticleCard from '@/components/learn/ArticleCard';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn.hub' });
  const canonical = locale === 'en' ? '/learn' : `/${locale}/learn`;

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical,
      languages: {
        en: '/learn',
        fr: '/fr/learn',
        es: '/es/learn',
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: buildAbsoluteUrl(canonical),
      type: 'website',
    },
  };
}

export default async function LearnHub({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });
  const typedLocale = locale as Locale;

  const topics = getAllTopics(typedLocale);
  const recent = getClusterArticles(typedLocale)
    .slice()
    .sort((a, b) =>
      (b.frontmatter.publishedAt || '').localeCompare(a.frontmatter.publishedAt || ''),
    )
    .slice(0, 6);
  const glossaryCount = getGlossaryEntries(typedLocale).length;

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ label: tBreadcrumbs('home'), href: '/' }, { label: tBreadcrumbs('learn') }]} />
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-ipc-950 mb-2 text-balance">{t('hub.title')}</h1>
          <p className="text-base text-ipc-700 leading-relaxed">{t('hub.description')}</p>
        </header>

        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/learn/for-men"
              className="block rounded-2xl bg-white border border-ipc-100 p-4 hover:border-ipc-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-base font-semibold text-ipc-950 mb-1.5">{t('audience.men')}</h3>
              <p className="text-sm text-ipc-600 leading-relaxed">{t('audience.menDescription')}</p>
            </Link>
            <Link
              href="/learn/for-women"
              className="block rounded-2xl bg-white border border-ipc-100 p-4 hover:border-ipc-300 hover:shadow-sm transition-all"
            >
              <h3 className="text-base font-semibold text-ipc-950 mb-1.5">{t('audience.women')}</h3>
              <p className="text-sm text-ipc-600 leading-relaxed">{t('audience.womenDescription')}</p>
            </Link>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ipc-500 mb-3">
            {t('hub.browseByTopic')}
          </h2>
          {topics.length === 0 ? (
            <p className="text-sm text-ipc-500 italic">{t('hub.noArticles')}</p>
          ) : (
            <div className="space-y-2">
              {topics.map((topic) => {
                const pillar = getPillar(typedLocale, topic);
                return (
                  <Link
                    key={topic}
                    href={`/learn/${topic}`}
                    className="flex items-center justify-between rounded-2xl bg-white border border-ipc-100 p-4 hover:border-ipc-300 hover:shadow-sm transition-all"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-ipc-950 capitalize">
                        {pillar?.frontmatter.title ?? topic.replace(/-/g, ' ')}
                      </h3>
                      {pillar?.frontmatter.description && (
                        <p className="text-sm text-ipc-600 line-clamp-1 mt-0.5">
                          {pillar.frontmatter.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-ipc-400 shrink-0 ml-3" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {recent.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ipc-500 mb-3">
              {t('hub.recentArticles')}
            </h2>
            <div className="space-y-2">
              {recent.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
          </section>
        )}

        {glossaryCount > 0 && (
          <section className="mb-10">
            <Link
              href="/learn/glossary"
              className="flex items-center justify-between rounded-2xl bg-white border border-ipc-100 p-4 hover:border-ipc-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-ipc-600" />
                <div>
                  <h3 className="text-base font-semibold text-ipc-950">{t('glossary.title')}</h3>
                  <p className="text-sm text-ipc-600">{t('glossary.description')}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-ipc-400 shrink-0 ml-3" />
            </Link>
          </section>
        )}

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
