# Phase 9 — Locale Parity Production-Hotfix · CONTEXT

**Milestone:** Medical-Grade Closure (Milestone 3)
**Source:** `.planning/audits/2026-05-18-comprehensive-audit/` (CODE-REVIEW.md + UI-REVIEW.md + FINDINGS.md)
**Started:** 2026-05-18
**Status:** Ready to plan (no /gsd-discuss-phase needed — audit IS the discovery)

---

## Why this phase exists (motivation)

The 2026-05-18 comprehensive audit found **3 Critical UI findings + 3 High findings** that all share one root cause: the locale expansion to 6 was done at the message-strings layer (`messages/*.json` parity is excellent) but never finished at three lower layers:

1. **The article-discovery layer** — `ArticleCard.tsx:36` strips locale prefixes with a hardcoded `/^\/(en|fr|es)/` regex that's missing `pt`, `zh`, `ar`. **Confirmed in production via curl:** `https://myflowcheck.com/pt/learn/voiding/feeling-bladder-is-not-empty` → 404 (the card hrefs become `/pt/pt/learn/...`).
2. **The clinical PDF export layer** — `exportPdf/strings.ts` has translation tables for en/fr/es only; helvetica (the only font set) has no glyph coverage for CJK or Arabic; several strings are hardcoded English even in EN/FR/ES PDFs.
3. **The TimePicker + landmark layer** — bedtime chips ("10 PM" / "11 PM" / "12 AM") are hardcoded English string literals; the breadcrumb `aria-label="Breadcrumb"` is hardcoded English.

