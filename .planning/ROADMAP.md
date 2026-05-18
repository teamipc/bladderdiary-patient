# Roadmap: My Flow Check — Stabilization + Desktop & Tablet UX + Medical-Grade Closure Milestones

## Overview

Three milestones tracked in this roadmap.

**Milestone 1 — Stabilization (Phases 1–4):** Closes silent-bug gaps surfaced by the codebase audit (`.planning/codebase/CONCERNS.md`, committed cd3de78). All work is correction of existing features that mis-behave for some subset of patients — no new user-visible features. Phases are grouped by failure class so each phase's fixes share verification surface and regression risk. All 4 phases complete (2026-05-14 through 2026-05-17).

**Milestone 2 — Desktop & Tablet UX (Phases 5–8):** Brings the patient app to "Airbnb-grade browser experience" at desktop + tablet widths without losing the boomer-safe mobile UX it already has. Today the app is mobile-first and does not adapt for browsers wider than ~768px (forms span 100% viewport, BottomNav stays pinned at the bottom of a 1920px monitor, no keyboard navigation anywhere). Phases are ordered foundation → forms → per-page → polish so the lower phases lock in container patterns + chrome behavior the upper phases build on. All 4 phases complete (2026-05-15 through 2026-05-17).

**Milestone 3 — Medical-Grade Closure (Phases 9–12):** Closes the gaps surfaced by the comprehensive 2026-05-18 between-milestones audit (`.planning/audits/2026-05-18-comprehensive-audit/FINDINGS.md`). Three Critical findings are live in production right now (PT/ZH/AR article-card 404, PDF English-only for non-EN/FR/ES locales, no `<h1>` on diary day pages); two more are clinical-record-integrity bugs (Discard actually saves in 3 log forms); one is an untracked-config landmine (now deleted). This milestone gets the app to medical-grade quality across all 6 locales with WCAG 2.1 AA accessibility and clinical-record-integrity guarantees. Phases are ordered production-impact-first: locale parity → record integrity → a11y baseline → SEO technical fixes.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- Phases 1–4 belong to Milestone 1 (Stabilization); Phases 5–8 belong to Milestone 2 (Desktop & Tablet UX); Phases 9–12 belong to Milestone 3 (Medical-Grade Closure). Phase numbering is monotonic across the project, not reset per milestone.

### Stabilization (Milestone 1)

- [x] **Phase 1: Locale + reminder + observation correctness** — Close the top 3 silent bugs flagged by audit (i18n coverage, reminder timezone, observation day-attribution dedup) (completed earlier)
- [x] **Phase 2: Remaining timezone correctness + store hygiene** — PDF minute-rendering across half-hour-offset zones, wakeTimes null safety + migration completeness (completed earlier)
- [x] **Phase 3: UX polish + input validation** — Locale-aware milestone-toast dedup, export-error toast, clinicCode URL-param validation (completed 2026-05-17)
- [x] **Phase 4: Storage backend hardening** — Swap Zustand persist from localStorage to IndexedDB (same privacy model, better Safari-ITP survivability, larger quota) (completed earlier)

### Desktop & Tablet UX (Milestone 2)

- [x] **Phase 5: Layout foundation + AppShell chrome** — Establish container/max-width tokens, breakpoint conventions, transform BottomNav → top-bar nav at `md`+, reposition QuickLogFAB, expand Header for desktop (completed 2026-05-15)
- [x] **Phase 6: Diary forms + keyboard navigation** — All bottom-sheet forms (Void/Drink/Leak/Bedtime/Wake) get max-width + responsive button grids; Enter advances, Escape closes, Tab order is logical, focus rings visible (completed 2026-05-16)
- [x] **Phase 7: Onboarding + Summary surfaces** — Editorial desktop layout for the 3-step wizard; multi-column metric grid + hover affordances on the summary/export page (completed 2026-05-17)
- [x] **Phase 8: Cross-locale visual QA + polish** — `visual-qa` skill runs the 6-locale × LTR/RTL × `md`/`lg`/`xl` matrix; fix overflow, font-fallback, and physical-CSS-in-RTL bugs surfaced (completed 2026-05-17)

### Medical-Grade Closure (Milestone 3)

- [ ] **Phase 9: Locale parity production-hotfix** — Fix article-card 404 in PT/ZH/AR (regex strips only en/fr/es), localize clinical PDF export for PT/ZH/AR including CJK + Arabic Unicode font registration, eliminate hardcoded English strings in EN/FR/ES PDFs, localize TimePicker bedtime preset chips, source + wire author profile photos
- [ ] **Phase 10: Clinical record integrity** — Remove autosave-on-unmount from Log{Void,Drink,Leak}Form so Discard actually discards, finish eliminating browser-local-time leaks (NextStepBanner, reminders.ts), fix `removeWakeTime` FMV recomputation, Day-1 filter in observations.ts caffeine pattern detection, regression-test the autosave class
- [ ] **Phase 11: WCAG 2.1 AA baseline** — Add `<h1>` to every page, announce Toast via `role="status"` / `aria-live`, add skip-to-content link, reposition ConfirmDialog destructive button + autoFocus Cancel + Enter activates Cancel
- [ ] **Phase 12: SEO config + technical fixes** — Fix BreadcrumbList JSON-LD (consistent URLs, Title-Case names), restore bare-root indexability (currently JS-only shell), expand audience landing intros to 600-word spec target. (Cluster authoring for bph/frequency/urgency pillars runs on a parallel SEO content workstream, NOT in this phase.)

