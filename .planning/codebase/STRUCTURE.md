# Codebase Structure

**Analysis Date:** 2026-05-14

## Directory Layout

```
bladderdiary-patient/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (thin passthrough, imports globals.css)
│   │   ├── error.tsx                 # Root error boundary
│   │   ├── globals.css               # Global styles (Tailwind + CSS variables)
│   │   ├── robots.ts                 # robots.txt generation (blocks /diary/, /summary/)
│   │   ├── sitemap.ts                # sitemap.xml generation (all locales × all routes)
│   │   └── [locale]/                 # Locale-prefixed routes (en/fr/es/pt/zh/ar)
│   │       ├── layout.tsx            # Locale layout: html/body, next-intl, AppShell
│   │       ├── page.tsx              # Home page (/ or /fr/, etc.)
│   │       ├── LandingContent.tsx    # Client component: home UI, onboarding gate
│   │       ├── help/page.tsx         # FAQ/help page
│   │       ├── privacy/page.tsx      # Privacy policy
│   │       ├── terms/page.tsx        # Terms of use
│   │       ├── feed.xml/route.ts     # RSS feed for /learn articles
│   │       ├── diary/                # Diary recording section (noindex)
│   │       │   ├── layout.tsx        # Diary layout (noindex robots meta)
│   │       │   ├── page.tsx          # Redirect → /diary/day/1
│   │       │   └── day/[dayNumber]/  # Day 1, 2, 3 pages
│   │       │       ├── page.tsx      # Server shell with Suspense
│   │       │       └── DayPageClient.tsx  # Client: timeline + log forms + FAB
│   │       ├── summary/page.tsx      # Post-diary summary + export (client)
│   │       └── learn/                # Learn content CMS section
│   │           ├── page.tsx          # Learn hub (topic groups, featured articles)
│   │           ├── articles/         # All-articles archive listing
│   │           │   ├── page.tsx
│   │           │   └── page/[page]/page.tsx  # Paginated archive
│   │           ├── [topic]/          # Topic landing pages
│   │           │   ├── page.tsx      # Topic pillar + cluster list
│   │           │   ├── page/[page]/page.tsx  # Paginated topic
│   │           │   └── [slug]/page.tsx  # Individual article
│   │           ├── for-men/page.tsx  # Men's health audience filter
│   │           ├── for-women/page.tsx # Women's health audience filter
│   │           ├── glossary/         # Glossary term pages
│   │           │   ├── page.tsx      # Full glossary A-Z
│   │           │   └── [term]/page.tsx
│   │           └── authors/[slug]/page.tsx  # Author profile pages
│   ├── components/
│   │   ├── diary/                    # Diary-specific UI components
│   │   │   ├── LogVoidForm.tsx       # Void log bottom-sheet form
│   │   │   ├── LogDrinkForm.tsx      # Drink log bottom-sheet form
│   │   │   ├── LogLeakForm.tsx       # Leak log bottom-sheet form
│   │   │   ├── SetBedtimeForm.tsx    # Bedtime setter form
│   │   │   ├── SetWakeTimeForm.tsx   # Wake time setter form
│   │   │   ├── TimelineView.tsx      # Chronological event list
│   │   │   ├── TimelineEvent.tsx     # Single event row
│   │   │   ├── QuickLogFAB.tsx       # Floating action button
│   │   │   ├── NextStepBanner.tsx    # Progress / next-step callout
│   │   │   ├── DrinkTypePicker.tsx   # Drink category selector
│   │   │   ├── SensationPicker.tsx   # Bladder urgency scale picker
│   │   │   ├── LeakTriggerPicker.tsx # Leak trigger selector
│   │   │   ├── Day1Celebration.tsx   # Day 1 completion celebration modal
│   │   │   └── Day2ReminderCard.tsx  # Day 2 habit reminder card
│   │   ├── export/                   # Export-related components
│   │   │   ├── DaySummaryCard.tsx    # Per-day stats card on summary page
│   │   │   └── ExportActions.tsx     # CSV / PDF download buttons
│   │   ├── layout/                   # App shell chrome
│   │   │   ├── AppShell.tsx          # Outer layout wrapper
│   │   │   ├── Header.tsx            # Top navigation bar
│   │   │   ├── BottomNav.tsx         # Mobile bottom tab bar
│   │   │   ├── Footer.tsx            # Page footer
│   │   │   └── PrivacyNotice.tsx     # Cookie/privacy banner
│   │   ├── learn/                    # Learn section UI components
│   │   │   ├── ArticleCard.tsx       # Article preview card
│   │   │   ├── AuthorByline.tsx      # Author credit line
│   │   │   ├── Breadcrumbs.tsx       # Learn section breadcrumbs
│   │   │   ├── DiaryCta.tsx          # In-article diary CTA block
│   │   │   ├── DownloadCta.tsx       # In-article PDF download CTA
│   │   │   ├── Disclaimer.tsx        # Medical disclaimer footer
│   │   │   ├── ArchiveContent.tsx    # Article archive listing
│   │   │   └── Pagination.tsx        # Page pagination links
│   │   ├── onboarding/
│   │   │   └── OnboardingFlow.tsx    # 3-step setup wizard
│   │   ├── seo/
│   │   │   └── JsonLd.tsx            # JSON-LD structured data components
│   │   ├── summary/
│   │   │   ├── DrinkVoidTimeline.tsx # Visual fluid-void timeline on summary
│   │   │   └── SummaryObservations.tsx  # Pattern observation display
│   │   ├── ui/                       # Generic design-system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── TimePicker.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── VolumeInput.tsx
│   │   │   ├── DrinkIcon.tsx
│   │   │   ├── AppLogo.tsx
│   │   │   ├── IpcLogo.tsx
│   │   │   └── IpcInfoModal.tsx
│   │   └── ServiceWorkerRegistration.tsx  # PWA SW registration (client-only)
│   ├── i18n/
│   │   ├── config.ts                 # Locale list + Locale type
│   │   ├── navigation.ts             # next-intl routing + exported Link/useRouter
│   │   ├── request.ts                # Server-side message loader (next-intl config)
│   │   └── seo.ts                    # localizedPath, buildHreflangMap, LOCALE_DIR, OG_LOCALE
│   └── lib/
│       ├── types.ts                  # All domain types (VoidEntry, DrinkEntry, etc.)
│       ├── store.ts                  # Zustand store (useDiaryStore, useStoreHydrated)
│       ├── calculations.ts           # IPC metric engine (computeMetrics)
│       ├── utils.ts                  # Timezone, time, volume, day-number utilities
│       ├── constants.ts              # PREMIUM_FEATURES_ENABLED, DRINK_TYPES, etc.
│       ├── content.ts                # MDX/JSON content loader (build-time filesystem)
│       ├── mdx.tsx                   # RenderMdx component + custom MDX components
│       ├── observations.ts           # Plain-language diary pattern generator
│       ├── topics.ts                 # TOPIC_GROUPS taxonomy for /learn navigation
│       ├── topicPagination.ts        # TOPIC_PAGE_SIZE + page offset helpers
│       ├── authorByline.ts           # Byline metadata formatter
│       ├── glossaryTerms.ts          # Glossary term lookup by locale
│       ├── remarkAutoLinkGlossary.ts # Remark plugin: auto-link glossary terms in MDX
│       ├── notifications.ts          # Web Notifications API + reminder scheduling
│       ├── reminders.ts              # ICS calendar + share-sheet reminder generators
│       ├── usePwaInstall.ts          # PWA beforeinstallprompt hook
│       ├── ipcLogoBase64.ts          # Base64-encoded IPC logo for PDF embedding
│       └── exportPdf/                # PDF export sub-modules (jsPDF page builders)
│           ├── index.ts              # generatePdfBlob entry point
│           ├── shared.ts             # addFooter, shared drawing helpers
│           ├── combinedDiary.ts      # Page 1: 3-day combined diary (landscape)
│           ├── dailyDiary.ts         # Pages 3-5: per-day 24h grids
│           ├── resultsOverview.ts    # Page 2: clinical metrics summary
│           ├── graphs.ts             # Page 6: bar/line clinical charts
│           ├── machineData.ts        # Page 7: machine-readable structured data
│           ├── strings.ts            # Locale strings for PDF text
│           ├── theme.ts              # PDF colour + font constants
│           └── slots.ts              # Grid slot geometry helpers
├── content/                          # Static MDX/JSON content (CMS filesystem)
│   ├── articles/
│   │   └── {locale}/                 # en, fr, es, pt, zh, ar
│   │       └── {topic}/              # e.g. bladder-diary, nocturia, bph
│   │           ├── _pillar.mdx       # Topic pillar article (pageType: pillar)
│   │           └── {slug}.mdx        # Cluster articles (pageType: cluster)
│   ├── glossary/
│   │   └── {locale}/
│   │       └── {term}.mdx            # Glossary entries
│   └── authors/
│       └── {slug}.json               # Author profiles
├── messages/                         # i18n translation files
│   ├── en.json
│   ├── fr.json
│   ├── es.json
│   ├── pt.json
│   ├── zh.json
│   └── ar.json
├── public/                           # Static assets
│   ├── sw.js                         # Service worker (cache + notifications)
│   ├── manifest.json                 # PWA manifest
│   ├── icon-192.png / icon-512.png   # PWA icons
│   ├── opengraph-image.png           # Default OG image
│   ├── og/                           # Section-specific OG images
│   └── articles/                     # In-article images (served at /articles/*)
├── src/__tests__/                    # Vitest unit + integration tests
├── e2e/                              # Playwright end-to-end tests
├── docs/
│   ├── TIME_MODEL.md                 # Time model canonical reference
│   └── UX_PHILOSOPHY.md             # UX principles + design decisions log
├── scripts/                          # Dev utilities (icon gen, PDF test)
├── next.config.ts                    # Next.js config (SSG output, next-intl plugin)
├── tailwind.config.ts                # Tailwind config (IPC design tokens)
├── tsconfig.json                     # TypeScript config (@/* alias → src/*)
└── vercel.json                       # Vercel deployment config
```

