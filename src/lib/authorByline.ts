import type { Locale } from '@/i18n/config';

export function authorInitials(input?: string | null): string {
  if (!input) return '·';
  let name = input.replace(/^Dr\.\s*/i, '');
  const commaIdx = name.indexOf(',');
  if (commaIdx >= 0) name = name.slice(0, commaIdx);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function parseIsoAsUtc(iso: string): Date | null {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const date = new Date(dateOnly ? `${iso}T00:00:00Z` : iso);
  return isNaN(date.getTime()) ? null : date;
}

const LOCALE_TAG: Record<Locale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  pt: 'pt-PT',
  zh: 'zh-CN',
  ar: 'ar-SA',
};

function localeTag(locale: Locale): string {
  return LOCALE_TAG[locale] ?? 'en-US';
}

export function formatDate(iso: string | undefined, locale: Locale): string {
  if (!iso) return '';
  const date = parseIsoAsUtc(iso);
  if (!date) return '';
  return date.toLocaleDateString(localeTag(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateShort(iso: string | undefined, locale: Locale): string {
  if (!iso) return '';
  const date = parseIsoAsUtc(iso);
  if (!date) return '';
  return date.toLocaleDateString(localeTag(locale), {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

interface BylineMetaInput {
  publishedAt?: string;
  updatedAt?: string;
  lastReviewedAt?: string;
  readingTimeMin: number;
  locale: Locale;
  labels: {
    published: string;
    updated: string;
    reviewed: string;
    readingTime: (min: number) => string;
  };
}

export function formatBylineMeta(input: BylineMetaInput): string {
  const { publishedAt, updatedAt, lastReviewedAt, readingTimeMin, locale, labels } = input;
  const segments: string[] = [];

  if (publishedAt) {
    segments.push(`${labels.published} ${formatDate(publishedAt, locale)}`);
  }

  if (updatedAt && publishedAt && updatedAt > publishedAt) {
    segments.push(`${labels.updated} ${formatDateShort(updatedAt, locale)}`);
  }

  if (
    lastReviewedAt &&
    (!updatedAt || lastReviewedAt > updatedAt) &&
    (!publishedAt || lastReviewedAt > publishedAt)
  ) {
    segments.push(`${labels.reviewed} ${formatDateShort(lastReviewedAt, locale)}`);
  }

  segments.push(labels.readingTime(readingTimeMin));

  return segments.join(' · ');
}
