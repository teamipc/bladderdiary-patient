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
  const t = await getTranslations({ locale, namespace: 'terms' });
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: {
      canonical: `/${locale}/terms`,
    },
  };
}

export default async function TermsOfUsePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('terms');

  const richStrong = {
    strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
  };

  const richPrivacyLink = {
    privacyLink: (chunks: React.ReactNode) => (
      <Link
        href="/privacy"
        className="text-ipc-600 underline underline-offset-2 hover:text-ipc-800"
      >
        {chunks}
      </Link>
    ),
  };

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
            <p>{t.rich('intro', richStrong)}</p>
          </section>

          {/* 1. Acceptance */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section1Title')}
            </h2>
            <p>{t.rich('section1Text', richPrivacyLink)}</p>
          </section>

          {/* 2. Description */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section2Title')}
            </h2>
            <p>{t('section2Text')}</p>
          </section>

          {/* 3. Not Medical */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section3Title')}
            </h2>
            <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-medium mb-3">
              {t('section3Disclaimer')}
            </p>
            <p>{t('section3Text')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t.rich('section3Item1', richStrong)}</li>
              <li>{t.rich('section3Item2', richStrong)}</li>
              <li>{t.rich('section3Item3', richStrong)}</li>
              <li>{t.rich('section3Item4', richStrong)}</li>
              <li>{t('section3Item5')}</li>
            </ul>
            <p className="mt-3 font-semibold text-ipc-900">
              {t('section3Warning')}
            </p>
          </section>

          {/* 4. Eligibility */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section4Title')}
            </h2>
            <p>{t('section4Text')}</p>
          </section>

          {/* 5. User Responsibilities */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section5Title')}
            </h2>
            <p>{t('section5Text')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section5Item1')}</li>
              <li>{t('section5Item2')}</li>
              <li>{t('section5Item3')}</li>
              <li>{t('section5Item4')}</li>
              <li>{t('section5Item5')}</li>
              <li>{t('section5Item6')}</li>
              <li>{t('section5Item7')}</li>
              <li>{t('section5Item8')}</li>
            </ul>
          </section>

          {/* 6. Data & Privacy */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section6Title')}
            </h2>
            <p>{t.rich('section6Text', richPrivacyLink)}</p>
            <p className="mt-2">{t('section6Acknowledge')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section6Item1')}</li>
              <li>{t('section6Item2')}</li>
              <li>{t('section6Item3')}</li>
              <li>{t('section6Item4')}</li>
            </ul>
          </section>

          {/* 7. Export Feature */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section7Title')}
            </h2>
            <p>{t('section7Text')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section7Item1')}</li>
              <li>{t('section7Item2')}</li>
              <li>{t('section7Item3')}</li>
              <li>{t('section7Item4')}</li>
            </ul>
          </section>

          {/* 8. Intellectual Property */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section8Title')}
            </h2>
            <p>{t('section8Text')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section8Item1')}</li>
              <li>{t('section8Item2')}</li>
              <li>{t('section8Item3')}</li>
            </ul>
          </section>

          {/* 9. Disclaimers */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section9Title')}
            </h2>
            <p className="uppercase text-xs font-bold text-ipc-500 tracking-wide mb-2">
              {t('section9Important')}
            </p>
            <div className="p-3 rounded-xl bg-ipc-50 border border-ipc-100 space-y-3">
              <p>{t('section9Disclaimer1')}</p>
              <p>{t('section9Disclaimer2')}</p>
              <p>{t('section9Disclaimer3')}</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>{t('section9DamageItem1')}</li>
                <li>{t('section9DamageItem2')}</li>
                <li>{t('section9DamageItem3')}</li>
                <li>{t('section9DamageItem4')}</li>
                <li>{t('section9DamageItem5')}</li>
                <li>{t('section9DamageItem6')}</li>
                <li>{t('section9DamageItem7')}</li>
                <li>{t('section9DamageItem8')}</li>
              </ul>
              <p>{t('section9Disclaimer4')}</p>
            </div>
          </section>

          {/* 10. Indemnification */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section10Title')}
            </h2>
            <p>{t('section10Text')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section10Item1')}</li>
              <li>{t('section10Item2')}</li>
              <li>{t('section10Item3')}</li>
              <li>{t('section10Item4')}</li>
              <li>{t('section10Item5')}</li>
              <li>{t('section10Item6')}</li>
            </ul>
          </section>

          {/* 11. Assumption of Risk */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section11Title')}
            </h2>
            <p>{t('section11Text')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section11Item1')}</li>
              <li>{t('section11Item2')}</li>
              <li>{t('section11Item3')}</li>
              <li>{t('section11Item4')}</li>
              <li>{t('section11Item5')}</li>
            </ul>
          </section>

          {/* 12. Notifications */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section12Title')}
            </h2>
            <p>{t('section12Text')}</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>{t('section12Item1')}</li>
              <li>{t('section12Item2')}</li>
              <li>{t('section12Item3')}</li>
              <li>{t('section12Item4')}</li>
            </ul>
          </section>

          {/* 13. Third-Party */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section13Title')}
            </h2>
            <p>{t('section13Text')}</p>
          </section>

          {/* 14. Termination */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section14Title')}
            </h2>
            <p>{t('section14Text')}</p>
          </section>

          {/* 15. Governing Law */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section15Title')}
            </h2>
            <p>{t('section15Text')}</p>
          </section>

          {/* 16. Severability */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section16Title')}
            </h2>
            <p>{t('section16Text')}</p>
          </section>

          {/* 17. Entire Agreement */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section17Title')}
            </h2>
            <p>{t.rich('section17Text', richPrivacyLink)}</p>
          </section>

          {/* 18. Contact */}
          <section>
            <h2 className="text-base font-bold text-ipc-950 mb-2">
              {t('section18Title')}
            </h2>
            <p>{t('section18Text')}</p>
            <div className="mt-2 p-3 rounded-xl bg-ipc-50 border border-ipc-100">
              <p className="font-semibold text-ipc-900">
                {t('contactCompany')}
              </p>
              <p className="text-ipc-600 mt-1">{t('contactEmail')}</p>
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
