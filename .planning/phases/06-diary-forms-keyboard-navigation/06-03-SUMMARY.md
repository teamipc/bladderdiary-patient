---
phase: 06-diary-forms-keyboard-navigation
plan: 03
subsystem: ui
tags: [tailwind, focus-visible, accessibility, keyboard-navigation, button-primitive]

# Dependency graph
requires:
  - phase: 05-layout-foundation-appshell-chrome
    provides: "Phase 5 NavLink focus-visible:ring-ipc-500 token spec (canonical chrome focus ring); CONTEXT.md Q5 deferral marker for Button.tsx migration to Phase 6"
provides:
  - "Button.tsx primitive emits focus rings only on keyboard focus (focus-visible), not on touch/click — Boomer-safe UX improvement"
  - "Base ring color aligned to ipc-500 (matches Phase 5 NavLink chrome contract); variant-specific tints preserved unchanged"
  - "Keyboard-only focus contract is in place BEFORE Waves 3-5 of Phase 6 wire form-level focus-trap and Enter-advance handlers"
affects: [06-04, 06-05, 06-06, 06-07, 06-08, 06-09, 06-10, 06-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "focus-visible: token migration pattern (mirrors Phase 5 NavLink): focus:outline-none focus:ring-2 focus:ring-<color> focus:ring-offset-2 → focus-visible: equivalents"

key-files:
  created: []
  modified:
    - src/components/ui/Button.tsx

key-decisions:
  - "Migrated all 6 focus:* tokens to focus-visible:* — touch users no longer see lingering focus rings after taps (UX improvement; matches the spec lock in 06-UI-SPEC §Mobile Invariants)"
  - "Bumped base ring color from ipc-400 to ipc-500 for chrome-spec consistency with Phase 5 NavLink (Header.tsx already uses ipc-500); variant-specific ring tints (drink/40, bedtime/40, leak/40, indigo-400, hero ipc-500) preserved unchanged"
  - "Did NOT add focus-visible:ring-offset-<color> to variants — base ring-offset-2 alone is correct on white modal content; per UI-SPEC ring-offset-white is reserved for picker tiles inside modals (Plan 06-09 scope)"

patterns-established:
  - "Pure token substitution discipline: no structural changes to Button.tsx — same 52 lines, same forwardRef + displayName + props interface, only Tailwind class-string token names mutate"
  - "Plan-locked variant-tint preservation: only the focus: prefix migrates; variant-specific tint colors (drink/40, bedtime/40, leak/40, indigo-400, hero ipc-500) are intentional themed-ring choices and stay byte-identical"

requirements-completed: [DTUX-03]

# Metrics
duration: 6m 30s
completed: 2026-05-16
---

# Phase 6 Plan 3: Button.tsx focus-visible Migration Summary

**Button primitive emits focus rings only on keyboard focus (not touch), with base ring color bumped from ipc-400 to ipc-500 for Phase 5 NavLink chrome-spec consistency**

## Performance

- **Duration:** 6m 30s
- **Started:** 2026-05-16T19:29:19Z
- **Completed:** 2026-05-16T19:35:49Z
- **Tasks:** 1/1
- **Files modified:** 1

## Accomplishments
- Migrated all 6 `focus:*` ring tokens in `src/components/ui/Button.tsx` to `focus-visible:*` (base ring + 5 variant overrides: drink, bedtime, leak, night, hero)
- Bumped base ring color from `focus:ring-ipc-400` → `focus-visible:ring-ipc-500` to match the Phase 5 NavLink chrome focus contract already in use at `src/components/layout/Header.tsx:106,116,169`
- Preserved variant-specific ring tints (`drink/40`, `bedtime/40`, `leak/40`, `indigo-400`, `hero ipc-500`) — themed-ring choices are intentional per UI-SPEC and stay byte-identical
- Preserved Button's hit-target tokens (`min-h-[44px]` md, `min-h-[52px]` lg) — Boomer-safe override 1 (WCAG 2.5.5 minimum) is intact
- Preserved file structure: still 52 lines, same `forwardRef`, same `Button.displayName`, same props interface, same variant strings + sizes objects
- Mobile users no longer see a lingering focus ring after tapping a Button (UX improvement aligned with 06-UI-SPEC §"Mobile Invariants" lock)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate Button.tsx focus → focus-visible and update ring color from ipc-400 → ipc-500** — `0984ff4` (feat)

**Plan metadata:** to be added after SUMMARY.md commit

## Files Created/Modified
- `src/components/ui/Button.tsx` — 6 token substitutions: 4 in base ring (`focus:outline-none focus:ring-2 focus:ring-ipc-400 focus:ring-offset-2` → `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2`); 1 each in drink/bedtime/leak/night/hero variant strings (`focus:ring-<color>` → `focus-visible:ring-<color>`)

## Decisions Made
- **Base ring color bump (ipc-400 → ipc-500):** This was a planner-locked decision in 06-UI-SPEC §"Button.tsx focus-visible migration" — Phase 5 NavLink already uses `focus-visible:ring-ipc-500` for chrome (visible in `src/components/layout/Header.tsx:106,116,169`); aligning Button.tsx to the same color produces a unified focus-ring identity across the entire app.
- **No focus-visible ring-offset-color added to variants:** UI-SPEC explicitly reserves `ring-offset-white` for picker tiles inside modals (Plan 06-09 scope); Button primitive's `focus-visible:ring-offset-2` is enough because variant buttons render on white modal content and the implicit surface fallback is correct.
- **Variant-specific tint preservation:** Only the `focus:` prefix migrated; ring color suffixes (`drink/40`, `bedtime/40`, `leak/40`, `indigo-400`, `ipc-500`) stay byte-identical — themed-ring tints harmonize each button's focus state with its background without breaking AA contrast.

## Deviations from Plan

None - plan executed exactly as written.

The plan specified a 6-token pure-substitution edit; the executor performed exactly 6 substitutions with no auto-fixes, no missing-critical additions, and no blocking issues. Build succeeded after a brief lock-conflict wait (parallel Wave 1 executor — Plan 06-01 or 06-02 — was running `next build` concurrently; not a deviation, just resource serialization).

## Issues Encountered
- **Build lock conflict (transient, resolved by waiting):** A parallel Wave 1 executor held `/Users/zhen/bladderdiary-patient/.next/lock` when this plan's initial `npm run build` ran. Waited for lock release with `until [ ! -f .next/lock ]; do sleep 3; done`, then retried — build succeeded on second attempt with no code changes. Expected behavior in Wave 1 parallel execution; not a plan deviation.
- **Parallel-executor edits to globals.css (out of scope, left untouched):** `git status` showed `src/app/globals.css` as modified by a sibling Wave 1 executor (Plan 06-01 or 06-02 working on the global focus-visible rule scope). Per Plan 06-03's `<files>` allowlist (Button.tsx only), this executor staged only `src/components/ui/Button.tsx` and left `globals.css` for the sibling plan to commit independently. No interference with this plan's contract.

## Verification

All source-level grep assertions match the spec's expected counts exactly:

| Assertion | Expected | Actual | Pass |
| --- | --- | --- | --- |
| `focus:ring-` (residue) | 0 | 0 | yes |
| `focus:outline-none` (residue) | 0 | 0 | yes |
| `focus:ring-offset` (residue) | 0 | 0 | yes |
| `focus-visible:ring-` | 6 | 6 | yes |
| `focus-visible:outline-none` | 1 | 1 | yes |
| `focus-visible:ring-offset-2` | 1 | 1 | yes |
| `focus-visible:ring-ipc-500` (base + hero) | ≥ 2 | 2 | yes |
| `focus[-]visible:ring-ipc-400 \| focus:ring-ipc-400` (stale ipc-400) | empty | empty | yes |
| `focus-visible:ring-drink/40` | 1 | 1 | yes |
| `focus-visible:ring-bedtime/40` | 1 | 1 | yes |
| `focus-visible:ring-leak/40` | 1 | 1 | yes |
| `focus-visible:ring-indigo-400` | 1 | 1 | yes |
| `min-h-[44px]` (md hit-target) | 1 | 1 | yes |
| `min-h-[52px]` (lg hit-target) | 1 | 1 | yes |
| File line count | 52 | 52 | yes |

Build / test gates:

- `npx tsc --noEmit` — exit 0 (clean)
- `npx eslint src/components/ui/Button.tsx` — exit 0 (clean)
- `npx vitest run --silent` — 21 test files / 427 tests passed, 0 failed (regression-free across all consumers)
- `npm run build` — succeeded; Tailwind compiled `focus-visible:` tokens on all 6 locales' static export

## User Setup Required

None — no external service configuration required. Pure CSS-class token migration; no env vars, no dashboards, no migrations.

## Next Phase Readiness
- **Wave 1 contract:** Plan 06-03 is independent of Plans 06-01 + 06-02; this plan's completion does not require their completion to be valid. Other Wave 1 plans may still be in flight.
- **Downstream waves:** Waves 3–5 of Phase 6 (form-level focus-trap, Enter-advance handlers, picker tiles) can now assume Button emits focus rings only on keyboard focus. Picker tiles in Plan 06-09 still need to add their own `focus-visible:ring-offset-white` per UI-SPEC; that is Plan 06-09's scope, not this plan's.
- **Phase 5 Q5 carry-over closed:** The Phase 5 CONTEXT.md §"Claude's Discretion" Q5 deferral marker for Button.tsx focus-visible migration is now resolved.
- **No blockers.**

## Self-Check: PASSED

- File present: `src/components/ui/Button.tsx`
- File present: `.planning/phases/06-diary-forms-keyboard-navigation/06-03-SUMMARY.md`
- Commit present: `0984ff4` (Task 1 — feat(06-03): migrate Button.tsx focus: to focus-visible:)

---
*Phase: 06-diary-forms-keyboard-navigation*
*Completed: 2026-05-16*
