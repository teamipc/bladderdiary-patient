---
audit: comprehensive
reviewed: 2026-05-18
scope: all src/ files (133 TS/TSX files, plus public/sw.js)
depth: deep
status: issues_found
findings:
  critical: 2
  high: 3
  medium: 7
  low: 11
  total: 23
---

# Comprehensive Code Audit — 2026-05-18

## Executive Summary

- **Total findings: 23** — Critical: 2, High: 3, Medium: 7, Low: 11
- **Top 3 priorities to address before Milestone 3:**
  1. **Discard-but-save bug in edit forms** (Critical) — clicking "Discard" in the ConfirmDialog actually saves the dirty data because the form's autosave cleanup runs on unmount. Defeats the explicit "Your changes won't be saved" promise. Clinical data integrity risk.
  2. **JsonLd `</script>` escape gap** (High) — `JSON.stringify(data)` inside `<script type="application/ld+json">` does not escape `</`. Defense-in-depth XSS risk if any frontmatter field ever contains `</script>...`. Current authoring pipeline is trusted, so the realized risk is low — but the fix is one line and removes a category of future regressions.
  3. **`NextStepBanner` uses browser-local `getHours()`** (High) — picks "bedtime vs. keep logging" prompt by `new Date().getHours()` instead of the stored timezone. Patients whose browser timezone differs from their stored diary timezone see the wrong nudge. Cosmetic, not clinical, but in the same anti-pattern family as the older bugs the time model was designed to eliminate.

- **One-sentence verdict:** This codebase is in **substantially better shape than CONCERNS.md (2026-05-14) reflects** — Phases 1-8 closed most of the silent-bug fronts (INTL locales, notifications tz, PDF graphs tz, IndexedDB migration, hydration races, clinic-code XSS, export-error toast). The remaining real issues are concentrated in (a) the autosave-on-unmount pattern in edit forms that now conflicts with the new Discard ConfirmDialog, (b) a small set of `new Date().getXxx()` leaks in non-clinical UX paths, and (c) the long-standing 884-line `TimelineView.tsx` monolith. None of the IPC clinical calculations or export pipelines show correctness regressions.

---

## Findings

### CRITICAL

#### CR-01: Discard button in edit forms actually saves the changes (data integrity)

- **Severity:** Critical
- **Location:** `src/components/diary/LogVoidForm.tsx:146-162`, `src/components/diary/LogDrinkForm.tsx:115-129`, `src/components/diary/LogLeakForm.tsx:101-116`, `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx:284-287`
- **Symptom:** All three edit forms (`LogVoidForm`, `LogDrinkForm`, `LogLeakForm`) register a cleanup `useEffect` that calls `updateVoid` / `updateDrink` / `updateLeak` when the form unmounts, gated only by `savedRef.current`. Phase 6 added a dirty-state Discard flow (`handleDiscardConfirm` → `closeSheet` → `setSheetMode(null)` → form unmounts). The cleanup fires AFTER discard is confirmed, so the patient's "discarded" edits are silently persisted. `savedRef.current` is only set to `true` inside the explicit `handleSave()` path, never on discard.
- **Why it matters:** Two failure modes:
  1. **Clinical correctness:** A clinician reads a void volume that the patient explicitly *rejected*. The diary appears edited when the patient was told their changes were discarded.
  2. **Trust:** The ConfirmDialog tells the patient (`messages/en.json:common.discardEntryMessage`) "Your changes won't be saved." The app contradicts that promise the next millisecond. If a patient notices, they lose trust in the whole tool.
  No test covers this flow (no `discard` keyword in `src/__tests__/`).
- **Suggested fix:** Either (a) remove the autosave-on-unmount entirely — Phase 6 introduced explicit Save + Discard, autosave is now redundant — or (b) add a `discardedRef` that `handleDiscardConfirm` flips before unmounting, and check it alongside `savedRef.current` in the cleanup. Option (a) is simpler and matches the stated UX contract. Add a regression test that opens an edit form, modifies a field, dispatches discard, and asserts the store value is unchanged.

#### CR-02: Auto-save cleanup makes "Discard" unreachable on swipe-down close too

