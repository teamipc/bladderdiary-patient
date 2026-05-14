---
phase: 04-storage-backend-hardening
verified: 2026-05-14T17:51:00Z
status: human_needed
score: 3/4 automated; 2/4 require post-merge manual verification
overrides_applied: 0
human_verification:
  - test: "Safari ITP 7-day idle survivability"
    expected: "Patient who completes Day 1, idles 7+ days on iOS Safari 17+, returns and resumes Day 2 with all events intact"
    why_human: "Cannot simulate 7-day Safari ITP eviction in automated tests; requires real device with real idle gap post-merge"
  - test: "Production walkthrough post-merge (SC4)"
    expected: "6-locale daily walkthrough continues to pass with no new findings in walkthrough_findings.md after Phase 4 code is deployed to production"
    why_human: "Walkthrough runs against production URL; last automated run (2026-05-13) predates Phase 4 deployment; code has not yet been pushed/deployed"
---

# Phase 4: Storage Backend Hardening — Verification Report

**Phase Goal:** Swap the Zustand `persist` backend from `localStorage` to IndexedDB (via `idb-keyval`) without changing the privacy model. One-time `localStorage` to IndexedDB migration. Bump store version 2 to 3.

**Verified:** 2026-05-14T17:51:00Z
**Status:** HUMAN NEEDED (2 must-haves require post-merge manual verification; all automated checks pass)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Safari ITP 7-day idle survivability: patient resumes Day 2 intact after 7+ day idle on iOS Safari 17+ | HUMAN NEEDED | Architecture is correct (IDB replaces localStorage). Cannot verify without real device + real 7-day idle. Assigned to post-merge walkthrough per ROADMAP SC1 and PLAN 02 verification block. |
| 2 | v2 localStorage migration: patient opens once, diary loads from IDB after migration, localStorage key cleared | VERIFIED (automated) | Test B in `store.test.ts` (`describe('migrateBladderDiaryState — v2 → v3 backend swap'`) drives the adapter migration end-to-end and asserts: (a) localStorage value returned, (b) localStorage cleared, (c) IDB holds the value, (d) second read from IDB, localStorage still clear. Test passes. |
| 3 | `store.test.ts` covers v2 to v3 backend migration; full vitest suite passes | VERIFIED | `describe('migrateBladderDiaryState — v2 → v3 backend swap')` present (2 tests). Full suite: 389 tests, 19 test files, all passed. `npx tsc --noEmit` exits 0. |
| 4 | 6-locale daily production walkthrough passes with no new findings | HUMAN NEEDED | Last walkthrough (2026-05-13) ran before Phase 4 deployment; pre-existing open issues in `walkthrough_findings.md` are all dated 2026-05-09 and unrelated to storage. A post-merge walkthrough is required to confirm SC4. |

**Automated score:** 2/4 truths fully verified. 2/4 require post-merge human verification (by design — ROADMAP and PLAN 02 explicitly assign SC1 and SC4 to manual post-merge steps).

---

## Must-Have Coverage

### SC1 — Safari ITP 7-day idle survivability

**Status: HUMAN NEEDED**

The architectural change is verifiably correct: `localStorage` (Safari ITP eviction target) has been replaced with IndexedDB (`createJSONStorage(() => createIndexedDbStorage())`). The adapter is wired into the Zustand persist config at `src/lib/store.ts:362`. The PLAN and ROADMAP both explicitly assign this criterion to a post-merge device test. No automated test can simulate 7-day Safari ITP eviction.

Evidence that the *prerequisite code* is in place:
- `storage: createJSONStorage(() => createIndexedDbStorage())` present in persist config
- idb-keyval 6.2.2 is a direct runtime dependency
- `useStoreHydrated()` hook is unchanged and handles async hydration via `persist.onHydrate` + `persist.onFinishHydration` (lines 397-415 of store.ts)

### SC2 — v2 localStorage migration verified

**Status: VERIFIED**

Test B (`v2 localStorage blob is migrated to IndexedDB on first adapter read; localStorage is cleared`) in `src/__tests__/store.test.ts` (lines 444-477) verifies this end-to-end through the actual adapter code:

1. Seeds `localStorage` with a v2 JSON blob
2. Explicitly clears IDB (to simulate a fresh install — the persist middleware pre-populates IDB at module init, so the test clears it to exercise the migration path)
3. Drives `createIndexedDbStorage().getItem(STORE_KEY)`
4. Asserts: localStorage value returned, localStorage cleared, IDB holds the value, second read comes from IDB

The test accounts for the known module-init side effect (documented in SUMMARY 04-02 deviation notes).

