---
name: article-translate
description: Translate a patient-app MDX article (`content/articles/en/<topic>/<slug>.mdx`) into the five non-English locales (`fr`, `es`, `pt`, `zh`, `ar`), producing siblings at `content/articles/<locale>/<topic>/<slug>.mdx` with translated frontmatter, translated body prose, preserved MDX components, preserved citation list, preserved keys/structure, and locale-natural register. Triggers automatically (via PostToolUse hook in `.claude/settings.json`) when an English article under `content/articles/en/` is created or modified, and manually when the user asks to "translate this article", "produce the French version of <slug>", "mirror articles to other locales", or names a specific MDX path. Enforces the same register rules as `i18n-sync` (FR=vous, ES=tú, PT=European pt with tu/você, ZH=Mandarin Simplified peer-direct 你, AR=Modern Standard, RTL-aware) and the same brand/citation/numerals invariants.
---

# article-translate (long-form MDX — patient app)

Sibling skill to `i18n-sync`. Where `i18n-sync` mirrors `messages/en.json` keys into `{fr,es,pt,zh,ar}.json`, this skill mirrors `content/articles/en/**/*.mdx` files into the same five non-English locale folders.

This skill **only** handles `pageType` values that are user-facing prose: `cluster`, `pillar`, `glossary`. It does not handle the catalog data files in `content/{authors,glossary-entries}.json` (those are separate datasets — translate those manually).

## Trigger

- **Auto** (primary): the `PostToolUse` hook in `.claude/settings.json` fires after any `Edit` or `Write` whose path matches `content/articles/en/**/*.mdx`. Claude sees an injected reminder pointing here, then runs the workflow below in the same turn — usually as a parallel fan-out of subagents (one per target locale).
- **Manual**: when the user asks to translate an article, mirror articles to other locales, or names an MDX path.

### Forcing function (don't skip the fan-out)

Two guardrails block the model from ending a turn or committing while EN articles lack siblings in every locale declared in `src/i18n/config.ts`:

- **Stop hook** (`.claude/settings.json`): runs `.claude/scripts/article-i18n-completeness.sh` when the agent ends turn. If any locale sibling is missing, the hook returns `decision: "block"` with the list of missing files — the agent is forced to keep going and run this skill before stopping.
- **Pre-commit hook** (`.githooks/pre-commit`): same script, hard-fails the commit. The model cannot ship a partially-translated state.

