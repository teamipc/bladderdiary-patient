---
name: article-intake
description: Receive a packaged article delivered by the SEO workflow into `.incoming/`, validate against this patient app's comprehensive Site B frontmatter schema (per content/SKILL.md and content/README.md), place files in the topic-folder structure under content/articles/en/<topic>/ and public/articles/<topic>/<slug>/, run app-specific SEO finalization (citations[] array assembly from inline citations, pillar-cluster wiring, glossary first-occurrence linking against this app's catalog, MedicalWebPage JSON-LD), validate the post-place state, and report ready-to-commit. Auto-triggered by the SEO workflow's `handoff` skill.
---

# Article intake (bladderdiary-patient site)

The "library agent" for the bladderdiary-patient repo. Receives finalized articles delivered by the SEO workflow at `/Users/zhen/SEO/`, places them per Site B conventions, runs app-specific SEO (which is more substantial than Site A because of the topic-cluster model and YMYL requirements), and hands the diff back to the user.

## Authoritative reference

The deep spec for this app's content model lives in two existing files in this repo:
- `content/README.md` — the SEO architecture (topic-first, audience-tagged), folder layout, URL mapping, frontmatter spec, page types (pillar/cluster/glossary), internal linking rules, common pitfalls
- `content/SKILL.md` — the field-by-field intake matrix the original (manual) workflow used

**This skill DEFERS to those files** for the canonical Site B spec. Always read them first if any question arises about frontmatter shape, validation, page-type rules, or naming conventions. They are the source of truth; this skill is the wire-it-together layer.

## When to invoke

- Auto: triggered by the SEO workflow's `/handoff` skill after it drops a package in `.incoming/`
- Manual: anytime there's an unprocessed package in `.incoming/<topic-id>/`

## Site B conventions (this app)

- **Live site:** `https://myflowcheck.com`
- **Audience:** patients, caregivers, the newly-diagnosed
- **Article URL patterns:**
  - cluster: `/learn/<topic>/<slug>` (file at `content/articles/en/<topic>/<slug>.mdx`)
  - pillar: `/learn/<topic>` (file at `content/articles/en/<topic>/_pillar.mdx`)
  - glossary: `/learn/glossary/<term>` (file at `content/glossary/en/<term>.mdx`)
- **Asset path convention:** `public/articles/<topic>/<slug>/<filename>` (or `public/articles/<topic>/<filename>` for pillars)
- **Frontmatter is COMPREHENSIVE** — see `content/README.md`. Required fields include: `title`, `description`, `slug`, `topic`, `pageType`, `audience` (array), `locale`, `author`, `publishedAt`, `updatedAt`. Strongly recommended: `medicallyReviewedBy`, `lastReviewedAt`, `citations[]`. Optional: `keywords`, `hero`, `heroAlt`, `relatedSlugs`, `readingTimeMin`, `draft`, `noindex`.
- **Author + reviewer must exist as JSON files** in `content/authors/`. If the manifest names a slug not yet in `authors/`, the intake creates the JSON file from the SEO workflow's `state/authors/<slug>.json` (delivered alongside the article in the package).
- **Disclaimer footer is required** (YMYL) — patient-facing.

## Workflow

### Step 1: Find unprocessed packages

```bash
ls -la .incoming/
```

For each subfolder containing `manifest.json`, read the manifest.

### Step 2: Read the manifest + the deeper spec

Always re-read `content/README.md` and `content/SKILL.md` before processing — those files may have been updated since this skill was written. They are authoritative.

### Step 3: Pre-flight validation

