---
phase: 260514-ndz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/utils.ts
  - src/lib/notifications.ts
  - src/app/[locale]/LandingContent.tsx
  - src/lib/observations.ts
autonomous: true
requirements: [STAB-01, STAB-02, STAB-03]

must_haves:
  truths:
    - "formatDate / Intl-based date formatters render correctly for pt, zh, ar locales (no silent en-US fallback)"
    - "Reminders fire at 8am/2pm/9pm in the patient's STORED timezone (state.timeZone), not the browser's local zone"
    - "Day-attribution in observations.ts produces the same dayNumber as utils.getDayNumber for every (timestamp, startDate, bedtimes, tz) tuple"
    - "observations.ts has no duplicated copies of getHourInTz / getDateInTz / day-boundary logic"
    - "Full vitest suite (npx vitest run) passes after all 3 commits"
  artifacts:
    - path: src/lib/utils.ts
      provides: "INTL_LOCALES map covering all 6 supported locales (en/fr/es/pt/zh/ar)"
      contains: "'pt': 'pt-PT'"
    - path: src/lib/notifications.ts
      provides: "scheduleReminders(timeZone?) and scheduleDiaryCompleteReminder(startDate, timeZone?) that honor stored tz"
      exports: ["scheduleReminders", "scheduleDiaryCompleteReminder", "getNotificationPermission", "requestNotificationPermission", "cancelReminders"]
    - path: src/lib/observations.ts
      provides: "Observation generator that delegates day-boundary and tz-hour logic to utils.ts"
      contains: "import { getDayNumber, getHoursInTz } from './utils'"
  key_links:
    - from: "src/app/[locale]/LandingContent.tsx"
      to: "src/lib/notifications.ts"
      via: "scheduleReminders(tz); scheduleDiaryCompleteReminder(selectedDate, tz)"
      pattern: "scheduleReminders\\(tz\\)"
    - from: "src/lib/observations.ts"
      to: "src/lib/utils.ts"
      via: "import getDayNumber and getHoursInTz, no local re-implementation"
      pattern: "from '\\./utils'"
    - from: "src/lib/utils.ts (INTL_LOCALES)"
      to: "src/i18n/seo.ts (OG_LOCALE)"
      via: "BCP 47 codes derived from the same source (underscores → dashes)"
      pattern: "pt-PT.*zh-CN.*ar-SA"
---

