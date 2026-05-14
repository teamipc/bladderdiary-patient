# External Integrations

**Analysis Date:** 2026-05-14

## APIs & External Services

**Analytics:**
- Vercel Analytics - Page view tracking and custom event tracking
  - SDK/Client: `@vercel/analytics` ^2.0.0
  - Auth: None (auto-configured via Vercel deployment)
  - Injection: `<Analytics />` component in `src/app/[locale]/layout.tsx`
  - Custom events: `track()` calls in `src/app/[locale]/LandingContent.tsx`, `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx`, `src/app/[locale]/summary/page.tsx`, `src/components/diary/SetBedtimeForm.tsx`, `src/components/onboarding/OnboardingFlow.tsx`, `src/components/export/ExportActions.tsx`

**Typography:**
- Google Fonts (via `next/font/google`) - Inter typeface loaded at build time
  - Usage: `src/app/[locale]/layout.tsx`
  - Subsets: `latin`
  - Self-hosted by Next.js at build time (no runtime Google Fonts request)

**External Link:**
- `https://ipc.health` - Referenced in `src/components/ui/IpcInfoModal.tsx` as an outbound link only. No API calls.

## Data Storage

**Databases:**
- None. No remote database. The app is entirely client-side.

**Client-Side Storage:**
- localStorage via Zustand `persist` middleware
  - Store: `src/lib/store.ts`
  - Key: set by Zustand persist config (diary state — voids, drinks, bedtimes, wake times, settings)
  - Migration: version-based migration function at `src/lib/store.ts:330`
  - Hydration pattern: `useStoreHydrated()` hook exported from `src/lib/store.ts` — required for SSR-safe rendering of persisted state

**File Storage:**
- Local filesystem only (no cloud file storage)
  - Article MDX: `content/articles/<locale>/<topic>/`
  - Glossary MDX: `content/glossary/<locale>/`
  - Article assets (images): `public/articles/<topic>/<slug>/`
  - Author bios: `content/authors/*.json`

**Caching:**
- In-memory module-level cache in `src/lib/content.ts` for `getAllArticles()` and `getAllAuthors()` calls (production-only; bypassed in development for live reloads)
- Service worker cache (`public/sw.js`): cache-first strategy for app shell routes (`/`, `/diary/day/1-3`, `/summary`, `/help`, `/manifest.json`, icons). Cache name: `bladder-diary-v1`.

## Authentication & Identity

**Auth Provider:**
- None. No user accounts, no authentication.
  - `setClinicCode()` in the Zustand store accepts an optional clinic code string for downstream context — this is a data field, not authentication.

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, or equivalent)

**Logs:**
- Development: `process.env.NODE_ENV === 'development'` guard in `src/app/error.tsx` shows raw error messages
- No structured logging in production

**E2E Monitoring:**
- Playwright daily walkthrough against `https://myflowcheck.com` via `npm run e2e:walkthrough`
  - Results written to `test-results/walkthrough/results.json`
  - Findings document auto-updated by `scripts/update-walkthrough-findings.mjs`
  - Runs all 6 locales (en, fr, es, pt, zh, ar) on iPhone 14 viewport (390×844)
  - Accessibility scan via `@axe-core/playwright` in `e2e/a11y.spec.ts`

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from `vercel.json`, `@vercel/analytics`, and `WALKTHROUGH_BASE_URL` defaulting to `https://myflowcheck.com`)
- Static export: `output: "export"` in `next.config.ts` produces a fully static site in `out/`

**Routing (Vercel-managed):**
- `vercel.json` defines:
  - Redirects: `/en` and `/en/:path*` → bare paths (permanent 308)
  - Rewrites: bare paths (`/`, `/diary`, `/learn`, `/summary`, `/help`, `/privacy`, `/terms`, `/feed.xml`) → `/en/*` internally
- `www` → bare domain 308 redirect is Vercel dashboard-configured (not in `vercel.json`)
- Canonical domain: `https://myflowcheck.com` (bare, not www). Hardcoded in `src/lib/content.ts:326` as `SITE_URL`.

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, or similar config files present)
- Pre-commit hook (`.githooks/pre-commit`) runs article i18n completeness check before every commit

## Webhooks & Callbacks

**Incoming:**
- None. No webhook endpoints.

**Outgoing:**
- None. No outgoing webhooks.

## Push Notifications

**Provider:** Web Push Notifications API (browser-native, no third-party push service)
- Implementation: `src/lib/notifications.ts`
- Schedule: 3 daily reminders at 08:00, 14:00, 21:00 local time via `setTimeout`
- Delivery: via `ServiceWorkerRegistration.showNotification()` when SW is active; fallback to `new Notification()` for foreground
- Requires explicit user permission grant
- One-time diary-complete notification scheduled for day 4 at 09:00

## SEO / Schema.org

**JSON-LD Schemas (no external API):**
- `Organization`, `WebSite`, `BreadcrumbList`, `Article`, `MedicalWebPage`, `FAQPage`, `HowTo`, `Person` schemas emitted from `src/components/seo/JsonLd.tsx`
- RSS feed generated at `/[locale]/feed.xml` from `src/app/[locale]/feed.xml/route.ts`
- Sitemap generated at `/sitemap.xml` from `src/app/sitemap.ts` (Next.js built-in)
- robots.txt generated from `src/app/robots.ts`; diary and summary paths are `Disallow`ed

## Content Automation (Claude Agent Skills)

**Article intake pipeline (`.claude/skills/article-intake/`):**
- Receives article packages from external SEO workflow dropped into `.incoming/`
- No external API calls — filesystem-only operation

**i18n sync automation (`.claude/skills/i18n-sync/`):**
- Auto-triggered by PostToolUse hook in `.claude/settings.json` on `messages/en.json` edits
- Mirrors UI string translations to `messages/{fr,es,pt,zh,ar}.json`

**Article translation automation (`.claude/skills/article-translate/`):**
- Auto-triggered by PostToolUse hook on `content/articles/en/**/*.mdx` edits
- Mirrors article MDX to `content/articles/{fr,es,pt,zh,ar}/`
- Stop hook blocks turn completion if any English article lacks all 5 locale mirrors

## Environment Configuration

**Required env vars:**
- None required for production deployment
- Vercel analytics auto-configured by Vercel platform on deployment

**Optional test env vars:**
- `WALKTHROUGH_BASE_URL` - Override target URL for Playwright walkthrough (default: `https://myflowcheck.com`)
- `HEADED` - Set to `1` to run Playwright in headed mode
- `DIARY_PDF_OUT` - Override output directory for PDF generation tests

**Secrets location:**
- No secrets in repository. No `.env` files present.

---

*Integration audit: 2026-05-14*
