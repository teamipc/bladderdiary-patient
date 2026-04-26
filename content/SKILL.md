# Article Intake Skill

This file defines the structured workflow for an agent ingesting article content from the user. Following it consistently ensures every article ships with the same SEO scaffolding, trust signals, and frontmatter shape.

If you are an agent: read this whenever the user sends article content for the Learn section. Read [README.md](./README.md) first if you have not already.

---

## Inputs you may receive

When the user sends an article, you may get any combination of:
- Article body (plain text, markdown, or rich text from Word/Docs)
- Title (sometimes embedded in the body)
- Topic (e.g. "nocturia", "BPH")
- Audience (e.g. "for men", "for both")
- Author and/or medical reviewer info
- Citations or references
- Hero image (provided or to be sourced)
- Target keywords

The user will rarely give you all of these. The matrix below tells you what to ask for, what to infer, and what to fill in silently.

---

## Field-by-field intake matrix

For each frontmatter field, follow the action below. **Do not ask** for fields marked AUTO-FILL unless you cannot infer them with confidence.

| Field | Action | How to handle |
|---|---|---|
| `title` | EXTRACT or ASK | Use H1 from body if present. If user supplied a title separately, prefer that. Never invent. |
| `description` | DRAFT, then CONFIRM | Write a 140 to 160 char meta description from the article's first paragraph plus value prop. Show user, ask "use this or rewrite?" |
| `slug` | AUTO-FILL | Lowercase, hyphenated version of title, max ~60 chars. Strip stop words ("the", "and", "of") if title is long. |
| `topic` | ASK if missing | If user did not say, ask: "Which topic does this belong to? (nocturia / urgency / bladder-training / bph / pelvic-floor / pelvic-organ-prolapse / other)". If "other", confirm new folder name before creating. |
| `pageType` | INFER, then CONFIRM | Default `cluster`. If user said "overview" / "pillar" / "main page for [topic]", set `pillar` and use `_pillar.mdx`. If short term-definition (<400 words, defines one concept), set `glossary`. |
| `audience` | ASK if missing | "Is this for men, women, or both?" Infer from clinical content when obvious (BPH → men, prolapse → women), but always confirm. |
| `locale` | DEFAULT to `en` | Only override if user explicitly specifies fr/es. |
| `author` | ASK if missing | "Who is the author? Use an existing slug, or provide name + credentials for a new author bio." If new author, also create `authors/{slug}.json` (see author intake below). |
| `medicallyReviewedBy` | ASK if missing | "Who medically reviewed this? (existing slug or new)." If user says "no separate reviewer", record `medicallyReviewedBy: null` but warn that this hurts E-E-A-T. |
| `publishedAt` | AUTO-FILL | Today's date in ISO format. Never ask. |
| `updatedAt` | AUTO-FILL | Same as `publishedAt` on first publish. |
| `lastReviewedAt` | AUTO-FILL | Same as `publishedAt` on first publish. |
| `keywords` | ASK if not given | Optional. If user gave a target keyword in the request, capture it. Otherwise ask for 3 to 5 keywords for editorial planning. |
| `hero` | ASK | "Did you provide a hero image? If not, leave it off and add later." Never invent a path that does not exist. |
| `heroAlt` | ASK if `hero` set | "What should the alt text be for the hero image?" |
| `relatedSlugs` | INFER, then CONFIRM | Look at other articles in the same topic folder. Suggest 2 to 3 most semantically related. Show the list and ask to confirm/adjust. |
| `citations` | ASK if missing | "Do you have citations for the medical claims? Without them, the article is harder to rank for YMYL." If user has none, propose adding at least one authoritative source (Cochrane review, society guideline) and ask user to verify. **Never fabricate citations.** |
| `readingTimeMin` | AUTO-FILL | Word count / 200, rounded. |
| `draft` | DEFAULT to `false` | Only `true` if user explicitly says "draft" or "not ready to publish". |
| `noindex` | DEFAULT to `false` | Never set true unless user explicitly requests. |

---

## Author intake (when a new author is mentioned)