## Directory Purposes

**`src/app/[locale]/diary/`:**
- Purpose: Patient data-collection section — fully client-side interactive
- Contains: Day 1-3 pages (server shell + client component), diary layout, summary page
- Key files: `day/[dayNumber]/DayPageClient.tsx`, `summary/page.tsx`
- Note: `diary/layout.tsx` sets `robots: noindex` — diary pages are never indexed

**`src/app/[locale]/learn/`:**
- Purpose: SEO-optimized static content CMS — server-rendered at build time
- Contains: Topic pages, article pages, glossary, author profiles, articles archive
- Key files: `[topic]/[slug]/page.tsx` (article detail), `page.tsx` (learn hub)

**`src/components/diary/`:**
- Purpose: All UI components exclusive to the diary recording flow
- Contains: Log forms (void, drink, leak, bedtime, wake), timeline, FAB, progress banners

**`src/components/ui/`:**
- Purpose: Design system primitives reused across both diary and learn sections
- Contains: Button, BottomSheet, ConfirmDialog, TimePicker, Toast, VolumeInput

**`src/lib/`:**
- Purpose: Framework-agnostic business logic, types, and utilities
- Contains: Store, calculations, exports, content loader, i18n utilities
- Note: Files here are either pure functions or React hooks (no page-level logic)

