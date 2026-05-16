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

### Storage Backend

- [ ] **STAB-09** — Swap Zustand persist backend from `localStorage` to IndexedDB (via `idb-keyval`)
  `localStorage` is the right shape for our privacy posture (device-only, same-origin sandboxed), but it has two real failure modes: Safari ITP evicts it after ~7 days of inactivity (patient mid-diary loses data), and the 5–10 MB cap is tight if we ever extend beyond a 3-day diary. IndexedDB lives in the same same-origin sandbox (no new attack surface), survives Safari eviction marginally better, and has a vastly larger quota. We're swapping the persistence layer, not the privacy model — nothing leaves the device.
  *Files:* `src/lib/store.ts` (Zustand persist config), `package.json` (add `idb-keyval`), new adapter (likely `src/lib/storage/indexedDbAdapter.ts`).
  *Migration:* on first hydrate after the change, if IndexedDB is empty AND `localStorage` has the diary key, copy over and then clear the `localStorage` key. Bump the store version to v3.
  *Verify:* (1) fresh patient on Safari 17+ completes 3 days without data loss after a 7-day idle gap (manual). (2) Existing patient with v2 `localStorage` state opens the app once → diary loads from IndexedDB after the migration → `localStorage` key is gone. (3) Existing store-migration tests pass (`src/__tests__/store.test.ts`) plus a new test for the v2→v3 backend migration. (4) Daily 6-locale walkthrough still green.

### Desktop & Tablet UX (new milestone, added 2026-05-14)

The patient app today is mobile-first and does not adapt for browsers wider than ~768px. Forms span 100% viewport width, the BottomNav (mobile tab bar) stays pinned at the bottom on a 1920px monitor, and there is no keyboard navigation anywhere. The fix is a deliberate desktop + tablet UX pass that gives the app the layout discipline of a consumer browser product (Airbnb-grade — generous whitespace bounded by readable max-widths, strong visual hierarchy, sensible keyboard behavior) without losing the boomer-safe mobile UX it already has.

- [ ] **DTUX-01** — Diary forms (Void / Drink / Leak / Bedtime / Wake) constrain to readable widths at `md`+ breakpoints
  At ≥ 768px the bottom-sheet forms must cap content width (target: 2-column button grids fit inside ~`max-w-3xl`, slider rows inside ~`max-w-2xl`) so drink-type buttons aren't stadium-sized and the volume slider doesn't span 1800px. Buttons reflow into multi-column grids (4-up at `lg`, 2-up at `sm`). The bottom sheet itself becomes a centered modal-style card on `md`+, not a full-bleed sheet.
  *Files:* `src/components/diary/LogDrinkForm.tsx`, `LogVoidForm.tsx`, `LogLeakForm.tsx`, `SetBedtimeForm.tsx`, `SetWakeTimeForm.tsx`, plus shared sheet container in `src/components/ui/`.
  *Verify:* render each form at 768px / 1024px / 1440px / 1920px viewport widths in EN + AR (RTL); buttons + slider stay within reading-comfortable widths; the sheet does not stretch to the viewport edge.

- [ ] **DTUX-02** — AppShell chrome adapts at `md`+
  At ≥ 768px the BottomNav (mobile tab bar) is replaced by an integrated top-bar navigation in the Header (Home / Track / Diary inline, right-aligned next to the language switcher); the floating QuickLogFAB either repositions inside the content column or is replaced by an inline "Log event" button anchored to the timeline area; the Header itself spans the available width with proper internal max-width constraints; the Footer gets desktop-appropriate padding.
  *Files:* `src/components/layout/AppShell.tsx`, `Header.tsx`, `BottomNav.tsx`, `Footer.tsx`, `src/components/diary/QuickLogFAB.tsx`.
  *Verify:* visit `/en/diary/day/1` at 1440px — no bottom tab bar present, top-bar nav shows Home/Track/Diary, Log-event affordance is anchored to the day's content not the viewport corner; visit at 375px — original mobile chrome unchanged.

