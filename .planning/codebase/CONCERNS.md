# Codebase Concerns

**Analysis Date:** 2026-05-14

## Tech Debt

**INTL_LOCALES map only covers 3 of 6 locales:**
- Issue: `INTL_LOCALES` in `src/lib/utils.ts` maps only `en`, `fr`, `es`. The `pt`, `zh`, `ar` locales are absent. Any call to `formatTime`, `formatDate`, `formatFullDate`, or `formatFullDayDate` with a `pt`, `zh`, or `ar` locale silently falls back to `'en-US'` formatting. Portuguese users see English month names; Arabic users see LTR date formatting.
- Files: `src/lib/utils.ts` (lines 8-11)
- Impact: Incorrect date/time display for 3 of 6 supported locales on all diary day pages and the summary page.
- Fix approach: Add `pt: 'pt-PT', zh: 'zh-TW', ar: 'ar-SA'` to the `INTL_LOCALES` constant.

**Duplicate day-attribution logic in `observations.ts`:**
- Issue: `src/lib/observations.ts` re-implements `getDayNumber` as `isVoidOnDay` and re-implements `getDateInTz` as a local function. The copy is subtly different: it misses the `hour > 5` guard present in `utils.getDayNumber` (line 345: `if (hour >= 0 && hour <= 5)`). The observations copy uses `hour <= 5`, which could mis-attribute a 5:59 AM event.
- Files: `src/lib/observations.ts` (lines 148-194), `src/lib/utils.ts` (lines 310-354)
- Impact: Edge case where a 5:59 AM void near day boundaries could generate wrong "consistent pattern" or "one night waking" observations.
- Fix approach: Import and use `getDayNumber` from `utils.ts` directly instead of duplicating.

**`VOLUME_PRESETS` deprecated constant still exported:**
- Issue: `src/lib/constants.ts` exports `VOLUME_PRESETS` marked `@deprecated` as an alias for `VOLUME_PRESETS_ML`. No component imports the deprecated export directly, but the symbol remains and could cause confusion on future edits.
- Files: `src/lib/constants.ts` (line 44-45)
- Impact: Low — dead export, not a runtime issue.
- Fix approach: Remove the `@deprecated` re-export once confirmed no external tooling references it.

**Notifications use browser-local time, not stored timezone:**
- Issue: `src/lib/notifications.ts` schedules reminders using `new Date()` and `next.setHours(hour, minute, 0, 0)` — which operates in the browser's local timezone, not the `timeZone` stored in the diary state. For a patient whose browser timezone differs from their stored diary timezone (travel, corporate VPN, misconfigured device), reminders fire at the wrong local time.
- Files: `src/lib/notifications.ts` (lines 88-96, 133-135)
- Impact: Reminders could fire hours off for patients who set a manual timezone during onboarding that differs from the browser's reported zone.
- Fix approach: Accept the stored `timeZone` string and use `buildIsoForClockTimeInTz` from `utils.ts` to compute the next occurrence.

**PDF graph X-axis uses raw `dt.getMinutes()` (browser-local tz):**
- Issue: `src/lib/exportPdf/graphs.ts` calls `getHoursInTz` for the hour component (timezone-correct) but uses `parseISO(iso).getMinutes()` for the fractional hour — a browser-local `getMinutes()` call. In UTC+offset zones where the UTC minute component differs from the local minute (always zero unless offset has a fractional hour like India UTC+5:30), this is fine. But the pattern is inconsistent with the rest of the codebase and will break for IST/NPT/AFT patients.
- Files: `src/lib/exportPdf/graphs.ts` (lines 210-211, 269-270)
- Impact: Scatter-plot dot positions slightly wrong on void volume chart for patients in UTC+X:30 or UTC+X:45 zones (India, Nepal, Afghanistan, Iran, Newfoundland).
- Fix approach: Replace `dt.getMinutes()` with `getMinutesInTz(v.timestampIso, state.timeZone)` from `utils.ts`.

