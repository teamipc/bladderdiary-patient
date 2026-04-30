import { locales, defaultLocale, type Locale } from './config';

export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  es: 'es_ES',
  pt: 'pt_PT',
  zh: 'zh_CN',
  ar: 'ar_SA',
};

export const HREFLANG: Record<Locale, string> = {
  en: 'en',
  fr: 'fr',
  es: 'es',
  pt: 'pt',
  zh: 'zh-Hans',
  ar: 'ar',
};

export const LOCALE_DIR: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  fr: 'ltr',
  es: 'ltr',
  pt: 'ltr',
  zh: 'ltr',
  ar: 'rtl',
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  zh: '中文',
  ar: 'العربية',
};

export function localizedPath(locale: Locale, path: string): string {
  if (locale === defaultLocale) {
    return path === '' ? '/' : path;
  }
  return path === '' || path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export function buildHreflangMap(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of locales) {
    out[HREFLANG[locale]] = localizedPath(locale, path);
  }
  out['x-default'] = localizedPath(defaultLocale, path);
  return out;
}

export function buildArticleHreflangMap(
  alternates: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [locale, path] of Object.entries(alternates)) {
    if (locales.includes(locale as Locale)) {
      out[HREFLANG[locale as Locale]] = path;
    }
  }
  if (alternates[defaultLocale]) {
    out['x-default'] = alternates[defaultLocale];
  }
  return out;
}
