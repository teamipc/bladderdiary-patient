import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getAuthor, type Article } from '@/lib/content';
import { type Locale } from '@/i18n/config';
import { authorInitials, formatBylineMeta } from '@/lib/authorByline';

export default async function ArticleCard({ article }: { article: Article }) {
  const fm = article.frontmatter;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'learn' });
  const author = getAuthor(fm.author);
  const initials = authorInitials(author?.name);
  const meta = formatBylineMeta({
    publishedAt: fm.publishedAt,
    updatedAt: fm.updatedAt,
    lastReviewedAt: fm.lastReviewedAt,
    readingTimeMin: article.readingTimeMin,
    locale,
    labels: {
      published: t('article.published'),
      updated: t('article.updated'),
      reviewed: t('article.reviewed'),
      readingTime: (n: number) => t('article.readingTime', { minutes: n }),
    },
  });

  return (
    <Link
      href={article.urlPath.replace(/^\/(en|fr|es)/, '')}
      className="group block rounded-2xl bg-white border border-ipc-100 hover:border-ipc-300 hover:shadow-md transition-all overflow-hidden"
    >
      <div className="aspect-[3/2] relative overflow-hidden bg-gradient-to-br from-ipc-100 to-ipc-200">
        {fm.hero && (
          <Image
            src={fm.hero}
            alt={fm.heroAlt ?? ''}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        )}
      </div>
      <div className="p-5">
        {fm.audience.length === 1 && (
          <div className="mb-2">
            <span className="inline-block text-xs uppercase tracking-wider text-ipc-700 font-semibold">
              {fm.audience[0] === 'men' ? t('audience.men') : t('audience.women')}
            </span>
          </div>
        )}
        <h3 className="text-xl md:text-2xl font-semibold text-ipc-950 leading-tight tracking-tight mb-2 group-hover:text-ipc-700 transition-colors">
          {fm.title}
        </h3>
        <p className="text-base text-ipc-700 leading-relaxed mb-4 line-clamp-3">
          {fm.description}
        </p>
        <div className="flex items-center gap-2.5 pt-3 border-t border-ipc-100">
          <div
            aria-hidden
            className="w-9 h-9 rounded-full bg-ipc-100 text-ipc-700 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden"
          >
            {author?.photoUrl ? (
              <Image
                src={author.photoUrl}
                alt=""
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm font-medium text-ipc-900 truncate">
              {author?.name ?? 'Bladder Diaries Team'}
            </span>
            <span className="text-xs text-ipc-600 mt-0.5 truncate">{meta}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
