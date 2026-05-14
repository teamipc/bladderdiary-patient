# Requirements — Stabilization Milestone

**Project:** My Flow Check (Bladder Diary Patient App)
**Milestone:** Stabilization (audit-driven silent-bug fixes)
**Source audit:** `.planning/codebase/CONCERNS.md` (cd3de78)
**Created:** 2026-05-14

This milestone closes silent-bug gaps surfaced by the codebase audit. None of these
add user-visible features — they correct existing features that mis-behave for some
subset of patients (specific locales, specific timezones, specific store-migration
paths, specific edge cases).

## v1 Requirements

### Locale + Timezone Correctness

- [ ] **STAB-01** — `INTL_LOCALES` covers all 6 supported locales
  Portuguese, Chinese, and Arabic patients currently see `en-US`-formatted dates/times silently (English month names, LTR dates on Arabic). Half of supported locales are affected on every page that renders timestamps.
  *Files:* `src/lib/utils.ts:8`
  *Verify:* render a void event timestamp in each of the 6 locales; pt/zh/ar should produce locale-native output (Portuguese month names, Simplified Chinese digits/format, Arabic numerals + RTL date order).

- [ ] **STAB-02** — Reminders fire at the patient's stored-timezone local time, not browser-local
  A patient who travels or has a VPN gets the 8 AM / 2 PM / 9 PM pings at the wrong wall-clock time. `scheduleReminders`, `scheduleDiaryCompleteReminder`, and `getNextOccurrence` use `new Date().setHours(...)` which is browser-local.
  *Files:* `src/lib/notifications.ts`, `src/app/[locale]/LandingContent.tsx`
  *Verify:* set the diary timezone to `Asia/Singapore` from a browser reporting `America/New_York`; the next 8 AM reminder lands at 8 AM SGT (20:00 EST the day before), not at 8 AM EST.

- [ ] **STAB-03** — Day-attribution logic in `observations.ts` reuses `getDayNumber` from utils
  The local `isVoidOnDay` re-implements `getDayNumber` with a subtly wrong guard (`hour <= 5` vs `hour >= 0 && hour <= 5`) and re-implements `getDateInTz`. A 5:59 AM void near a day boundary can produce wrong "consistent pattern" / "one night waking" observations.
  *Files:* `src/lib/observations.ts:148-194`
  *Verify:* a 5:59 AM void on the calendar day after Day 1 with no Day-1 bedtime set attributes to Day 1 (matching `getDayNumber`); observation tests pass.

- [ ] **STAB-04** — PDF graphs and 30-min slots use timezone-correct minutes
  `src/lib/exportPdf/graphs.ts` and `slots.ts` use `dt.getMinutes()` (browser-local) alongside `getHoursInTz` (timezone-correct), producing slightly wrong positions for patients in half-hour-offset zones (India UTC+5:30, Nepal UTC+5:45, Iran, Newfoundland).
  *Files:* `src/lib/exportPdf/graphs.ts`, `src/lib/exportPdf/slots.ts`
  *Verify:* a void at 14:30 IST renders on the correct 30-min PDF slot row and the correct scatter-plot fractional hour position for a patient stored in `Asia/Kolkata`.

### Day-Boundary + Store Hygiene

- [ ] **STAB-05** — `wakeTimes` null safety + migration completeness
  `src/lib/observations.ts:114` calls `state.wakeTimes.find(...)` without `?? []`; v0/v1 stores migrated without `wakeTimes` can crash `generateObservations`. Migration in `src/lib/store.ts:330-343` should explicitly initialize `wakeTimes: []`.
  *Files:* `src/lib/observations.ts`, `src/lib/store.ts`
  *Verify:* load a v0 store snapshot in tests; `generateObservations` doesn't throw.

### UX + Input Validation

- [ ] **STAB-06** — Milestone toasts dedupe across locale switches
  `checkMilestone` uses `sessionStorage` with a fixed key pattern, so first-void and day-complete toasts re-fire when the user switches locale mid-diary.
  *Files:* `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx:24-31`
  *Verify:* trigger first-void toast on `/en/diary/day/1`, switch to `/fr/diary/day/1`; toast does not re-fire.

- [ ] **STAB-07** — Export error path uses the Toast system, not `alert()`
  jsPDF/CSV/share failures currently surface as a `browser alert()` — especially jarring on mobile where the share sheet may already be visible. The Toast component already exists.
  *Files:* `src/components/export/ExportActions.tsx:68,94`
  *Verify:* simulate a jsPDF throw; user sees a toast, not a modal alert.

- [ ] **STAB-08** — `clinicCode` URL param is validated + length-capped before persisting
  `?clinic=` is currently accepted as any string and persisted to localStorage. Cap length and restrict to alphanumeric + dash.
  *Files:* `src/app/[locale]/LandingContent.tsx:45-49`, `src/lib/store.ts:setClinicCode`
  *Verify:* `?clinic=<32 alphanumeric chars>` accepts; `?clinic=<5000 chars>` or `?clinic=<script>` rejects (or truncates to a safe substring).

## v2 Requirements

<!-- Deferred to a later milestone. -->

- Locale-aware milestone-toast persistence keyed by patient instance, not session+locale (a deeper fix than STAB-06).
- Migration from compile-time `PREMIUM_FEATURES_ENABLED` to env-gated rollout — wait until premium is commercialized.
- Type augmentation for `jspdf-autotable`'s `lastAutoTable` to remove the four `@ts-expect-error` suppressions — tracked as tech debt, not a runtime bug.

## Out of Scope

- **Server-side data storage / cloud backup / user accounts.** Patient data is intentionally localStorage-only. No PHI on a server keeps the compliance surface tiny. CSV/PDF export IS the backup path.
- **General timezone-picker rework / curated timezone list expansion.** Auto-detect handles the long tail; curated-list tweaks ride along with the active fixes, not as a standalone effort.
- **`TimelineView.tsx` refactor (884-line monolith).** Real cleanup, but no user-visible bug. Defer until a feature change forces an extraction.
- **Backwards-compatibility shims for v0 store migrations beyond STAB-05.** STAB-05 is the last bridge.

## Traceability

| Phase | Requirements |
|-------|--------------|
| Phase 1: Locale + reminder + observation correctness | STAB-01, STAB-02, STAB-03 |
| Phase 2: Remaining tz + store hygiene | STAB-04, STAB-05 |
| Phase 3: UX polish + input validation | STAB-06, STAB-07, STAB-08 |

All 8 v1 requirements mapped. Coverage: 100%.

---
*Requirements defined: 2026-05-14*
