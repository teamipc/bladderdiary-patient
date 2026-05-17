---
phase: 8
plan: "08-01"
subsystem: "diary-ui"
status: "PARTIAL — Tasks 2-5 complete; Tasks 1 (visual-qa audit) + 6 (walkthrough gate) are orchestrator-owned"
tags: ["hydration-race", "seo", "layout", "accessibility", "boomer-safe"]
dependency_graph:
  requires: []
  provides:
    - "C1: summary H1 in pre-hydration static HTML (SEO)"
    - "C2: PrivacyNotice no-overlap with FAB at all viewports"
    - "C3: DayPageClient redirect race eliminated"
    - "C4: QuickLogFAB speed-dial chips 44px hit-target"
  affects:
    - "src/app/[locale]/summary/page.tsx"
    - "src/components/layout/PrivacyNotice.tsx"
    - "src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx"
    - "src/components/diary/QuickLogFAB.tsx"
tech_stack:
  added: []
  patterns:
    - "useStoreHydrated() gate in DayPageClient (mirrors LandingContent + summary pattern)"
    - "min-h-[44px] Boomer-safe hit-target override (same precedent as Phase 7 back-pill)"
    - "fixed positioning shift for stacked bottom-chrome elements"
key_files:
  modified:
    - "src/app/[locale]/summary/page.tsx"
    - "src/components/layout/PrivacyNotice.tsx"
    - "src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx"
    - "src/components/diary/QuickLogFAB.tsx"
decisions:
  - "C1: wrap spinner branch in Container + h1 using existing summary.heroTitle key — no new i18n keys"
  - "C2: 1-line positioning shift (bottom-20 → bottom-44 md:bottom-28) preferred over architectural layout overhaul"
  - "C3: gate all 4 store-dependent useEffects (not just redirects) on useStoreHydrated() for consistency"
  - "C4: min-h-[44px] explicit floor over py-3 bump — self-documenting and matches Phase 7 back-pill precedent"
metrics:
  duration: "~12 minutes"
  completed_date: "2026-05-17"
  tasks_completed: 4
  tasks_total: 6
  files_modified: 4
---

# Phase 8 Plan 01: Bundled Visual-QA Polish + 4 Carry-Over Fixes — Summary

**One-liner:** Closed 4 pre-existing carry-overs: SEO H1 in static summary HTML, PrivacyNotice stacking above FAB, DayPageClient hydration-race eliminated, QuickLogFAB chips at 44px Boomer-safe floor.

## Status

PARTIAL — Tasks 2-5 (C1/C2/C3/C4) complete with atomic commits. Tasks 1 (visual-qa 64-screen audit) and 6 (daily walkthrough gate) are orchestrator-owned and were not executed by this agent.

## Tasks Completed

| Task | Carry-Over | Commit | Description |
|------|-----------|--------|-------------|
| 2 | C1 | a316cf1 | Summary H1 rendered outside hydration gate for SEO |
| 3 | C2 | 09ff3d3 | PrivacyNotice positioned above FAB (no overlap) |
| 4 | C3 | 320c9da | DayPageClient redirects gated on useStoreHydrated() |
| 5 | C4 | f033edb | QuickLogFAB speed-dial chips min-h-[44px] |

## Carry-Over Details

### C1 — Summary H1 hydration race (SEO)

**Problem:** `<h1>` was inside the `if (!hydrated) return <spinner/>` branch, so pre-hydration static HTML (`out/{locale}/summary.html`) contained zero H1 elements. SEO grep returned 0 for all 6 locales.

**Fix:** Replaced the bare spinner with a `<Container>` wrapping an `<h1>` using the existing `summary.heroTitle` key above the spinner. Post-hydration path (the full render's H1 at line 114) is unchanged.

**Verified:** `grep -c '<h1' out/$l/summary.html` returns 1 for all 6 locales (en, fr, es, pt, zh, ar). Build clean. Zero new i18n keys.

### C2 — PrivacyNotice overlap with FAB

**Problem:** PrivacyNotice at `bottom-20` (80px) with its ~100px card height could occlude the FAB. On desktop specifically, FAB sits at `md:bottom-8` (32px) — well below PrivacyNotice's card extent.

**Fix:** Shifted positioning from `bottom-20` to `bottom-44 md:bottom-28` (176px mobile / 112px desktop). Math: desktop FAB at 32px + 80px clear gap = PrivacyNotice card starts at 112px. Mobile FAB at 96px + 80px clear gap = PrivacyNotice card starts at 176px. AppShell unchanged. Z-stacking preserved (FAB z-50 > PrivacyNotice z-40).

### C3 — DayPageClient redirect race

**Problem:** 2 redirect useEffects fired before Zustand's persist middleware finished rehydrating localStorage. `diaryStarted` read as `false` on initial render, causing wrong redirect to `/` when deep-linking to `/diary/day/N` with a valid in-progress diary.

**Fix:** Added `useStoreHydrated()` import and declaration; gated all 4 store-dependent useEffects (auto-open void, track-pageview, redirect-to-landing, redirect-to-prev-day) with `if (!hydrated) return`. Added loading spinner block before the `if (!diaryStarted || !prevDayComplete) return null` early-return. Mirrors the exact pattern from `summary/page.tsx` and `LandingContent.tsx`.

### C4 — QuickLogFAB speed-dial hit-target

**Problem:** 3 speed-dial chip buttons had `py-2.5` (20px total vertical padding) + `w-10 h-10` icon disc = effective ~40px rendered height. Boomer-safe override 1 requires 44px minimum.

**Fix:** Added `min-h-[44px]` after `min-w-[8rem]` on all 3 chip buttons (drink, leak, void). Main FAB toggle (`w-16 h-16` = 64px) and icon discs (`w-10 h-10`) unchanged. Same correctness-fix precedent class as Phase 7 back-pill bump.

## Verification Gates Passed

- `npm run build` exits 0
- `npx tsc --noEmit` exits 0 (all edits)
- `npx vitest run` 427/427 tests pass (21 test files)
- `grep -c '<h1' out/$l/summary.html` = 1 for all 6 locales
- `grep -c 'min-h-\[44px\]' src/components/diary/QuickLogFAB.tsx` = 3
- `grep -c "useStoreHydrated" DayPageClient.tsx` = 2 (import + usage)
- `grep -c "if (!hydrated) return" DayPageClient.tsx` = 4

## Deviations from Plan

None — plan executed exactly as written for Tasks 2-5. Line numbers in the plan were accurate; the concrete change patterns matched the actual file shapes exactly.

## Known Stubs

None — all 4 fixes are complete correctness closes, not stubs.

## Self-Check: PASSED

- `src/app/[locale]/summary/page.tsx` modified: confirmed
- `src/components/layout/PrivacyNotice.tsx` modified: confirmed
- `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx` modified: confirmed
- `src/components/diary/QuickLogFAB.tsx` modified: confirmed
- Commits a316cf1 (C1), 09ff3d3 (C2), 320c9da (C3), f033edb (C4): all in git log