**PDF 30-min slot filter uses raw `d.getMinutes()` (browser-local tz):**
- Issue: Same pattern as graphs.ts — `src/lib/exportPdf/slots.ts` uses `d.getMinutes()` in the `inSlot` filter function while relying on `getHoursInTz` for the hour check.
- Files: `src/lib/exportPdf/slots.ts` (line 152)
- Impact: Events appear in the wrong 30-minute row on the daily diary PDF grid for half-hour-offset timezone patients.
- Fix approach: Replace `d.getMinutes()` with `getMinutesInTz(iso, state.timeZone)`.

**`jspdf-autotable` type augmentation requires `@ts-expect-error` in 4 places:**
- Issue: `jspdf-autotable` adds `lastAutoTable` to the jsPDF instance at runtime but does not export a TypeScript declaration for it. The codebase works around this with four `@ts-expect-error` comments.
- Files: `src/lib/exportPdf/dailyDiary.ts` (line 134), `src/lib/exportPdf/combinedDiary.ts` (line 167), `src/lib/exportPdf/resultsOverview.ts` (line 80), `src/lib/exportPdf/machineData.ts` (line 63)
- Impact: Low runtime risk; build remains typed elsewhere. Risk is that a future `jspdf-autotable` version changes the property name silently.
- Fix approach: Add a local `declare module 'jspdf'` augmentation block that types `lastAutoTable` once, remove all four suppressions.

**`PREMIUM_FEATURES_ENABLED` is a compile-time constant, not env-controlled:**
- Issue: `src/lib/constants.ts` sets `PREMIUM_FEATURES_ENABLED = false` as a hardcoded boolean. Enabling premium features requires a source code change and redeploy. This is intentional for now but creates friction when the feature is commercialized.
- Files: `src/lib/constants.ts` (line 4), `src/lib/exportCsv.ts` (line 127), `src/lib/exportPdf/machineData.ts` (line 33), `src/lib/exportPdf/resultsOverview.ts` (line 51)
- Impact: Future work — not a current bug.
- Fix approach: Replace with `process.env.NEXT_PUBLIC_PREMIUM_FEATURES === 'true'` so it is togglable per deployment environment.

**`wakeTimes` null guard is inconsistently applied:**
- Issue: Some callers guard `state.wakeTimes` with `?? []` (e.g., `src/lib/calculations.ts` line 83, `src/lib/exportPdf/dailyDiary.ts` line 47), while `src/lib/observations.ts` line 114 calls `state.wakeTimes.find(...)` without a null guard. The type definition shows `wakeTimes: WakeTimeEntry[]` (non-nullable), but old persisted store v0/v1 data migrated without `wakeTimes` could produce `undefined` on hydration.
- Files: `src/lib/observations.ts` (line 114), `src/lib/store.ts` (migrate function, lines 330-343)
- Impact: Potential crash on `generateObservations` for users who have v0 store data that migrated without a `wakeTimes` field.
- Fix approach: Add `wakeTimes` initialization in the v1→v2 migration block, and add `?? []` guard in `observations.ts`.

## Known Bugs

**`checkMilestone` uses `sessionStorage` with a fixed key pattern, not per-locale:**
- Symptoms: After a locale switch, milestone toasts (first void, day complete) fire again in the new locale within the same browser session.
- Files: `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx` (lines 24-31)
- Trigger: User switches from `/en/diary/day/1` to `/fr/diary/day/1` without closing the tab.
- Workaround: None. The toast is only cosmetic so the clinical data is unaffected.

**Export error falls back to `alert()` — blocks the UI:**
- Symptoms: If PDF or CSV generation throws, a browser `alert()` appears. On mobile this is especially jarring: the share sheet may have already appeared and the alert renders beneath it.
- Files: `src/components/export/ExportActions.tsx` (lines 68, 94)
- Trigger: jsPDF throws on malformed state, or `navigator.share` rejects with a non-AbortError.
- Workaround: None. The toast system (`src/components/ui/Toast.tsx`) exists and could be used instead.

