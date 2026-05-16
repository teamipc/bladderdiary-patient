# Phase 6: Diary forms + keyboard navigation — Context

**Gathered:** 2026-05-16
**Status:** Ready for UI-SPEC + planning
**Source:** Inline from Phase 5 success + cascade rules locked in `05-CONTEXT.md`. No separate `/gsd-discuss-phase` run because Phase 5's CONTEXT.md (which the user reinforced 5 times) already encodes the design philosophy this phase applies. Read `05-CONTEXT.md` IN FULL before reading this — this file deliberately references rather than duplicates.

<domain>
## Phase Boundary

By the end of this phase, a user on a 1440px desktop monitor logging a drink, void, leak, bedtime, or wake-time sees a **centered modal-style card with elevation** (not a 100%-viewport bottom sheet), with **button grids that fit inside ~`max-w-3xl`**, a **slider sized for reading-comfortable interaction inside ~`max-w-2xl`**, and can complete the entire flow with **`Enter` advances, `Escape` closes, `Tab` order is logical**, without touching the mouse. On mobile (<768px) every form sheet renders BYTE-EQUIVALENT to production (mobile-pristine HARD CONSTRAINT from Phase 5 carries forward).

This phase addresses **DTUX-01 (responsive forms)** and **DTUX-03 (keyboard navigation)** in their entirety.

**Surfaces in scope:**

1. `src/components/ui/BottomSheet.tsx` (108 lines) — shared primitive. At `md`+, becomes a centered modal-style card with elevation; at `<md`, stays as today's bottom-sheet.
2. `src/components/diary/LogDrinkForm.tsx` (358 lines) — drink-type picker + volume slider + double-tap support
3. `src/components/diary/LogVoidForm.tsx` (508 lines) — sensation picker + volume + double-void
4. `src/components/diary/LogLeakForm.tsx` (414 lines) — trigger picker + severity + notes
5. `src/components/diary/SetBedtimeForm.tsx` (122 lines) — time picker + per-day toggle
6. `src/components/diary/SetWakeTimeForm.tsx` (111 lines) — time picker + per-day toggle
7. `src/components/diary/DrinkTypePicker.tsx` (42 lines) — 8-button grid sub-component
8. `src/components/diary/LeakTriggerPicker.tsx` (64 lines) — 8-button grid sub-component
9. `src/components/diary/SensationPicker.tsx` (84 lines) — 5-button grid sub-component
10. `src/components/ui/Button.tsx` — focus-visible token expansion if needed (Phase 5 Q5 deferred to Phase 6)

**Out of Scope:**
- Form CONTENT changes (button labels, validation copy, the metric calculation logic, the data model) — preserve all of that EXACTLY.
- Onboarding wizard keyboard work — that's Phase 7 (OnboardingFlow is per-page redesign).
- Timezone picker keyboard work — that's Phase 7 (lives inside OnboardingFlow).
- Number-key shortcuts ("press 2 to pick Tea") — out of milestone per the original AskUserQuestion scoping (user picked "Enter + Escape + Tab focus order" not "full keyboard model with number shortcuts").
- Arrow-key nudging on the volume slider — out of milestone (slider already responds to native input behavior at desktop; native browser arrow handling for `<input type="range">` is preserved).
- The 3-day pelvic-care daily reminder notification — out of milestone.

</domain>

<decisions>
## Implementation Decisions

### Phase 5 cascade rules that apply to Phase 6 (READ `05-CONTEXT.md` for the canonical text — quoting only what specifically governs this phase)

These are LOCKED upstream; do not re-decide them in Phase 6. Cite `05-CONTEXT.md` if challenged.

