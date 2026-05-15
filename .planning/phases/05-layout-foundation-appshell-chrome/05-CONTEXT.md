# Phase 5: Layout foundation + AppShell chrome — Context

**Gathered:** 2026-05-14
**Status:** Ready for UI-SPEC + planning
**Source:** Direct from user brief on `/gsd-plan-phase` invocation + scoping AskUserQuestion answers (no full `/gsd-discuss-phase` run; the brief was concrete enough to skip).

<domain>
## Phase Boundary

This phase establishes the **shared layout primitives + AppShell desktop chrome** that the rest of the Desktop & Tablet UX milestone (Phases 6–8) consumes. It is the foundation phase: by itself it does not redesign individual forms or per-page surfaces. It produces:

1. A shared container/layout primitive (component or hook + class set) that consolidates the duplicated `max-w-lg md:max-w-xl mx-auto w-full px-6` pattern currently scattered across `LandingContent.tsx`, `OnboardingFlow.tsx`, `Day1Celebration.tsx`, and the diary layout.
2. A documented set of breakpoint + max-width tokens (mobile, tablet/`md`, desktop/`lg`, wide/`xl`) that downstream phases can reference instead of inventing.
3. AppShell desktop chrome:
   - BottomNav becomes a top-bar nav at `md`+ (Home / Track / Diary inline in or near the Header)
   - QuickLogFAB repositions or anchors to content at `md`+ (no longer floating in viewport bottom-right)
   - Header expands to use available width with proper internal max-width
   - Footer gets desktop-appropriate padding

This phase does NOT touch:
- Bottom-sheet form internals (Phase 6 owns `Log*Form.tsx` / `Set*Form.tsx`)
- Keyboard navigation (Phase 6 owns Enter/Escape/Tab handlers)
- Onboarding step composition (Phase 7)
- Summary page metric grid (Phase 7)
- Cross-locale visual QA fixes (Phase 8 catches the long tail)

The boundary is deliberate: foundation lands first, then form-by-form work consumes it.

</domain>

<decisions>
## Implementation Decisions

### Roadmap framing
- **Locked:** Desktop & Tablet UX is a NEW milestone (Milestone 2), not an extension of Stabilization. Phases 5–8 numbered monotonically from existing 1–4 (no per-milestone reset) so existing tooling, `padded_phase` directory naming, and STATE.md tracking stay consistent.
- **Locked:** Tablet shares the desktop layout — no distinct tablet breakpoint. Single "desktop" layout that activates from ~768px upward.
- **Locked:** Out of scope for Phase 5 — bottom-sheet form internals, per-page redesigns, keyboard navigation. Those are Phases 6–7.

### Surfaces in scope (this phase)
- AppShell chrome: `src/components/layout/AppShell.tsx`, `Header.tsx`, `BottomNav.tsx`, `Footer.tsx`
- Floating FAB: `src/components/diary/QuickLogFAB.tsx` (positioning behavior, not the FAB itself)
- Shared container/layout primitive: NEW component(s) under `src/components/ui/` or `src/components/layout/` (planner decides exact location)
- Diary layout: `src/app/[locale]/diary/layout.tsx` (currently `max-w-xl mx-auto w-full px-4 pt-4` — adopts new container primitive)
- Landing layout: `src/app/[locale]/LandingContent.tsx` (adopts new container primitive)

### Breakpoint strategy
- **Locked:** Use Tailwind 4's default breakpoint token names where possible: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px).
- **Locked:** "Desktop layout activates" = at `md` (768px) and up. Below `md` is mobile, unchanged.
- **Claude's Discretion:** Whether to add a custom breakpoint (e.g., `tablet-portrait` at 700px) if the planner finds 768px too aggressive. Default is no — keep the breakpoint set Tailwind-native.