1. **Frontmatter parses cleanly.**
2. **All required Site B fields present** per `content/README.md` field spec.
3. **`slug` matches** the manifest AND the file basename (sans `.mdx`).
4. **`topic` field is set** AND corresponds to either an existing folder in `content/articles/en/` OR a deliberately new topic the user has approved (manifest should flag NEW topics; if the manifest doesn't and the topic folder doesn't exist, ABORT and ask the user).
5. **`pageType` is one of**: `cluster`, `pillar`, `glossary`. Filename matches: clusters and glossary entries use `<slug>.mdx`; pillars use `_pillar.mdx`.
6. **No conflict with existing article** at the target path.
7. **Author slug exists in `content/authors/`** — if not, check the package for `authors/<slug>.json` and copy it over before proceeding.
8. **Reviewer slug exists** — same as author. If `medicallyReviewedBy` is null and the article contains clinical content (most do), warn (don't abort) — note in report that this hurts E-E-A-T.
9. **All body images exist in package's `assets/` folder.**
10. **Title ≤60 chars, description 140-160 chars, no em-dashes.**
11. **One H1 only.**
12. **Word count meets minimum** for the page type: ≥600 cluster, ≥1500 pillar, ≥200 glossary (per `content/README.md`).

If anything fails, abort and report.

### Step 4: Decide final paths

- **MDX target:**
  - cluster: `content/articles/en/<topic>/<slug>.mdx`
  - pillar: `content/articles/en/<topic>/_pillar.mdx`
  - glossary: `content/glossary/en/<term>.mdx`
- **Asset target dir:**
  - cluster: `public/articles/<topic>/<slug>/`
  - pillar: `public/articles/<topic>/`
  - glossary: `public/glossary/<term>/`

### Step 4.5: Final SEO audit (gate before placement)

Same audit as Site A intake — hard fails block placement, warns surface in report.

- **Keyword in slug, title, first narrative paragraph, at least one H2** — HARD CHECK
- **Keyword density 3-5 in body** — WARN if outside
- **Heading hierarchy** (no skipped levels, no `# ` in body, no orphan H2s) — HARD CHECK
- **Internal-link anchor text quality** (no "click here", "read more", "this article", bare URLs) — WARN
- **Open Graph + Twitter Card derivability** from frontmatter — WARN
- **`noindex` / `draft` sanity** — HARD CHECK (confirm user intent if either is true)
- **Reading time auto-compute** — inject `readingTimeMin: <ceil(word_count / 200)>` if missing (Site B's frontmatter spec already documents this field)
- **Site B specific**: verify `audience` array is non-empty and matches values in spec; verify `hreflang` siblings exist for any locale-translated version; verify `topic` matches an existing folder OR user has approved a new one

Print all checks as `[PASS]`, `[WARN]`, or `[FAIL]`. FAILs abort.

### Step 5: App-specific SEO finalization (substantially more for Site B)

#### a) Convert inline citations to structured `citations[]` array

Site B's frontmatter requires `citations: object[]` per `content/README.md`. The SEO workflow's article body has inline citations like `[Author Year](https://pubmed.ncbi.nlm.nih.gov/PMID/)`. Walk the body, extract every PubMed/society/institutional URL, and build the `citations` array:

```yaml
citations:
  - title: "<paper title>"
    source: "<journal or publisher>"
    url: "https://pubmed.ncbi.nlm.nih.gov/PMID/"
    year: NNNN
```

Use the URL to fetch metadata if needed (PubMed E-utilities can give you author/title/journal/year from a PMID). Insert the assembled array into the frontmatter — do not duplicate; if a `citations` array already exists in the frontmatter, validate it covers what's inline.

#### b) Pillar-cluster wiring

If `pageType: cluster`:
- Verify the topic's `_pillar.mdx` exists in the same folder. If yes, ensure the body links UP to the pillar at `/learn/<topic>` at least once (insert if missing).
- Add this slug to the pillar's `relatedSlugs` frontmatter array (read pillar, append slug if not present, write back).

If `pageType: pillar`:
- Walk the topic folder for existing cluster files; populate `relatedSlugs` with all of them.
- Verify body links DOWN to each cluster.

#### c) Glossary first-occurrence linking

For each specialized medical term in the body that exists as a glossary entry (`content/glossary/en/<term>.mdx`), link the FIRST occurrence inline: `[<term>](/learn/glossary/<term>)`. Use the term list from existing glossary files; don't invent links to non-existent entries.

#### d) Audience-CTA validation

If `audience` includes only `["men"]` or only `["women"]`, verify the bottom-of-article CTA points to an audience-correct resource. Per `content/README.md`: men-tagged articles point to diary onboarding; women-tagged articles point to the partner referral. Never mix.

#### e) Author + reviewer bio files

If author or reviewer slugs need creating in `content/authors/`, copy from the package's `authors/` folder (the SEO workflow includes these in the package when the author/reviewer doesn't exist yet).

#### f) MedicalWebPage JSON-LD

Site B should emit `MedicalWebPage` schema for clinical content per `content/README.md`. Verify the build's JSON-LD generator handles this; if it requires per-article hints in frontmatter, set them.

#### g) Disclaimer footer

Verify the body ends with the YMYL disclaimer:

```markdown
*This article is for general education and is not a substitute for medical advice from your healthcare provider. If you are experiencing symptoms that worry you, contact a clinician.*
```

If missing, append.

### Step 6: Place the files

```bash
# MDX
mv .incoming/<topic-id>/<slug>.mdx <target-mdx-path>

# Assets
mkdir -p <asset-target-dir>
mv .incoming/<topic-id>/assets/* <asset-target-dir>/

# Author bios (if any)
if [ -d .incoming/<topic-id>/authors ]; then
  for bio in .incoming/<topic-id>/authors/*.json; do
    [ -f content/authors/$(basename "$bio") ] || mv "$bio" content/authors/
  done
fi

# Cleanup
rm -rf .incoming/<topic-id>
```

### Step 7: Post-place validation

1. YAML re-parses in new location.
2. Asset paths in body resolve.
3. Pillar's `relatedSlugs` updated correctly (if applicable).
4. Required `citations[]` populated.
5. Disclaimer footer present.
6. No em-dashes.
7. Optional `npm run build` smoke test (offer; don't run by default).

### Step 8: Report ready-to-commit

```
INTAKE COMPLETE: <topic-id> on bladderdiary-patient

Files placed:
  content/articles/en/<topic>/<slug>.mdx                (Z lines)
  public/articles/<topic>/<slug>/<asset-1>              (size)
  ...
  content/authors/<slug>.json                            (if newly created)

Will serve at:  https://myflowcheck.com/learn/<topic>/<slug>

App-specific SEO actions:
  - citations[] array assembled from N inline citations
  - Pillar uplink inserted (cluster → /learn/<topic>)
  - Pillar's relatedSlugs updated to include this slug
  - Glossary first-occurrence links: N inserted
  - Disclaimer footer: present
  - Author bio: <existing | newly created>
  - Reviewer bio: <existing | newly created | NULL — flagged as E-E-A-T warning>
  - Audience-CTA alignment: ✓ / ⚠ flagged

Frontmatter highlights:
  title:                "..."
  description:          "..." (N chars)
  topic:                ...
  pageType:             ...
  audience:             [...]
  author:               ...
  medicallyReviewedBy:  ...
  citations:            N entries
  publishedAt:          ...
  lastReviewedAt:       ...

Suggested commit message:
  content(<topic>): add <slug>.mdx

Suggested commit:
  cd /Users/zhen/bladderdiary-patient
  git status
  git diff --stat
  # Review, then:
  git add content/articles/en/<topic>/<slug>.mdx public/articles/<topic>/<slug>/
  git commit -m "content(<topic>): add <slug>.mdx"
  git push

Once Vercel deploys, tell the SEO workflow operator and they'll mark status=published in the registry.
```

End with diff offer.

## Hard rules

- **Always defer to `content/README.md` and `content/SKILL.md`** as the canonical Site B spec when in doubt.
- **Never `git add`, `git commit`, or `git push`.** User owns commits.
- **Never overwrite an existing article.** Slug + topic conflicts = STOP.
- **Never partial-place.**
- **Never invent a `medicallyReviewedBy` slug.** If reviewer is missing and the article has clinical claims, warn and surface — don't auto-assign.
- **Never modify files outside `content/` and `public/`.** Build/route/component changes are out of scope.
- **Never leave `.incoming/<topic-id>/` half-cleaned.**

## When NOT to use this skill

- For editing an already-published article (content-refresh / cycler territory)
- For non-Learn content (UI strings, hub copy — those live in `messages/<locale>.json`)
- Without a manifest in `.incoming/`
