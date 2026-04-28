# Content & SEO Guide

This folder is the source of truth for everything that appears under `/learn` on the site: patient-education articles, glossary entries, and author bios. The folder structure *is* the database. There is no CMS, no admin UI, no SQL.

If you are an agent or developer working on articles or SEO, **read this file first**. For the structured workflow used to ingest a new article from the user, see [SKILL.md](./SKILL.md).

---

## Why this exists (the SEO model in one paragraph)

The site uses a **topic-first, audience-tagged** content architecture. Each article lives in a folder named after a medical topic (e.g. `nocturia/`, `bph/`), not after a demographic. The article's audience (men, women, both) is metadata in frontmatter, never in the URL. This gives us topical authority on medical entities (which is what people actually search), avoids duplicate content, and lets the same article surface in multiple discovery paths (topic pillar pages, audience landing pages, related articles) without ever having two URLs for the same content.

The strategic rationale (why not subdomains, why not gender folders, why not flat structure) is documented separately in `docs/SEO.md` if it exists. This file is the operational guide.

---

## Folder layout

```
content/
├── README.md                    you are here
├── SKILL.md                     article intake spec for agents
├── articles/
│   ├── en/                      English (default locale)
│   │   ├── nocturia/
│   │   │   ├── _pillar.mdx      topic pillar page (URL: /learn/nocturia)
│   │   │   ├── causes.mdx       cluster article
│   │   │   └── when-to-worry.mdx
│   │   ├── urgency/
│   │   ├── bladder-training/
│   │   ├── bph/                 men-specific by clinical nature
│   │   ├── pelvic-floor/
│   │   └── pelvic-organ-prolapse/  women-specific by clinical nature
│   ├── fr/                      French translations (per article, optional)
│   └── es/                      Spanish translations (per article, optional)
├── glossary/
│   └── en/
│       ├── nocturia.mdx         short term-definition pages
│       └── oab.mdx
└── authors/
    ├── dr-smith.json            author bio (E-E-A-T metadata)
    └── dr-jones.json
```

---

## URL mapping

The folder structure determines URLs deterministically:

| File path | URL served |
|---|---|
| `articles/en/nocturia/_pillar.mdx` | `/learn/nocturia` |
| `articles/en/nocturia/causes.mdx` | `/learn/nocturia/causes` |
| `articles/en/bph/symptoms.mdx` | `/learn/bph/symptoms` |
| `articles/fr/nocturia/causes.mdx` | `/fr/learn/nocturia/causes` |
| `glossary/en/nocturia.mdx` | `/learn/glossary/nocturia` |
| `authors/dr-smith.json` | `/learn/authors/dr-smith` |

**Audience landing pages** (`/learn/for-men`, `/learn/for-women`) are generated dynamically from articles whose `audience` frontmatter includes that group. They are not stored as files in this folder.

The `/learn` hub itself is rendered from a TSX page that pulls a featured selection. Hub copy lives in `messages/{locale}.json` under the `learn.hub.*` keys.

---

## Asset folder layout (the `public/` mirror)

MDX bodies reference images by URL, but the files live in the repo's top-level `public/` tree. Next.js serves anything under `public/` at the matching root URL, so the folder shape is determined by the served URL — same topic-folder discipline as `content/articles/`:

```
public/
├── articles/
│   ├── <topic>/
│   │   ├── <slug>/                       cluster article assets
│   │   │   ├── hero.jpg                  → /articles/<topic>/<slug>/hero.jpg
│   │   │   └── <inline-image>.jpg        → /articles/<topic>/<slug>/<inline-image>.jpg
│   │   └── <pillar-asset>.jpg            pillar assets sit one level up (URL: /articles/<topic>/...)
├── glossary/
│   └── <term>/                           glossary entry assets
│       └── hero.jpg                      → /glossary/<term>/hero.jpg
└── authors/
    └── <slug>.jpg                        author photo (referenced by authors/<slug>.json's photoUrl)
```

**Path mapping rules:**

| Article file | Asset folder | Body reference |
|---|---|---|
| `content/articles/en/<topic>/<slug>.mdx` | `public/articles/<topic>/<slug>/` | `/articles/<topic>/<slug>/<file>` |
| `content/articles/en/<topic>/_pillar.mdx` | `public/articles/<topic>/` | `/articles/<topic>/<file>` |
| `content/glossary/en/<term>.mdx` | `public/glossary/<term>/` | `/glossary/<term>/<file>` |

