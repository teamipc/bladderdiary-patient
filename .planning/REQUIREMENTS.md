# Requirements — Stabilization + Desktop & Tablet UX + Medical-Grade Closure

**Project:** My Flow Check (Bladder Diary Patient App)
**Active milestone:** Milestone 3 — Medical-Grade Closure (audit-driven, 2026-05-18)
**Completed milestones:** Milestone 1 — Stabilization (2026-05-14 → 2026-05-17), Milestone 2 — Desktop & Tablet UX (2026-05-15 → 2026-05-17)
**Source audits:** `.planning/codebase/CONCERNS.md` (cd3de78, M1) · `.planning/audits/2026-05-18-comprehensive-audit/FINDINGS.md` (M3)
**Created:** 2026-05-14 · **Updated:** 2026-05-18 (M3 added)

Milestone 1 closed silent-bug gaps surfaced by the original codebase audit. Milestone 2 brought the app to "Airbnb-grade browser experience" at desktop + tablet widths. Milestone 3 closes the gaps surfaced by the comprehensive 2026-05-18 between-milestones audit — production-affecting locale parity bugs, clinical-record-integrity bugs, WCAG 2.1 AA gaps, and SEO config drift.

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

- [x] **DTUX-04** — Onboarding flow uses editorial desktop layout (not a tiny input swimming in 1920px whitespace)
  The 3-step wizard (age → start date → timezone + units) gets a desktop-appropriate composition: wider content column with a supporting visual or progress chrome, age input scaled appropriately for desktop hit-target conventions (not the same compact mobile size), step indicator visible at all widths.
  *Files:* `src/components/onboarding/OnboardingFlow.tsx`, individual step components.
  *Verify:* render onboarding at 1440px; the active step occupies a confident portion of the viewport; the age input is keyboard-typable (already true) AND visually proportioned for desktop.

