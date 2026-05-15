---
phase: 04
status: blocking
counts: { blocking: 1, high: 1, medium: 2, low: 2 }
reviewer: claude-inline (gsd-code-reviewer subagent was 529-overloaded twice; review done inline by orchestrator)
date: 2026-05-14
scope: 28 session commits across Stabilization milestone Phases 1, 2, 4 + their quick tasks
files_reviewed:
  - src/lib/storage/indexedDbAdapter.ts (new)
  - src/__tests__/storage-adapter.test.ts (new)
  - src/__tests__/storage-adapter.failure.test.ts (new)
  - src/lib/store.ts
  - src/lib/utils.ts
  - src/lib/notifications.ts
  - src/app/[locale]/LandingContent.tsx
  - src/lib/observations.ts
  - src/lib/exportPdf/graphs.ts
  - src/lib/exportPdf/slots.ts
  - src/__tests__/store.test.ts
  - package.json
---

# Code Review — Stabilization Milestone Session

## Summary

Two real bugs surfaced that should be fixed before `git push origin main`:

1. **BLOCKING** — `notifications.ts`'s tomorrow-date computation lands on *today* (not tomorrow) for any timezone west of UTC, including EST/PST. Combined with `setTimeout`, this produces a negative delay → immediate fire → recursive `scheduleNext` → CPU-thrash the patient's tab. The clinician user (currently in EST) would hit this immediately on onboarding.
2. **HIGH** — `indexedDbAdapter.ts` returns `null` immediately when IDB throws on `getItem`, skipping the localStorage fallback. Existing v2 patients on browsers where IDB is unavailable lose access to their in-progress diary on the v3 deploy.

Recommendation: **fix both before push.** Both are surgical (≤10 lines each) and have well-defined unit tests we can add.

## Blocking findings

### BLOCKING-1: `notifications.ts:99-105` — wrong "tomorrow" for west-of-UTC timezones

**Code:**
```ts
if (new Date(nextIso).getTime() <= Date.now()) {
  const tomorrowIso = new Date(
    Date.parse(todayInTz + 'T00:00:00.000Z') + 86_400_000,
  ).toISOString();
  const tomorrowInTz = getDateInTz(tomorrowIso, timeZone);
  nextIso = buildIsoForClockTimeInTz(`${tomorrowInTz}T12:00:00.000Z`, hour, minute, timeZone);
}
```

**The bug:** `Date.parse(todayInTz + 'T00:00:00.000Z')` parses `todayInTz` as UTC midnight, then adds 24h, giving the UTC instant for the next calendar day. But for any tz west of UTC (Americas, Pacific), `getDateInTz` of that instant returns *the same day in the user's tz*, not the next day.