The locale folder (`en`, `fr`, `es`) does NOT appear in the asset path — translated articles share the same image assets as their English source, so the folder is locale-independent.

For weight + format conventions (hero target ≤ 400 KB, JPEG q80, etc.), see the SEO workflow's `/image-optimize` skill — it's idempotent and can be re-run on any oversized asset.

---

## Page types

There are three distinct types of content pages, each with a different role in the SEO architecture.

### 1. Pillar pages (`_pillar.mdx`)

The authoritative overview for a medical topic. Targets the **head keyword** for that topic (e.g. "nocturia"). Long-form, 1,500 to 2,500 words. Comprehensive: definition, causes, symptoms, when to worry, treatment overview, links to all cluster articles.

One per topic folder, always named `_pillar.mdx`. The leading underscore is a convention so they sort to the top of folder listings.

### 2. Cluster articles (regular `.mdx` files)

Focused articles targeting **long-tail keywords** related to the pillar. 600 to 1,500 words. Each answers a specific question or covers one subtopic. Always linked to and from the pillar.

Example cluster around the nocturia pillar: `causes.mdx`, `when-to-worry.mdx`, `caffeine-and-nocturia.mdx`, `waking-multiple-times-men.mdx`.

### 3. Glossary entries (`glossary/{locale}/{term}.mdx`)

Short term-definition pages, 200 to 400 words. Each targets a single "what is X" query. Links into relevant pillars and cluster articles. Cheap to write, high SEO ROI because they exactly match the search intent for definitional queries.

---

## Creating a new topic

A topic folder is a long-term commitment. It only earns its own folder if it can sustain a pillar plus 2 to 3 cluster articles within roughly six months. One-off articles fold into an existing topic as clusters; bare definitions live in `glossary/`.

### When a new topic is justified

- The head keyword has non-trivial search volume (Keysearch ≥ 30 is the typical floor).
- We can plausibly write a pillar (1,500+ words) plus 2 to 3 clusters covering distinct sub-questions.
- It does not substantially overlap an existing topic — if it does, extend the existing topic instead of splitting authority across two folders.

### When NOT to create a new topic

- A single one-off cluster article: place it under the closest existing topic.
- A definitional, term-only piece: write a glossary entry instead.
- Any topic that overlaps existing scope: extend the existing topic's cluster set.

### Procedure

1. **Pick the folder name.** Lowercase, hyphenated, matches how patients actually search. Prefer the shortest indexable form (`bph`, not `benign-prostatic-hyperplasia` — patients search the abbreviation more). Examples already in use: `nocturia`, `bph`, `pelvic-floor`, `pelvic-organ-prolapse`.
2. **Confirm with the user before creating.** A new topic folder is a multi-article commitment. The intake skill must surface the new-topic decision rather than create silently.
3. **Create the folder** under `content/articles/en/`. Translation folders (`fr/`, `es/`) get created only when an actual translation lands — never proactively.
4. **Add the topic to `src/lib/topics.ts`** under the most fitting `TopicGroup.topics` array. The build's `/learn` hub reads from this list, not from the folder tree — a topic missing here surfaces only via the "More topics" fallback. If no existing group fits, propose a new group and surface to the user before adding.
5. **Write the pillar first if at all possible.** The pillar establishes the topic's frontmatter conventions and gives clusters a target to link up to. If you must ship a cluster before the pillar (rare), write a stub `_pillar.mdx` with `draft: true` so internal links from clusters resolve.
6. **Plan 2 to 3 cluster articles before approving the pillar.** Single-article topics rank poorly. The cluster set should cover the head keyword's main long-tail questions surfaced by SERP / PAA research.

### Files to touch outside `content/` (intake won't do this for you)

- **`src/lib/topics.ts`** — canonical topic taxonomy (required; see step 4).
- **`messages/{locale}.json`** — only if the topic needs custom hub or audience-landing copy.

The article-intake skill never modifies these files automatically. It surfaces the requirement and the user wires them.

---

## Frontmatter spec

Every article (pillar, cluster, or glossary) starts with YAML frontmatter. Required fields are non-negotiable: the build will fail if they are missing.

### Required

