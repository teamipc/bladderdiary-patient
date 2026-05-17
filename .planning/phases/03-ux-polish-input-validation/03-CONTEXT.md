# Phase 3: UX polish + input validation — Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Source:** Inline gate (no discuss-phase) after Phase 8 SHIPPED
**Phase requirements:** STAB-06, STAB-07, STAB-08
**Milestone:** Stabilization (Milestone 1) — the final phase in this milestone; closes it.

<domain>
## Phase Boundary

Phase 3 is the **last unshipped phase** in the entire roadmap. Stabilization milestone (Phases 1, 2, 4) closed earlier; Desktop & Tablet UX milestone (Phases 5–8) closed across 2026-05-15 → 2026-05-17. Phase 3 is small and self-contained — three independent corrections that improve UX quality and tighten the only user-controlled URL surface (the `?clinic=` query param).

### The three fixes — independent, no file overlap

| Plan | Req | Surface | Bug | Fix shape |
|------|-----|---------|-----|-----------|
| **03-01** | STAB-06 | `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx` (lines 25-32 `checkMilestone()` + lines 168-184 `showMilestoneToast`) | Milestone toasts can re-fire after a locale switch mid-session. Root cause to verify during plan: `sessionStorage` flag is keyed by `milestone_${key}` and the `key` is locale-independent (`'first_event'`, `'day1_complete'`, etc.), so the dedup *should* work. If the bug still reproduces, the cause is likely either: (a) the wake-up/save-message comparison `message === t('wakeUpSaved')` becomes locale-coupled and re-enters the `showMilestoneToast` path with a stale check; (b) `day1CelebrationShown` flag in Zustand persist doesn't survive locale rehydration. Planner verifies via reproducible test FIRST (use `useDiaryStore` test fixture across 2 locales), then fixes the actual root cause. | Add a vitest test that fires milestone on EN then asserts no re-fire on FR/AR mount. Fix likely 1-3 lines. |
| **03-02** | STAB-07 | `src/components/export/ExportActions.tsx` lines 68 (`alert(t('pdfError', { msg }))`) + 94 (`alert(t('csvError'))`) | Browser `alert()` modal is hostile UX — interrupts the page, accessibility-poor, not styleable. Project already has a Toast component at `src/components/ui/Toast.tsx` used by `DayPageClient` for save toasts. | Replace both `alert()` calls with the existing Toast pattern. Add component-local `useState` for toast message + show/hide. Reuse existing `setShowToast`/`setToastMessage` patterns from DayPageClient. Auto-dismiss after ~5s (longer than save-toasts since this is error info). |
| **03-03** | STAB-08 | `src/app/[locale]/LandingContent.tsx` lines 37–51 (the `useEffect` that calls `setClinicCode(clinic)` from `searchParams.get('clinic')`) | Raw URL param persisted to localStorage. Attack surface: `?clinic=<script>` or `?clinic=<5000-char-payload>` writes garbage to the patient's store. | Validate against `/^[A-Za-z0-9-]{1,32}$/` BEFORE `setClinicCode`. Silently reject invalid values (don't persist; optionally `console.warn` for debugging). User-locked at the gate: `[A-Za-z0-9-]` charset, max 32 chars. |

</domain>

<decisions>
## Implementation Decisions

### Plan structure (user-locked at gate)
**Three parallel plans** (03-01, 03-02, 03-03), atomic and independent. No file overlap:
- 03-01 → `DayPageClient.tsx` only
- 03-02 → `ExportActions.tsx` only
- 03-03 → `LandingContent.tsx` only

Wave 1: all three plans parallel-executable with `isolation="worktree"` (Phase 8 lesson applied — worktree isolation prevents Phase-7 stash/pop race). No Wave 2 verification spec needed — vitest unit coverage is sufficient for these fixes; the daily walkthrough remains the regression gate.

### Inheritance from prior phases
- **Toast pattern:** `src/components/ui/Toast.tsx` already exists and is in production use via `DayPageClient`. Mirror its API.
- **Test pattern:** vitest unit coverage style from `src/__tests__/`. Use existing fixtures (`patient-a-paper-diary.test.ts`, `store.test.ts`) for store-shape conventions.
- **i18n:** STAB-07 may need a new toast string if `t('pdfError')` / `t('csvError')` are already defined for the alert path — REUSE them. No new keys expected.
- **Logical CSS:** Toast component is shared; no per-fix CSS needed (Toast handles its own styling).

