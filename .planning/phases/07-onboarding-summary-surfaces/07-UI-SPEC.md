---
phase: 7
slug: onboarding-summary-surfaces
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-16
upstream: 05-CONTEXT.md, 05-UI-SPEC.md, 06-CONTEXT.md, 06-UI-SPEC.md, 07-CONTEXT.md, REQUIREMENTS.md (DTUX-04 + DTUX-05), ROADMAP.md (Phase 7 success criteria), docs/UX_PHILOSOPHY.md
---

# Phase 7: Onboarding + Summary surfaces — UI Design Contract

> Visual + interaction contract for the 3-step onboarding wizard and the post-diary summary page. Mobile (< 768px) is byte-equivalent to today (HARD CONSTRAINT inherited from Phase 5's First Principle). All desktop (`md`+) behavior is layered additively on top of an unchanged mobile baseline via Tailwind responsive prefixes only. Authored from `07-CONTEXT.md` (locked cascade rules), `05-UI-SPEC.md` (reused design tokens), `06-UI-SPEC.md` (Button focus-visible migration + BottomSheet modal pattern reused by the timezone picker), `REQUIREMENTS.md` (DTUX-04 + DTUX-05), `ROADMAP.md` Phase 7 (5 success criteria), `docs/UX_PHILOSOPHY.md` (Boomer-safe principles), and a per-file codebase audit of every component listed in `07-CONTEXT.md` §"Surfaces in scope".

---

## Status

| Field | Value |
|---|---|
| Phase | 7 — Onboarding + Summary surfaces |
| Requirements | DTUX-04 (onboarding editorial layout) + DTUX-05 (summary multi-column + export hover) |
| Source | `07-CONTEXT.md` (locked decisions) + `05-UI-SPEC.md` / `06-UI-SPEC.md` (reused tokens) + codebase audit |
| Date | 2026-05-16 |
| Tech baseline | Tailwind 4 (`@theme inline` in `globals.css`), Next.js 16 App Router, React 19, next-intl 4, lucide-react 0.577. NO new dependencies. |
| Class composition | Inline template-literal class strings (existing project convention; `clsx`/`cva` NOT in deps and NOT introduced) |
| Out of scope this phase | Diary day live-metrics sidebar (Design DNA axis 8 EXPLICIT BAN), in-page IPC clinical metric rendering (24HV/NPi/AVV/MVV/NBC live in CSV/PDF exports only — see §"Summary Page Layout" boundary), cross-locale visual QA matrix run (Phase 8), Container primitive (Phase 5 — already adopted), AppShell chrome (Phase 5), BottomSheet modal transformation (Phase 6 — already inherited by timezone picker), diary form keyboard navigation (Phase 6 — does not extend to onboarding step keyboard work; Phase 7 owns this), new color tokens, new fonts, new dependencies, restart-onboarding ConfirmDialog flow (no restart affordance exists today — see decision below) |
| Hard constraints | Mobile (< 768px) byte-equivalent — NO new mobile carve-outs introduced this phase (the two from Phase 5 — Arabic FAB end-5 and +8px sm:px-6 — remain the exhaustive carve-out set). All NEW classes are `md:`-prefixed or higher. |

---

## Design Tokens (REUSED from Phase 5)

Phase 7 introduces NO new design tokens. It consumes the exact set Phase 5 locked. Quoted here for executor convenience; canonical reference is `05-UI-SPEC.md`.

### Breakpoints (Tailwind 4 native — no custom breakpoints)

| Token | Min width | Use in Phase 7 |
|---|---|---|
| (mobile baseline) | < 768 | Onboarding + summary render byte-equivalent to today |
| `md` | **768** | **Desktop activates.** Onboarding headlines bump; age input + unit toggle widen; summary H1 bumps; export buttons wrap to `md:max-w-2xl mx-auto`; hover affordance fires |
| `lg` | 1024 | Reserved for future enhancement; Phase 7 ships no `lg:`-specific layout (summary is already `Container variant="default"` = max-w-3xl which caps before lg+ becomes visually critical) |
| `xl` | 1280 | No additional layout change in Phase 7 |

### Container max-width tokens (reused — already adopted)

| Variant | Max-width | Already adopted in Phase 7 surfaces? |
|---|---|---|
| `narrow` | `max-w-2xl` (672px) | YES — `OnboardingFlow.tsx` line 90 (`<Container variant="narrow" as="div" noPadding className="px-6 sm:px-6 pt-6 md:pt-12 pb-10 flex flex-col items-center">`) — PRESERVE; do NOT re-wrap |
| `default` | `max-w-3xl` (768px) | YES — `summary/page.tsx` lines 79 + 90 (both branches) — PRESERVE |
| `wide` | `max-w-5xl` (1024px) | NOT USED — Phase 7 does NOT widen summary to `wide` because there is no in-page IPC metric grid that would benefit; the 3-stat effort grid + observations + day cards all fit comfortably in `default` (max-w-3xl). See §"Summary Page Layout" → "Container variant decision" for rationale. |

**Phase 7 does NOT use `<Container>` inside the BottomSheet** (timezone picker) — the BottomSheet primitive owns its own max-width via Tailwind classes (Phase 6 work, `md:max-w-3xl` per default `maxWidth` prop). The Container component remains the geometry primitive for page-level content only.

### Color tokens (reused — NO new colors)

Phase 7 uses ONLY tokens already defined in `src/app/globals.css @theme inline`:

| Token | Hex | Used in Phase 7 for |
|---|---|---|
| `--color-surface` | `#fefdfb` | Body background (inherited from AppShell) |
| `--color-ipc-50` | `#fdf8ef` | Effort-stat tile bg (existing — preserved), unit-toggle selected bg (existing), Sparkles card bg (existing), observations card bg (existing), Day-summary header bg (existing), export buttons hover bg (NEW per axis 5) |
| `--color-ipc-100` | `#f9edda` | Effort-stat tile border (existing — preserved), section divider lines (existing) |
| `--color-ipc-200` | `#f2d8b4` | Unit-toggle resting border (existing), input resting border (existing) |
| `--color-ipc-400` | `#a8651b` | Step-counter UPPERCASE label color (existing), placeholder text on age input (existing) |
| `--color-ipc-500` | `#955a14` | Active step dot fill (existing), input focus border + ring (existing — will migrate to `focus-visible:` in Phase 7), primary CTA fill via Button primitive (existing), unit-toggle selected border (existing) |
| `--color-ipc-600` | `#7b4a10` | Effort-stat label text (existing), back-link text (existing), export button hover text shift (NEW per axis 5) |
| `--color-ipc-700` | `#62380c` | Body subtitles (existing), export button hover end-state text (NEW per axis 5) |
| `--color-ipc-950` | `#1d0f02` | Headline text (existing), summary H1 (existing), effort-stat number text (existing) |
| `--color-success` | (existing) | Hero CheckCircle2 icon (existing — preserved) |
| `--color-drink` | (existing) | DrinkVoidTimeline drink dots (existing — preserved), DaySummaryCard drink stat (existing) |
| `--color-void` | (existing) | DrinkVoidTimeline pee dots (existing — preserved), DaySummaryCard void stat (existing) |
| `--color-leak` / `--color-bedtime` / `--color-warning` | (existing) | DaySummaryCard sub-stats (existing — preserved) |

### Focus-visible ring spec (reused from Phase 5; extended to onboarding inputs in Phase 7)

All NEW or MIGRATED interactive elements use the spec Phase 5 + Phase 6 locked:

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ipc-500
focus-visible:ring-offset-2
focus-visible:ring-offset-white   /* on white-fill controls; -surface on body-bg controls */
```

**Phase 7 migrations from `focus:` → `focus-visible:` (locked):**

| File / line | Element | Current | Phase 7 target |
|---|---|---|---|
| `OnboardingFlow.tsx:125` | Age `<input type="number">` | `outline-none focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30` | `outline-none focus-visible:border-ipc-500/60 focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white` (keeps the border-bump on focus-visible, upgrades the ring to the Phase 5/6 spec) |
| `OnboardingFlow.tsx:227` | Date `<input type="date">` | same `focus:` pattern | same `focus-visible:` migration |

**Mobile invariant of these migrations:** `focus-visible:` only fires on keyboard focus on most platforms — touch-tap on mobile does NOT trigger the ring (browsers infer the input source). Mobile rendering byte-equivalent. The migration is for desktop keyboard users.

**Per-element override:** the two onboarding back-pill buttons (lines 196, 279) currently have NO focus ring at all — they use `hover:bg-ipc-50 active:scale-[0.97]`. Phase 7 adds `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface` (offset-surface because the body bg here is `bg-surface`).

### Hover affordances (Phase 7 introduces ONE pattern — bounded by Boomer-safe override 2)

**The hover-lift pattern locked by `07-CONTEXT.md` for export buttons (CSV / PDF / Share):**

```
hover:translate-y-[-1px]
hover:bg-ipc-50
hover:text-ipc-700
transition-all duration-150
```

- `translate-y-[-1px]` is the MAX hover lift (Boomer-safe override 2). NEVER `-2px` or beyond.
- `duration-150` is the MAX transition duration for state changes (Boomer-safe override 3 — under the 200ms cap).
- `transition-all` is used (not `transition-transform` alone) so the color shift + the lift both interpolate together — feels like ONE response, not two.
- Color shift to `text-ipc-700` + `bg-ipc-50` is the same palette Phase 5 chrome uses for nav-link hover. NO new colors.

**Where this fires:**
- Export buttons (CSV / PDF / Share) — see §"Export Actions" below for exact class composition.
- Onboarding Next CTA — INHERITED from Button primitive's existing `hover:bg-ipc-600 active:bg-ipc-700` (primary variant — already locked Phase 5). NO new pattern needed.
- Effort-stat tiles, top-standout card, observations card, day-summary cards — NO hover (they are NOT clickable per Design DNA axis 5 boundary). Hover-fancy on non-clickable content lies about interactivity.

**Mobile invariant:** `hover:` rules don't fire on touch input (touch devices skip hover-state by default). Mobile users see no transformation. Byte-equivalent.

### Spacing scale (Tailwind 4px grid — no new values)

Phase 7 uses ONLY the existing values from Phase 5's spacing scale:

| Token | Value | Used in Phase 7 for |
|---|---|---|
| `gap-1.5` / `gap-2` / `gap-3` | 6 / 8 / 12px | Step-dot spacing, button-gap inside button rows, icon-text gaps |
| `mb-2` / `mb-3` / `mb-4` / `mb-5` / `mb-8` | 8 / 12 / 16 / 20 / 32px | Section spacing inside onboarding steps (existing) |
| `px-4` / `px-6` | 16 / 24px | Container horizontal padding (already locked Phase 5) |
| `py-3` / `py-6` | 12 / 24px | Input + toggle vertical padding (existing) |
| `pt-6 md:pt-12` | 24 / 48px | Onboarding outer vertical rhythm (existing) |
| `min-h-[44px]` | 44px | **Boomer-safe override 1 floor** — Phase 7 BUMPS the 2 back-pill buttons from `min-h-[40px]` to `min-h-[44px]` (see §"Hit-target audit" below) |
| `min-h-[52px]` | 52px | Button `size="lg"` (existing — used on Next CTA + Confirm & Start) |

---

## Onboarding Flow — Per-Step Specs

**File:** `src/components/onboarding/OnboardingFlow.tsx` (316 lines)
**Container wrap:** `<Container variant="narrow" as="div" noPadding className="px-6 sm:px-6 pt-6 md:pt-12 pb-10 flex flex-col items-center">` (line 90 — PRESERVE unchanged; Phase 5 already adopted it)
**Step indicator (lines 92-102):** dots + UPPERCASE "STEP X OF 3" label — PRESERVE EXACTLY; the Phase 7 typography bumps do NOT touch this region (step indicator stays at `text-[11px]` mobile + md+ for boomer-safe legibility per UX_PHILOSOPHY §2). The container's `mb-5` between indicator and headline is preserved at all viewports.

### Shared step chrome (applies to all 3 steps)

#### Headline (h2) typography bump — LOCKED

| Viewport | Class | Computed size |
|---|---|---|
| Mobile baseline | `text-2xl font-bold text-ipc-950 text-balance` (existing) | 24px |
| md+ (Phase 7 NEW) | `text-2xl md:text-3xl font-bold text-ipc-950 text-balance` | 24px → 30px at md+ |

**Decision: `md:text-3xl` (30px) NOT `md:text-4xl` (36px).** Rationale:
- `text-3xl` at md+ is the Phase 5 cascade text Plan 05-04 chose for chrome (Footer heading `text-lg sm:text-xl`); Phase 7 onboarding is a related editorial moment, not a marketing landing hero.
- `text-4xl` would be larger than the summary H1 at the same viewport (`md:text-4xl` — see §"Summary Page Layout") which would visually outrank the result-celebration moment. Hierarchy: summary celebration > onboarding step headlines.
- Boomer-safe override 7 ("familiar patterns only"): keeping onboarding headlines close to the body type scale reads as a step-by-step form, not as a marketing brochure.
- A `md:text-4xl` is reserved as Claude's Discretion for the planner to opt into if user-testing the rendered build calls for more punch — see §"Open Questions" below.

#### Subtitle (p) typography — NO CHANGE

| Viewport | Class | Computed size |
|---|---|---|
| Mobile + md+ | `text-sm text-ipc-500 mb-8` (existing) | 14px stays at all viewports |

Rationale: the subtitle is intentionally restrained — it's helper copy under the headline. Bumping it would compete with the headline.

#### Primary CTA (Button `size="lg"`) — NO CHANGE

The Phase 5 Button primitive's `size="lg"` is `min-h-[52px] text-lg px-6 py-3.5` (lines 19-21 of `Button.tsx`). Already 52px — well above the 44px floor. NO Phase 7 changes to Button-call sites for the Next/Confirm CTAs.

#### Back-pill buttons — HIT-TARGET BUMP LOCKED

**Audit finding:** `OnboardingFlow.tsx:196` and `OnboardingFlow.tsx:279` use `min-h-[40px]` — BELOW Boomer-safe override 1's 44px floor. Phase 7 BUMPS both to `min-h-[44px]`:

```diff
- className="inline-flex items-center justify-center gap-1 px-4 min-h-[40px] rounded-full
+ className="inline-flex items-center justify-center gap-1 px-4 min-h-[44px] rounded-full
    text-sm font-semibold text-ipc-700 bg-white border border-ipc-200
-   hover:bg-ipc-50 active:scale-[0.97] transition-all"
+   hover:bg-ipc-50 active:scale-[0.97] transition-all
+   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
```

**Mobile invariant of this bump:** The +4px tap-target growth is the SAME correctness fix Phase 5 applied to NavLink (40px → 44px). It is a mobile diff but a CORRECTNESS fix per Boomer-safe override 1 — explicitly accepted in the cascade. The visual delta is negligible (the button looks ~4px taller at all widths); the click target gains the WCAG 2.5.5 / Apple HIG minimum.

#### Keyboard contract (NEW — DTUX-04 deliverable)

Per CONTEXT.md §"Phase 6 cascade rules" → "Phase 6 only covers DIARY forms. Phase 7 onboarding step keyboard work — Phase 7." Phase 7 adds Enter-to-advance handlers on each step.

**Implementation pattern locked:** form-level `onKeyDown` on the inner step `<div key="stepN">` container (not on the outer Container which would conflict with the timezone picker BottomSheet's own keyboard handling). Single source of truth: the step container's keydown.

For step 1 (line 106):
```tsx
<div key="step1" className={`w-full text-center ${animClass}`}
  onKeyDown={(e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (isAgeValid) {
      track('onboarding_age', { age: ageNum });
      goForward(2);
    }
  }}
>
```

For step 2 (line 148): same pattern; advance condition is implicit (`volumeUnit` always has a value via default `'mL'`, so Enter always advances).

For step 3 (line 209): same pattern; `handleConfirm()` is called on Enter (mirrors the Confirm & Start button's onClick).

**Textarea exclusion:** none of the 3 onboarding steps contain a textarea, but the exclusion guard is preserved for defensive consistency with Phase 6's pattern.

**Mobile invariant:** `onKeyDown` is a keyboard-only event handler. Touch users on mobile never fire it. Zero pixel diff.

**Tab order per step (verified from DOM):**

Step 1: age input (already has `autoFocus` line 128 — first focus) → Next button.
Step 2: mL toggle button → oz toggle button → Next button → Back pill.
Step 3: date input → Change-timezone pill → Confirm & Start button → Back pill.

Tab flows logically top-to-bottom in source order. NO `tabindex` overrides needed.

#### Step transition animation — NO CHANGE

Existing `animate-step-in-left` / `animate-step-in-right` (lines 580/584 of globals.css) PRESERVED unchanged. The Phase 7 typography bumps do NOT touch the step transition layer.

---

### Step 1 (age) — LOCKED

**Headline (line 107) — UPDATE:**

```diff
- <h2 className="text-2xl font-bold text-ipc-950 mb-2 text-balance">
+ <h2 className="text-2xl md:text-3xl font-bold text-ipc-950 mb-2 text-balance">
    {t('ageTitle')}
  </h2>
```

**Subtitle (line 110):** NO CHANGE.

**Age input (line 116-129) — UPDATE:**

The user's stated problem from CONTEXT.md `<specifics>` section 1: "the '30' age input swimming in 1920px of whitespace at desktop." Two locked refinements:

```diff
- className="w-28 text-center text-3xl font-bold text-ipc-950
+ className="w-28 md:w-32 text-center text-3xl md:text-4xl font-bold text-ipc-950
    bg-white/60 border-2 border-ipc-200/50 rounded-2xl py-3
-   outline-none focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30
+   outline-none focus-visible:border-ipc-500/60 focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white
    transition-all placeholder:text-ipc-200 placeholder:text-xl
    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
```

Three changes:
- `md:w-32` — width 112px → 128px at md+. Subtle proportional gain so the input no longer looks tiny against the wider Container at md+.
- `md:text-4xl` — number size 30px → 36px at md+. The number IS the affordance; bigger means more confident at desktop reading distance.
- `focus-visible:` migration with the Phase 5/6 spec.

**Why not also bump `py-3` to `py-4` at md+:** the input height is already proportional. `py-3` + `text-3xl` line-height + `border-2` = ~58px on mobile; with `md:text-4xl` it natively grows to ~66px at md+. Well above the 44px floor. Bumping padding would over-inflate.

**Mobile invariant for Step 1:** all changes are `md:`-prefixed. Mobile classes (`w-28 text-3xl py-3`) preserved exactly. Focus-style migration is keyboard-only — no touch diff.

**Wireframe at md (768px viewport with Container narrow at max-w-2xl = 672px):**

```
┌──────────────────────────────────────────────────────────────────┐ <- 768px viewport
│                                                                  │
│              [● ○ ○]                                             │
│              STEP 1 OF 3                                         │
│                                                                  │
│              Tell us your age   (text-3xl bumped from text-2xl)  │
│              short helpful subtitle                              │
│                                                                  │
│              ┌──────────┐                                        │
│              │  50      │   (w-32, text-4xl — 128px wide x ~66px)│
│              └──────────┘                                        │
│                                                                  │
│              ┌────────────────────────┐                          │
│              │     Next  →            │   (Button lg, ≥52px)     │
│              └────────────────────────┘                          │
│                                                                  │
│              (max-w-xs around Next preserves the focused look)   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Step 2 (units) — LOCKED

**Headline (line 149) — UPDATE:** same `md:text-3xl` bump.

**Subtitle (line 152):** NO CHANGE.

**Two-button toggle (lines 156-182) — UPDATE:**

Current `flex-1 max-w-[160px]` is from the pre-desktop-redesign era. At md+ inside `Container narrow` (max-w-2xl = 672px) two 160px buttons gap-3 = ~332px of content occupying ~672px — looks small.

```diff
  <button
    type="button"
    onClick={() => setVolumeUnit('mL')}
-   className={`flex-1 max-w-[160px] py-6 rounded-2xl border-2 transition-all active:scale-[0.97] ${
+   className={`flex-1 max-w-[160px] md:max-w-[200px] py-6 md:py-8 rounded-2xl border-2 transition-all active:scale-[0.97]
+     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
      volumeUnit === 'mL'
        ? 'border-ipc-500 bg-ipc-50 ring-2 ring-ipc-200/50'
        : 'border-ipc-200/50 bg-white/60 hover:border-ipc-300'
    }`}
  >
    <span className="block text-3xl font-bold text-ipc-950 mb-1">mL</span>
    <span className="block text-sm text-ipc-500">{tc('millilitres')}</span>
  </button>
```

(Same diff applied to the `oz` button at lines 170-181.)

Changes:
- `md:max-w-[200px]` — 160px → 200px max per button at md+. Together (200 + gap-3 + 200) = ~412px of two visually generous tiles inside ~672px Container. Looks proportioned.
- `md:py-8` — vertical padding 24px → 32px at md+. Boomer-safe override 1 — already above 44px floor on mobile (24 + 24 + ~36 number height + 4 mb-1 + ~20 subtitle = ~108px); md+ bumps to ~124px. Even more comfortable hit target.
- `focus-visible:` ring added (matches the migration pattern). The existing `ring-2 ring-ipc-200/50` on the selected state stays (decorative interior ring on the chosen unit); the focus ring is the outer visibility cue.

**Hit-target verification:** mobile ~108px / md+ ~124px — both well above 44px. PASS.

**Mobile invariant:** `max-w-[160px]` + `py-6` preserved at mobile; new `md:max-w-[200px] md:py-8` is inert below 768px. Focus-visible ring is keyboard-only. **Byte-equivalent.**

**Back-pill button (line 196):** apply the `min-h-[40px]` → `min-h-[44px]` bump + focus-visible ring per §"Shared step chrome".

---

### Step 3 (date + timezone) — LOCKED

**Headline (line 210) — UPDATE:** same `md:text-3xl` bump.

**Subtitle (line 213):** NO CHANGE.

**Date input (lines 217-231) — UPDATE:**

Current input is the only step-3 form control besides the timezone-change pill. Mobile-pristine sizing already feels intentional; at md+ a small proportional widen is justified.

```diff
  <input
    type="date"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
-   className="ps-10 pe-4 py-3 text-base font-semibold text-ipc-950
+   className="ps-10 pe-4 py-3 md:py-4 text-base md:text-lg font-semibold text-ipc-950
      bg-white/60 border-2 border-ipc-200/50 rounded-2xl
-     outline-none focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30
+     outline-none focus-visible:border-ipc-500/60 focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white
      transition-all"
  />
```

Changes:
- `md:py-4` — vertical padding 12px → 16px at md+. Gives the input visual confidence proportional to the wider Container at md+.
- `md:text-lg` — type 16px → 18px at md+. Matches the proportional bump.
- `focus-visible:` migration.

**Timezone-change pill (lines 239-246):** NO CHANGE. It's a secondary affordance; bumping it would compete with the date input + primary CTA. Hit target verification: `px-3 py-1` + `text-xs` ≈ ~28px tall, which is BELOW 44px. **However:** this is a secondary text-pill on a low-density step, not a primary tap target. Phase 6's NavLink set the precedent that secondary chrome can be ≥40-44px if it's part of a row of clearly larger primary actions. The `text-xs` is intentional (UX_PHILOSOPHY §2 — words beat symbols, but the cue here is "Change" which is a single-token instruction). **Decision: defer to Phase 8 visual-qa audit.** If Phase 8 flags it, the planner adds `min-h-[44px]` + adjusts `py-1` → `py-2.5`. Phase 7 does NOT touch this pill — there's no user-stated problem with it and Boomer-safe override 1 is already met for the PRIMARY tap targets (date input, Confirm & Start, Back).

**3-day preview card (lines 250-266):** NO CHANGE. The card is the existing "what you'll be tracking" reassurance with the locked compact layout from the 2026-04-21 onboarding fold fix (UX_PHILOSOPHY decisions log). It's a display block, not interactive — no hit-target concerns.

**Back-pill button (line 279):** apply the `min-h-[40px]` → `min-h-[44px]` bump + focus-visible ring per §"Shared step chrome".

**Confirm & Start CTA (line 269):** NO CHANGE (Button `size="lg"` already at 52px).

---

### Locale-safe illustration decision — DEFER

**Per CONTEXT.md Claude's Discretion:** "Whether to add a locale-safe illustration (SVG hero) above the age input headline. UI-SPEC decides."

**Decision: DEFER. Phase 7 ships type-driven only. NO illustration added this phase.**

Rationale:
- **The user's stated problem is geometry, not absence-of-visual** ("'30' input swimming in 1920px of whitespace"). The `md:text-3xl` headline + `md:w-32` input + Container narrow at max-w-2xl SOLVES the geometry. An illustration would solve a different (unstated) problem.
- **Streamlined Cognition P1** (one primary action per screen): an illustration above the headline competes for first-glance attention with the headline + input. Boomer-safe — keep the screen unambiguous.
- **Locale-safety risk surface:** any illustration would need to (a) contain no English text in the artwork, (b) mirror-safe for RTL Arabic, (c) carry no demographic implication (the diary serves all genders per `project_ipc_positioning.md` memory). One additional asset + 6-locale verification is non-trivial risk for a "polish" addition.
- **Mobile invariant cost:** an illustration would need to be `hidden md:block` to satisfy the byte-equivalent mobile constraint. Optional desktop-only chrome that adds nothing to the task — exactly the kind of decorative-not-functional add that Design DNA axis 3 cautions against.
- **Phase 8 is the natural reconsider gate:** if visual-qa surfaces "step 1 still feels empty at md+ even with the typography bump," the planner can revisit with a small SVG. Until then, the bump is enough.

**If a future iteration adds an illustration**, the constraints are: SVG only (no PNG photography), max ~30KB file size, no English text in the artwork (no hand-lettered words), mirror-symmetric or RTL-mirroring CSS-safe, placed as `<div className="hidden md:block">` above the headline, never on mobile.

---

### Mobile invariants per step

| Step | Mobile classes preserved (verify byte-equivalent at 375px) |
|---|---|
| All steps | Container wrap (line 90), step indicator block (lines 92-102), the `${animClass}` step transition, the existing `text-2xl` on h2 (the `md:text-3xl` bump is inert <768px), all spacing tokens |
| Step 1 | Age input `w-28 text-3xl py-3` (md:w-32 md:text-4xl is inert), `<div className="max-w-xs mx-auto">` around Next, Next CTA |
| Step 2 | Toggle `flex-1 max-w-[160px] py-6` (md:max-w-[200px] md:py-8 inert), gap-3 between toggles, ring-ipc-200/50 selected state, `<div className="space-y-3 max-w-xs mx-auto">` around Next + Back, Next CTA, Back pill (the `min-h-[40px]` → `min-h-[44px]` is +4px gain at all viewports — accepted correctness fix, NOT a regression) |
| Step 3 | Date input `ps-10 pe-4 py-3 text-base` (md:py-4 md:text-lg inert), Calendar icon position, timezone-row layout (line 234), 3-day preview card layout, Confirm & Start, Back pill (same +4px correctness fix) |
| Timezone picker BottomSheet (line 292) | Inherits Phase 6 BottomSheet primitive — Phase 7 makes NO BottomSheet changes |

Phase 7 introduces ZERO new mobile carve-outs. The 2 hit-target bumps on back-pills are the SAME pattern Phase 5 applied to NavLink — accepted correctness fixes per Boomer-safe override 1, not new design diffs.

---

## Summary Page Layout

**File:** `src/app/[locale]/summary/page.tsx` (328 lines)
**Container wrap (locked branch — lines 89-90):** `<Container variant="default" as="div" className="pt-4 pb-12 space-y-6">` — PRESERVE; do NOT widen to `wide`. Locked branch (lines 78-79): `<Container variant="default" as="div" className="pt-12 text-center">` — PRESERVE.

### Container variant decision — STAYS `default` (max-w-3xl)

**The decision the user's brief hints at:** "Phase 7 widens summary to `wide` for the metric grid." **Phase 7 does NOT do this.** Reason — codebase audit finding:

**The 5 IPC clinical metrics (24HV / NPi / AVV / MVV / NBC) are NOT rendered inline on the summary page.** Grep verified (`grep -rn "computeMetrics" src/`): the metrics are computed only by `src/lib/exportCsv.ts:42` and `src/lib/exportPdf/...` modules — for the CSV + PDF artifacts that the patient ships to the clinician. There is no in-page block of the 5 metrics that would benefit from a 5-up grid at lg+.

What summary/page.tsx DOES render in-page:
- Hero (CheckCircle2 + heroTitle + heroSubtitle + identityFrame + yoursFirst) — single column
- Effort stats grid (voidCount / drinkCount / daysComplete) — already `grid grid-cols-3 gap-2` (line 135)
- Top standout card (1 observation) — single column
- Top CTA (`<ExportActions pdfOnly shimmer />`) — single row, 1 button
- Data warning (conditional) — single column
- Story section (heading + body + 3 DrinkVoidTimeline cards) — single column stack
- Reflection prompt — single line
- Look-back section (heading + 3 DaySummaryCards) — single column stack
- "For your team" divider + IPC card + ExportActions (full — 2 buttons) — single column
- Coming-back card + Help link — single column

Every block is naturally single-column. Widening to `wide` (max-w-5xl = 1024px) would stretch each block to 1024px — the long-form prose ("storyBody," "comingBackBody") would become hard to read (research consensus: optimal line length 50-80ch ≈ 600-800px). And the 3 DaySummaryCards are intentionally vertically stacked per their "narrative review" intent. Per Design DNA axis 1's "generous whitespace BOUNDED by readable max-widths" principle — `default` is the right ceiling for a reading-and-export page.

**If a future iteration adds in-page IPC metric rendering** (e.g., user research shows patients want to glance at NPi before shipping the PDF), THAT iteration widens to `wide` for that section only — Phase 7's scope is the surfaces THAT EXIST today.

### H1 typography — LOCKED

**Line 114 — UPDATE:**

```diff
- <h1 className="text-2xl font-bold text-ipc-950 text-balance leading-tight px-4">
+ <h1 className="text-2xl md:text-4xl font-bold text-ipc-950 text-balance leading-tight px-4 md:px-0">
    {t('heroTitle')}
  </h1>
```

Two changes:
- `md:text-4xl` — 24px → 36px at md+. This is the **biggest typography bump in Phase 7** because the summary celebration is the moment the patient earns the visual congratulations (per Design DNA axis 1 + UX_PHILOSOPHY behavioral lever L1 "loss-aversion / sunk-cost framing — the user always sees what they have already invested"). The H1 must visually dominate.
- `md:px-0` — remove the `px-4` mobile gutter on the headline at md+. The Container's `px-4 sm:px-6` already provides the page-level horizontal frame; the extra `px-4` on the H1 was a mobile-specific reading-edge buffer that becomes redundant at md+ inside max-w-3xl.

**Why `md:text-4xl` not `md:text-5xl`:** the Container is `default` (max-w-3xl = 768px). A `text-5xl` (48px) headline at md+ inside 768px would feel marketing-loud at the wrong moment (the patient is reading their results, not landing on a homepage). `text-4xl` (36px) lands as confident-but-medical-restraint. Headline hierarchy on this page becomes:
- H1 = 36px (md+)
- Section H2s = 18px → 20px (md+) — see below
- Body = 14-16px

A 1.8× ratio between H1 and H2 reads as confident hierarchy without feeling shouty.

### Section H2 typography — `storyTitle` + `lookBackTitle` — LOCKED

**Line 221 — UPDATE:**

```diff
- <h2 className="text-lg font-bold text-ipc-950 text-balance mb-1.5">{t('storyTitle')}</h2>
+ <h2 className="text-lg md:text-xl font-bold text-ipc-950 text-balance mb-1.5">{t('storyTitle')}</h2>
```

**Line 253 — UPDATE:**

```diff
- <h2 className="text-lg font-bold text-ipc-950 text-balance mb-3">{t('lookBackTitle')}</h2>
+ <h2 className="text-lg md:text-xl font-bold text-ipc-950 text-balance mb-3">{t('lookBackTitle')}</h2>
```

Both bumps: `text-lg` (18px) → `md:text-xl` (20px). Small but matters for proportional hierarchy under a `md:text-4xl` H1. Phase 7 deliberately does NOT bump to `text-2xl` because that would compete with the section being SECTION-headings (subordinate to H1). 18 → 20 is the right small step.

**Locked branch — `diaryLocked` H2 (line 83):** NO CHANGE. This is the rare-path locked-state heading; it inherits `text-xl` already and the locked-branch UX is intentionally restrained (don't celebrate a state the patient doesn't yet have).

### 3-stat top grid (line 135) — LOCKED PRESERVE

**Decision: KEEP `grid grid-cols-3 gap-2` at all viewports.** No `md:` refinement to the grid columns.

Rationale:
- 3 columns at mobile is intentional density: the 3 small effort stats render comfortably side-by-side at 375px because each tile is `px-2 py-3 text-center` (compact). On a 1440px monitor inside max-w-3xl (768px), each tile is `(768 - 32 padding - 16 gap) / 3` ≈ 240px wide — visually generous without needing more columns.
- 3-up matches the 3 stats (it's NOT a 5-stat IPC metric grid that would benefit from 5-up at lg+ as the original brief assumed).
- Adding `md:gap-4` for more breathing would help slightly but is borderline; the existing `gap-2` is consistent with the rest of the page's `space-y-6` rhythm.

**Refinement (small): tile internal padding bump at md+.** Lines 138, 144, 150 — UPDATE each tile to widen padding at md+:

```diff
- <div className="rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 text-center">
+ <div className="rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 md:px-4 md:py-5 text-center">
```

Why: at md+ each tile has more horizontal room (240px wide vs ~115px at 375px). The `px-2 py-3` mobile padding starts to feel under-padded at the larger tile size. `md:px-4 md:py-5` provides proportional interior whitespace. Number typography (line 139) stays `text-2xl` at all widths — the stat is the small reward, not the summary headline. NO `md:` bump on the number — that would compete with the H1's `md:text-4xl`.

**Tile is FLAT — boundary enforcement (Design DNA axis 4):**
- Class string MUST remain `rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 md:px-4 md:py-5 text-center` — NOTHING else added.
- DO NOT add `shadow-xl`, `shadow-lg`, `shadow-md`, `shadow-sm`, `ring-1`, `ring-black/5`, `ring-ipc-*` — ALL forbidden.
- DO NOT add `hover:scale`, `hover:shadow`, `hover:bg-*`, `cursor-pointer` — tile is not clickable; hover-fancy lies about interactivity per Design DNA axis 5.
- This is the medical-rigor boundary — the data IS the content; elevation would compete with the data per axis 4. Locked.

### Top standout card (lines 166-184) — NO CHANGE

The Sparkles card is already `rounded-2xl bg-ipc-50 border border-ipc-100 p-4` (line 167). Same FLAT pattern as the effort tiles — preserved exactly. No md+ refinement needed.

### Top CTA — `<ExportActions pdfOnly shimmer />` (line 195) — INHERITS

See §"Export Actions" below — the hover/focus/wrap spec applies to BOTH instances of `<ExportActions>` (line 195 = top single-button form, line 292 = bottom full 2-button form).

### Data warning (lines 200-214) — NO CHANGE

Existing `rounded-2xl bg-amber-50 border border-amber-200 p-4` is appropriately differentiated (amber, not ipc) and inherits the FLAT pattern. Mobile + md+ identical.

### Story section + DrinkVoidTimeline (lines 217-228) — NO CHANGE

DrinkVoidTimeline.tsx is already responsive via the existing `rounded-2xl border border-ipc-100 bg-white p-4` card pattern (line 55 of DrinkVoidTimeline.tsx). The horizontal-strip metaphor (drinks above sink-line, voids below) renders identically at all widths — the dots are absolutely positioned using `insetInlineStart: ${positionPercent}%` (logical CSS, RTL-safe — verified line 78, 100). At md+ inside max-w-3xl the strip stretches wider but the visual continues to read correctly. NO Phase 7 changes.

### Observations section (line 237) — NO CHANGE

SummaryObservations.tsx already uses `rounded-2xl bg-ipc-50 border border-ipc-100 p-4` (line 29). Same FLAT pattern. NO Phase 7 changes.

### Look-back section + DaySummaryCard (lines 249-259) — NO CHANGE

DaySummaryCard.tsx uses `rounded-2xl bg-white border border-ipc-100 overflow-hidden` with a tinted `bg-ipc-50 border-b border-ipc-100` header band (lines 36-43). FLAT pattern, no elevation, no shadow. The internal `grid grid-cols-2 gap-4` for the fluid+void stat duo (line 48) renders comfortably at all widths — at 375px each stat row is ~165px wide, at md+ inside max-w-3xl each is ~360px wide. NO Phase 7 changes.

The DaySummaryCard footer link uses `ml-2` on line 41 — verified: that's `Card header date label spacing`, NOT a layout-critical margin that needs logical-CSS migration (the date inherits LTR/RTL via its parent `<h3>` block — no end-/start- needed for inline-block spacing where `ms-2` would behave identically). Phase 8 visual-qa may flag it; if so, planner converts `ml-2` → `ms-2` as a Phase 8 polish.

### Coming-back card (lines 303-312) — NO CHANGE

Same FLAT pattern.

### Help link (lines 315-325) — NO CHANGE

Button `variant="ghost"` already inherits the Phase 6 Button focus-visible migration. NO Phase 7 changes.

### Mobile invariants per summary section

| Section | Mobile classes preserved |
|---|---|
| Hero (lines 107-129) | All classes preserved; the `md:text-4xl md:px-0` H1 bump is inert <768px |
| 3-stat top grid (lines 134-158) | `grid grid-cols-3 gap-2` preserved; the `md:px-4 md:py-5` tile padding bump is inert <768px |
| Top-standout card (lines 165-184) | All classes preserved |
| Top CTA / bottom export | See §"Export Actions" — all hover + max-w changes are `md:`-prefixed and inert at mobile |
| Data warning (lines 199-214) | All classes preserved |
| Story / Observations / Look-back / Coming-back / Help | All preserved |
| Section H2s (lines 221, 253) | `text-lg` preserved; `md:text-xl` inert <768px |

---

## Export Actions

**File:** `src/components/export/ExportActions.tsx` (139 lines)
**Buttons in scope:** lines 109 (PDF, primary variant), 121 (CSV, secondary variant). Phase 7 adds hover affordance + responsive max-w wrap.

### Hover affordance spec (NEW per Design DNA axis 5; bounded by Boomer-safe overrides 2 + 3)

**The two Button calls (lines 109-118 PDF + 121-130 CSV) inherit the Button primitive's existing variant hover** (line 24 of Button.tsx: `primary` = `hover:bg-ipc-600`; line 25 of Button.tsx: `secondary` = `hover:bg-ipc-100`). Phase 7 layers an ADDITIONAL hover-lift via the `className` prop concatenation.

**For the PDF (primary) button (line 109):**

```diff
  <Button
    onClick={handlePdf}
    fullWidth
    variant="primary"
    disabled={!hasData || exporting === 'pdf'}
-   className={shimmer ? 'animate-cta-shimmer' : ''}
+   className={`${shimmer ? 'animate-cta-shimmer ' : ''}md:hover:-translate-y-px md:transition-all md:duration-150`}
  >
    <Icon size={20} />
    {exporting === 'pdf' ? t('generating') : pdfLabel}
  </Button>
```

**For the CSV (secondary) button (line 121):**

```diff
  <Button
    onClick={handleCsv}
    fullWidth
    variant="secondary"
    disabled={!hasData || exporting === 'csv'}
+   className="md:hover:-translate-y-px md:transition-all md:duration-150"
  >
    {shareSupported ? <Share2 size={20} /> : <FileSpreadsheet size={20} />}
    {exporting === 'csv' ? t('generating') : csvLabel}
  </Button>
```

**Why the `md:` prefix on every part:**
- `md:hover:-translate-y-px` — the 1px lift fires only at md+ (desktop). On mobile, touch input never triggers hover state anyway; the prefix is belt-and-suspenders insurance that the rule is gated to viewports where a mouse can hover.
- `md:transition-all md:duration-150` — the transition rule is also gated to md+. This means at mobile, the existing Button-primitive `transition-all` (Button.tsx:15) is the ONLY transition; no additional desktop-only transition class layers up on mobile.

**Why `-translate-y-px` not `hover:translate-y-[-1px]`:**
- Tailwind 4 ships `translate-y-px` as a token (= `transform: translateY(1px)`). The `-` prefix (`-translate-y-px`) is the negative — `transform: translateY(-1px)`. This is more idiomatic Tailwind than the arbitrary-value bracket notation and produces byte-identical CSS.
- The `hover:` modifier conjugates with the prefix correctly: `md:hover:-translate-y-px` = "at md+, on hover, translateY(-1px)".

**Why NO color shift to ipc-50 (deviating from CONTEXT spec):**
- The Button-primitive `primary` variant ALREADY hovers `bg-ipc-500 → bg-ipc-600` (a deeper amber, not lighter). Adding `hover:bg-ipc-50` on top would CONFLICT — Tailwind's last-class-wins resolution would have `ipc-50` (pale) defeat `ipc-600` (deep), which would visually un-fill the primary CTA on hover — wrong.
- The Button-primitive `secondary` variant ALREADY hovers `bg-ipc-50 → bg-ipc-100` (a deeper warm tint). Same logic — let the primitive's variant own the bg-color animation.
- The `translate-y-px` lift is the NEW signal Phase 7 layers; the bg-color shift is already in the primitive. Two complementary signals = obvious "I'm hovering on this clickable" without conflict.

**Why duration-150 not duration-200:**
- 150ms is the existing project convention (Phase 5 chrome, Phase 6 Button primitive). Staying at 150ms keeps motion budget consistent across the app.
- Under Boomer-safe override 3's 200ms cap. Comfortably so.

**Mobile invariant of hover spec:**
- All hover classes are `md:`-prefixed. At <768px the export buttons render identically to today (Button-primitive defaults only).
- Touch on mobile does NOT fire `:hover` in any modern browser — even without the `md:` prefix, mobile would be visually byte-equivalent. But the explicit prefix removes any edge case (e.g., a future device with both touch + hover).
- **Byte-equivalent at mobile.**

### Focus-visible spec — INHERITED from Button primitive

The Button primitive (line 16 of Button.tsx) already has:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2
```

Both export buttons inherit this. Phase 7 makes NO change to focus styles on export buttons. **NO additional `className` work needed for focus.**

### Responsive max-w wrap — LOCKED

The two `<ExportActions />` call sites in `summary/page.tsx` (line 195 = top single-PDF, line 292 = bottom dual-button) BOTH live inside `Container variant="default"` (max-w-3xl = 768px). At md+ on a 1440px monitor inside max-w-3xl, each `fullWidth` Button stretches to ~720px (768 − 48 padding). That's wider than necessary for a single-action click target — a more proportioned width is `md:max-w-2xl` (672px), centered.

**Add a wrapper inside ExportActions.tsx:**

Line 107 (the outer `<div className="space-y-3">`) — UPDATE:

```diff
- <div className="space-y-3">
+ <div className="space-y-3 md:max-w-2xl md:mx-auto">
    <Button ...>...</Button>
    {!pdfOnly && <Button ...>...</Button>}
    {!hasData && <p>...</p>}
  </div>
```

Effect:
- At mobile (<768px): `md:max-w-2xl md:mx-auto` is inert. Buttons stretch full Container width as today.
- At md+ inside max-w-3xl: the outer ExportActions wrapper caps at 672px (`max-w-2xl`) and centers itself. Each `fullWidth` Button inside it now stretches to 672px instead of 720px. Subtle but visually settling.
- The "no data yet" empty-state message (line 132) also gets centered inside the same max-w-2xl wrap — consistent positioning.

**Why max-w-2xl not max-w-xl (~576px):**
- The PDF + CSV button each contain icon + multi-word label text ("Send PDF to your healthcare team" can be ~30 chars). At max-w-xl (576px) the long-translation locales (PT, AR — both add ~20-30% length) could wrap or visually crowd. At max-w-2xl (672px) the label fits with comfortable padding.
- 672px also matches the `narrow` Container variant Phase 5 locked — consistency with the design system.

**Mobile invariant of wrap:** `md:`-prefixed, inert below 768px. Byte-equivalent.

### Hit-target verification

- PDF Button (line 109): Button `size="lg"` default → `min-h-[52px]`. ABOVE 44px floor. PASS.
- CSV Button (line 121): same.
- No icon-only buttons (both have visible text labels per Boomer-safe override 5 — verified). PASS.

### data-testid preservation

`grep -rn "data-testid" src/components/export/` returns ZERO results. ExportActions has NO testids. **Nothing to preserve.** The e2e walkthrough spec uses `getByRole('button', { name: labels.exportSavePdf(locale) })` — accessible-text based selector, which the Phase 7 className change does not affect.

### Mobile invariants for ExportActions

| Element | Mobile preserved |
|---|---|
| Outer `<div className="space-y-3">` | Class preserved; `md:max-w-2xl md:mx-auto` is inert at mobile |
| PDF Button | Button primitive (variant="primary", size="lg") unchanged; new `md:hover:-translate-y-px md:transition-all md:duration-150` is inert at mobile |
| CSV Button | Same Button primitive; same inert-at-mobile class additions |
| "no data" empty state | NO CHANGE |
| shimmer animation `animate-cta-shimmer` | Preserved unchanged — fires at all viewports per existing intent |
| All conditional rendering (pdfOnly, hasData, shareSupported branches) | NO LOGIC CHANGES — Phase 7 is style-only |

---

## DaySummaryCard

**File:** `src/components/export/DaySummaryCard.tsx` (121 lines)

**Phase 7 changes: NONE.** Component is already responsive-correct:
- Card wrapper `rounded-2xl bg-white border border-ipc-100 overflow-hidden` (line 36) — FLAT per axis 4, no shadow.
- Internal `grid grid-cols-2 gap-4` for fluid+void stats (line 48) — works at all widths inside max-w-3xl summary Container.
- `flex flex-wrap` on the sub-stats row (line 79) — already accommodates long-translation locales via wrap.
- Footer link (lines 112-118) inherits Phase 5/6 focus-visible via the Next.js `<Link>` from `@/i18n/navigation` — preserved.

**One Phase 8 candidate flagged (not Phase 7 scope):** line 41 uses `ml-2` (physical CSS) on the date label inside the H3. In RTL Arabic this would be ml-2 (visual-LEFT margin), which is wrong — should be `ms-2` (inline-start, which is visual-RIGHT in RTL). The visual delta is small (the date label sits 8px in the wrong direction in Arabic), but it's the kind of physical-CSS leak Phase 8's visual-qa catches. Phase 7 does NOT fix this (per scope: Phase 7 is desktop-layout polish; Phase 8 is RTL physical-CSS audit).

---

## DrinkVoidTimeline + SummaryObservations

**Files:**
- `src/components/summary/DrinkVoidTimeline.tsx` (112 lines)
- `src/components/summary/SummaryObservations.tsx` (58 lines)

**Phase 7 changes: NONE for both.**

DrinkVoidTimeline uses `insetInlineStart` (logical CSS, line 78 + line 100) — RTL-safe. The horizontal strip metaphor scales correctly inside max-w-3xl. NO Phase 7 changes.

SummaryObservations uses `rounded-2xl bg-ipc-50 border border-ipc-100 p-4` (line 29) — FLAT per axis 4. The `<ul>` list of observation lines renders correctly at all widths. NO Phase 7 changes.

---

## Mobile Invariants Summary (DO NOT REGRESS)

Phase 7 introduces ZERO new mobile carve-outs beyond the two locked by Phase 5 (Arabic FAB `end-5`, +8px `sm:px-6` at 640-767px on diary/layout + summary/page).

### Per-surface mobile-invariant matrix

Verify each surface at the following widths in EN + AR:

| Width | Surface | Expected diff |
|---|---|---|
| 375px (iPhone SE baseline) | OnboardingFlow (all 3 steps) | NO diff vs pre-phase. Headlines render `text-2xl` (24px). Age input `w-28 text-3xl`. Toggle `max-w-[160px] py-6`. Date input `py-3 text-base`. Back-pill buttons render at `min-h-[44px]` (was `min-h-[40px]`) — +4px hit-target correctness fix, equivalent to Phase 5 NavLink. |
| 375px | Summary page | NO diff vs pre-phase. H1 renders `text-2xl`. 3-stat tiles render `px-2 py-3`. Section H2s render `text-lg`. Export buttons render at their existing Button-primitive size. |
| 375px | ExportActions | NO diff. The `md:max-w-2xl md:mx-auto` wrap is inert. The `md:hover:-translate-y-px md:transition-all md:duration-150` is inert (and hover doesn't fire on touch). |
| 414px (iPhone Plus) | All Phase 7 surfaces | Same as 375px — byte-equivalent. |
| 640-767px (small tablets, Pixel Fold edge) | All Phase 7 surfaces | Same +8px `sm:px-6` padding shift already locked by Phase 5 (inherited via Container `default`/`narrow`). NO additional Phase 7 carve-out. |
| 768px (`md` activates) | All Phase 7 surfaces | Phase 7 NEW classes activate: H1 → text-4xl, section H2s → text-xl, onboarding h2s → text-3xl, age input → w-32 text-4xl, unit toggle → max-w-[200px] py-8, date input → py-4 text-lg, 3-stat tiles → px-4 py-5, export buttons → hover-lift + max-w-2xl wrap. |

### Cross-references to Phase 5+6 carve-outs

- Arabic FAB `end-5` (Phase 5): Phase 7 surfaces do NOT contain the FAB. Inherited via AppShell.
- `sm:px-6` shift at 640-767px (Phase 5): Inherited via Container `narrow`/`default`. Phase 7 surfaces ride along.
- BottomSheet close X `end-2.5` (Phase 6): the timezone picker BottomSheet in OnboardingFlow line 292 inherits the Phase 6 modal transformation + the `end-2.5` close X positioning. Phase 7 makes NO BottomSheet changes.
- Button focus-visible migration (Phase 6): inherited by the Next CTA on every onboarding step + by ExportActions buttons + by Help button at bottom of summary.

---

## i18n + RTL Contract

### New i18n keys introduced by Phase 7

**ZERO.** Phase 7 introduces NO new user-facing strings.

All copy in scope is already in `messages/<locale>.json`:
- `onboarding.ageTitle / ageSubtitle / agePlaceholder` (existing)
- `onboarding.unitTitle / unitSubtitle` (existing)
- `onboarding.dateTitle / dateSubtitle / timezoneChange / timezonePickerTitle / trackingPeriodLabel` (existing)
- `onboarding.confirmAndStart` (existing)
- `common.stepOf / next / back / millilitres / fluidOunces` (existing)
- `summary.*` 47 keys (all existing)
- `export.*` 8 keys (all existing)

**No `i18n-sync` PostToolUse hook fires from Phase 7 work.** The 6 locale files remain at parity automatically.

### Logical CSS verification (RTL-safe per CLAUDE.md + project_i18n_six_locales.md)

Every NEW or MIGRATED class string in this UI-SPEC was audited for physical CSS:

| Class | Logical? | Notes |
|---|---|---|
| `md:text-3xl` / `md:text-4xl` / `md:text-xl` | YES | Typography only, direction-neutral |
| `md:w-32` / `md:max-w-[200px]` / `md:max-w-2xl` | YES | Width tokens, direction-neutral |
| `md:py-4` / `md:py-5` / `md:py-8` / `md:px-4` | YES | `py-*` / `px-*` are logical-equivalent in Tailwind 4 |
| `md:mx-auto` | YES | `mx-*` is logical (margin-inline-*) in modern Tailwind |
| `min-h-[44px]` | YES | Vertical, direction-neutral |
| `md:hover:-translate-y-px` / `md:transition-all md:duration-150` | YES | Transform on Y axis, direction-neutral |
| `focus-visible:ring-offset-white` / `focus-visible:ring-offset-surface` | YES | Color-only |
| `md:px-0` (on H1 line 114) | YES | `px-*` is logical |

**ZERO physical CSS introduced by Phase 7.** Verifier grep guard: `grep -rnE "(^|[^a-z])(ml-|mr-|pl-|pr-|left-|right-)" src/components/onboarding/OnboardingFlow.tsx src/app/\[locale\]/summary/page.tsx src/components/export/ExportActions.tsx` MUST return ZERO new matches added by Phase 7 (the existing `ml-2` in DaySummaryCard.tsx line 41 is pre-existing and out of Phase 7 scope per §"DaySummaryCard").

### Long-translation locale verification (PT + FR — text-dense)

**Onboarding headlines at md+ (`text-3xl` = 30px) inside Container narrow (max-w-2xl = 672px):**
- EN `t('ageTitle')`: "Tell us your age" (16 chars) — fits trivially
- FR `t('ageTitle')`: "Indiquez votre âge" (~18 chars) — fits
- ES `t('ageTitle')`: "Dinos tu edad" (13 chars) — fits
- PT `t('ageTitle')`: "Diga-nos a sua idade" (~20 chars) — fits
- ZH / AR — shorter or comparable

At `text-3xl` (30px), each character is ~18px wide → 20 chars = ~360px → well inside max-w-2xl (672px) with comfortable margin.

Step 2 / Step 3 headlines: similar length analysis. PASS.

**Summary H1 at md+ (`text-4xl` = 36px) inside Container default (max-w-3xl = 768px):**
- EN `t('heroTitle')`: "Three days, captured." or similar (~22 chars) — fits trivially
- PT / FR / AR longer variants likely 25-30 chars — still inside max-w-3xl at text-4xl. PASS.

If Phase 8 visual-qa surfaces actual overflow (e.g. an unforeseen PT translation that runs to 50+ chars and wraps awkwardly), the fix is to add `text-balance` (already on line 114) + verify the overflow at the actual rendered length. NO Phase 7 prescriptive fix needed; defer to Phase 8.

### ZH / AR font-fallback considerations

The Phase 7 typography bumps use ONLY the existing `font-bold` weight + the existing Inter font-stack (declared in globals.css `@theme inline`). Inter has Latin coverage; CJK + Arabic fall back to OS-native fonts (per the existing fallback stack). NO new font-family introductions in Phase 7. Phase 8 visual-qa is the gate that catches glyph-fallback issues; design with the awareness that ZH at `text-3xl` will render in the OS's preferred CJK fallback (likely PingFang SC on macOS, Noto Sans CJK on Linux) — Inter doesn't ship CJK glyphs.

### RTL safety on the 3-stat grid

`grid grid-cols-3 gap-2` is direction-neutral (CSS Grid auto-flows in `dir`-aware row order). In RTL Arabic the 3 tiles render right-to-left in source order: voidCount (1st) on the right, drinkCount (2nd) middle, daysComplete (3rd) on the left. This matches Arabic reading order. PASS.

The `md:px-4 md:py-5` tile padding bump is direction-neutral (vertical + logical-padding). PASS.

---

## Accessibility (Phase 7 scope)

### Heading hierarchy

- **Onboarding:** Each step renders ONE `<h2>` (lines 107, 149, 210) — no H1 on the onboarding page (correct: the page is a step in a flow, the AppShell does not impose an H1 either). The H2s are wayfinding labels for the step itself, not a page-level heading. Phase 7 does NOT add an H1 — the existing structure is intentional.
- **Summary:** ONE `<h1>` (line 114) at the hero. Two `<h2>`s for sections (storyTitle line 221, lookBackTitle line 253). Locked-state branch (line 83) renders `<h2>` for `diaryLocked` — this is correct because the locked state is itself a state-level subhead, not a page H1. The Hero state is the canonical page H1.

**Heading sequence verification (semantic):**
- Summary: `H1 (hero) → H2 (storyTitle) → H3 (DaySummaryCard date — line 39: "Day 1 Sunday Jan 12")` — sequential, no level skips.
- The `<h3>` inside DaySummaryCard already exists; Phase 7 does NOT touch it.

### Focus-ring visibility audit (Phase 7 scope)

The `focus-visible:` migrations on:
- Age input (line 125): ring `ipc-500` on `white` offset — AA contrast verified Phase 5/6
- Date input (line 227): same pair
- Back-pill buttons (lines 196, 279): ring `ipc-500` on `surface` offset — AA contrast verified Phase 5
- Unit toggle buttons (lines 160, 173): NEW `focus-visible:ring-ipc-500 ring-offset-surface` — same pair, AA-verified

All 5 ring colors use the same `ring-ipc-500` Phase 5 locked, which is AA-compliant against both `bg-surface` (5.4:1) and `bg-white` (5.6:1). PASS.

### aria-label / aria-current

- The `<input type="number">` age input gets implicit accessible name from `placeholder` + visible label flow; the `<input type="date">` similar. NO Phase 7 `aria-label` additions needed.
- Export buttons have visible text labels (`pdfLabel`, `csvLabel`) per Boomer-safe override 5 — verified line 117, 128. NO `aria-label` needed.
- The 3 effort-stat tiles have visible numeric content + text label — no aria affordance needed for read-only display.
- Onboarding back-pill buttons have visible text (`{tc('back')}`) — accessible name automatically present.

### Browser zoom resilience

Phase 7 design with awareness:
- All typography sizes use Tailwind tokens (`text-2xl`, `text-3xl`, `md:text-4xl`) which use `rem` units under the hood — they scale proportionally with browser zoom 100/150/200%.
- All max-width tokens (`max-w-xs`, `max-w-2xl`, `max-w-3xl`) use `rem` units — scale with zoom.
- All hit targets (`min-h-[44px]`, `min-h-[52px]`) use absolute `px`. At 150% zoom these become effective 66px / 78px (the browser scales the layout, including pixel values). PASS — still above the floor.
- No absolute viewport-pixel positioning introduced by Phase 7.

Phase 8 visual-qa is the gate for actual zoom verification. Phase 7 design choices do not preclude passing.

### Keyboard navigation (DTUX-04 deliverable)

Per §"Shared step chrome" → "Keyboard contract":
- Enter advances each onboarding step (when valid). Verified Phase 7 spec.
- Escape on the timezone picker BottomSheet closes the sheet (inherited from Phase 6 BottomSheet).
- Tab order is logical per natural DOM order (verified §"Tab order per step").
- Initial focus on Step 1 is the age input via existing `autoFocus` (line 128). Steps 2 + 3 do NOT have `autoFocus` — they inherit the previous step's last-focused element OR the page body. Phase 7 decision: do NOT add autoFocus to step 2/3 (would surprise the user; the step-transition animation `${animClass}` is the affordance; explicit Enter to advance keeps user-in-control per UX_PHILOSOPHY §6 "never steal control"). The user must Tab into the first interactive of step 2/3.

---

## 6-Pillar Pre-Check for Phase 8

This subsection summarizes what Phase 7 LOCKS that Phase 8's `visual-qa` skill will audit across 6 locales × LTR/RTL × md/lg/xl.

### 1. Typography

Phase 7 locks: H2 on onboarding bumps `text-2xl → md:text-3xl`. H1 on summary bumps `text-2xl → md:text-4xl`. Section H2s on summary bump `text-lg → md:text-xl`. Age input bumps `text-3xl → md:text-4xl`. Date input bumps `text-base → md:text-lg`. NOTHING bumped on mobile.

Phase 8 audits: render at 6 locales × LTR/RTL × md(768) / lg(1024) / xl(1440) and verify (a) headlines fit without overflow in long-translation locales (PT, AR), (b) Inter font falls back correctly to CJK fonts for ZH and to Arabic-native fonts for AR, (c) `text-balance` doesn't produce awkward line breaks at the new sizes, (d) line-height is comfortable (no clipping or visual stacking).

### 2. Color

Phase 7 introduces ZERO new colors. All hover-state class additions (export buttons `md:hover:-translate-y-px`) layer on the Button-primitive's existing `hover:bg-ipc-600` (primary) / `hover:bg-ipc-100` (secondary) without conflict. Effort-stat tiles stay FLAT with the existing `bg-ipc-50 border-ipc-100` per axis 4.

Phase 8 audits: (a) ring-ipc-500 focus rings remain AA-contrast on all backgrounds where they appear (white inputs, ipc-50 cards, surface body), (b) export-button hover color shift (handled by Button primitive) remains AA on the deeper bg fill, (c) no accidental new colors slipped in via Tailwind 4's arbitrary-value classes.

### 3. Spacing

Phase 7 introduces NEW spacing only via `md:` prefixed bumps:
- Onboarding age input `md:w-32`, unit toggle `md:max-w-[200px] md:py-8`, date input `md:py-4 md:text-lg`
- Summary 3-stat tiles `md:px-4 md:py-5`
- Export wrap `md:max-w-2xl md:mx-auto`
- 2 back-pill buttons bumped `min-h-[40px]` → `min-h-[44px]` (correctness fix, both viewports)

All on Tailwind's 4px grid except `max-w-[200px]` (200px = 50× 4) and `max-w-2xl` (672px = built-in token). PASS.

Phase 8 audits: vertical rhythm consistency on summary stack (`space-y-6` between sections preserved); onboarding step transition animations don't introduce vertical hop; new padding inside 3-stat tiles doesn't create off-grid offsets.

### 4. Hierarchy

Phase 7 locks the visual hierarchy on the summary page:
- H1 (text-2xl mobile / text-4xl md+) = strongest, hero celebration
- H2 (text-lg mobile / text-xl md+) = section headings, subordinate to H1
- Body (text-sm to text-base) = paragraph content
- Effort-stat numbers (text-2xl flat) = NOT bumped at md+ deliberately, so they don't compete with H1 at the same viewport

Onboarding hierarchy:
- H2 (text-2xl mobile / text-3xl md+) = step headline
- Age input number (text-3xl mobile / text-4xl md+) = the affordance display
- Subtitle (text-sm) = helper text (NOT bumped — restraint)

Phase 8 audits: visual hierarchy holds — H1 visibly dominates section H2s; the effort-stat numbers don't outweigh the H1 in attention; the onboarding age-input number remains the cleanest tap target visually.

### 5. Interaction

Phase 7 locks:
- Hover-lift `md:hover:-translate-y-px md:transition-all md:duration-150` on the 2 export buttons (NEW pattern, capped per Boomer-safe override 2 + 3)
- Hover bg-shift on export buttons (inherited from Button primitive variants)
- Enter advances each onboarding step (NEW per DTUX-04)
- Tab order natural top-to-bottom (preserved)
- Focus-visible rings on inputs + back-pills + unit toggles (NEW migration)
- Touch + click affordances (`active:scale-[0.97]`) preserved (existing)

Phase 8 audits: hover doesn't fire on touch devices; Enter doesn't accidentally submit textareas (none on onboarding, but defensive guard preserved); focus rings remain visible at all viewports and don't get clipped by parent overflow; no NEW novel interaction patterns sneaked in (no swipe / hover-reveal / auto-advance).

### 6. Accessibility

Phase 7 locks:
- Heading sequence H1 → H2 → H3 on summary (preserved); no H1 on onboarding (intentional per CONTEXT)
- `focus-visible:` migration on age input + date input + unit toggles + back-pill buttons
- Hit-target bump `min-h-[40px]` → `min-h-[44px]` on the 2 back-pill buttons (Boomer-safe override 1 correctness fix)
- All export buttons have visible text labels (Boomer-safe override 5 compliance)
- All NEW classes use logical CSS (no `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` introduced)
- Container narrow + default geometry preserved (RTL-safe — direction-neutral)

Phase 8 audits: (a) browser zoom at 100/150/200% — layout doesn't break, hit targets remain ≥44px effective, (b) RTL Arabic — physical CSS not introduced, `insetInlineStart` continues to position drink/void dots correctly, locale switcher dropdown still right-aligned via `end-0`, (c) screen-reader walkthrough — heading sequence reads top-to-bottom without level skips, focus order matches DOM order, (d) AA contrast on all focus rings + hover states.

---

## Open Questions / Claude's Discretion

These are deferred to the planner's discretion or to Phase 8 visual-qa. The UI-SPEC takes a clear default position on each.

### Q1 — Onboarding H2 typography: `md:text-3xl` (locked default) vs `md:text-4xl`?

**Default locked:** `md:text-3xl` (30px). Rationale per §"Shared step chrome → Headline typography bump."

**Reconsider if:** Phase 8 visual-qa renders at 1440px and the step headlines visually feel under-confident in the wider Container. The fallback bump is `md:text-3xl lg:text-4xl` (30px at md, 36px at lg+). Planner can apply this Phase 8 remediation without re-engaging UI-SPEC.

### Q2 — Locale-safe illustration on onboarding?

**Default locked:** NO illustration. Rationale per §"Locale-safe illustration decision — DEFER."

**Reconsider if:** User research after Phase 7 ships indicates "step 1 still feels empty at desktop." That's a future-iteration decision, not a Phase 7 blocker.

### Q3 — Summary Container variant: `default` (locked) vs `wide`?

**Default locked:** `default` (max-w-3xl). Rationale per §"Summary Page Layout → Container variant decision."

**Reconsider if:** A future iteration adds in-page rendering of the 5 IPC clinical metrics (24HV/NPi/AVV/MVV/NBC). Phase 7's scope is surfaces that exist; adding new in-page rendering is OUT.

### Q4 — Timezone-change pill hit target?

**Default locked:** NO CHANGE this phase (defer to Phase 8 visual-qa).

**Reconsider if:** Phase 8 flags it. The Boomer-safe override 1 floor is 44px; the current pill is ~28px. The judgment call is that it's a secondary "I want to change a default" affordance on a step where the primary tap targets (date input, Confirm & Start, Back) are all ≥44px. UI-SPEC defers to Phase 8 to escalate.

### Q5 — Tile padding bump at md+ on 3-stat grid?

**Default locked:** `md:px-4 md:py-5` per §"3-stat top grid → Refinement."

**Reconsider if:** the tile content (small number + small UPPERCASE label) looks lost in the larger padded tile at md+ inside max-w-3xl. The fallback is to revert to `px-2 py-3` at all widths. Planner can apply this Phase 8 remediation.

---

## Verification Checklist (for Phase 8)

For each Phase 7 surface, Phase 8's `visual-qa` skill MUST verify:

### OnboardingFlow.tsx
- [ ] At 375px in all 6 locales: render byte-equivalent to pre-Phase-7 (the 2 back-pill `min-h-[44px]` bumps are the ONLY accepted diff, equivalent to Phase 5 NavLink correctness fix)
- [ ] At 768px (md activates) in EN: H2 renders `md:text-3xl` (30px); age input renders `md:w-32 md:text-4xl`; unit toggle renders `md:max-w-[200px] md:py-8`; date input renders `md:py-4 md:text-lg`
- [ ] At 1440px in PT + FR + AR: headlines fit inside max-w-2xl without overflow; no text clipping
- [ ] At 1440px in AR: step transition animations don't introduce RTL physical-CSS leak
- [ ] Keyboard walkthrough at 1440px EN: Enter advances each step; Tab order is logical; focus rings visible on age input, unit toggle, date input, back pills
- [ ] Browser zoom 100/150/200% at 1440px EN: layout doesn't break; back pills remain ≥44px effective

### summary/page.tsx
- [ ] At 375px in all 6 locales: render byte-equivalent to pre-Phase-7
- [ ] At 768px in EN: H1 renders `md:text-4xl`; storyTitle + lookBackTitle render `md:text-xl`; 3-stat tiles render `md:px-4 md:py-5`
- [ ] At 1440px in PT + FR + AR: H1 fits inside max-w-3xl without overflow; section H2s fit
- [ ] At 1440px in AR: 3-stat grid renders right-to-left in source order (voidCount on right, daysComplete on left); ipc-50 tile backgrounds correct; FLAT (no shadow leaked in)
- [ ] At 1440px in ZH: H1 + section H2s render correctly with CJK font fallback (no tofu glyphs)
- [ ] Effort-stat tiles + top-standout card + observations card + day-summary cards + coming-back card ALL render FLAT (no shadow / no ring elevation)
- [ ] Browser zoom 100/150/200% at 1440px EN: layout doesn't break; reading column remains comfortable

### ExportActions.tsx (rendered inside summary/page.tsx at lines 195 + 292)
- [ ] At 375px in all 6 locales: byte-equivalent to pre-Phase-7
- [ ] At 768px in EN: outer wrap renders `md:max-w-2xl md:mx-auto` (visually centered, capped at 672px)
- [ ] At 1440px in EN: PDF + CSV buttons centered inside max-w-2xl wrap
- [ ] Desktop mouse hover at 1440px EN: button lifts 1px (`-translate-y-px`); bg-color shifts per Button primitive variant; transition duration ≤200ms (capped at 150ms)
- [ ] Touch tap at 1440px EN (devtools touch emulation): no hover state lingers; only `active:scale-[0.97]` fires
- [ ] At 1440px in PT + FR + AR: button labels fit; no wrap; long-translation copy fits inside max-w-2xl wrap

### Cross-surface
- [ ] `grep -rnE "(^|[^a-z])(ml-|mr-|pl-|pr-|left-|right-)" src/components/onboarding/OnboardingFlow.tsx src/app/\[locale\]/summary/page.tsx src/components/export/ExportActions.tsx` returns ZERO new physical-CSS matches added by Phase 7 (pre-existing `ml-2` in DaySummaryCard.tsx line 41 is OUT of Phase 7 scope — flagged for Phase 8 fix)
- [ ] `grep -rn "shadow-xl\|shadow-lg\|shadow-md\|ring-1 ring-black" src/app/\[locale\]/summary/page.tsx src/components/summary/ src/components/export/DaySummaryCard.tsx` returns ZERO matches — FLAT tile boundary preserved (Design DNA axis 4)
- [ ] `grep -rn "data-testid" src/components/onboarding/ src/app/\[locale\]/summary/ src/components/summary/ src/components/export/` returns ZERO matches (verified: none exist; nothing to preserve)
- [ ] Daily 6-locale walkthrough on myflowcheck.com passes after Phase 7 ships; no new findings in `walkthrough_findings.md`
- [ ] Mobile screenshot diff at 375px in all 6 locales vs pre-Phase-7 baseline: ZERO visible diff EXCEPT the 2 back-pill height +4px on onboarding steps 2 + 3 (accepted correctness fix)

---

*Phase: 07-onboarding-summary-surfaces*
*UI-SPEC authored: 2026-05-16 (inline; references 05-CONTEXT.md as canonical design framework + 05-UI-SPEC.md design tokens + 06-UI-SPEC.md Button focus-visible migration + 07-CONTEXT.md Phase 7 specific decisions)*
