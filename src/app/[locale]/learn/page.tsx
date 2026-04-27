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
      {/* Hero header — parentdata-style editorial scale */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <Breadcrumbs items={[{ label: tBreadcrumbs('home'), href: '/' }, { label: tBreadcrumbs('learn') }]} />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-12 md:pb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ipc-950 leading-tight tracking-tight mb-4 mt-4 text-balance">
          {t('hub.title')}
        </h1>
        <p className="text-lg md:text-xl text-ipc-700 max-w-2xl leading-snug">
          {t('hub.description')}
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-20 space-y-14">
        {/* Browse by audience — bigger, friendlier cards */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-ipc-700 font-semibold mb-5">
            {t('hub.browseByAudience')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Link
              href="/learn/for-men"
              className="group block rounded-2xl bg-white border border-ipc-100 p-6 hover:border-ipc-300 hover:shadow-md transition-all"
            >
              <h3 className="text-xl md:text-2xl font-semibold text-ipc-950 mb-2 group-hover:text-ipc-700 transition-colors">
                {t('audience.men')}
              </h3>
              <p className="text-base text-ipc-700 leading-relaxed">
                {t('audience.menDescription')}
              </p>
            </Link>
            <Link
              href="/learn/for-women"
              className="group block rounded-2xl bg-white border border-ipc-100 p-6 hover:border-ipc-300 hover:shadow-md transition-all"
            >
              <h3 className="text-xl md:text-2xl font-semibold text-ipc-950 mb-2 group-hover:text-ipc-700 transition-colors">
                {t('audience.women')}
              </h3>
              <p className="text-base text-ipc-700 leading-relaxed">
                {t('audience.womenDescription')}
              </p>
            </Link>
          </div>
        </section>

        {/* Topics */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-ipc-700 font-semibold mb-5">
            {t('hub.browseByTopic')}
          </h2>
          {topics.length === 0 ? (
            <p className="text-base text-ipc-600 italic">{t('hub.noArticles')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {topics.map((topic) => {
                const pillar = getPillar(typedLocale, topic);
                return (
                  <Link
                    key={topic}
                    href={`/learn/${topic}`}
                    className="group flex items-start justify-between gap-3 rounded-2xl bg-white border border-ipc-100 p-5 hover:border-ipc-300 hover:shadow-md transition-all"
                  >
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-ipc-950 capitalize group-hover:text-ipc-700 transition-colors mb-1">
                        {pillar?.frontmatter.title ?? topic.replace(/-/g, ' ')}
                      </h3>
                      {pillar?.frontmatter.description && (
                        <p className="text-sm text-ipc-600 line-clamp-2 leading-relaxed">
                          {pillar.frontmatter.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-ipc-400 shrink-0 mt-1 group-hover:text-ipc-600 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent articles */}
        {recent.length > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wider text-ipc-700 font-semibold mb-5">
              {t('hub.recentArticles')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recent.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
          </section>
        )}

        {/* Glossary */}
        {glossaryCount > 0 && (
          <section>
            <Link
              href="/learn/glossary"
              className="group flex items-center justify-between rounded-2xl bg-white border border-ipc-100 p-6 hover:border-ipc-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <BookOpen size={22} className="text-ipc-600" />
                <div>
                  <h3 className="text-xl font-semibold text-ipc-950 group-hover:text-ipc-700 transition-colors">
                    {t('glossary.title')}
                  </h3>
                  <p className="text-sm text-ipc-600 mt-0.5">{t('glossary.description')}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-ipc-400 shrink-0 ml-3 group-hover:text-ipc-600 transition-colors" />
            </Link>
          </section>
        )}

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
