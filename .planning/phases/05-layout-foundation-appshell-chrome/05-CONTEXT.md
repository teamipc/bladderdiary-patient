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

**FIRST PRINCIPLE (locked 2026-05-15 across THREE user reinforcements — strongest constraint in this entire CONTEXT):**

Mobile is not just preserved — it is the **FIRST-CLASS PRIMARY SURFACE** for this app. The majority of patients use the mobile experience; desktop is the secondary, additive surface. The user's exact words across three reinforcements within ~24 hours:

1. *"Keep the mobile as is cause it is working very well right now"* (during initial scoping)
2. *"Is my mobile design still safe"* (mid-discussion mobile-safety audit; reassurance requested)
3. *"A majority of patient use the mobile experience so it needs to be pristine"* (final reinforcement)

**Operational meaning for every Phase 5–8 decision:**
- Every modified surface is evaluated **MOBILE FIRST.** The 375px rendering is the design baseline; desktop rendering is the layered additive enhancement on top of an unchanged mobile base.
- If a desktop-improving change degrades mobile by even one pixel beyond the two locked carve-outs (Arabic FAB correctness fix; +8px sm:px-6 shift at 640–767px), the desktop change is REJECTED, not the mobile invariant.
- A planner working on Phase 6/7/8 should: (a) verify the proposed change is invisible/inert on mobile per these invariants, (b) only THEN apply the desktop axis decision. If the two can't both be true, mobile wins and the desktop decision is dropped or deferred.
- Verification weight: the daily 6-locale production walkthrough (which runs at mobile width) is the **canonical regression gate, no exceptions**. Plan 05-07's mobile screenshots in all 6 locales are the human-eyeball pre-deploy gate. Phase 8 visual-qa MUST weight mobile heavier than desktop in its audit matrix (mobile findings = blockers; desktop-only findings = warnings).

The remaining bullets in this subsection are the precise mechanics that implement this First Principle:

- **Locked (HARD CONSTRAINT):** No visual regression at < 768px. Mobile chrome (BottomNav at viewport bottom, FAB in bottom-right, mobile Header density) is unchanged. Daily walkthrough must continue to pass. Mobile is the production-tested surface; do NOT touch its visual rhythm under any circumstances during Phases 5–8.
- **Locked:** Mobile screenshot diffs at 375px (iPhone-baseline) must show NO change as a pass criterion.
- **Locked:** Every plan that modifies a chrome file (AppShell, Header, BottomNav, Footer, FAB) MUST include an acceptance criterion verifying mobile (< 768px) behavior is unchanged via either an inline grep guard or a Playwright screenshot diff.

**Two precise carve-outs the user explicitly accepted (2026-05-15 follow-up Q&A):**

1. **Arabic FAB position correctness fix.** The QuickLogFAB `right-5` → `end-5` change moves the FAB from the right corner to the left corner in RTL Arabic at every viewport width. This was previously a physical-CSS leak (the FAB sat on the visual-RIGHT in Arabic, which is the inline-START side, the wrong side). `end-5` puts it on the inline-END side correctly (visual-RIGHT in LTR, visual-LEFT in RTL). This IS a mobile diff in Arabic but it is a CORRECTNESS fix that was already failing — UI-SPEC §"Mobile Invariants" point 2 documents it as the single allowed exception. The 5 LTR locales (en/fr/es/pt/zh) are byte-equivalent because `end-5` resolves to `right:20px` in LTR.