### SC3 — store.test.ts covers v2 to v3; vitest passes

**Status: VERIFIED**

Direct evidence:
- `grep -c "describe('migrateBladderDiaryState"` returns 2 (original v0/v1 block + new v2/v3 block)
- Test A: `migrateBladderDiaryState(v2, 2)` is state-shape no-op — all 6 fields pass through unchanged
- Test B: adapter migration end-to-end (see SC2 above)
- Full suite result: `Test Files 19 passed (19), Tests 389 passed (389)`
- TypeScript: `npx tsc --noEmit` exits 0, 0 errors

### SC4 — 6-locale walkthrough continues passing

**Status: HUMAN NEEDED**

Last automated walkthrough (2026-05-13) shows all 6 locales passing, deep flow passing, a11y 0 violations. All open issues in `walkthrough_findings.md` are dated 2026-05-09 and are pre-existing concerns unrelated to storage (a11y contrast, deep-flow regression, 404 console errors). The 2026-05-14 entry is "skipped: site unreachable."

Phase 4 code has not yet been deployed to production. A post-merge walkthrough after deployment is required to confirm no storage-related regressions surfaced in the 6-locale production path.

---

## Locked-Decision Compliance

| Decision | Requirement | Status | Evidence |
|----------|-------------|--------|----------|
| D-01: idb-keyval (not idb/Dexie) | Library must be idb-keyval | VERIFIED | `package.json dependencies["idb-keyval"]: "^6.2.2"`; `npm ls idb-keyval --depth=0` confirms top-level direct dep; adapter imports `from 'idb-keyval'` |
| D-02: adapter at `src/lib/storage/indexedDbAdapter.ts`, exports `createIndexedDbStorage` | File location and export name | VERIFIED | File exists, 98 lines, exports `createIndexedDbStorage()`. Named export only (no default export). |
| D-03: same store key `bladder-diary-patient` | IDB key matches old localStorage key | VERIFIED | `name: 'bladder-diary-patient'` in persist config (store.ts:359); adapter uses the `name` argument passed by the persist middleware |
| D-04: one-time copy on first hydrate, then clear localStorage | Migration strategy | VERIFIED | `getItem` checks IDB first; if empty, reads localStorage; if present, calls `await idbSet(name, lsValue)` then `localStorage.removeItem(name)` only on success. Verified by Test 3 (happy path) and Test 8 (atomicity on write failure). |
| D-05: bump 2 to 3, no-op v3 branch in `migrateBladderDiaryState` | Version and migration marker | VERIFIED | `version: 3` in persist config; `if (version < 3) { // v2 → v3 backend swap... }` present as comment-only block (no state-shape change). `grep -cE "^[[:space:]]*version: 2," src/lib/store.ts` returns 0. |
| D-06: async storage contract (Promises) | All three methods return Promises | VERIFIED | `StateStorageLike` interface declares `getItem: Promise<string \| null>`, `setItem: Promise<void>`, `removeItem: Promise<void>`. All methods are `async`. |
| D-07: `useStoreHydrated()` still gates correctly | Hook unchanged | VERIFIED | `useStoreHydrated()` is byte-identical to its pre-phase shape: `persist.hasHydrated()` + `onHydrate` + `onFinishHydration` subscriptions. No new plumbing added. The hook was already async-storage-aware. |
| D-08: silent error handling | `console.warn` only, no alert/toast/throw | VERIFIED | 5 `console.warn` calls in adapter: getItem IDB catch (line 49), migration write catch (line 76), setItem catch (line 86), removeItem catch (line 93), plus one defensive nested catch. Zero `alert(`, `toast(`, or `throw` statements. Tests 6, 7, 8 verify warn-once behavior. |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/storage/indexedDbAdapter.ts` | Zustand StateStorage adapter with idb-keyval, migration, graceful degrade | VERIFIED | 98 lines. Exports `createIndexedDbStorage`. Imports `get/set/del as idbGet/idbSet/idbDel`. Implements migration path and 5 error-handling catch sites. |
| `src/__tests__/storage-adapter.test.ts` | Happy-path unit tests (5 cases) | VERIFIED | 85 lines. `import 'fake-indexeddb/auto'` at line 1. Covers Tests 1-5 (null/empty, round-trip, migration, no-migration-if-idb-present, removeItem). |
| `src/__tests__/storage-adapter.failure.test.ts` | Failure-path unit tests (3 cases) | VERIFIED | 74 lines. `vi.mock('idb-keyval')` at top. Covers Tests 6-8 (getItem throws, setItem throws, migration atomicity). |
| `package.json` | idb-keyval in dependencies, fake-indexeddb in devDependencies | VERIFIED | `dependencies["idb-keyval"]: "^6.2.2"`, `devDependencies["fake-indexeddb"]: "^6.2.5"`. Both confirmed top-level via `npm ls --depth=0`. |
| `src/lib/store.ts` | version 3, createJSONStorage wiring, createIndexedDbStorage import, v3 migration branch | VERIFIED | version: 3 present. `storage: createJSONStorage(() => createIndexedDbStorage())` present. `import { createIndexedDbStorage } from './storage/indexedDbAdapter'` present. `if (version < 3)` branch present. |
| `src/__tests__/store.test.ts` | v2 to v3 migration describe block with 2 tests | VERIFIED | `import 'fake-indexeddb/auto'` at line 1. 2 describe blocks for `migrateBladderDiaryState`. New block has Test A (state-shape no-op) and Test B (adapter migration end-to-end). `afterEach` cleanup present. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/store.ts` | `src/lib/storage/indexedDbAdapter.ts` | `import { createIndexedDbStorage } from './storage/indexedDbAdapter'` | WIRED | Line 14 of store.ts. Used at line 362 in persist config. |
| `src/lib/store.ts` | `zustand/middleware` | `import { persist, createJSONStorage } from 'zustand/middleware'` | WIRED | Line 11 of store.ts. Both identifiers used: `persist` wraps the store, `createJSONStorage` wraps the adapter. |
| `src/lib/storage/indexedDbAdapter.ts` | `idb-keyval` | `import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'` | WIRED | Line 26 of adapter. All three aliased imports used in the implementation. |
| `src/__tests__/storage-adapter.test.ts` | `src/lib/storage/indexedDbAdapter.ts` | `import { createIndexedDbStorage } from '@/lib/storage/indexedDbAdapter'` | WIRED | Line 10. Factory called in `beforeEach`. |
| `src/__tests__/store.test.ts` | `idb-keyval` (via fake-indexeddb/auto) | `import 'fake-indexeddb/auto'` at line 1 | WIRED | Polyfills `globalThis.indexedDB` so idb-keyval works in jsdom. Test B uses dynamic `import('idb-keyval')` to drive `idbGet`/`idbDelKey` directly. |

