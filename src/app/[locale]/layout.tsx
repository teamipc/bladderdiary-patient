import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import AppShell from '@/components/layout/AppShell';
import { locales } from '@/i18n/config';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const t = messages.metadata;

  return {
    metadataBase: new URL('https://myflowcheck.com'),
    title: {
      default: t.title,
      template: t.titleTemplate,
    },
    description: t.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        fr: '/fr',
        es: '/es',
      },
    },
    openGraph: {
      title: t.title,
      description: t.description,
      url: `https://myflowcheck.com/${locale}`,
      siteName: 'My Flow Check',
      images: [
        {
          url: '/opengraph-image.png',
          width: 1200,
          height: 630,
          alt: t.ogImageAlt,
        },
      ],
      locale: locale === 'fr' ? 'fr_FR' : locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.title,
      description: t.description,
      images: ['/opengraph-image.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: '/icon.svg',
      apple: '/icon-192.png',
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'My Flow Check',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow zoom for accessibility (WCAG 1.4.4). Older users with reading
  // glasses sometimes pinch-zoom small text; blocking that is a barrier
  // for the exact demographic this app is built for.
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#c4984a',
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-surface text-ipc-950 antialiased font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppShell>
            {children}
          </AppShell>
        </NextIntlClientProvider>
        <ServiceWorkerRegistration />
        <Analytics />
      </body>
    </html>
  );
}
