import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import readingTimeFn from 'reading-time';
import { locales as allLocales, defaultLocale, type Locale } from '@/i18n/config';

const CONTENT_ROOT = path.join(process.cwd(), 'content');
const ARTICLES_ROOT = path.join(CONTENT_ROOT, 'articles');
const GLOSSARY_ROOT = path.join(CONTENT_ROOT, 'glossary');
const AUTHORS_ROOT = path.join(CONTENT_ROOT, 'authors');

export type Audience = 'men' | 'women';
export type PageType = 'pillar' | 'cluster' | 'glossary';

export interface Citation {
  title: string;
  source: string;
  url: string;
  year: number;
}

export interface ArticleFrontmatter {
  title: string;
  description: string;
  slug: string;
  topic: string;
  pageType: PageType;
  audience: Audience[];
  locale: Locale;
  author: string;
  publishedAt: string;
  updatedAt: string;
  medicallyReviewedBy?: string;
  lastReviewedAt?: string;
  citations?: Citation[];
  keywords?: string[];
  hero?: string;
  heroAlt?: string;
  relatedSlugs?: string[];
  readingTimeMin?: number;
  draft?: boolean;
  noindex?: boolean;
}

export interface Article {
  frontmatter: ArticleFrontmatter;
  body: string;
  filePath: string;
  urlPath: string;
  readingTimeMin: number;
}

export interface Author {
  slug: string;
  name: string;
  credentials: string;
  bio: string;
  affiliations?: string[];
  photoUrl?: string;
  linkedIn?: string;
}

const cache = {
  articles: null as Article[] | null,
  authors: null as Author[] | null,
};

function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function isMdxFile(name: string): boolean {
  return name.endsWith('.mdx') && !name.startsWith('.');
}

const RESERVED_TOPICS = new Set(['for-men', 'for-women', 'glossary', 'authors']);

function buildUrlPath(locale: Locale, segments: string[]): string {
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  return `${prefix}/${segments.join('/')}`;
}

