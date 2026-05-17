# Phase 7: Onboarding + Summary surfaces — Context

**Gathered:** 2026-05-16
**Status:** Ready for UI-SPEC + planning
**Source:** Inline from Phase 5+6 success + cascade rules locked in `05-CONTEXT.md` and `06-CONTEXT.md`. No separate `/gsd-discuss-phase` run — Phase 5's CONTEXT.md (which the user reinforced 5 times across mobile-as-is, SEO, boomer-safe, Streamlined Cognition) is canonical. Read `05-CONTEXT.md` IN FULL before this — Phase 7 applies the locked design framework to onboarding + summary surfaces.

<domain>
## Phase Boundary

By the end of this phase, a user on a 1440px desktop monitor:

**Onboarding (DTUX-04):**
- Sees an editorial-quality 3-step wizard (NOT a `max-w-xs` 320px input swimming in 1920px of whitespace)
- Step 1 (age): readable headline that punches up at md+; age input proportioned for desktop hit-target conventions; locale-safe illustration optional per Design DNA axis 2
- Step 2 (start date / unit selector): two-button toggle that's visually generous at desktop (not the current `flex-1 max-w-[160px]` mobile-sized buttons)
- Step 3 (timezone + units): timezone picker laid out for desktop; tabbed/wide vs current narrow column
- Each step has clear "X of Y" indicator (already present via Phase 6 step-dot work — preserve)
- Enter advances (already wired in Phase 6) — preserve

**Summary (DTUX-05):**
- Sees the page H1 punched up to `text-4xl md:text-5xl` per Design DNA axis 1 (currently `text-2xl` — too modest for desktop)
- Sees the IPC clinical metrics in a multi-column grid (3-up at md, 5-up at lg+ — `24HV / NPi / AVV / MVV / NBC` are the 5 IPC metrics; current `grid-cols-3` stat cards stay at 3 then expand)
- Each metric tile is **FLAT with `bg-ipc-50` border** per Design DNA axis 4 — **NOT elevated cards** (the data IS the content; cards-with-elevation would compete; this is the boundary where "Airbnb-grade" must respect "medical rigor")
- Export action buttons (CSV / PDF / Share in `ExportActions.tsx`) get hover affordances per Design DNA axis 5 (color shift + `translate-y-[-1px]` lift max, Boomer-safe override 2)
- Story title + look-back title sections get desktop-appropriate composition

**Mobile (<768px) HARD CONSTRAINT:** every surface byte-equivalent to today. Phase 7 introduces ZERO new mobile carve-outs.

**Surfaces in scope:**