- [x] **DTUX-05** — Summary + export page laid out for desktop (proper grid for metrics, hover affordances on export actions)
  Summary page metrics use a multi-column grid at `md`+ (e.g., 24HV / NPi / AVV / MVV / NBC laid out 5-up or 3-up + 2-up instead of stacked). Export action buttons (CSV / PDF / Share) get hover states and respect a reasonable max-width (don't stretch full-bleed).
  *Files:* `src/app/[locale]/summary/page.tsx`, `src/components/summary/`, `src/components/export/ExportActions.tsx`.
  *Verify:* render `/en/summary` after completing a 3-day diary at 1440px; metric grid is 3-up or 5-up not 1-up; export buttons hover + are reasonably-sized.

- [x] **DTUX-06** — All 6 locales pass visual QA at `md` / `lg` / `xl` in both LTR and RTL
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

### Medical-Grade Closure (Milestone 3, added 2026-05-18)

The 2026-05-18 comprehensive audit (`CODE-REVIEW.md` + `SEO-REVIEW.md` + `UI-REVIEW.md` → synthesized in `FINDINGS.md`) surfaced 69 findings across 3 audits: 7 Critical, 17 High, 24 Medium, 21 Low. The 4 phases below cover the Critical + High items in 4 failure classes: locale parity (LP-), clinical-record integrity (CRI-), accessibility (A11Y-), SEO config (SEO-M3-).

#### Locale Parity (Phase 9)

- [x] **LP-01** — Article cards link to valid in-locale URLs in all 6 locales (shipped 2026-05-18, commit 21fd2b8)
  `src/components/learn/ArticleCard.tsx:36` regex `/^\/(en|fr|es)/` strips only 3 of 6 locale prefixes, so `/pt/learn/...` cards generate hrefs like `/pt/pt/learn/...` that return 404 in production. Confirmed live via `curl`. Same bug affects ZH and AR. Half the locale audience is broken on the Learn hub.
  *Files:* `src/components/learn/ArticleCard.tsx`
  *Verify:* `curl -o /dev/null -w "%{http_code}\n" https://myflowcheck.com/{pt,zh,ar}/learn/<topic>/<slug>` returns 200 for each (after deploy); regex (or replacement logic) covers all 6 locales — driven by the locale list in `src/i18n/config.ts`, not a hardcoded subset.

- [x] **LP-02** — Clinical PDF export renders correct strings AND glyphs for PT/ZH/AR (shipped 2026-05-18, commits 0c491bb + a535d42; Noto Sans SC 125.6 KB + Noto Sans Arabic 31.0 KB subsets, well under per-locale 2 MB budget)
  `src/lib/exportPdf/strings.ts:81-285` has translation tables for en/fr/es only. Every PDF page calls `doc.setFont('helvetica', ...)` — helvetica has zero glyph coverage for Chinese or Arabic. A Mandarin-speaking PFPT receiving a patient's PDF sees English headers or boxes-where-CJK-glyphs-should-be, undoing the entire localization investment. Requires (a) extending `strings.ts` with pt/zh/ar tables, (b) registering Unicode font (Noto Sans CJK + Noto Sans Arabic, subsetted) per locale via lazy-load, (c) per-locale `date-fns` locale registration for date formatting.
  *Files:* `src/lib/exportPdf/strings.ts`, `src/lib/exportPdf/*.ts` (every page that calls `setFont`), new font asset under `public/fonts/` or lazy-loaded chunks.
  *Verify:* generate a 3-day PDF export from a `/pt/`, `/zh/`, `/ar/` session; every section header, table header, axis label, and inline string is in the patient's locale with correct glyphs. File size impact documented.

- [x] **LP-03** — Eliminate hardcoded English strings in PDFs even for EN/FR/ES (shipped 2026-05-18, commit 0c491bb; time-axis switched to 24hr `06:00..04:00`)
  PDFs generated in EN/FR/ES currently contain several hardcoded English strings that bypass the `strings.ts` table: `dailyDiary.ts:55` ("Time" column header), `slots.ts:44,142` ("AM" / "PM" labels), `machineData.ts:17,21,55,70` ("Structured Data" / "Field/Value" / "Events" headers), `graphs.ts:194` (time-axis labels "6am/8am/10am/.../2am/4am"). For FR/ES this means a half-translated PDF; for the future PT/ZH/AR work in LP-02 it means the new translation tables won't cover everything unless these are migrated.
  *Files:* `src/lib/exportPdf/{dailyDiary,slots,machineData,graphs}.ts`, `src/lib/exportPdf/strings.ts`
  *Verify:* a generated PDF in FR contains no English strings; in ES contains no English strings; time-axis on graphs uses locale-correct hour labels.

- [x] **LP-04** — TimePicker bedtime preset chips render via `formatTime()` in all 6 locales (shipped 2026-05-18, commit 3b26db2)
  `src/components/diary/TimePicker.tsx:159,166,173` hardcodes "10 PM" / "11 PM" / "12 AM" as English string literals into translated wrappers. French users see "10 PM hier soir"; Arabic users see Latin "PM" inside RTL line.
  *Files:* `src/components/diary/TimePicker.tsx`
  *Verify:* render TimePicker in each of 6 locales; bedtime presets show "22 h" (FR), "22:00" (ES per locale convention), Arabic-numeral PM marker (AR), Chinese time format (ZH).

- [x] **LP-05** — Breadcrumb landmark `aria-label` is translated (shipped 2026-05-18, commit 3b26db2)
  The `<nav aria-label="Breadcrumb">` landmark is hardcoded English in the breadcrumb component. Should use the i18n message system + auto-mirror to all 5 non-en locales via `i18n-sync`.
  *Files:* the breadcrumb component (likely `src/components/seo/` or `src/components/learn/`), `messages/en.json` (new key), all 5 non-en locale files.
  *Verify:* DOM inspection in `/fr/learn/<topic>/<slug>` shows the translated landmark label; screen-reader navigation announces it correctly.

- [x] **LP-06** — Author profile photos sourced + wired (shipped 2026-05-18, commit b856f74; dr-di-wu.jpg 25 KB 400x400 + dr-steven-tijerina.jpg 65 KB 400x600 after sips compression from 3.66 MB)
  Both author JSON files (`content/authors/*.json`) have empty `photoUrl`; `public/authors/` directory does not exist. Author pages render without photos. For medical YMYL E-E-A-T signal, real photos are documented as required.
  *Files:* `public/authors/*.jpg` (new), `content/authors/*.json` (populate `photoUrl`), `Author` JSON-LD wire-up (likely in `src/app/[locale]/learn/authors/[slug]/page.tsx`), `<img>` rendering + alt text translation.
  *Verify:* author profile pages render `<img src="/authors/<slug>.jpg" alt="<translated>">`; `Author` JSON-LD `image`/`photoUrl` is non-empty; visible on `/learn/authors/<slug>` in all 6 locales.

#### Clinical Record Integrity (Phase 10)

- [ ] **CRI-01** — `LogVoidForm` / `LogDrinkForm` / `LogLeakForm` Discard truly discards
  Each form has a cleanup `useEffect` that autosaves the dirty state on unmount. Phase 6 added an explicit "Discard" ConfirmDialog that says "Your changes won't be saved" — but the autosave fires anyway when the form unmounts after Discard, so the user-visible contract is violated. **The clinical record reflects state the patient explicitly chose to discard.** No test catches it.
  *Files:* `src/components/diary/LogVoidForm.tsx`, `LogDrinkForm.tsx`, `LogLeakForm.tsx`
  *Verify:* regression test per form — open in edit mode, change a value, simulate close-with-Discard, assert store state unchanged. Add to `src/__tests__/`.

- [ ] **CRI-02** — `NextStepBanner` uses stored timezone, not browser-local
  `src/components/diary/NextStepBanner.tsx:79` uses `new Date().getHours()` (browser-local) instead of canonical timezone helpers. This regresses the exact anti-pattern Phases 1–2 spent months eliminating. A patient in stored-tz ≠ browser-tz sees a banner suggesting the wrong next step.
  *Files:* `src/components/diary/NextStepBanner.tsx`
  *Verify:* with stored tz `Asia/Singapore` from a browser reporting `America/New_York`, the banner's "next step" reasoning uses SGT local time, not EST.

- [ ] **CRI-03** — `reminders.ts:anchorTimeLabel` uses stored timezone
  Same browser-local-time leak in the displayed reminder time label. The patient sees a reminder time string computed in their browser tz, not their stored diary tz.
  *Files:* `src/lib/reminders.ts`
  *Verify:* same test as CRI-02 against the reminder UI surface.

- [ ] **CRI-04** — `removeWakeTime` recomputes FMV anchor
  Adding/setting wake-time correctly triggers `reassignMorningVoid`; removing one does not. The FMV anchor can drift after wake-time deletion, producing wrong NPi computation in subtle cases.
  *Files:* `src/lib/store.ts` (`removeWakeTime` action)
  *Verify:* test — add 2 wake-times, set one void as FMV by proximity to wake-time A, remove wake-time A, assert FMV recomputes against wake-time B (or clears).

- [ ] **CRI-05** — `observations.ts` caffeine-pattern detection filters Day 1
  IPC rule: Day 1 is excluded from 24HV / NPi / AVV (adaptation period). The caffeine-pattern detection in `observations.ts` doesn't apply this filter, producing observations that include adaptation-day caffeine bursts in pattern aggregates.
  *Files:* `src/lib/observations.ts`
  *Verify:* test — synth a diary where Day 1 has 4 caffeine events and Days 2–3 have 1 each; caffeine-pattern observation only counts events from Days 2–3.

#### Accessibility / WCAG 2.1 AA (Phase 11)

- [ ] **A11Y-01** — Every page has exactly one `<h1>`
  `DayPageClient` / diary day pages open with `<h2>` "Day 1" — there is no `<h1>` anywhere on the most-used surface in the app. WCAG 2.4.6 (Headings and Labels) + 1.3.1 (Info and Relationships) fail. Other pages need audit too (summary, landing, learn topics, articles, authors, glossary, help).
  *Files:* page-component layer across `src/app/[locale]/**/page.tsx` and surrounding client components.
  *Verify:* axe-core sweep across 6 locales × major routes (diary, summary, landing, learn topic, learn article) reports exactly one `<h1>` per page.

- [ ] **A11Y-02** — `Toast` announces via `role="status"` / `aria-live`
  `src/components/ui/Toast.tsx` (and any time-warning component) has no `aria-live`, `role="status"`, or `role="alert"`. Screen-reader users miss every milestone toast and time warning. WCAG 4.1.3 (Status Messages) fail.
  *Files:* `src/components/ui/Toast.tsx`, any time-warning surface.
  *Verify:* axe-core reports live region present; manual NVDA / VoiceOver test confirms milestone toast is announced.

- [ ] **A11Y-03** — Skip-to-content link
  No skip-to-content link anywhere. WCAG 2.4.1 (Bypass Blocks) fail. Should be the first focusable element on every page, visible only on focus.
  *Files:* `src/components/layout/AppShell.tsx` or a new `SkipLink.tsx`.
  *Verify:* keyboard-only walkthrough — Tab once + Enter from page load jumps focus past nav landmarks into `<main>`. Visible focus indicator on the link.

- [ ] **A11Y-04** — ConfirmDialog destructive button position + autoFocus Cancel
  `src/components/ui/ConfirmDialog.tsx` has the destructive (red) button in the primary (right) position with no `autoFocus` on Cancel — a declared `confirmBtnRef` is never assigned. Enter at dialog-open activates the destructive action by default. Standard medical-grade pattern: safe action defaults, destructive action requires explicit selection.
  *Files:* `src/components/ui/ConfirmDialog.tsx`, all callers (likely `DayPageClient.tsx` and form components).
  *Verify:* open a dirty form, trigger close → ConfirmDialog appears with Cancel autoFocused on the right, Discard on the left; pressing Enter at dialog-open does NOT discard.

#### SEO Config + Technical (Phase 12)

- [ ] **SEO-M3-01** — BreadcrumbList JSON-LD uses consistent URLs + Title-Case names
  `BreadcrumbList` JSON-LD on learn articles has inconsistent URLs across positions (positions 1–3 use bare paths that 404 live; position 4 uses `/en/`) and position 3 name renders the raw lowercase slug ("nocturia" instead of "Nocturia"). Either confuses crawlers or renders ugly breadcrumb pills in SERPs.
  *Files:* `src/components/seo/JsonLd.tsx` or wherever `BreadcrumbList` is assembled (`src/lib/seo/` candidate).
  *Verify:* render `/en/learn/voiding/<slug>` and `/fr/learn/voiding/<slug>`; each position's URL is internally consistent and renders 200; position 3 name is Title-Cased.

- [ ] **SEO-M3-02** — Bare `/` route returns indexable HTML, not JS-only shell
  Bare `/` (default-locale homepage) currently returns a ~8KB JS-only redirect shell with no `<title>` / no body. Googlebot sees soft content. The fix is to ensure the static-export of the en-locale root has the full landing HTML (likely a Next.js i18n-prefix gotcha — the en root needs explicit rendering, not just a redirect rewrite).
  *Files:* `next.config.ts` (next-intl plugin config), `src/app/page.tsx` or `src/app/[locale]/page.tsx`, `vercel.json` (now deleted) routing intent.
  *Verify:* `curl -s https://myflowcheck.com/ | grep '<title>'` returns the landing page title; body has meaningful content; Google's Search Console "URL inspection" shows the bare URL as indexable with content.

- [ ] **SEO-M3-03** — Audience landing intros reach 600-word spec target
  `/learn/for-men` and `/learn/for-women` intro copy was expanded by recent commit but is still under the 600-word spec target documented in `content/README.md`. Reduces thin-content signal further.
  *Files:* the MDX or component sources for the two audience landing pages (`src/app/[locale]/learn/for-men/`, `src/app/[locale]/learn/for-women/`); content files if applicable.
  *Verify:* `wc -w` on the rendered intro for each landing in each locale reports ≥ 600 words.

## v2 Requirements

<!-- Deferred to a later milestone. -->

- Locale-aware milestone-toast persistence keyed by patient instance, not session+locale (a deeper fix than STAB-06).
- Migration from compile-time `PREMIUM_FEATURES_ENABLED` to env-gated rollout — wait until premium is commercialized.
- Type augmentation for `jspdf-autotable`'s `lastAutoTable` to remove the four `@ts-expect-error` suppressions — tracked as tech debt, not a runtime bug.
- Cluster article authoring for the 3 under-built pillars (`bph`, `frequency`, `urgency` — each at `_pillar.mdx` only, no cluster articles). Drafted via the existing SEO workflow + `article-intake` skill on a parallel content workstream, NOT inside Milestone 3.
- `TimelineView.tsx` refactor (884-line monolith with no unit tests) — defer until a feature change forces extraction.
- `JsonLd` `</` escape hardening (defense-in-depth on trusted content).

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

### Medical-Grade Closure milestone (Phases 9–12)

| Phase | Requirements |
|-------|--------------|
| Phase 9: Locale parity production-hotfix | LP-01, LP-02, LP-03, LP-04, LP-05, LP-06 |
| Phase 10: Clinical record integrity | CRI-01, CRI-02, CRI-03, CRI-04, CRI-05 |
| Phase 11: WCAG 2.1 AA baseline | A11Y-01, A11Y-02, A11Y-03, A11Y-04 |
| Phase 12: SEO config + technical fixes | SEO-M3-01, SEO-M3-02, SEO-M3-03 |

All 33 v1 requirements (9 STAB + 6 DTUX + 18 M3) mapped. Coverage: 100%.

---
*Requirements defined: 2026-05-14 (Stabilization). Desktop & Tablet UX milestone added 2026-05-14. Medical-Grade Closure milestone added 2026-05-18.*