function parseArticleFile(filePath: string, locale: Locale, topic: string): Article | null {
  if (RESERVED_TOPICS.has(topic)) {
    throw new Error(
      `[content] Topic folder "${topic}" conflicts with a reserved route. Rename the folder.`,
    );
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data as Partial<ArticleFrontmatter>;
  const fileName = path.basename(filePath, '.mdx');
  const isPillar = fileName === '_pillar';

  const required: Array<keyof ArticleFrontmatter> = [
    'title',
    'description',
    'topic',
    'pageType',
    'audience',
    'locale',
    'author',
    'publishedAt',
    'updatedAt',
  ];
  for (const key of required) {
    if (fm[key] === undefined || fm[key] === null) {
      throw new Error(`[content] ${filePath}: missing required frontmatter field "${key}"`);
    }
  }

  if (fm.locale !== locale) {
    throw new Error(`[content] ${filePath}: locale "${fm.locale}" does not match folder "${locale}"`);
  }
  if (fm.topic !== topic) {
    throw new Error(`[content] ${filePath}: topic "${fm.topic}" does not match folder "${topic}"`);
  }
  if (fm.draft) return null;

  const slug = isPillar ? '_pillar' : fileName;
  const segments = isPillar ? ['learn', topic] : ['learn', topic, slug];

  const stats = readingTimeFn(parsed.content);
  const readingTimeMin = fm.readingTimeMin ?? Math.max(1, Math.round(stats.minutes));

  const frontmatter: ArticleFrontmatter = {
    title: fm.title!,
    description: fm.description!,
    slug,
    topic,
    pageType: fm.pageType!,
    audience: fm.audience!,
    locale,
    author: fm.author!,
    publishedAt: fm.publishedAt!,
    updatedAt: fm.updatedAt!,
    medicallyReviewedBy: fm.medicallyReviewedBy,
    lastReviewedAt: fm.lastReviewedAt,
    citations: fm.citations,
    keywords: fm.keywords,
    hero: fm.hero,
    heroAlt: fm.heroAlt,
    relatedSlugs: fm.relatedSlugs,
    readingTimeMin,
    draft: fm.draft,
    noindex: fm.noindex,
  };

  return {
    frontmatter,
    body: parsed.content,
    filePath,
    urlPath: buildUrlPath(locale, segments),
    readingTimeMin,
  };
}

function loadAllArticles(): Article[] {
  // Skip in-memory cache in dev so MDX edits hot-reload without restarting the server
  if (process.env.NODE_ENV === 'production' && cache.articles) return cache.articles;
  const all: Article[] = [];

  for (const locale of allLocales) {
    const localeRoot = path.join(ARTICLES_ROOT, locale);
    const topics = safeReaddir(localeRoot);
    for (const topic of topics) {
      const topicDir = path.join(localeRoot, topic);
      if (!fs.statSync(topicDir).isDirectory()) continue;
      for (const file of safeReaddir(topicDir)) {
        if (!isMdxFile(file)) continue;
        const filePath = path.join(topicDir, file);
        const article = parseArticleFile(filePath, locale as Locale, topic);
        if (article) all.push(article);
      }
    }

    const glossaryRoot = path.join(GLOSSARY_ROOT, locale);
    for (const file of safeReaddir(glossaryRoot)) {
      if (!isMdxFile(file)) continue;
      const term = path.basename(file, '.mdx');
      const filePath = path.join(glossaryRoot, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(raw);
      const fm = parsed.data as Partial<ArticleFrontmatter>;
      if (fm.draft) continue;
      const stats = readingTimeFn(parsed.content);
      const readingTimeMin = fm.readingTimeMin ?? Math.max(1, Math.round(stats.minutes));
      all.push({
        frontmatter: {
          title: fm.title ?? term,
          description: fm.description ?? '',
          slug: term,
          topic: 'glossary',
          pageType: 'glossary',
          audience: fm.audience ?? ['men', 'women'],
          locale: locale as Locale,
          author: fm.author ?? '',
          publishedAt: fm.publishedAt ?? '',
          updatedAt: fm.updatedAt ?? '',
          medicallyReviewedBy: fm.medicallyReviewedBy,
          lastReviewedAt: fm.lastReviewedAt,
          citations: fm.citations,
          keywords: fm.keywords,
          readingTimeMin,
        },
        body: parsed.content,
        filePath,
        urlPath: buildUrlPath(locale as Locale, ['learn', 'glossary', term]),
        readingTimeMin,
      });
    }
  }

  cache.articles = all;
  return all;
}

function loadAllAuthors(): Author[] {
  if (process.env.NODE_ENV === 'production' && cache.authors) return cache.authors;
  const list: Author[] = [];
  for (const file of safeReaddir(AUTHORS_ROOT)) {
    if (!file.endsWith('.json')) continue;
    const raw = fs.readFileSync(path.join(AUTHORS_ROOT, file), 'utf8');
    const data = JSON.parse(raw) as Author;
    list.push(data);
  }
  cache.authors = list;
  return list;
}

export function getAllArticles(locale: Locale): Article[] {
  return loadAllArticles().filter((a) => a.frontmatter.locale === locale);
}

export function getClusterArticles(locale: Locale): Article[] {
  return getAllArticles(locale).filter((a) => a.frontmatter.pageType === 'cluster');
}

export function getPillarArticles(locale: Locale): Article[] {
  return getAllArticles(locale).filter((a) => a.frontmatter.pageType === 'pillar');
}

export function getGlossaryEntries(locale: Locale): Article[] {
  return getAllArticles(locale).filter((a) => a.frontmatter.pageType === 'glossary');
}

export function getArticle(locale: Locale, topic: string, slug: string): Article | null {
  return (
    getAllArticles(locale).find(
      (a) => a.frontmatter.topic === topic && a.frontmatter.slug === slug,
    ) ?? null
  );
}

export function getPillar(locale: Locale, topic: string): Article | null {
  return (
    getAllArticles(locale).find(
      (a) => a.frontmatter.topic === topic && a.frontmatter.pageType === 'pillar',
    ) ?? null
  );
}

export function getArticlesInTopic(locale: Locale, topic: string): Article[] {
  return getAllArticles(locale).filter(
    (a) => a.frontmatter.topic === topic && a.frontmatter.pageType === 'cluster',
  );
}

export function getArticlesForAudience(locale: Locale, audience: Audience): Article[] {
  return getAllArticles(locale).filter(
    (a) =>
      a.frontmatter.pageType !== 'glossary' &&
      a.frontmatter.audience.includes(audience),
  );
}

export function getGlossaryEntry(locale: Locale, term: string): Article | null {
  return (
    getAllArticles(locale).find(
      (a) => a.frontmatter.pageType === 'glossary' && a.frontmatter.slug === term,
    ) ?? null
  );
}

export function getAllTopics(locale: Locale): string[] {
  const topics = new Set<string>();
  for (const a of getAllArticles(locale)) {
    if (a.frontmatter.pageType !== 'glossary') topics.add(a.frontmatter.topic);
  }
  return Array.from(topics).sort();
}

export function getAllAuthors(): Author[] {
  return loadAllAuthors();
}

export function getAuthor(slug: string): Author | null {
  return loadAllAuthors().find((a) => a.slug === slug) ?? null;
}

export function getRelatedArticles(article: Article, max = 3): Article[] {
  const explicit = article.frontmatter.relatedSlugs ?? [];
  const all = getAllArticles(article.frontmatter.locale);
  const byExplicit = explicit
    .map((slug) => all.find((a) => a.frontmatter.slug === slug))
    .filter(Boolean) as Article[];

  if (byExplicit.length >= max) return byExplicit.slice(0, max);

  const sameTopic = all.filter(
    (a) =>
      a.frontmatter.topic === article.frontmatter.topic &&
      a.frontmatter.slug !== article.frontmatter.slug &&
      a.frontmatter.pageType === 'cluster' &&
      !byExplicit.some((b) => b.frontmatter.slug === a.frontmatter.slug),
  );

  return [...byExplicit, ...sameTopic].slice(0, max);
}

export const SITE_URL = 'https://myflowcheck.com';

export function buildAbsoluteUrl(urlPath: string): string {
  return `${SITE_URL}${urlPath}`;
}

export function getArticleAlternates(article: Article): Record<string, string> {
  const fm = article.frontmatter;
  if (fm.pageType === 'glossary') return {};
  const all = loadAllArticles();
  const out: Record<string, string> = {};
  for (const candidate of all) {
    const cfm = candidate.frontmatter;
    if (cfm.topic === fm.topic && cfm.slug === fm.slug) {
      const path =
        cfm.pageType === 'pillar'
          ? `/learn/${cfm.topic}`
          : `/learn/${cfm.topic}/${cfm.slug}`;
      out[cfm.locale] = cfm.locale === defaultLocale ? path : `/${cfm.locale}${path}`;
    }
  }
  return out;
}

export function countWords(body: string): number {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#>*_\-`[\]()!|]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
