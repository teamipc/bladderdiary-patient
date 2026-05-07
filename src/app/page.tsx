import type { Metadata } from 'next';
import { buildHreflangMap } from '@/i18n/seo';
import LocaleRedirect from './LocaleRedirect';

export const metadata: Metadata = {
  metadataBase: new URL('https://myflowcheck.com'),
  alternates: {
    canonical: '/en',
    languages: buildHreflangMap('/'),
  },
};

export default function RootPage() {
  return <LocaleRedirect />;
}
