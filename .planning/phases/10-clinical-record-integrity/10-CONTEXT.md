# Phase 10 — Clinical Record Integrity · CONTEXT

**Milestone:** Medical-Grade Closure (Milestone 3)
**Source:** `.planning/audits/2026-05-18-comprehensive-audit/` (CODE-REVIEW.md primary)
**Started:** 2026-05-18
**Status:** Ready to plan (no /gsd-discuss-phase needed — audit IS the discovery)
**Depends on:** Phase 9 (no hard dep — independent code surface — but ordered to keep production-user-facing fixes first)

---

## Why this phase exists (motivation)

The 2026-05-18 audit found **2 Critical code bugs + 3 High** that all share one theme: clinical-record integrity is silently compromised in ways the test suite doesn't catch.

The headline: **"Discard" actually saves the dirty edit.** Phase 6 added an explicit `ConfirmDialog` to `LogVoidForm`, `LogDrinkForm`, and `LogLeakForm` with copy that promises "Your changes won't be saved." But the autosave-on-unmount `useEffect` in each form fires AFTER Discard chooses to unmount the form — so the dirty state ships to the store anyway. The clinical record the patient *thinks* they discarded ends up in the export the clinician reads.

Plus two regressions of the timezone work Phases 1–2 spent months eliminating: `NextStepBanner.tsx:79` calls `new Date().getHours()` (browser-local) and `reminders.ts:anchorTimeLabel` uses `new Date().setHours()`. Patients in a stored-tz different from their browser tz see the wrong next-step suggestion and the wrong reminder-time display.

Plus two smaller bugs: `removeWakeTime` doesn't recompute the FMV anchor (`addWakeTime` / `setBedtime` do — inconsistent invariant); `observations.ts` caffeine-pattern detection doesn't filter Day 1 (violates the IPC "exclude Day 1 from 24HV/NPi/AVV" rule).

**Impact:** Wrong-content clinical PDF/CSV reaches the clinician; wrong-time reminder banner shown to the patient; wrong observations rendered in summary.

---

## Goal (from ROADMAP.md)

> Close the "Discard saves anyway" autosave-on-unmount bug class across all 3 edit forms with regression tests, and finish eliminating the remaining browser-local-time leaks that regressed during Phase 5–8 work. The clinical record the patient submits reflects exactly what they intended to submit; the time displayed on every UI surface matches the patient's stored timezone, not their browser's wall clock.

---

## Requirements (from REQUIREMENTS.md)

- **CRI-01** `LogVoidForm` / `LogDrinkForm` / `LogLeakForm` Discard truly discards (remove autosave-on-unmount + regression tests)
- **CRI-02** `NextStepBanner` uses stored timezone, not browser-local
- **CRI-03** `reminders.ts:anchorTimeLabel` uses stored timezone
- **CRI-04** `removeWakeTime` recomputes FMV anchor (same invariant as `addWakeTime` / `setBedtime` / void-add)
- **CRI-05** `observations.ts` caffeine-pattern detection filters Day 1

---

## Success criteria (from ROADMAP.md)

1. Opening `LogVoidForm` in edit mode, changing volume from 200 → 350, clicking close X (or Escape / backdrop) → ConfirmDialog appears → clicking "Discard" → store volume remains 200.
2. Same as #1 for `LogDrinkForm` (volume) and `LogLeakForm` (urgency or amount).
3. `NextStepBanner.tsx` uses canonical timezone helpers (`getHoursInTz` / `getDayNumber`); no `new Date().getHours()` remains anywhere outside `utils.ts` time helpers.
4. `reminders.ts:anchorTimeLabel` uses stored timezone for the displayed reminder time string.
5. `removeWakeTime` action triggers `reassignMorningVoid` so FMV anchor stays correct.
6. `observations.ts` caffeine-pattern detection filters out Day 1 events.
7. New regression tests cover all 3 forms' Discard paths + the `removeWakeTime`-FMV-recompute invariant.

---

## Evidence (file:line specifics from the audit)

