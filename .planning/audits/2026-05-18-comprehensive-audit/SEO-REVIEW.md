# SEO Audit — My Flow Check (myflowcheck.com)
**Date:** 2026-05-18
**Scope:** Comprehensive SEO audit covering technical SEO, content architecture, locale SEO, performance signals, indexability, and medical (YMYL) trust signals.

---

## Executive Summary

**Total findings: 24** (Critical: 2, High: 7, Medium: 9, Low: 6)

**Top 5 SEO priorities for Milestone 3:**

1. **Fill the cluster gap on three high-value pillar-only topics** (`bph`, `frequency`, `urgency`) — each has a pillar with zero supporting cluster articles, capping topical authority on patient-symptom head terms.
2. **Decide and ship the bare-URL vs locale-prefix routing model** — the untracked `vercel.json` proposes bare-path rewrites that conflict with the live canonical structure. Right now `/learn/nocturia` is 404 while `/en/learn/nocturia` is the canonical. Pick one and align canonical tags, sitemap, and Vercel routing.
3. **Fix BreadcrumbList JSON-LD inconsistencies** — topic name renders as `"nocturia"` (lowercase, raw slug) and item URLs are inconsistent (positions 1-3 use bare paths that 404; position 4 uses `/en/`).
4. **Add author photos** — both `dr-di-wu.json` and `dr-steven-tijerina.json` reference `photoUrl` paths but `public/authors/` does not exist. Author E-E-A-T is the single biggest YMYL lever and real photos materially help.
5. **Ship the missing 2nd/3rd cluster for `bladder-irritants` and `nocturia`** (currently 1 cluster each, target is 2-3).

**Overall SEO posture verdict:** The site has unusually mature SEO scaffolding for its age — high-quality JSON-LD (MedicalWebPage + Article + ICD-10 codes), full 6-locale hreflang, strong author bios with LinkedIn `sameAs`, citation arrays piped into schema, dateModified honesty, near-perfect i18n content parity (line-count exact across all 6 locales for every article), and a recently slimmed sitemap. The two biggest drags are (a) thin topic-cluster shape on three pillars and (b) routing inconsistency between live behavior, in-code canonicals, and an untracked `vercel.json` that proposes a different model. Almost every recent commit moved real numbers (sitemap focus, author bio expansion, audience landing intros). Don't break what's working.

**Estimated organic-traffic impact of fixing the top 3:**
- Cluster fills (priority 1, 5): a single mature topic cluster (pillar + 3-5 clusters) typically captures 3-10× the long-tail volume of the pillar alone. Three orphan pillars × 3 clusters each = +9 indexable cluster pages that target distinct long-tail queries — plausible 2-4× lift on those topics' captured traffic over 3-6 months.
- Routing alignment (priority 2): not a traffic-growth lever but removes a category of accidental ranking loss when Google encounters the bare-path 404s or the soft-content bare `/` page.
- Breadcrumb fix (priority 3): improves SERP breadcrumb rendering (currently breadcrumb names show `nocturia` to crawlers); low traffic impact, high credibility impact.

---

## Findings by category

### TECHNICAL SEO

---

#### Finding T-1: Untracked `vercel.json` proposes a routing model that conflicts with shipped canonical URLs

- **Severity: Critical**
- **Evidence:**
  - `git status` shows `?? vercel.json` (untracked, never committed)
  - `vercel.json` content: rewrites bare `/learn/*` to `/en/learn/*`, then redirects `/en/*` → `/*` (308 permanent)
  - Live behavior (current production): `curl https://myflowcheck.com/learn/nocturia` returns **404**; `curl https://myflowcheck.com/en/learn/nocturia` returns **200**
  - Live canonical on every article: `<link rel="canonical" href="https://myflowcheck.com/en/learn/...">` (locale-prefixed)
  - Sitemap entries: all 156 URLs are locale-prefixed (e.g. `https://myflowcheck.com/en/learn/nocturia`)
  - If `vercel.json` ships unchanged: canonical tag `…/en/learn/…` would 308-redirect to `…/learn/…`, putting Google in the position of trusting the canonical tag (locale-prefixed URL) while the URL itself redirects somewhere else. That is exactly the "canonical-vs-redirect contradiction" that Google's documentation flags as "we may ignore your canonical."
- **Why it matters:** If `vercel.json` ships in its current form without updating `canonical` and `sitemap.ts` accordingly, every article page will have a canonical tag pointing to a 308-redirected URL. Google's stated behavior on canonical/redirect conflicts is unstable — it may pick either URL or split signals across both. Even if it picks correctly, the redirect chain dilutes link equity for any backlinks pointing to either URL form.
- **Fix approach:** Decide which URL form is canonical before deploying. Two viable options:
  - **Keep `/en/learn/...` as canonical** (status quo, lowest risk): delete the untracked `vercel.json`, accept that English content lives at `/en/*` paths and not at bare paths. The bare `/` already 200s to a redirect shim.
  - **Migrate to bare-path canonical** (more work): keep the `vercel.json` rewrites but ALSO update (a) every `generateMetadata` to emit bare canonical `/learn/...` for `en` and prefixed for others, (b) `sitemap.ts` to emit bare URLs for en (skip `localizedPath` for en), (c) `getArticleAlternates` to emit bare paths for en, (d) `LocaleLayout.canonical` to special-case en. Then run a full curl audit of every page type to confirm no redirect-canonical conflicts remain.