### STAB-06 — locked details
- **Reproduce first:** vitest test using `useDiaryStore` + simulated mount across 2 locales. If the bug doesn't reproduce in unit context, the planner downgrades severity to "verify in browser, defer if not reproducible" rather than chase a phantom.
- **Storage choice:** keep `sessionStorage` (intent is per-session dedup, not permanent). Don't switch to localStorage — that would suppress the toast across browser restarts which IS wanted on a fresh session.
- **Key format:** `milestone_${key}` is locale-independent (`first_event`, `day1_complete`, etc.) — verify this is preserved.

### STAB-07 — locked details
- **Toast component to use:** the existing `src/components/ui/Toast.tsx` (in-tree, in-use). Do NOT introduce a new Toast library.
- **Auto-dismiss:** ~5s for errors (longer than save-toasts' 3s). Caller picks duration.
- **Existing i18n keys:** `t('pdfError', { msg })` and `t('csvError')` — these already exist in `messages/en.json` (per the current `alert(t(...))` call). Reuse them. ZERO new i18n keys.
- **Component state:** add `useState<string | null>` for the error toast inside `ExportActions`. Pattern: `setErrorToast(message)` triggers Toast render with auto-clear.

### STAB-08 — locked details
- **Regex:** `^[A-Za-z0-9-]{1,32}$` — alphanumeric + hyphen, 1 to 32 characters. No empty string.
- **Behavior on invalid:** silent reject. Don't toast, don't redirect, don't `setClinicCode(null)`. Just don't persist the bad value. The `?clinic=` param being malformed shouldn't be the patient's problem to debug — it's a referrer-link issue.
- **Optional debugging hook:** if `process.env.NODE_ENV !== 'production'`, `console.warn('Ignored invalid clinicCode:', clinic)` so dev can see what bounced.

### Success criteria (from ROADMAP §"Phase 3")
1. Triggering the first-void milestone toast on `/en/diary/day/1`, then switching to `/fr/diary/day/1` mid-session, does NOT re-fire the toast in the new locale.
2. Forcing a jsPDF generation error during export surfaces a toast (using `src/components/ui/Toast.tsx`) — no browser `alert()` modal appears.
3. Visiting `?clinic=<5000-char-string>` or `?clinic=<script>` does NOT persist the raw value to localStorage; only alphanumeric-plus-dash values within a length cap are accepted.

### Out of scope for Phase 8
- New i18n keys (all 3 fixes reuse existing keys per current usage).
- Toast component refactor (use the existing component as-is).
- Other `alert()` calls in the codebase IF they exist outside `ExportActions.tsx` (planner verifies via `grep -rn 'alert(' src/components/ src/app/`; if found elsewhere, file as separate quick-task).
- Validation on OTHER URL params (only `?clinic=` is in scope; other params are read-only via `useSearchParams`).
- Refactoring `LandingContent.tsx` `useEffect` dependency arrays unless directly required by the validation logic.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Inherited patterns
- `src/components/ui/Toast.tsx` — existing Toast component; mirror its API for STAB-07.
- `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx` — sample of Toast in production use (the milestone-toast logic itself + the save-toast `setShowToast`/`setToastMessage` pattern).
- `src/lib/store.ts` — `setClinicCode` action signature (called from LandingContent line 49).

### Source files this phase touches
- 03-01: `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx` (lines 25-32 + 168-184)
- 03-02: `src/components/export/ExportActions.tsx` (lines 68, 94)
- 03-03: `src/app/[locale]/LandingContent.tsx` (lines 37–51)

### Test infrastructure
- `src/__tests__/` — vitest unit tests. Path alias `@/` → `./src/`. Run via `npx vitest run`.
- `e2e/walkthrough.spec.ts` — daily 6-locale Playwright walkthrough. Phase 3 fixes should not break it (run as gate).
- `messages/{en,fr,es,pt,zh,ar}.json` — i18n strings. Verify `toasts.pdfError` and `toasts.csvError` exist in all 6 (they should, per current alert usage).

### Quality gates
- `npx vitest run` — must stay green (post-Phase-8: 427/427)
- `npm run lint` — only flag NEW errors
- `npx tsc --noEmit` — TypeScript must compile clean
- `npm run build` — production build must succeed

</canonical_refs>

<specifics>
## Specific Ideas

### STAB-06 reproduction strategy (Plan 03-01 verifies before fixing)

Write a vitest test that:
1. Mounts `<DayPageClient />` (or extracts `showMilestoneToast` into a testable hook/fn if needed) with locale `en`.
2. Calls `handleSave(t('voidSaved'))` to trigger the first-event milestone path.
3. Asserts the Toast rendered with the EN milestone copy.
4. Unmounts.
5. Re-mounts with locale `fr` (or re-renders with `tm` switched to French).
6. Calls `handleSave(...)` again.
7. Asserts NO toast re-fires (sessionStorage flag `milestone_first_event` was set in step 2; checkMilestone returns false in step 6).

If the test FAILS in current code → the bug is real, planner identifies root cause and fixes.
If the test PASSES in current code → STAB-06 may already be closed inadvertently by earlier work; planner documents the test as a regression guard and ships only the test (no source change).

### STAB-07 Toast wiring (Plan 03-02)

Pattern to mirror (from DayPageClient.tsx around line 230-240):
```tsx
const [errorToast, setErrorToast] = useState<string | null>(null);
// ... in catch block:
setErrorToast(t('pdfError', { msg }));
// ... in JSX:
{errorToast && <Toast message={errorToast} duration={5000} onDismiss={() => setErrorToast(null)} />}
```

The Toast component's exact API (Toast/showToast/duration/etc.) is in `src/components/ui/Toast.tsx` — planner reads it before locking the wiring.

### STAB-08 validation (Plan 03-03)

Two-line change at LandingContent.tsx:
```tsx
const CLINIC_CODE_RE = /^[A-Za-z0-9-]{1,32}$/;
// ... in useEffect:
const clinic = searchParams.get('clinic');
if (clinic && CLINIC_CODE_RE.test(clinic)) {
  setClinicCode(clinic);
} else if (clinic && process.env.NODE_ENV !== 'production') {
  console.warn('Ignored invalid clinicCode:', clinic.slice(0, 100));
}
```

Note `clinic.slice(0, 100)` cap on the warn payload prevents a 5000-char string from blowing up dev-tools console.

Test (Plan 03-03 vitest):
- valid: `?clinic=IPC-2026` → setClinicCode called with `IPC-2026`
- valid: `?clinic=A`  → setClinicCode called with `A`
- invalid (too long): `?clinic=` + 33 chars → setClinicCode NOT called
- invalid (bad chars): `?clinic=<script>` → setClinicCode NOT called
- invalid (empty after trim): `?clinic=` → setClinicCode NOT called
- absent: no `?clinic` → setClinicCode NOT called (no change in behavior)

### Phase 3 milestone-close commit message convention

Each plan's final commit (after fix + test) uses prefix matching:
- 03-01: `fix(03): STAB-06 — dedup milestone toasts across locale switch (vitest guard)`
- 03-02: `fix(03): STAB-07 — replace export-failure alert() with Toast component`
- 03-03: `fix(03): STAB-08 — validate clinicCode URL param ([A-Za-z0-9-]{1,32}) before persist`

</specifics>

<deferred>
## Deferred Ideas

- **Other `alert()` calls in the codebase** — if planner finds any outside ExportActions, file as separate quick-tasks (don't bundle into Phase 3).
- **Toast component refactor** — if Toast.tsx itself has rough edges discovered during STAB-07 wiring, log to walkthrough_findings.md for a future polish cycle. Phase 3 USES Toast; it does not redesign Toast.
- **Other URL param validation** — only `?clinic=` is in scope. Other params (none currently exist on production paths) get validation when added.
- **Server-side input validation** — N/A; this is a static-export client app, no server endpoints.
- **Cross-locale milestone strings sanity check** — assumes `messages/{locale}.json` keys for milestones exist; if any are missing, log to i18n-sync (don't bundle).
- **Phase 8 spec polish** — already a queued chip task; separate from Phase 3.

</deferred>

---

*Phase: 03-ux-polish-input-validation*
*Context gathered: 2026-05-17 via inline gate — user picked three parallel plans + clinicCode `[A-Za-z0-9-]{1,32}` silent-reject*
