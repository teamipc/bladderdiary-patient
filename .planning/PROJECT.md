# My Flow Check — Bladder Diary Patient App

## What This Is

A 3-day bladder diary tracker for patients, designed to be filled out by the patient and exported (CSV/PDF) directly to their clinician. Built around the IPC (Integrated Pelvic Care) methodology — originally centered on men's pelvic health education, but the diary tool itself is usable by any patient regardless of gender. Production app at [myflowcheck.com](https://myflowcheck.com), already deployed and in real-world clinical use.

## Core Value

The patient can complete a clinically-accurate 3-day diary in their own timezone, with their own routine, and walk away with a clinician-ready export — without losing data, without confusing UX, and without privacy compromises.

## Requirements

### Validated

<!-- Inferred from .planning/codebase/ (cd3de78). These shipped and are in production use. -->

- ✓ **CORE-01**: 3-day diary entry covering voids, drinks, leaks, wake times, bedtimes — existing
- ✓ **CORE-02**: IPC-aligned clinical metrics (24HV, AVV, MVV, NPi, NBC) computed from raw events — existing (`src/lib/calculations.ts`)
- ✓ **CORE-03**: Timezone-aware day-boundary attribution with bedtime-aware overnight handling — existing (`src/lib/utils.ts:getDayNumber`, `docs/TIME_MODEL.md`)
- ✓ **EXPORT-01**: CSV export with METADATA + EVENTS + CALCULATED_METRICS sections — existing (`src/lib/exportCsv.ts`)
- ✓ **EXPORT-02**: Multi-page clinician-ready PDF export (daily diary grid, results overview, graphs, machine-readable summary) — existing (`src/lib/exportPdf/`)
- ✓ **EXPORT-03**: Web Share API + download fallback for handing off the export — existing (`src/components/export/ExportActions.tsx`)
- ✓ **I18N-01**: Six-locale UI (en/fr/es/pt/zh/ar) with RTL support for Arabic — existing (`src/i18n/`, `messages/`)
- ✓ **I18N-02**: Locale-mirrored MDX article library (19 articles × 6 locales = 114 files), enforced by Stop hook + pre-commit hook — existing (`content/articles/`)
- ✓ **LEARN-01**: `/learn` editorial section with topic-cluster pillar pages, glossary, author pages, audience landing — existing (`src/app/[locale]/learn/`)
- ✓ **STORAGE-01**: localStorage-only persistence with Zustand `persist` middleware + version migration — existing (`src/lib/store.ts`)
- ✓ **PWA-01**: Installable PWA with service-worker app-shell caching, manifest, install prompt — existing (`public/sw.js`, `src/lib/usePwaInstall.ts`)
- ✓ **OBSERVATIONS-01**: Patient-friendly observation generation from diary data (caffeine-to-bathroom, evening fluids, night wakings, consistency) — existing (`src/lib/observations.ts`)
- ✓ **REMINDERS-01**: Local notification reminders at 8/14/21 in browser-local time — existing (`src/lib/notifications.ts`)
- ✓ **QA-01**: Daily automated walkthrough across all 6 locales on production, findings logged to memory — existing (walkthrough_findings.md memory + e2e suite)

### Active

<!-- Current milestone: Stabilization. Fix silent bugs flagged in CONCERNS.md (cd3de78). -->

- [ ] **STAB-01**: Fix `INTL_LOCALES` to cover all 6 locales (pt/zh/ar currently fall back to en-US formatting) — `src/lib/utils.ts:8`
- [ ] **STAB-02**: Reminders honor the patient's stored timezone, not browser-local — `src/lib/notifications.ts`
- [ ] **STAB-03**: Dedupe day-attribution logic in `observations.ts` (currently re-implements `getDayNumber` with subtly wrong guard) — `src/lib/observations.ts`
- [ ] **STAB-04**: PDF graphs/slots use timezone-correct minutes (`getMinutesInTz`) instead of browser-local `getMinutes()` — `src/lib/exportPdf/graphs.ts`, `slots.ts`
- [ ] **STAB-05**: `wakeTimes` null-guard consistency + v1→v2 store migration safety — `src/lib/observations.ts`, `src/lib/store.ts`
- [ ] **STAB-06**: Locale-aware milestone toast deduplication (currently re-fires on locale switch) — `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx`
- [ ] **STAB-07**: Replace export-error `alert()` with toast — `src/components/export/ExportActions.tsx`
- [ ] **STAB-08**: Validate + length-cap `clinicCode` query param before persisting — `src/app/[locale]/LandingContent.tsx`

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Server-side data storage / cloud backup / user accounts** — Patient data is intentionally localStorage-only (see `project_localstorage_by_design` memory). No PHI on a server keeps compliance surface tiny and lets the app run as a static frontend. CSV/PDF export IS the backup path.
- **Treating localStorage eviction as a bug** — Known acceptable risk. Addressed through onboarding guidance ("complete the 3 days in a row, export immediately"), not through cloud sync.
- **Per-deployment `PREMIUM_FEATURES_ENABLED` env gating** — Compile-time constant is intentional for now; revisit when premium is commercialized.
- **Curated timezone-list expansion / general timezone-picker rework** — Auto-detect handles the long tail. Curated list updates can ride along with audit-driven fixes but aren't a standalone phase.
- **Backwards-compatibility shims for v0 store migrations** — Wakefile-null-guard fix (STAB-05) is the last bridge; subsequent store versions assume v2+ shape.

