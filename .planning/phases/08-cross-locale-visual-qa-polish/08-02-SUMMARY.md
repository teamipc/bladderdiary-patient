---
phase: 8
plan: "08-02"
subsystem: "e2e"
status: "READY_FOR_HUMAN_VERIFY"
tags: ["playwright", "regression-guards", "C1", "C2", "C3", "C4", "physical-css", "RTL"]
depends_on: ["08-01"]

dependency_graph:
  requires:
    - "08-01 (C1/C2/C3/C4 fixes must be in place for this spec to pass)"
  provides:
    - "e2e/phase8-regression-guards.spec.ts — permanent regression backstop"
  affects:
    - "src/app/[locale]/summary/page.tsx (C1 guard)"
    - "src/components/layout/PrivacyNotice.tsx (C2 guard)"
    - "src/components/diary/QuickLogFAB.tsx (C4 guard)"
    - "src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx (C3 guard)"
    - "ALL src/components/ + src/app/ .tsx/.ts files (physical-CSS guard)"

tech_stack:
  added: []
  patterns:
    - "PW_TEST_MATCH env-var pattern (Phase 5/6/7 precedent; no --test-match CLI flag)"
    - "addInitScript seed pattern (pre-page-load localStorage set; avoids hydration race)"
    - "PHYSICAL_CSS_ALLOWLIST: file+pattern+reason tuple array for expand-and-document"
    - "Node fs walk for static HTML + source grep — no Playwright browser needed for C1 + C5"

key_files:
  created:
    - "e2e/phase8-regression-guards.spec.ts (674 lines, 5 describe blocks)"
  modified: []

decisions:
  - "Allowlist expanded beyond Plan scaffold: 3 additional right-2 entries (LogVoidForm:457, LogDrinkForm:301, LogLeakForm:315), 3 pl-2 pr-3 chip entries, and Day2ReminderCard:94 right-2 close-button. All verified non-blocking in AR. Plan scaffold was illustrative; actual grep of codebase revealed these additional pre-existing entries."
  - "No DEVIATION.md needed: PW_TEST_MATCH hook confirmed present at playwright.config.ts:30; buildSeedState + STORE_KEY confirmed present in e2e/helpers/fixtures.ts. All helpers defined inline in spec per deviation protocol (seedCompleteDiary reuses buildSeedState; seedDay1CompleteOnly uses inline minimal state matching phase6-keyboard.spec.ts pattern)."
  - "PrivacyNotice test uses page.reload() after clearing mfc-privacy-notice-seen flag to reliably trigger the component's show timer — addInitScript alone cannot clear a flag set by the page itself."
  - "C3 no-state test uses page.goto('/en/') first to ensure a clean context before clearing storage, avoiding carry-over from addInitScript on prior context."

metrics:
  duration: "~15 minutes"
  completed_date: "2026-05-17"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 8 Plan 02: Regression Guards Spec — Summary

**One-liner:** Playwright regression backstop with 5 describe blocks guarding C1 (SEO H1 on /summary), C2 (PrivacyNotice above FAB), C3 (hydration-race deep-links), C4 (FAB 44px hit-targets), and expanded physical-CSS allowlist across all components.

## Status

**READY_FOR_HUMAN_VERIFY — spec created but not yet run. Orchestrator merges Plan 08-01 fixes first, then runs this spec against the combined codebase.**

## What Was Built

`e2e/phase8-regression-guards.spec.ts` (674 lines, 5 `test.describe` blocks). Single atomic commit `57fe131`.

### Describe 1: SEO H1 regression guard (C1)

Guards: Plan 08-01 Task 2 fix — the summary page `<h1>` is moved outside `useStoreHydrated()` so it appears in the pre-hydration static HTML.

For each of the 6 locales (`en/fr/es/pt/zh/ar`), reads `out/{locale}/summary.html` synchronously via Node `fs.readFileSync` and asserts `h1Count >= 1`. No browser needed. Fails fast if the file is missing (forces `npm run build` first — correct behavior).

**Path convention:** `out/{locale}/summary.html` (NOT `out/{locale}.html` which is the landing page, or `out/{locale}/index.html` which Next.js does not emit). Locked per Phase 5.