| Field | Type | Notes |
|---|---|---|
| `title` | string | Page `<title>` and `<h1>`. Aim for ≤ 60 chars to avoid SERP truncation. |
| `description` | string | Meta description. 140 to 160 chars. Hand-written, not auto-extracted. |
| `slug` | string | URL segment, lowercase, hyphenated. Must match filename without `.mdx`. |
| `topic` | string | Folder name (e.g. `nocturia`, `bph`). Must match parent folder. |
| `pageType` | enum | One of: `pillar`, `cluster`, `glossary`. |
| `audience` | string[] | One or more of: `men`, `women`. Drives audience landing pages. |
| `locale` | string | One of: `en`, `fr`, `es`. Must match parent locale folder. |
| `author` | string | Slug matching a file in `authors/`. |
| `publishedAt` | ISO date | First publication date. Never change after publication. |
| `updatedAt` | ISO date | Bump on any meaningful content change. |

### Strongly recommended (YMYL trust signals)

| Field | Type | Notes |
|---|---|---|
| `medicallyReviewedBy` | string | Slug matching a file in `authors/`. Ideally a different person than `author`. |
| `lastReviewedAt` | ISO date | When a clinician last vetted the content. Distinct from `updatedAt`, which is for any edit. |
| `citations` | object[] | Array of `{ title, source, url, year }`. At least 2 to 3 for medical claims. |

### Optional

| Field | Type | Notes |
|---|---|---|
| `keywords` | string[] | 3 to 5 target keywords. For editorial planning, not output. |
| `hero` | string | Path to hero image, e.g. `/articles/nocturia-causes-hero.jpg`. |
| `heroAlt` | string | Alt text. Required if `hero` is set. |
| `relatedSlugs` | string[] | Slugs of related articles for the "Related" sidebar. |
| `readingTimeMin` | number | Auto-computed at build time if omitted. |
| `draft` | boolean | If `true`, excluded from build, sitemap, and indexing. |
| `noindex` | boolean | If `true`, emits `<meta name="robots" content="noindex">`. Use sparingly. |

### Example frontmatter (cluster article)

```yaml
---
title: "Why Do I Wake Up to Pee at Night? Common Causes of Nocturia"
description: "Most people wake once a night to urinate. If you wake more than twice, here are the medical and lifestyle causes worth knowing."
slug: "causes"
topic: "nocturia"
pageType: "cluster"
audience: ["men", "women"]
locale: "en"
author: "dr-smith"
medicallyReviewedBy: "dr-jones"
publishedAt: "2026-04-26"
updatedAt: "2026-04-26"
lastReviewedAt: "2026-04-26"
keywords: ["nocturia causes", "waking up to pee", "nighttime urination"]
hero: "/articles/nocturia-causes-hero.jpg"
heroAlt: "An older man checking the time on a bedside clock at 3am."
relatedSlugs: ["when-to-worry", "caffeine-and-nocturia"]
citations:
  - title: "Nocturia: pathophysiology and treatment"
    source: "Cleveland Clinic Journal of Medicine"
    url: "https://example.com/nocturia-review"
    year: 2024
---
```

### Example author file (`authors/dr-smith.json`)

```json
{
  "slug": "dr-smith",
  "name": "Dr. Jane Smith, MD",
  "credentials": "MD, Urology, Board-Certified",
  "bio": "Dr. Smith is a urologist specializing in men's pelvic health with 15 years of clinical experience.",
  "affiliations": ["IPC Network", "American Urological Association"],
  "photoUrl": "/authors/dr-smith.jpg",
  "linkedIn": "https://www.linkedin.com/in/dr-smith"
}
```

---

## Adding an article (workflow)

When the user (clinician) sends an article:

1. **Identify the topic.** If unclear, refer to `SKILL.md` for the question to ask.
2. **Choose the file path.** `articles/{locale}/{topic}/{slug}.mdx`, or `_pillar.mdx` for a topic pillar.
3. **Build frontmatter.** Auto-fill what you can (slug from title, dates, reading time). Ask for what you cannot (audience, author, citations). The full intake matrix is in `SKILL.md`.
4. **Convert article body to MDX.** Markdown is fine for most content. Only use MDX components (callouts, tip boxes) when needed.
5. **Verify internal links.** All `[text](/learn/...)` links should point to articles that exist or are explicitly planned.
6. **Verify hero image** exists at the specified path. Otherwise omit the `hero` field.
7. **Check audience tag.** A men-only article tagged `["men"]` should not have a CTA pointing to a women's resource (and vice versa).
8. **Commit** with a message like `content(en/nocturia): add causes.mdx`.

---

## Editing an article

1. Open the `.mdx` file directly.
2. Edit body or frontmatter.
3. Bump `updatedAt`.
4. If clinical content changed, also bump `lastReviewedAt` after re-review.
5. **Never change `slug` or `publishedAt`** after publication. Changing slug breaks URLs and forfeits SEO equity. If a slug must change, set up a 301 redirect in `next.config.ts` first.