- **Severity:** Critical
- **Location:** Same files as CR-01.
- **Symptom:** When the user dismisses the BottomSheet by tapping the backdrop, swiping down, or pressing Escape, `handleSheetClose` runs. If the form is dirty, ConfirmDialog appears. If the user confirms Discard, the autosave still fires (CR-01). If the user picks Keep editing, the BottomSheet stays open — the form doesn't unmount, so this path is safe. **But:** if `pendingClose` somehow becomes `false` while the sheet remains open (race with rapid taps, or a future bug in `BottomSheet`'s `inert` toggling), the form CAN unmount with autosave still primed. The autosave is effectively a foot-gun anchored to a fragile assumption.
- **Why it matters:** Same correctness/trust failure as CR-01, but harder to reproduce. The autosave pattern is incompatible with the dirty-state Discard flow as a class of bug, not a single instance.
- **Suggested fix:** Same as CR-01 — remove autosave-on-unmount. The forms now have an explicit Save button and explicit Discard via ConfirmDialog. Autosave is dead UX.

---

### HIGH

#### HI-01: `<script type="application/ld+json">` does not escape `</`

- **Severity:** High
- **Location:** `src/components/seo/JsonLd.tsx:59`
- **Symptom:** `JSON.stringify(data)` is rendered into `dangerouslySetInnerHTML`. JSON.stringify does not escape `<` or `</` to `<` / `<\/`. If any frontmatter field (title, description, alt text, citation title, author bio) ever contains the literal string `</script>...`, the JSON-LD script tag breaks out and the rest is parsed as HTML.
- **Why it matters:** The current content pipeline is trusted (articles authored by the team, translations from `article-translate` skill). But defense-in-depth: an article-translate hallucination, a CMS pipeline change, or future user-supplied content fields (e.g., clinic-code-driven institutional intros) would silently expose the entire app to script injection on every page that renders the affected JSON-LD. Static export means the breach is baked into the deployed HTML.
- **Suggested fix:** Replace `JSON.stringify(data)` with `JSON.stringify(data).replace(/</g, '\\u003c')` (or use a dedicated helper). One-line change; removes the entire class.

#### HI-02: `NextStepBanner` decides "bedtime vs. keep logging" by browser-local `getHours()`

- **Severity:** High
- **Location:** `src/components/diary/NextStepBanner.tsx:79`
- **Symptom:** `const hour = new Date().getHours();` — this is the browser's local-timezone hour, not the patient's stored `timeZone`. A patient who set their diary to Asia/Singapore but whose browser reports UTC (corporate VPN, Linux dev box, falsely configured Android) sees "Time for bed" at 4 AM Singapore (UTC 20:00) and "Keep logging" at 8 PM Singapore (UTC 12:00).
- **Why it matters:** This is the exact anti-pattern documented in `docs/TIME_MODEL.md` and called out as a closed front. Reintroducing it in a UX banner — not a clinical calculation — is bounded harm, but it (a) re-establishes a habit the canonical time model spent months eliminating and (b) misleads patients about when they should wind down. Every other timezone read in the codebase uses `getHoursInTz`. This one was missed.
- **Suggested fix:** Replace with `const hour = getHoursInTz(new Date().toISOString(), timeZone);` after pulling `timeZone` from `useDiaryStore()`. One-line change.

#### HI-03: `anchorTimeLabel` in `reminders.ts` uses `new Date().setHours()`

- **Severity:** High
- **Location:** `src/lib/reminders.ts:10-14`
- **Symptom:** `d.setHours(anchor === 'coffee' ? 8 : 7, anchor === 'bathroom' ? 15 : 0, 0, 0)` — sets hours in browser-local time, then formats. The displayed label ("8:00 AM") thus reads as 8:00 in browser-local TZ, not in the patient's stored TZ. If browser ≠ stored TZ, the reminder label shown in the Day 1 Celebration and Day 2 Reminder Card is hours off.
- **Why it matters:** The ICS file the patient downloads uses "floating local time" — by RFC 5545 that fires at 8 AM in whatever timezone the phone is in at trigger time. So the actual reminder will fire correctly. But the displayed label "8 AM" is wrong for travelers / corporate-VPN'd patients. Confusing, not clinically dangerous.
- **Suggested fix:** Accept `timeZone` from the call site and use `formatTime(buildIsoForClockTimeInTz(...), locale, timeZone)`. Mirrors the same fix pattern used in `notifications.ts`.

---

### MEDIUM

#### ME-01: `TimelineView.tsx` is 884 lines (god-component)

