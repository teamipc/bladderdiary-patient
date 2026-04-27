import type { Metadata } from 'next';
import { ChevronLeft, Mail } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'help' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `/${locale}/help`,
    },
  };
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'help' });
  const tc = await getTranslations({ locale, namespace: 'common' });

  const faqItems = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') },
    { q: t('q4'), a: t('a4') },
    { q: t('q5'), a: t('a5') },
    { q: t('q6'), a: t('a6') },
    { q: t('q7'), a: t('a7') },
    { q: t('q8'), a: t('a8') },
    { q: t('q9'), a: t('a9') },
  ];

  return (
    <div className="bg-surface">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            href="/summary"
            className="inline-flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors mb-3"
          >
            <ChevronLeft size={20} />
            <span className="text-base font-medium">{tc('back')}</span>
          </Link>
          <h1 className="text-xl font-bold text-ipc-900 text-balance">
            {t('title')}
          </h1>
        </div>
        <div className="space-y-4">
          {faqItems.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl bg-white border border-ipc-100 overflow-hidden"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer
                list-none text-base font-semibold text-ipc-950
                [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronLeft
                  size={18}
                  className="text-ipc-400 transition-transform -rotate-90
                    group-open:rotate-[-270deg] shrink-0 ml-2"
                />
              </summary>
              <div className="px-5 pb-4 text-base text-ipc-700 leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 space-y-4 text-center">
          <p className="text-sm text-ipc-400">
            {t('stillHaveQuestions')}
          </p>
          <div className="rounded-2xl bg-white border border-ipc-100 p-4">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Mail size={16} className="text-ipc-400" />
              <p className="text-sm font-semibold text-ipc-700">
                {t('haveSuggestion')}
              </p>
            </div>
            <p className="text-sm text-ipc-500 leading-relaxed">
              {t('suggestionBody')}{' '}
              <a
                href="mailto:hello@myflowcheck.com"
                className="text-ipc-600 font-semibold underline underline-offset-2"
              >
                hello@myflowcheck.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
