import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/privacy`,
    },
  };
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('privacy');

  return (
    <div className="bg-surface min-h-dvh">
      <div className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/"
            className="flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-base font-medium">{t('back')}</span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-ipc-950 mb-1">{t('title')}</h1>
        <p className="text-xs text-ipc-400 mb-6">{t('lastUpdated')}</p>

        <div className="space-y-6 text-sm text-ipc-700 leading-relaxed">
          {/* Intro */}
          <section>
            <p>
              {t.rich('intro', {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
            <p className="mt-2 p-3 rounded-xl bg-success-light border border-success/20 text-success font-medium">
              {t('shortVersion')}
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section1Title')}</h2>
            <p className="font-semibold text-ipc-900 mb-1">{t('section1Heading')}</p>
            <p>
              {t('section1Text')}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section1Item1')}</li>
              <li>{t('section1Item2')}</li>
              <li>{t('section1Item3')}</li>
              <li>{t('section1Item4')}</li>
            </ul>
          </section>

          {/* 2. How Your Data Is Stored */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section2Title')}</h2>
            <p>
              {t('section2Text')}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t.rich('section2Item1', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t.rich('section2Item2', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t.rich('section2Item3', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t.rich('section2Item4', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
            </ul>
          </section>

          {/* 3. Health Information */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section3Title')}</h2>
            <p>
              {t('section3Text')}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t.rich('section3Item1', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t('section3Item2')}</li>
              <li>{t('section3Item3')}</li>
            </ul>
          </section>

          {/* 4. Data Export */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section4Title')}</h2>
            <p>
              {t('section4Text')}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section4Item1')}</li>
              <li>{t('section4Item2')}</li>
              <li>{t('section4Item3')}</li>
              <li>{t('section4Item4')}</li>
            </ul>
          </section>

          {/* 5. Cookies & Analytics */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section5Title')}</h2>
            <p>
              {t.rich('section5Text', { strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section5Item1')}</li>
              <li>{t('section5Item2')}</li>
              <li>{t('section5Item3')}</li>
              <li>{t('section5Item4')}</li>
              <li>{t('section5Item5')}</li>
            </ul>
            <p className="mt-2">
              {t('section5Footer')}
            </p>
          </section>

          {/* 6. Notifications */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section6Title')}</h2>
            <p>
              {t('section6Text')}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section6Item1')}</li>
              <li>{t('section6Item2')}</li>
              <li>{t('section6Item3')}</li>
            </ul>
          </section>

          {/* 7. Children */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section7Title')}</h2>
            <p>
              {t('section7Text')}
            </p>
          </section>

          {/* 8. Third Parties */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section8Title')}</h2>
            <p>
              {t('section8Text')}
            </p>
          </section>

          {/* 9. Data Retention */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section9Title')}</h2>
            <p>
              {t('section9Text')}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t.rich('section9Item1', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t.rich('section9Item2', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t.rich('section9Item3', { strong: (chunks) => <strong>{chunks}</strong> })}</li>
            </ul>
          </section>

          {/* 10. Security */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section10Title')}</h2>
            <p>
              {t('section10Text')}
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section10Item1')}</li>
              <li>{t('section10Item2')}</li>
              <li>{t('section10Item3')}</li>
            </ul>
          </section>

          {/* 11. Changes */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section11Title')}</h2>
            <p>
              {t('section11Text')}
            </p>
          </section>

          {/* 12. Your Rights */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section12Title')}</h2>
            <p>
              {t('section12Text')}
            </p>
          </section>

          {/* 13. Contact */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">{t('section13Title')}</h2>
            <p>
              {t('section13Text')}
            </p>
            <div className="mt-2 p-3 rounded-xl bg-ipc-50 border border-ipc-100">
              <p className="font-semibold text-ipc-900">Integrated Pelvic Care Inc.</p>
              <p className="text-ipc-600 mt-1">Email: privacy@integratedpelviccare.com</p>
            </div>
          </section>

          {/* Closing */}
          <section className="pt-4 border-t border-ipc-100">
            <p className="text-xs text-ipc-400 text-center">
              {t('copyright', { year: new Date().getFullYear() })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
