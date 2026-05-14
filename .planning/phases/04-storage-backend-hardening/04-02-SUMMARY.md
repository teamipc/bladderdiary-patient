---
phase: 04-storage-backend-hardening
plan: "02"
subsystem: storage
tags: [indexeddb, zustand, persist, migration, version-bump]
dependency_graph:
  requires: [indexeddb-adapter]
  provides: [zustand-indexeddb-backend, v3-migration-marker]
  affects: [src/lib/store.ts, src/__tests__/store.test.ts]
tech_stack:
  added: []
  patterns: [createJSONStorage-async-storage, zustand-persist-v3, migration-branch-marker]
key_files:
  created: []
  modified:
    - src/lib/store.ts
    - src/__tests__/store.test.ts
decisions:
  - "Explicit idbDel(STORE_KEY) in Test B setup — importing store.ts causes the Zustand persist middleware to pre-populate IDB as a module-init side effect; the test must clear this before exercising the migration path."
  - "npm install run in worktree — Plan 01 added idb-keyval to package.json but the worktree node_modules was not populated; resolved by running npm install, which also fixed the 4 pre-existing TypeScript errors for idb-keyval type declarations."
metrics:
  duration: "5 minutes"
  completed_date: "2026-05-14"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 4 Plan 2: Wire IndexedDB Backend — Summary

Zustand persist config swapped from localStorage to IndexedDB via `createJSONStorage(() => createIndexedDbStorage())`, store version bumped 2 to 3, v3 migration branch added as a marker, and integration tests for the backend migration land in store.test.ts.

## What Was Built

### Task 1 — Wire adapter into persist config + bump version (commit 0d84770)

**`src/lib/store.ts`** — 4 surgical edits, all other lines byte-identical:

1. Import addition (line 11):
   ```diff
   -import { persist } from 'zustand/middleware';
   +import { persist, createJSONStorage } from 'zustand/middleware';
   ```

2. New import after utils (line 14):
   ```diff
   +import { createIndexedDbStorage } from './storage/indexedDbAdapter';
   ```

3. v3 migration branch in `migrateBladderDiaryState` (between the `version < 2` block and the `ARRAY_FIELDS` loop):
   ```typescript
   if (version < 3) {
     // v2 → v3: backend swap from localStorage to IndexedDB. No state-shape change.
     // The adapter handles the storage-layer migration transparently (see
     // src/lib/storage/indexedDbAdapter.ts). This branch exists as a marker so a
     // future v4 migration knows where the IDB transition landed.
   }
   ```

4. Persist config update (lines 359-363):
   ```diff
   -{
   -  name: 'bladder-diary-patient',
   -  version: 2,
   -  migrate: migrateBladderDiaryState,
   -}
   +{
   +  name: 'bladder-diary-patient',
   +  version: 3,
   +  migrate: migrateBladderDiaryState,
   +  storage: createJSONStorage(() => createIndexedDbStorage()),
   +}
   ```

### Task 2 — v2→v3 migration integration tests (commit 317e470)

**`src/__tests__/store.test.ts`** — 72-line addition:

- Added `import 'fake-indexeddb/auto';` at line 1 (idempotent IDB polyfill)
- Updated vitest import to include `afterEach` (alphabetized)
- New `describe('migrateBladderDiaryState — v2 → v3 backend swap', ...)` block at end of file:
  - **Test A** (`v2 snapshot: preserves all fields`): calls `migrateBladderDiaryState(v2, 2)` directly; asserts all 6 fields pass through unchanged — the v3 branch is a true no-op for state shape.
  - **Test B** (`v2 localStorage blob is migrated to IndexedDB on first adapter read; localStorage is cleared`): seeds localStorage with a v2 blob, explicitly clears IDB (needed because the persist middleware pre-populates IDB at module import time), drives the adapter's `getItem`, then asserts: (1) the localStorage value is returned, (2) localStorage is cleared, (3) IDB holds the value, (4) a second read returns the IDB value with localStorage still clear.
  - `afterEach` cleanup: calls `idbDel(STORE_KEY)` and `localStorage.removeItem(STORE_KEY)` to isolate tests.

