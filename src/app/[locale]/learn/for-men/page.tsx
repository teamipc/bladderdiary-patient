import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getArticlesForAudience, buildAbsoluteUrl } from '@/lib/content';
import type { Locale } from '@/i18n/config';
import { buildHreflangMap } from '@/i18n/seo';
import ArticleCard from '@/components/learn/ArticleCard';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';
import { CollectionPageJsonLd } from '@/components/seo/JsonLd';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn.forMen' });
  const canonical = `/${locale}/learn/for-men`;

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical,
      languages: buildHreflangMap('/learn/for-men'),
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: buildAbsoluteUrl(canonical),
      type: 'website',
    },
  };
}

export default async function ForMenLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tForMen = await getTranslations({ locale, namespace: 'learn.forMen' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });
  const typedLocale = locale as Locale;
  const articles = getArticlesForAudience(typedLocale, 'men');
  const canonical = `/${locale}/learn/for-men`;

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: tBreadcrumbs('home'), href: '/' },
            { label: tBreadcrumbs('learn'), href: '/learn' },
            { label: t('audience.men') },
          ]}
        />

        <CollectionPageJsonLd
          name={tForMen('title')}
          description={tForMen('description')}
          url={canonical}
          itemUrls={articles.map((a) => a.urlPath)}
        />

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-ipc-950 mb-3 text-balance leading-tight">
            {tForMen('title')}
          </h1>
          <p className="text-lg text-ipc-700 leading-relaxed">{tForMen('description')}</p>
        </header>

        <p className="text-base text-ipc-700 leading-relaxed mb-8">{tForMen('intro')}</p>

        <section className="mb-8 rounded-2xl bg-ipc-50 border border-ipc-100 p-5">
          <h2 className="text-base font-semibold text-ipc-950 mb-1">{tForMen('ctaTitle')}</h2>
          <p className="text-sm text-ipc-700 leading-relaxed mb-3">{tForMen('ctaDescription')}</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-full bg-ipc-600 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            {tForMen('ctaButton')}
          </Link>
        </section>

        <section className="mb-10">
          {articles.length === 0 ? (
            <p className="text-sm text-ipc-500 italic">{tForMen('noArticles')}</p>
          ) : (
            <div className="space-y-2">
              {articles.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
          )}
        </section>

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