- **Severity:** Medium
- **Location:** `src/components/diary/TimelineView.tsx`
- **Symptom:** Single file owns: day/night-phase switching, 5-step journey strip, event grouping/sorting, gap-insertion logic, 5 delete-confirmation variants, reset-confirmation overlay, night/day visual mode, ChevronLeft/Right navigation, day-complete indicator, bedtime reminder, wake reminder, FAB-clearance padding, RTL handling, and 10+ callbacks. Re-renders on every `getVoidsForDay` / `getDrinksForDay` / `getLeaksForDay` call.
- **Why it matters:** Highest-traffic component in the diary, with the most failure surface area and zero unit tests (`grep TimelineView src/__tests__/` = 0 hits). Touching anything here is high-risk because the file is uncomprehended. The CONCERNS.md callout from 2026-05-14 still stands; it has not regressed but it has not improved.
- **Suggested fix:** Split into ≥4 components: `JourneyStrip`, `DayHeader` (navigation arrows + day label + progress subtitle), `EventInsertGap` (the `+` button + chip rail), `ResetConfirmOverlay`. Memoize `TimelineEvent` with `React.memo`. Add a Vitest unit test for the day-vs-night event filter (`voids = isNighttime ? ... : hasWakeTime ? ... : ...` chain — three conditionals nested, easy to break).

#### ME-02: Summary page calls `generateObservations` twice per render

- **Severity:** Medium
- **Location:** `src/app/[locale]/summary/page.tsx:37, 242` (calls generateObservations directly for the top-standout), `src/components/summary/SummaryObservations.tsx:24` (which also calls generateObservations).
- **Symptom:** `topObservation = generateObservations(store)[0]` runs on every summary render. `<SummaryObservations omitKeys={...} />` then renders, which again calls `generateObservations(state)`. Same store snapshot, same output, computed twice. Plus `computeMetrics` is implicitly run via `ExportActions` for every export-button render even without clicking.
- **Why it matters:** Correctness-stable (pure function), but wastes work and makes the summary page slower to settle on lower-end devices. Patient population skews 50+, often on older phones.
- **Suggested fix:** Hoist `const observations = useMemo(() => generateObservations(store), [store])` in `SummaryPage`, pass `observations` and `topObservation` as props down to `SummaryObservations`. Note: out of v1 scope per the audit framing, but flagging because the doubled call sits next to clinical metrics — useful to fix during any summary-page refactor.

#### ME-03: `useDiaryStore` `tdt` dependency in `TimelineView` likely re-fires `useCallback` per render

- **Severity:** Medium
- **Location:** `src/components/diary/TimelineView.tsx:170-186`
- **Symptom:** `requestDeleteDrink` lists `tdt` in its `useCallback` deps. `useTranslations('drinkTypes')` returns a new function on each render in next-intl. Same for `tlt` in `requestDeleteLeak`. Net effect: the `useCallback`s never memoize and `TimelineEvent` children re-render on every parent render.
- **Why it matters:** Bounded performance cost. Not a correctness bug. But the intent of the `useCallback` is defeated, and a future `React.memo(TimelineEvent)` would not actually skip renders.
- **Suggested fix:** Pull the localized labels out of the `useCallback` deps — e.g., precompute `const drinkLabel = useMemo(() => tdt(d.drinkType), [tdt, d.drinkType])` inside a `useEffect` or memo the localized strings at the point of use. Cleaner: pass the unlocalized data through `pendingDelete.label` and translate only where rendered.

#### ME-04: `LogVoidForm`, `LogDrinkForm`, `LogLeakForm` have `eslint-disable-next-line react-hooks/exhaustive-deps` on the autosave effect

- **Severity:** Medium
- **Location:** `src/components/diary/LogVoidForm.tsx:161`, `src/components/diary/LogDrinkForm.tsx:128`, `src/components/diary/LogLeakForm.tsx:115`
- **Symptom:** The empty-deps `useEffect` for autosave intentionally bypasses ESLint. Combined with CR-01/CR-02, this is the same root cause: the effect was written to run *once* and clean up on unmount, but the cleanup writes to the store with stale-ref data outside the React render cycle.
- **Why it matters:** The eslint-disable is a marker of an intentional override that no longer survives the Phase 6 Discard contract. Removing the effect (CR-01 fix) also removes this lint suppression — clean fix.
- **Suggested fix:** Folded into CR-01.

#### ME-05: `observations.ts` `caffeineToBathroom` uses raw UTC `getTime()` comparisons; never checks day-attribution

- **Severity:** Medium
- **Location:** `src/lib/observations.ts:55-62, 75-85`
- **Symptom:** `drinkFollowedByVoid` looks at all voids within 120 minutes of any caffeine drink, regardless of which diary day the drink is on. The function then surfaces "caffeine to bathroom" if `≥ 2` drinks have a following void. This is fine for patients with continuous time, but the function does not exclude Day 1 (the adaptation day excluded from IPC clinical metrics). So Day 1 caffeine-to-bathroom patterns can produce an observation that contradicts the patient's actual 24HV/AVV inputs.
- **Why it matters:** Patient sees "We noticed coffee tends to send you to the bathroom" based on a day the metrics explicitly ignore. Not a calculation error, but inconsistent framing.
- **Suggested fix:** Filter caffeine drinks to Day 2/Day 3 via `getDayNumber(d.timestampIso, state.startDate, state.bedtimes, state.timeZone) !== 1` before the count check. Same fix in `eveningFluids` / `morningFluids` if Day 1 should be excluded from those too (open product question — defer to user before changing).

