import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getArticlesForAudience, buildAbsoluteUrl } from '@/lib/content';
import type { Locale } from '@/i18n/config';
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
  const t = await getTranslations({ locale, namespace: 'learn.forWomen' });
  const canonical = locale === 'en' ? '/learn/for-women' : `/${locale}/learn/for-women`;

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical,
      languages: {
        en: '/learn/for-women',
        fr: '/fr/learn/for-women',
        es: '/es/learn/for-women',
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

export default async function ForWomenLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tForWomen = await getTranslations({ locale, namespace: 'learn.forWomen' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });
  const typedLocale = locale as Locale;
  const articles = getArticlesForAudience(typedLocale, 'women');
  const canonical = locale === 'en' ? '/learn/for-women' : `/${locale}/learn/for-women`;

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: tBreadcrumbs('home'), href: '/' },
            { label: tBreadcrumbs('learn'), href: '/learn' },
            { label: t('audience.women') },
          ]}
        />

        <CollectionPageJsonLd
          name={tForWomen('title')}
          description={tForWomen('description')}
          url={canonical}
          itemUrls={articles.map((a) => a.urlPath)}
        />

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-ipc-950 mb-3 text-balance leading-tight">
            {tForWomen('title')}
          </h1>
          <p className="text-lg text-ipc-700 leading-relaxed">{tForWomen('description')}</p>
        </header>

        <p className="text-base text-ipc-700 leading-relaxed mb-8">{tForWomen('intro')}</p>

        <section className="mb-8 rounded-2xl bg-ipc-50 border border-ipc-100 p-5">
          <h2 className="text-base font-semibold text-ipc-950 mb-1">{tForWomen('ctaTitle')}</h2>
          <p className="text-sm text-ipc-700 leading-relaxed mb-3">{tForWomen('ctaDescription')}</p>
        </section>

        <section className="mb-10">
          {articles.length === 0 ? (
            <p className="text-sm text-ipc-500 italic">{tForWomen('noArticles')}</p>
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
