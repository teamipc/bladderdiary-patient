import { setRequestLocale, getTranslations } from 'next-intl/server';
import LandingContentWrapper from './LandingContent';
import { HowToJsonLd, SoftwareApplicationJsonLd } from '@/components/seo/JsonLd';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'howto' });

  return (
    <>
      <SoftwareApplicationJsonLd inLanguage={locale} />
      <HowToJsonLd
        url={`/${locale}`}
        inLanguage={locale}
        name={t('name')}
        description={t('description')}
        totalTime="P3D"
        image="/opengraph-image.png"
        steps={[
          { name: t('step1Name'), text: t('step1Text') },
          { name: t('step2Name'), text: t('step2Text') },
          { name: t('step3Name'), text: t('step3Text') },
          { name: t('step4Name'), text: t('step4Text') },
          { name: t('step5Name'), text: t('step5Text') },
        ]}
      />
      <LandingContentWrapper />
    </>
  );
}
