# Phase 10 — Deferred Items

Out-of-scope discoveries logged during plan execution. Do NOT fix in this phase.

## From Plan 10-02

### `NextStepBanner.tsx` line 47 — `Date.now()` "react-hooks/purity" lint error (pre-existing)

- **File:** `src/components/diary/NextStepBanner.tsx`
- **Line:** 47 (pre-change baseline) / 48 (post-Task-1 baseline)
- **Discovered:** Plan 10-02 Task 1 verification — `npx eslint src/components/diary/NextStepBanner.tsx`
- **Rule:** `react-hooks/purity` — `Date.now()` is flagged as an impure function call during render.
- **Pre-existing:** Verified via `git stash` + lint at baseline; the error exists on `main` regardless of Plan 10-02's changes. Plan 10-02 explicitly instructs "Do NOT touch any other line. The `Date.now()` call at line 47 is correct as-is — it operates on a UTC millisecond timestamp, not on `getHours()`, and is timezone-independent."
- **Scope:** Out-of-scope for CRI-02. The lint warning is React 19 purity tightening on `Date.now()` reads during render; the fix would be either a `useState` + `useEffect` snapshot or a `useSyncExternalStore` subscription, which is a behavior-changing refactor unrelated to the timezone-correctness goal of Plan 10-02.
- **Disposition:** Leave for a future plan (e.g. an aria-live + purity sweep, or a UX timing refactor).
- **Verification gate impact:** `npx eslint src/components/diary/NextStepBanner.tsx` exits 1 both before and after Plan 10-02 (1 pre-existing error). Plan 10-02 introduces zero NEW lint warnings on this file. The relevant verification gate is "no NEW lint warnings on changed files," not "lint exit 0 on every file in the patch."

### `Day1Celebration.tsx` line 40 — `react-hooks/set-state-in-effect` lint error (pre-existing)

- **File:** `src/components/diary/Day1Celebration.tsx`
- **Line:** 40
- **Discovered:** Plan 10-02 Task 3 verification — `npx eslint src/components/diary/Day1Celebration.tsx`
- **Rule:** `react-hooks/set-state-in-effect` — `setSelected(null)` is called synchronously inside a `useEffect` body when `!open`.
- **Pre-existing:** Verified via `git stash` + lint at baseline; the error exists on `main` regardless of Plan 10-02's changes (lines 39-41 are unchanged by Plan 10-02 — only lines 28 and 45 were modified).
- **Scope:** Out-of-scope for CRI-03. The lint warning is a React 19 effect-purity tightening; the fix would be to derive `selected` from `open` props or move the reset into the `onClose` callback chain — a behavior-changing UX refactor unrelated to the timezone-correctness goal of Plan 10-02.
- **Disposition:** Leave for a future plan (e.g. a React-19 effect-purity sweep).
- **Verification gate impact:** `npx eslint src/components/diary/Day1Celebration.tsx` exits 1 both before and after Plan 10-02 (1 pre-existing error). Plan 10-02 introduces zero NEW lint warnings on this file.
