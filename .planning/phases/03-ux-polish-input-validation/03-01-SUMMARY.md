---
phase: "03"
plan: "03-01"
subsystem: "diary/milestone-toast"
tags: [stab-06, vitest, regression-guard, sessionStorage, locale-switch]
dependency_graph:
  requires: []
  provides: [STAB-06-closed]
  affects: [src/__tests__/milestone-toast-locale-switch.test.tsx]
tech_stack:
  added: []
  patterns: [NextIntlClientProvider test wrapper, vi.useFakeTimers, sessionStorage inspection]
key_files:
  created:
    - src/__tests__/milestone-toast-locale-switch.test.tsx
  modified: []
decisions:
  - "Reproduction-first: both tests passed against current source — no source change required"
  - "Test 3 skip-marked with TODO(03-01): driving handleSave via LogVoidForm is out of scope for this unit layer"
  - "checkMilestone() key format 'milestone_${key}' is already locale-independent by design"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-17"
  tasks_completed: 2
  tasks_skipped: 1
---

# Phase 3 Plan 01: STAB-06 Milestone Toast Locale Dedup — Summary

**One-liner:** Vitest regression guard confirming sessionStorage-keyed milestone dedup is locale-independent in `DayPageClient.tsx`.

## Reproduction Outcome

**STAB-06 was already correctly closed by the existing implementation.**

Both load-bearing tests passed against the un-patched source on the first run:

- **Test 1** (`milestone_first_event key is locale-independent`): PASSED. Setting the sessionStorage flag before rendering `<DayPageClient />` under EN, then unmounting and re-mounting under FR, leaves the flag unchanged. The key `milestone_${key}` does not embed locale — it is stable across locale switches.
- **Test 2** (`no re-fire on FR after EN milestone`): PASSED. When `sessionStorage.setItem('milestone_first_event', '1')` is set (simulating the post-fire state), mounting under FR with `vi.useFakeTimers()` and advancing 1500ms produces no toast text in the DOM.
- **Test 3** (sanity check): SKIP-marked with `// TODO(03-01)`. Driving the milestone toast via `handleSave()` requires LogVoidForm interaction; kept out of scope for this unit layer.

Root cause analysis: `checkMilestone(key)` at `DayPageClient.tsx:25-32` uses `sessionStorage.getItem('milestone_${key}')` where `key` is always a locale-independent string (`'first_event'`, `'day1_complete'`, etc.). No locale string is embedded in the key. The `handleSave` comparisons at lines 200/207 (`message === t('wakeUpSaved')`, `message === t('bedtimeSaved')`) are locale-coupled in the sense that they compare translated strings, but they gate which milestone KEY to show — they do not affect the dedup key itself. The dedup mechanism is structurally correct.

## Source Change

No source change. `DayPageClient.tsx` was not modified.

## Commit

- **`0651e88`**: `test(03): STAB-06 regression guard — milestone toast survives locale switch`

## Test Count Delta

Baseline: 427 tests passing (pre-Phase-3)
After this plan: **429 passing + 1 skipped = 430 total**
Delta: +2 passing, +1 skipped

## i18n Key Counts

No messages files were modified. All 6 locale files (`messages/{en,fr,es,pt,zh,ar}.json`) are unchanged from pre-plan baseline. Zero new i18n keys added.

## Quality Gates

| Gate | Result |
|------|--------|
| `npx vitest run src/__tests__/milestone-toast-locale-switch.test.tsx` | 2 passed, 1 skipped |
| `npx vitest run` (full suite) | 429 passed, 1 skipped |
| `npx tsc --noEmit` | Clean (no output) |
| `npm run lint` | 0 new errors (pre-existing errors in store.ts, combinedDiary.ts, mdx.tsx, utils.ts unchanged) |

## Deviations from Plan

None. Plan executed exactly as written. The "regression-guard-only" branch of the branching contract was followed: tests passed against current source, Task 3 (source fix) was correctly skipped.

Test 3 was skip-marked as explicitly permitted by the plan: "SKIP-marked (`it.skip('...')` with a comment explaining why) if the executor determines the test infrastructure cannot drive `handleSave` without either (a) extracting `checkMilestone` to a module-level export, or (b) rendering and interacting with the full `<LogVoidForm/>`."

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. Test-only change.

## Self-Check

- [x] `src/__tests__/milestone-toast-locale-switch.test.tsx` exists
- [x] Commit `0651e88` exists in `worktree-agent-a021bffff0c4df284` branch
- [x] No unexpected file deletions in commit
- [x] No i18n files modified
- [x] `DayPageClient.tsx` not touched

## Self-Check: PASSED