- [x] **DTUX-03** — Keyboard navigation: Enter advances, Escape closes sheets, Tab order is logical
  Every wizard step in onboarding and every form sheet in the diary advances on `Enter` (when the current step is valid). `Escape` closes any open bottom sheet / modal. Initial focus on sheet open lands on the first interactive element. Tab order flows top-to-bottom through buttons → inputs → primary action. Focus rings are visible (Tailwind `focus-visible:` ring tokens, not the suppressed `outline-none` pattern).
  *Files:* `src/components/onboarding/OnboardingFlow.tsx`, all `Log*Form.tsx` + `Set*Form.tsx`, shared sheet container, `src/components/ui/Button.tsx` (focus-visible token).
  *Verify:* keyboard-only walkthrough of onboarding (3 steps) + a single drink-log + a single void-log completes without touching the mouse; Escape closes the sheet from any point.

- [ ] **DTUX-04** — Onboarding flow uses editorial desktop layout (not a tiny input swimming in 1920px whitespace)
  The 3-step wizard (age → start date → timezone + units) gets a desktop-appropriate composition: wider content column with a supporting visual or progress chrome, age input scaled appropriately for desktop hit-target conventions (not the same compact mobile size), step indicator visible at all widths.
  *Files:* `src/components/onboarding/OnboardingFlow.tsx`, individual step components.
  *Verify:* render onboarding at 1440px; the active step occupies a confident portion of the viewport; the age input is keyboard-typable (already true) AND visually proportioned for desktop.

- [ ] **DTUX-05** — Summary + export page laid out for desktop (proper grid for metrics, hover affordances on export actions)
  Summary page metrics use a multi-column grid at `md`+ (e.g., 24HV / NPi / AVV / MVV / NBC laid out 5-up or 3-up + 2-up instead of stacked). Export action buttons (CSV / PDF / Share) get hover states and respect a reasonable max-width (don't stretch full-bleed).
  *Files:* `src/app/[locale]/summary/page.tsx`, `src/components/summary/`, `src/components/export/ExportActions.tsx`.
  *Verify:* render `/en/summary` after completing a 3-day diary at 1440px; metric grid is 3-up or 5-up not 1-up; export buttons hover + are reasonably-sized.

- [ ] **DTUX-06** — All 6 locales pass visual QA at `md` / `lg` / `xl` in both LTR and RTL
  Cross-locale walkthrough at desktop widths catches: PT/AR text overflow on wide buttons (long translations), font fallbacks for ZH/AR (CJK + Arabic glyphs), RTL physical-CSS leaks introduced during DTUX-01/02 (must use logical properties: `ms-`/`me-` not `ml-`/`mr-`, `start`/`end` not `left`/`right`), focus-ring visibility in dark and light backgrounds, AA contrast on hover and focus states.
  *Files:* runs against the production app via the `visual-qa` skill; any fixes land in the components touched by DTUX-01–05.
  *Verify:* `visual-qa` skill runs the 6-locale × LTR/RTL × `md`/`lg`/`xl` matrix; zero new findings logged to `walkthrough_findings.md`; existing daily walkthrough still green.

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

### Stabilization milestone (Phases 1–4)

| Phase | Requirements |
|-------|--------------|
| Phase 1: Locale + reminder + observation correctness | STAB-01, STAB-02, STAB-03 |
| Phase 2: Remaining tz + store hygiene | STAB-04, STAB-05 |
| Phase 3: UX polish + input validation | STAB-06, STAB-07, STAB-08 |
| Phase 4: Storage backend hardening | STAB-09 |

### Desktop & Tablet UX milestone (Phases 5–8)

| Phase | Requirements |
|-------|--------------|
| Phase 5: Layout foundation + AppShell chrome | DTUX-02 |
| Phase 6: Diary forms + keyboard navigation | DTUX-01, DTUX-03 |
| Phase 7: Onboarding + Summary surfaces | DTUX-04, DTUX-05 |
| Phase 8: Cross-locale visual QA + polish | DTUX-06 |

All 15 v1 requirements (9 STAB + 6 DTUX) mapped. Coverage: 100%.

---
*Requirements defined: 2026-05-14 (Stabilization). Desktop & Tablet UX milestone added 2026-05-14.*
