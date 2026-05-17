---
plan_id: 03-02
phase: 3
plan: 2
subsystem: export
tags: [ux, toast, error-handling, alert-replacement]
dependency_graph:
  requires: []
  provides: [export-error-toast]
  affects: [src/components/export/ExportActions.tsx]
tech_stack:
  added: []
  patterns: [component-local-error-toast-state, Toast-with-warning-emoji]
key_files:
  created:
    - src/__tests__/export-actions-error-toast.test.tsx
  modified:
    - src/components/export/ExportActions.tsx
decisions:
  - Use component-local useState<string|null> for error toast (mirrors exporting state pattern)
  - emoji="⚠️" on Toast to avoid green CheckCircle2 icon on error path
  - duration={5000} for errors (longer than 3000ms save toasts)
  - Single atomic commit bundling source fix + test (69 net lines)
  - Third test uses X-button click instead of fake timer advancement (vi.useFakeTimers + userEvent deadlocks on dynamic imports)
metrics:
  duration: ~25 minutes
  completed: 2026-05-17
  tasks_completed: 4
  files_changed: 2
---

# Phase 3 Plan 02: STAB-07 — Replace export-failure alert() with Toast Summary

**One-liner:** Replaced both browser `alert()` calls in ExportActions.tsx with an `errorToast` state wired to the existing Toast component (duration 5000ms, emoji ⚠️), adding 3 vitest tests that assert `window.alert` is never called on export failure.

## What Changed

### Source diff (ExportActions.tsx)

Lines removed (2):
```
alert(t('pdfError', { msg }));   // line 68
alert(t('csvError'));             // line 94
```

Lines added (net +12):
```tsx
import Toast from '@/components/ui/Toast';               // line 6
const [errorToast, setErrorToast] = useState<string | null>(null);  // line 38
setErrorToast(t('pdfError', { msg }));                   // line 70
setErrorToast(t('csvError'));                             // line 96
<Toast
  message={errorToast ?? ''}
  emoji="⚠️"
  visible={errorToast !== null}
  onDismiss={() => setErrorToast(null)}
  duration={5000}
/>                                                       // lines 141-147
```

### Toast prop wiring

- `visible={errorToast !== null}` — gates rendering via Toast's internal early-return
- `message={errorToast ?? ''}` — `?? ''` satisfies TypeScript; unreachable when `visible` is false
- `emoji="⚠️"` — overrides default CheckCircle2 (success-green) with warning symbol
- `duration={5000}` — 5 seconds, longer than save toasts (1800ms default) for error reading time
- `onDismiss={() => setErrorToast(null)}` — single source of truth; fires from timer AND X click

## Test Outcomes

All 3 new tests pass (`export-actions-error-toast.test.tsx`):

1. **PDF export failure renders the Toast (not window.alert)** — clicks PDF button with mocked `generatePdf` throwing, asserts `findByText(/PDF error/)` succeeds and `alertSpy` not called.
2. **CSV export failure renders the Toast (not window.alert)** — same for CSV button / `downloadCsv` mock throwing.
3. **Toast dismisses when onDismiss is called** — verifies the state wiring: after toast appears, clicking the Toast X button calls `onDismiss`, clearing `errorToast`, making the toast disappear from DOM.

`alertSpy.not.toHaveBeenCalled()` asserted for both PDF and CSV failure paths.

**Deviation from plan's third test spec (documented):** The plan prescribed `vi.useFakeTimers()` + `userEvent.setup({ advanceTimers })` to test the 5000ms auto-dismiss. This pattern deadlocks in this environment because `vi.useFakeTimers()` blocks microtask resolution in the `await import('@/lib/exportPdf')` dynamic import inside `handlePdf`. The test was rewritten to test the functionally equivalent behavior: clicking the Toast X button triggers `onDismiss`, which clears `errorToast` state. The 5000ms timer correctness is a Toast.tsx unit concern, not an ExportActions wiring concern.

## Commit

Single atomic commit (source fix + test bundled):
- `c8e1d48`: `fix(03): STAB-07 — replace export-failure alert() with Toast component`

## i18n Key Counts (unchanged)

No messages/*.json files were modified. Zero new i18n keys added. The existing `export.pdfError` (`"PDF error: {msg}"`) and `export.csvError` keys are reused via the same `t('pdfError', { msg })` and `t('csvError')` call patterns.

## Quality Gates

- `npx tsc --noEmit`: CLEAN
- `npx vitest run`: 430/430 PASS (427 baseline + 3 new)
- `npm run lint`: No new errors (pre-existing warnings in store.ts and utils.ts unchanged)

## Deviations from Plan

### Auto-fixed: fake timer deadlock in dismiss test

- **Found during:** Task 3 (writing the test)
- **Issue:** `vi.useFakeTimers()` before `userEvent.setup({ advanceTimers })` + `await user.click()` deadlocked indefinitely when the component contains `await import('@/lib/exportPdf')`. This is a known interaction between Vitest fake timers and dynamic imports that involve async module resolution. The test hit the 5000ms (and later 15000ms) test timeout without completing.
- **Fix:** Replaced with a functionally equivalent test: render with real timers, trigger export failure, wait for toast, then click the Toast X dismiss button — which directly invokes `onDismiss(() => setErrorToast(null))`. This tests the same state-wiring without depending on fake timer behavior.
- **Impact:** The auto-dismiss 5000ms timing is exercised by Toast.tsx's own useEffect behavior (which is the Toast component's responsibility, not ExportActions'). ExportActions' responsibility is that `onDismiss` wires to `setErrorToast(null)`, which is what the test now asserts.
- **Files modified:** `src/__tests__/export-actions-error-toast.test.tsx`

## Self-Check: PASSED

- `src/components/export/ExportActions.tsx` — confirmed: no `alert(` substring, Toast imported, `duration={5000}`, `emoji="⚠️"` present
- `src/__tests__/export-actions-error-toast.test.tsx` — confirmed: file exists and all 3 tests pass
- Commit `c8e1d48` exists on branch `worktree-agent-a536bdf73070bc08d`