## Security Considerations

**`clinicCode` is accepted from URL query param without validation:**
- Risk: Any string (including script characters or very long values) is accepted from `?clinic=` and persisted to localStorage via `setClinicCode`.
- Files: `src/app/[locale]/LandingContent.tsx` (lines 45-49), `src/lib/store.ts` (line 147)
- Current mitigation: The clinic code is only displayed in the PDF export, so XSS via rendered HTML is not a direct risk. However, a very long string could inflate localStorage size.
- Recommendations: Validate with a regex (e.g., alphanumeric + dash, max 32 chars) before calling `setClinicCode`. Truncate or reject values exceeding a reasonable length.

**All data is localStorage only — no backup or recovery path:**
- Risk: Browser clear, private mode, or iOS Safari storage eviction deletes all diary data permanently mid-diary.
- Files: `src/lib/store.ts` (persist config, line 328)
- Current mitigation: None. The app documents no backup guidance.
- Recommendations: Add a "Download backup" option before diary start and on each day-complete screen; or document iOS Safari storage eviction risk explicitly in onboarding.

## Performance Bottlenecks

**`TimelineView.tsx` is 884 lines — single-component monolith:**
- Problem: One file contains timeline rendering, event grouping, delete confirmation, gap-insertion logic, night/day phase switching, journey step computation, and 10+ callbacks. Each re-render of the parent (`DayPageClient`) re-evaluates all of these.
- Files: `src/components/diary/TimelineView.tsx`
- Cause: Incremental feature additions without extraction into subcomponents.
- Improvement path: Extract `JourneyStepBanner`, `EventGapInsert`, and the delete-confirmation sub-state into separate components. Use `React.memo` on `TimelineEvent` (already a separate file).

**`computeMetrics` is called twice on the summary page:**
- Problem: `src/app/[locale]/summary/page.tsx` imports `generateObservations` which calls its own day-attribution loop; the export PDF path calls `computeMetrics` again independently. There is no shared memoized metrics object on the summary page.
- Files: `src/app/[locale]/summary/page.tsx`, `src/lib/observations.ts`, `src/lib/calculations.ts`
- Cause: Observations generator was built independently of the calculations module.
- Improvement path: Compute `DiaryMetrics` once on the summary page via `useMemo` and pass it down as a prop to both `SummaryObservations` and `ExportActions`.

**`jsPDF` + `jspdf-autotable` are runtime-imported on demand but all PDF sub-modules import each other eagerly:**
- Problem: `ExportActions.tsx` dynamic-imports `@/lib/exportPdf` only when the user taps the PDF button. However, `exportPdf/index.ts` imports all 7 sub-modules statically, so the full PDF bundle (graphs, slots, strings, theme, etc.) loads in one chunk even if only one page type is needed.
- Files: `src/lib/exportPdf/index.ts`
- Cause: Correct pattern at the entry point (dynamic import), but no code-splitting within the sub-modules.
- Improvement path: Low priority — the dynamic import boundary already keeps this out of the main bundle. No action needed unless PDF generation time becomes a concern.

## Fragile Areas

**`getDayNumber` early-AM pull-back interacts with `correctAfterMidnight` in ways that are easy to break:**
- Files: `src/lib/utils.ts` (lines 310-354, 555-583), `src/components/diary/LogVoidForm.tsx` (lines 55-57), `src/components/diary/LogDrinkForm.tsx` (lines 55-57), `src/components/diary/LogLeakForm.tsx` (lines 55-57)
- Why fragile: Three layers — form correctors, `getDayNumber`, and `reassignMorningVoid` — must stay in sync. Changing any threshold (e.g., the `hour <= 5` boundary) in one place without updating the others causes silent data mis-assignment. There is no integration test that verifies all three together across all timezone offsets.
- Safe modification: Read `docs/TIME_MODEL.md` before any change. Run the full test suite (`npx vitest run`) focusing on `boundaries.test.ts`, `edge-wake-times.test.ts`, `clock-pick-disambiguation.test.ts`.
- Test coverage: Good for known regressions; no fuzz-style coverage for arbitrary timezone × day-boundary combinations.

