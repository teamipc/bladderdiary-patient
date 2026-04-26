# Time & Day-Boundary Model

This document is the canonical reference for how times, dates, timezones,
and diary days interact in this app. Read it before touching any time-
related code: every time-related bug we've shipped came from one of the
sub-systems below silently disagreeing with another.

## What "right" means

The diary is a **clinical record**. The app must:

1. Never silently move an event to a different diary day without the
   patient's intent — that corrupts NPi, AVV, 24HV calculations.
2. Never silently drop an event (duplicate-minute drops must surface).
3. Never silently put a day in an "incomplete" state because of a side
   effect of editing a different day.
4. Treat the patient's wall-clock time-of-day as the source of truth.
   A patient picks "06:00" because they peed at 6 AM in their kitchen.
   The app must store and display 06:00 regardless of where the
   browser thinks it is.

## The day-number model (3 interacting layers)

Every void / drink / leak gets assigned to a diary day (1, 2, or 3) by
[`getDayNumber`](../src/lib/utils.ts). It runs three layers in order:

### Layer 1 — Calendar diff (in user's tz)

```
diff = (event date in user-tz) - startDate
dayNum = clamp(diff + 1, 1, 3)
```

This is the simple case: an event whose calendar date matches Day N's
calendar date belongs to Day N.

### Layer 2 — Bedtime-aware forward bump

If `dayNum < 3` and the event timestamp is **after** that day's bedtime,
bump to the next day. This handles late-night events: a 23:30 void on
Day 2 with bedtime 22:00 belongs to Night 2 / Day 3.

### Layer 3 — Early-AM pull-back

For events at hours 0–5 on the calendar day **after** a diary day, pull
the event back to that diary day if either:

- the previous day's bedtime isn't set yet (user is still awake), **or**
- the event timestamp is before the previous day's bedtime (the awake
  window extended past midnight in the user's tz)

The second clause is critical for two scenarios:

- **Bedtime set later.** Patient logs a 1 AM event Apr 14 at 1 AM, with
  no Day 1 bedtime yet → pull back to Day 1. Later they go to bed at
  2 AM, set bedtime — the 1 AM event must stay on Day 1.
- **Night-shift patients.** Wake at 23:00, void at 0:00 next calendar
  day, bedtime at 15:00 next calendar day. The void belongs to the
  diary day spanning calendar boundary.

## Form-side time correction (where the picker emits)

The TimePicker emits an ISO instant for "HH:MM in the user's tz on the
date of the form's current value". Day-view forms then route the pick
through one of two correctors:

### `correctAfterMidnight(timeIso, dayNumber, startDate, timeZone, wakeTimeIso?)`

For day-view picks. Bumps 0–5 AM picks one calendar day forward (so
"1 AM" picked on a Day 2 page means "1 AM tonight, Apr 15") **unless**
the user is an early riser: if `wakeTimeIso` is set and the pick is
at-or-after wake, leave the calendar date alone.

**Why the wake-time guard:** without it, a patient who wakes at 4:17 AM
and picks 5 AM gets their event stamped Apr 15 5:00. While Day 2 has
no bedtime, the early-AM pull-back keeps it on Day 2. The moment Day 2
bedtime is set, the pull-back stops compensating and the event silently
re-slots to Day 3 — the diary loses its FMV and the patient is stuck.

### `correctNightDate(timeIso, bedtimeIso, timeZone)`

For night-view picks (overnight-pee logging between bedtime and wake).
PM picks anchor to the bedtime's date in the user's tz; AM picks anchor
to the day after.

**Critical invariant:** all date arithmetic happens in the user's tz,
not UTC. A US-tz bedtime of 22:00 EDT is 02:00 UTC the next calendar
day; a UTC `addDays(bed, 1)` would land 24h past the patient's intent.

## Wake-time and FMV gating

Days 2 and 3 are "complete" when:

- a bedtime has been set for that day, **and**
- a void on that day has `isFirstMorningVoid: true`

The FMV is the day-phase void closest to the day's wake time, recomputed
by [`reassignMorningVoid`](../src/lib/store.ts) on:

- `addVoid` / `updateVoid` / `removeVoid`
- `setWakeTime` / `removeWakeTime`
- `setBedtime` / `removeBedtime` (recomputes both the affected day **and**
  the next day, since bedtime can shift voids across day boundaries)

If the day-boundary logic moves all of a day's morning voids elsewhere,
no candidate satisfies "day-phase void on this day at-or-after wake" and
the day cannot complete — the patient gets stuck. Every form-side
correction must preserve this invariant.

## Stored timezone vs browser timezone

The diary state has a single `timeZone` (IANA) that the patient sets at
setup or that auto-detects from the browser. **All day-boundary checks,
all form display, all picker conversions go through this stored tz.**

The browser tz is never trusted. Code that depends on `Date.getHours()`
or `Date.setHours()` (browser-local) is a bug — use `getHoursInTz`,
`buildIsoForClockTimeInTz`, etc.

DST and non-standard offsets are handled by `buildIsoForClockTimeInTz`,
which iterates twice to converge across DST transitions and respects
zones with half-hour or 45-minute offsets (IST 5:30, NPT 5:45, ACDT 10:30).

## Patient travel

The app stores **one** timezone for the whole diary. If the patient
crosses time zones mid-diary, all events read in the new tz could
re-slot. The current behaviour is: respect whatever tz is currently
stored when `getDayNumber` runs. There is no automatic re-slotting on
tz change, and the test suite verifies events don't vanish under a tz
switch — but a CEO patient flying NY→Tokyo mid-diary should be
encouraged to keep their original tz until they finish.

## Silent-failure surfaces (audit these on any change)

- **Duplicate-minute drops.** `addVoid` / `addDrink` / `addLeak` return
  `false` if a same-minute entry already exists. The form must surface
  this as a warning — never silently confirm a "saved" state.
- **FMV vanishes.** A retroactive edit, a wake-time change, or a
  bedtime change must trigger a fresh `reassignMorningVoid`. Without
  it, the day's `isDayComplete` check silently fails.
- **Browser tz drift.** Anything that uses browser-local time (`new
  Date(...).getHours()`, `setHours`, `toLocaleTimeString` without an
  explicit `timeZone` option) silently shifts by the offset between
  browser-local and the stored tz.
- **Wake time vs picked time.** Day-view picks at hours 0–5 will be
  bumped to the next calendar day unless the form passes the day's
  wake-time to `correctAfterMidnight`. Every day-view form must thread
  this argument through.

## Tests that lock these invariants

- [`early-wake-day2.test.ts`](../src/__tests__/early-wake-day2.test.ts) —
  the patient screenshot scenario; 4 AM wake; data-loss probes.
- [`edge-wake-times.test.ts`](../src/__tests__/edge-wake-times.test.ts) —
  full wake-hour spectrum (0–23), insomniac, night-view path,
  multi-tz, DST, picker idempotency, retroactive wake edits.
- [`back-edits-after-completion.test.ts`](../src/__tests__/back-edits-after-completion.test.ts) —
  edit Day 1 wake/bedtime after Day 3 complete, retroactive cross-day
  void edits, bedtime delete/re-add, FMV preservation.
- [`wake-time-edit-bug.test.ts`](../src/__tests__/wake-time-edit-bug.test.ts) —
  Singapore patient, 11-tz coverage, full 3-day flow with edits.
- [`edge-cases.test.ts`](../src/__tests__/edge-cases.test.ts) — boundary
  hours (00:00, 5:59, 6:00, 23:59), DST spring/fall, half-hour/quarter-
  hour zones, stored-tz vs browser-tz divergence.

## Mental checklist before changing time code

1. Does this preserve the user-tz-not-UTC invariant?
2. Does the form pass the day's wake time through to the corrector?
3. If I add a new path that creates an ISO timestamp for a user pick,
   am I using `buildIsoForClockTimeInTz`?
4. If I edit `getDayNumber`, did I run all four time-related test files?
5. If I edit a form, did I exercise it manually with an early-rising
   patient in a US timezone in the live preview?

If you can't answer yes to all five, the change isn't ready.
