import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getGlossaryEntries, buildAbsoluteUrl } from '@/lib/content';
import type { Locale } from '@/i18n/config';
import { buildHreflangMap } from '@/i18n/seo';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import Disclaimer from '@/components/learn/Disclaimer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'learn.glossary' });
  const canonical = locale === 'en' ? '/learn/glossary' : `/${locale}/learn/glossary`;

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical, languages: buildHreflangMap('/learn/glossary') },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: buildAbsoluteUrl(canonical),
      type: 'website',
    },
  };
}

export default async function GlossaryIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tGloss = await getTranslations({ locale, namespace: 'learn.glossary' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });
  const typedLocale = locale as Locale;

  const entries = getGlossaryEntries(typedLocale).slice().sort((a, b) =>
    a.frontmatter.title.localeCompare(b.frontmatter.title),
  );

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { label: tBreadcrumbs('home'), href: '/' },
            { label: tBreadcrumbs('learn'), href: '/learn' },
            { label: tBreadcrumbs('glossary') },
          ]}
        />

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-ipc-950 mb-2 text-balance">{tGloss('title')}</h1>
          <p className="text-base text-ipc-700 leading-relaxed">{tGloss('description')}</p>
        </header>

        {entries.length === 0 ? (
          <p className="text-sm text-ipc-500 italic">{tGloss('noTerms')}</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <Link
                key={e.urlPath}
                href={`/learn/glossary/${e.frontmatter.slug}`}
                className="block rounded-2xl bg-white border border-ipc-100 p-4 hover:border-ipc-300 hover:shadow-sm transition-all"
              >
                <h3 className="text-base font-semibold text-ipc-950 mb-0.5">
                  {e.frontmatter.title}
                </h3>
                <p className="text-sm text-ipc-600 line-clamp-2">{e.frontmatter.description}</p>
              </Link>
            ))}
          </div>
        )}

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