### Container max-width strategy
- **Locked:** A small, named set of max-width tokens that downstream phases reference — not arbitrary `max-w-*` calls scattered through components.
- **Discretion / UI-SPEC will lock:** Exact token names + values. Likely shape:
  - `narrow` ~ `max-w-2xl` (~672px) — for single-column form content, slider rows, onboarding inputs
  - `default` ~ `max-w-3xl` (~768px) — for button grids in form sheets, day timeline content
  - `wide` ~ `max-w-5xl` (~1024px) — for summary metric grids, learn pages (already in use)
  - `full` — chrome rows (header/footer/top-bar nav) span available width with their own internal padding

### AppShell chrome behavior at `md`+
- **Locked:** BottomNav (mobile bottom-tab bar) is hidden at `md`+. Below `md` it's unchanged.
- **Locked:** Top-bar navigation appears at `md`+. It hosts Home / Track / Diary links inline. Exact placement (inside the Header vs. a new `<TopNav>` band beneath the Header) is for UI-SPEC to decide.
- **Locked:** QuickLogFAB no longer floats in the viewport bottom-right corner at `md`+. Two possible patterns; UI-SPEC picks one:
  - Pattern A: FAB repositions to bottom-right of the content column (still floating but anchored to content max-width, not viewport).
  - Pattern B: FAB is replaced by an inline anchored "Log event" button (with the same `+` icon, same color) positioned next to the day timeline content.
- **Locked:** Header expands at `md`+ — currently the logo + locale switcher + Learn link sit in a tight mobile-density row. At `md`+ they get desktop spacing and the top-bar nav joins them.

### Mobile invariants
- **Locked (HARD CONSTRAINT — explicitly reinforced by user 2026-05-15):** No visual regression at < 768px. Mobile chrome (BottomNav at viewport bottom, FAB in bottom-right, mobile Header density) is unchanged. The user's exact words: "keep the mobile as is cause it is working very well right now". Daily walkthrough must continue to pass. Mobile is the production-tested surface; do NOT touch its visual rhythm under any circumstances during Phases 5–8.
- **Locked:** Mobile screenshot diffs at 375px (iPhone-baseline) must show NO change as a pass criterion. The single documented exception is the QuickLogFAB `right-5 → end-5` RTL correctness fix (in Arabic the FAB now correctly sits on the inline-end / left side — this is a CORRECTNESS fix that was already failing per UI-SPEC §"Mobile invariants" point 2; in the 5 LTR locales `end-5` resolves to `right:20px` so they are byte-equivalent).
- **Locked:** Every plan that modifies a chrome file (AppShell, Header, BottomNav, Footer, FAB) MUST include an acceptance criterion verifying mobile (< 768px) behavior is unchanged via either an inline grep guard or a Playwright screenshot diff.

### SEO invariants (added 2026-05-15 per user constraint: "all of this still needs to be SEO optimized")
- **Locked:** Phase 5 chrome work MUST NOT regress any of the production SEO surface. Specifically, the static-export `out/` after `npm run build` must continue to contain, for EVERY locale's `index.html` (en at bare path, fr/es/pt/zh/ar at prefixed paths):
  - At least 1 `<link rel="canonical" ...>` tag
  - At least 6 `<link rel="alternate" hreflang="..." ...>` tags (5 sibling locales + x-default)
  - At least 1 `<h1 ...>` tag (the page H1 — must NOT be removed by Container wrapping)
  - At least 1 `<script type="application/ld+json" ...>` block (JSON-LD structured data)