- **Mobile-first PRIMACY (§"Mobile invariants" First Principle):** Every change in Phase 6 must be evaluated MOBILE FIRST. The 375px rendering of every form sheet is the design baseline; desktop modal behavior is the layered additive enhancement. If a desktop change degrades mobile beyond the two carve-outs (Arabic FAB fix; +8px sm:px-6 at 640-767px on diary/layout + summary/page — neither of which Phase 6 touches), the desktop change is REJECTED. **Phase 6 introduces NO new mobile carve-outs.**
- **Streamlined Cognition principles (§"THE BINDING SYNTHESIS"):** All 8 apply. Most relevant to forms:
  - P1 (one primary action per screen): each form has ONE primary CTA — "Save" / "Log it" / etc. Visually dominates secondary actions (Cancel, double-void toggle).
  - P2 (state always visible): "X of Y" step indicator on multi-step forms; current selection always visually flagged.
  - P3 (recovery one obvious step): Close X always present + Escape closes + backdrop click closes (per Boomer-safe override 4).
  - P4 (no silent states): form errors show "this happened, do this" — never just a silent disabled CTA.
  - P5 (progressive disclosure with care, prefer SHOWING for boomers): 8-item drink/leak grids stay ALL-VISIBLE — no "More" disclosure.
  - P6 (plain language only — patient/clinician audience separation): "Pee" not "void" in patient UI; "Wake up" not "diuresis onset". Existing copy already follows this.
  - P7 (confirmation for destructive actions): Reset-form clears un-saved input ONLY after confirmation. Existing forms may not have this — verify and add if missing.
  - P8 (defaults pre-selected): Drink type default = `water`. Volume defaults = sensible mL value pre-selected, not empty. Sensation default = `normal`. Already true in existing forms — preserve.
- **Boomer-safe overrides 1-7 (§"BOOMER-SAFE OVERRIDES"):**
  - **Override 1 (44px hit targets) — strict:** Every interactive element in every form ≥ 44px. The existing `Button` primitive (`min-h-[44px]` md, `min-h-[52px]` lg) already complies; new in-form elements that are NOT Button instances (custom toggles, picker tiles, sub-step indicators) MUST explicitly add `min-h-[44px]`.
  - **Override 2 (hover-lift cap 1px) — only if hover added; existing forms have none.**
  - **Override 3 (animation ≤ 200ms) — strict:** BottomSheet's modal slide-in at md+ MUST be ≤ 200ms. The existing BottomSheet may use longer durations for the bottom-sheet slide — preserve mobile timing; new desktop modal slide-in is a fresh duration choice ≤ 200ms.
  - **Override 4 (modal close = 3 paths always) — strict:** Every form sheet at md+ MUST provide: (a) visible large X close button (≥ 44px hit target), (b) `Escape` key, (c) backdrop click. The existing BottomSheet has Escape (line 24 of BottomSheet.tsx) and likely backdrop click (verify). X button presence at all sizes — verify. Add the missing path(s).
  - **Override 5 (no icon-only chrome buttons) — relevant to form button grids:** every picker tile (Drink type / Leak trigger / Sensation) MUST have a text label visible (currently does — preserve). The X close button is the boundary exception (its function is universal and learned).
  - **Override 6 (browser zoom resilience):** Phase 6 forms must remain usable at 100/150/200% browser zoom — Phase 8 audit item, but Phase 6 should not add absolute pixel values that break under zoom.
  - **Override 7 (familiar patterns only) — strict:** NO swipe-to-dismiss, NO swipe-between-steps, NO drag-to-reorder, NO hover-to-reveal. Tap-to-act, click-to-act, Tab-to-navigate, Enter-to-advance, Escape-to-close — all familiar patterns.
- **Design DNA axis 4 (Card elevation):** Modal at md+: `shadow-xl ring-1 ring-black/5` per Phase 5 cascade rule. In-form content (sub-pickers, sliders): flat — no elevation cards inside the modal (the modal IS the elevation; nesting elevation looks cluttered).
- **Design DNA axis 6 (Motion):** Modal slide-in at md+ — allowed, ≤ 200ms. Toast slide-in — already exists, preserve. No fade transitions between form steps. No animated picker-tile selection (color shift only).
- **SEO invariants (§"SEO invariants"):** Phase 6 doesn't touch SEO-relevant pages; forms are post-onboarding, gated behind user state. No risk to SEO surface.

### Phase 6 specific decisions (new — locked here)

