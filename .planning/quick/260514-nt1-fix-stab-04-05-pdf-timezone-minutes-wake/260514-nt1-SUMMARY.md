---
phase: 260514-nt1
plan: 01
subsystem: testing
tags: [pdf, timezone, zustand, migration, half-hour-offset]

requires: []
provides:
  - "PDF scatter chart and half-hour slot table are timezone-correct for all offset zones including IST/NPT/IRST/NST"
  - "Store migration defensively initializes all DiaryState array fields to [] for v0/v1 persisted snapshots"
  - "migrateBladderDiaryState exported as named function for unit-test access"
  - "observations.ts null-safe for wakeTimes in any hydration state"
affects: [exportPdf, store, observations]

tech-stack:
  added: []
  patterns:
    - "getMinutesInTz replaces parseISO().getMinutes() for timezone-correct minute extraction in exportPdf"
    - "ARRAY_FIELDS const + for-of loop to defensively initialize multiple array fields in migration"
    - "Export named migrate function alongside store for test access (migrateBladderDiaryState)"

key-files:
  created: []
  modified:
    - src/lib/exportPdf/graphs.ts
    - src/lib/exportPdf/slots.ts
    - src/lib/observations.ts
    - src/lib/store.ts
    - src/__tests__/store.test.ts

key-decisions:
  - "Use getMinutesInTz(iso, timeZone) instead of parseISO(iso).getMinutes() — parseISO returns browser-local Date, getMinutes() reads local minutes, not stored-timezone minutes"
  - "Export migrateBladderDiaryState as named function above initialState so it can be imported by tests without touching the store singleton"
  - "ARRAY_FIELDS covers all five DiaryState array fields in one defensive loop — future version bumps don't need to rediscover this"

patterns-established:
  - "Pattern: null-guard array state fields with ?? [] at call site (matches existing store.ts:313 idiom)"
  - "Pattern: timezone-aware minute extraction uses getMinutesInTz, not Date.prototype.getMinutes()"

requirements-completed:
  - STAB-04
  - STAB-05

duration: 15min
completed: 2026-05-14
---

# Phase 260514-nt1 Plan 01: STAB-04/05 PDF Timezone Minutes + Wake Array Safety Summary

**Timezone-correct PDF minute positioning via getMinutesInTz and defensive v0/v1 migration that seeds all five DiaryState array fields to [] instead of undefined**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-14T17:14:00Z
- **Completed:** 2026-05-14T17:16:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- STAB-04 closed: PDF scatter chart and 30-min slot table now use `getMinutesInTz(iso, timeZone)` for minute extraction — patients in India (UTC+5:30), Nepal (UTC+5:45), Iran (UTC+3:30), and Newfoundland (UTC-3:30) no longer see events shifted to wrong slot/scatter positions
- STAB-05 closed: `migrateBladderDiaryState` exported as named function; ARRAY_FIELDS loop initializes voids/drinks/leaks/bedtimes/wakeTimes to `[]` for any v0 or v1 persisted snapshot; `observations.ts:115` null-guards `wakeTimes` with `?? []`
- Dead `parseISO` imports removed from both exportPdf files (only call sites were the now-replaced `dt.getMinutes()` / `d.getMinutes()` lines)
- Test suite grew from 377 to 379 (2 new migration shape tests: v0 and v1 scenarios)

## Task Commits

1. **Task 1: STAB-04 PDF graphs and slots** - `a573bb9` (fix)
2. **Task 2: STAB-05 wakeTimes null-safe + migrate arrays** - `5220c54` (fix)

## Files Created/Modified
- `src/lib/exportPdf/graphs.ts` - Replaced `parseISO().getMinutes()` with `getMinutesInTz()` for void scatter (line 209) and standalone leak scatter (line 267); removed dead `parseISO` import
- `src/lib/exportPdf/slots.ts` - Replaced `parseISO().getMinutes()` with `getMinutesInTz()` inside `inSlot` predicate (both `>=` and `<=` comparisons); removed dead `parseISO` import
- `src/lib/observations.ts` - Line 115: `state.wakeTimes.find` → `(state.wakeTimes ?? []).find`
- `src/lib/store.ts` - Extracted `migrateBladderDiaryState` as named export above `initialState`; replaced inline `migrate:` body with `migrate: migrateBladderDiaryState`; added ARRAY_FIELDS defensive initialization block
- `src/__tests__/store.test.ts` - Added `migrateBladderDiaryState` to import; added `describe('migrateBladderDiaryState')` block with v0 and v1 snapshot tests

## Decisions Made
- Extracted the migrate function before `initialState` (not after `useDiaryStore`) so TypeScript can resolve `DiaryStore` type which is defined via the `interface DiaryStore extends DiaryState` block earlier in the file
- Kept `parseISO` removal from both importlines: verified all 3 uses in graphs.ts and 2 uses in slots.ts were exclusively for `.getMinutes()` extraction — no remaining call sites post-replacement

## Deviations from Plan

None — plan executed exactly as written. TDD order for Task 2: RED (2 tests failed with "not a function"), then GREEN (all 48 store+observations tests passed after implementation).

## Issues Encountered

None. All changes applied cleanly, no TypeScript errors, no test failures after implementation.

## Known Stubs

None.

## Threat Flags

None — changes are internal computation fixes and migration hardening, no new network endpoints, auth paths, or trust boundaries introduced.

## Test Results

Full suite: 379 tests passed across 17 test files. Zero failures, zero regressions.

```
Test Files  17 passed (17)
Tests       379 passed (379)
```

## Self-Check: PASSED

- `src/lib/exportPdf/graphs.ts` — exists, `parseISO` absent, `getMinutesInTz` present (2 call sites)
- `src/lib/exportPdf/slots.ts` — exists, `parseISO` absent, `getMinutesInTz` present (2 call sites in inSlot)
- `src/lib/observations.ts` — `(state.wakeTimes ?? []).find` at line 115
- `src/lib/store.ts` — `export const migrateBladderDiaryState` at line 121, `migrate: migrateBladderDiaryState` at line 354
- `src/__tests__/store.test.ts` — `migrateBladderDiaryState` imported, describe block present
- Commit `a573bb9` (stab-04) — verified in git log
- Commit `5220c54` (stab-05) — verified in git log

## Next Phase Readiness

Both STAB-04 and STAB-05 closed. No follow-up work required. The `migrateBladderDiaryState` export pattern is now established for future store version bumps — the ARRAY_FIELDS block acts as a standing guard for any new array field added to DiaryState in future migrations.

---
*Phase: 260514-nt1*
*Completed: 2026-05-14*