**`reassignMorningVoid` is called on every store mutation:**
- Files: `src/lib/store.ts` (lines 29-69, called in `addVoid`, `updateVoid`, `removeVoid`, `setBedtime`, `removeBedtime`, `setWakeTime`)
- Why fragile: The function iterates all voids on every write and re-calls `getDayNumber` on each. For a user with many voids, this is O(n) per write. Adding it to `removeBedtime` but not `removeWakeTime` is an asymmetry — removing a wake time does NOT re-run `reassignMorningVoid`.
- Safe modification: After any change to `setWakeTime`/`removeWakeTime`, verify that `isFirstMorningVoid` flags are recalculated correctly.
- Test coverage: Covered by `store.test.ts` for basic cases; edge case of FMV after `removeWakeTime` is not explicitly tested.

**`correctAfterMidnight` is NOT called in `SetWakeTimeForm` after `advanceIsoToAfter`:**
- Files: `src/components/diary/SetBedtimeForm.tsx` (line 47 — calls `correctAfterMidnight` then `advanceIsoToAfter`), `src/components/diary/SetWakeTimeForm.tsx` — uses only `advanceIsoToAfter`, not `correctAfterMidnight`.
- Why fragile: The two forms have slightly different correction chains. A pick of "12:30 AM" on Day 1's wake-time form would not get the `correctAfterMidnight` bump and might land on the day's own calendar date.
- Safe modification: Verify wake-time form behavior at midnight boundaries before any changes to time-correction helpers.

**PDF export has no error boundary — a single null field can crash the entire export:**
- Files: `src/lib/exportPdf/index.ts`, `src/lib/exportPdf/resultsOverview.ts`, `src/lib/exportPdf/graphs.ts`
- Why fragile: `computeMetrics` is called without a try/catch in `generatePdfBlob`. If any field in `DiaryState` is unexpectedly null (e.g., `state.timeZone` undefined in an old migration), the PDF throws and the error surfaces as a browser `alert`.
- Safe modification: Wrap `generatePdfBlob` internals in a try/catch with graceful partial rendering.
- Test coverage: `generate-test-exports.test.ts` covers happy path; no tests for malformed/incomplete state.

## Scaling Limits

**localStorage diary storage:**
- Current capacity: Modern browsers allow 5-10 MB per origin for localStorage.
- Limit: A 3-day diary with ~200 events (void + drink + leak + bedtime/wake) produces ~50-100 KB of JSON. Well within limits.
- Scaling path: Not applicable for the current 3-day design. If the diary were extended to 7+ days, IndexedDB would be appropriate.

**Content (MDX articles) is read synchronously at build time:**
- Current capacity: 19 articles across 6 locales = 114 MDX files. Build time is fast.
- Limit: `src/lib/content.ts` uses `fs.readdirSync` and `fs.readFileSync` in a module-level `loadAllArticles()` with an in-process `cache`. At 500+ articles, build scans would slow noticeably.
- Scaling path: Use Next.js `generateStaticParams` with individual file reads per route rather than scanning all files into memory.

## Dependencies at Risk

**`next-mdx-remote` v6 with React 19:**
- Risk: `next-mdx-remote` ^6.0.0 has community-reported issues with React 19's concurrent rendering in some edge cases (hydration mismatches on streamed content). No current symptoms observed, but upstream issue tracker shows open bugs.
- Impact: MDX article pages could show hydration warnings or content flicker.
- Migration plan: Monitor `next-mdx-remote` releases; pin to a minor release that is confirmed stable with React 19.2.x.

