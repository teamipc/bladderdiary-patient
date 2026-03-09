import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import AppShell from '@/components/layout/AppShell';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://myflowcheck.com'),
  title: {
    default: 'My Flow Check | 3-Day Bladder Diary Tracker',
    template: '%s | My Flow Check',
  },
  description:
    'Track when you drink, when you pee, and the patterns behind it in 3 days. A simple bladder diary tool to help you and your health professional.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'My Flow Check | 3-Day Bladder Diary Tracker',
    description:
      'Track when you drink, when you pee, and the patterns behind it in 3 days. A simple bladder diary tool to help you and your health professional.',
    url: 'https://myflowcheck.com',
    siteName: 'My Flow Check',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'My Flow Check, a 3-day bladder diary tracker',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Flow Check | 3-Day Bladder Diary Tracker',
    description:
      'Track when you drink, when you pee, and the patterns behind it in 3 days. A simple bladder diary tool to help you and your health professional.',
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#c4984a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-surface text-ipc-950 antialiased font-sans">
        <AppShell>
          {children}
        </AppShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