- **Locked:** Top-bar nav links added by Plan 05-04 MUST be real anchors (`<a href="...">` via `<Link>` from `@/i18n/navigation`), NOT `<button onClick>` patterns. Search engine crawlers ignore button-clicks; real `href` links populate the internal-link graph and improve crawl coverage.
- **Locked:** Container is server-component-safe (no `'use client'`, no hooks) per Plan 05-01 — this preserves SSG output, zero added JS payload for layout, and protects Lighthouse / Core Web Vitals scores.
- **Locked:** No new Cumulative Layout Shift (CLS) — `md:` responsive class changes apply at initial render (no post-hydration shift). New chrome (top-bar nav) renders server-side via SSG (Header is `'use client'` but pre-rendered).
- **Locked:** Phase 5 does NOT touch any of: `src/app/[locale]/sitemap.ts`, `src/app/[locale]/robots.ts`, `src/components/seo/*`, `generateMetadata()` calls, or any JSON-LD generation. These are NOT in `files_modified` for any Phase 5 plan.
- **Locked:** Mobile-first indexing (Google's primary crawl mode) sees the mobile rendering. Since mobile is preserved unchanged (per the mobile invariant above), mobile SEO surface is unaffected.
- **Locked:** Plan 05-07's Step 3.5 SEO regression check is the gate — Phase 5 does NOT pass if any locale's `out/index.html` is missing canonical / hreflang / H1 / JSON-LD after the build.

### Internationalization invariants
- **Locked:** All new spacing/positioning uses logical CSS properties (`ms-`/`me-`, `start`/`end`, `ps-`/`pe-`) — never `ml-`/`mr-`/`left-`/`right-`. RTL (Arabic) must verify clean.
- **Locked:** All 6 locales must continue to render at parity. Long-translation locales (PT, AR) must not break the new top-bar nav layout — UI-SPEC must consider how nav items wrap or compress when translated.
- **Locked:** Top-bar nav text is translated (already in `messages/*.json` for Home/Track/Diary). New chrome that introduces strings goes through the `i18n-sync` flow.

### Keyboard navigation
- **Out of scope this phase.** Phase 6 owns Enter/Escape/Tab handlers + focus rings. Phase 5 only ensures any new interactive AppShell chrome elements (top-bar nav links) are keyboard-accessible by default (use proper `<button>`/`<a>` semantics; do not introduce `<div onClick>` patterns).

### Tech-stack constraints
- **Locked:** Tailwind 4 + Next.js 16 App Router + React 19 — pinned by existing project.
- **Locked:** No new external dependencies for this phase. The shared container primitive is plain React + Tailwind; no `clsx`/`cva` introduction unless it's already in use.
- **Locked:** No new state management. AppShell chrome reactivity comes from existing patterns.
- **Locked:** `'use client'` only where needed (existing components already use it correctly).

### Aesthetic reference
- **User-stated:** "Airbnb-grade browser experience" — generous whitespace bounded by readable max-widths, strong visual hierarchy, sensible keyboard behavior. NOT cluttered, NOT data-dense like a clinician dashboard.
- **Locked from project memory:** Boomer-safe UX (target user 50+, non-tech-savvy) is a hard constraint — desktop redesign must NOT make hit targets smaller, fonts denser, or interactions less obvious. See `docs/UX_PHILOSOPHY.md`.
- **Locked from project memory:** Collaborative tone, not clinical/authoritative; no em-dashes in UI strings.

### Claude's Discretion
- The exact name and shape of the container primitive (component vs hook vs class set) — UI-SPEC + planner picks.
- The exact max-width values for `narrow` / `default` / `wide` tokens — UI-SPEC locks.
- Whether top-bar nav is a part of `Header.tsx` or a new `<TopNav>` component — UI-SPEC picks.
- Whether QuickLogFAB on desktop uses Pattern A (anchored float) or Pattern B (inline button) — UI-SPEC picks; planner implements.
- Whether to introduce a `useBreakpoint` hook for any conditional rendering, or rely entirely on Tailwind's responsive classes (`md:hidden` etc.) — Claude's call; default is Tailwind-only (avoids client-only hooks for layout).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (UI-SPEC + planner + executor) MUST read these before deciding or implementing.**

### Project docs
- `docs/UX_PHILOSOPHY.md` — Boomer-safe UX principles, target user (50+), 6 design principles, dated decisions log. Hard constraint on hit targets + interaction patterns.
- `docs/TIME_MODEL.md` — Day-boundary correctness invariants (not directly relevant to this phase but consulted if any chrome touches date display).
- `CLAUDE.md` — Project instructions, naming conventions, error handling, import organization, anti-patterns.

### Codebase conventions (read these before writing new components)
- `src/components/ui/Button.tsx` — Existing UI primitive pattern (forwardRef, displayName, variants via Tailwind class strings, focus-visible already partial). Any new shared primitive should match this style.
- `src/components/layout/AppShell.tsx` — Current AppShell shape (Header + children + BottomNav + Footer + PrivacyNotice). The desktop chrome work modifies this directly.
- `src/components/layout/Header.tsx` — Current header (logo + Learn link + locale switcher). Expansion target.
- `src/components/layout/BottomNav.tsx` — Current bottom-tab nav. Hidden at `md`+.
- `src/components/layout/Footer.tsx` — Current footer. Padding adjustment.
- `src/components/diary/QuickLogFAB.tsx` — Current floating FAB. Repositioning target.
- `src/app/[locale]/LandingContent.tsx` — Heaviest user of the duplicated `max-w-lg md:max-w-xl mx-auto w-full` pattern. Adopts new container primitive.
- `src/app/[locale]/diary/layout.tsx` — Current diary layout (`max-w-xl mx-auto w-full px-4 pt-4`). Adopts new container primitive.
- `src/components/onboarding/OnboardingFlow.tsx` — Same duplicated container pattern. Adopts new container primitive in this phase; per-step composition redesign is Phase 7.

### Existing responsive patterns (reference, do not break)
- `src/app/[locale]/learn/page.tsx` and `src/components/learn/ArchiveContent.tsx` — Already use `max-w-5xl` + `sm:px-6` properly. The Learn section is already responsive — these files are reference for what "good" looks like, NOT targets to redesign.
- `src/components/layout/PrivacyNotice.tsx` — Uses `max-w-md mx-auto` with proper backdrop-blur card styling. Reference for centered modal-style cards (Phase 6 will need this for the desktop modal-style sheet pattern, but Phase 5 doesn't touch it).

### i18n + locale infrastructure
- `src/i18n/config.ts` — Locale list, 6 locales (en/fr/es/pt/zh/ar).
- `src/i18n/seo.ts` — `LOCALE_DIR` map sets `dir="rtl"` on Arabic.
- `src/i18n/navigation.ts` — Use `<Link>` from here, not `next/link`, in any new chrome components.
- `messages/en.json` — Source of truth for UI strings; any new strings auto-mirror to the other 5 locales via the `i18n-sync` PostToolUse hook.

### Project skills (consult before writing components)
- `.claude/skills/visual-qa/SKILL.md` — Visual QA across 6 locales × LTR/RTL. Will run in Phase 8 against this phase's output.
- `.claude/skills/learn-styling/SKILL.md` — Visual layout + typography conventions for `/learn`. NOT directly applicable to AppShell chrome but useful reference for editorial-style desktop layouts.
- `.claude/skills/i18n-sync/SKILL.md` — Auto-syncs new UI string keys across locale files. Triggers on `messages/en.json` edits.

### Memory references (the user has already taught me these — apply automatically)
- `feedback_no_em_dashes.md` — No em-dashes in UI strings.
- `feedback_collaborative_tone.md` — Patient-facing copy is peer/collaborative, not clinical/authoritative.
- `reference_ux_philosophy.md` → `docs/UX_PHILOSOPHY.md` — Boomer-safe UX principles.
- `feedback_lightning_css_grouped_selectors.md` — Two failure modes to avoid in `globals.css` (alpha-suffixed selectors in grouped rules; class+`::after` animation setups).
- `project_i18n_six_locales.md` — All 6 locales must remain at parity.
- `feedback_verify_all_locales_before_push.md` — Render-verify every locale (esp. `ar`/`zh`) after layout changes.
- `time_model_gotchas.md` — Not directly relevant to chrome but consulted if any chrome touches time display.

</canonical_refs>

<specifics>
## Specific Ideas

### Desktop chrome shape (user's stated preference)
- "Airbnb-style UI and UX" on browser → top-bar nav band, generous whitespace, content centered in a bounded reading column, hover affordances on interactive chrome.
- "Rigor of a medical app but with the UX and UI flow of a consumer app" → keep the visual restraint and trustworthiness of the current ipc-50 / ipc-700 palette + Lucide icons; do NOT make it look like a marketing site or a consumer game.

### Concrete problems from screenshots (these are the ones that must be fixed)
1. `/en/diary/day/1` at 1920px — bottom-sheet "What did you drink?" form spans 100% viewport; drink-type buttons stretch to ~430px wide each; volume slider stretches across ~1800px. (Phase 6 owns the form internals; Phase 5 owns the SHEET CONTAINER pattern that constrains them.)
2. `/en/diary/day/1` at 1920px — QuickLogFAB sits in the bottom-right corner of the viewport, hundreds of pixels from where the day-1 timeline content actually is. (Phase 5 owns the FAB repositioning.)
3. `/en/diary/day/1` at 1920px — bottom tab bar (Home / Track / Diary) is a mobile pattern pinned at the very bottom of a desktop monitor, with `max-w-md` so it sits as a tiny strip. (Phase 5 owns hiding this at `md`+ and replacing with a top-bar nav.)
4. `/en/diary/day/1` at 1920px — day timeline content sits in a `max-w-xl` column with vast empty whitespace on either side AND no chrome to make the column feel intentional. (Phase 5's container primitive + chrome work resolves the "feels intentional" half.)
5. `/en` (onboarding age step) at 1920px — single 30 input swimming in 1920px of whitespace. (Phase 7 owns the onboarding redesign per se; Phase 5 ensures the container primitive supports the kind of layout Phase 7 will build.)

### Reference visuals
- The user mentioned Airbnb specifically. Airbnb's browser layout pattern: top-bar nav with logo left + nav center + account right, generous whitespace below, content in a reading column, no floating FAB-style chrome.
- Already-good reference INSIDE this codebase: the `/learn` section's `max-w-5xl` content + clean header pattern (see `src/app/[locale]/learn/page.tsx`).

</specifics>

<deferred>
## Deferred Ideas

These came up in scoping but are explicitly OUT of Phase 5 (and tracked elsewhere):

- **Bottom-sheet form internals (drink/void/leak/bedtime/wake forms)** — Phase 6, requirements DTUX-01 + DTUX-03.
- **Keyboard navigation (Enter/Escape/Tab/focus rings)** — Phase 6, requirement DTUX-03.
- **Onboarding 3-step wizard layout redesign** — Phase 7, requirement DTUX-04.
- **Summary page multi-column metric grid + export hover affordances** — Phase 7, requirement DTUX-05.
- **Cross-locale visual QA matrix run** — Phase 8, requirement DTUX-06.
- **Distinct tablet-portrait breakpoint** — Out of scope this milestone (single desktop breakpoint at `md`).
- **Full keyboard shortcut model (number-keys-as-shortcuts, arrow-keys for slider)** — Out of scope this milestone (Phase 6 ships Enter/Escape/Tab only).
- **iPad split-view / Stage Manager edge cases** — Out of scope this milestone.
- **`TimelineView.tsx` 884-line monolith refactor** — Already deferred in REQUIREMENTS.md Out of Scope.
- **Premium-features rollout** — Already deferred (compile-time constant intentional).

</deferred>

---

*Phase: 05-layout-foundation-appshell-chrome*
*Context gathered: 2026-05-14 (inline from `/gsd-plan-phase` brief + scoping AskUserQuestion answers; no full `/gsd-discuss-phase` run)*
