import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Bladder Diary — IPC',
  description: 'Track your 3-day bladder diary for your clinician. No account needed.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bladder Diary',
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
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
