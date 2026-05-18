# Phase 11 — WCAG 2.1 AA Baseline · CONTEXT

**Milestone:** Medical-Grade Closure (Milestone 3)
**Source:** `.planning/audits/2026-05-18-comprehensive-audit/` (UI-REVIEW.md primary)
**Started:** 2026-05-18
**Status:** Ready to plan (no /gsd-discuss-phase needed — audit IS the discovery)
**Depends on:** Phase 9 (Breadcrumb aria-label translation lands in P9 LP-05; this phase consolidates the broader a11y sweep)

---

## Why this phase exists (motivation)

For medical-grade software, WCAG 2.1 AA is the **floor**, not aspirational. The audit found that several baseline AA requirements are unmet across the most-used surfaces:

1. **No `<h1>` on any diary day page** — the patient's primary surface. `DayPageClient` opens with `<h2>` "Day 1" and there is no `<h1>` anywhere on the page. WCAG 2.4.6 (Headings and Labels) + 1.3.1 (Info and Relationships).
2. **Toasts and time-warnings are silent to assistive tech.** No `aria-live`, `role="status"`, or `role="alert"` anywhere in shipping code. Screen-reader users miss every milestone toast and time warning. WCAG 4.1.3 (Status Messages).
3. **Skip-to-content link missing.** Keyboard users must Tab through every nav item before reaching content. WCAG 2.4.1 (Bypass Blocks).
4. **ConfirmDialog destructive button defaults to Destroy.** The red destructive button sits in the primary (right) position, no `autoFocus` on Cancel — a declared `confirmBtnRef` is never assigned. Pressing Enter at dialog-open activates the destructive action by default. Standard medical-grade pattern is safe-default + explicit-confirm.

A screen-reader walkthrough of the app right now would mostly work (the foundational semantics are decent) but hits these gaps repeatedly.

---

## Goal (from ROADMAP.md)

> Every interactive surface meets WCAG 2.1 AA. For medical-grade software this is the floor, not aspirational. Screen-reader users hear toasts. Keyboard users can skip past nav directly to content. Diary day pages have a proper `<h1>` landmark. Destructive actions in ConfirmDialog default to safe, not destroy.

---

## Requirements (from REQUIREMENTS.md)

- **A11Y-01** Every page has exactly one `<h1>` (diary day pages, summary, landing, learn, glossary, authors, help, privacy, terms)
- **A11Y-02** `Toast` announces via `role="status"` / `aria-live`
- **A11Y-03** Skip-to-content link (first focusable, visible on focus)
- **A11Y-04** ConfirmDialog destructive button position + autoFocus Cancel + Enter activates Cancel

---

## Success criteria (from ROADMAP.md)

1. Every page has exactly one `<h1>`. Diary day pages, summary, landing, learn topic pages, learn article pages, glossary, audience landings, author pages, help, privacy, terms — all comply.
2. `Toast.tsx` announces via `role="status"` (non-urgent) or `role="alert"` (errors). Time warnings and milestone toasts are screen-reader-audible. Verified via axe-core.
3. A "Skip to content" link is the first focusable element on every page; Tab once + Enter jumps focus past nav into the main content region.
4. `ConfirmDialog.tsx` has Cancel autoFocused on the safe (right/primary) side, destructive button on the secondary (left) side; Enter activates Cancel.
5. axe-core sweep across 6 locales × 3 viewports on diary day 1 / summary / landing / one learn article reports 0 WCAG 2.1 AA violations.

---

## Evidence (file:line specifics from the audit)

### A11Y-01 — No `<h1>` on diary pages (UI-REVIEW.md I3)

- **Bug:** `src/components/diary/TimelineView.tsx:506` opens with `<h2>` "Day N". `DayPageClient` has no `<h1>` anywhere. Pages under `src/app/[locale]/diary/day/[dayNumber]/` inherit this gap.
- **Other pages:** need audit. Summary (`src/app/[locale]/summary/page.tsx`), landing (`src/app/[locale]/LandingContent.tsx`), learn topic / article / glossary / author pages, audience landings, help/privacy/terms.
- **Fix shape:** Promote the most-prominent existing heading on each page to `<h1>`. For diary day pages, this likely means promoting "Day N" or moving the page title from layout into a page-level h1. Watch for the existing `text-2xl md:text-4xl` typography classes — the visual hierarchy should not change; only the semantic level promotes.

### A11Y-02 — Toast silent to AT (UI-REVIEW.md I4)

- **Bug:** `src/components/ui/Toast.tsx` has no `aria-live`, `role="status"`, or `role="alert"` attributes anywhere.
- **Audit calls out:** time-warnings (the chip that shows "20:35 will be tomorrow's record"-style messages) are also silent.
- **Fix shape:** Add `role="status"` (which implies `aria-live="polite"`) to non-urgent toasts (milestone toast, first-void toast). Add `role="alert"` (which implies `aria-live="assertive"`) to error toasts (export failure). For time-warnings, `role="status"` is sufficient.

### A11Y-03 — Skip-to-content missing (UI-REVIEW.md I5)