#### ME-06: `feed.xml/route.ts` inlineMd does not escape `"` in markdown link URLs

- **Severity:** Medium
- **Location:** `src/app/[locale]/feed.xml/route.ts:26-31`
- **Symptom:** `inlineMd` first runs `escapeHtml` (which escapes `&<>` but not `"`), then runs the markdown link replacement `/\[([^\]]+)\]\(([^)]+)\)/g` → `<a href="$2">$1</a>`. The URL `$2` is captured from the original (un-escaped) text. A URL containing a literal `"` would close the `href` attribute and inject raw HTML into the RSS feed.
- **Why it matters:** Article body URLs are author-controlled and almost never contain `"`. But the RSS feed is fetched by third-party readers (Feedly, etc.) that might render the HTML — injection there could affect those readers. Low realistic risk but trivial to harden.
- **Suggested fix:** Apply `escapeHtml`-equivalent (including `"` → `&quot;`) to the URL before substitution: `replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => \`<a href="${url.replace(/"/g, '&quot;')}">${text}</a>\`)`.

#### ME-07: `public/sw.js` caches bare paths (`/`, `/diary/day/1`...) but the deployed site serves `/en/...` 

- **Severity:** Medium
- **Location:** `public/sw.js:10-27`
- **Symptom:** Service worker `install` event pre-caches `'/'`, `'/diary/day/1'`, `'/diary/day/2'`, `'/diary/day/3'`, `'/summary'`, `'/help'`. With `output: "export"`, those routes only exist via Vercel's `vercel.json` rewrites (`/diary/day/:n` → `/en/diary/day/:n`). The actual static HTML files are under `out/en/...`. So the SW caches the *redirected* response (or the rewritten one) for the EN locale only — French/Spanish/etc. users never benefit from offline pre-cache.
- **Why it matters:** PWA-offline only works for en-locale users. fr/es/pt/zh/ar patients who lose connectivity on Day 2 get a stale offline experience.
- **Suggested fix:** Either (a) cache all 6 locale paths at install time (`/en/diary/day/1`, `/fr/diary/day/1`, etc.), or (b) shift to a cache-on-visit strategy — only the routes the user has actually opened get cached, and accept that first offline visit fails. Option (b) is simpler and matches user behavior (they visit en or their locale first, then disconnect).

---

### LOW

#### LO-01: Deprecated `VOLUME_PRESETS` export still in `constants.ts`

- **Severity:** Low
- **Location:** `src/lib/constants.ts:44-45`
- **Symptom:** The aliased export is marked `@deprecated` but still emitted. Form files (`LogVoidForm`, `LogDrinkForm`) use a *local* `VOLUME_PRESETS` variable, not this import — confirmed by grep. The deprecated export has zero consumers.
- **Why it matters:** Dead code. A future developer who imports `VOLUME_PRESETS` thinking it's "the canonical preset list" gets a different shape (`readonly number[]`) than the local `VOLUME_PRESETS` in the forms (`{ id, value }[]`), and TypeScript won't necessarily catch the misuse at the call site.
- **Suggested fix:** Delete the export. Verify no external tooling (linter rule, IDE refactor, future test) is referencing it. One-line removal.

#### LO-02: `OnboardingFlow` curated timezone list omits Canadian cities

- **Severity:** Low
- **Location:** `src/components/onboarding/OnboardingFlow.tsx:17-38`
- **Symptom:** `CURATED_TIMEZONES` list includes US (`America/New_York`, etc.) but no `America/Toronto`, `America/Vancouver`, `America/Halifax`. Canadian patients fall through to whatever the browser auto-detects.
- **Why it matters:** Patient population includes Canadian clinics (IPC is NA-focused). Browser autodetect usually works, but on misconfigured devices it can return `America/Detroit` (mapped to NY) or `America/Edmonton` (mapped to Denver) which is jarring for a Toronto patient.
- **Suggested fix:** Add the 3 Canadian zones to the curated list. Three-line edit.

#### LO-03: `error.tsx` content is hardcoded English

