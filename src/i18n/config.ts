export const locales = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
