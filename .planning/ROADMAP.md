# Roadmap: My Flow Check — Stabilization + Desktop & Tablet UX Milestones

## Overview

Two milestones tracked in this roadmap.

**Milestone 1 — Stabilization (Phases 1–4):** Closes silent-bug gaps surfaced by the codebase audit (`.planning/codebase/CONCERNS.md`, committed cd3de78). All work is correction of existing features that mis-behave for some subset of patients — no new user-visible features. Phases are grouped by failure class so each phase's fixes share verification surface and regression risk. Phases 1, 2, 4 are complete; Phase 3 (small UX polish: toast dedup / export-alert / clinicCode validation) is the only remaining work.

**Milestone 2 — Desktop & Tablet UX (Phases 5–8):** Brings the patient app to "Airbnb-grade browser experience" at desktop + tablet widths without losing the boomer-safe mobile UX it already has. Today the app is mobile-first and does not adapt for browsers wider than ~768px (forms span 100% viewport, BottomNav stays pinned at the bottom of a 1920px monitor, no keyboard navigation anywhere). Phases are ordered foundation → forms → per-page → polish so the lower phases lock in container patterns + chrome behavior the upper phases build on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- Phases 1–4 belong to Milestone 1 (Stabilization); Phases 5–8 belong to Milestone 2 (Desktop & Tablet UX). Phase numbering is monotonic across the project, not reset per milestone.

### Stabilization (Milestone 1)

- [ ] **Phase 1: Locale + reminder + observation correctness** — Close the top 3 silent bugs flagged by audit (i18n coverage, reminder timezone, observation day-attribution dedup)
- [ ] **Phase 2: Remaining timezone correctness + store hygiene** — PDF minute-rendering across half-hour-offset zones, wakeTimes null safety + migration completeness
- [ ] **Phase 3: UX polish + input validation** — Locale-aware milestone-toast dedup, export-error toast, clinicCode URL-param validation
- [ ] **Phase 4: Storage backend hardening** — Swap Zustand persist from localStorage to IndexedDB (same privacy model, better Safari-ITP survivability, larger quota)

### Desktop & Tablet UX (Milestone 2)

- [ ] **Phase 5: Layout foundation + AppShell chrome** — Establish container/max-width tokens, breakpoint conventions, transform BottomNav → top-bar nav at `md`+, reposition QuickLogFAB, expand Header for desktop
- [ ] **Phase 6: Diary forms + keyboard navigation** — All bottom-sheet forms (Void/Drink/Leak/Bedtime/Wake) get max-width + responsive button grids; Enter advances, Escape closes, Tab order is logical, focus rings visible
- [ ] **Phase 7: Onboarding + Summary surfaces** — Editorial desktop layout for the 3-step wizard; multi-column metric grid + hover affordances on the summary/export page
- [ ] **Phase 8: Cross-locale visual QA + polish** — `visual-qa` skill runs the 6-locale × LTR/RTL × `md`/`lg`/`xl` matrix; fix overflow, font-fallback, and physical-CSS-in-RTL bugs surfaced

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
**Plans**: TBD (planner produces; expected 2–3 plans: container primitive + breakpoint tokens, AppShell desktop chrome, FAB reposition)

Plans:
- [ ] 05-NN: TBD (created by `/gsd-plan-phase 5`)

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
- [ ] 06-NN: TBD (created by `/gsd-plan-phase 6`)

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
- [ ] 07-NN: TBD (created by `/gsd-plan-phase 7`)

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Phase 3 (Stabilization tail) and Phase 5 (start of Desktop & Tablet UX) are independent — they may run in either order or in parallel branches.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Locale + reminder + observation correctness | Stabilization | 3/3 | Complete | 2026-05-14 (via quick task 260514-ndz) |
| 2. Remaining timezone correctness + store hygiene | Stabilization | 2/2 | Complete | 2026-05-14 (via quick task 260514-nt1) |
| 3. UX polish + input validation | Stabilization | 0/TBD | Not started | - |
| 4. Storage backend hardening | Stabilization | 2/2 | Complete | 2026-05-14 (planned route; 2 post-merge manual checks pending) |
| 5. Layout foundation + AppShell chrome | Desktop & Tablet UX | 0/TBD | Planning in progress | - |
| 6. Diary forms + keyboard navigation | Desktop & Tablet UX | 0/TBD | Not started | - |
| 7. Onboarding + Summary surfaces | Desktop & Tablet UX | 0/TBD | Not started | - |
| 8. Cross-locale visual QA + polish | Desktop & Tablet UX | 0/TBD | Not started | - |
