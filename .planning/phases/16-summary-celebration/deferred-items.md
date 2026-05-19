# Phase 16 Deferred Items

Out-of-scope findings discovered during plan execution. Not fixed (per scope boundary). Track for a future hygiene plan.

## Pre-existing eslint warning in `src/lib/store.ts`

**Found during:** 16-01 Task 2 (`npx eslint src/lib/store.ts`)
**Rule:** `react-hooks/set-state-in-effect`
**Location:** `src/lib/store.ts:463:5` inside `useStoreHydrated()` — `setHydrated(useDiaryStore.persist.hasHydrated());`
**Status:** Pre-existing on `main` BEFORE Phase 16 edits. The synchronous `setState` inside `useEffect` is intentional (re-checks hydration state in case it landed between initial render and the effect tick), but the new react-hooks rule flags it. Code works correctly in production; this is a lint-level concern not a runtime bug.
**Scope:** Not introduced by 16-01. Not directly caused by 16-01 changes. Touching it would change hydration semantics on the summary page (and elsewhere), which is out of scope for the celebration hero plan.
**Recommendation:** Defer to a future hygiene pass that addresses the eslint warning by either (a) refactoring to use `useSyncExternalStore` or (b) adding a targeted disable comment with a load-bearing explanation.