### CRI-01 — Log{Void,Drink,Leak}Form Discard actually saves

**Audit:** CODE-REVIEW.md findings CR-01 + CR-02

The pattern is identical in all 3 forms:
- Each `Log*Form.tsx` has a `useEffect` cleanup function that calls the store's `update<Type>` action with the form's current state when the component unmounts.
- The intent was "autosave on close" — but Phase 6's explicit Discard ConfirmDialog now provides a user-controlled save/discard signal, so the autosave duplicates (and now overrides) the explicit signal.
- The Discard path: user picks "Discard" → ConfirmDialog closes → parent unmounts the form → the cleanup `useEffect` fires → autosave happens.

**Fix shape:** Remove the autosave-on-unmount `useEffect` entirely from all 3 forms. The explicit Save button is now the only persistence path. Verify each form's existing "Save" button still works.

**Files to touch:**
- `src/components/diary/LogVoidForm.tsx` (remove cleanup `useEffect`)
- `src/components/diary/LogDrinkForm.tsx` (same)
- `src/components/diary/LogLeakForm.tsx` (same)
- `src/components/diary/DayPageClient.tsx` (verify it doesn't depend on the autosave-on-unmount contract — likely just calls `update<Type>` from form's onSave callback)

**Test shape:** New test files (or extend existing) covering:
- `src/__tests__/log-void-form-discard.test.tsx` — render in edit mode with seeded state, change a field, simulate Discard via ConfirmDialog, assert store state unchanged
- Same for LogDrink + LogLeak
- Existing Save-path tests should still pass (no regression)

### CRI-02 — NextStepBanner browser-local time

**Audit:** CODE-REVIEW.md finding HI-02

`src/components/diary/NextStepBanner.tsx:79` calls `new Date().getHours()` to decide what next step to suggest. For a patient with stored tz `Asia/Singapore` browsing from `America/New_York`, the banner thinks it's 8 AM EST when it's actually 8 PM SGT.

**Fix shape:** Read the current stored timezone from the store (`useDiaryStore`), use `getHoursInTz(new Date().toISOString(), tz)` from `src/lib/utils.ts` to get the patient-local hour. Same pattern used by `reminders.ts` after Phase 1.

### CRI-03 — reminders.ts anchorTimeLabel browser-local time

**Audit:** CODE-REVIEW.md finding HI-03

`src/lib/reminders.ts` has an `anchorTimeLabel` function that returns the human-readable reminder time string. It uses `new Date().setHours()` which operates in browser tz.

**Fix shape:** Take `timeZone` as a parameter (already done elsewhere in reminders.ts after Phase 1); use `buildIsoForClockTimeInTz` + `formatTime` from `utils.ts` to construct the locale-correct + tz-correct label.

### CRI-04 — removeWakeTime doesn't recompute FMV

**Audit:** CODE-REVIEW.md MEDIUM finding (number unstated; reference: "removeWakeTime doesn't recompute FMV")

In `src/lib/store.ts`, `addWakeTime`, `setBedtime`, and void-add actions all call `reassignMorningVoid()` after modifying state. `removeWakeTime` does not. If the patient removes the wake-time that anchors the FMV, the FMV stays incorrectly assigned to the now-deleted anchor.

**Fix shape:** Add a `reassignMorningVoid()` call inside `removeWakeTime`'s state-update path. Add a regression test in `src/__tests__/store.test.ts` (or a new file).

### CRI-05 — observations.ts caffeine-pattern Day 1

**Audit:** CODE-REVIEW.md MEDIUM finding (caffeine pattern Day-1 leak)

IPC rule: Day 1 is excluded from 24HV/NPi/AVV computation because it's an adaptation day where patient habits aren't yet representative. `src/lib/observations.ts` caffeine-pattern detection currently aggregates events across Days 1–3 without the Day-1 filter, producing observations like "consistent caffeine pattern" based on adaptation-day data.

**Fix shape:** In the caffeine-pattern aggregation, filter events with `getDayNumber(timestampIso, ...) === 1`. Add a test asserting that an event on Day 1 is excluded from the pattern aggregate.