## Phase Details

### Phase 1: Locale + reminder + observation correctness
**Goal**: Three highest-impact silent bugs from CONCERNS.md are closed: half the locales now format dates correctly, reminders fire at the patient's actual local time, and observations use the canonical day-attribution function instead of a subtly-wrong fork.
**Depends on**: Nothing (first phase)
**Requirements**: STAB-01, STAB-02, STAB-03
**Success Criteria** (what must be TRUE):
  1. Rendering a void/drink timestamp on `/pt/diary/day/1`, `/zh/diary/day/1`, `/ar/diary/day/1` produces locale-native output (Portuguese month names, Simplified Chinese characters/format, Arabic numerals + RTL date order) — no `en-US` fallback.
  2. Setting the diary timezone to `Asia/Singapore` from a `America/New_York` browser causes the next 8 AM reminder to fire at 8 AM SGT (= 20:00 EST the previous day), not at 8 AM EST.
  3. `observations.ts` no longer contains a local re-implementation of `getDayNumber`. A 5:59 AM void on the calendar day after Day 1 (with no Day-1 bedtime set) attributes to Day 1 for both `getDayNumber` and observation generation. Existing `observations.test.ts` + `boundaries.test.ts` continue to pass.
**Plans**: TBD (likely 1 if bundled, up to 3 if split per fix)

Plans:
- [ ] 01-01: TBD (bundled via `/gsd-quick` OR split into 3 atomic plans via `/gsd-plan-phase 1`)

