import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getAllArticles } from '@/lib/content';
import type { Locale } from '@/i18n/config';
import ArticleCard from '@/components/learn/ArticleCard';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Pagination from '@/components/learn/Pagination';

export const PAGE_SIZE = 12;

export function getArchivePages(locale: Locale): number {
  const all = getAllArticles(locale).filter((a) => a.frontmatter.pageType !== 'glossary');
  return Math.max(1, Math.ceil(all.length / PAGE_SIZE));
}

interface Props {
  locale: string;
  page: number;
}

export default async function ArchiveContent({ locale, page }: Props) {
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });

  const all = getAllArticles(typedLocale)
    .filter((a) => a.frontmatter.pageType !== 'glossary')
    .sort((a, b) =>
      (b.frontmatter.publishedAt || '').localeCompare(a.frontmatter.publishedAt || ''),
    );

  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const articles = all.slice(start, start + PAGE_SIZE);

  return (
    <div className="bg-surface min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6">
        <Breadcrumbs
          items={[
            { label: tBreadcrumbs('home'), href: '/' },
            { label: tBreadcrumbs('learn'), href: '/learn' },
            { label: t('archive.breadcrumb') },
          ]}
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-6 md:pb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ipc-950 leading-tight tracking-tight mb-3 mt-4 text-balance">
          {t('archive.heading')}
        </h1>
        <p className="text-base md:text-lg text-ipc-700 max-w-2xl leading-snug">
          {t('archive.lede')}
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-20">
        {articles.length === 0 ? (
          <p className="text-base text-ipc-600 italic">{t('hub.noArticles')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/learn/articles"
            />
          </>
        )}
      </div>
    </div>
  );
}
