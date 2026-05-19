---
phase: 11-wcag-aa-baseline
plan: 01
subsystem: a11y
tags: [wcag, a11y, h1, semantic-heading, diary, onboarding, axe-core]

# Dependency graph
requires:
  - phase: 08-cross-locale-visual-qa
    provides: DTUX-06 cross-locale visual QA spec — the regression-guard scaffolding model that Plan 11-04 will extend with axe-core page-has-heading-one assertions
provides:
  - "Diary day pages 1/2/3 (TimelineView) render <h1> 'Day N' / 'Night N' instead of <h2>, eliminating the WCAG 2.4.6 + 1.3.1 headingless-page violation on the app's most-used surface"
  - "Onboarding wizard renders <h1> on each of the 3 active step components (age/unit/date), eliminating the /{locale} showOnboarding-state h1 gap (LandingContent branch 3)"
  - "Single-h1-per-rendered-page invariant holds across the app — 23 source-tree h1 openings, but at any given moment exactly one mounts per route (mutex branches in LandingContent, summary, learn-topic; mutex steps in OnboardingFlow; modal overlay pattern for Day1Celebration)"
affects: [phase-11-02, phase-11-03, phase-11-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Semantic h1 promotion as the smallest-possible-fix pattern: change tag name only, preserve every Tailwind class verbatim, no aria additions (the heading's translated text IS its accessible name)"
    - "Mutex h1 sources are valid: when conditional render branches (or wizard steps) each carry their own h1 but only one mounts at a time, source-tree h1 count > 1 is correct and the runtime-DOM invariant 'exactly one h1 per rendered page' still holds. Examples: LandingContent (2), summary (2), learn-topic (2), OnboardingFlow (3)"

key-files:
  created: []
  modified:
    - src/components/diary/TimelineView.tsx
    - src/components/onboarding/OnboardingFlow.tsx

key-decisions:
  - "Trust Task 3's explicit '= 3 h1s in OnboardingFlow' gate over Task 2's stale '= 21 aggregate / = 1 OnboardingFlow' bookkeeping count. Task 3 was added by plan-check after the original h1 audit; Task 2's verify numbers were not fully patched to reflect it. Reconciled to actual count 23 (= 19 baseline + 1 TimelineView + 3 OnboardingFlow), documented as Rule-3 deviation."
  - "Pre-existing 6 react-hooks/preserve-manual-memoization ESLint errors + 1 useRef-unused warning in TimelineView.tsx confirmed pre-existing via git-stash diff (identical errors on the unmodified HEAD file). Already tracked in deferred-items.md per STATE.md. Out-of-scope per executor scope-boundary rule; NOT introduced by this plan."

patterns-established:
  - "h2→h1 semantic promotion: tag-name-only swap, classes preserved verbatim, no new aria attributes (translated text content is the accessible name)"
  - "Source-tree h1 count reconciliation: when mutex branches each carry their own h1, the source count is the sum of mount-time possibilities, not the runtime per-page count — both are correct, they answer different questions"

requirements-completed: [A11Y-01]

# Metrics
duration: 6m 41s
completed: 2026-05-19
---

# Phase 11 Plan 01: TimelineView + OnboardingFlow h2→h1 Promotion (A11Y-01) Summary

**Closed the two real h1 gaps the 2026-05-18 audit (UI-REVIEW.md finding I3) flagged on user-reachable surfaces — the diary day-page header (TimelineView:506) and each of the 3 onboarding wizard step headings (OnboardingFlow:107/149/211) — via single-character semantic swaps that preserve every Tailwind class verbatim, with zero visual regression and zero new i18n keys.**

## Performance

- **Duration:** 6m 41s
- **Started:** 2026-05-19T00:35:03Z
- **Completed:** 2026-05-19T00:41:44Z
- **Tasks:** 3 completed (1 source edit on TimelineView + read-only aggregate audit + 1 source edit on OnboardingFlow)
- **Files modified:** 2

## Accomplishments

- **TimelineView.tsx:506** — promoted the day-view / night-view `<h2>` "Day N" / "Night N" page header to `<h1>`. This is the heading the patient reads as their current location, and DayPageClient previously had ZERO h1 in the DOM. Screen readers now parse the diary day pages (the app's highest-traffic surface) as having a real page heading.
- **OnboardingFlow.tsx:107/149/211** — promoted each wizard step's `<h2>` ageTitle / unitTitle / dateTitle to `<h1>`. Because the three step components are mutually exclusive (`{step === 1 && ...}` / `{step === 2 && ...}` / `{step === 3 && ...}`), exactly one `<h1>` mounts per render — preserving the "exactly one h1 per rendered page" invariant on the `/{locale}` showOnboarding-state path.
- **Aggregate h1 audit:** source-tree `<h1>` openings went from 19 → 23 (+1 TimelineView, +3 OnboardingFlow). Day1Celebration's `aria-labelledby="day1-celebration-title"` modal-pattern wiring confirmed intact (multiple h1s in DOM under an `aria-modal="true"` dialog is acceptable per axe-core's `page-has-heading-one` rule).
- **Zero regressions:** vitest 530 passed + 1 skipped (exact match to Phase 10 baseline of 530/531); tsc strict clean; OnboardingFlow.tsx ESLint clean; TimelineView.tsx ESLint output identical pre/post edit (the 6 React-Compiler errors + 1 useRef warning are pre-existing and already in deferred-items.md).

## Task Commits

All 3 tasks ship in a single atomic commit per the plan's `<output>` instruction:

1. **Task 1: TimelineView day/night header h2 → h1** - bundled in `1858399` (fix)
2. **Task 2: Aggregate h1 audit (read-only)** - no source change; verified via grep in `1858399`'s pre-commit checks
3. **Task 3: OnboardingFlow active-step h2 → h1 (3 sites)** - bundled in `1858399` (fix)

**Plan metadata commit (SUMMARY.md + STATE.md + ROADMAP.md):** will follow this SUMMARY.md write.

## Files Created/Modified

- `src/components/diary/TimelineView.tsx` — 2 token swaps on line 506/508 (`<h2 className=...>` → `<h1 className=...>`, matching `</h2>` → `</h1>`). Every Tailwind class preserved verbatim: `text-xl font-bold text-balance` + the conditional `isNighttime ? 'text-indigo-100' : 'text-ipc-950'`. 4 lines changed (insert + delete pair × 2 tokens).
- `src/components/onboarding/OnboardingFlow.tsx` — 6 token swaps across the 3 step components on lines 107/108, 149/150, 211/212 (`<h2 className=...>` → `<h1 className=...>`, `</h2>` → `</h1>`). Every Tailwind class preserved verbatim: `text-2xl md:text-3xl font-bold text-ipc-950 mb-{2,2,1.5} text-balance`. 12 lines changed.

## Decisions Made

- **Trust Task 3's gate over Task 2's stale bookkeeping count.** The plan was authored with Task 2's `= "21"` aggregate-h1 expectation and `= "1"` OnboardingFlow expectation. When plan-check inserted Task 3, only Task 3's own gates (`= "3"` h1s in OnboardingFlow) were updated; Task 2's reconciled count of `19 + 1 + 3 = 23` was not. The user's prompt verification gates also say `returns 3` for OnboardingFlow. Source-of-truth reconciliation: 23 source h1s ship, the discrepancy is logged as a Rule-3 deviation, and the substantive a11y invariant (one h1 mounts per rendered page) is preserved.
- **No aria attribute additions.** Each promoted h1 already has its accessible name via translated text content (`tc('day', { number })`, `t('ageTitle')`, etc.). Adding `aria-label` would create a dual source of truth and risk screen-reader announcement drift between locales. Single source of truth = translated text.
- **No visual-class changes.** Per the plan's `must_haves.truths` line "the visible visual hierarchy is unchanged" — Tailwind classes preserved verbatim including font sizes (text-xl / text-2xl md:text-3xl), boldness, balance, mb spacing, and the night-mode conditional color tokens on TimelineView.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking inconsistency in plan text] Reconciled Task 2 aggregate h1 count from "21" to "23"**

- **Found during:** Task 2 (Aggregate audit, after Task 1 + Task 3 applied)
- **Issue:** Task 2's `<verify>` block asserts `test "$count" = "21"` for total h1 openings in `src/app + src/components`, AND `test "$(grep -c '<h1 className=' src/components/onboarding/OnboardingFlow.tsx)" = "1"`. Task 3's own `<verify>` block asserts `test "$(grep -c '<h1\b' src/components/onboarding/OnboardingFlow.tsx)" = "3"`. These two gates cannot both pass — Task 3 is the more recent and explicit one (added by plan-check after the original h1 audit) and matches the user's prompt verification gates ("`grep -c \"<h1 className=\" src/components/onboarding/OnboardingFlow.tsx` returns 3"). The plan's `<verification>` block at line 279 ALSO says `= "18"` (even more stale, pre-plan-check). Real post-edit count: `19 + 1 + 3 = 23`.
- **Fix:** Trusted Task 3's gate (3 h1s in OnboardingFlow, one per mutually-exclusive step component) and the user's prompt verification gates. Actual aggregate count is 23. Runtime invariant "exactly one h1 mounts per rendered page" still holds (LandingContent branches mutex, summary branches mutex, learn-topic branches mutex, OnboardingFlow steps mutex). Documented here for traceability so plan-checker can update its baseline for Phase 11-02 / 11-03 / 11-04.
- **Files modified:** None (this is a bookkeeping reconciliation in SUMMARY only; no source files affected by the deviation itself — the source edits were exactly what Task 1 + Task 3 specified).
- **Verification:** `grep -rn '<h1\b' src/app src/components | wc -l` returns 23; per-file counts match Task 3's gate (`grep -c '<h1 className=' src/components/onboarding/OnboardingFlow.tsx` = 3, `grep -c '<h1 className=' src/components/diary/TimelineView.tsx` = 1). Day1Celebration.tsx aria-labelledby anchor intact.
- **Committed in:** Reconciliation documented in SUMMARY; no separate commit needed.

---

**Total deviations:** 1 auto-fixed (1 Rule-3 plan-text inconsistency)
**Impact on plan:** Zero scope creep. The source code changes match Task 1 + Task 3 exactly. The deviation is a stale-count bookkeeping issue in Task 2's `<verify>` text that the plan-check editor missed when adding Task 3 — the substantive intent (one h1 mounts per rendered page) is fully preserved.

## Issues Encountered

- **Pre-existing ESLint errors in TimelineView.tsx (out-of-scope):** 6 `react-hooks/preserve-manual-memoization` errors on `useCallback` blocks at lines 164/172/180/187/194/201 + 1 `useRef defined but never used` warning at line 3. Confirmed pre-existing via `git stash push -- src/components/diary/TimelineView.tsx && npx eslint src/components/diary/TimelineView.tsx` — identical error set on the unmodified HEAD file. STATE.md explicitly notes "Three pre-existing React-19 lint warnings logged to deferred-items.md as out-of-scope (not blocking)." Per executor scope-boundary rule, NOT auto-fixed. OnboardingFlow.tsx ESLint is fully clean.
- **No other issues.** Vitest 530 pass + 1 skip matches Phase 10 baseline exactly. tsc strict clean. The audit invariants (Day1Celebration aria-labelledby intact, day-header night-mode color tokens preserved on the same line) all held.

## User Setup Required

None — semantic-only HTML tag swap. No env vars, no dashboard config, no external services.

## Next Phase Readiness

- **A11Y-01 closed at the source level on diary + onboarding surfaces.** End-to-end axe-core `page-has-heading-one` proof is supplied by Plan 11-04 (verification spec, Wave 2) — that spec deep-links to `/<locale>/diary/day/{1,2,3}` and `/<locale>` (onboarding state) in every locale and asserts exactly one h1.
- **Plan-checker baseline correction for Phase 11-02/11-03/11-04:** the h1 audit baseline is now 23 (not the plan's stale 21). If any downstream plan checks aggregate h1 count, update its expected value to 23.
- **Mutex h1 source pattern documented** in this SUMMARY's `patterns-established` for future plan-checkers: source-tree h1 count > 1 is correct when conditional render branches each carry their own h1 but only one mounts at a time.

## Self-Check: PASSED

- File created: `.planning/phases/11-wcag-aa-baseline/11-01-SUMMARY.md` — FOUND (this file)
- Source edits: `src/components/diary/TimelineView.tsx:506` h1 — FOUND (grep verified)
- Source edits: `src/components/onboarding/OnboardingFlow.tsx:107/149/211` h1 — FOUND (grep verified, 3 occurrences)
- Commit: `1858399` — FOUND (`git log --oneline -3` confirmed)
- vitest 530/531 — FOUND (matches Phase 10 baseline)
- Day1Celebration aria-labelledby — FOUND (grep verified)

---
*Phase: 11-wcag-aa-baseline*
*Plan: 01*
*Completed: 2026-05-19*
