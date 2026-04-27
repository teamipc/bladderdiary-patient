---
name: learn-styling
description: Visual layout + typography conventions for /learn pages on myflowcheck.com (patient app). Reference: parentdata.org-style editorial reading experience (narrow reading column, big bold title, image cards, generous whitespace). Mirrors the bladderdiary clinician site's `journal-styling` skill but adapted for this app's i18n + topic-cluster + audience-landing structure. Use this skill (or read it before any change) when adding a new article style, modifying any /learn route, editing src/app/globals.css typography, or building a new learn-related component.
---

# Learn styling (bladderdiary-patient / myflowcheck.com)

The visual language for the patient `/learn` section is intentionally modeled on **parentdata.org** (Emily Oster's editorial format), aligned with the clinician site at bladderdiaries.com. Both sites share the same color palette (IPC gold) and typography scale so a reader navigating between them doesn't feel a brand discontinuity.

The shared typography scale is defined in the SEO workflow's memory at `feedback_typography_standard.md`. This skill encodes the patient-app-specific implementation details.

## Architecture (patient app uses [locale] routing for i18n)

| Layer | File |
|---|---|
| **Hub page** (lists topics + audience + recent articles) | `src/app/[locale]/learn/page.tsx` |
| **Audience landing pages** (for-men, for-women) | `src/app/[locale]/learn/for-men/page.tsx`, `.../for-women/page.tsx` |
| **Topic pillar pages** | `src/app/[locale]/learn/[topic]/page.tsx` (rendered from `_pillar.mdx`) |
| **Cluster article pages** | `src/app/[locale]/learn/[topic]/[slug]/page.tsx` (rendered from `<slug>.mdx`) |
| **Glossary entries** | `src/app/[locale]/learn/glossary/[term]/page.tsx` |
| **Author bio pages** | `src/app/[locale]/learn/authors/[slug]/page.tsx` |
| **Article card component** | `src/components/learn/ArticleCard.tsx` |
| **Breadcrumbs** | `src/components/learn/Breadcrumbs.tsx` |
| **Disclaimer** | `src/components/learn/Disclaimer.tsx` (mandatory for YMYL) |
| **Body typography (when articles ship)** | TBD — define a `.learn-prose` class in `src/app/globals.css` mirroring the clinician site's `.journal-prose` |

Content lives in `content/articles/en/<topic>/<slug>.mdx` — see `content/README.md` and `content/SKILL.md` for the file-system conventions and frontmatter spec (those files are the canonical source of truth for Site B; this skill is the visual layer).

## Standardized typography scale (BINDING — shared with bladderdiary)

| Element | Mobile | Desktop |
|---|---|---|
| Hub page hero title | text-4xl | md:text-5xl lg:text-6xl, font-bold |
| Hub page subtitle | text-lg | md:text-xl |
| Audience-card title | text-xl | md:text-2xl, font-semibold |
| Topic-card title | text-lg | text-lg, font-semibold |
| Article-card title (in grid) | text-xl | md:text-2xl, font-semibold |
| Article H1 (when article pages ship) | text-3xl | md:text-4xl lg:text-5xl, font-bold |
| Article H2 (in body) | text-2xl | md:text-3xl, font-semibold |
| Article H3 (in body) | text-xl | text-xl, font-semibold |
| Article body (in body) | 1.0625rem (~17px) | md:text-lg (~18px) |
| Card meta (date, reading time) | text-sm | text-sm |
| Section header label | text-sm uppercase tracking-wider | text-sm |
| TLDR / "Key points" header | text-xs uppercase tracking-wider | text-xs |
| TLDR bullets | text-base | text-base |

These match the clinician site exactly. Memory: `feedback_typography_standard`.

## Layout rules for the hub page (`/learn`)

- Outer container: `max-w-5xl mx-auto px-4 sm:px-6` for the hub (wider than articles since it shows multiple cards)
- Article-detail pages: when built, use `max-w-2xl mx-auto px-4 sm:px-6` for body (matching clinician article column width)
- Section gaps: `space-y-14` (generous breathing between hub sections)
- Card style: `rounded-2xl bg-white border border-ipc-100 hover:border-ipc-300 hover:shadow-md transition-all`
- Card grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5` for topic cards; `gap-6` for article cards

## Article meta byline (BINDING — when article pages ship)

Same as clinician site (memory: `feedback_typography_standard`):

```
Published MMM d, YYYY · Updated MMM d, YYYY · Reviewed MMM d, YYYY · N min read
```

- Always show publication date (`frontmatter.publishedAt`)
- Show **Updated** when `frontmatter.updatedAt` > `publishedAt`
- Show **Reviewed** when `frontmatter.lastReviewedAt` > `updatedAt` (strict freshness signal for YMYL)
- Always show reading time (computed from word count / 200, minimum 1)

The patient app has the **`medicallyReviewedBy`** frontmatter field (clinician site doesn't). When present, the article page should also surface the reviewer's name in the byline or footer:

```
Author: Dr. X (slug). Medically reviewed by Dr. Y (slug).
```

This is a YMYL E-E-A-T signal and is non-optional for clinical content per `content/README.md`.

## Image-curator integration (when articles ship)

The SEO workflow's image-curator skill auto-optimizes hero images via `image_optimize.py`. Patient articles should use the same hero/heroAlt frontmatter fields. Render via `next/image` with priority + responsive sizes for LCP.

## What's encouraged

- Topic pillar + cluster structure (already supported)
- Audience landing pages (`/learn/for-men`, `/learn/for-women`)
- Glossary entries (short, definitional, internally linkable from cluster articles)
- Author + reviewer bio pages
- Multilingual (en/fr/es) — but only ship translations after human review (per `content/README.md`)

## What's forbidden

- **Em-dashes** anywhere in content (project convention)
- **Body `---` horizontal rules** (memory: `feedback_no_separator_lines`) — H2s carry section breaks
- **HTML comments in MDX** — they crash MDX prerender (memory: image-seo SKILL incident notes)
- **Inline hero image duplication** — the article page renders `frontmatter.hero` from the page component; do not also embed inline in body MDX
- **Self-quoting blockquotes** — `> "..." - <author>` where attribution = article's `frontmatter.author` is awkward (memory: `feedback_no_self_quoting`)
- **Stock photo cliches** for images — atmospheric/object/mood/representational only (memory: `feedback_image_style`)
- **Unoptimized images** — every image in `public/articles/` must run through `image_optimize.py` (memory: image weight = LCP = ranking factor)

## What to build next (when first patient article ships)

The hub page is in place. The flow that needs to be built:

1. **Article page component** — `src/app/[locale]/learn/[topic]/[slug]/page.tsx`
   - Mirror clinician's `app/journal/[slug]/page.tsx` layout: title, byline, hero, TLDR, body
   - Use the `.learn-prose` class for body typography (see step 2)
   - Render `medicallyReviewedBy` in byline or footer (Site B specific)
   - Append disclaimer footer (mandatory YMYL)
2. **`.learn-prose` class** in `src/app/globals.css`
   - Copy the `.journal-prose` block from `bladderdiary/src/index.css` and rename
   - Site B uses the same body typography rules — no divergence
3. **MDX components map** — include any custom components (callouts, charts) used in patient articles
4. **Pillar page component** — for `_pillar.mdx` rendering (similar to article page but with `relatedSlugs` showing cluster cards)
5. **Glossary entry component** — for short definitional pages (200-400 words)

## Reference

- Sister skill: `/Users/zhen/bladderdiary/.claude/skills/journal-styling/SKILL.md` — clinician site's implementation; mirror the visual rules
- Canonical content spec: `content/SKILL.md` and `content/README.md` in this repo
- Memories (in SEO workflow): `feedback_typography_standard`, `feedback_visual_style_parentdata`, `feedback_no_separator_lines`, `feedback_no_self_quoting`, `feedback_attribution_compact`, `feedback_image_style`, `feedback_4is_framework`
- Live reference: parentdata.org (especially Emily Oster's article pages)
