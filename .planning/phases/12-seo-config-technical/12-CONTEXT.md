# Phase 12 — SEO Config + Technical Fixes · CONTEXT

**Milestone:** Medical-Grade Closure (Milestone 3)
**Source:** `.planning/audits/2026-05-18-comprehensive-audit/` (SEO-REVIEW.md primary)
**Started:** 2026-05-18
**Status:** Ready to plan (no /gsd-discuss-phase needed — audit IS the discovery)
**Depends on:** Nothing (parallel to Phases 9–11; can run in any order)

---

## Why this phase exists (motivation)

The 2026-05-18 SEO audit found 24 findings; the recent commits (sitemap slim 216→156, author bios expanded, audience-landing intros expanded, Search Console CLI added) genuinely closed the biggest debt. What's left is:

1. **BreadcrumbList JSON-LD is internally inconsistent** — positions 1–3 use bare paths that 404 live, position 4 uses `/en/`. Position 3 name renders raw slug (`"nocturia"` instead of `"Nocturia"`). Either confuses crawlers or renders ugly breadcrumb pills in SERPs.
2. **Bare `/` returns a JS-only redirect shell** — ~8KB JS-only HTML with no `<title>` and no body. Googlebot sees soft content on the canonical homepage. Likely a Next.js i18n-prefix gotcha where the en-locale root needs explicit rendering, not just a redirect.
3. **Audience landing intros are still under the 600-word spec target** — recent commit expanded them but they remain below `content/README.md`'s documented target.

The untracked `vercel.json` landmine has already been deleted (would have created a canonical-vs-redirect contradiction if shipped).

**Cluster article authoring for `bph`, `frequency`, `urgency` pillars is explicitly NOT in this phase** — that runs on a parallel SEO content workstream via the `article-intake` skill.

---

## Goal (from ROADMAP.md)

> Close the BreadcrumbList JSON-LD inconsistency, restore bare-root indexability (currently JS-only shell), and reach the 600-word audience-landing-intro spec target. Cluster article authoring for the 3 under-built pillars (`bph`, `frequency`, `urgency`) is explicitly OUT of this phase — that runs on a parallel SEO content workstream via the existing `article-intake` skill.

---

## Requirements (from REQUIREMENTS.md)

- **SEO-M3-01** BreadcrumbList JSON-LD uses consistent URLs + Title-Case names
- **SEO-M3-02** Bare `/` route returns indexable HTML, not JS-only shell
- **SEO-M3-03** Audience landing intros reach 600-word spec target

---

## Success criteria (from ROADMAP.md)

1. BreadcrumbList JSON-LD on every learn article uses consistent URLs (all positions use the same locale-prefixed canonical form, or all use bare paths — never a mix). Position 3 name is Title-Cased. Render-verified against 3+ sample articles per locale.
2. Bare `/` route returns HTML with non-empty `<title>` and meaningful body content (not the current ~8KB JS-only redirect shell). Soft-content risk for Googlebot eliminated. `curl -s https://myflowcheck.com/ | grep '<title>'` returns the landing-page title.
3. Audience landing pages (`/learn/for-men`, `/learn/for-women`) intro copy reaches 600 words (per `content/README.md` spec) in all 6 locales. `wc -w` on the rendered intro returns ≥ 600 per locale.

---

## Evidence (file:line specifics from the audit)

### SEO-M3-01 — BreadcrumbList JSON-LD broken (SEO-REVIEW.md T-4)

- **Bug A (URL inconsistency):** Positions 1–3 use bare paths (`/`, `/learn`, `/learn/voiding`) that 404 live (since the routing redirects bare paths to locale-prefixed). Position 4 uses `/en/learn/voiding/<slug>` correctly. Crawlers get inconsistent signal — some breadcrumb positions point to non-existent URLs.
- **Bug B (name casing):** Position 3 name renders the raw lowercase slug (`"nocturia"`) instead of the Title-Cased display name (`"Nocturia"`). SERPs render the lowercase form as a breadcrumb pill.
- **Fix site:** Probably `src/components/seo/JsonLd.tsx` (or wherever `BreadcrumbList` is assembled — search `src/lib/seo/` and `src/components/seo/`).
- **Fix shape:** (a) use the same locale-prefixed URL form across ALL 4 positions; (b) map slug → Title-Case display name via a topic-name lookup (the topic frontmatter likely has a display name; if not, capitalize the slug + replace dashes with spaces).

### SEO-M3-02 — Bare `/` JS-only shell (SEO-REVIEW.md T-2)

- **Bug:** `curl -s https://myflowcheck.com/` returns ~8KB of HTML with no `<title>`, no body content, just a JS bootstrapper that redirects to `/en/`. Googlebot reads this as a soft-content / soft-redirect page.
- **Root cause hypothesis:** Next.js i18n with `localePrefix: 'as-needed'` is supposed to render the default locale (en) at the bare path. The static export likely emits `out/index.html` from the en-locale root — but somehow that's missing or broken. May be a `next.config.ts` config issue, may be a build-step gap.
- **Investigation needed:** Run `npm run build` locally, inspect `out/index.html`. Is it empty/JS-only? Is `out/en/index.html` the correct rendering? Is there a Vercel-side rewrite intercepting the static `index.html`?
- **Fix shape:** Either (a) fix the next-intl + static-export configuration so `out/index.html` IS the en-locale homepage, OR (b) configure Vercel routing to serve `out/en/index.html` as `/`, OR (c) add a build step that copies `out/en/index.html` → `out/index.html`.

