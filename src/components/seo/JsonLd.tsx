import type { Article, Author } from '@/lib/content';
import { buildAbsoluteUrl, countWords, SITE_URL } from '@/lib/content';

/**
 * Topic → schema.org entity that the article is "about". Lets Google connect
 * an article to a known medical condition / procedure / test in its Knowledge
 * Graph instead of inferring from keywords. Keys are frontmatter `topic`
 * values; values are the schema.org @type and canonical name.
 */
const TOPIC_ABOUT: Record<string, { '@type': string; name: string; alternateName?: string; code?: { '@type': 'MedicalCode'; code: string; codingSystem: string } }> = {
  bph: {
    '@type': 'MedicalCondition',
    name: 'Benign prostatic hyperplasia',
    alternateName: 'BPH',
    code: { '@type': 'MedicalCode', code: 'N40', codingSystem: 'ICD-10' },
  },
  nocturia: {
    '@type': 'MedicalCondition',
    name: 'Nocturia',
    code: { '@type': 'MedicalCode', code: 'R35.1', codingSystem: 'ICD-10' },
  },
  frequency: {
    '@type': 'MedicalCondition',
    name: 'Urinary frequency',
    code: { '@type': 'MedicalCode', code: 'R35.0', codingSystem: 'ICD-10' },
  },
  voiding: {
    '@type': 'MedicalCondition',
    name: 'Lower urinary tract symptoms',
    alternateName: 'LUTS',
  },
  'post-prostatectomy': {
    '@type': 'MedicalCondition',
    name: 'Post-prostatectomy urinary incontinence',
  },
  'bladder-training': {
    '@type': 'MedicalProcedure',
    name: 'Bladder training',
  },
  'bladder-diary': {
    '@type': 'MedicalTest',
    name: 'Bladder diary',
    alternateName: 'Frequency volume chart',
  },
  'bladder-irritants': {
    '@type': 'MedicalCondition',
    name: 'Bladder irritation',
  },
};

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
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
    '@type': isMedical ? ['MedicalWebPage', 'Article'] : 'DefinedTerm',
    headline: fm.title,
    name: fm.title,
    description: fm.description,
    url,
    inLanguage: fm.locale,
    datePublished: fm.publishedAt || undefined,
    dateModified: fm.updatedAt || undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    wordCount: countWords(article.body),
    timeRequired: `PT${article.readingTimeMin}M`,
  };

  if (fm.keywords && fm.keywords.length > 0) {
    data.keywords = fm.keywords.join(', ');
  }

  if (isMedical) {
    data.articleSection = fm.topic.replace(/-/g, ' ');
    data.specialty = {
      '@type': 'MedicalSpecialty',
      name: 'Urology',
    };
    data.medicalAudience = {
      '@type': 'MedicalAudience',
      audienceType: 'Patient',
    };
    const aboutEntity = TOPIC_ABOUT[fm.topic];
    if (aboutEntity) {
      data.about = [aboutEntity];
    }
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
      ...(author.linkedIn ? { sameAs: [author.linkedIn] } : {}),
    };
  }

  if (reviewer) {
    data.reviewedBy = {
      '@type': 'Person',
      name: reviewer.name,
      jobTitle: reviewer.credentials,
      url: buildAbsoluteUrl(`/learn/authors/${reviewer.slug}`),
      ...(reviewer.linkedIn ? { sameAs: [reviewer.linkedIn] } : {}),
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

export interface FaqItem {
  question: string;
  answer: string;
}

export function FaqPageJsonLd({ items, url }: { items: FaqItem[]; url?: string }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        ...(url ? { url: buildAbsoluteUrl(url), mainEntityOfPage: buildAbsoluteUrl(url) } : {}),
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }}
    />
  );
}

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export function HowToJsonLd({
  name,
  description,
  steps,
  totalTime,
  image,
  url,
  inLanguage,
}: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
  image?: string;
  url?: string;
  inLanguage?: string;
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name,
        description,
        ...(url ? { url: buildAbsoluteUrl(url), mainEntityOfPage: buildAbsoluteUrl(url) } : {}),
        ...(image ? { image: buildAbsoluteUrl(image) } : {}),
        ...(totalTime ? { totalTime } : {}),
        ...(inLanguage ? { inLanguage } : {}),
        supply: [{ '@type': 'HowToSupply', name: 'A measuring cup or container with mL/oz markings' }],
        tool: [{ '@type': 'HowToTool', name: 'My Flow Check (web app)' }],
        step: steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.name,
          text: s.text,
          ...(s.url ? { url: buildAbsoluteUrl(s.url) } : {}),
        })),
      }}
    />
  );
}

export function WebSiteJsonLd({ inLanguage }: { inLanguage?: string }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'My Flow Check',
        alternateName: 'My Flow Check Bladder Diary',
        url: SITE_URL,
        ...(inLanguage ? { inLanguage } : {}),
        publisher: {
          '@type': 'Organization',
          name: 'My Flow Check',
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd({ inLanguage }: { inLanguage?: string }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': ['SoftwareApplication', 'MedicalWebPage'],
        name: 'My Flow Check Bladder Diary',
        url: SITE_URL,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web, iOS, Android',
        ...(inLanguage ? { inLanguage } : {}),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        isAccessibleForFree: true,
        browserRequirements: 'Requires JavaScript',
        featureList: [
          '3-day bladder diary tracking',
          'Drink and void logging',
          'Bedtime and wake tracking',
          'PDF and CSV export for clinicians',
          'Six-language support',
          'Offline capable (PWA)',
          'No account required',
        ],
        publisher: {
          '@type': 'Organization',
          name: 'My Flow Check',
          url: SITE_URL,
        },
      }}
    />
  );
}
