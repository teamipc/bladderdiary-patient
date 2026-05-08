import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, BookOpen, Home, NotebookPen } from 'lucide-react';
import { buildAbsoluteUrl } from '@/lib/content';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'notFound' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: true },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      url: buildAbsoluteUrl(`/${locale}`),
      type: 'website',
    },
  };
}

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'notFound' });

  const links = [
    { href: '/', label: t('homeLink'), icon: Home },
    { href: '/learn', label: t('learnLink'), icon: BookOpen },
    { href: '/', label: t('diaryLink'), icon: NotebookPen },
  ] as const;

  return (
    <div className="bg-surface min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-ipc-500 mb-3">404</p>
        <h1 className="text-3xl md:text-4xl font-bold text-ipc-950 mb-4 text-balance leading-tight tracking-tight">
          {t('heading')}
        </h1>
        <p className="text-base md:text-lg text-ipc-700 leading-relaxed mb-8">
          {t('body')}
        </p>

        <ul className="space-y-3 text-start">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                className="group flex items-center gap-3 rounded-2xl bg-white border border-ipc-100 hover:border-ipc-300 hover:shadow-sm px-4 py-3 transition-all"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-ipc-50 text-ipc-700 shrink-0">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="flex-1 text-base font-medium text-ipc-900">{label}</span>
                <ArrowRight
                  size={18}
                  aria-hidden
                  className="text-ipc-400 group-hover:text-ipc-700 transition-colors rtl:scale-x-[-1]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