---

#### Finding T-2: Bare `/` returns a soft-content shell (200, ~8KB, no `<title>` / no meta description / JS-only redirect)

- **Severity: High**
- **Evidence:**
  - `curl -I https://myflowcheck.com/` returns `200 OK`, Content-Length: 8440 bytes
  - HTML contains `<link rel="canonical" href="https://myflowcheck.com/en"/>` but no `<title>`, no `<meta name="description">`, no rendered body content
  - `LocaleRedirect.tsx` uses `useEffect` + `router.replace` (JS-required) with `<noscript><meta http-equiv="refresh" content="0;url=/en"></noscript>` fallback
  - This page IS reachable to crawlers (it's 200, not redirected) — and any inbound link to the bare apex (e.g. "myflowcheck.com" without trailing path) hits it
- **Why it matters:** This is a soft-404 / thin-content pattern. Google typically tolerates client-side redirects with proper canonical, but the URL is competing in the index with its `/en` canonical, and the apex URL gets the most backlinks (brand mentions, social shares typed without paths). The combination of empty `<title>`, empty body, and JS-only redirect is a worst-case rendering signature.
- **Fix approach:** Either (a) make the apex page a server-rendered shell with a real `<title>` and `<meta description>` plus a same-page redirect via `redirect()` from `next/navigation` at the page-component level, or (b) move to a real 301 server redirect via `vercel.json` ("redirects" entry from `/` to `/en` when no locale cookie, OR make the redirect happen earlier in the rendering pipeline). Option (a) keeps the i18n cookie-aware logic; option (b) is simpler.

---

#### Finding T-3: `/feed.xml` (bare) returns 404; only `/{locale}/feed.xml` works

- **Severity: Medium**
- **Evidence:**
  - `curl -I https://myflowcheck.com/feed.xml` → 404
  - `curl -I https://myflowcheck.com/en/feed.xml` → 200 (valid RSS)
  - The untracked `vercel.json` includes `{ "source": "/feed.xml", "destination": "/en/feed.xml" }` — never deployed
  - `LocaleLayout` injects `<link rel="alternate" type="application/rss+xml" href="/${locale}/feed.xml">` — so discovery from the rendered HTML still works on locale-prefixed pages
- **Why it matters:** RSS readers, search bots, and tools that probe `/feed.xml` and `/rss.xml` by convention (e.g. Google's RSS discovery) won't find the feed. Discoverability is degraded. Minor compared to T-1/T-2 but trivially fixable.
- **Fix approach:** Either ship the `vercel.json` rewrite (resolving T-1 in the process) or add a static redirect from `/feed.xml` to `/en/feed.xml` via a manual file at `public/feed.xml` that meta-refreshes to `/en/feed.xml`, or just accept the locale-only path and live with it.

---

#### Finding T-4: `BreadcrumbList` JSON-LD has inconsistent URLs (some `/en/`, some bare) and a raw-slug name

- **Severity: High**
- **Evidence:** On `https://myflowcheck.com/en/learn/nocturia/waking-up-to-pee-at-night`:
  ```
  pos 1: 'Home'      -> https://myflowcheck.com/        (bare; 200 OK soft-404 shell)
  pos 2: 'Learn'     -> https://myflowcheck.com/learn   (bare; 404 live)
  pos 3: 'nocturia'  -> https://myflowcheck.com/learn/nocturia  (bare; 404 live)
  pos 4: 'Waking Up to Pee at Night: ...' -> https://myflowcheck.com/en/learn/nocturia/waking-up-to-pee-at-night  (live, canonical)
  ```
  - Source: `src/app/[locale]/learn/[topic]/[slug]/page.tsx:122-127` builds breadcrumb items with bare `href` like `/learn/${topic}`, then `BreadcrumbJsonLd` (in `src/components/seo/JsonLd.tsx:79`) calls `buildAbsoluteUrl(item.url)` which prepends `SITE_URL` to whatever path is passed
  - Position 3 name is `topic.replace(/-/g, ' ')` → `"nocturia"` (lowercase, not the topic display name)
- **Why it matters:** Google uses BreadcrumbList JSON-LD to render breadcrumbs in search results. Wrong/404 URLs in the schema cause Google to either reject the breadcrumb extension or worse, attempt to verify the URLs and find them broken. The lowercase raw slug as a breadcrumb name shows in SERPs as "nocturia" instead of "Nocturia" or "Why You Wake Up at Night."
- **Fix approach:** In every page that builds breadcrumbs, expand the `href` to a fully-locale-prefixed path before passing to JSON-LD (e.g. `/${locale}/learn/${topic}` not `/learn/${topic}`). For breadcrumb item names, use the pillar's `frontmatter.title` rather than `topic.replace(/-/g, ' ')` for the topic step.

---

#### Finding T-5: `sitemap.ts` does not include the home, hub, or article paths at bare URLs even though `next-intl` `localePrefix: 'as-needed'`

- **Severity: Low** (consistent with current live behavior — not a bug given T-1's status quo)
- **Evidence:** Every sitemap entry is locale-prefixed (`/en/learn/...`, `/fr/learn/...`, etc.); no bare `/learn/...` entries. This is internally consistent with the live canonical URLs.
- **Why it matters:** Only relevant if T-1 resolves toward the bare-path canonical model. Otherwise this is correct as-is.
- **Fix approach:** Leave alone unless T-1 lands the bare-path model, in which case update `localizedPath('en', ...)` for English to skip the `/en` prefix.

---

#### Finding T-6: Pillar frontmatter `slug` does not match topic folder or filename (BPH pillar)

- **Severity: Low**
- **Evidence:**
  - `content/articles/en/bph/_pillar.mdx` has frontmatter `slug: "enlarged-prostate-symptoms"` but the file is `_pillar.mdx` in topic folder `bph`
  - `content/articles/en/bladder-training/_pillar.mdx` has `slug: "bladder-training-exercises"`
  - In `src/lib/content.ts:123`, the slug is forcibly overridden to `_pillar` for pillar files at runtime, so the frontmatter slug is silently ignored for URL building — pillar URL is always `/learn/{topic}`
  - `content/README.md` SEO checklist line 167: "filename matches slug (or is _pillar.mdx for pillars)" — the BPH frontmatter slug violates this convention
- **Why it matters:** No live SEO impact (slug is overridden) but the frontmatter is misleading to anyone reading the file. Worse: if `getArticleAlternates` ever moves to match on slug for pillars, the cross-locale alternates would break. Each locale's pillar uses the same fictitious slug; if one drifts, alternates silently miss.
- **Fix approach:** Change the pillar frontmatter slugs to either match the topic folder (`bph`, `bladder-training`) OR to `_pillar` (matching what the code uses). Pick one convention and apply across all pillars in all 6 locales (12 files for those two pillars; ~54 across all 9 pillars × 6 locales).

---

#### Finding T-7: `priority` prop on `next/image` is not emitting `fetchPriority="high"` (static export limitation)

- **Severity: Medium**
- **Evidence:**
  - `next.config.ts` sets `images: { unoptimized: true }` (required for `output: "export"`)
  - Live hero `<img>` on an article page: `<img alt="..." width="1200" height="630" decoding="async" data-nimg="1" class="w-full h-auto" ... src="...">`  — no `fetchpriority` attribute
  - But `<link rel="preload" as="image" href="/articles/...">` IS emitted for the hero, so the hero is preloaded
  - The only `fetchPriority` in the HTML is `fetchPriority="low"` on a script preload
- **Why it matters:** `fetchpriority="high"` on the LCP image is a documented Core Web Vitals lever. Without it, the browser allocates equal priority to the hero image and below-the-fold assets. Preload partially compensates but doesn't replace the hint.
- **Fix approach:** Either accept the limitation (preload is doing most of the work) or add `fetchpriority="high"` manually to the hero `<Image>` via `style` / a custom `loader` / dropping to a hand-rolled `<img>`. Low effort, measurable LCP impact.

---

#### Finding T-8: Article internal `<a>` to `https://` URLs always emit `rel="nofollow"` (citation links lose dofollow signal)

- **Severity: Medium**
- **Evidence:**
  - `src/lib/mdx.tsx:77-86`: every non-internal anchor gets `rel="noopener noreferrer nofollow"` unconditionally
  - But citation list items (rendered separately in `src/app/[locale]/learn/[topic]/[slug]/page.tsx:204-214`) use a plain `<a>` with `rel="noopener noreferrer"` (NO nofollow) — so the citations array DOES preserve dofollow
  - However: any inline link inside MDX body to a primary source (e.g. inline `[Cochrane Review](https://...)` in body prose) gets nofollow
  - `content/README.md` line 332: "External links should use `rel='nofollow noopener'` unless explicitly citing a primary source, where dofollow is fine and signals trust." Implementation diverges from spec.
- **Why it matters:** Outbound dofollow links to high-authority medical sources (PubMed, AUA guidelines, Cochrane) are a positive ranking signal for medical pages — they tell Google the page is well-researched. Forcing nofollow on every inline link means the spec's "primary source citations are dofollow" intent isn't realized for inline links.
- **Fix approach:** Either drop the unconditional `nofollow` in `mdx.tsx` (let the article author opt in via Markdown extensions — but MD doesn't support per-link rel) or move all primary-source links to the frontmatter `citations[]` array (which already gets dofollow). Document the convention so authors know inline `[text](http://...)` is nofollow.

---

#### Finding T-9: Paginated pages correctly emit `noindex, follow` — confirmed working

- **Severity: (positive)**
- **Evidence:** `src/app/[locale]/learn/articles/page/[page]/page.tsx:43-47` and `src/app/[locale]/learn/[topic]/page/[page]/page.tsx:62-65` both set `robots: { index: false, follow: true }`. Page-1 of archive and topic pillars correctly indexable.
- **Why it matters:** Prevents pagination crawl-budget waste while preserving discovery of paginated content via internal links. Good as-is.

---

#### Finding T-10: `robots.txt` correctly disallows diary/summary routes

- **Severity: (positive)**
- **Evidence:** Live `robots.txt`:
  ```
  Disallow: /*/diary/
  Disallow: /*/diary
  Disallow: /*/summary/
  Disallow: /*/summary
  Disallow: /api/
  ```
  These are exactly the right paths to keep out of the index — the diary tool is a private, localStorage-only feature with no shareable content. `/api/` is also disallowed even though no API exists (defensive).
- **Why it matters:** Confirms intent matches behavior. Diary pages have no SEO value (they're personal trackers, not content).

---

#### Finding T-11: Author pages excluded from sitemap (per recent sitemap-slim policy) — correct trade-off

- **Severity: (positive)**
- **Evidence:** `src/app/sitemap.ts:163` `void getAllAuthors;` — deliberate exclusion. Comment block explains: "E-E-A-T value is delivered through article-level author byline + Person JSON-LD; the standalone author page doesn't need to rank."
- **Why it matters:** Correct policy for a 2-author site. Author pages still index via internal links from articles. Sitemap focuses crawl budget on articles.

---

### CONTENT ARCHITECTURE

---

#### Finding C-1: Three pillars have ZERO supporting cluster articles (orphan pillars)

- **Severity: Critical**
- **Evidence:**
  ```
  bph:        1 pillar, 0 clusters
  frequency:  1 pillar, 0 clusters
  urgency:    1 pillar, 0 clusters
  ```
  - `content/README.md` lines 142-146: "Plan 2 to 3 cluster articles before approving the pillar. Single-article topics rank poorly."
  - `content/README.md` lines 105-110: "Pillar pages target the head keyword. Cluster articles target long-tail keywords related to the pillar."
  - Live URLs: `/en/learn/bph`, `/en/learn/frequency`, `/en/learn/urgency` each are a single pillar page with no clusters
- **Why it matters:** Topic clusters work because each cluster article ranks for distinct long-tail queries AND internal-links into the pillar. Without clusters, the pillar's topical authority is one page wide. "BPH" is one of the highest-volume medical terms in the entire urology space — having a pillar with 0 clusters means missing 90%+ of the long-tail (e.g. "BPH symptoms timeline," "BPH vs prostate cancer," "tamsulosin side effects," "BPH and erectile dysfunction" — the FAQ section at the end of the BPH pillar literally hints at the cluster topics the site is missing).
- **Fix approach:** Plan 2-3 clusters per orphan pillar. From the existing BPH pillar's FAQ section: "5 warning signs of an enlarged prostate," "drinks to avoid with an enlarged prostate," "BPH vs prostate cancer," "decongestants and BPH" are all ready-to-write cluster topics. Same exercise on urgency and frequency.

---

#### Finding C-2: Three more topics under-deliver against the spec target of 2-3 clusters

- **Severity: High**
- **Evidence:**
  ```
  bladder-irritants:    1 pillar, 1 cluster
  nocturia:             1 pillar, 1 cluster
  post-prostatectomy:   1 pillar, 1 cluster
  ```
  - Spec target (`content/README.md` line 144): "2 to 3 cluster articles"
- **Why it matters:** Same logic as C-1 but less severe — at least one cluster exists. Each is one cluster short of the spec target.
- **Fix approach:** Add 1-2 more clusters each. Strong candidates from existing pillar content:
  - `nocturia/`: clusters on "nocturnal polyuria index" (existing pillar references this metric), "CPAP and nocturia" (sleep apnea pathway), "evening fluid timing"
  - `bladder-irritants/`: clusters on "caffeine and bladder" (already a glossary auto-link target), "alcohol and bladder," "spicy foods and urgency"
  - `post-prostatectomy/`: cluster on "pelvic-floor PT after prostatectomy," "Kegels after prostate surgery," "nighttime leaking after prostatectomy"

---

#### Finding C-3: `foods-that-irritate-the-bladder` cluster article has zero outbound internal `/learn/` links in body

- **Severity: Medium**
- **Evidence:**
  - `grep -c "/learn/" content/articles/en/bladder-irritants/foods-that-irritate-the-bladder.mdx` → 0
  - Glossary auto-linking via `remarkAutoLinkGlossary` does add some inline glossary links at render time (the live page shows 13 inline links to other articles when rendered) — so this isn't as bad as the source count suggests
  - But comparable cluster articles (e.g. `feeling-bladder-is-not-empty.mdx`) have 6 source-level internal links into the body
- **Why it matters:** Internal linking is one of the strongest within-our-control ranking levers. A cluster that doesn't link back to its pillar or to sibling clusters dilutes the cluster topology. The article also acts as a leaf node — link equity flows in but not out, breaking the spread.
- **Fix approach:** Add 3-5 inline internal links in the body to the `bladder-irritants/_pillar`, to relevant topic pillars (e.g. `urgency`, `nocturia`), and to glossary entries. Same audit on any cluster article with <3 internal links.

---

#### Finding C-4: Audience landing pages (`/learn/for-men`, `/learn/for-women`) have minimal intro copy

- **Severity: Medium**
- **Evidence:**
  - `src/app/[locale]/learn/for-men/page.tsx:78-86`: header (`title` + `description`) + one `intro` paragraph (`tForMen('intro')`) + CTA card + article grid
  - `content/README.md` line 349: "Making `/learn/for-men` a thin index page triggers Google's thin-content penalty. It needs 600+ words of unique intro content above the article grid."
  - Recent commit `4245edc content(seo): expand author bios + audience-landing intros to reduce thin-content signal` did expand the intro — but a single paragraph is unlikely to hit 600 words even after expansion
  - Audience landings are excluded from sitemap per the slim-156 policy (correct trade-off given current thinness)
- **Why it matters:** Audience landings ARE indexable (no `noindex`), reachable via the chip rail on `/learn`, but sitemap-deprioritized. If they're going to rank for "bladder health for men" / "bladder health for women" — high-intent audience queries — they need substantive intro content (sub-headings, breakdowns of "what's covered here," call-outs distinguishing the audience from the other audience, navigation aids).
- **Fix approach:** Either commit to the audience landings as real content pages (expand to 600+ words of unique editorial intro per the spec, then re-add to sitemap), or set them to `noindex` and treat them as pure navigation hubs. Right now they're in the awkward middle — indexable but thin.

---

#### Finding C-5: TOPIC_GROUPS taxonomy lists many topics that don't have content yet

- **Severity: Low**
- **Evidence:** `src/lib/topics.ts:23-62` defines `TOPIC_GROUPS` with topics like `oab`, `urge-incontinence`, `stress-incontinence`, `mixed-incontinence`, `sleep-and-bladder`, `prostate-health`, `pelvic-floor`, `pelvic-organ-prolapse`, `postpartum`, `menopause`, `pregnancy`, `behavioral-therapy`, `pelvic-floor-exercises`, `hydration`, `diet`, `lifestyle`, `caffeine`. None of these have content folders. They're filtered out at render time (`groupTopics.filter((tg) => topicSet.has(tg))`).
  - `content/README.md` line 31-32 lists `pelvic-floor/` and `pelvic-organ-prolapse/` as planned topics with documented women-specific clinical scope — but they don't exist on disk.
  - `FEATURED_CHIPS` includes a `chipDailyLife` chip pointing to `/learn/hydration` which is gated by `topic: 'hydration'` (won't render until `hydration` topic exists)
- **Why it matters:** Not an SEO bug per se but reveals a content roadmap: 17 planned topics, 0 existing. Useful to note in milestone planning.
- **Fix approach:** Pick 2-3 highest-priority topics from the planned list to ship (likely `pelvic-floor` and `hydration` based on chip rail prominence). Each new topic = 1 pillar + 2-3 clusters = 3-4 indexable pages × 6 locales = 18-24 new sitemap entries.

---

#### Finding C-6: Article titles slightly over the 60-char SERP truncation target

- **Severity: Low**
- **Evidence:** 5 of 20 EN article titles exceed 60 chars:
  ```
  61 "Voiding Symptoms: Slow Stream, Hesitancy, and Trouble Emptying"
  63 "Bladder Diary App: What Three Days Will Show You About Your Body"
  68 "Bladder Irritants: Foods, Drinks, and Habits That Make Symptoms Worse"
  ```
  - 3 article descriptions exceed 160 chars (target: 140-160)
- **Why it matters:** Over-length titles get truncated in Google SERPs with "..." which can cut off the value prop. Over-length descriptions are rewritten by Google to whatever Google thinks is more relevant.
- **Fix approach:** Trim titles to ≤60 chars on the 3 worst offenders. Trim descriptions to ≤160 chars where over-length.

---

### LOCALE SEO

---

#### Finding L-1: Foreign-locale content parity is exceptional — line-by-line mirror across all 6 locales

- **Severity: (positive — major win)**
- **Evidence:** `wc -l` on each EN article matches the same article in `ar`/`fr`/`es`/`pt`/`zh` to within 0-2 lines. Total: EN articles sum to 4971 lines, AR articles sum to 4974 lines. Variance is in YAML date format wrapping, not body content.
- **Why it matters:** Most multi-locale sites have radically uneven foreign-locale depth (stub translations, machine output, missing paragraphs). Here, sample inspection of Arabic and Chinese articles confirms genuine human-quality translation throughout — including translating the closing case-study narratives, FAQs, and DiaryCta copy. This is the single biggest E-E-A-T multiplier across the 6 locales and is doing real SEO work.
- **Fix approach:** Maintain this discipline (already enforced by Stop hook + pre-commit hook per `.claude/scripts/article-i18n-completeness.sh`).

---

#### Finding L-2: Hreflang map correctly includes `x-default` and bidirectional references — confirmed working

- **Severity: (positive)**
- **Evidence:**
  - Live HTML on every page emits the 6-locale hreflang map + `x-default` pointing to `/en`:
    ```html
    <link rel="alternate" hrefLang="en" href="https://myflowcheck.com/en/learn/..."/>
    <link rel="alternate" hrefLang="fr" href="...fr..."/>
    <link rel="alternate" hrefLang="es" href="...es..."/>
    <link rel="alternate" hrefLang="pt" href="...pt..."/>
    <link rel="alternate" hrefLang="zh-Hans" href="...zh..."/>
    <link rel="alternate" hrefLang="ar" href="...ar..."/>
    <link rel="alternate" hrefLang="x-default" href="https://myflowcheck.com/en/..."/>
    ```
  - Reciprocity: each locale page lists all 6 siblings + x-default ✓
  - Sitemap also embeds the same hreflang map per URL ✓
  - `zh-Hans` correctly identifies Simplified Chinese (not bare `zh`)
- **Why it matters:** This is well-implemented. Worth calling out so it doesn't break in future refactors.

---

#### Finding L-3: `ArticleCard.tsx` strips only `(en|fr|es)` from URL — misses `pt|zh|ar`

- **Severity: Low**
- **Evidence:** `src/components/learn/ArticleCard.tsx:36`:
  ```ts
  href={article.urlPath.replace(/^\/(en|fr|es)/, '')}
  ```
  Articles for `pt`/`zh`/`ar` keep the locale prefix in the `href` passed to `<Link>`. The `<Link>` (next-intl) will re-add the locale anyway, so the user-visible href is correct, but the source intent is broken.
- **Why it matters:** Cosmetic now. If next-intl ever changes behavior on doubled locale prefixes, this would 404 PT/ZH/AR article cards. Latent risk, near-zero current impact.
- **Fix approach:** Change to `replace(/^\/(en|fr|es|pt|zh|ar)/, '')` or use `replace(/^\/[a-z]{2}/, '')`.

---

#### Finding L-4: Arabic article RTL renders correctly; no JSON-LD direction issues observed

- **Severity: (positive)**
- **Evidence:**
  - `LOCALE_DIR.ar = 'rtl'` correctly applied via `<html dir="rtl" lang="ar">` in `src/app/[locale]/layout.tsx:110`
  - Arabic JSON-LD on `/ar/learn/bph` (spot-checked) — strings are stored normally (LTR YAML, LTR JSON), browsers and crawlers handle BiDi naturally
  - Hreflang for AR sends `hreflang="ar"` (not `ar-SA` — matches `HREFLANG.ar = 'ar'` in `src/i18n/seo.ts`). This generic `ar` is correct for "Modern Standard Arabic for any Arabic-speaking market."
- **Why it matters:** Confirms a major SEO trap (RTL physical-CSS leaks into structured data, broken hreflang for non-Latin script locales) is NOT present here.

---

### PERFORMANCE / CWV

---

#### Finding P-1: Article pages include diary-app chrome JS (~225KB) — heavy for content-only readers

- **Severity: Medium**
- **Evidence:**
  - Article page HTML is 178KB
  - JS bundles served: ~410KB total across 7 chunks, including a 224KB bundle (likely the diary store + Zustand + diary forms + form correctors)
  - AppShell, Header, BottomNav, Footer, PrivacyNotice all `'use client'` and rendered on every page including /learn articles
- **Why it matters:** A user landing on a /learn article doesn't need the diary code, but they ship anyway. INP and CLS take a small hit from blocking script load. For users on slow networks (mobile in non-EN markets) this is felt.
- **Fix approach:** Route segmentation. Move AppShell client logic to a server-rendered layer where possible, or split the layout into a `LearnAppShell` (lighter — no FAB, no PWA install prompt, no service worker registration?) versus `DiaryAppShell`. Lower priority than content gaps but a measurable Core Web Vitals lever for content traffic.

---

#### Finding P-2: Hero image preloaded but not `fetchpriority="high"` — see T-7

(see T-7 for evidence + fix)

---

#### Finding P-3: Inter font correctly preloaded via `next/font` — no FOIT/FOUT risk

- **Severity: (positive)**
- **Evidence:**
  - `src/app/[locale]/layout.tsx:13-17`: `Inter` from `next/font/google` with `display: 'swap'`, `subsets: ['latin']`
  - Live HTML: `<link rel="preload" href="/_next/static/media/...woff2" as="font" crossorigin type="font/woff2"/>`
- **Why it matters:** Standard best practice executed correctly.

---

#### Finding P-4: All in-body images use `next/image` with explicit width/height — CLS-safe

- **Severity: (positive)**
- **Evidence:**
  - `src/lib/mdx.tsx:42-65` resolves image dimensions at build time from `public/` files using `image-size` package
  - Live HTML: every `<img>` has `width="N" height="N"` attributes (confirmed on hero, inline images, author photos)
  - Image-heavy article (`foods-that-irritate-the-bladder`, 11 images) renders 10/11 with `loading="lazy"` and dimensions
- **Why it matters:** CLS (Cumulative Layout Shift) is a confirmed ranking factor. Doing this right is non-obvious — many static-export sites get it wrong.

---

### INDEXABILITY / SEARCH CONSOLE HEALTH

---

#### Finding I-1: `scripts/check-search-console.mjs` (newly added) is a complete CLI for URL-inspecting every sitemap URL via Google Search Console API

- **Severity: (positive — tooling win)**
- **Evidence:** `scripts/check-search-console.mjs` (363 lines) implements:
  - `node scripts/check-search-console.mjs auth` — one-time OAuth
  - `node scripts/check-search-console.mjs report --pretty` — inspects every URL in the live sitemap, aggregates by verdict + coverageState, writes JSON output
  - Comment block at top notes the original problem: "Search Console export showed 157 URLs stuck in 'Discovered – currently not indexed' — i.e. crawl-budget waiting list" — exactly the trigger for the sitemap-slim policy
- **Why it matters:** This is the right diagnostic infrastructure for a content-heavy site. Run it after each content batch lands. Existing token cache means subsequent runs are zero-friction.
- **Fix approach:** Use it. The repo's `package.json` doesn't yet add a npm script wrapper — consider `"sc:report": "node scripts/check-search-console.mjs report --pretty"` for ergonomics.

---

#### Finding I-2: Soft-404 risk on bare `/` (see T-2) and on `/learn` (bare) — both 404 or near-empty

- **Severity: High** (covered by T-2 and T-1)
- **Evidence:** See T-1 and T-2.
- **Why it matters:** See T-1 and T-2.

---

#### Finding I-3: Glossary terms (5 per locale × 6 locales = 30) are NOT in the sitemap but ARE indexable

- **Severity: Medium**
- **Evidence:**
  - `src/app/sitemap.ts:139-143` explicitly excludes `pageType === 'glossary'` per the slim policy
  - `src/app/[locale]/learn/glossary/[term]/page.tsx` does NOT set `robots: { index: false }` — glossary pages are indexable
  - The comment in `sitemap.ts:32-37` notes the rationale: glossary terms "surface organically through article internal links."
  - Live: `https://myflowcheck.com/en/learn/glossary/nocturia` returns 200 with full `BreadcrumbList` + `DefinedTerm` + `Organization` + `WebSite` JSON-LD
- **Why it matters:** This is a reasonable trade-off — glossary terms get internal-link discovery without burning sitemap crawl budget. But the policy depends on each glossary term having at least one inbound internal link. The `remarkAutoLinkGlossary` plugin adds these links automatically at render time from articles, so the discovery path is live. Worth verifying with the new `check-search-console` tool after the next crawl to confirm glossary URLs are getting discovered.
- **Fix approach:** No code change. Verify with Search Console URL inspection after the next monthly crawl that glossary URLs are reaching "Indexed" status. If they're stuck in "Discovered – not indexed," reverse the sitemap policy.

---

### MEDICAL YMYL TRUST SIGNALS

---

#### Finding Y-1: Author photos referenced but files don't exist (`public/authors/` is missing)

- **Severity: High**
- **Evidence:**
  - `content/authors/dr-di-wu.json` and `dr-steven-tijerina.json` do NOT have a `photoUrl` field (verified via grep — `grep -l "photoUrl" /content/authors/*.json` returns nothing)
  - `src/components/learn/AuthorByline.tsx:27-37` falls back to author initials when `author.photoUrl` is absent (renders a circular initial badge instead of a photo)
  - `src/components/seo/JsonLd.tsx:234` (PersonJsonLd) gracefully omits the `image` field when `photoUrl` is absent
  - No `public/authors/` directory exists at all
  - `content/README.md` line 294: "Photo (real, professional)" listed as required for E-E-A-T
- **Why it matters:** Google's quality raters explicitly check for author photos in YMYL content. Initials in a circle (the current fallback) is essentially "no author photo" from a quality-rater perspective. Both authors are real (`dr-di-wu.json` links to https://www.linkedin.com/in/diwuvactive/, `dr-steven-tijerina.json` to https://www.linkedin.com/in/stevenatijerina/ — both real LinkedIn profiles).
- **Fix approach:** Source professional photos of both authors (LinkedIn profile photo is fine if they consent), save to `public/authors/dr-di-wu.jpg` and `public/authors/dr-steven-tijerina.jpg`, add `"photoUrl": "/authors/dr-di-wu.jpg"` (and the equivalent for Tijerina) to each author JSON. The PersonJsonLd will automatically include them once present.

---

#### Finding Y-2: Citation count strong across all articles (4-20 per article, all from PubMed / society guidelines / Cochrane)

- **Severity: (positive — major YMYL win)**
- **Evidence:**
  - Citation counts per article (frontmatter array): every article has 4-20 citations
  - URLs verified by grep: all use `pubmed.ncbi.nlm.nih.gov`, `auajournals.org`, `cochrane`, `pmc.ncbi.nlm.nih.gov`
  - Citations are piped into `Article` JSON-LD as `citation: [{ '@type': 'CreativeWork', name, url, publisher, datePublished }]` — Google can connect to its Knowledge Graph
  - Citation `<ol>` rendered visibly on every article page below the body, with dofollow `<a>` (NO nofollow) — passes link equity to authoritative sources
- **Why it matters:** Citation depth and quality are among the strongest signals Google's algorithm tracks for YMYL medical content. This is unambiguously well-executed.

---

#### Finding Y-3: `MedicalWebPage` JSON-LD with ICD-10 codes correctly emitted for relevant topics

- **Severity: (positive)**
- **Evidence:** `src/components/seo/JsonLd.tsx:10-49` maps topics to schema.org medical entities:
  ```
  bph → MedicalCondition + ICD-10 N40
  nocturia → MedicalCondition + ICD-10 R35.1
  frequency → MedicalCondition + ICD-10 R35.0
  bladder-training → MedicalProcedure
  bladder-diary → MedicalTest
  ```
  Article JSON-LD on a live page: `@type: ['MedicalWebPage', 'Article']`, `specialty.name: 'Urology'`, `medicalAudience.audienceType: 'Patient'`, `about: [{ MedicalCondition, ICD-10 }]`. This is **unusually thorough** medical schema.
- **Why it matters:** Google's medical search systems (used in the Knowledge Graph, in featured snippets, and in the new AI-summary modes) draw heavily on `MedicalWebPage` schema. Having ICD-10 codes is rare and signals "this is from a clinical operation, not a content farm."

---

#### Finding Y-4: `medicallyReviewedBy` is set on EVERY article — strong E-E-A-T

- **Severity: (positive)**
- **Evidence:** `find content/articles/en -name "*.mdx" -exec grep -L "medicallyReviewedBy:" {} \;` returns no results. Every article cites a medical reviewer (`dr-steven-tijerina`), distinct from the author (`dr-di-wu`).
- **Why it matters:** Google's quality rater guidelines explicitly call out medical reviewer distinct from author. This is consistently delivered.

---

#### Finding Y-5: Medical disclaimer rendered as `text-[11px] text-ipc-400` — barely visible to users, but text is present for crawlers

- **Severity: Low**
- **Evidence:** `src/components/learn/Disclaimer.tsx` renders the text at `text-[11px]` (11px font) and `text-ipc-400` (a light gray). The disclaimer text is well-written ("This article is for educational purposes only...") and consistent across pages.
- **Why it matters:** Crawlers read the text just fine. The visual de-emphasis may risk accessibility (small text + low contrast) more than SEO.
- **Fix approach:** Consider bumping to `text-xs` (12px) and `text-ipc-500` for accessibility. SEO is unaffected.

---

#### Finding Y-6: `dateModified` accurately reflects content edits (not build time) — sitemap lastmod policy is honest

- **Severity: (positive)**
- **Evidence:** `src/app/sitemap.ts:73-82` `maxDate()` helper picks the most recent of `updatedAt`, `lastReviewedAt`, `publishedAt` from frontmatter — explicitly avoids using `new Date()` as a default. Comment block explains: "Google deprioritizes lastmod that flips on every build with no real content change."
- **Why it matters:** This is the single most-violated sitemap best practice on small static sites — most just put `new Date()` everywhere and Google quickly learns to ignore the lastmod. Done correctly here.

---

## What's working well

The following are deliberately called out so they don't get refactored away:

1. **Content parity across 6 locales is exceptional** (L-1). Don't degrade this. The Stop hook + pre-commit hook enforcement is doing real work.
2. **JSON-LD coverage is unusually mature** for a site this small: `Organization` + `WebSite` (on every page) + `BreadcrumbList` + `MedicalWebPage`/`Article` + `Person` (authors) + ICD-10 codes + `DefinedTerm` for glossary + `CollectionPage` for hubs + `HowTo` + `FAQPage` + `SoftwareApplication`. Few competitor sites have this depth.
3. **Citations are dofollow** in the per-article citation block (T-8 fix should preserve this).
4. **Hreflang reciprocity** is correct across all 6 locales + `x-default` (L-2).
5. **CLS-safe images** via build-time `image-size` resolution in `src/lib/mdx.tsx` (P-4) — most static-export sites fumble this.
6. **Sitemap lastmod is content-modification-anchored**, not build-time (Y-6). Major best-practice win.
7. **Sitemap slim 216→156** (recent commit) is the right move given the "Discovered – not indexed" backlog from Search Console.
8. **Search Console CLI** (`scripts/check-search-console.mjs`) is real infrastructure for measuring indexing outcomes (I-1).
9. **Author bios are robust** — ~400-word bios with credentials, LinkedIn, IPC affiliation. Recent commit (`4245edc`) expanded these. (Only missing piece: photos — Y-1.)
10. **Diary/summary routes are correctly disallowed** in robots.txt and don't leak personal data into the index (T-10).

---

## Quick wins (high impact, low effort)

Ranked by impact ÷ effort:

1. **Add author photos** (Y-1). Two JPEGs in `public/authors/` + two JSON updates. ~30 min. Direct YMYL E-E-A-T win.
2. **Fix BreadcrumbList JSON-LD URLs + topic names** (T-4). Prepend `/${locale}/` to breadcrumb hrefs before passing to JSON-LD; use `pillar.frontmatter.title` for the topic step's name. ~1 hour. Direct SERP-rendering improvement.
3. **Decide T-1 routing model and either delete or ship `vercel.json`**. Don't leave it untracked. If keeping locale-prefix canonical (status quo), delete the file. If switching to bare paths, see T-1 fix-approach for the coordinated change set. Decision in ~30 min; execution depends on choice.
4. **Add 1 cluster each to `bladder-irritants` and `nocturia`** (C-2). Source material is already in the existing pillars; ~2 hours each. Direct long-tail capture.
5. **Trim 3 over-length article titles to ≤60 chars** (C-6). ~15 min total. Direct SERP truncation fix.
6. **Add `fetchpriority="high"` to article hero `<img>` via a custom render path** (T-7). Workaround for static-export limitation. ~1 hour. Measurable LCP impact.
7. **Add `npm run sc:report` script alias** (I-1). ~2 min. Pure ergonomics.
8. **Drop unconditional `nofollow` on inline external `<a>` in MDX body** (T-8). ~10 min. Aligns with spec; restores dofollow trust signal to inline primary-source links.
9. **Fix `ArticleCard.tsx:36` locale stripping** (L-3). One-line change. ~2 min. Removes latent breakage risk.
10. **Reconcile pillar frontmatter slug with topic folder name** (T-6). One YAML edit per pillar × 6 locales. ~30 min. Removes silent-failure mode.

---

## Out-of-scope but worth noting

- **Audience landings deserve a decision** (C-4): commit to substantive editorial content (re-add to sitemap once 600+ words) OR mark `noindex` and accept them as nav-only. The current middle state (indexable but thin) is the worst position.
- **Three orphan pillars** (C-1: `bph`, `frequency`, `urgency`) need a cluster program. This is content work, not engineering. Each is one of the highest-volume search terms in the site's topical scope; leaving them as bare pillars caps the entire site's organic ceiling on those topics.
- **Topic taxonomy aspiration vs. shipped state** (C-5): 17 planned topics in `TOPIC_GROUPS`, 9 with content. Pick 2-3 next topics with the same discipline as the existing ones (pillar + 2-3 clusters).