- **Severity:** Low
- **Location:** `src/app/error.tsx:29-33, 41`
- **Symptom:** "Something went wrong", "An unexpected error occurred. Your diary data is safe...", "Try again" — all hardcoded English. A French/Arabic/Chinese patient hitting an unhandled error sees English copy.
- **Why it matters:** Error boundary surfaces are rare but the moment they fire, the user is already stressed. Showing wrong-locale text adds friction. Bounded harm because the file lives at the root layout — pre-NextIntl tree.
- **Suggested fix:** Move error.tsx into `src/app/[locale]/error.tsx` so it can call `useTranslations`. Or accept English as the fallback for unhandled errors (defensible since the React root may itself have failed).

#### LO-04: `IpcInfoModal` and `usePwaInstall` use `// eslint-disable-next-line react-hooks/set-state-in-effect`

- **Severity:** Low
- **Location:** `src/components/ui/IpcInfoModal.tsx:26`, `src/lib/usePwaInstall.ts:33`
- **Symptom:** Both use `setState` inside `useEffect` without dependency on changing state. Marker comments indicate intentional override. In `IpcInfoModal` the pattern is `setMounted(true)` to enable client-only portal rendering — that's the canonical SSR-safe pattern. In `usePwaInstall` it's `setIsInstalled(isStandalone)` after a `matchMedia` check.
- **Why it matters:** Both are correct usages of the eslint-disabled pattern, but they're slightly fragile to anyone refactoring without context. Documentation-by-comment is fine; just flag that the pattern is intentional.
- **Suggested fix:** None required. If a future React rule changes, audit these two sites first.

#### LO-05: `removeWakeTime` does not call `reassignMorningVoid`

