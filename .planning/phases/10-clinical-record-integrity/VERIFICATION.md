---
phase: 10-clinical-record-integrity
verified: 2026-05-18T00:00:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Live 6-locale walkthrough — render NextStepBanner branch under a stored tz different from browser tz; confirm correct text on screen across en/fr/es/pt/zh/ar."
    expected: "Bedtime branch shows in SGT-stored patient at SGT 20:00 regardless of browser local time; keep-logging branch shows otherwise. Text fluent in all 6 locales."
    why_human: "Visual rendering + locale-specific copy fluency cannot be programmatically asserted; the Playwright spec asserts en + ar only, leaves fr/es/pt/zh to human eyeball per Plan 10-04 §394."
  - test: "Live 6-locale walkthrough — open LogVoidForm in edit mode, change volume, click close X, observe ConfirmDialog, click Discard, confirm timeline shows original volume."
    expected: "Original volume is preserved in the timeline list after Discard. Same for LogDrinkForm + LogLeakForm. Same across 6 locales."
    why_human: "ConfirmDialog stacking + BottomSheet sequencing animation + i18n copy must be eye-verified per Plan 10-04 §394; unit tests cover the contract, integration spec covers en + ar, but full 6-locale UX needs human."
  - test: "Live 6-locale walkthrough — complete Day 1, observe Day1Celebration with reminder anchor selector, confirm anchor-time label uses the patient's stored timezone."
    expected: "Selecting 'wake' shows 7:00 AM in stored tz; 'coffee' shows 8:00 AM; 'bathroom' shows 7:15 AM. All in the locale's number/format style."
    why_human: "Per Plan 10-04 §394 — Day1Celebration is a one-shot peak-end surface that's hard to reach in automated specs without disrupting the natural completion flow."
---

# Phase 10 — Clinical Record Integrity — Verification

**Verified:** 2026-05-18
**Status:** GOAL ACHIEVED
**Score:** 5/5 CRI requirements verified at source + test + integration layers

## Verdict

**GOAL ACHIEVED.**

The phase goal — "the clinical record the patient submits reflects exactly what they intended to submit; the time displayed on every UI surface matches the patient's stored timezone, not their browser's wall clock" — is demonstrably true in the shipped codebase at HEAD `97840ed`. All 5 CRI requirements pass goal-backward verification at the source-code, unit-test, and (where applicable) integration-test layers. The 3 deferred React-19 lint warnings noted in `deferred-items.md` are pre-existing on `main` (verified independently via `git log`) and are out of scope for clinical-record-integrity — they do not gate Phase 10 close-out.

Three human-verification items remain (all UX-quality, all noted in Plan 10-04 §394). They are part of the planned close-out workflow, not gaps.

## Requirement coverage (goal-backward)