**`jspdf` v4 + `jspdf-autotable` v5 — no TypeScript augmentation:**
- Risk: `jspdf-autotable` adds `lastAutoTable` to the jsPDF prototype at runtime with no type declaration. Four `@ts-expect-error` comments suppress the type error. If a future `jspdf-autotable` release renames the property, the breakage is silent at compile time.
- Impact: PDF generation silently fails on the `lastAutoTable.finalY` position reads — every auto-table following the first on a page starts at the wrong Y coordinate.
- Migration plan: Add a local `jspdf-autotable.d.ts` augmentation; remove the `@ts-expect-error` comments so any rename becomes a compile error.

## Missing Critical Features

**Timezone not surfaced during the PDF or CSV exports:**
- Problem: The exported CSV includes the `timezone` field in the METADATA section, but the PDF results overview does not display the patient's stored timezone. A clinician receiving the PDF cannot tell which timezone the timestamps are anchored to.
- Blocks: Clinicians in multi-timezone practices cannot reliably interpret timestamps on the paper PDF without going to the CSV.

**No data-loss warning before `resetDiary`:**
- Problem: `LandingContent.tsx` shows a confirm dialog before `resetDiary`, but `handleStartNew` calls `resetDiary()` without a final "you will lose all data" confirmation showing the current diary's event count. The existing confirm text is generic.
- Blocks: Patients who tap "start over" by mistake lose all 3 days of data with no recovery path.

## Test Coverage Gaps

**No tests for PDF sub-modules individually:**
- What's not tested: `src/lib/exportPdf/graphs.ts`, `src/lib/exportPdf/slots.ts`, `src/lib/exportPdf/strings.ts`, `src/lib/exportPdf/resultsOverview.ts` have no unit tests. `generate-test-exports.test.ts` tests the full pipeline but does not verify individual page layout logic.
- Files: `src/lib/exportPdf/` (all sub-modules)
- Risk: Regressions in the graphs or daily-diary grid are invisible until visually inspected.
- Priority: Medium

**No tests for `observations.ts` edge cases with incomplete diaries:**
- What's not tested: `observations.test.ts` covers the happy path (full 3-day diary). There are no tests for observations generated on a 1-day or 2-day partial diary, or with missing wakeTimes.
- Files: `src/lib/observations.ts`, `src/lib/__tests__/observations.test.ts`
- Risk: `generateObservations` called from summary page before diary is fully complete (e.g., during the summary preview at day 2) could crash or return spurious observations.
- Priority: Medium

**No tests for `ExportActions` component behavior:**
- What's not tested: The share-vs-download branching logic, error handling path (alert fallback), and export button disabled state based on `hasData`.
- Files: `src/components/export/ExportActions.tsx`
- Risk: Silent regression if `canShareFiles` logic changes or share API behavior changes across browsers.
- Priority: Low

**No tests for `notifications.ts` scheduling:**
- What's not tested: `scheduleReminders` and `scheduleDiaryCompleteReminder` are untested. The timezone-agnostic `getNextOccurrence` function could schedule a reminder in the past for patients in non-browser-local timezones.
- Files: `src/lib/notifications.ts`
- Risk: Reminders either don't fire or fire immediately for affected users.
- Priority: Low

**Curated timezone list omits major Canadian cities:**
- What's not tested: Patients in `America/Toronto`, `America/Vancouver`, `America/Halifax` must rely on the auto-detect path. If browser timezone detection returns a generic alias (e.g., `America/Detroit` instead of `America/Toronto`), the onboarding picker shows the raw IANA string rather than a friendly city name.
- Files: `src/components/onboarding/OnboardingFlow.tsx` (lines 16-37)
- Risk: Canadian patients (a significant cohort given the IPC focus on NA clinicians) may see an unfamiliar timezone string during onboarding.
- Priority: Low

---

*Concerns audit: 2026-05-14*