### Describe 2: PrivacyNotice no-overlap with FAB (C2 guard)

Guards: Plan 08-01 Task 3 fix — PrivacyNotice positioning adjusted to sit above the FAB.

6 locales x 2 viewports (375px + 1280px) = 12 tests. Each test:
1. Calls `seedDay1CompleteOnly(page)` via `addInitScript` (CRITICAL: without this, the C3 DayPageClient guard in 08-01 Task 4 redirects un-seeded `/diary/day/1` to `/`)
2. Navigates to `/diary/day/1`
3. Clears `mfc-privacy-notice-seen` flag and reloads so the notice shows
4. Asserts `noticeBottom <= fabTop + 8px` (8px tolerance for rendering jitter)

### Describe 3: DayPageClient hydration race (C3 guard)

Guards: Plan 08-01 Task 4 fix — `useStoreHydrated()` gate prevents immediate redirect before hydration completes.

Tests the exact failure modes from walkthrough_findings.md 2026-05-16 + 2026-05-17:

| Test | Seed | Expected |
|------|------|----------|
| /diary/day/2 with no state | clearStorage | redirect to `/en/` |
| /diary/day/2 with Day 1 complete | seedDay1CompleteOnly | stays on /diary/day/2 |
| /diary/day/3 with full diary | seedCompleteDiary | stays on /diary/day/3 |
| /summary with full diary | seedCompleteDiary | stays on /en/summary + H1 visible |
| 6-locale /summary loop | seedCompleteDiary | stays on /{locale}/summary + H1 visible |

The 6-locale `/summary` loop is the canonical guard for the production regression — 6 tests, one per locale.

### Describe 4: QuickLogFAB 44px hit-target (C4 guard)

Guards: Plan 08-01 Task 5 fix — `min-h-[44px]` added to the 3 speed-dial chips.

2 viewports x (3 chip tests + 1 main-toggle test) = 8 tests. At both 375px and 1280px:
- `fab-action-drink` has CSS `min-height: 44px`
- `fab-action-leak` has CSS `min-height: 44px`
- `fab-action-void` has CSS `min-height: 44px`
- `fab-toggle` (main) has bounding box width=64 height=64 (unchanged by Phase 8)

Uses `data-testid` selectors (not aria-label with ZH placeholders — avoids the silent-failure pattern from Phase 6 bug). `openFabSpeedDial` helper seeds + navigates + clicks fab-toggle before each chip assert.

### Describe 5: Expanded physical-CSS regression guard

Guards: no new directional Tailwind utilities introduced outside the verified-safe allowlist.

Phase 7 had a narrow 3-file guard. Phase 8 expands to ALL `.tsx` and `.ts` files under `src/components/` + `src/app/`. Node-level grep (no browser), single test.

**Pattern matched:** `ml- | mr- | pl- | pr- | left- | right- | -right- | -left- | border-l- | border-r- | text-left | text-right` (excludes `rtl:` variants and `//` comment lines).

**PHYSICAL_CSS_ALLOWLIST** (22 entries total, each with RTL-safety reason):

| File | Pattern | Reason |
|------|---------|--------|
| OnboardingFlow.tsx | `absolute left-3.5 top-1/2` | Calendar icon centered; UI-SPEC defers |
| DaySummaryCard.tsx | `ml-2`, `ml-0.5` | Inline unit suffix spacing |
| LandingContent.tsx | `mr-2` | PlayCircle icon (EN tutorial only) |
| BottomNav.tsx | `left-0 right-0` | Symmetric full-width chrome |
| Toast.tsx | `left-4 right-4` | Symmetric centered toast |
| BottomSheet.tsx | `left-0 right-0` | Symmetric full-width sheet |
| TimelineView.tsx | `ml-6`, `-right-1`, `left-0 right-0` | Observation indent + indicator dot + full-width div |
| LogVoidForm.tsx | `pl-2 pr-3`, `left-1/2 -translate-x-1/2`, `pr-11`, `right-2` | Chip + centered chip + textarea icon + submit icon |
| LogDrinkForm.tsx | `pl-2 pr-3`, `pr-11`, `right-2`, `left-1/2 -translate-x-1/2` | Same pattern as void |
| LogLeakForm.tsx | `pl-2 pr-3`, `pr-11`, `right-2` | Same pattern |
| Day2ReminderCard.tsx | `right-2` (close btn), `pr-7` (title spacer) | Corner close + spacing for close button |

