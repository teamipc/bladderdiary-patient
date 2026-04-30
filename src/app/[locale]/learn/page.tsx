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
import { TOPIC_GROUPS, getGroupedTopicSet, FEATURED_CHIPS } from '@/lib/topics';
import type { Locale } from '@/i18n/config';
import { buildHreflangMap } from '@/i18n/seo';
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
      languages: buildHreflangMap('/learn'),
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
  const topicSet = new Set(topics);
  const recent = getClusterArticles(typedLocale)
    .slice()
    .sort((a, b) =>
      (b.frontmatter.publishedAt || '').localeCompare(a.frontmatter.publishedAt || ''),
    )
    .slice(0, 9);
  const glossaryCount = getGlossaryEntries(typedLocale).length;

  const chips = FEATURED_CHIPS.filter((c) => !c.topic || topicSet.has(c.topic));

  const groupedSet = getGroupedTopicSet();
  const ungrouped = topics.filter((tg) => !groupedSet.has(tg));

  const renderTopicLink = (topic: string) => {
    const pillar = getPillar(typedLocale, topic);
    return (
      <li key={topic}>
        <Link
          href={`/learn/${topic}`}
          className="text-base text-ipc-700 hover:text-ipc-950 underline-offset-4 hover:underline capitalize"
        >
          {pillar?.frontmatter.title ?? topic.replace(/-/g, ' ')}
        </Link>
      </li>
    );
  };

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <Breadcrumbs items={[{ label: tBreadcrumbs('home'), href: '/' }, { label: tBreadcrumbs('learn') }]} />
      </div>

      {/* Compact hero — leaves room for articles above the fold */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ipc-950 leading-tight tracking-tight mb-3 mt-4 text-balance">
          {t('hub.title')}
        </h1>
        <p className="text-base md:text-lg text-ipc-700 max-w-2xl leading-snug">
          {t('hub.description')}
        </p>
      </div>

      {/* Chip filter rail — links to audience landings + topic pillars (crawlable, not client state) */}
      <div className="mx-auto max-w-5xl pb-10">
        <div className="flex sm:flex-wrap gap-2 overflow-x-auto sm:overflow-x-visible px-4 sm:px-6 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {chips.map((chip) => {
            const isActive = chip.href === '/learn';
            return (
              <Link
                key={chip.key}
                href={chip.href}
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'inline-flex items-center h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap shrink-0 bg-ipc-950 text-white transition-colors'
                    : 'inline-flex items-center h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap shrink-0 bg-white border border-ipc-200 text-ipc-700 hover:border-ipc-400 hover:text-ipc-950 transition-colors'
                }
              >
                {t(`hub.${chip.key}`)}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-20 space-y-14">
        {/* Latest reading — the page lead */}
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

        {/* Explore by topic — demoted from card grid to dense text-link list */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-ipc-700 font-semibold mb-5">
            {t('hub.browseByTopic')}
          </h2>
          {topics.length === 0 ? (
            <p className="text-base text-ipc-600 italic">{t('hub.noArticles')}</p>
          ) : (
            <div className="space-y-6">
              {TOPIC_GROUPS.map((group) => {
                const groupTopics = group.topics.filter((tg) => topicSet.has(tg));
                if (groupTopics.length === 0) return null;
                return (
                  <div key={group.key}>
                    <h3 className="text-base font-semibold text-ipc-950 mb-2">
                      {group.label}
                    </h3>
                    <ul className="flex flex-wrap gap-x-5 gap-y-2">
                      {groupTopics.map(renderTopicLink)}
                    </ul>
                  </div>
                );
              })}
              {ungrouped.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-ipc-950 mb-2">
                    {t('hub.moreTopics')}
                  </h3>
                  <ul className="flex flex-wrap gap-x-5 gap-y-2">
                    {ungrouped.map(renderTopicLink)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

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
