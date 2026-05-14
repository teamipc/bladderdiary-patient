<!-- refreshed: 2026-05-14 -->
# Architecture

**Analysis Date:** 2026-05-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router (SSG)                        │
│                    src/app/[locale]/  (6 locales)                       │
├──────────────────┬────────────────────────┬────────────────────────────┤
│   Diary Section  │    Learn Section        │   Static Pages             │
│  /diary/day/1-3  │  /learn/** (MDX CMS)    │  /, /help, /privacy, etc.  │
│  /summary        │  /learn/glossary        │                            │
│  (client-heavy)  │  (server-rendered SSG)  │  (server-rendered SSG)     │
└────────┬─────────┴──────────┬─────────────┴────────────────────────────┘
         │                    │
         ▼                    ▼
┌────────────────┐   ┌────────────────────────────────────────────────────┐
│  Zustand Store │   │  Content Layer (server-only at build time)         │
│  (client only) │   │  src/lib/content.ts  +  content/ MDX files        │
│  src/lib/      │   │  content/articles/{locale}/{topic}/*.mdx           │
│  store.ts      │   │  content/glossary/{locale}/*.mdx                   │
│  (localStorage)│   │  content/authors/*.json                            │
└────────┬───────┘   └────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Pure Calculation / Export Layer (no React, no I/O)                    │
│  src/lib/calculations.ts  (IPC metrics: 24HV, NPi, MVV, AVV)          │
│  src/lib/exportCsv.ts                                                  │
│  src/lib/exportPdf/index.ts  +  sub-pages (combinedDiary, graphs, …)  │
│  src/lib/observations.ts   (pattern analysis, translation-key output)  │
└────────────────────────────────────────────────────────────────────────┘
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

**Overall:** Two-app hybrid inside one Next.js project

**Key Characteristics:**
- The **diary** (data collection) is a client-side SPA within Next.js App Router — all state in Zustand + localStorage, no server calls during diary use. Pages are statically generated; all interactivity is `'use client'`.
- The **Learn section** is a static-site-generated content CMS — server components read MDX files at build time via `src/lib/content.ts`. No database; filesystem is the CMS.
- Both halves share the same `[locale]` route layout and the `next-intl` i18n layer with 6 locales (en, fr, es, pt, zh, ar).
- Arabic (`ar`) is RTL; `LOCALE_DIR` in `src/i18n/seo.ts` sets `dir="rtl"` on `<html>`.
- Output is a fully static export (`output: "export"` in `next.config.ts`), deployed to Vercel.

## Layers

**Route/Presentation Layer:**
- Purpose: Pages, layouts, and client entry points
- Location: `src/app/[locale]/`
- Contains: Page components, route layouts, generateStaticParams, generateMetadata
- Depends on: Components, lib, i18n
- Used by: Next.js build + browser

**Component Layer:**
- Purpose: Reusable React components organized by domain
- Location: `src/components/{diary,export,layout,learn,onboarding,seo,summary,ui}/`
- Contains: Form components, UI primitives, domain-specific cards and views
- Depends on: lib/store, lib/types, lib/utils, next-intl, lucide-react
- Used by: Page components in src/app/

**State Layer:**
- Purpose: Single source of truth for all diary data on the client
- Location: `src/lib/store.ts`
- Contains: Zustand store, FMV reassignment logic, migration handlers, `useStoreHydrated`
- Depends on: lib/types, lib/utils
- Used by: Any client component that reads or writes diary events

**Calculation Layer:**
- Purpose: Pure IPC metric computation with no side effects
- Location: `src/lib/calculations.ts`
- Contains: `computeMetrics(DiaryState): DiaryMetrics`, day/night metric types
- Depends on: lib/types, lib/utils
- Used by: exportCsv, exportPdf, SummaryPage, and tests

**Export Layer:**
- Purpose: Serialize DiaryState into shareable clinical formats
- Location: `src/lib/exportCsv.ts`, `src/lib/exportPdf/`
- Contains: CSV generation, jsPDF multi-page report (7 page modules in subdirectory)
- Depends on: lib/calculations, lib/types, lib/utils
- Used by: `src/components/export/ExportActions.tsx`

**Content Layer (build-time only):**
- Purpose: Load and cache MDX articles, glossary entries, and author profiles
- Location: `src/lib/content.ts`
- Contains: `getAllArticles`, `getArticle`, `getGlossaryEntries`, `getAllAuthors` — all use `fs.readdirSync` + `gray-matter`
- Depends on: `content/` directory on disk, i18n/config
- Used by: All `/learn/**` server components and sitemap

**i18n Layer:**
- Purpose: Locale routing, message loading, SEO hreflang helpers
- Location: `src/i18n/`
- Contains: `config.ts` (locale list), `navigation.ts` (next-intl routing), `request.ts` (server message loader), `seo.ts` (localizedPath, hreflang maps, RTL map)
- Depends on: next-intl, messages/*.json
- Used by: Every layout, page, and component that uses translations

## Data Flow

### Primary Diary Recording Path

1. User opens `/` (home) — `LandingContent` reads `useDiaryStore()` state via `useStoreHydrated` to check `diaryStarted` (`src/app/[locale]/LandingContent.tsx`)
2. First visit: `OnboardingFlow` collects age, start date, volume unit, timezone → calls `store.startDiary()` + setters (`src/components/onboarding/OnboardingFlow.tsx`)
3. User navigates to `/diary/day/1` — `DayPageClient` renders `TimelineView` + `QuickLogFAB` (`src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx`)
4. Tap FAB → open `BottomSheet` with `LogVoidForm` / `LogDrinkForm` / `LogLeakForm` — forms call `store.addVoid()` / `store.addDrink()` / `store.addLeak()` (`src/components/diary/Log*Form.tsx`)
5. `addVoid` runs duplicate check → calls `getDayNumber()` → calls `reassignMorningVoid()` → persists to localStorage via Zustand persist middleware (`src/lib/store.ts`)
6. After Day 3 bedtime set → navigate to `/summary` → `SummaryPage` calls `computeMetrics(store)` then `generateObservations(store)` (`src/app/[locale]/summary/page.tsx`)
7. User taps export → `ExportActions` calls `generateCsv(state)` or `generatePdfBlob(state, locale)` → browser download (`src/components/export/ExportActions.tsx`)

### Learn Article Request Path (build time → static)

1. `generateStaticParams` in article page calls `getClusterArticles(locale)` → reads `content/articles/{locale}/{topic}/*.mdx` (`src/app/[locale]/learn/[topic]/[slug]/page.tsx`)
2. At render time, `getArticle(locale, topic, slug)` returns frontmatter + body from in-memory cache (`src/lib/content.ts`)
3. `RenderMdx` processes MDX with rehype-slug, rehype-autolink-headings, remarkGfm, and `remarkAutoLinkGlossary` — auto-links recognized glossary terms (`src/lib/mdx.tsx`)
4. Custom MDX components inject `next/image` (with build-time dimension resolution), `DiaryCta`, `DownloadCta`, `Link`

**State Management:**
- All diary state lives exclusively in the browser's `localStorage` via Zustand's `persist` middleware, key `bladder-diary-patient` (version 2 with migration).
- No server-side state for the diary. The app is fully offline-capable after first load.
- The Learn section has no runtime state — it is pure static HTML generated at build time.

## Key Abstractions

**DiaryState:**
- Purpose: The normalized data model for a 3-day diary (voids, drinks, leaks, bedtimes, wakeTimes, plus settings)
- Examples: `src/lib/types.ts` (interface), `src/lib/store.ts` (runtime instance)
- Pattern: All timestamps are ISO 8601 UTC strings. Day boundaries are computed on-the-fly using bedtime entries, not calendar dates.

**getDayNumber:**
- Purpose: Assigns an event's diary day (1|2|3) using bedtime-aware boundaries rather than midnight
- Examples: `src/lib/utils.ts:310`, called throughout store, calculations, display components
- Pattern: Pass `(timestampIso, startDate, bedtimes[], timeZone?)` — never compute day number from calendar date alone

**computeMetrics:**
- Purpose: Produces `DiaryMetrics` (IPC clinical metrics) from a `DiaryState` snapshot
- Examples: `src/lib/calculations.ts` — called in exportCsv, exportPdf, SummaryPage, tests
- Pattern: Pure function with no side effects; safe to call any time; Day 1 excluded from 24HV/NPi/AVV

**FMV (First Morning Void):**
- Purpose: `isFirstMorningVoid: boolean` flag on `VoidEntry` — drives NPi calculation and clinical interpretation
- Examples: `reassignMorningVoid()` in `src/lib/store.ts:29` — automatically recomputed on every void add/update/remove, bedtime change, and wake-time change
- Pattern: Never set manually except via `markMorningVoid`; always recomputed from wake time proximity

**Locale Routing:**
- Purpose: next-intl `localePrefix: 'as-needed'` means English is at bare paths (`/`, `/learn/...`); all others are prefixed (`/fr/`, `/es/learn/...`)
- Examples: `src/i18n/navigation.ts`, `src/i18n/seo.ts:localizedPath`
- Pattern: Always use `localizedPath(locale, path)` for canonical URLs; use `<Link>` from `@/i18n/navigation` (not next/link) in components

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every request (wraps locale layout)
- Responsibilities: Imports globals.css; renders children only (thin passthrough)

**Locale Layout:**
- Location: `src/app/[locale]/layout.tsx`
- Triggers: Every request within a locale
- Responsibilities: Validates locale, sets request locale, loads i18n messages, renders html/body/AppShell, registers ServiceWorker, injects JSON-LD, Vercel Analytics

**Diary Day Page:**
- Location: `src/app/[locale]/diary/day/[dayNumber]/page.tsx`
- Triggers: Navigation to `/diary/day/1`, `/diary/day/2`, `/diary/day/3`
- Responsibilities: Static shell; defers all interactivity to `DayPageClient` (client component inside Suspense)

**Service Worker:**
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

**What happens:** Setting hours/minutes directly on a JS Date uses the browser's local timezone offset.
**Why it's wrong here:** The app supports a user-configurable IANA timezone (stored as `store.timeZone`). A patient in Singapore with a browser reporting UTC+0 would place all their events on the wrong diary day.
**Do this instead:** Use `buildIsoForClockTimeInTz(baseIso, hours, minutes, timeZone)` from `src/lib/utils.ts:74`.

### Computing diary day from calendar date

**What happens:** Assuming a void at "2024-01-02" belongs to Day 2 because the start date is "2024-01-01".
**Why it's wrong here:** Day boundaries are defined by bedtime entries, not midnight. A void at 01:00 after a Day 1 bedtime at 23:30 belongs to Day 2, even though it's on Day 2's calendar date.
**Do this instead:** Always call `getDayNumber(timestampIso, startDate, bedtimes, timeZone)` from `src/lib/utils.ts:310`.

### Importing `useDiaryStore` in server components

**What happens:** Any server component that imports from `src/lib/store.ts` gets a build error because it uses `'use client'` and browser APIs (localStorage).
**Why it's wrong here:** Server components run Node.js; there is no `localStorage` or `window`.
**Do this instead:** Pass diary-derived data as props from parent client components, or use page-level client wrappers (see `DayPageClient` pattern).

### Reading persisted store state before hydration

**What happens:** A component reads `diaryStarted` or `getBedtimeForDay(3)` and redirects to `/` on the empty initial state.
**Why it's wrong here:** Zustand persist rehydrates asynchronously; the first render always sees `initialState` (empty), causing false redirects on deep links or refreshes.
**Do this instead:** Always gate conditional rendering/redirects behind `useStoreHydrated()` from `src/lib/store.ts:377`.

## Error Handling

**Strategy:** Graceful degradation with no error boundaries shown to patients.

**Patterns:**
- `safeReaddir()` in `src/lib/content.ts` wraps filesystem reads; returns `[]` on failure so missing locale/topic directories degrade to empty article lists rather than build errors.
- Duplicate event detection in store (`addVoid`, `addDrink`, `addLeak`) returns `false` on duplicate; UI is required to check the return value before showing a success toast.
- `getArticle` returns `undefined` for missing locale articles; article pages call `notFound()`.
- `getDayNumber` has fallback behavior when no bedtime is set (uses midnight boundary).

## Cross-Cutting Concerns

**Logging:** `@vercel/analytics` `track()` calls at user action points (onboarding complete, export triggered, etc.). No server-side logging.
**Validation:** Form components (LogVoidForm, etc.) do local validation before calling store actions. No schema validation library.
**Authentication:** None. The app is fully anonymous; no accounts, no server session. Clinic code is stored as a free-text field in DiaryState for optional institutional routing.

---

*Architecture analysis: 2026-05-14*