## Spec Invocation Command

```bash
npm run build
npx --yes serve out -l 4173 --no-clipboard &
PHASE8_BASE_URL=http://localhost:4173 \
  PW_TEST_MATCH='phase8-regression-guards\.spec\.ts' \
  npx playwright test e2e/phase8-regression-guards.spec.ts --reporter=line
```

Note: `PW_TEST_MATCH` env var (not `--test-match` CLI flag — does not exist in Playwright 1.59.1). The env var is read by `playwright.config.ts:30` and activates the one-off `verification` project.

## Deviations from Plan

### Auto-expanded allowlist (Rule 2 — missing critical functionality)

The plan scaffold listed 11 allowlist entries. The actual `grep` of the codebase found 8 additional pre-existing physical-CSS patterns not in the scaffold:
- `LogVoidForm.tsx:310` — `pl-2 pr-3` chip
- `LogVoidForm.tsx:457` — `absolute right-2 top-1/2` submit icon
- `LogDrinkForm.tsx:268` — `pl-2 pr-3` chip
- `LogDrinkForm.tsx:301` — `absolute right-2 top-1/2` submit icon
- `LogDrinkForm.tsx:322` — `absolute left-1/2` centered chip
- `LogLeakForm.tsx:254` — `pl-2 pr-3` chip
- `LogLeakForm.tsx:315` — `absolute right-2 top-1/2` submit icon
- `Day2ReminderCard.tsx:94` — `absolute top-2 right-2` close button

All 8 are pre-existing (pre-Phase-5) and verified non-blocking in RTL. Added to allowlist with explicit reasons. No test changes needed; the allowlist itself is the documentation.

### No DEVIATION.md needed

Both gating conditions from the plan's deviation protocol were clear:
- `PW_TEST_MATCH` hook: confirmed present at `playwright.config.ts:30` (no config change needed)
- Seed helpers: `buildSeedState` + `STORE_KEY` confirmed in `e2e/helpers/fixtures.ts` (`seedCompleteDiary` reuses it; `seedDay1CompleteOnly` uses inline minimal state)

## Cross-Reference to Phase 8 ROADMAP Success Criteria

| Criterion | How 08-02 backstops it |
|-----------|----------------------|
| 1. visual-qa zero new findings | Describe 3 (C3+C1) catches the 2 walkthrough_findings.md regressions before merge |
| 2. No physical CSS from Phases 5-7 remains | Describe 5 catches any new physical CSS drift |
| 5. Daily walkthrough passes | Describe 3 guards the C1+C3 root causes the walkthrough already logs |
| C1 closed | Describe 1 (6-locale H1 count on summary) + Describe 3 (/summary H1 visible) |
| C2 closed | Describe 2 (PrivacyNotice no-overlap at 375px + 1280px) |
| C3 closed | Describe 3 (hydration-race deep-link scenarios) |
| C4 closed | Describe 4 (44px hit-target on 3 chips) |

## Self-Check

- [x] `e2e/phase8-regression-guards.spec.ts` exists (674 lines)
- [x] `npx tsc --noEmit` exits 0 (TypeScript clean)
- [x] `npm run lint -- e2e/phase8-regression-guards.spec.ts` exits 0 (ESLint clean)
- [x] `npx vitest run` exits 0 (427/427 tests pass; spec is Playwright, no vitest impact)
- [x] Commit `57fe131` exists on branch `worktree-agent-ae8f12e51951ea26a`
- [x] No files deleted by commit
- [x] 5 `test.describe(` blocks, 3 `'44px'` occurrences, 8 `PHYSICAL_CSS_ALLOWLIST` references, 3 `PW_TEST_MATCH` references, 35 C1/C2/C3/C4 references

## Self-Check: PASSED