Plus a YMYL E-E-A-T signal gap: author profile photos are unwired (`photoUrl` empty, `public/authors/` doesn't exist).

**Production impact:** half of the locale audience (PT/ZH/AR ≈ Portuguese-speakers, Mandarin-speakers, Arabic-speakers) is silently broken on the Learn hub right now. A Mandarin-speaking PFPT receiving a patient's PDF cannot read the section headers.

---

## Goal (from ROADMAP.md)

> PT/ZH/AR patients receive the same clinical product EN/FR/ES patients receive. The Learn-hub article cards stop 404'ing in half the locales, the clinician-facing PDF export renders correct strings AND correct glyphs in every supported locale, and the small remaining hardcoded-English leaks in TimePicker and aria-labels close.

---

## Requirements (from REQUIREMENTS.md)

- **LP-01** Article cards link to valid in-locale URLs in all 6 locales
- **LP-02** Clinical PDF export renders correct strings AND glyphs for PT/ZH/AR
- **LP-03** Eliminate hardcoded English strings in PDFs even for EN/FR/ES
- **LP-04** TimePicker bedtime preset chips render via `formatTime()` in all 6 locales
- **LP-05** Breadcrumb landmark `aria-label` is translated
- **LP-06** Author profile photos sourced + wired

---

## Success criteria (from ROADMAP.md)

1. `curl https://myflowcheck.com/{pt,zh,ar}/learn` → article cards return 200 (not 404 via `/pt/pt/`).
2. PDF export for a 3-day diary in `pt`/`zh`/`ar` renders all section headers, table headers, time-axis labels in patient's locale with correct glyphs.
3. PDFs in EN/FR/ES no longer contain hardcoded English (`exportPdf/strings.ts` covers all labels currently hardcoded in `dailyDiary.ts:55`, `slots.ts:44,142`, `machineData.ts:17,21,55,70`, `graphs.ts:194`).
4. TimePicker bedtime presets render via `formatTime()` in all 6 locales.
5. Breadcrumb `aria-label` translated in all 6 locales.
6. Author profile pages render real photos with locale-correct alt text; `Author` JSON-LD `photoUrl` non-empty.

---

## Evidence (file:line specifics from the audit)

### LP-01 — ArticleCard regex
- **Bug:** `src/components/learn/ArticleCard.tsx:36` → `href={article.urlPath.replace(/^\/(en|fr|es)/, '')}`. Then `Link` from `@/i18n/navigation` re-prepends the current locale.
- **For en/fr/es:** the regex strips the prefix, Link re-adds it correctly. Works.
- **For pt/zh/ar:** the regex doesn't strip, Link still prepends. Result: `/pt/pt/learn/...` → 404.
- **Fix shape:** Either (a) regex covers all 6 locales — but better: drive from `locales` list in `src/i18n/config.ts` so this never drifts again. Or (b) use a different URL-derivation approach that doesn't require manual locale stripping (the `urlPath` field on `Article` should likely store a locale-stripped path from the start; check `src/lib/content.ts` for where `urlPath` is computed).

### LP-02 — PDF Unicode glyph coverage + missing locale strings
- **Bug A (strings):** `src/lib/exportPdf/strings.ts` has only `en`, `fr`, `es` tables — `pt`, `zh`, `ar` fall back or error.
- **Bug B (glyphs):** `helvetica` is the only registered font in `jspdf`. Has zero CJK/Arabic coverage. Even if strings table is added, ZH/AR text renders as boxes.
- **Bug C (date formatting):** `date-fns` locale registration likely covers en/fr/es only; pt/zh/ar dates fall back to en-US format.
- **Implementation options for fonts:**
  - **(a) Embed full Noto Sans CJK + Noto Sans Arabic** — large (5-15MB per font), would bloat the bundle significantly. Not viable for a static-export PWA.
  - **(b) Subset + lazy-load** — generate subsetted fonts containing only glyphs the PDF strings table uses + the digit/punctuation range. Subset per locale. Lazy-load only when user generates a PDF in that locale. Realistic size: 200KB-2MB per locale. **Recommended approach.**
  - **(c) HTML→PDF for non-Latin locales** — uses browser fonts; different codepath; tightly couples PDF appearance to browser-rendered HTML. Complex switch; not recommended.
  - **(d) Use a different PDF library** (pdf-lib, react-pdf) — major refactor; out of scope for a hotfix.
- **Planner research task:** confirm (b) is feasible. Tools: `glyphhanger`, `subset-font`, or pre-subsetted Noto packages on npm. Check `jspdf`'s `addFileToVFS` + `addFont` API supports lazy registration mid-render.

### LP-03 — Hardcoded English in PDFs
- `src/lib/exportPdf/dailyDiary.ts:55` → "Time" column header (use `PDF_STRINGS[locale].timeHeader`)
- `src/lib/exportPdf/slots.ts:44,142` → "AM" / "PM" labels (locale-specific format or use locale-aware `formatTime`)
- `src/lib/exportPdf/machineData.ts:17,21,55,70` → "Structured Data" / "Field" / "Value" / "Events" headers
- `src/lib/exportPdf/graphs.ts:194` → time-axis labels "6am/8am/10am/.../12am/2am/4am" (these are locale-specific hour formatting)
- **Fix shape:** for each, add to `PDF_STRINGS` table (extending the locale-coverage from LP-02 to cover these labels too) + replace inline literal with `strings.<key>` lookup.

### LP-04 — TimePicker bedtime preset chips
- `src/components/diary/TimePicker.tsx:159,166,173` hardcodes "10 PM" / "11 PM" / "12 AM" as English literals inside translated wrappers ("hier soir", etc.). FR users see English-PM inside French sentence; AR users see Latin PM inside RTL.
- **Fix shape:** compute the time string via `formatTime()` from `src/lib/utils.ts` (the canonical locale-aware time formatter), driven by the chip's `Date` value.

### LP-05 — Breadcrumb aria-label
- Hardcoded English `aria-label="Breadcrumb"` in the breadcrumb component (check `src/components/seo/` and `src/components/learn/` for the source).
- **Fix shape:** add `nav.breadcrumbAriaLabel` to `messages/en.json`; the `i18n-sync` PostToolUse hook auto-mirrors to all 5 non-en locales.

### LP-06 — Author photos
- `content/authors/*.json` has empty `photoUrl`; `public/authors/` directory does not exist; author pages render without photos.
- **Sub-tasks:**
  - Source 2 author photos (the `image-source` skill can do this — Unsplash search + download + place in `public/authors/<slug>.jpg`).
  - Populate `photoUrl` field in `content/authors/<slug>.json` for both authors.
  - Wire `<img src={author.photoUrl} alt={author.name + ', ' + author.credentials}>` in `src/app/[locale]/learn/authors/[slug]/page.tsx`. Alt text needs to be translated.
  - Wire `image` or `photoUrl` field in author `JSON-LD` (likely in same page file or `src/lib/seo/`).

---

## What's already known (don't re-research)

- The locale list is in `src/i18n/config.ts` — 6 locales: `['en', 'fr', 'es', 'pt', 'zh', 'ar']`.
- The locale-aware time formatter is `formatTime()` in `src/lib/utils.ts` — already used elsewhere.
- The `i18n-sync` PostToolUse hook auto-mirrors `messages/en.json` keys to all 5 non-en locales — adding a single key here is one-line work.
- The `image-source` skill auto-sources article hero photos from Unsplash; same skill can do author photos.
- `next-intl`'s `<Link>` (from `@/i18n/navigation`) handles locale-prefix injection — `urlPath` on `Article` should likely be locale-stripped at source.
- jsPDF supports custom font registration via `doc.addFileToVFS()` + `doc.addFont()`; the question is just bundle/lazy-load strategy.
- `@vercel/analytics`'s `track()` is the pattern for any new event instrumentation (not required for this phase, just noting).

---

## What's explicitly out of scope

- The full TimelineView refactor (884-line monolith) — defer to v2.
- `JsonLd` `</` escape hardening (defense-in-depth on trusted content) — defer to v2.
- Cluster article authoring for `bph` / `frequency` / `urgency` pillars — separate SEO content workstream.
- The autosave-on-unmount fix in Log{Void,Drink,Leak}Form — that's Phase 10 (CRI-01).
- WCAG 2.1 AA fixes (h1, aria-live, skip-link, ConfirmDialog) — Phase 11.
- SEO config + BreadcrumbList JSON-LD — Phase 12.

---

## Constraints

- **Static export** (`output: "export"` in `next.config.ts`) — no SSR available; everything must be client-side or build-time-resolved.
- **Six-locale parity** — pre-commit + Stop hooks block partial-translation state. All 6 locales must be wired before any commit.
- **No new infrastructure for fonts** — must work in static-export deployment to Vercel. Lazy-load via dynamic import is fine; SSR-only mechanisms are not.
- **Boomer-safe UX** — any font subsetting must preserve readability (no compressed/pixelated rendering).
- **PDF size budget** — a clinical PDF that's 10MB hurts mobile patients. Target: PDF file size remains under 5MB even with Unicode fonts embedded for the active locale.
- **Daily walkthrough must remain green** — 6-locale production walkthrough is the canonical quality gate.

---

## Key planning questions to surface (planner should resolve these in PLAN.md or flag as questions)

1. **Font strategy decision (LP-02):** confirm subset-and-lazy-load approach. Specifically: where do the subsetted fonts live (`public/fonts/`?), how are they registered with jsPDF (`addFileToVFS` API), how do we ensure they only load when needed.
2. **Article urlPath refactor scope (LP-01):** is it cleaner to fix the regex (smaller change, but the same brittle pattern stays) or to fix at the source — store locale-stripped `urlPath` in `content.ts` from the start? The latter is more correct but touches more files.
3. **Plan splitting:** logical groupings could be (a) 1 plan per surface (4-6 plans); (b) waves: Wave 1 = critical hotfixes (LP-01 + LP-04 + LP-05 — tiny, ship-today fixes), Wave 2 = PDF localization (LP-02 + LP-03 — the big work), Wave 3 = author photos (LP-06 — content + asset work that can parallel Wave 2). The Wave 1 fast-ship pattern would stop the production bleeding within hours.
4. **Test strategy:** Playwright spec for article-card routing (verify 6-locale × hub-to-article navigation), vitest for PDF strings table coverage, manual+screenshot for author photos.
5. **Order with `i18n-sync`:** the new i18n keys (LP-05 breadcrumb, LP-04 chip strings if any, LP-06 author alt text) trigger the auto-mirror hook. Plans that touch `messages/en.json` need to account for the hook running.
6. **PDF regression testing:** existing PDF tests (if any in `src/__tests__/`) need to be extended; this is the highest-stakes surface and a regression here ships wrong-content PDFs to clinicians.

---

## Related artifacts

- `.planning/audits/2026-05-18-comprehensive-audit/FINDINGS.md` — full synthesis
- `.planning/audits/2026-05-18-comprehensive-audit/CODE-REVIEW.md` — code audit (CR-01..CR-21)
- `.planning/audits/2026-05-18-comprehensive-audit/UI-REVIEW.md` — UI audit (I1..I22) — primary source for Phase 9
- `docs/TIME_MODEL.md` — relevant context for any time-formatting work
- `content/SKILL.md` — article schema (author profile structure)
- `.claude/skills/image-source/SKILL.md` — author-photo sourcing helper
- `src/i18n/config.ts` — locale list
- `src/lib/utils.ts` — `formatTime()` canonical helper
- `src/lib/exportPdf/strings.ts` — existing PDF string table to extend