2. **`sm:px-6` shift in the 640–767px range on `diary/layout.tsx` and `summary/page.tsx`.** Plan 05-06's adoption of Container `default` variant (`px-4 sm:px-6`) on these two files means horizontal padding shifts from 16px to 24px in the 640–767px viewport range (small-tablet portrait, phones in landscape, Pixel Fold edge cases). At < 640px (the dominant phone range — iPhone SE 375px, iPhone 14 390px, iPhone Plus 414px, Pixel 412px, all Android phones in portrait) the padding stays 16px exactly — byte-equivalent. **User explicitly accepted this +8px shift in the 640–767px range** because (a) it is consistent with the rest of the codebase's `sm:px-6` convention used by Header, `learn/page.tsx`, `ArchiveContent.tsx`, `LandingContent.tsx`, etc., (b) it is a +8px breathing-room gain not a loss, and (c) the alternative (passing `noPadding + className="px-4"` to keep 16px at all widths) would introduce a one-off inconsistency with the rest of the chrome system. Strict mobile invariant therefore reads: "byte-equivalent at < 640px; +8px padding gain at 640–767px is accepted as consistent with the codebase's existing sm:px-6 convention."

These two carve-outs are EXHAUSTIVE — no other mobile diffs are permitted by Phase 5. Plan 05-07's verification matrix captures 375px screenshots in all 6 locales as the human-eyeball gate; the daily walkthrough is the post-deploy regression net.

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
- **User-stated (2026-05-15 reinforcement):** "Airbnb consumer level UI/UX but still with the rigor of medical." This is the headline tension the Design DNA below resolves axis-by-axis.
- **Locked from project memory:** Boomer-safe UX (target user 50+, non-tech-savvy) is a hard constraint — desktop redesign must NOT make hit targets smaller, fonts denser, or interactions less obvious. See `docs/UX_PHILOSOPHY.md`.
- **Locked from project memory:** Collaborative tone, not clinical/authoritative; no em-dashes in UI strings.

### Design DNA — Aesthetic axes (locked 2026-05-15 via `/gsd-discuss-phase`)

The user's framing "Airbnb consumer-level UI/UX with the rigor of a medical app" is a real tension, not a marketing line. This subsection translates it into 8 concrete axes Phase 5 chrome and the downstream Phase 6/7/8 planners can apply consistently. The headline rule from this discussion: **Be Airbnb in the moments of arrival, browsing, and reassurance — be medical in the moments of recording, reviewing, and exporting.**

| # | Axis | Locked decision | Why |
|---|------|-----------------|-----|
| **1** | **Whitespace + typography scale at desktop** | Airbnb wins. Headlines bump up at `md`+ (current `text-3xl` → `text-4xl` / `text-5xl` on landing/onboarding/summary H1). Generous bounded whitespace stays. | 50+ users need readable type. A 3-day commitment needs an inviting, not clinical, first impression. |
| **2** | **Imagery + illustration policy** | Mixed by surface. Landing / onboarding / Learn topic pages CAN use illustration (locale-safe SVG, no English text in artwork, RTL-safe). Diary forms + timeline + summary metrics: zero imagery (the data IS the content). | Imagery helps first impressions and topic browsing; imagery during a task distracts. |
| **3** | **Decorative chrome vs functional chrome** | Medical wins. No decorative borders, dividers, or icons that don't communicate state. Every chrome element is functional. | Decorative noise undermines clinical trust. The user is here for a task. |
| **4** | **Card elevation + shadows** | Mixed by component class. Modals + bottom-sheets-becoming-desktop-modals at `md`+: elevation (`shadow-xl ring-1 ring-black/5`) — Airbnb modal pattern. In-page content (timeline events, summary metric tiles, Learn cards): flat with `bg-ipc-50` border or subtle inner shadow. | Modals NEED elevation to read as overlays. Page content shouldn't compete with itself. |
| **5** | **Hover affordances** | Mixed by element class. Chrome (nav links, buttons, Learn-card links): subtle hover (color shift + tiny `translate-y-[-1px]` if appropriate). Non-clickable content (metric tiles, completed timeline entries): zero hover state. | Chrome must feel responsive (consumer expectation at desktop). Hover-fancy on non-clickable items lies about interactivity. |
| **6** | **Motion + transitions** | Mostly medical, two exceptions. NO page-transition fades (slow + uncertain). Modal slide-in IS OK (feedback for a user action). Toast slide-in IS OK (already exists). NO parallax, NO auto-rotate, NO animated-numbers-counting-up on summary metrics. | Medical apps benefit from instant snappy feedback. Cinematic transitions read as slow. The exceptions are user-triggered feedback, not idle decoration. |
| **7** | **Trust signal density (privacy / IPC / data-locality)** | Medical wins. "Powered by IPC" stays visible in chrome at all times (small + restrained, not loud). "Your data stays on your device" becomes a Footer permanent line at desktop, NOT just a dismissible landing card. | Patient must trust the data stays local. Constant subtle reassurance reads as more honest than one big one-time popup. |
| **8** | **Information density on the diary entry page** | Minimalist focus, NOT consumer-dashboard. Diary day at desktop stays single-column timeline with FAB anchored to content. NO live-metrics sidebar showing "today's volume" while logging. Summary page is the dashboard moment — diary entry is the task moment. | Adding a sidebar during entry = patient watching their stats instead of doing the next entry. Worse data, worse compliance. Boomer-safe principle: don't multitask the user. |

