import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  getAllAuthors,
  getAuthor,
  getAllArticles,
  buildAbsoluteUrl,
} from '@/lib/content';
import { locales, type Locale } from '@/i18n/config';
import { buildHreflangMap } from '@/i18n/seo';
import Breadcrumbs from '@/components/learn/Breadcrumbs';
import ArticleCard from '@/components/learn/ArticleCard';
import Disclaimer from '@/components/learn/Disclaimer';
import { PersonJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

interface PageParams {
  locale: string;
  slug: string;
}

export async function generateStaticParams() {
  const all: PageParams[] = [];
  for (const locale of locales) {
    for (const a of getAllAuthors()) {
      all.push({ locale, slug: a.slug });
    }
  }
  if (all.length === 0) {
    return locales.map((locale) => ({ locale, slug: '__none__' }));
  }
  return all;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = getAuthor(slug);
  if (!author) return {};
  const canonical =
    locale === 'en' ? `/learn/authors/${slug}` : `/${locale}/learn/authors/${slug}`;

  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical, languages: buildHreflangMap(`/learn/authors/${slug}`) },
    openGraph: {
      title: author.name,
      description: author.bio,
      url: buildAbsoluteUrl(canonical),
      type: 'profile',
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const typedLocale = locale as Locale;
  const t = await getTranslations({ locale, namespace: 'learn' });
  const tAuthor = await getTranslations({ locale, namespace: 'learn.author' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'learn.breadcrumbs' });

  const author = getAuthor(slug);
  if (!author) notFound();

  const all = getAllArticles(typedLocale);
  const authored = all.filter((a) => a.frontmatter.author === slug);
  const reviewed = all.filter((a) => a.frontmatter.medicallyReviewedBy === slug);

  const breadcrumbs = [
    { label: tBreadcrumbs('home'), href: '/' },
    { label: tBreadcrumbs('learn'), href: '/learn' },
    { label: tBreadcrumbs('authors') },
    { label: author.name },
  ];

  return (
    <div className="bg-surface min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbs} />
        <BreadcrumbJsonLd
          items={breadcrumbs.map((b) => ({
            name: b.label,
            url: b.href ?? `/learn/authors/${slug}`,
          }))}
        />
        <PersonJsonLd author={author} />

        <header className="mb-6 flex items-start gap-4">
          {author.photoUrl && (
            <Image
              src={author.photoUrl}
              alt={author.name}
              width={80}
              height={80}
              className="rounded-full bg-ipc-50"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-ipc-950 mb-1 leading-tight">{author.name}</h1>
            {author.credentials && (
              <p className="text-sm text-ipc-600 mb-2">{author.credentials}</p>
            )}
            {author.linkedIn && (
              <a
                href={author.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ipc-700 underline underline-offset-2 hover:text-ipc-900"
              >
                LinkedIn
              </a>
            )}
          </div>
        </header>

        <p className="text-base text-ipc-800 leading-relaxed mb-6">{author.bio}</p>

        {author.affiliations && author.affiliations.length > 0 && (
          <section className="mb-8 rounded-2xl bg-white border border-ipc-100 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ipc-500 mb-2">
              {tAuthor('affiliations')}
            </h2>
            <ul className="text-sm text-ipc-800 space-y-1">
              {author.affiliations.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {authored.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ipc-700 mb-5">
              {tAuthor('articlesAuthored', { name: author.name })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {authored.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
          </section>
        )}

        {reviewed.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ipc-700 mb-5">
              {tAuthor('articlesReviewed', { name: author.name })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {reviewed.map((a) => (
                <ArticleCard key={a.urlPath} article={a} />
              ))}
            </div>
          </section>
        )}

        {authored.length === 0 && reviewed.length === 0 && (
          <p className="text-sm text-ipc-500 italic">{tAuthor('noArticles')}</p>
        )}

        <div className="mt-8">
          <Link href="/learn" className="text-sm text-ipc-700 underline underline-offset-2 hover:text-ipc-900">
            ← {tBreadcrumbs('learn')}
          </Link>
        </div>

        <Disclaimer text={t('disclaimer')} />
      </div>
    </div>
  );
}