- **Severity:** Low
- **Location:** `src/lib/store.ts:317-320`
- **Symptom:** `setWakeTime` triggers `reassignMorningVoid` to update FMV flags. `removeWakeTime` does NOT — it just filters out the entry. If a patient sets a wake time, gets an FMV flagged, then removes the wake time, the FMV flag stays on the now-orphaned void. Subsequent reads of the day's voids will report `isFirstMorningVoid: true` even though no wake exists.
- **Why it matters:** Calculations.ts `calcNocturnalVolume` uses `fmv?.timestampIso ?? wakeTime?.timestampIso` as the end boundary. If the FMV flag is stale and no wake is set, the nocturnal period extends to the stale FMV — potentially producing a non-zero nocturnal volume on what should be an undefined night. Bounded because the UI typically prevents this state (you can't remove wake while bedtime is still set with the standard flow), but back-edits could trigger it.
- **Suggested fix:** Mirror `setWakeTime`: after `removeWakeTime`, call `reassignMorningVoid(s.voids, dayNumber, s.startDate, s.bedtimes, newWakeTimes, s.timeZone)` so the day's FMV flag clears when there's no wake. Add a unit test for the wake-remove → FMV-cleared invariant.

#### LO-06: `LogVoidForm` "VOLUME_PRESETS" local naming shadows the deprecated import

- **Severity:** Low
- **Location:** `src/components/diary/LogVoidForm.tsx:109`, `src/components/diary/LogDrinkForm.tsx:90`
- **Symptom:** Local `const VOLUME_PRESETS = ...` shadows the (still-exported) deprecated module constant. Not a bug today because the forms don't `import VOLUME_PRESETS`, but if they did the local would silently override at file scope.
- **Why it matters:** Confusing for future contributors who grep `VOLUME_PRESETS` and find two definitions with different shapes.
- **Suggested fix:** Once LO-01 is fixed, also rename the locals to `volumePresets` (camelCase, locally scoped — matches `mostRecentPriorVoid`) for clarity.

#### LO-07: Service worker `addAll` will fail entirely if any one of the pre-cached URLs 404s

- **Severity:** Low
- **Location:** `public/sw.js:12-23`
- **Symptom:** `cache.addAll([...])` rejects atomically — any 404 in the list causes the entire SW install to fail. This includes the bare paths that depend on vercel.json rewrites. If Vercel routing changes or rewrites are temporarily broken, every patient's PWA install fails silently and they get no offline support until the next SW update.
- **Why it matters:** Bounded — the SW install only runs once and silently in `ServiceWorkerRegistration.tsx`. Patients still get a fully-functional online app. But the offline guarantee evaporates.
- **Suggested fix:** Replace `cache.addAll(...)` with a loop of `cache.add(url).catch(() => {})` so individual misses don't kill the whole install.

#### LO-08: `getDayDate` and `addOneDayString` use `parseISO + addDays` which run in UTC; comments say tz-aware

- **Severity:** Low
- **Location:** `src/lib/utils.ts:364-371, 504-511`
- **Symptom:** `getDayDate(startDate, dayNumber)` parses `startDate + 'T12:00:00'` and adds N days. Because the input is bare `YYYY-MM-DDTHH:MM:SS` with no timezone, `parseISO` interprets it as local time (browser-local!). Then `getFullYear / getMonth / getDate` read in browser-local time. The result is browser-local-anchored, not timezone-anchored. For most dates this is fine — Day 1 = 2026-04-13 → Day 2 = 2026-04-14, etc. But on DST-change days where browser-local hits the transition, this can drift.
- **Why it matters:** `getDayDate(startDate, 3)` for a patient in `America/New_York` whose browser reports `Europe/London` will return the wrong date string at certain edge times. The comments at line 364 imply tz-awareness; the implementation is not tz-aware. Real-world impact is small (the anchor is 12:00 noon, which is well clear of midnight in any DST shift), but the gap exists.
- **Suggested fix:** Replace with `getDateInTz(buildIsoForClockTimeInTz(startDate + 'T12:00:00Z', 12, 0, timeZone), timeZone)` and increment via day-count math in the user's tz. Defer until the time-model owner audits — `getDayDate` is on the canonical path and the existing tests pass, so this may be a "comment is wrong" issue rather than a latent bug.

#### LO-09: `Day1Celebration` `useEffect` toggles `document.body.style.overflow` like `BottomSheet`

- **Severity:** Low
- **Location:** `src/components/diary/Day1Celebration.tsx:31-37`, `src/components/ui/BottomSheet.tsx:37-46`
- **Symptom:** Two separate effects both set `document.body.style.overflow = 'hidden'` on open and `''` on close. If BottomSheet is open AND Day1Celebration opens (e.g., user opens info modal mid-celebration), the unmount cleanup of one resets to `''` while the other still expects `'hidden'`. Currently the flow doesn't allow this overlap, but the global side-effect is fragile.
- **Why it matters:** Edge-case scrolling bug that would manifest as "page scrolls under the modal" if the order ever changes.
- **Suggested fix:** Use a ref-counted overflow guard, or move both to a single global `useBodyScrollLock(active: boolean)` hook. Out of v1 scope; documenting for hygiene.

#### LO-10: `LandingContent` `setShowOnboarding(false)` after `handleStartNew` may flash hero before route-clear runs

- **Severity:** Low
- **Location:** `src/app/[locale]/LandingContent.tsx:93-98`
- **Symptom:** `handleStartNew` calls `resetDiary()`, `setShowResetConfirm(false)`, `setShowOnboarding(false)` — all React state changes. The store reset is async (IndexedDB write). For one render, `diaryStarted` is still `true` (until persist hook fires), and `showOnboarding` is `false`, so the user sees the "Welcome back" hero for ~1 frame before flipping to the empty-state hero.
- **Why it matters:** Cosmetic flash. Not a correctness bug. Possibly invisible at 60fps.
- **Suggested fix:** None unless a user reports the flash. The current behavior matches the previous localStorage-sync codebase; the IDB migration likely lengthened the gap.

#### LO-11: `summary/layout.tsx` sets `robots: noindex` only on the parent layout; deep-link from external sites would still get HTML

- **Severity:** Low
- **Location:** `src/app/[locale]/summary/layout.tsx`
- **Symptom:** The `metadata.robots = { index: false, follow: false, nocache: true }` correctly emits `<meta name="robots" content="noindex,nofollow,noarchive">` in the static HTML. `robots.ts` also `Disallow:`s `/*/summary/`. But a search engine that already indexed the URL before robots was hardened would still hit the static file; only its index re-pass would respect the noindex.
- **Why it matters:** Historical. New patients won't be indexed. This is informational only.
- **Suggested fix:** None. If concerned, manually request reindex of all `/*/summary` URLs via Google Search Console.

---

## Code-health snapshot

### TypeScript strictness posture
- **Strong.** `strict: true` in tsconfig, no `as any` anywhere in `src/` (verified), only 4 `@ts-expect-error` comments — all in `exportPdf/` against the `jspdf-autotable` type-augmentation gap (still unresolved but bounded). The codebase is one of the cleanest strict-TS codebases I've audited.
- One isolated `as unknown as DiaryStore` in the store migration path (`src/lib/store.ts:152`) — pragmatic, well-commented, scoped to a known boundary.

### Test coverage gaps in clinical-correctness code
- **Strong on the core**: `calculations.test.ts` (516 lines), `boundaries.test.ts` (330 lines), `edge-cases.test.ts`, `back-edits-after-completion.test.ts`, `patient-a-paper-diary.test.ts`, `patient-b-paper-diary.test.ts`, `wake-time-edit-bug.test.ts`, `clock-pick-disambiguation.test.ts` cover the day-boundary system and IPC metrics thoroughly.
- **Gaps:**
  1. **No tests for the discard flow** (CR-01) — the bug exists today and no regression guard exists.
  2. **No tests for `removeWakeTime` FMV invariant** (LO-05).
  3. **No tests for individual `exportPdf/` sub-modules** (`graphs.ts`, `slots.ts`, `strings.ts`, `resultsOverview.ts`). Only the full pipeline integration test (`generate-test-exports.test.ts`) covers them — visual regressions in graph layout could ship unnoticed.
  4. **No tests for `TimelineView.tsx`** — 884 lines of UI logic with zero coverage.
  5. **No tests for `observations.ts` with partial diaries** — only happy-path 3-day diaries are tested. A Day-1-only or Day-2-only patient hitting the summary preview path could produce spurious observations and no test would catch it.

### Architectural smells worth naming
1. **Form-component complexity drift**: `LogVoidForm.tsx` (554 lines), `LogLeakForm.tsx` (454 lines), `LogDrinkForm.tsx` (400 lines). Each one is a multi-step wizard with its own dirty-state, time-correction, validation, and autosave logic. The patterns are 90% identical across the three. A `useEntryForm({ entry, schema, validators, ... })` hook could collapse them by half. (Out of v1 scope, noting for milestone planning.)
2. **`TimelineView.tsx` is the highest-risk file** — most lines, most surface, zero unit tests, owns the day/night switching that interacts with the time model. Should be the first thing milestone 3 touches if any structural work is planned.
3. **Three "smart default time" helpers (`getDefaultTimeForDay`, `getNightDefaultTime`, `correctNightDate`, `correctAfterMidnight`, `advanceIsoToAfter`) compose subtly in each form**. The composition is correct today but the call sites repeat the conditional logic; a single helper like `resolveEventTime(form, intent, baseTime, timeZone)` would centralize the contract.
4. **Layered conditional rendering in `DayPageClient`**: 5 different forms inside one BottomSheet, gated by `sheetMode`. Adding a 6th log type would mean editing 4 places. A registry pattern (`FORM_REGISTRY: Record<SheetMode, { Component, label, dirtyKey }>`) would let new forms plug in.

---

## What's NOT a problem (so don't second-guess these)

This section is deliberately long, because the old CONCERNS.md was 2026-05-14 and Phases 1-8 closed a lot of fronts.

### CONCERNS.md items that ARE genuinely fixed
1. **INTL_LOCALES covers all 6 locales** — `src/lib/utils.ts:8-15` now lists en/fr/es/pt/zh/ar. The old "silent fallback to en-US for pt/zh/ar" is closed.
2. **Notifications use stored timezone** — `src/lib/notifications.ts:96-108` uses `buildIsoForClockTimeInTz` and `getDateInTz`. Travel/VPN/misconfigured-device case is handled.
3. **PDF graph X-axis uses tz-aware minute math** — `src/lib/exportPdf/graphs.ts:209, 267` use `getMinutesInTz`. India/Nepal/Newfoundland half-hour-offset patients are correctly placed.
4. **PDF 30-min slot filter uses tz-aware minute math** — `src/lib/exportPdf/slots.ts:150` uses `getMinutesInTz`. Same fix as above for the daily-diary grid.
5. **`observations.ts` no longer duplicates day-attribution logic** — `isVoidOnDay` now delegates to `getDayNumber` (line 155-157). The 5:59 AM edge case is closed.
6. **Export-failure path uses Toast, not `alert()`** — `src/components/export/ExportActions.tsx:70, 88, 114, 128`. Regression test exists (`export-actions-error-toast.test.tsx`).
7. **`clinicCode` URL param is validated** — `CLINIC_CODE_RE = /^[A-Za-z0-9-]{1,32}$/` in `LandingContent.tsx:47`. 11 unit tests in `clinic-code-url-validation.test.tsx`.
8. **Milestone-toast dedup is locale-stable** — verified by `milestone-toast-locale-switch.test.tsx`. The behavior the old CONCERNS.md flagged as a bug is now the *intended* contract.
9. **Store migration to IndexedDB** — `storage/indexedDbAdapter.ts` with proper localStorage→IDB migration, Safari ITP-resistant. Tests in `storage-adapter.test.ts` and `storage-adapter.failure.test.ts`.
10. **Hydration races on `/summary`, `/diary/day/N`, `/`** — all three pages now gate redirects behind `useStoreHydrated()` per the documented pattern. Tests in `wake-time-edit-bug.test.ts` validate the hydration contract.

### Architectural strengths
- **`getDayNumber` three-layer model holds**. No alternative day-attribution exists anywhere else in `src/`. The `observations.ts` duplication is gone. The contract documented in `docs/TIME_MODEL.md` is honored.
- **IPC clinical calculations are bulletproof**. `calculations.ts` is small, pure, well-named, and exhaustively tested. Day-1 exclusion, FMV anchor logic, double-void aggregation, MVV-vs-volume split — all match the spec and survive back-edits.
- **CSV/PDF export pipelines are deterministic**. Single source of truth (`computeMetrics`), no duplicated logic. The `PREMIUM_FEATURES_ENABLED` gate is consistently applied across CSV and PDF.
- **i18n posture is solid**: pre-commit hook + Stop hook enforce article translation coverage. PostToolUse hooks auto-trigger `i18n-sync` and `article-translate`. The 6-locale parity invariant is mechanical, not human-vigilance-based.
- **`'use client'` discipline is clean**: every interactive component is marked, server components are unmarked. No `'use server'` directives (consistent with `output: "export"`). No leaks of `useDiaryStore` into server components.
- **No prop drilling for diary state**: single Zustand store, accessed via hooks everywhere. No `useContext` for diary data. Selectors are named and stable.
- **Static export integrity is intact**: `generateStaticParams` is present on every dynamic segment. `force-static` is set where appropriate (`robots.ts`, `sitemap.ts`, `feed.xml/route.ts`). No `getServerSideProps`, no API routes, no Server Actions.
- **Security surface is small**: no `eval`, only one `dangerouslySetInnerHTML` (the JSON-LD one — see HI-01), no `localStorage.getItem(JSON.parse(...))` patterns with untrusted input. The clinic-code regex landed. URL params are otherwise read-only.
- **ID generation uses `crypto.randomUUID` with a `Math.random` fallback for non-secure contexts** — appropriate for non-cryptographic event IDs.
- **Error handling is consistent**: try/catch with fallbacks in browser-API touchpoints (`detectTimeZone`, `getTimezoneAbbr`), nullish coalescing through calculation code, boolean-returning store actions for duplicate-drop signaling.

### Things that look like problems but aren't
- **`pageMachineData` is always English** (`exportPdf/machineData.ts`). Intentional — clinical software ingestion expects deterministic field names.
- **`sw.js` is "network-first with cache fallback"** despite a comment saying so. The cache-on-success behavior is correct for fresh patients; the offline-fallback for navigation is also correct. Only LO-07 (bare-path coverage) is a real concern.
- **`autoOpenConsumed` ref in `DayPageClient`** looks like it could double-fire — but it's gated correctly via `if (autoOpenConsumed.current) return; ...; autoOpenConsumed.current = true;`. Tested by the e2e walkthrough.
- **`Day2ReminderCard` self-dismisses on action without persistence** (`setDismissed(true)`). The component comment explicitly documents this as intentional. Not a bug.
- **`addVoid` / `addDrink` / `addLeak` duplicate detection uses minute-prefix slicing** — this is correct because all timestamps are UTC ISO strings, so two events with the same UTC minute on different days produce different prefixes. The "duplicate" semantic is "same UTC minute," not "same clock minute in user tz," which is the right thing because the clinical record is keyed off ISO.
- **`TimePicker` `handleSetNow` emits raw `new Date().toISOString()`** without tz correction — correct, because "Now" means the exact current instant; the form's `handleTimeChange` then applies `correctNightDate` / `correctAfterMidnight` for the calendar-anchoring concerns.
- **`feed.xml/route.ts` is a `route.ts` (Route Handler) with `dynamic = 'force-static'`** — at first glance this looks like it might conflict with `output: "export"`, but Next.js 16's static export does support GET Route Handlers when force-static is set; the route generates a file at build time. Verified by the presence of `generateStaticParams`.
- **Two `useEffect`s with empty deps + `setState`** (`IpcInfoModal`, `usePwaInstall`) — both are the canonical mount-detect-and-set-isomorphic-state pattern. The eslint-disable is appropriate.

---

_Reviewed: 2026-05-18_
_Reviewer: Claude (gsd-code-reviewer, comprehensive audit)_
_Files in scope: 133 .ts/.tsx files in `src/` + `public/sw.js`_
_Depth: deep (cross-file analysis incl. store ↔ form ↔ calc ↔ export chain)_