### Phase 2: Remaining timezone correctness + store hygiene
**Goal**: Tidy the remaining timezone-correctness debt surfaced by audit (PDF graphs/slots) and prevent the v0/v1 store-migration crash path for the wakeTimes field. Closes the tz silent-bug class entirely.
**Depends on**: Phase 1 (consolidates day-attribution patterns first)
**Requirements**: STAB-04, STAB-05
**Success Criteria** (what must be TRUE):
  1. A void at 14:30 IST renders on the correct 30-minute PDF slot row and at the correct fractional-hour position on the scatter-plot for a patient stored in `Asia/Kolkata` (UTC+5:30).
  2. Loading a v0 store snapshot (no `wakeTimes` field) into the current app does not crash `generateObservations` or any other downstream consumer; the store v1→v2 migration explicitly initializes `wakeTimes: []`.
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: UX polish + input validation
**Goal**: Three smaller corrections that affect UX quality and surface area: milestone toasts stop re-firing on locale switch, export errors use the existing Toast component instead of a browser `alert()`, and the `clinicCode` URL param is validated before persistence.
**Depends on**: Phase 2 (no hard dependency, but ordered to keep the milestone close-out clean)
**Requirements**: STAB-06, STAB-07, STAB-08
**Success Criteria** (what must be TRUE):
  1. Triggering the first-void milestone toast on `/en/diary/day/1`, then switching to `/fr/diary/day/1` mid-session, does NOT re-fire the toast in the new locale.
  2. Forcing a jsPDF generation error during export surfaces a toast (using `src/components/ui/Toast.tsx`) — no browser `alert()` modal appears.
  3. Visiting `?clinic=<5000-char-string>` or `?clinic=<script>` does NOT persist the raw value to localStorage; only alphanumeric-plus-dash values within a length cap are accepted.
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Storage backend hardening
**Goal**: Swap the Zustand `persist` backend from `localStorage` to IndexedDB (via `idb-keyval`) without changing the privacy model. Same same-origin sandbox, better Safari-ITP survivability, vastly larger quota. Includes a one-time `localStorage` → IndexedDB migration so existing patients don't lose their in-progress diary.
**Depends on**: Phase 2 (must land after STAB-05's v1→v2 migration cleanup so the backend swap is the only migration left to reason about)
**Requirements**: STAB-09
**Success Criteria** (what must be TRUE):
  1. A patient who completes Day 1, idles 7+ days on iOS Safari 17+, then returns can still resume Day 2 with all events intact (manual verification via the daily walkthrough; previously, Safari ITP eviction destroyed this path on `localStorage`).
  2. An existing patient with a v2 store in `localStorage` opens the app once → diary loads from IndexedDB after migration → the `localStorage` key is cleared (verified by inspecting both storages in DevTools).
  3. `src/__tests__/store.test.ts` covers the v2→v3 backend migration; full vitest suite passes.
  4. The 6-locale daily production walkthrough continues to pass with no new findings logged to `walkthrough_findings.md`.
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Add idb-keyval dep + write createIndexedDbStorage adapter with localStorage→IDB migration + adapter unit tests
- [ ] 04-02-PLAN.md — Wire adapter into Zustand persist config, bump store version 2→3, add v3 migration branch + v2→v3 integration test

### Phase 5: Layout foundation + AppShell chrome
**Milestone**: Desktop & Tablet UX (Milestone 2)
**Goal**: The patient app's outer chrome (Header, BottomNav, Footer, FAB) and shared container/max-width system adapt cleanly at `md`+ breakpoints. By the end of this phase, `/en/diary/day/1` viewed on a 1440px monitor shows a top-bar navigation (no mobile bottom-tab pinned at the viewport bottom), a content column bounded by sensible reading widths, and a Log-event affordance anchored to the content not the viewport corner. Mobile (< 768px) chrome is unchanged. This phase produces the shared building blocks (container component or hook + max-width tokens + responsive nav primitive) the diary forms and per-page phases consume.
**Depends on**: Nothing (independent of remaining Stabilization Phase 3)
**Requirements**: DTUX-02
**Success Criteria** (what must be TRUE):
  1. At viewport widths ≥ 768px, the BottomNav (mobile bottom-tab bar) is hidden and replaced by a top-bar navigation in the Header (Home / Track / Diary inline with the existing language switcher). At < 768px the BottomNav is unchanged.
  2. At viewport widths ≥ 768px, the QuickLogFAB no longer sits in the bottom-right corner of the viewport — it is either repositioned inside the day content column or replaced by an inline anchored "Log event" button. At < 768px the FAB is unchanged.
  3. A shared container/layout primitive (component or class set) is in use across `LandingContent.tsx`, `OnboardingFlow.tsx`, `DayPageClient.tsx`, and `summary/page.tsx` providing consistent `max-w-*` + horizontal padding at `sm` / `md` / `lg` / `xl` breakpoints — duplicated `max-w-lg md:max-w-xl mx-auto w-full` patterns are consolidated.
  4. Header expands to use available width at `md`+ (currently constrained inside `AppShell` flex column) with proper internal max-width on its content; logo + nav + locale switcher are spaced for desktop, not stacked at mobile density.
  5. RTL (Arabic) AppShell chrome verifies clean — top-bar nav order mirrors correctly using logical properties (`ms-`/`me-`, `start`/`end`), no `ml-`/`mr-` regressions introduced.
  6. Daily 6-locale walkthrough still passes; no new findings in `walkthrough_findings.md`; mobile screenshots at 375px diff cleanly against pre-phase baseline (no visual regression on mobile).
**Plans**: 7 plans, 4 waves (planning complete 2026-05-15; checker PASSED)

Plans:
**Wave 1 (foundation — must land first)**
- [ ] 05-01-PLAN.md — Create `<Container>` primitive (`src/components/layout/Container.tsx`) — server-component-safe React with `variant` (narrow/default/wide/full) + `as` + `noPadding` + `className` props; vitest unit coverage
- [ ] 05-02-PLAN.md — Add `nav.primaryNavAriaLabel` to `messages/en.json` (one-line change; `i18n-sync` PostToolUse hook auto-mirrors to fr/es/pt/zh/ar; manual fallback path documented)

**Wave 2 (chrome desktop behavior — depends on Wave 1; 3 plans run in parallel)**
- [ ] 05-03-PLAN.md — `AppShell.tsx` `pb-24 md:pb-0` spacer + `BottomNav.tsx` `md:hidden` (mobile pinned bar invisible at desktop) + `Footer.tsx` `md:py-12 lg:py-16` desktop padding
- [ ] 05-04-PLAN.md — `Header.tsx` adds inline top-bar `<nav aria-label="Primary navigation">` with NavLink helper + Container `wide` variant inner + `aria-current="page"` active state + focus-visible rings on the new nav AND on the existing Learn link + locale switcher button
- [ ] 05-05-PLAN.md — `QuickLogFAB.tsx` `right-5` → `end-5` RTL fix + single `md:end-[max(1.25rem,calc((100vw-768px)/2+1.25rem))]` formula anchoring to the diary's 768px content column at all desktop widths + `md:bottom-8` desktop position + focus-visible rings on toggle + 3 speed-dial buttons

**Wave 3 (Container adoption in pages — depends on Wave 1; can parallel Wave 2)**
- [ ] 05-06-PLAN.md — Adopt `<Container>` in `LandingContent.tsx` (3 wrappers, 2 with `noPadding + className="px-6 sm:px-6"` deterministic mobile-padding override) + `OnboardingFlow.tsx` (1 wrapper, same override) + `diary/layout.tsx` + `summary/page.tsx` (2 wrappers). Per-page composition preserved (no redesign — those are Phases 6/7).

**Wave 4 (verification — depends on all prior)**
- [ ] 05-07-PLAN.md — New Playwright spec `e2e/phase5-chrome.spec.ts` (6-locale × 3-width matrix + 6 per-criterion assertions); local-build verification harness via `npx serve out -l 4173` + `npx playwright test --test-match='**/phase5-chrome.spec.ts'`; aggregate physical-CSS grep guard; **Step 3.5 SEO regression check** (canonical/hreflang/H1/JSON-LD per locale's `out/index.html`); i18n parity check; human-verify checkpoint (manual eyeball OR `visual-qa` skill invocation).

### Phase 6: Diary forms + keyboard navigation
**Milestone**: Desktop & Tablet UX (Milestone 2)
**Goal**: All bottom-sheet diary forms (Drink / Void / Leak / Bedtime / Wake) become well-proportioned at desktop widths AND gain keyboard navigation. A user on a 1440px monitor logging a drink sees a centered modal-style sheet (not a 100%-viewport bottom sheet), buttons in a 4-up grid that doesn't stretch any single button to half the screen, a slider sized for reading-comfortable interaction, and can complete the entire flow with Enter / Escape / Tab without touching the mouse.
**Depends on**: Phase 5 (consumes the shared container primitive + breakpoint tokens)
**Requirements**: DTUX-01, DTUX-03
**Success Criteria** (what must be TRUE):
  1. At ≥ 768px, the Log* and Set* form sheets render as centered modal-style cards bounded by a max-width (target: ~`max-w-3xl` for grid forms, ~`max-w-2xl` for slider-only forms) — not full-bleed bottom sheets. At < 768px the existing bottom-sheet behavior is unchanged.
  2. At ≥ 768px, the drink-type / leak-trigger / sensation button grids reflow to fit inside the bounded width (target: 4-up at `lg`+, 2-up below); no single button stretches wider than ~360px.
  3. At ≥ 768px, the volume slider sits inside ~`max-w-2xl` with the value readout proportioned for desktop reading distance — it does not span 1800px on a 1920px monitor.
  4. Pressing `Enter` on any wizard step (when valid) advances to the next step or submits the form. Tested in onboarding (3 steps) AND each Log*/Set* form (1–3 steps). `Enter` on a textarea does NOT submit (newline behavior preserved).
  5. Pressing `Escape` while a sheet is open closes it from any focused element inside.
  6. Initial focus when a sheet opens lands on the first interactive control (the first selectable button, or the input). Tab order through each sheet flows logically: selectable cards / inputs → secondary controls (slider, double-void) → primary CTA.
  7. Focus rings are visible on all interactive elements via `focus-visible:` (Tailwind ring tokens), not suppressed by `outline-none`. `Button.tsx` updated if needed.
  8. `Enter`-to-advance behavior tested in EN + AR (RTL) — Enter still advances forward in both reading directions (no inversion).
  9. Mobile flows still work: at 375px, sheets remain full-bleed bottom-sheets, FAB is unchanged, touch interactions unchanged.
**Plans**: TBD (planner produces; expected 3–5 plans: shared sheet container, form-by-form responsive treatment, keyboard navigation system, focus-visible rollout, Enter-handler tests)

Plans:
**Wave 1 (foundation)**
- [ ] 06-01-PLAN.md — Add `@keyframes modalIn` (180ms cubic-bezier, under Boomer-safe 200ms cap) to `globals.css`
- [ ] 06-02-PLAN.md — Add 4 ConfirmDialog i18n keys (`common.discardEntryTitle`, `discardEntryMessage`, `discard`, `keepEditing`) with pre-vetted manual fallback translations for all 5 non-English locales
- [x] 06-03-PLAN.md — Migrate `Button.tsx` from `focus:` to `focus-visible:` token (Phase 5 Q5 carry-over)

**Wave 2 (BottomSheet desktop modal transformation)**
- [ ] 06-04-PLAN.md — BottomSheet.tsx adds md+ modal classes (`md:max-w-{2xl|3xl} md:shadow-xl md:ring-1 md:ring-black/5` + backdrop blur + slide-in animation); accessibility (role=dialog, aria-modal, aria-labelledby, focus trap, return focus on close, new `inert?` prop); 44×44 close X at md+; backdrop click handler; RTL fix (`right-2.5` → `end-2.5`); STABLE data-attribute initial-focus selector (`data-bottom-sheet-close` + `data-step-dot` — locale-independent, replaces brittle aria-label string matching that broke for ZH)

**Wave 3 (per-form responsive + keyboard, 4 plans in parallel)**
- [ ] 06-05-PLAN.md — LogDrinkForm: max-w-3xl modal, Enter-advance per step, initial focus, reset-on-cancel dirty-state via `onDirtyChange`
- [ ] 06-06-PLAN.md — LogVoidForm: same pattern, 3 steps, volume + doubleVoid + sensation
- [ ] 06-07-PLAN.md — LogLeakForm: same pattern, 3 steps, trigger + amount + urgency
- [ ] 06-08-PLAN.md — SetBedtimeForm + SetWakeTimeForm: max-w-2xl narrow modal, single step, time picker focus

**Wave 4 (sub-pickers + auxiliary)**
- [x] 06-09-PLAN.md — DrinkTypePicker + LeakTriggerPicker + SensationPicker + VolumeInput tap-to-edit: add focus-visible rings, preserve grid columns at both viewports, preserve all 13 data-testids (inline-form-button focus-visible deferred to Phase 8 visual-qa audit as intentional partial coverage — flagged as W2 in plan-check)

**Wave 5 (DayPageClient orchestration)**
- [ ] 06-10-PLAN.md — DayPageClient intercepts form `onDirtyChange`, shows ConfirmDialog on dirty-close attempt across all 5 forms; wires BottomSheet `inert` prop when ConfirmDialog stacks

**Wave 6 (verification + human-verify checkpoint)**
- [ ] 06-11-PLAN.md — New Playwright spec `e2e/phase6-keyboard.spec.ts` (6-locale × 3-width matrix + 3 initial-focus tests EN/ZH/AR + Enter-advance EN/AR + Escape + backdrop click + ConfirmDialog flow + textarea newline preservation); aggregate physical-CSS guard; mobile screenshot diff vs Phase 6 baseline; SEO regression check (Next.js 16 `out/{locale}.html` paths; H1=0 treated as informational pre-existing per Phase 5); i18n parity check (4 new keys); data-testid integrity check (21 testids); human-verify checkpoint with 6-locale × LTR/RTL screenshots

### Phase 7: Onboarding + Summary surfaces
**Milestone**: Desktop & Tablet UX (Milestone 2)
**Goal**: The two non-form pages that bookend the diary flow get desktop-appropriate compositions. Onboarding stops looking like a tiny age input swimming in 1920px of empty space; the Summary page metric cards lay out in a multi-column grid with hover affordances on export actions.
**Depends on**: Phase 5 (container primitive + breakpoint tokens), Phase 6 (Enter-to-advance applies to onboarding wizard steps too)
**Requirements**: DTUX-04, DTUX-05
**Success Criteria** (what must be TRUE):
  1. At ≥ 768px, `OnboardingFlow.tsx` step layouts use a confidently-sized content column with proportioned step indicator and primary CTA — the age input is sized for desktop hit-target conventions (not the same compact mobile size), the timezone picker is laid out for desktop reading.
  2. At ≥ 768px, `/en/summary` (and locale equivalents) renders the metric cards in a multi-column grid (target: 3-up at `md`, 5-up at `lg` for the 5 IPC metrics) instead of stacked.
  3. At ≥ 768px, `ExportActions.tsx` (CSV / PDF / Share buttons) has visible hover states on each button (color shift or subtle elevation), respects a reasonable max-width (does not stretch full-bleed), and has clear focus rings.
  4. RTL (Arabic) onboarding + summary verify clean — column layouts mirror correctly via logical properties, no `ml-`/`mr-` regressions.
  5. Mobile (< 768px) onboarding + summary unchanged; daily walkthrough still green.
**Plans**: TBD (planner produces; expected 2 plans: onboarding desktop layout, summary + export desktop layout)

Plans:
**Wave 1 (3 plans parallel — no file overlap)**
- [x] 07-01-PLAN.md — OnboardingFlow.tsx editorial desktop layout: H2 `text-2xl → md:text-3xl` on all 3 steps; age input `md:w-32 md:text-4xl` (fixes "30 swimming in 1920px" problem); unit toggle `md:max-w-[200px] md:py-8`; date input `md:py-4 md:text-lg`; 2 back-pill buttons `min-h-[40px] → min-h-[44px]` (Boomer-safe override 1 correctness fix; THE ONLY accepted Phase 7 mobile diff, equivalent to Phase 5 NavLink precedent); Enter-advance keyboard contract; focus: → focus-visible: migration on non-Button inputs
- [x] 07-02-PLAN.md — summary/page.tsx typography + tile padding: H1 `text-2xl → md:text-4xl` (biggest Phase 7 bump per Design DNA axis 1); section H2s (storyTitle, lookBackTitle) `text-lg → md:text-xl`; 3-stat grid tile padding `md:px-4 md:py-5`; Container variant stays `default` (max-w-3xl — UI-SPEC corrected CONTEXT assumption since the 5 IPC clinical metrics are NOT rendered in-page); FLAT tile boundary preserved per Design DNA axis 4 (no shadow-xl, no ring, no hover-lie on non-clickable content — the medical-rigor boundary)
- [x] 07-03-PLAN.md — ExportActions.tsx hover + max-w: CSV/PDF/Share buttons get `md:hover:-translate-y-px md:transition-all md:duration-150` (1px lift cap per Boomer-safe override 2; 150ms cap per override 3); color shift INHERITS from Button primitive (DO NOT override `hover:bg-*` — conflicts with primitive); responsive `md:max-w-2xl md:mx-auto` wrap around outer div

**Wave 2 (verification, depends on Wave 1)**
- [x] 07-04-PLAN.md — New Playwright spec `e2e/phase7-onboarding-summary.spec.ts` covering: onboarding 3-step desktop matrix (6 locales × 375/768/1280) + summary page typography (6 locales × 3 widths) + export-button hover affordance smoke test + 2 back-pill 44px hit-target verification + SEO regression check (Next.js 16 `out/{locale}.html` paths per Phase 5 lesson) + aggregate physical-CSS guard across 3 modified files + human-verify checkpoint with screenshots

### Phase 8: Cross-locale visual QA + polish
**Milestone**: Desktop & Tablet UX (Milestone 2)
**Goal**: The full 6-locale × LTR/RTL × `md`/`lg`/`xl` matrix passes visual QA. Catches the long tail surfaced by the prior phases: PT/AR text-overflow on long-translation buttons, font-fallback issues for ZH/AR (CJK + Arabic glyphs), RTL physical-CSS leaks (`ml-`/`mr-` instead of logical `ms-`/`me-`), AA contrast on hover/focus, focus-ring visibility against varied backgrounds.
**Depends on**: Phase 7 (all desktop UX surfaces in place to be QA'd)
**Requirements**: DTUX-06
**Success Criteria** (what must be TRUE):
  1. The `visual-qa` skill runs the matrix (6 locales × LTR/RTL × `md`/`lg`/`xl` widths) against the production-rendered site and reports zero new findings logged to `walkthrough_findings.md`.
  2. No `ml-`/`mr-`/`left-`/`right-` physical CSS introduced during Phases 5–7 remains — all spacing uses `ms-`/`me-`/`start-`/`end-` logical properties.
  3. ZH and AR pages render with proper font fallback (no missing-glyph tofu boxes); long-translation overflow in PT and AR fits within the bounded button widths from Phase 6 (text wraps or truncates cleanly, not overflowing the parent).
  4. Focus rings (Phase 6 focus-visible) verified visible on white, light-tan (`bg-ipc-50`), and dark hover backgrounds; AA contrast ratio ≥ 4.5:1 on focus + hover states.
  5. Daily 6-locale walkthrough still passes.
**Plans**: TBD (planner produces; expected 1–2 plans: run visual-qa matrix + fix surfaced bugs, single polish-cycle plan)

Plans:
- [ ] 08-NN: TBD (created by `/gsd-plan-phase 8`)

### Phase 9: Locale parity production-hotfix
**Milestone**: Medical-Grade Closure (Milestone 3)
**Goal**: PT/ZH/AR patients receive the same clinical product EN/FR/ES patients receive. The Learn-hub article cards stop 404'ing in half the locales, the clinician-facing PDF export renders correct strings AND correct glyphs in every supported locale, and the small remaining hardcoded-English leaks in TimePicker and aria-labels close. By the end of this phase, a Mandarin-speaking PFPT can open a patient's PDF and read it; a Portuguese patient on `/pt/learn` clicks an article card and lands on the article, not a 404.
**Depends on**: Nothing (independent of remaining milestones; production users broken right now)
**Requirements**: LP-01, LP-02, LP-03, LP-04, LP-05, LP-06
**Success Criteria** (what must be TRUE):
  1. `curl https://myflowcheck.com/pt/learn` → renders article cards whose hrefs are `/pt/learn/<topic>/<slug>` (not `/pt/pt/learn/...`). Each card link returns 200, not 404. Same for `/zh/learn` and `/ar/learn`. The `ArticleCard.tsx` regex covers all 6 locales (or uses locale-list-driven approach).
  2. Generate a PDF export for a 3-day diary completed in `pt`, `zh`, `ar` locales — all page headers, table headers, section labels (`Time`, `AM`, `PM`, `Structured Data`, `Field/Value`, `Events`), and time-axis labels (`6am/8am/.../2am/4am`) render in the patient's locale. For ZH and AR, CJK + Arabic glyphs render correctly (no missing-glyph tofu boxes) — requires Unicode font registration on top of `helvetica` default.
  3. PDFs generated in EN/FR/ES no longer contain hardcoded English strings: `exportPdf/strings.ts` covers all the labels currently hardcoded in `dailyDiary.ts:55`, `slots.ts:44,142`, `machineData.ts:17,21,55,70`, `graphs.ts:194`.
  4. `TimePicker.tsx` bedtime preset chips ("10 PM" / "11 PM" / "12 AM") render via `formatTime()` in all 6 locales — FR users see "22 h" not "10 PM hier soir"; AR users see Arabic-numeral PM marker inside the RTL line.
  5. Breadcrumb landmark `aria-label` is translated in all 6 locales (currently hardcoded English).
  6. Author profile pages render real photos: `public/authors/<slug>.jpg` exists, `Author` JSON-LD `photoUrl` is non-empty, `<img>` is rendered with locale-correct `alt` text in all 6 locales.
**Plans**: TBD (planner produces; expected 4–6 plans split by surface — ArticleCard regex + tests; PDF Unicode font registration + lazy-load; PDF strings table extension + hardcoded-English elimination; TimePicker localization; aria-label translation + i18n-sync mirror; author photo sourcing via `image-source` skill + JSON-LD wire-up)

Plans:
- [ ] 09-NN: TBD (created by `/gsd-plan-phase 9`)

### Phase 10: Clinical record integrity
**Milestone**: Medical-Grade Closure (Milestone 3)
**Goal**: Close the "Discard saves anyway" autosave-on-unmount bug class across all 3 edit forms with regression tests, and finish eliminating the remaining browser-local-time leaks that regressed during Phase 5–8 work. The clinical record the patient submits reflects exactly what they intended to submit; the time displayed on every UI surface matches the patient's stored timezone, not their browser's wall clock.
**Depends on**: Phase 9 (no hard dep — independent code surface — but ordered to keep production-user-facing fixes first)
**Requirements**: CRI-01, CRI-02, CRI-03, CRI-04, CRI-05
**Success Criteria** (what must be TRUE):
  1. Opening `LogVoidForm` in edit mode, changing the volume from 200 to 350, clicking the close X (or pressing Escape / clicking backdrop) → the dirty-state ConfirmDialog appears → clicking "Discard" → the void's volume in store remains 200, not 350. The "Your changes won't be saved" copy is honored.
  2. Same as #1 for `LogDrinkForm` (volume) and `LogLeakForm` (urgency or amount). The autosave-on-unmount `useEffect` is removed from all 3 forms.
  3. `NextStepBanner.tsx:79` uses the stored timezone via canonical helpers (`getHoursInTz` / `getDayNumber`). No `new Date().getHours()` call remains anywhere outside `utils.ts` time helpers.
  4. `reminders.ts:anchorTimeLabel` uses the stored timezone for the displayed reminder time string — patients in a stored-tz different from browser-tz see the correct local clock label.
  5. `removeWakeTime` action in store triggers `reassignMorningVoid` (or equivalent) so the FMV anchor recomputes when a wake-time is deleted. Same invariant as `addWakeTime` / `setBedtime` / void-add already enforce.
  6. `observations.ts` caffeine-pattern detection filters out Day 1 events (consistent with IPC "exclude Day 1 from 24HV/NPi/AVV" rule).
  7. New tests in `src/__tests__/`: at least one regression test per form covering the Discard path, plus one for the `removeWakeTime`-FMV-recompute invariant.
**Plans**: 4 plans, 2 waves (planning complete 2026-05-18)

Plans:
**Wave 1 (parallel — different files, no overlap)**
- [ ] 10-01-PLAN.md — Remove autosave-on-unmount + formRef + ESLint suppression from LogVoidForm / LogDrinkForm / LogLeakForm (closes CR-01, CR-02, ME-04); add 3 vitest specs (one per form) covering mount no-op, unmount-without-Save no-op (the direct CRI-01 regression guard), explicit-Save still works, and static-code drift guard
- [ ] 10-02-PLAN.md — NextStepBanner.tsx reads stored tz via getHoursInTz (CRI-02 / closes HI-02); reminders.ts:anchorTimeLabel widened to take timeZone param and uses buildIsoForClockTimeInTz + formatTime (CRI-03 / closes HI-03); Day1Celebration + Day2ReminderCard pass stored timeZone through; 2 vitest specs (NextStepBanner branch divergence in SGT vs NYC; anchorTimeLabel pure-function tests including half-hour offset Kolkata)
- [ ] 10-03-PLAN.md — store.ts removeWakeTime calls reassignMorningVoid + reassignMorningVoid no-wake branch clears stale FMV flags (CRI-04 / closes LO-05); observations.ts caffeineToBathroom filters Day 1 via isDayOne(getDayNumber) (CRI-05 / closes ME-05); extends store.test.ts + observations.test.ts with 6 new tests (3 per CRI)

**Wave 2 (verification — depends on all Wave 1)**
- [ ] 10-04-PLAN.md — New Playwright spec `e2e/phase10-clinical-record-integrity.spec.ts` (5 describe blocks, 1 per CRI) running against local serve on port 4173; cross-cutting verification (tsc + eslint + full vitest + grep guards for browser-tz leaks and autosave drift); 7-step human-verify checkpoint across 6 locales

### Phase 11: WCAG 2.1 AA baseline
**Milestone**: Medical-Grade Closure (Milestone 3)
**Goal**: Every interactive surface meets WCAG 2.1 AA. For medical-grade software this is the floor, not aspirational. Screen-reader users hear toasts. Keyboard users can skip past nav directly to content. Diary day pages have a proper `<h1>` landmark. Destructive actions in ConfirmDialog default to safe, not destroy.
**Depends on**: Phase 9 (Breadcrumb aria-label landing in P9 informs the broader translation sweep here)
**Requirements**: A11Y-01, A11Y-02, A11Y-03, A11Y-04
**Success Criteria** (what must be TRUE):
  1. Every page in the app has exactly one `<h1>`. Diary day pages (`DayPageClient`), summary, landing, learn topic pages, learn article pages, glossary, audience landings, author pages, help, privacy, terms — all comply.
  2. `Toast.tsx` announces via `role="status"` (non-urgent) or `role="alert"` (errors). Time warnings and milestone toasts are screen-reader-audible. Verified via axe-core.
  3. A "Skip to content" link is the first focusable element on every page; pressing Tab once + Enter from page load jumps focus past nav landmarks into the main content region. Visible only on focus (standard pattern).
  4. `ConfirmDialog.tsx`: destructive (red) button is in the LEFT/secondary position, Cancel (safe) button in the RIGHT/primary position with `autoFocus`. The previously-declared-but-unassigned `confirmBtnRef` is removed or correctly wired. Pressing Enter at dialog-open activates Cancel, not Destroy.
  5. axe-core sweep across 6 locales × 3 viewports (375 / 768 / 1280) on diary day 1 / summary / landing / one learn article reports 0 WCAG 2.1 AA violations.
**Plans**: 4 plans, 2 waves (planning complete 2026-05-18)

Plans:
**Wave 1 (parallel — different files, no overlap)**
- [ ] 11-01-PLAN.md — Promote TimelineView day/night header from `<h2>` to `<h1>` (the only diary-page h1 gap per audit); aggregate h1-count audit confirms 18 total h1 openings across src/ (was 17) with no other surface gaining/losing h1
- [ ] 11-02-PLAN.md — Toast root gains `role="status"` + `aria-live="polite"` + `aria-atomic="true"` (A11Y-02) + AppShell gains skip-to-content link with `href="#main-content"`, sr-only-until-focused Tailwind pattern, logical CSS positioning + `<main>` gains `id="main-content"` + `tabIndex={-1}` (A11Y-03) + `nav.skipToContent` i18n key in en.json auto-mirrors to fr/es/pt/zh/ar via i18n-sync hook
- [ ] 11-03-PLAN.md — ConfirmDialog ref rename `confirmBtnRef` → `cancelBtnRef` (orphan ref removed); Cancel gets `autoFocus` + defensive `useEffect` programmatic refocus; DOM order swaps so Confirm is left/start (secondary) and Cancel is right/end (primary); existing variant styling preserved; both active callers (DayPageClient dirty-discard + TimelineView delete-event) benefit from Cancel-default

**Wave 2 (verification — depends on all Wave 1)**
- [ ] 11-04-PLAN.md — Extend `e2e/a11y.spec.ts` with 5-route × 6-locale axe-core matrix (homepage + diaryDay1 + summary + learnTopic + learnArticle) + per-criterion DOM assertions (h1 count, skip-link Tab+Enter functional, Toast aria attrs present, ConfirmDialog Cancel autoFocused); `autonomous: false` with a 7-step human-verify checkpoint covering automated findings inspection + manual keyboard walkthrough + optional VO/NVDA SR spot-check + visual regression + daily walkthrough green

### Phase 12: SEO config + technical fixes
**Milestone**: Medical-Grade Closure (Milestone 3)
**Goal**: Close the BreadcrumbList JSON-LD inconsistency, restore bare-root indexability (currently JS-only shell), and reach the 600-word audience-landing-intro spec target. Cluster article authoring for the 3 under-built pillars (`bph`, `frequency`, `urgency`) is explicitly OUT of this phase — that runs on a parallel SEO content workstream via the existing `article-intake` skill.
**Depends on**: Nothing (parallel to Phases 9–11; can run in any order)
**Requirements**: SEO-M3-01, SEO-M3-02, SEO-M3-03
**Success Criteria** (what must be TRUE):
  1. BreadcrumbList JSON-LD on every learn article uses consistent URLs (all positions use the same locale-prefixed canonical form, or all use bare paths — but never a mix). Position 3 name is Title-Cased ("Nocturia" not "nocturia"). Render-verified against 3+ sample articles per locale.
  2. Bare `/` route returns HTML with non-empty `<title>` and meaningful body content (not the current ~8KB JS-only redirect shell with no `<title>` / no body). Soft-content risk for Googlebot eliminated.
  3. Audience landing pages (`/learn/for-men`, `/learn/for-women` + locale equivalents) intro copy reaches the 600-word spec target (per `content/README.md`) — currently expanded by recent commit but still under target.
**Plans**: TBD (planner produces; expected 2 plans — BreadcrumbList + bare-root SSR fix, audience-landing intro expansion)

Plans:
- [ ] 12-NN: TBD (created by `/gsd-plan-phase 12`)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12. Within Milestone 3, Phase 12 (SEO technical fixes) is fully independent and may run in parallel with Phases 9/10/11.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Locale + reminder + observation correctness | Stabilization | 3/3 | Complete | 2026-05-14 (via quick task 260514-ndz) |
| 2. Remaining timezone correctness + store hygiene | Stabilization | 2/2 | Complete | 2026-05-14 (via quick task 260514-nt1) |
| 3. UX polish + input validation | Stabilization | 3/3 | Complete | 2026-05-17 |
| 4. Storage backend hardening | Stabilization | 2/2 | Complete | 2026-05-14 |
| 5. Layout foundation + AppShell chrome | Desktop & Tablet UX | 7/7 | Complete | 2026-05-16 |
| 6. Diary forms + keyboard navigation | Desktop & Tablet UX | 11/11 | Complete | 2026-05-16 |
| 7. Onboarding + Summary surfaces | Desktop & Tablet UX | 4/4 | Complete | 2026-05-17 |
| 8. Cross-locale visual QA + polish | Desktop & Tablet UX | 4/4 | Complete | 2026-05-17 |
| 9. Locale parity production-hotfix | Medical-Grade Closure | 0/TBD | Not started | - |
| 10. Clinical record integrity | Medical-Grade Closure | 0/4 | Planning complete (2026-05-18) | - |
| 11. WCAG 2.1 AA baseline | Medical-Grade Closure | 0/4 | Planning complete (2026-05-18) | - |
| 12. SEO config + technical fixes | Medical-Grade Closure | 0/TBD | Not started | - |
</content>