## Context

**Maturity:** Brownfield production app. Already deployed, indexed by search engines (canonical URL is bare `myflowcheck.com`), used by real clinicians and patients.

**Audience:**
- **Patient** (primary user of the app itself): typically 50+, may be non-tech-savvy, completing the diary for their clinician. Boomer-safe UX is a hard constraint (see `docs/UX_PHILOSOPHY.md`).
- **Clinician** (recipient of the export): includes PFPTs, PCPs, and urologists. Diary export must be readable by all three roles — never write "your urologist" as the default destination (`feedback_dont_center_urologists`).

**Working state:**
- Codebase map at `.planning/codebase/` (cd3de78) — authoritative reference for tech stack, architecture, conventions, integrations, and current concerns.
- Concerns audit identified 8 active stabilization items (see Active requirements above).
- Walkthrough findings (memory: `walkthrough_findings.md`) auto-updated daily from cross-locale production runs.

**Voice / copy rules:**
- No em-dashes in UI strings (`feedback_no_em_dashes`).
- Collaborative tone, not clinical/authoritative (`feedback_collaborative_tone`).
- Don't center urologists (`feedback_dont_center_urologists`).

**Key external dependencies:** No server. No third-party API at runtime. Vercel hosts static export. The only data leaving the device is the CSV/PDF the patient hands to their clinician.

## Constraints

- **Tech stack**: Next.js 16 App Router + React 19 + Tailwind 4 + Zustand + next-intl 4 — pinned by existing codebase, not up for re-litigation in this milestone.
- **Storage**: localStorage only. No server, no cloud, no accounts. Drives compliance simplicity (no PHI on a server). Reaffirmed in Out of Scope.
- **i18n**: All six locales (en/fr/es/pt/zh/ar) must remain at parity. Stop hook + pre-commit hook enforce article translation coverage.
- **Output mode**: `next.config.ts` uses `output: "export"` — static export only. No server-side runtime is available, so anything proposing a server endpoint is non-viable without ripping out the deployment model.
- **Day-boundary correctness**: Three layers (form correctors, `getDayNumber`, `reassignMorningVoid`) must stay in sync. See `docs/TIME_MODEL.md` and `time_model_gotchas` memory before any change to time/timezone code.
- **Daily walkthrough must keep passing**: 6-locale production walkthrough is the canonical quality gate. Findings auto-log to `walkthrough_findings.md`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| localStorage-only, no server/backup | Patient privacy + regulatory simplicity. Export IS the backup. | ✓ Good — load-bearing for compliance posture |
| Static export deployment | No PHI surface on the server side. Vercel CDN handles everything. | ✓ Good — drives storage decision above |
| Six locales as MVP scope (en/fr/es/pt/zh/ar) | Coverage for the major patient populations IPC clinicians serve | ✓ Good — enforced by hooks, prevents drift |
| Three-layer day-boundary logic (form correctors + `getDayNumber` + `reassignMorningVoid`) | Naive `setHours` silently breaks for any patient whose browser tz ≠ stored tz | ⚠️ Revisit — fragile, see STAB-03 deduplication |
| Premium features gated by compile-time constant (not env) | Intentional friction while uncommercialized | — Pending — revisit when commercializing |
| Stabilization milestone (this) | Audit-driven: 8 silent bugs surfaced by `.planning/codebase/CONCERNS.md` are higher-leverage than new features | — Pending — outcome judged at milestone close |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 after initialization (brownfield wrap, milestone framing = Stabilization)*