**`content/`:**
- Purpose: Filesystem CMS for all Learn section content
- Contains: MDX articles organized as `{locale}/{topic}/{slug}.mdx`; glossary MDX; author JSON
- Generated: No — manually authored + AI-translated
- Committed: Yes — all content is in the repository

**`messages/`:**
- Purpose: next-intl translation files for all UI strings
- Contains: One JSON file per locale; keys are namespaced (e.g. `landing.startButton`)

**`public/articles/`:**
- Purpose: Images embedded in MDX articles, served at `/articles/{topic}/{filename}`
- Generated: No — manually added with articles

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `LogVoidForm.tsx`, `TimelineView.tsx`)
- Non-component TypeScript modules: `camelCase.ts` (e.g., `calculations.ts`, `topicPagination.ts`)
- Next.js route files: `page.tsx`, `layout.tsx`, `route.ts` (lowercase, Next.js convention)
- Test files: `{module-name}.test.ts` in `src/__tests__/`
- E2E tests: `{flow-name}.spec.ts` in `e2e/`

**Directories:**
- Route segments: lowercase with hyphens (Next.js convention: `[locale]`, `[dayNumber]`, `[slug]`)
- Component subdirectories: lowercase (e.g., `diary/`, `ui/`, `learn/`)
- Content directories: lowercase with hyphens matching slug/topic names (e.g., `bladder-diary/`, `post-prostatectomy/`)

