import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

interface DiaryCtaProps {
  title?: string;
  body?: string;
  /**
   * Slug of the article hosting this CTA, threaded into utm_content so
   * Vercel Analytics can attribute conversions to specific articles.
   */
  utmContent?: string;
}

export default async function DiaryCta({ title, body, utmContent }: DiaryCtaProps) {
  const t = await getTranslations('learn.article');
  const href = {
    pathname: '/',
    query: {
      utm_source: 'learn',
      utm_medium: 'article-cta',
      utm_campaign: 'start-diary',
      ...(utmContent ? { utm_content: utmContent } : {}),
    },
  } as const;

  return (
    <aside className="not-prose my-9 sm:my-10 rounded-2xl bg-gradient-to-br from-ipc-100 to-ipc-50 border border-ipc-200 p-5 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-ipc-950 mb-2 leading-tight tracking-tight">
        {title ?? t('ctaTitle')}
      </h3>
      <p className="text-base text-ipc-700 mb-4 leading-relaxed">
        {body ?? t('ctaDescription')}
      </p>
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-ipc-700 hover:bg-ipc-800 text-white no-underline font-semibold text-sm sm:text-base shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
      >
        <span>{t('ctaStartDiary')}</span>
        <ArrowRight size={16} aria-hidden className="rtl:scale-x-[-1]" />
      </Link>
    </aside>
  );
}