---

## What's already known (don't re-research)

- The canonical timezone helpers live in `src/lib/utils.ts`: `getDayNumber`, `getHoursInTz`, `getMinutesInTz`, `buildIsoForClockTimeInTz`, `detectTimeZone`, `getTimezoneAbbr`, `getTimezoneOffset`.
- The store (`src/lib/store.ts`) is Zustand + IDB-keyval persist (after Phase 4). Migration v2 → v3 already shipped.
- `reassignMorningVoid` is the canonical FMV-recompute helper in `src/lib/store.ts:29`.
- The ConfirmDialog dirty-state flow is in `DayPageClient.tsx` (Phase 6 work, plan 06-10).
- The `formatTime()` helper in `utils.ts` is locale-aware and Phase 1 verified.
- The IPC Day-1-exclusion rule is documented in memory `ipc-calculations.md` and `docs/TIME_MODEL.md`.

---

## What's explicitly out of scope

- TimelineView refactor (884-line monolith) — v2.
- Premium-features env-gating refactor — v2.
- `jspdf-autotable` type augmentation to remove `@ts-expect-error` — v2 tech debt.
- Any UI changes beyond removing the autosave-on-unmount `useEffect` (no new buttons, no new dialogs — explicit Save + explicit Discard already exist).
- Phase 11 work (h1, aria-live, skip-link, ConfirmDialog position) — separate phase.
- Phase 12 work (SEO + BreadcrumbList) — separate phase.

---

## Constraints

- **No regression on Phase 6's explicit Save flow.** The fix is "remove autosave-on-unmount" — the explicit Save button must continue to work exactly as it did.
- **No regression on Phase 4's IDB-keyval store.** Tests against the v3 store must pass.
- **Time/timezone canonical module is the source of truth.** Any timezone code outside `utils.ts` is a smell.
- **Single store invariant.** FMV anchor recomputes consistently across `addWakeTime` / `setBedtime` / `removeWakeTime` / void-add — no exceptions.
- **6-locale parity** still enforced by hooks; this phase adds no new i18n keys.

---

## Key planning questions to surface

1. **Plan splitting.** Logical groupings: (a) one plan per requirement (5 plans); (b) bundled by surface: 1 plan for the 3 form Discard fixes + tests, 1 plan for the 2 timezone leaks, 1 plan for `removeWakeTime` + observations.ts Day-1 filter; (c) one plan for "remove autosave-on-unmount + tests" + one for "timezone + invariant cleanup". Recommend (b) — 3 plans.
2. **Discard test mechanics.** How exactly is the Discard ConfirmDialog triggered in a unit test? Render the form with dirty state, simulate `onClose` callback → DayPageClient shows ConfirmDialog → click Discard button. This is integration-test territory. Document the test approach in the relevant plan.
3. **Save-path regression coverage.** Need to confirm existing Save-button tests still pass after autosave-on-unmount removal. If no such tests exist, the plan should add minimal Save-path tests as guardrails.
4. **DayPageClient interaction.** Phase 6 wired `onDirtyChange` from forms to DayPageClient; does the autosave-on-unmount removal affect that signal? Probably not (onDirtyChange is independent of unmount), but verify.
5. **Wave structure.** Likely all 3 plans can run in parallel (different files, no overlap). Wave 1 (all 3 in parallel) + Wave 2 (verification spec).

---

## Related artifacts

- `.planning/audits/2026-05-18-comprehensive-audit/CODE-REVIEW.md` — primary audit source
- `.planning/audits/2026-05-18-comprehensive-audit/FINDINGS.md` — synthesis
- `docs/TIME_MODEL.md` — canonical time-model gotchas reference
- `src/__tests__/store.test.ts` — existing store-action regression tests (extend pattern)
- `src/lib/store.ts:reassignMorningVoid` — the FMV-recompute helper
- `src/components/diary/DayPageClient.tsx` — Phase 6 ConfirmDialog wiring