1. `src/components/onboarding/OnboardingFlow.tsx` (316 lines) — 3-step wizard layout redesign at md+
2. `src/app/[locale]/summary/page.tsx` (328 lines) — H1 bump + metric grid responsive + section composition
3. `src/components/summary/DrinkVoidTimeline.tsx` (112 lines) — desktop observation timeline polish (if needed; may be inert at desktop already since it's narrow timeline content)
4. `src/components/summary/SummaryObservations.tsx` (58 lines) — desktop polish
5. `src/components/export/ExportActions.tsx` (139 lines) — hover affordances on CSV/PDF/Share buttons + responsive max-w
6. `src/components/export/DaySummaryCard.tsx` (121 lines) — desktop polish if relevant

**Out of Scope:**

- Container primitive (Phase 5 — already exists and adopted by summary/page.tsx + OnboardingFlow.tsx in Phase 5 06-06)
- AppShell chrome (Phase 5)
- BottomSheet modal transformation (Phase 6)
- Diary form keyboard navigation (Phase 6 covered DTUX-03 for forms; the same Phase 6 work already added Enter-advance helpers to OnboardingFlow.tsx as part of the multi-step pattern — verify and preserve, don't re-do)
- Live-metrics sidebar on the diary day page — Design DNA axis 8 EXPLICITLY forbids this (preserve focused-task design; summary IS the dashboard moment)
- Cross-locale visual QA matrix run — Phase 8
- Inline-form-button focus-visible rings (Phase 6's W2 deferral) — Phase 8 visual-qa audit owns this
- 4 pre-existing concerns from Phase 5 verification (H1 hydration, PrivacyNotice overlap, DayPageClient redirect race, FAB speed-dial 40px) — separate quick-tasks, not Phase 7

</domain>

<decisions>
## Implementation Decisions

### Phase 5+6 cascade rules that apply to Phase 7 (READ `05-CONTEXT.md` for canonical text; quoting only what governs this phase)

LOCKED upstream; do not re-decide. Cite source if challenged.

- **Mobile-first PRIMACY (§"Mobile invariants" First Principle in 05-CONTEXT):** Every change in Phase 7 evaluated MOBILE FIRST. The 375px rendering of every surface is the baseline; desktop is the layered additive enhancement. Phase 7 introduces NO new mobile carve-outs.
- **Streamlined Cognition principles (§"THE BINDING SYNTHESIS" in 05-CONTEXT):** All 8 apply. Most relevant to Phase 7:
  - P1 (one primary action per screen): onboarding each step has ONE Next; summary page has ONE primary action moment per cluster (the export-PDF button is the "share with clinician" primary)
  - P2 (state always visible): "X of Y" indicator on onboarding already present (via Phase 6 step-dot work — preserve)
  - P5 (progressive disclosure with care, prefer SHOWING for boomers): the 24-item timezone list in onboarding step 3 stays a search/picker (already does this); no Show More disclosure on the metric grid
  - P6 (plain language only — patient/clinician audience separation): patient-facing copy uses everyday words ("pee" not "void"); the CSV/PDF export that goes to the clinician CAN use medical terms (24HV, NPi, AVV, MVV, NBC are clinician-audience metrics — the summary page is the patient's prep view of what the export contains, so terms here are explained in plain language alongside the metric)
  - P7 (confirmation for destructive actions): if onboarding offers a "Start Over" or "Reset" path mid-flow, confirm with ConfirmDialog (use the Phase 6 i18n keys if applicable, or add new "Restart onboarding?" keys — TBD UI-SPEC)
  - P8 (defaults pre-selected): every onboarding step has a sensible default (age placeholder ~50; start date "today"; units "mL" with metric/imperial toggle pre-selected based on locale; timezone auto-detected). Preserve existing defaults.
- **Boomer-safe overrides (§"BOOMER-SAFE OVERRIDES" in 05-CONTEXT):** All 7 apply:
  - Override 1 (44px hit targets): EVERY interactive element ≥ 44px. Onboarding age input, date buttons, units toggle, timezone picker tiles, Next CTA — all ≥ 44px. Existing `Button` primitive complies. The two age-step toggle buttons currently use `py-6` which gives ~80px — already well above the floor.
  - Override 2 (hover-lift cap 1px): export buttons hover treatment uses `hover:translate-y-[-1px]` MAX, never `-2px`. Color shift to `ipc-700` allowed. Same as Phase 5 chrome hover pattern.
  - Override 3 (animation ≤ 200ms): any new entrance animation (e.g., metric grid `animate-fade-slide-up`) is already at the current `animate-fade-slide-up` duration; preserve.
  - Override 4 (modal close = 3 paths): N/A — onboarding is not modal; summary is not modal. ConfirmDialog (if used for restart) inherits the 3-path treatment from Phase 6.
  - Override 5 (no icon-only chrome): export buttons (CSV / PDF / Share) MUST have visible text labels paired with icons — verify current state; the existing `ExportActions.tsx` does this already.
  - Override 6 (browser zoom resilience): Phase 7 surfaces must work at 100/150/200% browser zoom — Phase 8 audit item; design with this in mind (no absolute px positions that break under zoom).
  - Override 7 (familiar patterns only): NO swipe-between-onboarding-steps, NO hover-to-reveal-metric-details, NO drag-to-reorder. Tap/click/Tab/Enter only.
- **Design DNA axes that fire for Phase 7 (§"Design DNA — Aesthetic axes" in 05-CONTEXT):**
  - **Axis 1 (whitespace + typography scale at desktop):** Airbnb wins. Onboarding H2 currently `text-2xl` → bump to `text-3xl md:text-4xl` or `md:text-5xl` at desktop. Summary H1 currently `text-2xl` → bump to `text-3xl md:text-4xl` at desktop. **Mobile sizes preserved exactly** (no `text-2xl` → `text-3xl` change at mobile — only the `md:` bump).
  - **Axis 2 (imagery + illustration):** Mixed by surface. Onboarding CAN use locale-safe illustration (SVG, no English text in artwork, RTL-safe) — UI-SPEC decides if useful. Summary metrics: ZERO imagery — the numbers ARE the content per axis 2 boundary.
  - **Axis 4 (card elevation + shadows):** **CRITICAL — summary metric tiles are FLAT** with `bg-ipc-50` border (current pattern at lines 137-149: `rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 text-center`). Do NOT add `shadow-xl` / `ring-1 ring-black/5` elevation to metric tiles. Modals + bottom-sheets get elevation per Phase 6; **in-page content cards do NOT** per axis 4. This is the boundary where "Airbnb-grade" stops and "medical rigor" wins.
  - **Axis 5 (hover affordances):** Export buttons (CSV/PDF/Share) get hover treatment per axis 5 — color shift + `translate-y-[-1px]` (Boomer-safe override 2 cap). Onboarding Next CTA inherits from `Button` primitive's hover (already present via Phase 5 Button.tsx focus-visible migration + existing hover states). Metric tiles do NOT get hover (they're not clickable).
  - **Axis 6 (motion):** Preserve existing `animate-fade-slide-up` durations. No new entrance animations. No page-fade transitions.
  - **Axis 7 (trust signal density):** The summary page is where the patient prepares to hand off to a clinician — this is the moment trust signals MATTER. Verify: "Powered by IPC" still visible in Header (Phase 5 work); the export buttons clearly indicate "ready to share with your clinician" via existing copy. NO new trust signal additions needed in Phase 7 (Phase 5's Footer line + chrome already cover it).
  - **Axis 8 (information density on diary entry):** N/A for onboarding + summary. The summary IS the dashboard moment per axis 8 — multi-column metric grid is the right call here (the boundary axis 8 forbids is on the DIARY DAY page where it would distract from logging).
- **SEO invariants (§"SEO invariants" in 05-CONTEXT):** Phase 7 doesn't touch SEO-relevant landing/Learn pages. Onboarding + summary are gated behind user state (not in robots.txt for crawlers).

### Phase 7 specific decisions (new — locked here)

#### Onboarding layout strategy at md+
- **Locked:** Single-column content stays the default at md+ (don't introduce a two-column layout that would feel like a marketing page). The wizard composition stays vertical: step indicator → headline → input/picker → Next CTA → back link.
- **Locked:** Headline typography bumps via responsive class only — `text-2xl md:text-4xl` (or `md:text-3xl` if 4xl is too loud). UI-SPEC picks exact size.
- **Locked:** Age input visual proportions bump at md+ — text size + height + max-width (`max-w-xs` → `md:max-w-sm` or similar). Hit target stays ≥ 44px (already does at all widths).
- **Locked:** Two-button toggle (start date / units?) at md+ uses `md:max-w-[200px]` or wider — currently `max-w-[160px]` looks small at desktop. Mobile preserved.
- **Discretion:** Whether to add a locale-safe illustration (SVG hero) above the age input headline. UI-SPEC decides. Constraints if added: SVG only (no PNG photography); no English text in the illustration; mirror-safe for RTL Arabic; small file size; subtle warmth not loud decoration.

#### Summary metric grid at md+
- **Locked:** Current 3-stat grid (`grid grid-cols-3 gap-2`) at lines 135 stays as-is at mobile (3-col). At md+ it stays at 3-col (these are top-line summary stats, not the IPC metrics).
- **Locked:** The IPC clinical metrics (24HV / NPi / AVV / MVV / NBC — 5 of them) need their own multi-column grid section if currently rendered as stacked rows. **READ the file to identify** how the 5 IPC metrics are currently laid out — they may live in a different section than the 3-stat overview grid. UI-SPEC + planner discover and lock the responsive grid for THAT section.
- **Locked:** Whatever the IPC metric layout is — at md+ it becomes a multi-column grid (target: 5-up at lg, 3-up + 2-up split or 5-up at md). Each tile FLAT with `bg-ipc-50` (no `shadow-xl`). Mobile preserved.
- **Locked:** Existing animations (`animate-fade-slide-up opacity-0`) preserved.

#### Summary page typography
- **Locked:** H1 currently `text-2xl` → bump to `text-3xl md:text-4xl` (matches the onboarding pattern). Mobile size preserved.
- **Locked:** Section H2s (`storyTitle`, `lookBackTitle` — currently `text-lg`) stay at `text-lg` mobile; UI-SPEC decides if `md:text-xl` bump is worth it (probably yes per axis 1 generous-typography, but small bump).

#### Export action buttons hover
- **Locked:** Each export button (CSV / PDF / Share) gets hover treatment at all viewports — color shift + `translate-y-[-1px]` (Boomer-safe override 2 cap). Mobile touch users don't see hover (no regression). Desktop users see a subtle response.
- **Locked:** The buttons themselves stay at the current size (44px hit target floor preserved); no responsive padding bump.
- **Locked:** A responsive `md:max-w-2xl mx-auto` wrap around the export buttons row at md+ prevents them from stretching across the full content column. Mobile preserved.

#### Restart-onboarding flow (per Streamlined Cognition P7)
- **Discretion:** Does onboarding have a "Restart" or "Back to start" path mid-flow? Check `OnboardingFlow.tsx`. If yes, ensure dirty-state confirmation per P7 (use existing `ConfirmDialog` + reuse Phase 6's `discardEntryTitle` keys OR add new "Restart onboarding?" keys via i18n-sync). If no, skip — out of scope.
- **Default:** Don't introduce a new restart affordance if one doesn't exist. The existing Back link (if any) preserves its current behavior.

#### Tech-stack constraints (inherited from Phase 5+6)
- Tailwind 4 + Next.js 16 + React 19 + Zustand + next-intl 4 — pinned.
- No new dependencies. No new state management.
- TypeScript strict mode; no `as any`; no `@ts-ignore`.
- `OnboardingFlow.tsx` is `'use client'` (Zustand consumer) — preserve.
- `src/app/[locale]/summary/page.tsx` is `'use client'` per existing code — preserve.
- All existing `data-testid` attributes PRESERVED — walkthrough.spec.ts depends on them.
- All existing logical CSS (`ms-`/`pe-`/`ps-`/`me-`/`start`/`end`/`rtl:scale-x-[-1]`) PRESERVED.
- Container primitive (Phase 5) already adopted by both surfaces — preserve the Container wrappers and refine internal layout only.

### Claude's Discretion

- Whether to add a locale-safe illustration to onboarding (and which step gets it). UI-SPEC + planner decide; default = no illustration (stay type-driven for the first cut; Phase 8 visual-qa or a follow-up can add if needed).
- Exact responsive grid columns for the IPC metric tiles at md/lg+ (5-up vs 3-up+2-up vs 4-up+1-up). UI-SPEC reads the file + decides.
- Exact `md:` typography bump magnitudes (3xl vs 4xl vs 5xl). UI-SPEC decides per surface.
- Whether the two-button toggle on onboarding step 2 widens at md+ (currently `max-w-[160px]`). UI-SPEC decides; default = `md:max-w-[200px]`.
- Whether to wrap the entire summary page content in an additional layout primitive beyond Container (e.g., a 2-column desktop layout with sidebar). DEFAULT: NO — keep single-column per axis 8 spirit (summary IS the dashboard, not a dashboard-with-sidebar).
- Whether to surface DaySummaryCard responsive treatment changes. UI-SPEC reads the file; if it's already responsive, preserve; if it needs polish, scope the work.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (UI-SPEC + planner + executor) MUST read these.**

### Upstream phase context (READ FIRST)
- `.planning/phases/05-layout-foundation-appshell-chrome/05-CONTEXT.md` — Streamlined Cognition (8 principles), Mobile-first PRIMACY, Boomer-safe overrides (7 rules), Design DNA (8 axes), cascade rules for Phase 7 (axes 1, 2, 4, 5, 8 + Streamlined Cognition P2 + P8 specifically)
- `.planning/phases/05-layout-foundation-appshell-chrome/05-UI-SPEC.md` — design tokens (max-width tokens incl. `narrow`/`default`/`wide`/`full`, spacing scale, typography, color, focus-ring spec, hover-affordance spec). Phase 7 reuses these unchanged.
- `.planning/phases/06-diary-forms-keyboard-navigation/06-CONTEXT.md` — Phase 6's specific Phase 7 cascade note: "Phase 7 onboarding step keyboard work — Phase 7, requirement DTUX-04. Phase 6 only covers DIARY forms." Phase 6's Enter-advance pattern is the canonical reference for any new Enter handling in Phase 7 (though OnboardingFlow may already have Enter handlers from Phase 6's cascade).
- `.planning/phases/06-diary-forms-keyboard-navigation/06-UI-SPEC.md` — Reset-on-cancel ConfirmDialog pattern reference if Phase 7 needs restart-onboarding confirmation.

### Project docs
- `docs/UX_PHILOSOPHY.md` — Boomer-safe UX principles, target user 50+
- `CLAUDE.md` — Project instructions, naming, anti-patterns, tech stack

### Codebase conventions
- `src/components/layout/Container.tsx` (Phase 5) — already adopted by OnboardingFlow + summary/page; do NOT re-adopt; refine internal layout
- `src/components/ui/Button.tsx` (Phase 6 focus-visible migration done) — primary CTA pattern, 44px hit targets enforced
- `src/components/ui/ConfirmDialog.tsx` — if restart-onboarding needs a confirmation
- `src/components/ui/BottomSheet.tsx` (Phase 6 modal transformation) — REFERENCE only; Phase 7 surfaces are NOT modals
- `src/components/onboarding/OnboardingFlow.tsx` — 316 lines; READ FULLY before redesigning
- `src/app/[locale]/summary/page.tsx` — 328 lines; READ FULLY; identify the IPC metric grid section
- `src/components/summary/DrinkVoidTimeline.tsx` — 112 lines
- `src/components/summary/SummaryObservations.tsx` — 58 lines
- `src/components/export/ExportActions.tsx` — 139 lines; the 3 export buttons live here
- `src/components/export/DaySummaryCard.tsx` — 121 lines

### Test surface
- `src/__tests__/` — existing vitest tests; Phase 7 should NOT break any
- `e2e/walkthrough.spec.ts` — existing 6-locale walkthrough exercises onboarding + summary; preserve compatibility

### i18n + locale infrastructure
- `src/i18n/config.ts` — locale list (en/fr/es/pt/zh/ar); Arabic is RTL
- `messages/{locale}.json` — all copy strings; Phase 7 introduces NEW strings ONLY if needed (restart-onboarding confirmation — TBD)

### Memory references (apply automatically)
- `feedback_no_em_dashes.md` — no em-dashes in UI strings
- `feedback_collaborative_tone.md` — peer/collaborative
- `feedback_dont_center_urologists.md` — never write "your urologist" as default; export goes to PFPTs / PCPs / urologists (the export labels reflect this)
- `project_i18n_six_locales.md` — all 6 locales remain at parity
- `feedback_verify_all_locales_before_push.md` — render-verify every locale after changes

</canonical_refs>

<specifics>
## Specific Ideas

### The user's stated problems from the original brief (what Phase 7 must fix)

From the original `/gsd-plan-phase` invocation screenshots:
1. **Onboarding "30" input swimming in 1920px of whitespace** — fix via Phase 7's onboarding desktop layout work (axis 1 typography bump + visual proportions of the input itself)
2. **Summary page metric grid laid out for desktop** — fix via Phase 7's multi-column IPC metric grid at md+ (axis 4 flat-tile boundary preserved)
3. **Export action button hover affordances on desktop** — fix via Phase 7's hover treatment (axis 5)

### Reference visuals
- Editorial reference: parentdata.org-style narrow reading column + generous whitespace + bigger headlines (the `learn-styling` skill describes this for `/learn`; Phase 7 onboarding can borrow the same proportions on a single-column wizard step)
- Multi-column metric grid reference: any clinician/health-app dashboard at desktop — but FLAT tiles, not elevated cards (the medical-rigor boundary axis 4 enforces)

### Concrete typography targets (UI-SPEC will refine)
- Onboarding H2 mobile: `text-2xl` (current) → md+ `text-3xl` or `text-4xl`
- Summary H1 mobile: `text-2xl` (current) → md+ `text-3xl` or `text-4xl`
- Section H2s (`storyTitle`, `lookBackTitle`) mobile: `text-lg` (current) → md+ `text-xl` (small bump)
- Metric tile number typography: stays large at all widths (already prominent)

### Concrete IPC metric grid targets (UI-SPEC reads + refines)
- Mobile: stacked or 2-col (preserve existing)
- md (768px+): 3-up or 5-up grid — UI-SPEC reads the actual metric count + decides
- lg (1024px+): 5-up if it fits within max-w-5xl wrapper (Container `wide`)
- Each tile: `rounded-2xl bg-ipc-50 border border-ipc-100 px-3 py-4 text-center` (matches current 3-stat pattern; FLAT — no shadow per axis 4)

### Concrete export button targets
- Hover: `hover:text-ipc-700 hover:translate-y-[-1px] hover:bg-ipc-50 transition-all duration-150`
- Focus-visible: existing focus-visible:ring-ipc-500 from Phase 6 Button migration
- Container: `<div className="md:max-w-2xl md:mx-auto">` around the export buttons row at md+

</specifics>

<deferred>
## Deferred Ideas

Out of Phase 7 scope (tracked elsewhere):

- **Cross-locale visual QA matrix run** — Phase 8 (`visual-qa` skill catches PT/AR overflow, ZH font fallbacks, RTL physical-CSS leaks introduced by Phases 5–7 including this one)
- **Inline-form-button focus-visible rings** (Phase 6 W2 deferral) — Phase 8 visual-qa audit
- **DayPageClient diary day live-metrics sidebar** — FORBIDDEN by Design DNA axis 8; never reconsider in this milestone
- **Onboarding hero illustration** — Claude's Discretion this phase; UI-SPEC may add or defer; not blocking
- **Restart-onboarding ConfirmDialog flow** — Claude's Discretion this phase; check current behavior + add if missing
- **Pre-existing Phase 5 concerns** (H1 hydration / PrivacyNotice overlap / DayPageClient redirect / FAB 40px) — separate quick tasks
- **Stabilization Phase 3 tail** (STAB-06/07/08 — toast dedup, export-error toast, clinicCode validation) — separate from this milestone

</deferred>

---

*Phase: 07-onboarding-summary-surfaces*
*Context gathered: 2026-05-16 (inline; references Phase 5 CONTEXT.md as canonical design framework + Phase 6 cascade)*
