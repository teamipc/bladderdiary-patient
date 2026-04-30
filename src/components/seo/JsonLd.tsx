import type { Article, Author } from '@/lib/content';
import { buildAbsoluteUrl, countWords, SITE_URL } from '@/lib/content';

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url.startsWith('http') ? item.url : buildAbsoluteUrl(item.url),
        })),
      }}
    />
  );
}

export function ArticleJsonLd({
  article,
  author,
  reviewer,
}: {
  article: Article;
  author: Author | null;
  reviewer: Author | null;
}) {
  const fm = article.frontmatter;
  const url = buildAbsoluteUrl(article.urlPath);
  const isMedical = fm.pageType !== 'glossary';

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': isMedical ? 'MedicalWebPage' : 'DefinedTerm',
    headline: fm.title,
    name: fm.title,
    description: fm.description,
    url,
    inLanguage: fm.locale,
    datePublished: fm.publishedAt || undefined,
    dateModified: fm.updatedAt || undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isAccessibleForFree: true,
    wordCount: countWords(article.body),
    timeRequired: `PT${article.readingTimeMin}M`,
  };

  if (fm.keywords && fm.keywords.length > 0) {
    data.keywords = fm.keywords.join(', ');
  }

  if (isMedical) {
    data.articleSection = fm.topic.replace(/-/g, ' ');
  }

  if (fm.lastReviewedAt) {
    data.lastReviewed = fm.lastReviewedAt;
  }

  if (fm.audience) {
    data.audience = fm.audience.map((a) => ({
      '@type': 'PeopleAudience',
      audienceType: a === 'men' ? 'Men' : 'Women',
    }));
  }

  if (fm.hero) {
    data.image = {
      '@type': 'ImageObject',
      url: buildAbsoluteUrl(fm.hero),
      width: 1200,
      height: 630,
    };
  }

  if (author) {
    data.author = {
      '@type': 'Person',
      name: author.name,
      jobTitle: author.credentials,
      url: buildAbsoluteUrl(`/learn/authors/${author.slug}`),
    };
  }

  if (reviewer) {
    data.reviewedBy = {
      '@type': 'Person',
      name: reviewer.name,
      jobTitle: reviewer.credentials,
      url: buildAbsoluteUrl(`/learn/authors/${reviewer.slug}`),
    };
  }

  if (fm.citations && fm.citations.length > 0) {
    data.citation = fm.citations.map((c) => ({
      '@type': 'CreativeWork',
      name: c.title,
      url: c.url,
      publisher: c.source,
      datePublished: String(c.year),
    }));
  }

  data.publisher = {
    '@type': 'Organization',
    name: 'My Flow Check',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
    email: 'hello@myflowcheck.com',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@myflowcheck.com',
      availableLanguage: ['en', 'fr', 'es', 'pt', 'zh', 'ar'],
    },
  };

  return <JsonLd data={data} />;
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'My Flow Check',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
        email: 'hello@myflowcheck.com',
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'hello@myflowcheck.com',
          availableLanguage: ['en', 'fr', 'es', 'pt', 'zh', 'ar'],
        },
      }}
    />
  );
}

export function PersonJsonLd({ author }: { author: Author }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: author.name,
        jobTitle: author.credentials,
        description: author.bio,
        affiliation: author.affiliations?.map((a) => ({ '@type': 'Organization', name: a })),
        image: author.photoUrl ? buildAbsoluteUrl(author.photoUrl) : undefined,
        sameAs: author.linkedIn ? [author.linkedIn] : undefined,
        url: buildAbsoluteUrl(`/learn/authors/${author.slug}`),
      }}
    />
  );
}

export function CollectionPageJsonLd({
  name,
  description,
  url,
  itemUrls,
}: {
  name: string;
  description: string;
  url: string;
  itemUrls: string[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        description,
        url: buildAbsoluteUrl(url),
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: itemUrls.map((u, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: buildAbsoluteUrl(u),
          })),
        },
      }}
    />
  );
}