---

## Data-Flow Trace (Level 4)

The adapter is not a rendering component; it is a storage layer. The data-flow question is: does real data flow through the IDB path rather than being hardcoded?

| Adapter Method | Data Variable | Source | Produces Real Data | Status |
|---------------|---------------|--------|--------------------|--------|
| `getItem` | `idbValue` from `idbGet<string>(name)` | idb-keyval IDB read | Yes — actual IDB contents | FLOWING |
| `getItem` migration | `lsValue` from `localStorage.getItem(name)` | Browser localStorage | Yes — actual stored v2 state | FLOWING |
| `setItem` | `value` parameter from Zustand persist | Zustand state serialized by `createJSONStorage` | Yes — live store state | FLOWING |
| `removeItem` | `name` key via `idbDel(name)` | IDB | Yes — deletes actual key | FLOWING |

No hardcoded returns. No static `return []` or `return {}` patterns. All IDB paths use real `async/await` calls to idb-keyval.

---

## Behavioral Spot-Checks

Tests are the runnable artifact for this phase. Direct behavioral checks via the vitest runner:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 389 tests pass (no regressions from storage swap) | `npx vitest run` | 19 files passed, 389 tests passed | PASS |
| Adapter happy path (5 tests) | `npx vitest run src/__tests__/storage-adapter.test.ts` | 5 tests passed | PASS |
| Adapter failure path (3 tests) | `npx vitest run src/__tests__/storage-adapter.failure.test.ts` | 3 tests passed | PASS |
| Store migration v2 to v3 (2 tests) | `npx vitest run src/__tests__/store.test.ts` | 39 tests passed (includes 37 pre-existing) | PASS |
| TypeScript clean | `npx tsc --noEmit` | 0 errors | PASS |

