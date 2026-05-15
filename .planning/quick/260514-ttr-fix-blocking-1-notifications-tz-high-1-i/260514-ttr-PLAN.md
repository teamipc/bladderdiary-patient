---
phase: quick-260514-ttr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/notifications.ts
  - src/lib/storage/indexedDbAdapter.ts
  - src/__tests__/notifications.test.ts
  - src/__tests__/storage-adapter.failure.test.ts
autonomous: true
requirements:
  - REVIEW-BLOCKING-1
  - REVIEW-HIGH-1
  - REVIEW-MEDIUM-1
  - REVIEW-LOW-1

must_haves:
  truths:
    - "getNextOccurrence returns a future Date for every IANA timezone (incl. EDT/PST/HST/SGT/UTC/IST)"
    - "scheduleReminders never produces a negative or zero setTimeout delay"
    - "indexedDbAdapter.getItem returns the localStorage value (not null) when idb-keyval throws"
    - "indexedDbAdapter does not clear localStorage when IDB is unavailable"
    - "scheduleDiaryCompleteReminder fires at 9 AM local on day 4 even across a DST transition"
    - "JSDoc usage example matches the actual lazy-callback call shape in store.ts"
    - "Full test suite still passes after all four fixes (npx vitest run + npx tsc --noEmit)"
  artifacts:
    - path: "src/lib/notifications.ts"
      provides: "Timezone-correct getNextOccurrence + DST-safe scheduleDiaryCompleteReminder"
      contains: "export function getNextOccurrence"
    - path: "src/lib/storage/indexedDbAdapter.ts"
      provides: "getItem that falls through to localStorage when IDB throws"
      contains: "idbAvailable"
    - path: "src/__tests__/notifications.test.ts"
      provides: "Fake-clock regression coverage for getNextOccurrence across tzs + DST + day-4 reminder"
    - path: "src/__tests__/storage-adapter.failure.test.ts"
      provides: "Test 9 — IDB-throws fallback preserves localStorage v2 value"
      contains: "IDB-unavailable getItem still returns localStorage"
  key_links:
    - from: "src/lib/notifications.ts:getNextOccurrence (tomorrow branch)"
      to: "now + 86_400_000 → getDateInTz"
      via: "removes UTC-midnight arithmetic that silently fails west of UTC"
      pattern: "new Date\\(Date\\.now\\(\\) \\+ 86_400_000\\)"
    - from: "src/lib/storage/indexedDbAdapter.ts:getItem"
      to: "localStorage fallback path"
      via: "idbAvailable flag — falls through instead of returning null on IDB throw"
      pattern: "idbAvailable = false"
    - from: "src/lib/notifications.ts:scheduleDiaryCompleteReminder"
      to: "date-fns addDays + buildIsoForClockTimeInTz"
      via: "calendar-date arithmetic instead of flat 3 × 86_400_000 ms"
      pattern: "addDays\\(parseISO"
---

<objective>
Fix 4 findings from `.planning/phases/04-storage-backend-hardening/04-REVIEW.md` before pushing the Stabilization milestone session to `origin/main`:

- **BLOCKING-1** — `notifications.ts:getNextOccurrence` produces a negative `setTimeout` delay for any timezone west of UTC (all Americas), causing a recursive immediate-fire loop that drains the patient's CPU/battery and never delivers a reminder. Affects the clinician user immediately on onboarding in EST/EDT.
- **HIGH-1** — `indexedDbAdapter.getItem` returns `null` when IDB throws (private mode, ITP, corrupted IDB), bypassing the localStorage fallback. v2 patients on those browsers lose access to their in-progress diary on the v3 deploy.
- **MEDIUM-1** — `scheduleDiaryCompleteReminder` adds a flat `3 * 86_400_000 ms`, so the day-4 reminder fires 1 hour off across a DST transition (twice a year, small cohort).
- **LOW-1** — `indexedDbAdapter.ts` JSDoc example shows `createJSONStorage(createIndexedDbStorage)` (eager) but `store.ts` calls `createJSONStorage(() => createIndexedDbStorage())` (lazy). Cosmetic drift.

Purpose: Restore the reminder subsystem to a non-broken state for every patient west of UTC, restore the v2→v3 migration fallback for patients on IDB-unavailable browsers, harden the day-4 reminder against DST, and remove the JSDoc inconsistency. All four findings have concrete fix code already proposed in 04-REVIEW.md.