If you legitimately want an EN-only WIP article (e.g. authoring a draft you haven't decided to publish), move the file out of `content/articles/en/` until it is ready. Files inside that directory are treated as "shippable" and must have all locales.

You can run the check ad-hoc:
```
bash .claude/scripts/article-i18n-completeness.sh
```

## Files

| Locale | Code | Source | Output path |
|---|---|---|---|
| English (source) | `en` | Hand-authored | `content/articles/en/<topic>/<slug>.mdx` |
| French | `fr` | Translated | `content/articles/fr/<topic>/<slug>.mdx` |
| Spanish | `es` | Translated | `content/articles/es/<topic>/<slug>.mdx` |
| Portuguese | `pt` | Translated | `content/articles/pt/<topic>/<slug>.mdx` |
| Mandarin (Simplified) | `zh` | Translated | `content/articles/zh/<topic>/<slug>.mdx` |
| Arabic (MSA) | `ar` | Translated | `content/articles/ar/<topic>/<slug>.mdx` |

The `[topic]` and `[slug]` segments are **identical across locales** — this is intentional for SEO (hreflang alternates auto-resolve via `getArticleAlternates` in `src/lib/content.ts` by matching topic+slug across locales). Do NOT translate slugs.

## Workflow

### Step 1: Read the source

Read `content/articles/en/<topic>/<slug>.mdx` in full. Note the frontmatter, body, MDX components, and citation list.

### Step 2: For each target locale (or just the requested locale):

For each of `fr`, `es`, `pt`, `zh`, `ar`:

1. Translate the **frontmatter** per the field rules below.
2. Translate the **body** preserving MDX, markdown structure, and inline citations.
3. Write to `content/articles/<locale>/<topic>/<slug>.mdx`.

Parallelize by spawning one subagent per locale (or per locale × article) when handling many articles at once.

### Step 3: Validate

- The output MDX must have valid YAML frontmatter (no missing required fields, no broken indentation).
- The body must still parse — every opening MDX tag has a matching close, every code fence has a close, every link is intact.
- Citation array stays unchanged (titles/sources/URLs are NOT translated).
- Sanity check the article appears in `getArticleAlternates` by re-running `npm run dev` and visiting `/learn/<topic>/<slug>` — the locale switcher should now offer the new languages.

### Step 4: Report

Tell the user, in 3–6 lines: which articles got which locale outputs, anything that needed judgment (a passage too culture-specific to translate literally, an idiom adapted, a clinical term standardized).

## Frontmatter translation rules

| Field | Rule |
|---|---|
| `title` | **Translate.** Use locale-natural phrasing — don't word-for-word calque the English. Match length roughly. |
| `description` | **Translate.** Keep the same factual claims. SEO meta description: aim for 140–160 chars in target language (Chinese will be much shorter in chars; Arabic similar to English). |
| `slug` | **Keep verbatim** (English slug). Do not translate. SEO depends on slug parity for hreflang. |
| `topic` | **Keep verbatim.** |
| `pageType` | **Keep verbatim.** |
| `audience` | **Keep verbatim** (`["men"]`, `["women"]`, `["both"]`). |
| `locale` | **Change** to the target locale code (`fr`, `es`, `pt`, `zh`, `ar`). |
| `author` | **Keep verbatim** (slug reference into `content/authors.json`). |
| `medicallyReviewedBy` | **Keep verbatim**. |
| `publishedAt` / `updatedAt` / `lastReviewedAt` | **Keep verbatim**. |
| `keywords` | **Translate** to natural search terms in the target language. Don't transliterate the English keywords. Aim for 5–8 keywords that a target-language searcher would actually type. Brand keywords (e.g. "My Flow Check") stay verbatim. |
| `hero` | **Keep verbatim** (image path — the same image is used). |
| `heroAlt` | **Translate.** Keep it concise (one sentence describing the image). |
| `readingTimeMin` | **Keep verbatim** (the original word count's reading time; close enough across locales). |
| `relatedSlugs` | **Keep verbatim** (slugs are locale-invariant). |
| `citations` (array) | **Keep verbatim — DO NOT translate.** Medical literature is published in English (or its native language) and the citation must point to the actual source. Title, source, url, year all stay as-is. |
| `noindex` (if present) | **Keep verbatim**. |
| `glossaryFirstOccurrences` (if present) | **Keep verbatim** (these are slug references). |

## Body translation rules

### What to translate
- All prose text (paragraphs, list items, blockquotes, table cells, headings).
- Image alt text (in `![alt](src)` markdown or `<Image alt="...">` JSX).
- Heading text — keep heading levels (`##`, `###`) identical.
- Emphasis text inside `**bold**`, `*italic*`, `_em_`.

### What to preserve verbatim
- All MDX component tags: `<DiaryCta>`, `<Image>`, `<dots>`, `<Callout>`, `<RefList>`, anything PascalCase or HTML-style. Translate content inside text props (e.g. `<Callout title="...">` — translate the title), but not component names or attribute keys.
- Markdown link URLs: `[text](url)` — translate `text`, keep `url`.
- Anchor links to other articles (`/learn/...`) — keep verbatim. The locale prefix is added by `next-intl`'s `<Link>`, not in MDX.
- Inline citation markers like `[1]`, `[^2]` — keep verbatim.
- Code blocks (```...```) — keep verbatim.
- Numerical values, units, dates: `3 days` → `3 jours` (translate unit, keep number).
- Brand names: "My Flow Check", "IPC", "Integrated Pelvic Care" — verbatim.
- Acronyms when they're the recognized clinical form (e.g. "OAB" can stay; gloss it once on first occurrence with the locale-natural full form, e.g. French: "vessie hyperactive (OAB)").

### Tone & register

Apply the same rules as `i18n-sync`'s "Translation register — BINDING" table:
- **fr**: vous, never tu. Warm, respectful, peer.
- **es**: tú, never usted. Peer, collaborative.
- **pt**: European Portuguese — `tu` in imperatives, `você` in declaratives where natural. Avoid Brazilian-only constructions.
- **zh**: Simplified, 你 (not 您). No spaces between Chinese chars and punctuation. Use 。 for sentence-end in long prose, no period on UI labels.
- **ar**: Modern Standard Arabic. No tashkeel. Western Arabic numerals. Brand names stay LTR.

And the universal tone rules:
- **No em-dashes** (`—`/`–`) in any locale. Use commas, periods, colons, semicolons, parentheses.
- **Peer voice, not authority voice.**
- **No literal calques** when a locale-natural phrasing exists.
- **Match prose density** — don't expand a tight English sentence into a flowery target-language paragraph, or vice versa.

### Medical terminology

Use the **lay term first**, the clinical term parenthetically only when the lay term is ambiguous or when the article is teaching the clinical term as part of patient education. Examples:

- EN: "overactive bladder (OAB)"
  - FR: "vessie hyperactive (OAB)"
  - ES: "vejiga hiperactiva (OAB)"
  - PT: "bexiga hiperativa (OAB)"
  - ZH: "膀胱过度活动症 (OAB)"
  - AR: "فرط نشاط المثانة (OAB)"
- EN: "pelvic floor"
  - FR: "plancher pelvien"
  - ES: "suelo pélvico"
  - PT: "pavimento pélvico" (PT-PT) / "assoalho pélvico" (PT-BR — but use PT-PT)
  - ZH: "盆底"
  - AR: "قاع الحوض"

If the clinical term has no lay equivalent in the target language, keep the clinical term and gloss it briefly.

### Cultural & medical-system adaptation (light touch)

- **Don't change the medical claims.** The source article was reviewed by a clinician; translation must preserve every factual statement, every dosage, every threshold.
- **Don't insert local healthcare-system references** ("call your GP" / "talk to your urólogo") that aren't in the source. Keep the universal framing.
- **Currency/units**: the app uses ml and oz already (per locale); volumes in articles stay numerical with their original units. Don't convert ml to L unless the source did.
- **Names of clinicians** (authors, reviewers): keep verbatim. Don't translate.

## RTL specifics for Arabic articles

- The MDX file itself is left-to-right (UTF-8 source). Don't reverse anything in the source; the browser flips display when `<html dir="rtl">`.
- Keep brand names ("My Flow Check") in Latin script.
- Numerals: Western Arabic (0–9). Don't switch to Eastern Arabic.
- Punctuation: Arabic comma `،` and semicolon `؛` are fine in long prose; sentence-end is `.`.
- Lists: bullet markers (`-`, `1.`) are markdown-standard, render correctly in RTL.

## Mandarin specifics for articles

- Use Simplified script (zh-Hans / mainland convention).
- Long-form prose: end sentences with `。`, lists with no period, headings with no period.
- No spaces between Chinese characters and Latin/numerals at the boundary (e.g. `每3天` not `每 3 天`, but `3 days` style around English brand names is fine: `使用 My Flow Check 应用`).
- Quote marks: `「」` or `""` consistent with EN style.

## Portuguese specifics for articles

- European Portuguese (Portugal). Spelling: "ação" (not "acção" pre-1990 reform — use post-1990 spelling).
- Lexicon: "utilizador", "ecrã", "ficheiro", "telemóvel", "casa de banho" (not Brazilian "banheiro"), "andar" (not "ir" in some contexts).
- Avoid Brazilian-only constructions: no "a gente" for "we"; use "nós".

## What NOT to translate (scope guard)

- **Don't translate** files outside `content/articles/en/` (e.g. `content/authors.json`, `content/glossary-entries.json` are catalog data, not prose articles — handle those separately if requested).
- **Don't translate** the citation array. Medical citations stay in their original form.
- **Don't translate** image filenames or paths.
- **Don't translate** slugs — keep English slugs across all locales.
- **Don't auto-publish** — set `publishedAt` to the same date as the EN source, but the user is responsible for human review before merging if required.
- **Don't expand or summarize** the article. The translation has the same paragraph count, the same heading structure, the same word count ±15%.

## Hook integration

The PostToolUse hook is in `.claude/settings.json`. It runs after every Edit/Write tool call, filters to paths matching `content/articles/en/.*\\.mdx$`, and emits an `additionalContext` reminder pointing here. If you just bulk-edited many articles, the hook fires once per Edit — but Claude can batch the response (translate all changed articles in one workflow run).

If the hook ever stops firing:
1. Check `.claude/settings.json` exists and parses.
2. Confirm `jq` is installed.
3. Use `/hooks` to verify registration.

## Reference

- Source articles: `content/articles/en/<topic>/<slug>.mdx`
- Target articles: `content/articles/{fr,es,pt,zh,ar}/<topic>/<slug>.mdx`
- `src/lib/content.ts → getArticleAlternates`: how hreflang is derived from topic+slug parity
- `src/i18n/seo.ts`: locale → BCP-47 / OG / dir / hreflang maps
- Sibling: `i18n-sync/SKILL.md` — UI strings (the same register rules apply)
- Sibling: `cta-placer/SKILL.md` — should have already inserted CTA cards in the EN source; the translated versions inherit them verbatim (translate the surrounding text, leave `<DiaryCta>` and its props that aren't text-translatable in the EN form, but DO translate `title`/`description`/`buttonLabel` props that contain prose)
- Sibling: `article-intake/SKILL.md` — places new EN articles; translation happens after intake completes

## Quick reference: spawning parallel subagents

When asked to translate one article into all 5 locales, fan out:

```
Spawn 5 subagents, each translating <slug> from en → one of {fr, es, pt, zh, ar}.
Each subagent reads the EN source, applies this skill's rules for its target locale,
and writes to content/articles/<locale>/<topic>/<slug>.mdx.
```

When translating many articles at once: parallelize per-article, sequential per-locale within each article (so a single subagent owns one article and produces all 5 locales for it). This keeps each subagent's context anchored on a single source.