<objective>
Fix the top 3 silent bugs from CONCERNS.md in a single tight pass:
- STAB-01: Intl locale map missing pt/zh/ar (silent en-US fallback for 50% of supported locales)
- STAB-02: Reminders use browser-local time instead of the patient's stored timezone (8am SGT reminder fires at 8am EST for a NA clinician simulating a Singapore patient)
- STAB-03: observations.ts re-implements day-boundary logic with subtle drift from utils.getDayNumber (the `hour <= 5` guard is missing the canonical implementation's bedtime cross-check)

Purpose: All three are non-crashing silent failures that produce wrong output without any test or runtime signal. Each fix is small, scoped to a single concern, and isolatable in one commit. The cumulative effect — correct dates for all locales, reminders that target patient-time, observations that exactly match canonical day-attribution — restores trust in the diary's i18n and time-model invariants documented in `docs/TIME_MODEL.md`.

Output: 3 atomic commits, each with its own STAB- ID in the message, plus a final test-suite sweep.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/codebase/CONCERNS.md
@./CLAUDE.md
@./docs/TIME_MODEL.md
@src/lib/utils.ts
@src/lib/notifications.ts
@src/lib/observations.ts
@src/app/[locale]/LandingContent.tsx
@src/i18n/seo.ts
@src/i18n/config.ts

<interfaces>
<!-- Canonical signatures from utils.ts that all three tasks reuse. Extracted so executor doesn't need to grep. -->

From src/lib/utils.ts:
```ts
// Hour 0-23 of an ISO timestamp, evaluated in a given IANA tz.
export function getHoursInTz(isoString: string, timeZone?: string): number;

// "YYYY-MM-DD" date in a given IANA tz.
export function getDateInTz(isoString: string, timeZone?: string): string;

// Builds an ISO timestamp for (date-of `baseIso` in `timeZone`) at clock-time hh:mm in `timeZone`.
export function buildIsoForClockTimeInTz(
  baseIso: string,
  hh: number,
  mm: number,
  timeZone?: string,
): string;

// Diary day number (1/2/3) for an event timestamp, honoring startDate, bedtimes, and tz.
export function getDayNumber(
  timestampIso: string,
  startDate: string,
  bedtimes: BedtimeEntry[],
  timeZone?: string,
): 1 | 2 | 3;

// Browser-detected IANA tz (e.g. "Asia/Singapore"). Used at onboarding only.
export function detectTimeZone(): string;
```

From src/i18n/seo.ts (source of truth for locale codes):
```ts
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US', fr: 'fr_FR', es: 'es_ES',
  pt: 'pt_PT', zh: 'zh_CN', ar: 'ar_SA',
};
```
Intl API uses dashes, not underscores — convert when populating INTL_LOCALES.

From src/lib/types.ts (DiaryState shape used in observations.ts):
```ts
interface DiaryState {
  startDate: string;        // "YYYY-MM-DD"
  timeZone?: string;        // IANA tz
  bedtimes: BedtimeEntry[];
  voids: VoidEntry[];
  drinks: DrinkEntry[];
  wakeTimes: WakeEntry[];
}
```

Call site to update (src/app/[locale]/LandingContent.tsx line 52):
```ts
const handleOnboardingComplete = async (age: number, selectedDate: string, volumeUnit: 'mL' | 'oz', tz: string) => {
  // ...
  scheduleReminders();                          // ← needs tz argument
  scheduleDiaryCompleteReminder(selectedDate);  // ← needs tz argument
};
```
The local parameter name is `tz` (the destructured store field is `timeZone`); pass `tz`.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: STAB-01 — Expand INTL_LOCALES to cover all 6 supported locales</name>
  <files>src/lib/utils.ts</files>
  <action>
At line 8 of src/lib/utils.ts, replace the 3-entry `INTL_LOCALES` map with a 6-entry map covering all locales in src/i18n/config.ts. BCP 47 codes must match the underscore form in `OG_LOCALE` (src/i18n/seo.ts) but with dashes for Intl API consumption. Use multi-line object literal for readability since it grows past 3 entries.

Final shape:
- en → en-US
- fr → fr-FR
- es → es-ES
- pt → pt-PT
- zh → zh-CN
- ar → ar-SA

Do not change `toIntlLocale` or any other code in the file. The fallback `|| 'en-US'` stays — it now only fires for truly unknown locales, not for half of our supported set.

After the edit, run the verify command. Then commit with the exact message in <done>. This is task 1 of 3; do not bundle with subsequent tasks' commits.
  </action>
  <verify>
    <automated>cd /Users/zhen/bladderdiary-patient && npx vitest run src/__tests__/utils.test.ts && grep -qE "pt: ['\"]pt-PT['\"]" src/lib/utils.ts && grep -qE "zh: ['\"]zh-CN['\"]" src/lib/utils.ts && grep -qE "ar: ['\"]ar-SA['\"]" src/lib/utils.ts && echo "STAB-01 OK"</automated>
  </verify>
  <done>
INTL_LOCALES has 6 entries (en/fr/es/pt/zh/ar). utils.test.ts passes. Spot-check (manual): in a node REPL or browser console, `new Intl.DateTimeFormat('pt-PT').format(new Date())` returns a Portuguese date — no exception, no en-US fallback. Commit created: `fix(stab-01): INTL_LOCALES covers all 6 supported locales`.
  </done>
</task>

<task type="auto">
  <name>Task 2: STAB-02 — Reminders honor patient stored timezone</name>
  <files>src/lib/notifications.ts, src/app/[locale]/LandingContent.tsx</files>
  <action>
Convert all reminder scheduling in `src/lib/notifications.ts` from browser-local Date math to tz-aware ISO math, then update the single call site in `LandingContent.tsx`.

Step 1 — `src/lib/notifications.ts`:
1. Add import at top of file: `import { buildIsoForClockTimeInTz, getDateInTz } from './utils';`
2. Update the header comment block: change the "Reminder schedule (local time)" bullet group to read "Reminder schedule (in the patient's stored timezone — falls back to browser-local if no tz stored)". Keep the three time/title/body lines unchanged.
3. Change `getNextOccurrence(hour, minute)` signature to `getNextOccurrence(hour: number, minute: number, timeZone?: string): Date`. Replace its body so that, when `timeZone` is provided:
   - Today's date in the user's tz is computed via `getDateInTz(new Date().toISOString(), timeZone)`.
   - The target ISO is built via `buildIsoForClockTimeInTz(<today-iso>, hour, minute, timeZone)` where `<today-iso>` is `${todayDateStr}T12:00:00.000Z` (the noon-anchor pattern that utils.ts uses elsewhere to avoid DST-edge drift).
   - If the resulting Date is `<= now`, compute tomorrow's date string in the same tz (parse → addDays(1) → format `YYYY-MM-DD`, or equivalent), rebuild the target with `buildIsoForClockTimeInTz`, and return that Date.
   - When `timeZone` is `undefined`, preserve the existing browser-local fallback (so the function stays backwards-safe for any callers that don't yet pass a tz).
4. Change `scheduleReminders()` signature to `scheduleReminders(timeZone?: string): void`. Inside the `scheduleNext` closure, pass `timeZone` through to `getNextOccurrence(reminder.hour, reminder.minute, timeZone)`.
5. Change `scheduleDiaryCompleteReminder(startDate)` signature to `scheduleDiaryCompleteReminder(startDate: string, timeZone?: string): void`. Replace the body:
   - Build the start-anchor via `buildIsoForClockTimeInTz(`${startDate}T12:00:00.000Z`, 9, 0, timeZone)` when tz is set; fall back to the existing `new Date(startDate + 'T09:00:00')` when tz is undefined.
   - Add 3 calendar days by `Date.parse(startIso) + 3 * 86_400_000`. Calendar-day addition is safe here because the IPC diary is 3 calendar days from startDate; we do not need to re-anchor at 9am-in-tz on day 4 (the existing implementation also uses fixed-ms offset).
   - Keep the early-return `if (delay <= 0) return;` guard.
   - Keep the showNotification call and timer registration unchanged.

Do not touch `showNotification`, `cancelReminders`, `getNotificationPermission`, or `requestNotificationPermission` — they have no time-model dependency.

Step 2 — `src/app/[locale]/LandingContent.tsx`:
At lines 61-62 inside `handleOnboardingComplete`, change:
```tsx
scheduleReminders();
scheduleDiaryCompleteReminder(selectedDate);
```
to:
```tsx
scheduleReminders(tz);
scheduleDiaryCompleteReminder(selectedDate, tz);
```
The parameter name in scope is `tz` (the function parameter at line 52), not `timeZone` (which is the destructured store field at line 39 — also valid but `tz` is what the function signature exposes; use `tz` for consistency with the spec).

Do not change any other code in LandingContent.tsx (in particular, do not touch the destructure or `setTimeZone` call).

After edits, run the verify command. Type-check is the gate since there are no notifications-specific unit tests. Then commit.
  </action>
  <verify>
    <automated>cd /Users/zhen/bladderdiary-patient && npx tsc --noEmit && grep -q "scheduleReminders(tz)" src/app/[locale]/LandingContent.tsx && grep -q "scheduleDiaryCompleteReminder(selectedDate, tz)" src/app/[locale]/LandingContent.tsx && grep -q "timeZone?: string" src/lib/notifications.ts && grep -q "buildIsoForClockTimeInTz" src/lib/notifications.ts && echo "STAB-02 OK"</automated>
  </verify>
  <done>
notifications.ts has tz-aware `getNextOccurrence` / `scheduleReminders` / `scheduleDiaryCompleteReminder`; header comment notes the tz behavior; LandingContent.tsx passes `tz` to both schedulers. `tsc --noEmit` clean. Manual spot-check (optional, not gating): set diary timezone to `Asia/Singapore` from a `America/New_York` browser; the computed delay until the morning reminder should target 8 AM SGT (≈12 hours offset from EST), not 8 AM EST. Commit created: `fix(stab-02): reminders honor patient stored timezone instead of browser-local`.
  </done>
</task>

<task type="auto">
  <name>Task 3: STAB-03 — Dedupe day-attribution in observations.ts via utils.getDayNumber</name>
  <files>src/lib/observations.ts</files>
  <action>
Replace the three locally-duplicated helpers in `src/lib/observations.ts` with delegations to the canonical utils.ts implementations.

Step 1 — Add the import. Locate the existing line `import type { DiaryState, VoidEntry, DrinkEntry, DrinkType } from './types';` (around line 18). Immediately after it (or merged above it, your choice — both are conventional), add:
```ts
import { getDayNumber, getHoursInTz } from './utils';
```
The two-import pattern (one `type`-only from ./types, one value-import from ./utils) is fine; this module is not part of any documented circular-dep risk — observations.ts is a leaf of the dep graph, called only by summary UI.

Step 2 — Replace `isVoidOnDay` (lines 165-183). The new body is a single delegation:
```ts
function isVoidOnDay(v: VoidEntry, dayNumber: 1 | 2 | 3, state: DiaryState): boolean {
  return getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNumber;
}
```
This eliminates the subtly-wrong `hour <= 5` early-AM pull-back which, in observations.ts, lacked the bedtime cross-check that utils.getDayNumber has — see CONCERNS.md STAB-03 diagnosis.

Step 3 — Replace the call site at line 92. Currently:
```ts
const hr = getHourInTz(d.timestampIso, state.timeZone);
```
Change to:
```ts
const hr = getHoursInTz(d.timestampIso, state.timeZone);
```
Note the `s` — `getHoursInTz` (plural) is the canonical name in utils.ts. The semantics are identical (hour 0-23 in given tz with the same "24 → 0" handling).

Step 4 — Delete the now-unreferenced local helpers:
- Delete `getHourInTz` (lines 148-158, including the JSDoc above it).
- Delete `getDateInTz` (lines 185-194).
- The JSDoc above the OLD `isVoidOnDay` (lines 160-164) describes "re-derive instead of importing" — that comment is now obsolete. Remove it (it lived above the replaced function, so it'll be naturally adjacent to the deletion).

After edits, the only functions left in the module should be: `hourBucket`, `drinkFollowedByVoid`, `generateObservations`, and the new one-line `isVoidOnDay`. No local date/time math remains.

Run the verify command. Three test files exercise day-attribution and tz-hour buckets, so they'll catch any subtle behavior change. The expected outcome is identical or strictly more correct output (the `hour <= 5` pull-back will now consult bedtimes, matching utils.getDayNumber's invariants documented in docs/TIME_MODEL.md). Then commit.
  </action>
  <verify>
    <automated>cd /Users/zhen/bladderdiary-patient && npx vitest run src/__tests__/observations.test.ts src/__tests__/boundaries.test.ts src/__tests__/edge-wake-times.test.ts && grep -q "from './utils'" src/lib/observations.ts && grep -q "getDayNumber" src/lib/observations.ts && ! grep -q "function getHourInTz" src/lib/observations.ts && ! grep -q "function getDateInTz" src/lib/observations.ts && echo "STAB-03 OK"</automated>
  </verify>
  <done>
observations.ts imports `getDayNumber` and `getHoursInTz` from ./utils. Local `getHourInTz` and `getDateInTz` functions are gone. `isVoidOnDay` is a single-line delegation to `getDayNumber`. observations.test.ts, boundaries.test.ts, and edge-wake-times.test.ts all pass. Commit created: `fix(stab-03): observations.ts reuses utils.getDayNumber (no duplicated day-boundary logic)`.
  </done>
</task>

</tasks>

<verification>
After all 3 tasks complete and 3 commits are made, run the full test suite once:

```
cd /Users/zhen/bladderdiary-patient && npx vitest run
```

Expected: all suites pass. If any test regresses, surface the failing test name and error message clearly in the SUMMARY.md, but do not revert or amend the already-made commits — each fix is independently correct and the regression (if any) is a separate problem to diagnose. Likely zero regressions because:
- STAB-01 only ADDS map entries; no existing entries change.
- STAB-02 only adds a parameter; old call signature falls back to browser-local.
- STAB-03 delegates to a function that 3 existing test suites already validate.

Then run TypeScript:
```
cd /Users/zhen/bladderdiary-patient && npx tsc --noEmit
```
Expected: no new errors.
</verification>

<success_criteria>
- INTL_LOCALES has 6 entries (one per locale in src/i18n/config.ts); BCP 47 codes use dashes and match the underscore form of OG_LOCALE.
- src/lib/notifications.ts imports `buildIsoForClockTimeInTz` and `getDateInTz` from ./utils.
- `scheduleReminders` and `scheduleDiaryCompleteReminder` accept an optional `timeZone` parameter and use it for tz-aware scheduling.
- src/app/[locale]/LandingContent.tsx passes `tz` to both schedulers.
- src/lib/observations.ts imports `getDayNumber` and `getHoursInTz` from ./utils.
- src/lib/observations.ts no longer defines local `getHourInTz` or `getDateInTz` functions.
- `isVoidOnDay` is a one-line delegation to `getDayNumber`.
- 3 commits exist with messages: `fix(stab-01): ...`, `fix(stab-02): ...`, `fix(stab-03): ...`.
- `npx vitest run` exits 0; `npx tsc --noEmit` exits 0.
</success_criteria>

<output>
After completion, create `.planning/quick/260514-ndz-fix-stab-01-02-03-top-3-silent-bugs-from/260514-ndz-SUMMARY.md` documenting:
- The 3 commits (hashes and one-line subjects).
- Final test-suite result (PASS / list of regressions).
- Any observed behavior delta worth flagging — e.g., if a test's snapshot updated because the canonical day-attribution gives a marginally different result than the duplicated one (this is the expected fix, not a regression, but should be called out).
</output>