### SEO-M3-03 — Audience landing intros under 600 words (SEO-REVIEW.md C-4)

- **Bug:** `content/README.md` documents a 600-word target for audience landing intros. Recent commit (4245edc) expanded `/learn/for-men` and `/learn/for-women` intros but they're still under target.
- **Fix shape:** Either expand the existing MDX/component-based intros to ≥600 words, OR re-evaluate the 600-word target if it's been deprecated.
- **Decision needed:** is 600 the right target? Per `content/README.md` — verify. If yes, expand. If the target has moved, document the new target in this plan.

---

## What's already known (don't re-research)

- The canonical URL is bare `myflowcheck.com` (verified in memory `project_canonical_url.md`).
- `vercel.json` was deleted at the start of Milestone 3 setup — routing is owned by the Vercel dashboard.
- Sitemap is already locale-prefixed for non-en locales and bare for en (per `src/app/sitemap.ts`).
- next-intl uses `localePrefix: 'as-needed'` — en is bare, others are prefixed.
- The static export emits `out/index.html` (en root) + `out/<locale>/...` (other locales).
- `content/README.md` is the full SEO spec; `content/SKILL.md` is the agent intake skill.
- The Search Console indexing CLI (`scripts/check-search-console.mjs`) was recently added and is real diagnostic infrastructure.

---

## What's explicitly out of scope

- **Cluster article authoring** for `bph` / `frequency` / `urgency` pillars (each has only `_pillar.mdx`, no clusters) — this is a separate SEO content workstream running via `article-intake` skill on a parallel track.
- **Author photo sourcing** — that lands in Phase 9 LP-06.
- **Image SEO sweep** — out of scope unless audit found a specific bug (it didn't beyond hero images already being `<img>` with width/height).
- **CWV optimization** — current performance posture is good per the audit; defer fine-tuning.
- **JSON-LD beyond BreadcrumbList** — `MedicalWebPage` / `Article` / `Person` / `WebSite` schemas are already in good shape per the audit.

---

## Constraints

- **Static export only.** `next.config.ts` has `output: "export"` — no server-side rendering. Any fix to bare `/` must work in a static-export deployment.
- **6-locale parity.** Audience landing intros must hit 600 words in ALL 6 locales (including translations). The `article-translate` workflow handles foreign-locale article translation but audience landings may be component-based, not MDX-based — verify the i18n pattern.
- **Don't break the recent SEO wins.** Sitemap slim, author bios, audience landing expansion — preserve all that. This phase ADDS to the foundation, doesn't refactor it.
- **Cluster article scope hold.** Easy to scope-creep into cluster authoring. Do not — separate workstream.

---

## Key planning questions to surface

1. **Bare `/` root cause first.** Before planning the fix, investigate: build locally, inspect `out/index.html`. Decide whether the fix is in `next.config.ts`, in Vercel routing, or in a post-build copy step. This investigation may need to happen INSIDE the plan as Task 1.
2. **BreadcrumbList URL form.** Locale-prefixed (`/<locale>/learn/<topic>/<slug>`) is the canonical choice since that's what position 4 already uses + matches the sitemap. Confirm.
3. **Topic display-name source.** Where does the Title-Case "Nocturia" come from? Topic frontmatter (`_pillar.mdx` `title` field)? A hardcoded map? Inspect `src/lib/content.ts` + `content/articles/en/<topic>/_pillar.mdx`.
4. **Audience landing expansion content source.** Is the intro MDX, JSON, or component-coded? Are translations human-quality or LLM-mirrored? Decide whether 600-word expansion is an editorial task (human writes EN, naturalize-prose mirrors to 5 locales) or a planning task this phase covers in one shot.
5. **Plan splitting.** Recommend 2 plans: Plan 1 = BreadcrumbList fix + bare-root fix (technical SEO surface); Plan 2 = audience-landing expansion + 6-locale parity. Plus Plan 3 = verification spec.
6. **Verification.** Add an e2e or build-time test that asserts `out/index.html` is non-empty + has a title; assert BreadcrumbList JSON-LD positions are consistent.

---

## Related artifacts

- `.planning/audits/2026-05-18-comprehensive-audit/SEO-REVIEW.md` — primary source
- `.planning/audits/2026-05-18-comprehensive-audit/FINDINGS.md` — synthesis
- `content/README.md` — full SEO spec (including 600-word target for audience landings)
- `content/SKILL.md` — article intake skill
- `src/app/sitemap.ts` + `src/app/robots.ts` — current SEO infrastructure (good shape)
- `src/components/seo/JsonLd.tsx` — likely BreadcrumbList fix site
- `src/i18n/seo.ts` — canonical / hreflang helpers
- `src/i18n/config.ts` — locale list
- `scripts/check-search-console.mjs` — diagnostic CLI for indexing health