#### BottomSheet primitive transformation strategy
- **Locked:** BottomSheet stays a SINGLE primitive that renders different at `<md` vs `md+`. NOT two separate components.
- **At `<md`:** behavior is BYTE-EQUIVALENT to today — bottom-anchored sheet that slides up from the viewport bottom.
- **At `md`+:** transforms into a centered modal — `position: fixed`, centered with flex/grid centering, `max-w-2xl` or `max-w-3xl` (UI-SPEC picks), `shadow-xl ring-1 ring-black/5`, backdrop with subtle blur, slide-in from below (≤200ms) or fade-in (≤150ms — UI-SPEC picks).
- **Discretion:** the exact transition between the two patterns at the breakpoint. Tailwind responsive classes only (`md:translate-y-0 md:items-center md:max-w-3xl ...`); no JS breakpoint detection.

#### Keyboard navigation depth
- **Locked:** `Enter` advances to the next step or submits if final step. Implemented via form-level `onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && isValid) advance(); }}` OR via making the primary CTA the form's default `<button type="submit">` so the browser's native Enter-submit fires.
- **Locked:** `Escape` closes the sheet from any focused element inside (BottomSheet already has this).
- **Locked:** `Tab` order is logical — flows top-to-bottom through selectable items → inputs → primary action.
- **Locked:** Initial focus on sheet open lands on the FIRST INTERACTIVE control (the first selectable button / input). Implemented via `useEffect` + `ref.current.focus()` on the first interactive child OR via `autoFocus` on the appropriate element.
- **Locked:** Focus-visible rings on EVERY interactive element in the form (per Phase 5 NavLink pattern, refine `Button.tsx` if needed). Apple HIG / WCAG 2.5.5 / Boomer-safe override 1.
- **Out of scope (Phase 8 maybe):** Number-key shortcuts (1-8 for picker tiles). Arrow-key nudging on sliders (native browser behavior already works for `<input type="range">`). Pre-decided in the original scoping AskUserQuestion.

#### Modal close affordances at md+ (per Boomer-safe override 4)
- **Locked:** 3 paths required, every form sheet, at md+:
  1. Visible X close button (≥ 44px hit target, top-end corner of the modal)
  2. `Escape` key (BottomSheet already has it — preserve)
  3. Backdrop click — verify BottomSheet has this; if not, add. At `<md` the bottom-sheet pattern doesn't typically have backdrop click (mobile UX assumes swipe-down to dismiss, but per Override 7 we don't use swipe — so add backdrop click at all sizes for consistency, OR keep mobile-as-today and only add it at md+ for the modal pattern). **Decision: keep mobile as-today (BottomSheet may already have backdrop click at mobile — verify); add backdrop click at md+ explicitly.**

#### Form button grid responsive layout
- **Locked breakpoint behavior** for sub-pickers (DrinkTypePicker, LeakTriggerPicker, SensationPicker):
  - At `<sm` (mobile, ≤639px): current grid (likely 2-col or 4-col mobile-narrow) — PRESERVE EXACTLY.
  - At `md`+: reflow to 4-col grid (drink, leak — both have 8 items so 4×2). Sensation has 5 items — 5-col or 3-col-with-balanced-layout (UI-SPEC picks).
  - Buttons inside the grid: max width per button ~`max-w-[20rem]` (320px) so 8-item buttons don't stretch absurdly even inside a `max-w-3xl` modal.

#### Volume slider responsive layout
- **Locked:** Slider rows constrained to `max-w-2xl` at md+ (per Design DNA axis 1 — `narrow` token). The `<input type="range">` stays full-width within that bounded row. Volume readout typography bumps from current `text-2xl` to `text-3xl` or `text-4xl` at md+ (boomer-safe + Design DNA axis 1).

#### Sheet header structure
- **Locked:** At md+, the modal needs a clear header bar with: title (existing), step indicator "X of Y" (per Streamlined Cognition P2), close X button. At `<md`, the existing bottom-sheet header pattern is preserved exactly.

#### Reset-on-cancel confirmation (per Streamlined Cognition P7)
- **Audit during execution:** for each form, check if Cancel/Close discards UNSAVED input WITHOUT confirmation. If yes AND the user has entered non-default data, add a "Discard your entry?" confirmation via the existing `ConfirmDialog` (already used elsewhere in the codebase — verify path).
- **Default decision:** if the form has only DEFAULT pre-selected values (no user-typed/clicked changes), Cancel can dismiss silently (no need to confirm discarding defaults). If the user has interacted (clicked a different picker tile, moved the slider, typed in notes), Cancel triggers a `ConfirmDialog`. This is per-form discretion — UI-SPEC + planner refine.