Output: Two source files patched, two test files (one new, one extended), four atomic commits with the exact messages specified in 04-REVIEW.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/04-storage-backend-hardening/04-REVIEW.md
@.planning/phases/04-storage-backend-hardening/04-CONTEXT.md
@src/lib/notifications.ts
@src/lib/storage/indexedDbAdapter.ts
@src/__tests__/storage-adapter.failure.test.ts
@src/__tests__/storage-adapter.test.ts
@docs/TIME_MODEL.md

<interfaces>
<!-- Key signatures from src/lib/utils.ts the executor needs. Extracted; no exploration required. -->

From src/lib/utils.ts:
```typescript
export function buildIsoForClockTimeInTz(
  anchorIso: string,   // any ISO whose date-in-tz is the target calendar date
  hour: number,
  minute: number,
  timeZone?: string,
): string;             // returns an ISO instant for HH:MM on that date in tz (DST-correct)

export function getDateInTz(isoString: string, timeZone?: string): string;
// returns "YYYY-MM-DD" — the calendar date of `isoString` interpreted in `timeZone`
```

From src/lib/storage/indexedDbAdapter.ts (current shape, will be modified):
```typescript
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

interface StateStorageLike {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

export function createIndexedDbStorage(): StateStorageLike;
```

From src/lib/notifications.ts (current — getNextOccurrence is module-private):
```typescript
function getNextOccurrence(hour: number, minute: number, timeZone?: string): Date;
export function scheduleReminders(timeZone?: string): void;
export function cancelReminders(): void;
export function scheduleDiaryCompleteReminder(startDate: string, timeZone?: string): void;
```

date-fns is already a project dep (4.1.0, per PROJECT.md STACK section). `addDays`, `parseISO`, `format` are available named exports.
</interfaces>

<review_proposals>
<!-- The exact fix code from 04-REVIEW.md. The executor should treat these as the source of truth. -->

**BLOCKING-1 fix (notifications.ts:99-105, replace the "roll to tomorrow" branch):**
```ts
function getNextOccurrence(hour: number, minute: number, timeZone?: string): Date {
  const nowIso = new Date().toISOString();
  const todayInTz = getDateInTz(nowIso, timeZone);
  let nextIso = buildIsoForClockTimeInTz(`${todayInTz}T12:00:00.000Z`, hour, minute, timeZone);
  if (new Date(nextIso).getTime() <= Date.now()) {
    // "Tomorrow" in any timezone is whatever calendar date "now + 24h" lands on
    // in that tz. Computing it from a UTC midnight string silently fails for
    // tzs west of UTC.
    const tomorrowInTz = getDateInTz(new Date(Date.now() + 86_400_000).toISOString(), timeZone);
    nextIso = buildIsoForClockTimeInTz(`${tomorrowInTz}T12:00:00.000Z`, hour, minute, timeZone);
  }
  return new Date(nextIso);
}
```
Also: prepend `export` to the function so a unit test can import it directly.

**HIGH-1 fix (indexedDbAdapter.ts getItem, replace lines 41-80):**
```ts
async getItem(name: string): Promise<string | null> {
  let idbAvailable = true;
  try {
    const idbValue = await idbGet<string>(name);
    if (idbValue !== undefined) return idbValue;
  } catch (err) {
    console.warn('[indexedDbAdapter] getItem IDB error — falling back to localStorage', err);
    idbAvailable = false;
  }

  // IDB is empty OR unavailable — check for a v2 localStorage value
  let lsValue: string | null = null;
  try {
    lsValue = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
  } catch {
    lsValue = null;
  }
  if (lsValue === null) return null;

  // Only attempt migration if IDB is available. If IDB is unavailable, just
  // return the LS value and leave it in place — the patient continues to work
  // off localStorage until IDB recovers.
  if (idbAvailable) {
    try {
      await idbSet(name, lsValue);
      try { localStorage.removeItem(name); } catch { /* not critical */ }
    } catch (err) {
      console.warn('[indexedDbAdapter] migration write failed; will retry on next load', err);
    }
  }
  return lsValue;
}
```

**MEDIUM-1 fix (notifications.ts:142-156, replace the day-4 computation):**
```ts
import { format, addDays, parseISO } from 'date-fns';
// ...
export function scheduleDiaryCompleteReminder(startDate: string, timeZone?: string): void {
  const day4Date = format(addDays(parseISO(startDate + 'T12:00:00'), 3), 'yyyy-MM-dd');
  const day4Iso = buildIsoForClockTimeInTz(`${day4Date}T12:00:00.000Z`, 9, 0, timeZone);
  const delay = new Date(day4Iso).getTime() - Date.now();
  if (delay <= 0) return;

  const timer = setTimeout(() => {
    showNotification(
      'You did it! 🎉',
      'Your 3-day flow check is complete. Open the app to see your summary.',
    );
  }, delay);

  reminderTimers.push(timer);
}
```