| Req    | Goal-backward question                                                                                                                         | Evidence (file:line)                                                                                                                                                                                                                                                                                                                                                                                                              | Status     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| CRI-01 | Does clicking Discard actually discard the dirty edit across all 3 edit forms? Is the autosave-on-unmount cleanup truly gone?                  | `src/components/diary/LogVoidForm.tsx:143-145` (only `useEffect` is `onDirtyChange` notifier, NOT a save); `LogDrinkForm.tsx:126-128` (same); `LogLeakForm.tsx:96-98` (same). All store-writes exclusively inside `handleSave` (`LogVoidForm.tsx:194`, `LogDrinkForm.tsx:161`, `LogLeakForm.tsx:132`). `DayPageClient.tsx:284-287` discard path is `handleDiscardConfirm` → `closeSheet` — no store-writes anywhere on this path. | ✓ VERIFIED |
| CRI-02 | Does NextStepBanner read the patient's stored timezone, not the browser's clock?                                                               | `src/components/diary/NextStepBanner.tsx:81` — `const hour = getHoursInTz(new Date().toISOString(), timeZone)`. `timeZone` destructured from `useDiaryStore` at line 36. No `new Date().getHours()` anywhere in file. Marker comment at line 80 (`See docs/TIME_MODEL.md (CRI-02)`).                                                                                                                                              | ✓ VERIFIED |
| CRI-03 | Does the reminder time label match the patient's stored timezone? Do both callers pass the timezone?                                           | `src/lib/reminders.ts:16-24` — `anchorTimeLabel(anchor, locale, timeZone?)` uses `buildIsoForClockTimeInTz(now, h, m, timeZone)` + `formatTime(iso, locale, timeZone)`. No `setHours` in this file. Callers: `Day1Celebration.tsx:45` passes `timeZone` from store; `Day2ReminderCard.tsx:37` passes `timeZone` from store. ICS path (`toIcsLocal`) intentionally untouched — RFC 5545 floating-local is correct.                  | ✓ VERIFIED |
| CRI-04 | Does removing a wake-time properly clear the stale FMV anchor? Does the no-wake branch of `reassignMorningVoid` actively clear stale flags?    | `src/lib/store.ts:330-337` — `removeWakeTime` now calls `reassignMorningVoid(s.voids, dayNumber, s.startDate, s.bedtimes, newWakeTimes, s.timeZone)` after filtering — exact mirror of `setWakeTime` (line 322-329). `reassignMorningVoid` no-wake branch lines 41-55 actively reassigns `isFirstMorningVoid: false` for affected-day voids while preserving object identity for unaffected voids.                                | ✓ VERIFIED |
| CRI-05 | Does the caffeine-pattern observation correctly exclude Day 1 events at BOTH the drink and matched-void level?                                 | `src/lib/observations.ts:80-92` — `isDayOne` helper uses canonical `getDayNumber`. Both `caffeineDrinks.filter(...&& !isDayOne(d.timestampIso))` AND `eligibleVoids = voids.filter(v => !isDayOne(v.timestampIso))`. Both `caffeineDrinks.length >= 2` and `followed >= 2` gates ensure no single Day-2 drink triggers the observation. Other observation branches deliberately untouched per ME-05 defer guidance.                | ✓ VERIFIED |

## Goal-level invariants

### Invariant 1: "Discard saves anyway" is closed across all 3 edit forms

