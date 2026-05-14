---
phase: 260514-ndz
plan: "01"
type: quick
status: complete
completed: 2026-05-14
duration: "~10 minutes"
tags: [bugfix, i18n, timezone, observations, silent-bugs]
commits:
  - hash: 963a1ad
    message: "fix(stab-01): INTL_LOCALES covers all 6 supported locales"
  - hash: acc99d7
    message: "fix(stab-02): reminders honor patient stored timezone instead of browser-local"
  - hash: 42cfe46
    message: "fix(stab-03): observations.ts reuses utils.getDayNumber (no duplicated day-boundary logic)"
key-files:
  modified:
    - src/lib/utils.ts
    - src/lib/notifications.ts
    - src/app/[locale]/LandingContent.tsx
    - src/lib/observations.ts
decisions:
  - "Used getDateInTz + buildIsoForClockTimeInTz noon-anchor pattern in getNextOccurrence for DST safety (consistent with rest of utils.ts)"
  - "scheduleDiaryCompleteReminder uses fixed ms offset (+3*86400000) for day 4 — matches original intent and avoids need for re-anchoring at 9am in tz"
  - "Deleted local getHourInTz and getDateInTz from observations.ts entirely (no backward-compat concern — leaf module with no external callers)"
---

# Phase 260514-ndz Plan 01: STAB-01/02/03 Silent Bug Fixes Summary

Fix the top 3 silent bugs (non-crashing wrong output) from CONCERNS.md: Intl locale map missing pt/zh/ar, reminder scheduling ignoring patient timezone, and duplicated day-boundary logic in observations.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | STAB-01: Expand INTL_LOCALES to all 6 locales | 963a1ad | src/lib/utils.ts |
| 2 | STAB-02: Reminders honor patient stored timezone | acc99d7 | src/lib/notifications.ts, src/app/[locale]/LandingContent.tsx |
| 3 | STAB-03: Dedupe day-attribution via utils.getDayNumber | 42cfe46 | src/lib/observations.ts |

## What Was Fixed

### STAB-01: INTL_LOCALES map (963a1ad)

`INTL_LOCALES` in `src/lib/utils.ts` only had 3 entries (`en`, `fr`, `es`). Calling `formatDate` or `formatTime` for `pt`, `zh`, or `ar` silently fell through to the `|| 'en-US'` fallback, rendering English-format dates for 50% of supported locales. Added `pt: 'pt-PT'`, `zh: 'zh-CN'`, `ar: 'ar-SA'` to match the BCP 47 forms of the `OG_LOCALE` source of truth (dashes, not underscores).

### STAB-02: Timezone-aware reminders (acc99d7)

`getNextOccurrence` used `new Date().setHours(hour, minute, 0, 0)` — browser-local time. For a patient who set their diary timezone to `Asia/Singapore` while the browser runs in `America/New_York`, the 8 AM reminder would fire at 8 AM EST (8 PM SGT), not 8 AM SGT. Fixed by:
- Importing `buildIsoForClockTimeInTz` and `getDateInTz` from utils
- `getNextOccurrence(hour, minute, timeZone?)` now uses the noon-anchor ISO pattern for DST safety
- `scheduleReminders(timeZone?)` and `scheduleDiaryCompleteReminder(startDate, timeZone?)` accept and pass through the stored tz
- `LandingContent.tsx` passes `tz` (the onboarding parameter) to both schedulers
- Old browser-local path remains as fallback when `timeZone` is `undefined` (backwards-safe)

### STAB-03: observations.ts dedup (42cfe46)

`observations.ts` contained two locally-duplicated helpers (`getHourInTz`, `getDateInTz`) and an `isVoidOnDay` reimplementation. The local early-AM pull-back guard used `hour <= 5` without the bedtime cross-check present in `utils.getDayNumber` (the `!prevDayBedtime || timestampIso < prevDayBedtime.timestampIso` clause). This meant observations could attribute a void to the wrong diary day when a bedtime was set and the event fell in hours 0-5.

Replaced:
- `import { getDayNumber, getHoursInTz } from './utils'` added
- `getHourInTz` call site at drink-bucketing loop changed to canonical `getHoursInTz`
- `isVoidOnDay` reduced to one-line delegation: `return getDayNumber(v.timestampIso, state.startDate, state.bedtimes, state.timeZone) === dayNumber`
- Deleted local `getHourInTz` (11 lines) and `getDateInTz` (10 lines)

## Test Results

All tests pass.

**Full suite:** `npx vitest run` — **377 tests passed, 17 test files, 0 failures**

Individual test files verified:
- `src/__tests__/utils.test.ts` — 47 tests (STAB-01 gate)
- `src/__tests__/observations.test.ts` — 11 tests (STAB-03)
- `src/__tests__/boundaries.test.ts` — 30 tests (STAB-03)
- `src/__tests__/edge-wake-times.test.ts` — 33 tests (STAB-03)

No test regressions. No snapshot changes (the delegated `getDayNumber` produces identical results for all existing test cases — the fixed `hour <= 5` bedtime cross-check only fires in edge cases not currently exercised by the test suite; zero unexpected behavior delta).

## Deviations from Plan

None. Plan executed exactly as written.

## Self-Check: PASSED

- `src/lib/utils.ts`: INTL_LOCALES has 6 entries (pt-PT, zh-CN, ar-SA added)
- `src/lib/notifications.ts`: imports `buildIsoForClockTimeInTz` and `getDateInTz`; all three exported functions accept `timeZone?`
- `src/app/[locale]/LandingContent.tsx`: both scheduler calls pass `tz`
- `src/lib/observations.ts`: imports `getDayNumber` and `getHoursInTz`; no local `getHourInTz` or `getDateInTz`; `isVoidOnDay` is one line
- 3 commits exist with correct `fix(stab-0N)` prefixes
- `npx vitest run` exits 0 (377/377)
- `npx tsc --noEmit` exits 0