**LOW-1 fix (indexedDbAdapter.ts:23, JSDoc line only):**
```ts
 *   storage: createJSONStorage(() => createIndexedDbStorage()),
```
</review_proposals>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: BLOCKING-1 — Fix getNextOccurrence for west-of-UTC tzs + add notifications.test.ts</name>
  <files>src/lib/notifications.ts, src/__tests__/notifications.test.ts</files>
  <behavior>
    - Test 1.1 (Suite 1, parametrized): For each tz in `['America/New_York', 'America/Los_Angeles', 'Pacific/Honolulu', 'Asia/Singapore', 'Europe/London', 'Asia/Kolkata']` and each reminder hour in `[8, 14, 21]` with system time fixed to `'2026-07-15T16:00:00.000Z'`: `getNextOccurrence(hour, 0, tz).getTime() - Date.now()` is `> 0` AND `<= 86_400_000`.
    - Test 1.2 (Suite 2, BLOCKING-1 regression): With `vi.setSystemTime(new Date('2026-07-15T18:00:00.000Z'))` (= 14:00 EDT), `getNextOccurrence(8, 0, 'America/New_York').getTime()` is strictly greater than `Date.now()`. Pre-fix code would have returned `2026-07-15T12:00:00.000Z` (in the past); post-fix must return `2026-07-16T12:00:00.000Z` (8 AM EDT next day).
    - Test 1.3 (Suite 3, just-before transition): With system time set to 1 minute before 8 AM EDT (e.g., `'2026-07-15T11:59:00.000Z'`) and tz `'America/New_York'`, `getNextOccurrence(8, 0, tz).getTime() - Date.now()` is within `[55_000, 65_000]` ms (~1 min).
    - Test 1.4 (Suite 3, just-after transition): With system time set to 1 minute after 8 AM EDT (e.g., `'2026-07-15T12:01:00.000Z'`) and tz `'America/New_York'`, `getNextOccurrence(8, 0, tz).getTime() - Date.now()` is within `[86_335_000, 86_345_000]` ms (~24h - 1 min).
    - All tests use `beforeEach(() => vi.useFakeTimers())` / `afterEach(() => vi.useRealTimers())` and `vi.setSystemTime(new Date(isoStr))` inside each test.
  </behavior>
  <action>
    Per REVIEW-BLOCKING-1:

    (1) In `src/lib/notifications.ts`, replace the body of the `if (new Date(nextIso).getTime() <= Date.now()) { ... }` branch (currently lines 99-105) with the two-line version from `<review_proposals>` BLOCKING-1: compute `tomorrowInTz` as `getDateInTz(new Date(Date.now() + 86_400_000).toISOString(), timeZone)`, then rebuild `nextIso` with `buildIsoForClockTimeInTz(`${tomorrowInTz}T12:00:00.000Z`, hour, minute, timeZone)`. The comment in that branch must explain why the old approach failed west of UTC (use the comment text shown in `<review_proposals>`).

    (2) Change the function declaration from `function getNextOccurrence(...)` to `export function getNextOccurrence(...)` so the unit test can import it directly.

    (3) Create `src/__tests__/notifications.test.ts`. Use vitest with `vi.useFakeTimers()` / `vi.setSystemTime(...)`. Implement four test groups described in `<behavior>`: parametrized positive-and-sub-24h delay across six tzs and three reminder hours; the BLOCKING-1 regression at 18:00 UTC in New_York; just-before-transition; just-after-transition. Restore real timers in `afterEach`. Match existing test file style (top-level `describe` blocks, `it(...)`).

    DO NOT modify `scheduleReminders`, `cancelReminders`, or `scheduleDiaryCompleteReminder` in this task — MEDIUM-1 lives in Task 3.

    Commit: `fix(stab-02): notifications getNextOccurrence rolls correctly for west-of-UTC timezones`
  </action>
  <verify>
    <automated>cd /Users/zhen/bladderdiary-patient && npx vitest run src/__tests__/notifications.test.ts 2>&1 | tail -25 && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>
    - `notifications.test.ts` exists with the four test groups (Suite 1 parametrized, Suite 2 regression, Suite 3 before/after transitions); all tests pass.
    - `getNextOccurrence` is exported and the tomorrow branch uses `new Date(Date.now() + 86_400_000).toISOString()` (no `Date.parse(... + 'T00:00:00.000Z') + 86_400_000`).
    - `npx tsc --noEmit` clean.
    - One commit with the exact message `fix(stab-02): notifications getNextOccurrence rolls correctly for west-of-UTC timezones`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: HIGH-1 — indexedDbAdapter falls back to localStorage when IDB throws on getItem</name>
  <files>src/lib/storage/indexedDbAdapter.ts, src/__tests__/storage-adapter.failure.test.ts</files>
  <behavior>
    - Test 9 (new, alongside existing Tests 6/7/8 in `storage-adapter.failure.test.ts`):
      - Setup: `vi.mocked(get).mockRejectedValue(new Error('IDB unavailable'))` (IDB throws on read).
      - Pre-populate: `localStorage.setItem(KEY, legacyValue)` where `legacyValue = JSON.stringify({ state: { voids: [{ id: 'x' }] }, version: 2 })`.
      - Action: `await adapter.getItem(KEY)`.
      - Assertion A: result equals `legacyValue` (NOT `null`).
      - Assertion B: `localStorage.getItem(KEY)` still equals `legacyValue` (no migration attempted, no clear).
      - Assertion C: `vi.mocked(set)` was NOT called (no migration write attempted when IDB unavailable).
      - Assertion D: `console.warn` was called at least once for the IDB-unavailable warning.
    - Existing Test 6 may need adjustment: it currently asserts `result` is `null` and `warnSpy` called exactly once. Under the new behavior, when IDB throws AND localStorage is empty, the adapter MUST still return `null` (no LS to fall back to) and warn once. Verify Test 6 still passes as-is; if its assertion needs minor tweaking (e.g., the warn message text changes), update it. Tests 7 and 8 are untouched (setItem failure path + migration-atomicity).
  </behavior>
  <action>
    Per REVIEW-HIGH-1:

    (1) In `src/lib/storage/indexedDbAdapter.ts`, replace the entire `getItem` method body (lines 41-80) with the version from `<review_proposals>` HIGH-1:
        - Declare `let idbAvailable = true;` at the top of the method.
        - On IDB throw, set `idbAvailable = false`, log via `console.warn` with the new message `'[indexedDbAdapter] getItem IDB error — falling back to localStorage'`, and fall through (do NOT return).
        - After the try/catch, read `lsValue` from `localStorage` (with its own try/catch as in the current code).
        - If `lsValue === null`, return `null`.
        - If `idbAvailable === true`, attempt the migration write (idbSet → on success remove from LS). On idbSet failure, warn and keep LS intact.
        - If `idbAvailable === false`, skip the migration entirely (do NOT call idbSet, do NOT remove the LS key).
        - Return `lsValue` unconditionally at the end.

    (2) In `src/__tests__/storage-adapter.failure.test.ts`, add Test 9 as described in `<behavior>` after the existing Test 8 (inside the same `describe` block, after line 72). The new test reuses the file's `vi.mock('idb-keyval', ...)` factory at the top (no new mock setup needed). Pattern Test 9 on Test 8's structure (mockRejectedValue on `get` instead of `idbSet`, assertions on result + localStorage state + set-call count + warn-call presence).

    (3) Verify Test 6 still passes (IDB throws + empty localStorage → `null` + warn). If its `expect(warnSpy).toHaveBeenCalledTimes(1)` is sensitive to the warn-message text change, leave the `.toHaveBeenCalledTimes(1)` check (it just counts calls, not message content).

    DO NOT touch `setItem` or `removeItem` — both already handle errors correctly (HIGH-1 is read-path only).

    DO NOT touch the JSDoc comment at line 23 — LOW-1 lives in Task 4.

    Commit: `fix(stab-09): IDB adapter falls back to localStorage when IDB throws on getItem`
  </action>
  <verify>
    <automated>cd /Users/zhen/bladderdiary-patient && npx vitest run src/__tests__/storage-adapter.failure.test.ts src/__tests__/storage-adapter.test.ts 2>&1 | tail -30 && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>
    - `getItem` no longer returns early on IDB-throw; instead falls through to localStorage and returns the LS value when present.
    - Migration is conditionally skipped when IDB is unavailable; localStorage is preserved in that case.
    - Test 9 exists and passes (IDB-throws + LS-has-value → returns LS value, LS preserved, no idbSet call).
    - Tests 1-8 still pass (failure-path Tests 6/7/8 + happy-path Tests 1-5).
    - `npx tsc --noEmit` clean.
    - One commit with the exact message `fix(stab-09): IDB adapter falls back to localStorage when IDB throws on getItem`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: MEDIUM-1 — scheduleDiaryCompleteReminder uses calendar-date arithmetic across DST</name>
  <files>src/lib/notifications.ts, src/__tests__/notifications.test.ts</files>
  <behavior>
    - Test 4 (Suite 4, DST safety, added to the `notifications.test.ts` created in Task 1):
      - Setup: `vi.setSystemTime(new Date('2026-03-06T17:00:00.000Z'))` (Friday afternoon, 12:00 EST, before US "spring forward" on 2026-03-08 02:00 EST → 03:00 EDT).
      - Setup: `const setTimeoutSpy = vi.spyOn(global, 'setTimeout');`
      - Action: `scheduleDiaryCompleteReminder('2026-03-06', 'America/New_York');`
      - Compute expected: 9 AM EDT on 2026-03-09 (day 4 = startDate + 3 calendar days) is `'2026-03-09T13:00:00.000Z'` (EDT is UTC-4). Expected delay ≈ `Date.parse('2026-03-09T13:00:00.000Z') - Date.parse('2026-03-06T17:00:00.000Z')` = 248_400_000 ms = 69 hours exactly.
      - Assertion: the most recent `setTimeoutSpy` call's second argument (`delay`) is within `[248_399_000, 248_401_000]` ms (tolerance ±1 s for floor).
      - Pre-fix behavior would have computed `delay = (startIso + 3*86_400_000) - now` where startIso = 2026-03-06T14:00:00.000Z (9 AM EST). 3 days = 259_200_000 ms, so post-DST it would land at 10 AM EDT (252_000_000 ms delay, ~1h longer than correct). Test must distinguish from that.
  </behavior>
  <action>
    Per REVIEW-MEDIUM-1:

    (1) In `src/lib/notifications.ts`, add the import statement near the top of the file (after the existing `import { buildIsoForClockTimeInTz, getDateInTz } from './utils';`):
        ```ts
        import { format, addDays, parseISO } from 'date-fns';
        ```
        (Per the planner's verification, `notifications.ts` currently has no date-fns import — this is a net-add. date-fns is already a project dep, no package.json change needed.)

    (2) Replace the body of `scheduleDiaryCompleteReminder` (lines 142-156) with the version from `<review_proposals>` MEDIUM-1. Specifically:
        - Delete the `startIso` computation and the `day4Ms = new Date(startIso).getTime() + 3 * 86_400_000` line.
        - Insert `const day4Date = format(addDays(parseISO(startDate + 'T12:00:00'), 3), 'yyyy-MM-dd');`
        - Insert `const day4Iso = buildIsoForClockTimeInTz(`${day4Date}T12:00:00.000Z`, 9, 0, timeZone);`
        - Replace `day4Ms - Date.now()` with `new Date(day4Iso).getTime() - Date.now()`.
        - Preserve the `if (delay <= 0) return;` guard, the `setTimeout(...)` call, the notification copy ("You did it! 🎉" / "Your 3-day flow check is complete..."), and `reminderTimers.push(timer)` exactly as currently written.

    (3) In `src/__tests__/notifications.test.ts` (created in Task 1), append a new `describe('scheduleDiaryCompleteReminder — DST safety', ...)` block with Test 4 as described in `<behavior>`. Use `vi.spyOn(global, 'setTimeout')` to capture the computed delay. Restore the spy in `afterEach`.

    DO NOT touch `getNextOccurrence`, `scheduleReminders`, or `cancelReminders` — those were finalized in Task 1.

    DO NOT touch `indexedDbAdapter.ts` — separate concern.

    Commit: `fix(stab-02): scheduleDiaryCompleteReminder uses calendar-date arithmetic across DST`
  </action>
  <verify>
    <automated>cd /Users/zhen/bladderdiary-patient && npx vitest run src/__tests__/notifications.test.ts 2>&1 | tail -25 && npx tsc --noEmit 2>&1 | tail -5</automated>
  </verify>
  <done>
    - `scheduleDiaryCompleteReminder` uses `addDays(parseISO(startDate + 'T12:00:00'), 3)` + `buildIsoForClockTimeInTz` (no more flat `3 * 86_400_000` addition).
    - Suite 4 DST test passes: spring-forward scenario yields ~248_400_000 ms delay, not ~252_000_000 ms.
    - All earlier suites in `notifications.test.ts` still pass (Suites 1-3 from Task 1).
    - `npx tsc --noEmit` clean.
    - One commit with the exact message `fix(stab-02): scheduleDiaryCompleteReminder uses calendar-date arithmetic across DST`.
  </done>
</task>

<task type="auto">
  <name>Task 4: LOW-1 — indexedDbAdapter JSDoc example matches actual call shape</name>
  <files>src/lib/storage/indexedDbAdapter.ts</files>
  <action>
    Per REVIEW-LOW-1:

    In `src/lib/storage/indexedDbAdapter.ts`, change line 23 (inside the file-header JSDoc block) from:
    ```
     *   storage: createJSONStorage(createIndexedDbStorage),
    ```
    to:
    ```
     *   storage: createJSONStorage(() => createIndexedDbStorage()),
    ```

    This is a single-line JSDoc edit. No code logic changes. No tests required (the change is a comment that the type-checker doesn't see and the test suite doesn't reference).

    DO NOT touch any other line. Verify with `git diff src/lib/storage/indexedDbAdapter.ts` that exactly one line differs.

    Commit: `docs(stab-09): IDB adapter JSDoc example matches actual call shape`
  </action>
  <verify>
    <automated>cd /Users/zhen/bladderdiary-patient && git diff src/lib/storage/indexedDbAdapter.ts | head -20 && [ "$(git diff --numstat src/lib/storage/indexedDbAdapter.ts | awk '{print $1+$2}')" = "2" ] && echo "OK: exactly 1 line changed (1 added, 1 removed)" || echo "FAIL: unexpected diff scope"</automated>
  </verify>
  <done>
    - Line 23 reads `*   storage: createJSONStorage(() => createIndexedDbStorage()),`.
    - `git diff src/lib/storage/indexedDbAdapter.ts` shows exactly one line modified (one `-` and one `+`).
    - One commit with the exact message `docs(stab-09): IDB adapter JSDoc example matches actual call shape`.
  </done>
</task>

</tasks>

<verification>
After all four commits land, run the full quality gate:

```bash
cd /Users/zhen/bladderdiary-patient
npx vitest run 2>&1 | tail -20
npx tsc --noEmit 2>&1 | tail -10
git log --oneline -5
```

Expected:
- `npx vitest run` reports 389+ passing tests (389 baseline from STATE.md + new Suite 1/2/3/4 cases in `notifications.test.ts` + Test 9 in `storage-adapter.failure.test.ts`). Zero failures.
- `npx tsc --noEmit` clean.
- `git log --oneline -5` shows exactly four new commits in order (Task 1 → Task 2 → Task 3 → Task 4), each with the exact commit message specified above.

If any test outside the touched files fails, investigate before pushing — could be an unintended interaction with `getNextOccurrence`'s new export or with `scheduleDiaryCompleteReminder`'s changed signature surface.
</verification>

<success_criteria>
- Four atomic commits land on the current branch with the exact commit messages from 04-REVIEW.md (no message paraphrasing).
- All four findings from 04-REVIEW.md (BLOCKING-1, HIGH-1, MEDIUM-1, LOW-1) are resolved per the proposed fix code; no scope expansion (MEDIUM-2 stays deferred as 04-REVIEW.md recommends).
- Full vitest suite green; `npx tsc --noEmit` clean.
- New regression coverage: `src/__tests__/notifications.test.ts` exists with at least four describe blocks (parametrized cross-tz, BLOCKING-1 regression at 18:00 UTC NY, just-before/just-after transition, DST scheduleDiaryCompleteReminder).
- New failure-path coverage: `src/__tests__/storage-adapter.failure.test.ts` has a Test 9 asserting LS fallback on IDB throw.
- No edits outside the four files listed in `files_modified`.
- Day-boundary/time-model invariants from `docs/TIME_MODEL.md` preserved: all date arithmetic in user-tz, no naked `setHours`/`getHours()`, no UTC-midnight tricks for "tomorrow".
</success_criteria>

<output>
After completion, create `.planning/quick/260514-ttr-fix-blocking-1-notifications-tz-high-1-i/260514-ttr-SUMMARY.md` capturing:
- The four commit SHAs in order.
- Final test count delta (before vs after).
- Confirmation that the push-blocker (BLOCKING-1) and the data-loss risk (HIGH-1) are closed, and that the milestone session is now safe to push to `origin/main`.
- Any deltas from the planned action (e.g., if Test 6 needed an assertion tweak for the new warn message wording).
</output>
