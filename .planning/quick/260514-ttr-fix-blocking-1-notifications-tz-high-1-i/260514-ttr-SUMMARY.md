---
phase: 260514-ttr
plan: "01"
type: quick
status: complete
completed: 2026-05-14
duration: "~25 minutes (worktree-executor stalled mid-Task-1; orchestrator harvested and finished inline)"
tags: [bugfix, review-followup, notifications, timezone, indexeddb, dst]
source: ".planning/phases/04-storage-backend-hardening/04-REVIEW.md"
commits:
  - hash: b0a7e4c
    message: "fix(stab-02): notifications getNextOccurrence rolls correctly for west-of-UTC timezones"
  - hash: ca1dae6
    message: "fix(stab-09): IDB adapter falls back to localStorage when IDB throws on getItem"
  - hash: 52c1c39
    message: "fix(stab-02): scheduleDiaryCompleteReminder uses calendar-date arithmetic across DST"
  - hash: 091f802
    message: "docs(stab-09): IDB adapter JSDoc example matches actual call shape"
  - hash: 6c171eb
    message: "fix(stab-02): tighten setTimeoutSpy typing in notifications.test"
key-files:
  modified:
    - src/lib/notifications.ts
    - src/lib/storage/indexedDbAdapter.ts
    - src/__tests__/storage-adapter.failure.test.ts
  created:
    - src/__tests__/notifications.test.ts
test-results:
  total: 413
  passing: 413
  added-tests: 24
  tsc-clean: true
deviations:
  - "Worktree executor stalled mid-Task-1 (writing test file). Orchestrator force-cleaned the worktree, harvested the partial work (notifications.ts code change + test file), and finished all 4 tasks inline on main with atomic commits. Result is equivalent to the worktree-isolated path."
  - "Initial Suite 4 test expectation in the DST safety case (248_400_000 ms) was wrong — the correct expected delay is 244_800_000 ms (9 AM EDT on day 4, which is what calendar-date arithmetic produces post-DST). Old buggy code would have given 248_400_000 ms = 10 AM EDT = the bug we're fixing. Fixed the assertion."
  - "Added a small 5th commit (6c171eb) to tighten setTimeoutSpy typing — caught by tsc --noEmit gate. Not in the original plan, but required for type-clean state."
---

# Quick Task 260514-ttr: Fix BLOCKING-1, HIGH-1, MEDIUM-1, LOW-1 from 04-REVIEW.md

Follow-up to the 04-REVIEW.md inline code review (which was itself done inline because the gsd-code-reviewer subagent spawn 529'd twice). Fixed all four findings from the review with atomic commits.

## Tasks Completed

| # | Finding | Files | Commit |
|---|---------|-------|--------|
| 1 | BLOCKING-1: notifications tomorrow-rollover for west-of-UTC zones | `src/lib/notifications.ts`, new `src/__tests__/notifications.test.ts` | b0a7e4c |
| 2 | HIGH-1: IDB-throws fallback to localStorage | `src/lib/storage/indexedDbAdapter.ts`, `src/__tests__/storage-adapter.failure.test.ts` | ca1dae6 |
| 3 | MEDIUM-1: scheduleDiaryCompleteReminder DST safety | `src/lib/notifications.ts`, `src/__tests__/notifications.test.ts` (Suite 4) | 52c1c39 |
| 4 | LOW-1: JSDoc call-shape drift | `src/lib/storage/indexedDbAdapter.ts:23` | 091f802 |
| 4b | TS typing fix for Task 3's test | `src/__tests__/notifications.test.ts` | 6c171eb |

## What Was Fixed

### BLOCKING-1 (b0a7e4c) — `getNextOccurrence` for west-of-UTC zones

The old "roll to tomorrow" branch parsed `todayInTz + 'T00:00:00.000Z'` as UTC, added 24h, then asked `getDateInTz` for the resulting calendar date in the user's tz. For tzs west of UTC (Americas, Pacific), that UTC instant maps back to the same calendar day in the user's tz, so the next-day computation silently failed → negative `setTimeout` delay → recursive `scheduleNext` → CPU thrash.

Replaced with `getDateInTz(new Date(Date.now() + 86_400_000).toISOString(), timeZone)` — "now + 24h" advances the wall clock unambiguously across all tzs.

Also exported `getNextOccurrence` so it's testable. New test file with 22 cases:
- Suite 1: parametrized matrix (6 tzs × 3 reminder hours) asserting `delay > 0 && delay <= 86_400_000`
- Suite 2: BLOCKING-1 regression for `America/New_York` AND `Pacific/Honolulu`
- Suite 3: just-before / just-after transitions at 1-minute granularity

### HIGH-1 (ca1dae6) — IDB adapter falls back to localStorage when IDB throws

Old code: `try { idbGet(...) } catch { console.warn; return null; }` — bailed out before checking localStorage. Existing v2 patients on browsers where IDB is unavailable (Firefox private mode, Safari ITP corner cases, corrupted DB) would lose access to their in-progress diary on the v3 deploy.

Fix: track `idbAvailable` flag. On IDB get throw, set false and fall through to localStorage. When LS has a value AND IDB is available, do the normal migration. When LS has a value but IDB is dead, return the LS value WITHOUT attempting migration (the write would fail; preserve LS for next-load retry).

New Test 9 in `storage-adapter.failure.test.ts` mocks `idbGet` to throw, pre-populates LS, asserts the adapter returns the LS value, asserts `idbSet` was never called.

### MEDIUM-1 (52c1c39) — `scheduleDiaryCompleteReminder` DST safety

Old: `new Date(startIso).getTime() + 3 * 86_400_000`. Drifts 1 hour when DST spring-forward / fall-back falls inside the 3-day window.

Fix: `format(addDays(parseISO(startDate + 'T12:00:00'), 3), 'yyyy-MM-dd')` + `buildIsoForClockTimeInTz(..., 9, 0, timeZone)`. Calendar-date arithmetic respects DST transitions.

Suite 4 in notifications.test.ts pins "now" to Friday before US spring-forward 2026 and asserts delay = 244_800_000 ms (9 AM EDT day 4). Old buggy code would produce 248_400_000 ms (10 AM EDT day 4 = 1 hour late).

### LOW-1 (091f802) — JSDoc call-shape drift

`createJSONStorage(createIndexedDbStorage)` → `createJSONStorage(() => createIndexedDbStorage())` in the IDB adapter's usage comment, to match the actual call shape in `store.ts`.

### Bonus (6c171eb) — TS typing for setTimeoutSpy

The ReturnType<typeof vi.spyOn> typing didn't satisfy strict mode. Switched to a minimal interface-typed handle with an explicit cast at assignment.

## Verification

- `npx vitest run` → 413/413 tests pass (was 389 baseline + 24 new tests = 413)
- `npx tsc --noEmit` → 0 errors
- No regressions in existing tests
- Pre-commit hook (i18n completeness) passes — the WIP article `feeling-bladder-is-not-empty.mdx` was translated to all 5 locales earlier in the session

## Safe to push to origin/main

Yes. All 4 review findings are addressed, all tests pass, no TypeScript errors. The session is ready for `git push origin main` → Vercel auto-deploy.