---

## Unpublishing

Two options:

- **Soft:** set `draft: true` in frontmatter. File stays in repo; URL returns 404 until republished.
- **Hard:** delete the file, then add a 301 redirect in `next.config.ts` to a related article so backlinks are not wasted.

Never just delete a published article without a redirect: you lose every backlink pointing at that URL.

---

## Translations

Each article can be translated independently. The `articles/fr/` and `articles/es/` trees mirror `articles/en/` but only contain articles that have actually been translated.

- An article in `en/` only: appears at `/learn/nocturia/causes` (en), no fr/es URL, no hreflang for those locales.
- An article translated to all 3: hreflang tags emit for all three URLs, full canonical setup.
- **Never machine-translate without human review.** Thin or auto-translated content underperforms no translation at all in Google's eyes.

The `messages/{locale}.json` files handle UI strings (nav, hub copy, audience landing intros), not article content.

---

## Authors and medical reviewers (E-E-A-T)

In medical (YMYL) content, author and reviewer credentials are not optional decoration. Google's quality raters and the algorithm both weight them heavily. Without them, even excellent content gets outranked.

For each `authors/{slug}.json`:
- Real name with title and degree
- Specific credentials (board certification, fellowship, society membership)
- Bio that establishes domain expertise (not generic)
- Photo (real, professional)
- Link to a verifiable external profile (LinkedIn, institutional page)

The `author` field on every article is required. The `medicallyReviewedBy` field is strongly recommended for any article with clinical claims, ideally a different person from the author.

---

## SEO checklist (per article)

Before marking an article ready to publish, verify:

- [ ] Title ≤ 60 chars, contains target keyword naturally
- [ ] Meta description 140 to 160 chars, hand-written, action-oriented
- [ ] One H1 per page (rendered from frontmatter title, not from body)
- [ ] H2s use related keywords and structure the article logically
- [ ] First paragraph contains the target keyword and answers the search intent
- [ ] At least 2 internal links to related articles or pillars
- [ ] At least 1 link to a glossary entry if specialized terms are used
- [ ] Author bio present and complete
- [ ] Medical reviewer present (for any clinical content)
- [ ] Citations present for any medical claim
- [ ] `lastReviewedAt` within the last 12 months (refresh annually)
- [ ] Hero image has descriptive alt text
- [ ] Audience tag matches the CTA at the bottom of the article
- [ ] No em-dashes (project convention: use periods, commas, colons)

---

## Internal linking rules

Strong internal linking is one of the highest-leverage SEO levers for a small site.

1. **Every cluster article links up to its pillar** in the body or via breadcrumb.
2. **Every pillar links down to all its cluster articles** in a "Related articles" section.
3. **Cross-cluster links** are encouraged when topically related (a urgency article can link to a pelvic-floor article).
4. **Glossary terms appear inline as links** the first time they are used in an article.
5. **External links** should use `rel="nofollow noopener"` unless explicitly citing a primary source, where dofollow is fine and signals trust.
6. **Audience CTAs at article bottom**: men-tagged articles point to diary onboarding; women-tagged articles point to the partner referral. Never mix.

---

## Build & deploy

The site is a Next.js static export. Articles are read at build time from this folder, MDX is compiled, sitemap is generated, hreflang tags are emitted, and JSON-LD structured data (`Article`, `BreadcrumbList`, `MedicalWebPage`) is injected per page.

To preview locally: `npm run dev`. To build production: `npm run build`. There is no admin UI, no DB, no CMS. The folder is the database.

---

## Common pitfalls

- **Putting gender in the URL** is wrong. Use the audience tag instead. See `docs/SEO.md`.
- **Translating without a human reviewer** hurts rankings. Skip the locale rather than ship a thin translation.
- **Skipping the medical reviewer** undermines E-E-A-T signals. YMYL content needs them or it underperforms.
- **Letting `lastReviewedAt` go stale** kills rankings on health queries. Refresh content yearly.
- **Making `/learn/for-men` a thin index page** triggers Google's thin-content penalty. It needs 600+ words of unique intro content above the article grid.
- **Changing slugs without redirects** breaks URLs and forfeits SEO equity. Add a redirect first, then change.
- **Using em-dashes in copy** violates a project-wide convention. Use periods, commas, or colons.
- **Inventing citations** is unforgivable in a medical context. Always ask the user for sources rather than fabricate.
