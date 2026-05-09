/**
 * Locale-keyed text snippets for selectors.
 *
 * The walkthrough drives the UI through translated strings (the user
 * sees "Start tracking" in en, "Commencer le suivi" in fr, etc.). We
 * load each `messages/<locale>.json` once and surface the keys we need.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Locale = 'en' | 'fr' | 'es' | 'pt' | 'zh' | 'ar';

const cache = new Map<Locale, Record<string, unknown>>();

function loadMessages(locale: Locale): Record<string, unknown> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const path = resolve(process.cwd(), 'messages', `${locale}.json`);
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  cache.set(locale, parsed);
  return parsed;
}

/** Look up `landing.startTracking` etc. against the locale's messages file. */
export function t(locale: Locale, dottedKey: string): string {
  const parts = dottedKey.split('.');
  let cur: unknown = loadMessages(locale);
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      throw new Error(`Missing i18n key ${dottedKey} in locale ${locale}`);
    }
  }
  if (typeof cur !== 'string') {
    throw new Error(`i18n key ${dottedKey} for ${locale} is not a string`);
  }
  return cur;
}

/** Convenience getters for the strings the walkthrough needs. */
export const labels = {
  startTracking: (l: Locale) => t(l, 'landing.startTracking'),
  resumeTracking: (l: Locale) => t(l, 'landing.resumeTracking'),
  startNewTracking: (l: Locale) => t(l, 'landing.startNewTracking'),
  yesStartFresh: (l: Locale) => t(l, 'landing.yesStartFresh'),
  welcomeBack: (l: Locale) => t(l, 'landing.welcomeBack'),
  next: (l: Locale) => t(l, 'common.next'),
  back: (l: Locale) => t(l, 'common.back'),
  confirmAndStart: (l: Locale) => t(l, 'onboarding.confirmAndStart'),
  // ExportActions uses these keys (NOT the unused export.{down,share}Pdf
  // ones). exportSavePdf is shown when navigator.share isn't available;
  // exportSendPdf when it is.
  exportSavePdf: (l: Locale) => t(l, 'summary.exportSavePdf'),
  exportSendPdf: (l: Locale) => t(l, 'summary.exportSendPdf'),
  exportSaveCsv: (l: Locale) => t(l, 'summary.exportSaveCsv'),
  exportSendCsv: (l: Locale) => t(l, 'summary.exportSendCsv'),
  heroTitle: (l: Locale) => t(l, 'landing.heroTitle'),
  summaryHeroTitle: (l: Locale) => t(l, 'summary.heroTitle'),
  millilitres: (l: Locale) => t(l, 'common.millilitres'),
  fluidOunces: (l: Locale) => t(l, 'common.fluidOunces'),
};
