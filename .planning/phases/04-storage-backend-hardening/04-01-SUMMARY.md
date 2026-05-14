---
phase: 04-storage-backend-hardening
plan: "01"
subsystem: storage
tags: [indexeddb, zustand, idb-keyval, migration, graceful-degrade]
dependency_graph:
  requires: []
  provides: [indexeddb-adapter, localStorage-migration]
  affects: [src/lib/store.ts]
tech_stack:
  added: [idb-keyval@6.2.2, fake-indexeddb@6.2.5]
  patterns: [zustand-async-storage, duck-typed-state-storage, migration-on-first-read]
key_files:
  created:
    - src/lib/storage/indexedDbAdapter.ts
    - src/__tests__/storage-adapter.test.ts
    - src/__tests__/storage-adapter.failure.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Split tests into two files: storage-adapter.test.ts (happy path, real fake-indexeddb) and storage-adapter.failure.test.ts (mocked idb-keyval failures). This avoids vi.mock hoisting conflicts with the fake-indexeddb polyfill."
  - "StateStorageLike is a locally declared interface (not imported from zustand/middleware) so indexedDbAdapter.ts stays framework-agnostic — Zustand checks the shape duck-style."
  - "Adapter renames idb-keyval imports to idbGet/idbSet/idbDel at the import site to avoid collision with local variable names."
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-14"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 4 Plan 1: IndexedDB Adapter — Summary

Standalone Zustand async `StateStorage` adapter wrapping `idb-keyval` with v2-localStorage-to-IDB migration and silent graceful degrade.

## What Was Built

### Task 1 — Dependencies (commit b7f6071)

Added to `package.json`:
- `dependencies.idb-keyval: "^6.2.2"` — ships to the browser, drives the adapter
- `devDependencies.fake-indexeddb: "^6.2.5"` — polyfills IDB in jsdom for unit tests

Both are top-level direct dependencies (`npm ls --depth=0` confirms). `idb-keyval` was already present as a transitive dep of `unstorage`; this promotes it to a first-class direct dep with a pinned caret range.

### Task 2 — Adapter + Tests (commit 0437a16)

**`src/lib/storage/indexedDbAdapter.ts`** (98 lines) — exports `createIndexedDbStorage()` returning a `StateStorageLike` object with three async methods:

`getItem` migration path (5-line sketch for Plan 02 reference):
```typescript
const idbValue = await idbGet<string>(name);
if (idbValue !== undefined) return idbValue;         // IDB hit — normal path
const lsValue = localStorage.getItem(name);          // IDB miss — check legacy
if (lsValue === null) return null;                   // Both empty — fresh start
await idbSet(name, lsValue);                         // Migrate: copy to IDB
localStorage.removeItem(name);                       // Only clears on success
return lsValue;
```

All three methods wrap their IDB calls in `try/catch`, log once with `console.warn`, and resolve instead of rejecting. The persist middleware never sees a thrown error.

**`src/__tests__/storage-adapter.test.ts`** (5 happy-path tests using real `fake-indexeddb`):
- Test 1: both stores empty → `null`
- Test 2: `setItem` + `getItem` round-trip stays in IDB (not localStorage)
- Test 3: v2 localStorage value migrated to IDB, localStorage cleared after
- Test 4: no migration when IDB already has a value (localStorage untouched)
- Test 5: `removeItem` clears IDB so subsequent `getItem` returns `null`

**`src/__tests__/storage-adapter.failure.test.ts`** (3 failure-path tests, mocked `idb-keyval`):
- Test 6: `get` throws → `getItem` resolves `null`, `console.warn` called once
- Test 7: `set` throws → `setItem` resolves without throwing, `console.warn` called once
- Test 8: migration atomicity — `set` throws during migration → localStorage NOT cleared, `console.warn` called once

## Test Results

```
Test Files  19 passed (19)
     Tests  387 passed (387)
```

New adapter tests: 8 passed, 8 total (split across two files).
No regressions in existing test files.
`npx tsc --noEmit` — 0 errors.

## Deviations from Plan

None — plan executed exactly as written.

The plan suggested either one consolidated file (with careful `vi.unmock` / `vi.resetModules`) or two separate files. The two-file split was chosen as the cleaner approach, matching the plan's recommendation. All 8 test cases from the plan's `<behavior>` block are covered.

## Threat Flags

None. This plan introduces no new network endpoints, auth paths, file access patterns, or schema changes. The adapter is a client-side storage layer operating within the existing same-origin sandbox — same threat model as the existing localStorage backend.

## Known Stubs

None. The adapter is fully functional; it is not yet wired into the Zustand store. Plan 02 performs the one-line swap (`storage: createJSONStorage(createIndexedDbStorage)`) and bumps the store version to 3.

## Self-Check: PASSED

- `src/lib/storage/indexedDbAdapter.ts` — exists, 98 lines
- `src/__tests__/storage-adapter.test.ts` — exists
- `src/__tests__/storage-adapter.failure.test.ts` — exists
- Commit b7f6071 — package.json + package-lock.json
- Commit 0437a16 — adapter + both test files
- All 387 vitest tests pass; 0 TypeScript errors