**MDX content files:**
- Pillar articles: `_pillar.mdx` (underscore prefix, one per topic)
- Cluster articles: `{descriptive-slug}.mdx` (e.g., `waking-up-to-pee-at-night.mdx`)
- Glossary terms: `{term}.mdx` (e.g., `nocturia.mdx`)

## Where to Add New Code

**New diary log event type (e.g., pain log):**
- Type definition: `src/lib/types.ts` — add interface + discriminated union
- Store actions: `src/lib/store.ts` — add `addX`, `updateX`, `removeX`, `getXForDay`
- Form component: `src/components/diary/LogXForm.tsx`
- Wire into `DayPageClient`: `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx`
- i18n strings: `messages/*.json` (all 6 locales)
- Tests: `src/__tests__/`

**New learn article:**
- MDX file: `content/articles/en/{topic}/{slug}.mdx` (then run `article-translate`)
- No code changes required — `content.ts` discovers articles at build time

**New learn topic:**
- Create directory: `content/articles/en/{new-topic}/` with `_pillar.mdx` and at least one cluster `.mdx`
- Add to topic taxonomy: `src/lib/topics.ts` → appropriate `TopicGroup.topics` array
- Add i18n label: `messages/en.json` under `learn.hub.topicGroups.{group-key}` if a new group
- Translate: `content/articles/{locale}/{new-topic}/` for all 5 other locales

**New UI primitive component:**
- Implementation: `src/components/ui/YourComponent.tsx`

**New shared utility function:**
- Non-React: `src/lib/utils.ts` (time/date helpers) or `src/lib/constants.ts` (domain constants)
- React hook: `src/lib/useYourHook.ts`

**New Learn section page (static, server):**
- Implementation: `src/app/[locale]/learn/{route}/page.tsx`
- Must export `generateStaticParams` if dynamic segment is used
- Must call `setRequestLocale(locale)` at the top

**New i18n string:**
- Add to `messages/en.json` first under appropriate namespace
- Run `i18n-sync` skill to propagate to all 5 other locale JSON files

## Special Directories

**`.claude/skills/`:**
- Purpose: Agent skill definitions for AI-assisted workflows
- Contains: `article-intake`, `article-translate`, `i18n-sync`, `learn-styling`, `naturalize-prose`, `visual-qa`, `cta-placer`, `image-source`
- Generated: No — manually maintained
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: Architecture and convention documentation for AI planning agents
- Contains: ARCHITECTURE.md, STRUCTURE.md, and other codebase map documents
- Generated: Yes (by GSD map-codebase)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build cache and output
- Generated: Yes
- Committed: No

**`out/`:**
- Purpose: Static export output (`next build` with `output: "export"`)
- Generated: Yes
- Committed: No

**`test-csvs/`:**
- Purpose: Sample CSV files for manual testing of import/export flows
- Generated: By `scripts/generate-test-csvs.ts`
- Committed: Yes (as fixtures)

---

*Structure analysis: 2026-05-14*