**CASCADE PRIORITY — mobile-first evaluation (locked 2026-05-15 reinforcement):** All 8 axes above are evaluated **MOBILE-FIRST**. The 375px rendering of every modified surface is the design baseline; desktop rendering is the layered additive enhancement. A planner working on Phase 6/7/8 should: (1) verify the proposed change is invisible/inert on mobile per the §"Mobile invariants" First Principle above, (2) only THEN apply the axis decision for desktop. If a desktop axis decision can't be applied without affecting mobile beyond the two locked carve-outs, the desktop decision is dropped or deferred — **mobile-pristine wins, every time.** Per user reinforcement: "majority of patient use the mobile experience so it needs to be pristine." This rule overrides any tension within an individual axis decision below.

**Cascade rules (how this applies to the four downstream phases):**

- **Phase 5 (this phase, chrome):** Axes 3, 5, 6, 7 are the relevant ones for chrome. The current PLAN files already reflect these (functional-chrome-only Header/BottomNav/Footer; subtle hover on nav links per UI-SPEC §"Hover-affordance spec"; no decorative motion; "Powered by IPC" visible in Header). Trust-signal axis 7 produces ONE small Phase 5 follow-up: at desktop, the Footer should include "Your data stays on your device" as a permanent line — Plan 05-03 (Footer modifications) is the natural home for this. Documented as a Phase 5 amendment below.
- **Phase 6 (Diary forms + keyboard nav):** Axes 4 and 6 are critical. Bottom-sheet forms at `md`+ become modal-elevation cards (`shadow-xl ring-1 ring-black/5`) per axis 4. Modal slide-in motion is allowed per axis 6. Forms get NO illustrations per axis 2.
- **Phase 7 (Onboarding + Summary):** Axes 1, 2, 4, 8 are critical. Onboarding (axis 1) gets desktop H1 bumped to `text-4xl` / `text-5xl` per the typography decision; can include locale-safe illustration per axis 2. Summary metrics (axis 4) use flat tiles with `bg-ipc-50`, NOT elevated cards (the metrics ARE the content; they shouldn't compete). Diary day stays single-column per axis 8 — Phase 7 must NOT introduce a metrics sidebar even if "it would look more dashboard-y". Summary page IS the dashboard moment.
- **Phase 8 (Cross-locale visual QA + polish):** All 8 axes are part of the visual-qa audit. Add explicit acceptance criterion to Phase 8: verify each axis's locked decision is reflected in the production rendering across all 6 locales × LTR/RTL × md/lg/xl.

**Phase 5 amendment from this discussion (incorporated into existing plans, not a new plan):**

- **Plan 05-03 (`Footer.tsx` modifications)** acquires one additional change per axis 7: at `md`+, the Footer renders a permanent line reading "Your data stays on your device" (or the locale equivalent). This should reuse the existing privacy-notice copy from `messages/{locale}.json` if present, OR introduce a new key `footer.dataLocality` (English: "Your data stays on your device") which the `i18n-sync` PostToolUse hook auto-mirrors across the 5 non-English locales. The line uses the existing Footer typography spec (`text-sm`, `text-ipc-700`). The PrivacyNotice landing card is NOT removed — it stays as the first-visit reassurance; the Footer line is the always-on reassurance for returning users. This is a SMALL extension to Plan 05-03 — the planner-revision pass should add: a new task in 05-03 for the Footer copy line + i18n key, with the same mobile-invariant guard (the line appears at `md`+ only via `hidden md:block`; mobile Footer unchanged).

### Claude's Discretion (aesthetic-axes scope)

The user explicitly chose to lock only the design-DNA axis framework (option 1 of the AskUserQuestion). The following 3 unselected gray areas remain at Claude's discretion, applied per the locked DNA above as defaults:

1. **Imagery + illustration + cards-with-elevation tactical decisions** — Phase 7 planner picks the SPECIFIC imagery (illustration vs photograph), the SPECIFIC card-elevation tokens for modals, and the SPECIFIC summary-metric tile styling, applying axis 2 + axis 4 above as the policy.
2. **Trust-signal-prominence tactical decisions beyond the Footer line** — Beyond the Plan 05-03 Footer line locked above, additional trust-signal placements (e.g., on the Summary page near the export buttons; in the diary completion celebration) are at the Phase 7 planner's discretion, applying axis 7 above as the policy.
3. **Micro-interaction tactical decisions beyond the chrome hover** — Beyond the Phase 5 chrome hover spec already in UI-SPEC, additional motion touches (modal slide-ins for Phase 6 forms; Toast slide-ins; no decorative motion) are at the relevant planner's discretion, applying axis 5 + axis 6 above as the policy.

These are deliberately left as discretion — the DNA framework is detailed enough that the planners can apply it consistently without re-asking.

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

## Discussion Log

### Session 1 — 2026-05-14 (initial scoping during `/gsd-plan-phase`)
Scope, surfaces, breakpoints, and chrome behavior. Captured inline from the user's `/gsd-plan-phase` brief plus 4 AskUserQuestion answers (roadmap fit, surface coverage, keyboard depth, tablet handling). User's two reinforcement constraints — mobile-as-is HARD CONSTRAINT and SEO regression gate — added later in the planning session.

### Session 2 — 2026-05-15 (`/gsd-discuss-phase` — Design DNA)
**User question:** "Are there discuss for the UI/UX decision? Again we need to be Airbnb consumer level UI/UX but still with the rigor of medical."

**Surfaced gray areas (4 candidates):**
1. Airbnb-vs-medical tension — concretize the design DNA
2. Imagery + illustration + cards-with-elevation policy
3. Trust signals — how prominently to surface medical rigor
4. Micro-interactions + information density philosophy

**User picked:** Option 1 only (Airbnb-vs-medical tension — design DNA framework). The other three remain Claude's discretion, defaults applied per the locked DNA.

**Decision:** Locked an 8-axis Design DNA framework (whitespace+typography, imagery, decorative chrome, card elevation, hover affordances, motion, trust signal density, information density). Headline rule: **"Be Airbnb in the moments of arrival, browsing, and reassurance — be medical in the moments of recording, reviewing, and exporting."**

**Phase 5 amendment cascade:** Plan 05-03 acquired one new task (Task 4) per axis 7 (constant subtle trust signals): a new `footer.dataLocality` i18n key + a permanent desktop-only "Your data stays on your device" line in the Footer. PrivacyNotice landing card stays unchanged. No other Phase 5 plan changes — the chrome work in 05-04 / 05-05 / 05-06 already reflects axes 3, 5, 6 by virtue of the existing UI-SPEC §"Hover-affordance spec" and §"6-Pillar Pre-Check".

### Session 3 — 2026-05-15 (mobile-safety follow-up)
**User question:** "btw is my mobile design still safe"

**Answer delivered:** Per-file walkthrough at < 768px showed all 10 modified files are byte-equivalent at the dominant phone range (320–639px) except for two narrow carve-outs: (1) Arabic FAB position correctness fix (was already wrong), (2) `sm:px-6` padding shift in the 640–767px range on `diary/layout.tsx` and `summary/page.tsx` (small-tablet-portrait edge case).

**User decision:** Accepted the +8px small-tablet padding shift as consistent with the codebase's existing `sm:px-6` convention. No plan revision required — option (a) is what the plans already do.

**Decision recorded in:** §"Mobile invariants" above, "Two precise carve-outs the user explicitly accepted" subsection. The two carve-outs are EXHAUSTIVE — no other mobile diffs are permitted by Phase 5.

### Session 4 — 2026-05-15 (mobile primacy reinforcement, third user reinforcement)
**User reinforcement:** *"Don't forget a majority of patient use the mobile experience so it needs to be pristine."*

This is the THIRD time within ~24 hours the user has elevated the mobile invariant. Each time strengthens the framing:
- Reinforcement 1 (initial scoping): "keep the mobile as is cause it is working very well"
- Reinforcement 2 (mid-discussion): "is my mobile design still safe?" (asks for audit)
- Reinforcement 3 (here): "majority of patient use the mobile experience so it needs to be pristine"

**Decision:** Elevated the framing in §"Mobile invariants" from "preserved (no regression)" to **FIRST-CLASS PRIMARY SURFACE.** Added a new **First Principle** opening to the section that:
- Quotes all three reinforcements
- States the operational meaning: every Phase 5–8 decision is evaluated MOBILE FIRST; desktop is the additive layer; mobile-pristine wins ties
- Reweights verification: daily walkthrough is the canonical regression gate (no exceptions); Phase 8 visual-qa must weight mobile findings as blockers and desktop-only findings as warnings

Also added a **CASCADE PRIORITY** rule at the top of §"Design DNA — Aesthetic axes" cascade-rules subsection: all 8 axes are mobile-first; if a desktop axis decision can't be applied without affecting mobile beyond the two locked carve-outs, the desktop decision is dropped or deferred.

**No plan revision required.** Plan 05-07's verification matrix already iterates [375px → 768px → 1280px] in that order (mobile-first); the human-verify spot-check list already leads with `landing-en-mobile-375.png`. Plans 05-01 through 05-06 already preserve mobile at every modified file. The framing change is enforcement-priority guidance for downstream Phase 6/7/8 planners, not a re-engineering trigger.

**What this changes for Phase 6/7/8 planners:** they read "mobile-first" as the overriding rule and structure their plans to verify mobile-inertness FIRST, then layer desktop additively. The Design DNA framework still applies — but it applies on top of an unchanged mobile baseline, never at mobile's expense.

**Phase 6/7/8 cascade:**
- Phase 6 planner will apply axis 4 (modal elevation `shadow-xl ring-1 ring-black/5` for desktop modals) + axis 6 (modal slide-in motion allowed; no decorative motion).
- Phase 7 planner will apply axis 1 (bump landing/onboarding/summary H1 to `text-4xl`/`text-5xl` at md+) + axis 2 (locale-safe illustration on landing/onboarding allowed; zero imagery on diary forms / summary metrics) + axis 4 (summary metric tiles flat with `bg-ipc-50`, NOT elevated cards) + axis 8 (no live-metrics sidebar on diary day at desktop).
- Phase 8 (visual-qa skill) will audit each axis's rendering across the 6-locale × LTR/RTL × md/lg/xl matrix.

---

*Phase: 05-layout-foundation-appshell-chrome*
*Context gathered: 2026-05-14 (initial scoping during `/gsd-plan-phase`); extended 2026-05-15 (Design DNA framework via `/gsd-discuss-phase`)*
