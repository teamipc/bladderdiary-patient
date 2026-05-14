<!-- GSD:project-start source:PROJECT.md -->
## Project

**My Flow Check — Bladder Diary Patient App**

A 3-day bladder diary tracker for patients, designed to be filled out by the patient and exported (CSV/PDF) directly to their clinician. Built around the IPC (Integrated Pelvic Care) methodology — originally centered on men's pelvic health education, but the diary tool itself is usable by any patient regardless of gender. Production app at [myflowcheck.com](https://myflowcheck.com), already deployed and in real-world clinical use.

**Core Value:** The patient can complete a clinically-accurate 3-day diary in their own timezone, with their own routine, and walk away with a clinician-ready export — without losing data, without confusing UX, and without privacy compromises.

### Constraints

- **Tech stack**: Next.js 16 App Router + React 19 + Tailwind 4 + Zustand + next-intl 4 — pinned by existing codebase, not up for re-litigation in this milestone.
- **Storage**: localStorage only. No server, no cloud, no accounts. Drives compliance simplicity (no PHI on a server). Reaffirmed in Out of Scope.
- **i18n**: All six locales (en/fr/es/pt/zh/ar) must remain at parity. Stop hook + pre-commit hook enforce article translation coverage.
- **Output mode**: `next.config.ts` uses `output: "export"` — static export only. No server-side runtime is available, so anything proposing a server endpoint is non-viable without ripping out the deployment model.
- **Day-boundary correctness**: Three layers (form correctors, `getDayNumber`, `reassignMorningVoid`) must stay in sync. See `docs/TIME_MODEL.md` and `time_model_gotchas` memory before any change to time/timezone code.
- **Daily walkthrough must keep passing**: 6-locale production walkthrough is the canonical quality gate. Findings auto-log to `walkthrough_findings.md`.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - All application code in `src/`, config files (`next.config.ts`, `vitest.config.ts`, `playwright.config.ts`)
- JavaScript (`.mjs`) - Build scripts in `scripts/` (`generate-icons.mjs`, `update-walkthrough-findings.mjs`)
- Bash - CI/git hook scripts in `scripts/` and `.claude/scripts/`
- MDX - Long-form article content in `content/articles/` and `content/glossary/`
## Runtime
- Node.js v23.x (system; no `.nvmrc` or `.node-version` in repo — environment-matched)
- npm (lockfile: `package-lock.json` present)
## Frameworks
- Next.js 16.1.6 - App Router, static export (`output: "export"` in `next.config.ts`). No server-side runtime; site is fully statically generated.
- React 19.2.3 - UI rendering
- next-intl 4.8.3 - Six-locale routing (`en`, `fr`, `es`, `pt`, `zh`, `ar`) via `src/i18n/request.ts`. Configured with `createNextIntlPlugin` in `next.config.ts`. Locale config at `src/i18n/config.ts`.
- Vitest 3.2.4 - Unit/integration test runner. Config at `vitest.config.ts`. Environment: jsdom. Path alias `@` maps to `src/`.
- Playwright 1.59.1 - E2E tests against production (`https://myflowcheck.com`). Config at `playwright.config.ts`. Six locale projects plus `deep-flow` and `a11y`.
- @axe-core/playwright 4.11.3 - Accessibility scanning in `e2e/a11y.spec.ts`
- @testing-library/react 16.3.2 + @testing-library/user-event 14.6.1 - Component-level test utilities
- Tailwind CSS 4.x - Utility-first CSS. PostCSS config at `postcss.config.mjs` using `@tailwindcss/postcss`. Accessed via `globals.css`.
- ESLint 9.x - Linting via `eslint.config.mjs`. Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- TypeScript strict mode - `"strict": true` in `tsconfig.json`
## Key Dependencies
- zustand 5.0.11 - Global state management with `persist` middleware for localStorage hydration. Single store at `src/lib/store.ts`. Pattern: `create(persist(...))` with migration function.
- date-fns 4.1.0 - Date arithmetic (`parseISO`, `addDays`) in `src/lib/utils.ts`. Primary date operations use `Intl.DateTimeFormat` directly for timezone-aware formatting.
- next-mdx-remote 6.0.0 - MDX rendering for article content via `src/lib/mdx.tsx`. Uses RSC variant (`next-mdx-remote/rsc`).
- gray-matter 4.0.3 - Frontmatter parsing for MDX articles in `src/lib/content.ts`.
- jspdf 4.2.0 + jspdf-autotable 5.0.7 - Client-side PDF generation. Module at `src/lib/exportPdf/` (7 files). Entry point: `src/lib/exportPdf/index.ts`.
- @vercel/analytics 2.0.0 - Page view and custom event tracking (`track()` calls in 6 components). Injected in `src/app/[locale]/layout.tsx` as `<Analytics />`.
- remark-gfm 4.0.1 - GitHub Flavored Markdown in articles
- rehype-slug 6.0.0 + rehype-autolink-headings 7.1.0 - Heading anchors in rendered MDX
- reading-time 1.5.0 - Word-count-based reading estimate in `src/lib/content.ts`
- image-size 2.0.2 - Auto-detect image dimensions for `<img>` width/height attributes in `src/lib/mdx.tsx`
- lucide-react 0.577.0 - Icon library. Used in 39+ component files. Icon names typed in `src/lib/constants.ts` as `DrinkIconName` and `LeakIconName`.
- pdf-parse 2.4.5 - PDF content verification in E2E tests
## Configuration
- No `.env` file detected. The app requires no runtime environment variables for standard operation.
- Test-time optional vars: `WALKTHROUGH_BASE_URL` (default `https://myflowcheck.com`), `HEADED` (Playwright headed mode), `DIARY_PDF_OUT` (PDF test output directory).
- `NODE_ENV` is the only runtime env var used in `src/` (production cache gating in `src/lib/content.ts`).
- `@/*` → `./src/*` (in both `tsconfig.json` and `vitest.config.ts`)
- `next.config.ts` - Static export mode, unoptimized images (required for `output: "export"`), next-intl plugin wrapper
- `tsconfig.json` - ES2017 target, bundler module resolution, incremental compilation
- `postcss.config.mjs` - Tailwind CSS via `@tailwindcss/postcss`
- `.githooks/pre-commit` - Enforces article i18n completeness via `.claude/scripts/article-i18n-completeness.sh`. Registered by `npm run prepare`.
- PostToolUse on `messages/en.json` edits → triggers `i18n-sync` skill
- PostToolUse on `content/articles/en/**/*.mdx` edits → triggers `article-translate` skill
- Stop hook → blocks if any English article lacks all 5 non-English locale mirrors
## Platform Requirements
- Node.js v20+ (inferred from `@types/node: ^20` devDependency)
- `jq` CLI required for i18n sync hooks and key-parity checks
- Static site deployed to Vercel
- Routing handled by `vercel.json`: bare paths rewrite to `/en/`, `/en/*` paths redirect to bare (en is the default locale served without prefix)
- PWA: `public/manifest.json` + `public/sw.js` (cache-first service worker, pre-caches app shell routes)
- No server-side runtime — all dynamic behavior is client-side via localStorage + Zustand
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase `.tsx` (e.g., `LogVoidForm.tsx`, `TimePicker.tsx`, `DaySummaryCard.tsx`)
- Library/utility modules: camelCase `.ts` (e.g., `calculations.ts`, `utils.ts`, `observations.ts`, `authorByline.ts`)
- Test files: `kebab-case.test.ts` (e.g., `back-edits-after-completion.test.ts`, `clock-pick-disambiguation.test.ts`)
- E2E specs: `kebab-case.spec.ts` (e.g., `walkthrough.spec.ts`, `deep-flow.spec.ts`)
- Next.js conventions: `page.tsx`, `layout.tsx`, `route.ts`, `sitemap.ts`, `robots.ts`
- Public library functions: camelCase, verb-prefixed (e.g., `computeMetrics`, `generateId`, `detectTimeZone`, `buildIsoForClockTimeInTz`, `getDayNumber`)
- React components: PascalCase function declarations (e.g., `export default function LogVoidForm(...)`)
- Helper functions within modules: camelCase, lowercase prefix (e.g., `vid()`, `did()`, `bed()` in test helpers; `hourBucket()`, `drinkFollowedByVoid()` in observations)
- Store actions: verb-prefixed camelCase (e.g., `addVoid`, `removeVoid`, `setBedtime`, `setWakeTime`, `resetDiary`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `PREMIUM_FEATURES_ENABLED`, `VOLUME_PRESETS_ML`, `VOLUME_CONFIG`, `STORE_KEY`)
- Regular variables and parameters: camelCase
- Type-discriminated union members: descriptive camelCase strings (e.g., `'urge'`, `'awake_anyway'`, `'toilet_way'`)
- Interfaces: PascalCase with descriptive nouns (e.g., `VoidEntry`, `DrinkEntry`, `BedtimeEntry`, `DiaryState`, `DayMetrics`, `PeriodMetrics`)
- Type aliases: PascalCase (e.g., `DrinkType`, `BladderSensation`, `LeakTrigger`, `MorningAnchor`)
- Exported union literals: descriptive lower-kebab strings used as enum values
## Code Style
- No Prettier config present; formatting is left to developer/editor defaults with ESLint enforcement
- Tailwind class strings use template literals for multi-line composition (see `Button.tsx`)
- ESLint via `eslint.config.mjs`: extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- TypeScript: strict mode (`"strict": true` in `tsconfig.json`), `noEmit: true`, target `ES2017`
- `@ts-expect-error` used sparingly (4 occurrences in `exportPdf/` to suppress `jspdf-autotable` missing type augmentation)
- No `@ts-ignore` or `as any` patterns found
- `'use client'` placed as first line when required (all interactive components, forms, store consumers, layout pieces)
- No `'use server'` directives (no Server Actions pattern in use)
- Server components are unmarked (implicit default in Next.js App Router)
## Import Organization
- `@/` resolves to `./src/` (configured in `tsconfig.json` and `vitest.config.ts`)
- Relative paths used only within `src/lib/exportPdf/` submodule for co-located imports
## Error Handling
- Defensive `try/catch` with fallback values in browser API calls (`detectTimeZone` returns `'UTC'`, `getTimezoneAbbr` and `getTimezoneOffset` return empty strings)
- Nullish coalescing (`??`) for optional fields throughout `calculations.ts` (e.g., `v.doubleVoidMl ?? 0`, `state.wakeTimes ?? []`)
- Optional chaining (`?.`) for nullable entry lookups (e.g., `fmv?.timestampIso ?? wakeTime?.timestampIso`)
- Store actions that can fail return `boolean`: `addVoid` returns `true` on success, `false` if dropped as duplicate
- No thrown errors from calculation functions; they return partial/null values when data is insufficient (e.g., `nPi: null` when `twentyFourHV === 0`)
## Logging
- No runtime logging in `src/lib/` or components
- E2E specs collect `consoleErrors` and `pageErrors` arrays during test runs and write them to findings JSON files
## Comments
## TypeScript Patterns
- `as const` used for immutable tuple/object literals (e.g., `VOLUME_PRESETS_ML`, `VOLUME_CONFIG`, iteration arrays `[1, 2, 3] as const`)
- `as unknown as T` used once in store migration path for type-unsafe legacy data reshaping
- Non-null assertion `!` used when the type system cannot infer what test logic has already proven (e.g., `lateNightVoid!.timestampIso` in test)
## Function Design
- Pure functions return `T | null` rather than throwing (e.g., `nPi: number | null`, `avv: number | null`)
- Store actions that have side effects return `boolean` to signal success/duplicate-drop
## Module Design
- Components: `export default function ComponentName` (one component per file)
- Library modules: named exports only (no default exports from `lib/*.ts`)
- `Button.tsx` exception: uses `const Button = forwardRef(...)` then `export default Button` (required for `forwardRef` + `displayName`)
- `src/lib/exportPdf/index.ts` is the only barrel, re-exporting from `combinedDiary.ts`, `machineData.ts`, and the main `generatePdfBlob` assembler
- No barrel `index.ts` in `src/components/` or `src/lib/` root — all imports use full paths
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| LocaleLayout | HTML shell, i18n provider, AppShell, analytics | `src/app/[locale]/layout.tsx` |
| AppShell | Header + BottomNav + Footer + PrivacyNotice chrome | `src/components/layout/AppShell.tsx` |
| LandingContent | Home page: onboarding entry, PWA install prompt, diary-in-progress CTA | `src/app/[locale]/LandingContent.tsx` |
| OnboardingFlow | 3-step wizard: age, start date, volume unit, timezone | `src/components/onboarding/OnboardingFlow.tsx` |
| DayPageClient | Day 1-3 diary UI: timeline, FAB, bottom-sheet log forms, toasts | `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx` |
| TimelineView | Chronological event list (voids, drinks, leaks, bedtime anchors) with edit/delete | `src/components/diary/TimelineView.tsx` |
| SummaryPage | Post-diary review: metrics, observations, export actions | `src/app/[locale]/summary/page.tsx` |
| useDiaryStore | All diary state + actions + selectors, Zustand + localStorage | `src/lib/store.ts` |
| computeMetrics | IPC clinical calculation engine (pure function, DiaryState → DiaryMetrics) | `src/lib/calculations.ts` |
| generateCsv | CSV export assembler (3 sections: metadata, events, metrics) | `src/lib/exportCsv.ts` |
| generatePdfBlob | Multi-page jsPDF clinical report (7 pages) | `src/lib/exportPdf/index.ts` |
| content.ts | Server-side MDX/JSON loader with in-memory cache | `src/lib/content.ts` |
| RenderMdx | MDX renderer with custom components (images, CTAs, glossary auto-links) | `src/lib/mdx.tsx` |
## Pattern Overview
- The **diary** (data collection) is a client-side SPA within Next.js App Router — all state in Zustand + localStorage, no server calls during diary use. Pages are statically generated; all interactivity is `'use client'`.
- The **Learn section** is a static-site-generated content CMS — server components read MDX files at build time via `src/lib/content.ts`. No database; filesystem is the CMS.
- Both halves share the same `[locale]` route layout and the `next-intl` i18n layer with 6 locales (en, fr, es, pt, zh, ar).
- Arabic (`ar`) is RTL; `LOCALE_DIR` in `src/i18n/seo.ts` sets `dir="rtl"` on `<html>`.
- Output is a fully static export (`output: "export"` in `next.config.ts`), deployed to Vercel.
## Layers
- Purpose: Pages, layouts, and client entry points
- Location: `src/app/[locale]/`
- Contains: Page components, route layouts, generateStaticParams, generateMetadata
- Depends on: Components, lib, i18n
- Used by: Next.js build + browser
- Purpose: Reusable React components organized by domain
- Location: `src/components/{diary,export,layout,learn,onboarding,seo,summary,ui}/`
- Contains: Form components, UI primitives, domain-specific cards and views
- Depends on: lib/store, lib/types, lib/utils, next-intl, lucide-react
- Used by: Page components in src/app/
- Purpose: Single source of truth for all diary data on the client
- Location: `src/lib/store.ts`
- Contains: Zustand store, FMV reassignment logic, migration handlers, `useStoreHydrated`
- Depends on: lib/types, lib/utils
- Used by: Any client component that reads or writes diary events
- Purpose: Pure IPC metric computation with no side effects
- Location: `src/lib/calculations.ts`
- Contains: `computeMetrics(DiaryState): DiaryMetrics`, day/night metric types
- Depends on: lib/types, lib/utils
- Used by: exportCsv, exportPdf, SummaryPage, and tests
- Purpose: Serialize DiaryState into shareable clinical formats
- Location: `src/lib/exportCsv.ts`, `src/lib/exportPdf/`
- Contains: CSV generation, jsPDF multi-page report (7 page modules in subdirectory)
- Depends on: lib/calculations, lib/types, lib/utils
- Used by: `src/components/export/ExportActions.tsx`
- Purpose: Load and cache MDX articles, glossary entries, and author profiles
- Location: `src/lib/content.ts`
- Contains: `getAllArticles`, `getArticle`, `getGlossaryEntries`, `getAllAuthors` — all use `fs.readdirSync` + `gray-matter`
- Depends on: `content/` directory on disk, i18n/config
- Used by: All `/learn/**` server components and sitemap
- Purpose: Locale routing, message loading, SEO hreflang helpers
- Location: `src/i18n/`
- Contains: `config.ts` (locale list), `navigation.ts` (next-intl routing), `request.ts` (server message loader), `seo.ts` (localizedPath, hreflang maps, RTL map)
- Depends on: next-intl, messages/*.json
- Used by: Every layout, page, and component that uses translations
## Data Flow
### Primary Diary Recording Path
### Learn Article Request Path (build time → static)
- All diary state lives exclusively in the browser's `localStorage` via Zustand's `persist` middleware, key `bladder-diary-patient` (version 2 with migration).
- No server-side state for the diary. The app is fully offline-capable after first load.
- The Learn section has no runtime state — it is pure static HTML generated at build time.
## Key Abstractions
- Purpose: The normalized data model for a 3-day diary (voids, drinks, leaks, bedtimes, wakeTimes, plus settings)
- Examples: `src/lib/types.ts` (interface), `src/lib/store.ts` (runtime instance)
- Pattern: All timestamps are ISO 8601 UTC strings. Day boundaries are computed on-the-fly using bedtime entries, not calendar dates.
- Purpose: Assigns an event's diary day (1|2|3) using bedtime-aware boundaries rather than midnight
- Examples: `src/lib/utils.ts:310`, called throughout store, calculations, display components
- Pattern: Pass `(timestampIso, startDate, bedtimes[], timeZone?)` — never compute day number from calendar date alone
- Purpose: Produces `DiaryMetrics` (IPC clinical metrics) from a `DiaryState` snapshot
- Examples: `src/lib/calculations.ts` — called in exportCsv, exportPdf, SummaryPage, tests
- Pattern: Pure function with no side effects; safe to call any time; Day 1 excluded from 24HV/NPi/AVV
- Purpose: `isFirstMorningVoid: boolean` flag on `VoidEntry` — drives NPi calculation and clinical interpretation
- Examples: `reassignMorningVoid()` in `src/lib/store.ts:29` — automatically recomputed on every void add/update/remove, bedtime change, and wake-time change
- Pattern: Never set manually except via `markMorningVoid`; always recomputed from wake time proximity
- Purpose: next-intl `localePrefix: 'as-needed'` means English is at bare paths (`/`, `/learn/...`); all others are prefixed (`/fr/`, `/es/learn/...`)
- Examples: `src/i18n/navigation.ts`, `src/i18n/seo.ts:localizedPath`
- Pattern: Always use `localizedPath(locale, path)` for canonical URLs; use `<Link>` from `@/i18n/navigation` (not next/link) in components
## Entry Points
- Location: `src/app/layout.tsx`
- Triggers: Every request (wraps locale layout)
- Responsibilities: Imports globals.css; renders children only (thin passthrough)
- Location: `src/app/[locale]/layout.tsx`
- Triggers: Every request within a locale
- Responsibilities: Validates locale, sets request locale, loads i18n messages, renders html/body/AppShell, registers ServiceWorker, injects JSON-LD, Vercel Analytics
- Location: `src/app/[locale]/diary/day/[dayNumber]/page.tsx`
- Triggers: Navigation to `/diary/day/1`, `/diary/day/2`, `/diary/day/3`
- Responsibilities: Static shell; defers all interactivity to `DayPageClient` (client component inside Suspense)
- Location: `public/sw.js`
- Triggers: Registered by `src/components/ServiceWorkerRegistration.tsx` after mount
- Responsibilities: Cache-first for offline; push notification delivery for diary reminders
## Architectural Constraints
- **Static export:** `output: "export"` in `next.config.ts` — no runtime server, no `getServerSideProps`, no API routes. All pages must be statically renderable. Dynamic segments require `generateStaticParams`.
- **Client-only diary state:** `useDiaryStore` is `'use client'` only; never imported in server components. The store is gated behind `useStoreHydrated()` to avoid hydration flash.
- **No database:** The diary stores exclusively in `localStorage`. The Learn CMS is the filesystem (`content/`). No fetch calls to an API at runtime.
- **Threading:** Single-threaded browser. The service worker (`public/sw.js`) runs in a separate worker context for cache/notifications only.
- **Global state:** One singleton Zustand store (`useDiaryStore`). No React Context for diary data.
- **Premium gate:** `PREMIUM_FEATURES_ENABLED = false` in `src/lib/constants.ts` — when false, CSV export omits the `CALCULATED_METRICS` section. PDF export still generates full clinical content.
## Anti-Patterns
### Using `new Date().setHours()` for event timestamps
### Computing diary day from calendar date
### Importing `useDiaryStore` in server components
### Reading persisted store state before hydration
## Error Handling
- `safeReaddir()` in `src/lib/content.ts` wraps filesystem reads; returns `[]` on failure so missing locale/topic directories degrade to empty article lists rather than build errors.
- Duplicate event detection in store (`addVoid`, `addDrink`, `addLeak`) returns `false` on duplicate; UI is required to check the return value before showing a success toast.
- `getArticle` returns `undefined` for missing locale articles; article pages call `notFound()`.
- `getDayNumber` has fallback behavior when no bedtime is set (uses midnight boundary).
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| article-intake | Receive a packaged article delivered by the SEO workflow into `.incoming/`, validate against this patient app's comprehensive Site B frontmatter schema (per content/SKILL.md and content/README.md), place files in the topic-folder structure under content/articles/en/<topic>/ and public/articles/<topic>/<slug>/, run app-specific SEO finalization (citations[] array assembly from inline citations, pillar-cluster wiring, glossary first-occurrence linking against this app's catalog, MedicalWebPage JSON-LD), validate the post-place state, and report ready-to-commit. Auto-triggered by the SEO workflow's `handoff` skill. | `.claude/skills/article-intake/SKILL.md` |
| article-translate | Translate a patient-app MDX article (`content/articles/en/<topic>/<slug>.mdx`) into the five non-English locales (`fr`, `es`, `pt`, `zh`, `ar`), producing siblings at `content/articles/<locale>/<topic>/<slug>.mdx` with translated frontmatter, translated body prose, preserved MDX components, preserved citation list, preserved keys/structure, and locale-natural register. Triggers automatically (via PostToolUse hook in `.claude/settings.json`) when an English article under `content/articles/en/` is created or modified, and manually when the user asks to "translate this article", "produce the French version of <slug>", "mirror articles to other locales", or names a specific MDX path. Enforces the same register rules as `i18n-sync` (FR=vous, ES=tú, PT=European pt with tu/você, ZH=Mandarin Simplified peer-direct 你, AR=Modern Standard, RTL-aware) and the same brand/citation/numerals invariants. | `.claude/skills/article-translate/SKILL.md` |
| cta-placer | Place a "Start the bladder diary" CTA card at the right spot inside Site B (patient app, myflowcheck.com) articles. Identifies the article's natural CTA moments (right after a protocol / drill / elimination test / measurement section that the diary actually supports) and inserts a `<DiaryCta>` card with a button linking back to the homepage diary tracker. Site B only — Site A clinician articles drive to bladderdiaries.com via a different pattern. Run between /polish and /seo-finalizer for new drafts, or as a refresh pass on any published Site B article that lacks inline CTAs. | `.claude/skills/cta-placer/SKILL.md` |
| i18n-sync | Smart-sync UI string translations across the patient app's locale files. Triggers automatically (via PostToolUse hook in `.claude/settings.json`) every time `messages/en.json` is edited, and also when the user asks to "translate UI strings", "mirror keys to other locales", "sync i18n", "fix the French/Spanish/Portuguese/Chinese/Arabic translations", or names any of `messages/{en,fr,es,pt,zh,ar}.json`. Mirrors new or changed keys from `messages/en.json` into `messages/{fr,es,pt,zh,ar}.json` with idiomatic, locale-natural phrasing — never literal LLM dumps. Enforces register rules per locale (FR=vous, ES=tú, PT=tu/você, ZH=Mandarin Simplified peer-direct, AR=Modern Standard, RTL-aware). Preserves JSON structure exactly, including ICU placeholders like `{name}` and HTML tags like `<strong>`. | `.claude/skills/i18n-sync/SKILL.md` |
| image-source | Source, download, and wire up a hero image for a patient-app article. Use when an article (especially under content/articles/en/) has no `hero` frontmatter set, when the user asks to add an image, says "the article needs a photo", or asks why a card shows a broken-image icon. Searches Unsplash, downloads via curl, places the JPG at the asset path, and updates frontmatter + photo credit. Triggered after `article-intake` if the upstream SEO workflow's image step was skipped. | `.claude/skills/image-source/SKILL.md` |
| learn-styling | Visual layout + typography conventions for /learn pages on myflowcheck.com (patient app). Reference: parentdata.org-style editorial reading experience (narrow reading column, big bold title, image cards, generous whitespace). Mirrors the bladderdiary clinician site's `journal-styling` skill but adapted for this app's i18n + topic-cluster + audience-landing structure. Use this skill (or read it before any change) when adding a new article style, modifying any /learn route, editing src/app/globals.css typography, or building a new learn-related component. | `.claude/skills/learn-styling/SKILL.md` |
| naturalize-prose | Send a native-speaker editor subagent into foreign-locale MDX articles (fr/es/pt/zh/ar) to directly edit and update them — rewriting stiff or calque-flavored sentences into fluent day-to-day prose, AND catching mistakes, mistranslations, or omissions the first-pass `article-translate` may have missed or skipped. One expert per locale: French expert for fr, Spanish for es, European Portuguese for pt, Simplified-Chinese for zh, Modern-Standard-Arabic for ar. Each agent reads the locale file (and the EN source as ground truth), then edits the locale file in place. Triggered when the user asks to "polish the French articles", "naturalize the Spanish prose", "make the Portuguese read more natural", "cycle through the Arabic articles", "go through all Chinese articles and improve them", "check the [locale] versions for missed paragraphs", or names a specific foreign-locale folder/path under `content/articles/{fr,es,pt,zh,ar}/`. Distinct from `article-translate` (mechanical first-pass): this is the second-pass native-voice + correctness sweep. Supports single-article passes and full-locale cycles. | `.claude/skills/naturalize-prose/SKILL.md` |
| visual-qa | Visual aesthetic and layout QA for the patient app — render pages in a real browser, screenshot, inspect computed CSS, and fix issues across all 6 locales (en/fr/es/pt/zh/ar) and both LTR + RTL. Use this skill when the user asks for "visual QA", "design check", "look at the site", "RTL walkthrough", "check how it looks in <locale>", "is anything broken visually", or after any change that could affect layout, typography, or theming. Catches RTL physical-CSS leaks, text overflow in long-translation locales (PT, AR), font-fallback issues for non-Latin scripts (zh, ar), spacing inconsistencies, contrast/AA violations, and broken responsive breakpoints. Pairs with `i18n-sync` (copy-level translation fixes) and `learn-styling` (design-language reference). | `.claude/skills/visual-qa/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