#### Tech-stack constraints (inherited from Phase 5)
- Tailwind 4 + Next.js 16 App Router + React 19 + Zustand + next-intl 4 — pinned.
- No new dependencies. No new state management.
- TypeScript strict mode; no `as any`; no `@ts-ignore`.
- All forms are already `'use client'` — preserve.
- All existing logical CSS (`ms-*`, `pe-*`, `ps-*`, `me-*`, `start`, `end`, `rtl:scale-x-[-1]`) PRESERVED.
- All existing `data-testid` attributes PRESERVED — E2E walkthrough.spec.ts depends on them.

### Claude's Discretion

- Exact CSS class strings for BottomSheet's modal transformation at md+ (centering pattern, backdrop blur amount, exact max-w token name)
- Whether to extract a shared `useFormKeyboard` hook for Enter-advance + Escape-close + initial-focus, OR keep inline per form. Default: INLINE per form because the forms have different step structures and shared abstraction risks over-engineering.
- Whether reset-on-cancel uses the existing `ConfirmDialog` directly OR a lighter inline confirmation. Default: existing `ConfirmDialog` (consistency).
- Sub-picker grid columns at `md`+ — 4-col vs auto-fit vs explicit breakpoint widths. Default: explicit `md:grid-cols-4` for the 8-item pickers, `md:grid-cols-5` for the 5-item Sensation picker.
- Whether the modal slide-in at md+ uses `transition-transform` or `transition-opacity` or both. Default: both (`transition-all duration-200`).
- Default focus target per form when the form has multiple natural entry points. Default: the first picker tile / input that appears in DOM order.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Upstream phase context (READ FIRST — this is the canonical design framework Phase 6 applies)
- `.planning/phases/05-layout-foundation-appshell-chrome/05-CONTEXT.md` — Streamlined Cognition (8 principles), Mobile-first PRIMACY, Boomer-safe overrides (7 rules), Design DNA (8 axes), cascade rules for Phase 6
- `.planning/phases/05-layout-foundation-appshell-chrome/05-UI-SPEC.md` — design token references (max-width tokens, spacing scale, typography, color, copywriting contract, focus-ring spec, hover-affordance spec)
- `.planning/phases/05-layout-foundation-appshell-chrome/05-01-PLAN.md` — Container primitive (Phase 6 may use Container inside the modal for internal max-width constraints)
- `.planning/phases/05-layout-foundation-appshell-chrome/05-05-PLAN.md` — QuickLogFAB pattern (Phase 6 forms are launched FROM the FAB; the FAB's data-testid attributes (`fab-toggle`, `fab-action-drink`, etc.) MUST continue to work post-Phase-6)

### Project docs
- `docs/UX_PHILOSOPHY.md` — Boomer-safe UX principles, 6 design principles, target user 50+
- `docs/TIME_MODEL.md` — Day-boundary correctness invariants (not directly relevant to Phase 6 form internals, but consulted if any form touches date/time display)
- `CLAUDE.md` — Project instructions, naming conventions, anti-patterns, TypeScript strict mode, error handling

### Codebase conventions (read these before writing/modifying form components)
- `src/components/ui/Button.tsx` — UI primitive pattern (forwardRef, displayName, variants, `min-h-[44px]` md, `min-h-[52px]` lg); Phase 6 may extend its focus-visible token if not already present
- `src/components/ui/BottomSheet.tsx` (108 lines) — existing primitive; Phase 6 EXTENDS it (does NOT rewrite). Already has Escape close (line 24). Verify and preserve body-scroll-lock, dragHandle, header.
- `src/components/ui/ConfirmDialog.tsx` — existing confirmation primitive; Phase 6 USES it for reset-on-cancel where applicable
- `src/components/ui/VolumeInput.tsx` — existing pattern for Enter-advance on a numeric input (line 55); reference for the keyboard pattern in form-level Enter handlers
- `src/components/diary/QuickLogFAB.tsx` — Phase 5 work; forms are launched from the FAB; preserve all 4 `data-testid` attributes
- All 5 form components + 3 picker components — Phase 6 modifies in place

### Test surface
- `src/__tests__/` — existing vitest tests; Phase 6 should add or extend tests for the keyboard handlers (Enter advance, Escape close path, initial focus)
- `e2e/walkthrough.spec.ts` — existing 6-locale walkthrough; Phase 6 should NOT break it (the walkthrough exercises every form via the FAB and through completion). Phase 6 will likely add new test cases for keyboard navigation, OR extend the existing walkthrough.

### i18n + locale infrastructure
- `src/i18n/config.ts` — locale list (en/fr/es/pt/zh/ar); Arabic is RTL
- `messages/{locale}.json` — all form copy strings; Phase 6 introduces NO new strings (preserve existing)

### Memory references (apply automatically)
- `feedback_no_em_dashes.md` — no em-dashes in UI strings
- `feedback_collaborative_tone.md` — patient-facing copy is peer/collaborative
- `feedback_lightning_css_grouped_selectors.md` — globals.css gotchas
- `project_i18n_six_locales.md` — all 6 locales remain at parity
- `feedback_verify_all_locales_before_push.md` — render-verify every locale after changes

</canonical_refs>

<specifics>
## Specific Ideas

### The user's stated problems from the original brief (these are what Phase 6 must fix)
1. Bottom-sheet forms span 100% viewport on desktop — drink/leak/sensation button grids stretch to ~430px wide each, volume slider stretches across ~1800px → **Phase 6 fixes via BottomSheet desktop modal transformation + sub-picker responsive grids + slider max-w-2xl**
2. "When I press Enter it doesn't go to next" → **Phase 6 fixes via form-level Enter-advance handlers**
3. Form sheets feel "ridiculously big" on desktop → **Phase 6 fixes via max-w bounded modal + 4-col grids + bounded slider rows**

### Reference visuals
- The user mentioned Airbnb specifically. Airbnb's booking modals: centered, bounded width, subtle elevation, generous internal padding, clear close X, smooth slide-in. THAT is the target pattern.
- Already-good reference INSIDE this codebase: `src/components/ui/IpcInfoModal.tsx` — already follows modal pattern (centered, elevated, has close X). Phase 6's BottomSheet transformation should harmonize with this pattern.

### Concrete BottomSheet target shape (UI-SPEC will refine)
At `<md`: today's bottom-sheet, byte-equivalent.
At `md`+: centered modal-style card, `max-w-3xl` (for grid-heavy forms like LogDrink with picker + slider) or `max-w-2xl` (for slider-only forms like SetBedtime), `shadow-xl ring-1 ring-black/5`, white background, subtle backdrop blur, header bar with title + step indicator + close X (44px hit target), slide-in animation ≤ 200ms.

</specifics>

<deferred>
## Deferred Ideas

These came up during Phase 5 cascade analysis but are explicitly OUT of Phase 6 (and tracked elsewhere):

- **Onboarding flow keyboard work** (age input, timezone picker) — Phase 7, requirement DTUX-04. Phase 6 only covers DIARY forms.
- **Summary + export page responsive treatment** — Phase 7, requirement DTUX-05.
- **Cross-locale visual QA matrix run** — Phase 8, requirement DTUX-06.
- **Number-key shortcuts** (e.g., press 2 to pick Tea) — out of milestone per original scoping.
- **Arrow-key slider nudging** — out of milestone (native browser behavior preserved).
- **Swipe-to-dismiss / swipe-between-steps** — explicitly forbidden by Boomer-safe override 7 (familiar patterns only).
- **QuickLogFAB speed-dial button 40px → 44px hit-target bump** — flagged in Phase 5's 05-05 plan execution as a Phase 6 candidate. Phase 6 SHOULD address this since it's touching adjacent form-launch chrome. Add as a small bonus task in the Phase 6 plan if scope allows.
- **DayPageClient hydration-race redirect fix** (Phase 5 verification surfaced this) — separate quick task; not Phase 6 scope.
- **H1 hydration-gating SEO fix** (Phase 5 verification surfaced this) — separate quick task / mini-phase; not Phase 6 scope.
- **`TimelineView.tsx` 884-line monolith refactor** — already deferred at the milestone level.

</deferred>

---

*Phase: 06-diary-forms-keyboard-navigation*
*Context gathered: 2026-05-16 (inline; references Phase 5 CONTEXT.md as the canonical design framework — Phase 6 applies, does not re-litigate)*
