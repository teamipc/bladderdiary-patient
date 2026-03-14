import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import DayPageClient from './DayPageClient';
import { locales } from '@/i18n/config';

export function generateStaticParams() {
  const days = ['1', '2', '3'];
  return locales.flatMap((locale) =>
    days.map((dayNumber) => ({ locale, dayNumber }))
  );
}

export default async function DayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <DayPageClient />
    </Suspense>
  );
}