If the user specifies an author whose slug does not exist in `authors/`, ask for:
- Full name with title (e.g. "Dr. Jane Smith, MD")
- Credentials (degrees, certifications, specialty)
- Short bio (2 to 3 sentences focused on relevant expertise)
- Affiliations (institutions, professional societies)
- Photo URL (or note "to be added")
- Optional: LinkedIn or professional profile URL

Create `authors/{slug}.json` with the structure shown in `README.md`. If the user gives partial info, ask for the missing pieces rather than skipping. Author bios drive E-E-A-T, which is the single biggest ranking factor in YMYL.

---

## Body conversion checklist

When converting the user's article text to MDX:

1. **Strip the title from the body** if it duplicates the frontmatter title. The H1 is rendered from frontmatter, not body.
2. **Promote section headers** to `##` (H2). Sub-sections to `###`. Never use H1 in the body.
3. **Convert em-dashes to periods, commas, or colons** (project convention).
4. **Identify glossary candidates** (specialized medical terms). Convert the first occurrence to a link to `/learn/glossary/{term}` if such a glossary entry exists or is planned.
5. **Identify internal link opportunities.** Any reference to a topic with a pillar should link to that pillar. Any reference to a related cluster article should link there.
6. **Pull citations to a footnotes section** at the bottom if they are inline in the body.
7. **Wrap call-out content** (warnings, key takeaways) in MDX components if available; otherwise use blockquote.

---

## Validation before saving

Before writing the file, verify:

- [ ] Filename matches `slug` (or is `_pillar.mdx` for pillars)
- [ ] Topic folder exists; if not, ask user before creating a new topic
- [ ] Author file exists in `authors/` (or is being created in the same intake)
- [ ] All internal links in the body resolve to existing or explicitly-planned articles
- [ ] No em-dashes anywhere
- [ ] Frontmatter passes the field spec in `README.md`
- [ ] Word count meets minimum: ≥ 600 cluster, ≥ 1500 pillar, ≥ 200 glossary

If any check fails, fix or ask before proceeding.

---

## What to ask the user (in order, only what is missing)

When info is missing, batch questions in this priority order:

1. Topic (if not derivable from content)
2. Audience (if not stated and not obvious from content)
3. Author + medical reviewer (if not provided and not inferable from prior articles)
4. Citations (if claims are present and no sources given)
5. Hero image + alt text (or confirm "skip for now")
6. Target keywords (optional, useful for editor planning)

**Do NOT ask for:** dates, slug, reading time, locale (defaults to en), pageType (defaults to cluster). Fill these silently.

Combine related questions into one batched message rather than asking sequentially. Example:

> A few things to fill in before I save this article:
> 1. Topic — does this belong in `nocturia` or a new topic?
> 2. Audience — men, women, or both?
> 3. Author — should I credit Dr. Smith (existing) or someone new?
> 4. Citations — do you have any sources to include?

---

## Output to user after ingestion

After saving the file, report concisely:
- File path
- URL it will be served at
- Any frontmatter fields you defaulted (so user can adjust)
- Any quality flags (no medical reviewer, no citations, missing hero, etc.)
- Confirmation that sitemap will pick it up automatically on next build

Example output:

> Saved [content/articles/en/nocturia/causes.mdx](content/articles/en/nocturia/causes.mdx). Will serve at `/learn/nocturia/causes`.
>
> Defaults applied: `publishedAt` and `updatedAt` set to 2026-04-26, reading time computed as 5 min, audience inferred as `["men", "women"]`.
>
> Quality flags:
> - No medical reviewer set. Recommend adding one for E-E-A-T.
> - No hero image. Add later via `hero` and `heroAlt` frontmatter.
>
> Sitemap and JSON-LD regenerate at next build.

---

## When NOT to use this skill

- **Editing an existing article.** Just edit the file and bump `updatedAt`.
- **Translation requests.** Separate workflow: duplicate file to `fr/` or `es/` folder, translate body and frontmatter strings, ask user to verify clinical accuracy. Never machine-translate.
- **Glossary entries.** Similar but shorter. Default `pageType: glossary`, target word count 200 to 400, may skip `medicallyReviewedBy` if just defining a term.
- **Author bios alone.** Just edit `authors/{slug}.json` directly.
- **Hub copy or UI strings.** Those live in `messages/{locale}.json`, not in this folder.