**Trace** for a New York user (EDT, UTC-4) at 14:00 local on 2026-07-15:
- `nowIso = "2026-07-15T18:00:00.000Z"`
- `todayInTz = "2026-07-15"` ✓
- `nextIso = buildIso(8 AM EDT today) = "2026-07-15T12:00:00.000Z"` → in the past ✓
- Roll to tomorrow:
  - `tomorrowIso = "2026-07-16T00:00:00.000Z"` (UTC instant)
  - `tomorrowInTz = getDateInTz("2026-07-16T00:00:00.000Z", "America/New_York")` → **`"2026-07-15"`** (00:00 UTC = 20:00 prev day EDT — same calendar day in user's tz)
  - `nextIso = buildIso(8 AM EDT on "2026-07-15") = "2026-07-15T12:00:00.000Z"` (same as before)
- `delay = nextIso - now = -6h ms` → negative

**Consequence:** `setTimeout(scheduleNext, -21_600_000)` fires immediately, `scheduleNext()` re-enters with the same negative delay, recursion. Browser will clamp the loop to ~4 ms minimum recursion, draining CPU/battery and never delivering a reminder.

**Affected timezones:** Every IANA zone west of UTC: all of the Americas (UTC-3..UTC-12), Hawaii, Azores. East-of-UTC zones (Europe partial, Asia, Australia) happen to land correctly.

**Affected users:** Every patient who grants notification permission while their stored diary timezone is in the Americas. The clinician user (currently NA EST/EDT) is in this set.

**Concrete fix:** Use `now + 24h` directly instead of computing tomorrow via local-date arithmetic:

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

**Test gap to close:** Add `src/__tests__/notifications.test.ts` with a fake-clock test that asserts `getNextOccurrence` produces a positive, sub-24h delay for `America/New_York`, `America/Los_Angeles`, `Asia/Singapore`, and `Pacific/Honolulu` at multiple times-of-day. Export `getNextOccurrence` from `notifications.ts` (or test via `scheduleReminders` + `setTimeout` spy).

## High findings

### HIGH-1: `indexedDbAdapter.ts:48-51` — IDB-unavailable hides v2 localStorage data

**Code:**
```ts
async getItem(name: string): Promise<string | null> {
  try {
    const idbValue = await idbGet<string>(name);
    if (idbValue !== undefined) return idbValue;
  } catch (err) {
    console.warn('[indexedDbAdapter] getItem IDB error', err);
    return null;  // ⚠ bails out before checking localStorage
  }
  // ... localStorage fallback only runs when IDB returned undefined (empty), not when IDB threw
}
```

**The bug:** When `idbGet` throws (private mode, IDB disabled, permission revoked), the adapter returns `null` without checking whether the patient has a v2 `localStorage` value. Zustand's persist sees `null` → initializes fresh state → the patient sees an empty diary even though their localStorage still has a complete in-progress diary.

**Affected users:** Patients in:
- Firefox private mode (IDB throws in some configurations)
- Safari with "Block all cookies" or aggressive ITP states
- Older WebKit versions where IDB has known instability
- Devices with corrupted IDB databases (rare but real)

For these users, the v3 deploy effectively erases their in-progress 3-day diary even though the data still exists on disk.

**Concrete fix:** Fall through to the localStorage check when IDB throws on `getItem`. Don't attempt the migration write (it would also fail), but DO return the localStorage value so the patient hydrates from it:

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

**Test to add:** A failure-path test that mocks `idbGet` to throw, pre-populates localStorage with a v2 value, and asserts `adapter.getItem(KEY)` returns the localStorage value (not `null`) and that localStorage is NOT cleared.

## Medium findings

### MEDIUM-1: `notifications.ts:142-146` — `scheduleDiaryCompleteReminder` ignores DST transitions across the 3-day window

**Code:**
```ts
export function scheduleDiaryCompleteReminder(startDate: string, timeZone?: string): void {
  const startIso = buildIsoForClockTimeInTz(`${startDate}T12:00:00.000Z`, 9, 0, timeZone);
  const day4Ms = new Date(startIso).getTime() + 3 * 86_400_000;
  ...
}
```

**The bug:** Adding `3 * 86_400_000 ms` puts the reminder at exactly 9 AM only if no DST transition happens in those 3 days. For a US patient who starts the diary on the Friday before "spring forward", the day-4 reminder fires at 10 AM local (an hour late). For "fall back", 8 AM local (an hour early).

**Affected users:** Patients in DST-observing zones who happen to start their diary in the week before a DST transition. Twice per year, a small cohort.

**Concrete fix:** Compute day 4 by advancing the date in the user's tz, not by adding a flat 3 × 86_400_000 ms. Use `addDays`/`buildIsoForClockTimeInTz`:

```ts
import { format, addDays, parseISO } from 'date-fns';
// ...
const day4Date = format(addDays(parseISO(startDate + 'T12:00:00'), 3), 'yyyy-MM-dd');
const day4Iso = buildIsoForClockTimeInTz(`${day4Date}T12:00:00.000Z`, 9, 0, timeZone);
const delay = new Date(day4Iso).getTime() - Date.now();
```

**Severity rationale:** 1-hour shift, twice a year, only on day 4 of the diary. Patient still gets the reminder, just slightly off. Not data-loss, just annoyance. Worth fixing while we're touching this file for the BLOCKING bug.

### MEDIUM-2: `indexedDbAdapter.ts` — two-tab fresh-hydrate race during migration

**The scenario:** Two browser tabs open simultaneously. Both have empty IDB, both have a v2 localStorage entry. Tab A's `getItem` runs the migration: `idbGet → undefined → ls.getItem → value → idbSet → ls.removeItem`. Between Tab A's `idbSet` resolving and Tab A's `ls.removeItem`, Tab B's `getItem` could run, see `idbGet → returns Tab A's data` ✓ (good case) OR if scheduling is unlucky, `idbGet → undefined → ls.getItem → null` (Tab A already cleared LS) → returns null → Tab B hydrates empty → Tab B's setState writes empty state to IDB, overwriting Tab A's migrated data.

**Probability:** Extremely low. Requires both tabs to open within milliseconds of each other with empty IDB. The migration window is sub-millisecond on warm IDB.

**Fix options:**
- **Accept the risk:** real probability is very low; cost of fix may not be worth it.
- **Make migration idempotent under racing reads:** use `idb-keyval`'s `update()` (a transactional read-modify-write) instead of separate `get`/`set` calls. About 10 extra lines and one more `idb-keyval` import.

**Recommendation:** Accept for now; note in the SUMMARY.md as a known limitation. Revisit if any patient reports diary erasure on multi-tab use.

## Low findings

### LOW-1: `indexedDbAdapter.ts:23` — JSDoc example shows the wrong call shape

**Code:**
```ts
 *   storage: createJSONStorage(createIndexedDbStorage),
```

**Issue:** The actual usage in `store.ts:365` is `createJSONStorage(() => createIndexedDbStorage())` — Zustand expects a lazy callback that *returns* the storage. The doc example shows passing the factory directly, which would technically work (since `createJSONStorage` accepts both forms), but is inconsistent with the actual call site.

**Concrete fix:** Update the comment to match:
```ts
 *   storage: createJSONStorage(() => createIndexedDbStorage()),
```

### LOW-2: No dedicated `notifications.test.ts`

The CONCERNS.md audit explicitly flagged this as a test coverage gap. Phase 1's STAB-02 timezone fix would have caught BLOCKING-1 if even a minimal test existed. Adding 2-3 tests for `getNextOccurrence` (after exporting it for test purposes) is high leverage for low effort.

## What's good

- **Migration atomicity (D-04) is correctly implemented.** Test 8 specifically verifies that a failed IDB write leaves localStorage untouched. The clearance happens *after* `await idbSet` succeeds. Excellent design.
- **`migrateBladderDiaryState` `ARRAY_FIELDS` defensive loop (STAB-05)** is forward-thinking — handles any future array-field addition without re-discovering the bug per-version.
- **`observations.ts` dedup (STAB-03)** is a clean delete-and-delegate. Net negative line count, less code to maintain, correct hour-guard inherited from canonical `getDayNumber`.
- **PDF tz-minutes fix (STAB-04)** removed the now-dead `parseISO` import — good housekeeping.
- **JSDoc on `store.ts`** was updated to reflect IndexedDB (after my drift cleanup commit).
- **All console.warn sites in the adapter are tagged `[indexedDbAdapter]`** — makes production debugging much easier than untagged warns.
- **Test scaffolding via `fake-indexeddb/auto`** is the right call. Adds the polyfill globally with one import, doesn't require teardown.

## Recommendation

**Do NOT push yet.** Fix BLOCKING-1 + HIGH-1 (≤30 lines of code + 4-5 unit tests). Re-run vitest. Then push.

MEDIUM-1 (DST in scheduleDiaryCompleteReminder) is a judgment call — fix alongside if the file is already open, defer if not.

LOW-1 and LOW-2 can wait or be addressed inline with the BLOCKING fix.

---
*Review completed: 2026-05-14*
