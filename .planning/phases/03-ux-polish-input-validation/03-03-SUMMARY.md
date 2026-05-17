---
phase: 3
plan: "03-03"
subsystem: "input-validation"
status: "COMPLETE"
tags: ["stab-08", "validation", "url-param", "security", "landing"]
dependency_graph:
  requires: []
  provides: ["clinic-code-validation", "regex-guard"]
  affects: ["src/app/[locale]/LandingContent.tsx", "src/__tests__/clinic-code-url-validation.test.tsx"]
tech_stack:
  added: []
  patterns:
    - "URL-param regex validation at the call site (not in the store)"
    - "Silent-reject with dev-only console.warn debugging hook"
    - "URLSearchParams in-place mutation in vitest mock to preserve referential stability"
key_files:
  modified:
    - path: "src/app/[locale]/LandingContent.tsx"
      description: "Added exported CLINIC_CODE_RE regex constant + guarded setClinicCode call in useEffect"
  created:
    - path: "src/__tests__/clinic-code-url-validation.test.tsx"
      description: "230 lines; 11 pure-regex tests + 8 integration tests (19 total, all passing)"
decisions:
  - "Regex locked at /^[A-Za-z0-9-]{1,32}$/ per gate (alphanumeric + hyphen, 1-32 chars)"
  - "Silent reject for invalid input — don't toast, don't redirect, don't setClinicCode(null). Bad referrer-link shouldn't be patient's problem"
  - "Dev-only console.warn with .slice(0, 100) cap on payload to prevent 5000-char dev-tools blow-up"
  - "Worktree-isolated executor B (initial run) hit Bash permission denies mid-task; orchestrator completed the commit + the integration-test mock fix inline. Source change matches plan exactly."
  - "Critical mock pattern: useSearchParams returns a STABLE URLSearchParams reference (in-place mutated) — initial mock returned new instance per call, infinite-looping the useEffect. Documented in test file comment."
metrics:
  duration: "~25min (executor + orchestrator inline finish)"
  completed: "2026-05-17"
  tasks_completed: 2
  tasks_blocked: 0
  files_changed: 2
  tests_added: 19
  vitest_total: "446/446 (was 427/427; +19 from 03-03)"
  new_i18n_keys: 0
---

# Phase 3 Plan 03: STAB-08 clinicCode URL-param validation

## Objective

Close ROADMAP Phase 3 Success Criterion #3: "Visiting `?clinic=<5000-char-string>` or `?clinic=<script>` does NOT persist the raw value to localStorage; only alphanumeric-plus-dash values within a length cap are accepted."

## What changed

### `src/app/[locale]/LandingContent.tsx`

1. Added exported regex constant near the top of the file (after imports):

```ts
export const CLINIC_CODE_RE = /^[A-Za-z0-9-]{1,32}$/;
```

The export is intentional — the test file imports it directly for the 11 pure-regex test cases.

2. Guarded the `useEffect` at lines 47-51:

```diff
 useEffect(() => {
   const clinic = searchParams.get('clinic');
-  if (clinic) {
+  if (clinic && CLINIC_CODE_RE.test(clinic)) {
     setClinicCode(clinic);
+  } else if (clinic && process.env.NODE_ENV !== 'production') {
+    console.warn('Ignored invalid clinicCode:', clinic.slice(0, 100));
   }
 }, [searchParams, setClinicCode]);
```

The `.slice(0, 100)` cap on the warn payload prevents a 5000-char attack string from blowing up dev-tools console. Empty-string clinic param (the `?clinic=` with no value case) is filtered by the leading `clinic &&` check — no warn for the trivially-empty case.

### `src/__tests__/clinic-code-url-validation.test.tsx` (NEW)

19 tests in two layers:

**Layer A — pure regex (11 tests):** `IPC-2026` (pass), `A` (pass), `-` (pass), 32 As (pass — boundary), 33 As (fail — boundary), empty (fail), `<script>` (fail), `IPC_2026` underscore (fail), `IPC 2026` space (fail), `%3Cscript%3E` URL-encoded (fail), 5000 As (fail — length cap).

**Layer B — integration (8 tests):** valid `IPC-2026` persists, valid `A` persists, invalid 33-char does NOT persist, invalid `<script>` does NOT persist, empty does NOT persist (filtered before warn), absent param does NOT persist (no change in behavior), dev-only warn fires for invalid input, warn payload truncated to 100 chars.

## Deviations

**Initial executor B hit Bash permission denies** after writing the source + test files. Orchestrator picked up the work in-worktree, ran quality gates, fixed the integration-test mock (see below), and committed.

**Integration test mock fix (orchestrator):** the initial mock returned `new URLSearchParams()` on every `useSearchParams()` call:

```ts
// BROKEN — new instance per call
useSearchParams: () => {
  const p = new URLSearchParams();
  if (mockClinicParam !== null) p.set('clinic', mockClinicParam);
  return p;
},
```

Result: `searchParams` had a new identity each render → useEffect dep `[searchParams, setClinicCode]` re-fired → setClinicCode triggered re-render → infinite loop → "Maximum update depth exceeded" error → 3/19 integration tests failed.

Fix: mutate a single URLSearchParams instance in place:

```ts
// CORRECT — stable instance, mutated per call
const mockSearchParams = new URLSearchParams();
useSearchParams: () => {
  mockSearchParams.delete('clinic');
  if (mockClinicParam !== null) mockSearchParams.set('clinic', mockClinicParam);
  return mockSearchParams;
},
```

Comment in test file documents this pattern for future readers.

## Acceptance criteria — ALL MET

- [x] `CLINIC_CODE_RE` exported from LandingContent.tsx and matches `/^[A-Za-z0-9-]{1,32}$/`
- [x] useEffect guarded — only valid values reach `setClinicCode`
- [x] Dev-only console.warn fires for invalid values (NODE_ENV !== production)
- [x] Warn payload truncated at 100 chars
- [x] 19/19 new tests passing
- [x] TypeScript clean (`npx tsc --noEmit`)
- [x] ZERO new i18n keys
- [x] Atomic commit with `fix(03): STAB-08 — ...` prefix
- [x] No file overlap with executors A (DayPageClient) or B (ExportActions)

## Status

**COMPLETE** — closes STAB-08. Third of three Phase 3 fixes; once executors A and B merge, completes the Stabilization milestone.

## Commits

- `a8ea86d` — `fix(03): STAB-08 — validate clinicCode URL param ([A-Za-z0-9-]{1,32}) before persist` (worktree-agent-ac0d0a180b37abf54 branch)