## Test Results

```
Test Files  19 passed (19)
     Tests  389 passed (389)
```

Prior count (Plan 01 baseline): 387 tests.
New tests added by this plan: 2.
Regressions: 0.

`npx tsc --noEmit` — 0 errors. (The 4 pre-existing `idb-keyval` type-declaration errors from Plan 01 were resolved as a side effect of running `npm install` in the worktree — `idb-keyval` ships its own types and they are now present.)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed npm dependencies in worktree**
- **Found during:** Task 1 verification (`npx vitest run src/__tests__/store.test.ts` failed with "Failed to resolve import idb-keyval")
- **Issue:** The worktree's `node_modules/` was populated by the git checkout but `idb-keyval` and `fake-indexeddb` (added to `package.json` in Plan 01) were not installed. Running the test triggered a Vite import resolution failure.
- **Fix:** Ran `npm install` in the worktree root. This installed all dependencies and also resolved the 4 pre-existing TypeScript errors for `idb-keyval` type declarations.
- **Files modified:** `node_modules/` (not committed — runtime only)
- **Impact:** None on committed code; all tests pass.

**2. [Rule 1 - Bug] Added explicit IDB cleanup in Test B setup**
- **Found during:** Task 2 first test run — Test B assertion `expect(await idbGet(STORE_KEY)).toBeUndefined()` failed because the Zustand persist middleware, when the store module is imported, performs an async `setItem` to IDB as a side effect of initialization.
- **Issue:** The plan's Test B assumed IDB was empty at test start. In practice, importing `useDiaryStore` (which appears at the top of `store.test.ts`) causes the persist middleware to write the current store state to IDB during module initialization.
- **Fix:** Added `await idbDelKey(STORE_KEY)` at the start of Test B (before seeding localStorage) to clear any middleware-written value and ensure the migration path is exercised. The comment in the test documents this behavior.
- **Files modified:** `src/__tests__/store.test.ts`
- **Commit:** 317e470 (included in the Task 2 commit)

## Known Stubs

None. The adapter is fully wired. The store now persists to IndexedDB.

## Threat Flags

None. This plan modifies only the storage backend configuration and test coverage. No new network endpoints, auth paths, file access patterns, or schema changes. The threat model is unchanged from Plan 01.

## Post-Merge Manual Verification

Run the 6-locale daily walkthrough and capture screenshots of Safari DevTools > Storage > IndexedDB to confirm the production hydration path:

1. Open the deployed v3 build in Safari 17+. Fill a Day 1 diary entry. Close and reopen — diary should resume from IndexedDB.
2. Migration check: if you have a v2 blob in localStorage (`bladder-diary-patient`), reload after deploying v3. DevTools > Storage > IndexedDB should show `bladder-diary-patient`; DevTools > Storage > Local Storage should NOT show `bladder-diary-patient`.
3. Private-mode check: open in Safari Private Browsing — diary works in-memory; reload loses state (expected, graceful degrade).
4. Daily walkthrough in all 6 locales: `walkthrough_findings.md` should show no new findings.

Phase 4 / STAB-09 status: **Complete pending manual verification**

## Self-Check: PASSED

- `src/lib/store.ts` — version: 3 present; createJSONStorage import present; createIndexedDbStorage import present; storage wiring present; if (version < 3) branch present
- `src/__tests__/store.test.ts` — fake-indexeddb/auto import present; afterEach import present; 2 new describe blocks confirmed; 389 tests pass
- Commit 0d84770 — feat(04-02): wire IndexedDB adapter into Zustand persist, bump version 2→3
- Commit 317e470 — test(04-02): add v2→v3 backend-migration integration tests
- `npx tsc --noEmit` exits 0 (zero errors)
- `npx vitest run` — 389 passed, 0 failed