Note: `console.warn` lines appear in vitest output for `clock-pick-disambiguation.test.ts` (pre-existing — those tests trigger storage writes in tests that do not import `fake-indexeddb/auto`, which is expected and silent-error behavior). These are not regressions; the adapter swallows the errors per D-08.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/store.ts` | 3 | Stale JSDoc comment: "Uses Zustand with localStorage persistence" | INFO | Cosmetic only. The actual code uses IndexedDB. No debt marker (TBD/FIXME/XXX). Does not affect runtime behavior. Worth updating in a follow-up. |

No TBD, FIXME, or XXX markers found in any Phase 4 modified file. No unreferenced debt markers. No alert(), toast(), or throw in user-facing storage paths.

---

## Human Verification Required

### 1. Safari ITP 7-day Idle Survivability (SC1)

**Test:** On a real iOS device running Safari 17+: complete the Day 1 diary on the deployed v3 build. Leave the device idle with Safari closed for 7+ days (do not open the app). Return and open the app.

**Expected:** The Day 2 diary page loads with all Day 1 events intact. DevTools (or Safari Web Inspector) shows `bladder-diary-patient` in IndexedDB (not localStorage).

**Why human:** Safari ITP's 7-day inactivity eviction cannot be simulated in automated tests. Requires real device, real browser, real idle gap.

### 2. Post-merge 6-locale Production Walkthrough (SC4)

**Test:** After Phase 4 code is deployed to `myflowcheck.com`, run the full daily walkthrough (`npm run e2e:walkthrough:daily` or trigger via the scheduled routine). Confirm the results.

**Expected:** All 6 locales (en/fr/es/pt/zh/ar) show Onboarding OK, Days 1-3 OK, Summary OK, PDF OK. Deep flow OK. No new findings appear in `walkthrough_findings.md` that are attributable to the storage backend change.

**Why human:** Walkthrough runs against production. Phase 4 code has not been deployed yet. The 2026-05-13 run (last passing run) predates Phase 4. A post-merge run is needed to confirm SC4.

**Note on pre-existing open issues:** The open issues in `walkthrough_findings.md` are all dated 2026-05-09 and cover a11y contrast, deep-flow redirect race, and 404 console errors. None are storage-related. They predate Phase 4 and should not be attributed to this phase's changes.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STAB-09 | 04-01, 04-02 | Swap Zustand persist from localStorage to IndexedDB, one-time migration, store v3 | SATISFIED (pending manual SC1+SC4) | idb-keyval wired, adapter implemented, migration tested, version bumped, SC2+SC3 automated tests pass |

---

## Gaps Summary

No blocking gaps. All automated deliverables are present, substantive, and wired.

The 2 items in HUMAN NEEDED status are explicitly scoped to post-merge manual verification in both the ROADMAP success criteria and the PLAN 02 verification block. They are not implementation gaps — the code to enable SC1 is provably in place; only real-device confirmation remains.

**Stale JSDoc note (INFO, non-blocking):** `src/lib/store.ts` line 3 still reads "Uses Zustand with localStorage persistence." This is cosmetic documentation drift; the actual persist config uses IndexedDB. Recommend updating in the same PR or a follow-up.

---

## Risks / Notes

1. **Console noise in unrelated tests:** `clock-pick-disambiguation.test.ts` and other test files that do not import `fake-indexeddb/auto` will log `[indexedDbAdapter] setItem IDB error ReferenceError: indexedDB is not defined` during vitest runs. This is expected and harmless — the error is caught by D-08's silent error handling; state writes fall back to in-memory. These are not new regressions; they existed latently before and are now observable because the adapter logs them. The SUMMARY correctly notes 389/389 pass despite the noise.

2. **Migration retry semantics:** The migration path (D-04) retries on the next page load if the IDB write fails. This means a user in a consistently-broken IDB environment (e.g. some private-mode configurations) will always hydrate from localStorage (if it still has the v2 key). This is correct behavior per D-08 and D-04, but means the localStorage key is never cleared in those environments. Not a defect — the in-memory state is preserved either way.

3. **Module-init IDB write side effect:** The Zustand persist middleware writes the initial/current store state to IDB when `store.ts` is imported (module initialization). Test B accounts for this via explicit `idbDelKey(STORE_KEY)` before exercising the migration path. Future tests that need to test a "fresh IDB" state must account for this same side effect.

4. **Post-deployment DevTools verification (optional):** The CONTEXT.md and PLAN 02 both mention a DevTools check: after deploying v3, a user with a v2 localStorage blob should see `bladder-diary-patient` appear in DevTools > Storage > IndexedDB and disappear from DevTools > Storage > Local Storage. This is a useful smoke test for the migration path in production.

---

## Conclusion

Phase 4 goal is achieved in the codebase. All code-level deliverables — adapter, store wiring, version bump, migration branch, test coverage — are present, substantive, correctly wired, and passing. The two remaining items (SC1 Safari ITP, SC4 post-merge walkthrough) are manual verification gates explicitly scoped to post-deployment by the ROADMAP and PLAN 02. They are not implementation blockers.

---

_Verified: 2026-05-14T17:51:00Z_
_Verifier: Claude (gsd-verifier)_