- **Bug:** No skip-to-content link anywhere. Keyboard users tabbing into the app land on the locale switcher, then learn link, then primary nav items, then diary content — many Tab presses to reach the patient-facing actions.
- **Fix shape:** Add a `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to content</a>` as the first child of `<body>` (likely in `src/app/[locale]/layout.tsx` or `src/components/layout/AppShell.tsx`). Add `id="main-content"` to the `<main>` element. Visible only on focus. i18n the label.

### A11Y-04 — ConfirmDialog destructive in primary position (UI-REVIEW.md I6)

- **Bug:** `src/components/ui/ConfirmDialog.tsx` renders the red destructive button on the right/primary side, the Cancel button on the left/secondary side. A `confirmBtnRef` is declared (intended to autoFocus Cancel) but never assigned to any element. Pressing Enter at dialog-open activates whichever button has default focus — which the dialog's default browser behavior makes the destructive (right) one.
- **Fix shape:** Swap the button layout: destructive on left/secondary, Cancel on right/primary. Assign `ref={cancelBtnRef}` to the Cancel button + `autoFocus` it on dialog-open. Verify Enter at dialog-open activates Cancel.

---

## What's already known (don't re-research)

- The Phase 6 ConfirmDialog flow is documented in plan `06-10-PLAN.md` — `onDirtyChange` from forms → DayPageClient shows the ConfirmDialog → user picks Keep Editing (Cancel) or Discard. This is the highest-stakes use of ConfirmDialog — getting Cancel as default is the medical-grade win.
- next-intl's `useTranslations` is the pattern for any new translated strings (skip-link label, etc.).
- The `i18n-sync` PostToolUse hook mirrors new `messages/en.json` keys to all 5 non-en locales.
- The existing Playwright spec `e2e/a11y.spec.ts` already uses `@axe-core/playwright` — that's the integration point for the axe-core sweep.
- Locale list is `src/i18n/config.ts`; the `locales` tuple drives test matrices.

---

## What's explicitly out of scope

- Color contrast sweep beyond the muted-text fix in I7 (a Medium finding) — defer to v2 polish.
- Tap-target sizing audit (Phase 7 already brought back-pill to 44px; deeper sweep is v2).
- Focus-ring visibility regression on dark backgrounds (Phase 8 verified; out of scope unless axe-core surfaces a regression).
- WCAG AAA requirements — explicitly NOT this phase.
- Phase 9 work (locale parity) and Phase 10 work (clinical record integrity) — separate phases.
- Phase 12 work (SEO + BreadcrumbList) — separate phase.

---

## Constraints

- **No visual regression.** A11Y fixes are semantic; the visible layout must stay identical.
- **No new ESLint disables or `as any` casts.**
- **i18n parity must hold** — skip-link label needs translation in all 6 locales (auto-mirrored via hook).
- **axe-core verification is non-negotiable.** The acceptance criterion is "0 WCAG 2.1 AA violations" — measurable, not subjective.
- **Boomer-safe UX.** Skip-link must be invisible until focused; no clutter on the visible page.

---

## Key planning questions to surface

1. **Plan splitting.** Logical groupings: (a) one plan per requirement (4 plans); (b) bundled by surface: 1 plan for h1 sweep across all pages, 1 plan for Toast + skip-link, 1 plan for ConfirmDialog, 1 plan for axe-core verification spec. Recommend (b) — 4 plans.
2. **H1 audit scope.** The audit found the diary day page issue; the plan needs to enumerate every page that needs an h1. Either grep for `<h1>` across all `src/app/[locale]/**/page.tsx` + client components, OR plan a manual sweep with a checklist. Recommend the grep approach + a checklist task.
3. **Skip-link target.** Where does `#main-content` point? In Next.js App Router, the `<main>` is rendered by `AppShell.tsx` or per-page. Decide once + apply consistently.
4. **ConfirmDialog button position visual change.** Swapping left/right buttons IS a visual change. Verify it's acceptable across all callers (`DayPageClient.tsx`, any others). The audit notes Phase 6's existing ConfirmDialog has destructive-on-right; this phase deliberately flips that.
5. **axe-core matrix size.** 6 locales × 3 viewports × 5 routes = 90 test cases. That's a lot for a single spec. Consider sampling: 6 locales × 1 viewport × 5 routes (30 cases) for the regression spec, with an "expanded matrix" optional run.
6. **Wave structure.** Likely 2 waves: Wave 1 = 3 plans in parallel (h1, Toast+skip, ConfirmDialog) since they touch different files; Wave 2 = axe-core verification spec depending on all prior.

---

## Related artifacts

- `.planning/audits/2026-05-18-comprehensive-audit/UI-REVIEW.md` — primary source (findings I3, I4, I5, I6)
- `e2e/a11y.spec.ts` — existing axe-core integration to extend
- `src/components/ui/Toast.tsx` — fix site for A11Y-02
- `src/components/ui/ConfirmDialog.tsx` — fix site for A11Y-04
- `src/components/layout/AppShell.tsx` — likely skip-link install site
- `src/components/diary/TimelineView.tsx:506` — current `<h2>` "Day N"
- `docs/UX_PHILOSOPHY.md` — boomer-safe principles (must hold through these changes)
