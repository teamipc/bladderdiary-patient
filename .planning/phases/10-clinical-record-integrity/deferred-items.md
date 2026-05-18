# Phase 10 — Deferred Items

Out-of-scope discoveries logged during plan execution. All are **pre-existing** on `main` (verified via `git stash` + lint baseline) and unrelated to the CRI-* requirements. Each belongs in a separate hygiene plan, not Phase 10.

## React-19 lint tightening pre-existing errors

These three lint errors are all manifestations of React-19's purity-of-render and effect-purity tightening. They're flagged by `eslint-config-next/core-web-vitals` after the React 19 upgrade and are independent of any Phase 10 change. Fixing them is a coherent single workstream — either a React-19 purity sweep plan, or per-component refactors as those components come up for other reasons.

### 1. `NextStepBanner.tsx` line 47 — `react-hooks/purity` on `Date.now()`

- **File:** `src/components/diary/NextStepBanner.tsx`
- **Line:** 47 (pre-change baseline) / 48 (post-Plan-10-02)
- **Discovered:** Plan 10-02 Task 1 verification — `npx eslint src/components/diary/NextStepBanner.tsx`
- **Rule:** `react-hooks/purity` — `Date.now()` is flagged as an impure function call during render.
- **Scope:** Out-of-scope for CRI-02. The lint warning is React 19 purity tightening on `Date.now()` reads during render; the fix would be either a `useState` + `useEffect` snapshot or a `useSyncExternalStore` subscription — a behavior-changing refactor unrelated to the timezone-correctness goal of Plan 10-02.
- **Recommendation:** Address in a React-19 purity sweep plan.

### 2. `Day1Celebration.tsx` line 40 — `react-hooks/set-state-in-effect`

- **File:** `src/components/diary/Day1Celebration.tsx`
- **Line:** 40
- **Discovered:** Plan 10-02 Task 3 verification — `npx eslint src/components/diary/Day1Celebration.tsx`
- **Rule:** `react-hooks/set-state-in-effect` — `setSelected(null)` is called synchronously inside a `useEffect` body when `!open`.
- **Scope:** Out-of-scope for CRI-03. Behavior-changing refactor (derive `selected` from `open` props, or move reset into `onClose` callback chain) unrelated to the timezone-correctness goal of Plan 10-02.
- **Recommendation:** Address in a React-19 effect-purity sweep plan.

### 3. `useStoreHydrated` hook in `store.ts` line 425 — `react-hooks/set-state-in-effect`

- **File:** `src/lib/store.ts` (line ~425 post-Plan-10-03 edits; line 408 on HEAD `1d41397` before 10-03)
- **Rule:** `react-hooks/set-state-in-effect`
- **Code path:** `useStoreHydrated()` hook
  ```ts
  useEffect(() => {
    setHydrated(useDiaryStore.persist.hasHydrated());
    // ...
  }, []);
  ```
- **Discovered:** Plan 10-03 (CRI-04) verification.
- **Scope:** Pre-existing on `main`. The hook intentionally re-checks `hasHydrated()` synchronously in the effect to cover the case where rehydration completes between the initial `useState(false)` and the effect tick — documented behavior copied from the Zustand persist docs. Fixing requires either an `eslint-disable-next-line` with justification or migration to `useSyncExternalStore` against `useDiaryStore.persist`. Both out of scope for a clinical-record-integrity fix.
- **Recommendation:** Address in a React-19 effect-purity sweep plan, OR migrate `useStoreHydrated` to `useSyncExternalStore` as a focused tech-debt plan.

## Disposition

Phase 10 verification gates were adjusted from "no lint errors on any file in the patch" to "no NEW lint errors on changed files" — the existing 3 errors don't block the CRI-* deliverable. They should be tracked as a single hygiene phase (e.g. **"React-19 purity sweep"**) in Milestone 4 or later. The gsd-verifier should call this out at Phase 10 close-out so the user can decide when to schedule the sweep.