**Confirmed.** The autosave-on-unmount `useEffect` cleanup is provably absent from all 3 Log\*Form components. Each file has exactly one `useEffect` (the `onDirtyChange` notifier, which calls a prop callback for Phase 6's ConfirmDialog dirty-state plumbing — explicitly NOT a store-write). The only store-writes in each form are inside `handleSave`, which is invoked exclusively by the explicit Save button or the keyboard Enter handler on the final step.

The Phase 6 dirty-state plumbing is preserved end-to-end: form's `onDirtyChange` → `setActiveFormDirty` in DayPageClient → `handleSheetClose` checks `activeFormDirty` → opens `ConfirmDialog` if dirty → `handleDiscardConfirm` → `closeSheet` (resets only local UI state, no store mutation) → form unmounts cleanly. The CR-02 race condition is structurally eliminated because no autosave fires on unmount; there's nothing to race.

`savedRef` is retained per design (as a no-op marker on the Save path) with an explanatory comment in each file. This is intentional — its removal would destabilize the long `handleSave` `useCallback` deps array without behavioral benefit.

### Invariant 2: Browser-local-time leaks are eliminated outside `src/lib/utils.ts`

**Confirmed.** Project-wide grep across `src/` finds:
- `.getHours()`: 1 production hit, exactly the canonical no-tz fallback at `src/lib/utils.ts:37`.
- `.setHours(`: 1 production hit, exactly the canonical internal use at `src/lib/utils.ts:89` inside `buildIsoForClockTimeInTz`.
- No autosave-on-unmount marker (`if (savedRef.current) return`) in any of the 3 Log\*Form files (`:0` each).

`NextStepBanner.tsx:81` uses `getHoursInTz`. `reminders.ts:anchorTimeLabel` uses `buildIsoForClockTimeInTz` + `formatTime`. The `Date.now() - new Date(lastIso).getTime()` arithmetic at `NextStepBanner.tsx:48` is UTC-millisecond subtraction — timezone-invariant by construction.

### Invariant 3: FMV anchor invariant is consistent across all four mutation paths

**Confirmed.** `addVoid`, `updateVoid`, `removeVoid`, `setBedtime`, `removeBedtime`, `setWakeTime` ALL call `reassignMorningVoid` after their state changes — and `removeWakeTime` now mirrors them. The helper's no-wake branch (added in this phase at `store.ts:41-55`) actively clears stale `isFirstMorningVoid: true` flags on affected-day voids while preserving object identity for unaffected voids (React-Zustand reference-equality preservation is intact).

Cross-day isolation is preserved: removing a wake on Day 1 does NOT mutate Day 2 FMV state (validated by Test C in `store.test.ts:309-328`).

### Invariant 4: IPC Day-1-exclusion rule is honored in summary observations

**Confirmed.** The `observations.ts` caffeine-pattern aggregator now filters Day 1 at BOTH levels — drinks and matched voids — via canonical `getDayNumber`. The defense at the void level is the load-bearing one: a Day-2-attributed caffeine drink whose follow-up void lands on Day-1-attributed time (rare but possible across bedtime-aware day bumps) is excluded too.

The existing positive caffeine test at `observations.test.ts:56-71` (3 drinks across Days 1/2/3 each followed by a void) is correctly preserved: the Day-1 drink is filtered out, the remaining 2 Day-2/Day-3 drinks meet the `>= 2` gate, both followups within window meet the `followed >= 2 && followed/total >= 0.5` gate (2/2 = 1.0), and the observation still emits. The new Test F regression guard at `observations.test.ts:152-167` pins this contract independently with a Day-2/Day-3-only data shape.

### Invariant 5: Future contributors cannot accidentally re-introduce the bug patterns

**Confirmed.** Static-code drift guards are wired into the vitest suite at 5 source-file levels:

- `log-{void,drink,leak}-form-discard.test.tsx` Test 4 — `readFileSync` on each Log\*Form, assert `not.toContain('if (savedRef.current) return')`, `not.toContain('eslint-disable-next-line react-hooks/exhaustive-deps')`, `not.toMatch(/\bformRef\b/)`. LeakForm adds `not.toContain('Auto-save on unmount')`. Any re-introduction of the autosave fingerprint fails this test on next run.
- `next-step-banner-tz.test.tsx` Test 3 — `readFileSync` on NextStepBanner.tsx, assert `not.toContain('new Date().getHours()')`, `toContain('getHoursInTz')`, `toContain('CRI-02')`.
- `reminders.test.ts` Test 5 — `readFileSync` on reminders.ts, assert `not.toContain('d.setHours')`, `not.toMatch(/\.setHours\(/)`, `toContain('buildIsoForClockTimeInTz')`, `toContain('formatTime')`, `toContain('CRI-03')`.

Combined with the behavioral regression tests (each requirement has 3-5 behavioral tests), the contract surface is well-defended. A future contributor who introduces a regression of any of these 5 patterns will see a test failure with a clear "CRI-NN regression" trace.

The static-drift guards are appropriately scoped — they catch the exact bug fingerprints documented in the audit (CR-01, CR-02, HI-02, HI-03, the 2 medium findings). They cannot catch novel autosave or browser-tz patterns that don't match these specific signatures, but that is the appropriate tradeoff: behavioral tests (CRI-02 Test 1 with Asia/Singapore at UTC 12:00, CRI-04 Test B clearing FMV, etc.) catch broader functional regressions even when the syntactic fingerprint changes.

## Test coverage map

| Requirement | Source-level fix                                                                                                                                                | Unit/integration tests (Wave 1)                                                                                                                                                                                                  | Integration tests (Wave 2)                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| CRI-01      | `LogVoidForm.tsx`, `LogDrinkForm.tsx`, `LogLeakForm.tsx` — autosave-on-unmount `useEffect` removed; `savedRef` retained as no-op marker; `formRef` deleted     | `log-void-form-discard.test.tsx` (4 tests), `log-drink-form-discard.test.tsx` (4 tests), `log-leak-form-discard.test.tsx` (4 tests). Each includes static-code drift guard.                                                       | `phase10-clinical-record-integrity.spec.ts` lines 495-766: 4 PW tests (en + ar/RTL) |
| CRI-02      | `NextStepBanner.tsx:81` — `getHoursInTz(new Date().toISOString(), timeZone)`                                                                                    | `next-step-banner-tz.test.tsx` (3 tests: Asia/Singapore bedtime branch, America/New_York keep-logging branch, static-code drift guard)                                                                                            | Lines 767-823: 2 PW tests (SGT-stored + NYC-stored at same UTC instant)             |
| CRI-03      | `reminders.ts:16-24` — `anchorTimeLabel(anchor, locale, timeZone?)` uses canonical helpers; `Day1Celebration.tsx:45` + `Day2ReminderCard.tsx:37` pass timeZone | `reminders.test.ts` (5 tests: en-US + Singapore, en-US + Kolkata half-hour offset, null anchor default, undefined-tz back-compat, static-code drift guard)                                                                        | Lines 825-886: 1 PW test (Day2ReminderCard, Asia/Kolkata, en)                       |
| CRI-04      | `store.ts:330-337` — `removeWakeTime` mirrors `setWakeTime`; helper's no-wake branch `store.ts:41-55` actively clears stale `isFirstMorningVoid`                | `store.test.ts:285-329` (Tests A/B/C: setWakeTime flags FMV; removeWakeTime clears it; per-day isolation)                                                                                                                         | Lines 888-982: 1 PW test (live UI removeWakeTime → FMV cleared on timeline)         |
| CRI-05      | `observations.ts:80-92` — Day-1 filter via canonical `getDayNumber` at both drink and matched-void levels                                                       | `observations.test.ts:99-168` (Tests D/E/F: Day-1-only caffeine does not emit; mixed-day emits with correct count; Day-2/3-only pattern still emits as regression guard). Pre-existing positive test at lines 56-71 still passes. | Lines 984-1008: 1 PW test (Day-1-only pattern does not emit on summary)             |

**Total new test cases:** 12 (CRI-01) + 3 (CRI-02) + 5 (CRI-03) + 3 (CRI-04) + 3 (CRI-05) + 9 Playwright = 26 new vitest cases + 9 PW tests. Matches commit-message claims (504 → 530 vitest, +26).

**Drift-guard coverage:** 5 of 5 source files in the CRI patch surface (3 Log\*Form, NextStepBanner, reminders) have grep-style `readFileSync + expect.not.toContain` guards in vitest. This is the strongest realistic protection against contributor drift on the specific bug fingerprints.

## Deferred items

3 React-19 lint warnings are explicitly deferred to a future "React-19 purity sweep" phase, documented in `.planning/phases/10-clinical-record-integrity/deferred-items.md`:

1. `NextStepBanner.tsx:48` — `react-hooks/purity` on `Date.now()` (impure call during render).
2. `Day1Celebration.tsx:40` — `react-hooks/set-state-in-effect` (`setSelected(null)` inside useEffect).
3. `store.ts:425` (post-Plan-10-03 line numbering) — `react-hooks/set-state-in-effect` in `useStoreHydrated`.

**These are NOT gaps.** All 3 are verified pre-existing on `main`:
- `useStoreHydrated` was introduced in commit `a363449` (Phase predating Phase 10) and the same pattern lives upstream of any Phase 10 work.
- `Day1Celebration.tsx:40` is on a code path Phase 10 did not modify.
- `NextStepBanner.tsx:48` is `Date.now()` (UTC milliseconds, timezone-invariant) — a different concern from CRI-02's `getHours()` browser-tz semantic bug. Fixing the purity warning would require `useState + useEffect` snapshotting or `useSyncExternalStore` — a behavior-changing refactor unrelated to clinical-record integrity.

Phase 10 verification gates were adjusted from "no lint errors on any file in the patch" to "no NEW lint errors on changed files" — see deferred-items.md §Disposition. The 3 pre-existing warnings are now tracked for a focused hygiene phase, scheduled by the user when convenient.

## Production readiness

### Auto-verified before push (all confirmed at HEAD `97840ed`)

- All 5 CRI requirements implemented at the source-code level (all source files reviewed in this verification).
- 26 new vitest test cases + 9 Playwright tests cover all 5 requirements at both behavioral and static-drift layers.
- Project-wide grep guards confirm no browser-tz leak (`.getHours()` / `.setHours(` exclusively in `src/lib/utils.ts`); no autosave-on-unmount marker in any of the 3 Log\*Form files; `reassignMorningVoid` is called inside `removeWakeTime`; `isDayOne` exists in `observations.ts`.
- CRI markers present in all 5 source files for contributor visibility (`CRI-01` in 3 forms, `CRI-02` in NextStepBanner, `CRI-03` in reminders.ts, `CRI-04` in store.ts × 2, `CRI-05` in observations.ts).
- Phase 6 explicit-Save flow preserved end-to-end (DayPageClient.tsx wiring intact at lines 265-292; form `onDirtyChange` callbacks unchanged at lines 384, 395, 406).
- ICS floating-local path in `buildDiaryIcs` correctly left untouched per RFC 5545.
- Pre-existing `wake-time-edit-bug.test.ts` is unaffected by the new CRI-04 clearing behavior because none of its tests exercise `removeWakeTime` (verified by grep).
- Pre-existing positive caffeine test at `observations.test.ts:56-71` still passes after the Day-1 filter (verified by trace: 3 drinks across Day1/2/3 → filter retains 2 → meets `>= 2` gate → both followed → emits).

### Human-eyeball verification required before merge

Per Plan 10-04 Task 4 (`gate="blocking"`), the user runs through all 6 locales on a local production build to confirm:

1. **CRI-01 Discard UX**: Edit a void/drink/leak entry, change a field, close via X / Escape / backdrop, observe the ConfirmDialog, click Discard, verify the timeline preserves the original value. Repeat across en/fr/es/pt/zh/ar.
2. **CRI-02 NextStepBanner**: Set the stored timezone to something different from the browser's (e.g. Asia/Singapore while in NYC), verify the bedtime vs keep-logging branch fires based on stored-tz hour. Repeat per locale for copy fluency.
3. **CRI-03 Reminder anchor labels**: Complete Day 1 to reach Day1Celebration, select each of the 3 anchor options, verify the displayed time is in stored tz and reads naturally per locale.

These cannot be programmatically verified at scale without a 6-locale Playwright matrix (out of scope for Phase 10 per Plan 10-04 §30: "Locale matrix: en + ar for CRI-01 keeps CI cost predictable").

### Risks at deploy time

- **None identified at the code level.** The phase is additive (removing autosave) or extending an existing canonical-helper pattern (Phases 1-2). No new dependencies, no new env vars, no new build artifacts, no service-worker cache-bump needed.
- The user's noted manual step (local-serve verification) is the canonical pre-deploy gate — the daily 6-locale production walkthrough cron will re-verify post-deploy.

### Recommended next phases

- **React-19 purity sweep** (deferred from Phase 10) to clear the 3 remaining lint warnings as a coherent hygiene plan.
- **Phase 11** (h1, aria-live, skip-link, ConfirmDialog position) — already scoped per CONTEXT.md "Out of scope".
- **Phase 12** (SEO + BreadcrumbList) — already scoped per CONTEXT.md.

---

_Verified: 2026-05-18_
_Verifier: Claude (gsd-verifier)_
_Goal-backward methodology: verified observable truths in shipped code at HEAD `97840ed`, not SUMMARY.md claims._
