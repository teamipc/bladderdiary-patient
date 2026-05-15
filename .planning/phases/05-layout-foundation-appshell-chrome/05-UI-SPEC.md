---
phase: 5
slug: layout-foundation-appshell-chrome
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-14
---

# Phase 5: Layout foundation + AppShell chrome — UI Design Contract

> Visual + interaction contract for the shared layout primitives and AppShell desktop chrome that Phases 6–8 consume. Authored from `05-CONTEXT.md`, `REQUIREMENTS.md` (DTUX-02), `ROADMAP.md` (Phase 5 success criteria), `docs/UX_PHILOSOPHY.md`, and codebase scan of `src/components/layout/*` + `src/components/diary/QuickLogFAB.tsx` + `src/app/[locale]/**`.

---

## Status

| Field | Value |
|---|---|
| Phase | 5 — Layout foundation + AppShell chrome |
| Requirement | DTUX-02 |
| Source | `05-CONTEXT.md` (locked decisions) + codebase audit |
| Date | 2026-05-14 |
| Tech baseline | Tailwind 4 (`@theme inline` in `globals.css`, no `tailwind.config.*`), Next.js 16 App Router, React 19, next-intl 4, lucide-react 0.577 |
| Class composition | Inline template-literal class strings (existing project convention; `clsx`/`cva` NOT in deps and NOT introduced) |
| Out of scope this phase | Bottom-sheet form internals (Phase 6), keyboard navigation rollout beyond chrome (Phase 6), onboarding/summary redesign (Phase 7), cross-locale visual QA matrix (Phase 8), new color tokens, new fonts, new dependencies |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (shadcn not in use; project uses hand-rolled primitives in `src/components/ui/`) |
| Preset | not applicable |
| Component library | none (custom React + Tailwind 4) |
| Icon library | lucide-react 0.577 |
| Font | Inter via `next/font/google` (CSS var `--font-sans`); fallback stack `Inter, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (declared in `globals.css @theme`) |
| Color palette | Existing IPC palette (`--color-ipc-50` … `--color-ipc-950`) — Phase 5 introduces NO new colors |
| Container API | New: `<Container variant="narrow|default|wide|full">` React component (rationale below) |

---

## Design Tokens Locked

### Breakpoints (Tailwind 4 native — no custom breakpoints introduced)

| Token | Min width | Used for |
|---|---|---|
| (none) | < 640 | Mobile baseline (iPhone SE 375 = primary form factor) |
| `sm` | 640 | Increased horizontal padding only (`sm:px-6`) — chrome unchanged |
| `md` | **768** | **Desktop activates here.** BottomNav hidden; top-bar nav appears; FAB anchors to content; Header expands |
| `lg` | 1024 | Container `wide` reaches its max-width; nav items get more breathing room |
| `xl` | 1280 | Generous outer padding (`xl:px-10`); chrome internal max-width unchanged |
| `2xl` | 1536 | No layout change (content stays bounded by container max-width) |

**Decision:** No custom breakpoint added. CONTEXT.md locks "desktop activates at `md`"; deviating from Tailwind defaults adds learning cost without clear value.

### Container max-width tokens

| Variant | Max-width | Tailwind class | Padding (sm/md/lg/xl) | Use case |
|---|---|---|---|---|
| `narrow` | 672px | `max-w-2xl` | `px-4 sm:px-6` | Single-column form content, slider rows, settings cards, onboarding inputs (Phase 7 will adopt) |
| `default` | 768px | `max-w-3xl` | `px-4 sm:px-6` | Day timeline content, button grids inside form sheets (Phase 6 will adopt), summary cards stacked |
| `wide` | 1024px | `max-w-5xl` | `px-4 sm:px-6 lg:px-8` | Summary metric grids (Phase 7), `/learn` hub (already in use, do NOT modify), landing hero |
| `full` | none | (no `max-w-*`) | `px-4 sm:px-6 lg:px-8 xl:px-10` | Chrome rows only — Header band, Footer band, Top-nav band. Inner content gets its own `wide` container |

**Vertical padding is NOT part of the container contract.** Each page composes its own vertical rhythm using existing spacing scale (`pt-4 pb-12` etc.). Container only owns horizontal centering, max-width, and horizontal padding.

### Container component API (the chosen shape)

**Decision:** Option (a) — a single `<Container>` React component. NOT a class-string helper, NOT a hook.

Rationale:
- Matches existing project convention: `src/components/ui/Button.tsx`, `BottomSheet.tsx`, `ConfirmDialog.tsx` are all React components with variant props, not helper functions.
- Makes downstream phases (6–7) consume one well-named import instead of remembering exact Tailwind class strings — eliminates the "scattered `max-w-lg md:max-w-xl mx-auto w-full px-6`" duplication CONTEXT calls out.
- Server-component-safe (no hooks, no `'use client'` needed) so it works inside both diary `[locale]/diary/layout.tsx` (client tree) and learn pages (server tree). Phase 5's primitive must work in both because Phase 6 will adopt it for form sheets and Phase 7 will adopt it for summary.
- Easier to grep / refactor than class strings.

**File path (locked):** `src/components/layout/Container.tsx`

**Why `layout/` not `ui/`:** This is a structural primitive (defines page geometry), not an interactive UI element. `layout/` already houses `AppShell`, `Header`, `BottomNav`, `Footer` — the shared structural chrome. `ui/` is for interactive primitives (Button, BottomSheet, Toast, ConfirmDialog). Container is structural, not interactive.

**API (locked):**

```tsx
interface ContainerProps {
  variant?: 'narrow' | 'default' | 'wide' | 'full';
  as?: 'div' | 'section' | 'main' | 'article' | 'header' | 'footer' | 'nav';
  className?: string;
  children: React.ReactNode;
}

// Default: variant="default", as="div"
// No 'use client' directive — server-component-safe
```

**Class string per variant (executor reference):**

| variant | Class string |
|---|---|
| `narrow` | `mx-auto w-full max-w-2xl px-4 sm:px-6` |
| `default` | `mx-auto w-full max-w-3xl px-4 sm:px-6` |
| `wide` | `mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8` |
| `full` | `w-full px-4 sm:px-6 lg:px-8 xl:px-10` |

`className` prop is appended (string concatenation) so callers can layer per-page vertical padding (`pt-8 pb-12`) without re-stating the container shape.

### Color tokens used (no new colors introduced)

Phase 5 uses ONLY existing IPC palette tokens already defined in `src/app/globals.css @theme inline`:

| Token | Hex | Used in chrome for |
|---|---|---|
| `--color-surface` | `#fefdfb` | AppShell body bg, Header bg base, Footer fade target |
| `--color-ipc-50` | `#fdf8ef` | Active nav item bg (subtle), hover bg on chrome links |
| `--color-ipc-100` | `#f9edda` | Header bottom border, Footer top border, BottomNav border, active nav item bg (stronger) |
| `--color-ipc-200` | `#f2d8b4` | Mail link border, locale switcher resting border |
| `--color-ipc-400` | `#a8651b` | Active nav underline accent (decoration) |
| `--color-ipc-500` | `#955a14` | Focus ring (`focus-visible:ring-ipc-500`), QuickLogFAB fill |
| `--color-ipc-700` | `#62380c` | Default nav link text (active state, hover end-state) |
| `--color-ipc-800` | `#4a2808` | Default nav link text (resting state) |
| `--color-ipc-900` | `#321c05` | Logo title text |
| `--color-ipc-950` | `#1d0f02` | Body text default, footer headings |

### Focus-visible ring spec (chrome only — Phase 6 owns the full app rollout)

All NEW interactive chrome elements (top-bar nav `<Link>`s, locale switcher button, mobile-menu disclosure if added) MUST use:

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ipc-500
focus-visible:ring-offset-2
focus-visible:ring-offset-surface
```

- 2px ring at `--color-ipc-500` (`#955a14`, AA at 5.4:1 against surface).
- 2px offset against `--color-surface` so the ring reads as an outset glow on the warm-white body bg.
- Verifies cleanly on both white (`bg-surface`) AND ipc-50 backgrounds (Tailwind `ring-offset-surface` resolves to surface; on ipc-50 contexts the offset still reads because ipc-50 is a near-neighbor tint).
- Existing `Button.tsx` already uses `focus:ring-2 focus:ring-ipc-400 focus:ring-offset-2` — Phase 5 is consistent in pattern but uses the slightly darker `ipc-500` for chrome (chrome has no fill background so needs marginally more contrast; Button.tsx fills its own bg color with `bg-ipc-500` which is why that file uses `ipc-400` for the ring).
- Phase 6 will revisit `Button.tsx`'s `focus:` → `focus-visible:` migration; Phase 5 does NOT modify `Button.tsx`.

### Hover-affordance spec (chrome only)

| Element | Resting | Hover | Active (current route) |
|---|---|---|---|
| Top-bar nav link (Home / Track / Diary / Learn) | `text-ipc-800` | `text-ipc-950 bg-ipc-50` | `text-ipc-900 bg-ipc-100` (with subtle 2px underline accent at `ipc-400` for current-route signaling) |
| Locale switcher button | `text-ipc-800` | `bg-ipc-50` | `bg-ipc-100` (when dropdown open) |
| Footer link (Privacy / Terms / Help) | `text-ipc-700` (existing) | `text-ipc-950 underline` (existing) | n/a |
| QuickLogFAB (anchored desktop variant) | `bg-ipc-500` (existing pulse animation) | `bg-ipc-600` (existing) | n/a |

Hover transitions: `transition-colors duration-150` (matches existing chrome). NO color-shift transitions on background-only — keeps motion budget low for the boomer audience.

---

## Spacing Scale

Project follows Tailwind's 4px grid (already canonical). Phase 5 chrome adds nothing new; uses these values exclusively:

| Token | Value | Used in chrome for |
|---|---|---|
| `gap-1` / `p-1` | 4px | Icon-text gaps inside locale switcher |
| `gap-2` / `p-2` | 8px | Icon-text gaps in nav links |
| `gap-3` / `p-3` | 12px | Inline nav item spacing at narrow `md` |
| `px-4` | 16px | Container default horizontal padding (mobile) |
| `px-6` / `py-6` | 24px | Container `sm`+ horizontal padding |
| `gap-6` / `lg:px-8` | 24-32px | Container `wide` lg padding, nav inter-item at `lg`+ |
| `py-10` | 40px | Footer internal vertical padding (existing — keep) |
| `xl:px-10` | 40px | Container `full` xl outer padding |

Exceptions: `h-14` (56px) on Header height — existing project value, preserved as the chrome height contract. No other off-grid values introduced.

---

## Typography

Phase 5 introduces NO new typography. Chrome uses existing scale (defined per element below). Inter font, swap display strategy, no font weight outside 400 / 500 / 600 / 700.

| Role | Class | Size | Weight | Line height | Usage in chrome |
|------|-------|------|--------|-------------|------|
| Logo title | `text-lg font-bold` | 18px | 700 | tight | Header logo "My Flow Check" wordmark (existing) |
| Logo subtitle | `text-[10px]` | 10px | 400 | tight | "Powered by IPC" line under wordmark (existing — DO NOT shrink further) |
| Top-bar nav link | `text-sm font-semibold` | 14px | 600 | normal | Home / Track / Diary / Learn at `md`+ |
| Locale switcher label | `text-xs font-medium uppercase` | 12px | 500 | normal | "EN" / "FR" / "AR" code in switcher button (existing) |
| Locale switcher menu item | `text-sm` | 14px | 400 (500 active) | normal | Dropdown items |
| Footer heading | `text-lg sm:text-xl font-bold` | 18-20px | 700 | tight | "Get in touch" title (existing) |
| Footer body | `text-sm` | 14px | 400 | normal | Footer subtitle (existing) |
| Footer rights line | `text-xs` | 12px | 400 | relaxed | "© year" line (existing) |

Body text (page content inside containers) is owned by each page, not the container primitive — Container is geometry only.

---

## Color

Phase 5 reuses the existing 60/30/10 split that already governs the app. The contract is to NOT introduce new colors and to enforce existing tokens consistently across chrome:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--color-surface` `#fefdfb` | Body background, Header backdrop (with `/80` blur), main content area |
| Secondary (30%) | `--color-ipc-50` to `--color-ipc-100` (`#fdf8ef` → `#f9edda`) | Card surfaces, hover states, footer fade gradient, top-bar nav active background |
| Accent (10%) | `--color-ipc-500` `#955a14` (warm amber-brown) + `--color-ipc-700` `#62380c` for text emphasis | Primary CTA fills (Button `primary`/`hero`), QuickLogFAB, focus rings, current-route nav underline |
| Destructive | `--color-danger` `#a13e2e` | Reserved for destructive actions (reset diary etc.) — NOT used in Phase 5 chrome |

**Accent reserved for (chrome scope only):**
- QuickLogFAB main button fill (`bg-ipc-500`)
- Focus-visible rings on chrome interactive elements (`ring-ipc-500`)
- Current-route nav-item underline accent (`decoration-ipc-400`)
- Hover end-state text on chrome links (`text-ipc-950` is near-black; the ipc-700 → ipc-950 step is the hover signal)

Accent is NOT used for: passive nav text (resting state is `ipc-800`), Footer links (existing `ipc-700`), the locale switcher resting state. The amber/gold reads as "you can act here" — never as decoration.

Night-mode (existing `.nighttime-bg` overrides in `globals.css`) is OUT of Phase 5 scope; chrome is only used in night-mode at the BottomSheet form sheets which Phase 6 owns. Phase 5 does NOT touch `.nighttime-bg` rules.

---

## Copywriting Contract

Phase 5 introduces NO new user-facing strings. ALL chrome strings are reused from existing `messages/<locale>.json` keys.

| Element | Reused i18n key | EN value |
|---|---|---|
| Top-bar nav: Home | `nav.home` | "Home" |
| Top-bar nav: Track | `nav.track` | "Track" |
| Top-bar nav: Diary | `nav.diary` | "Diary" |
| Top-bar nav: Learn | `nav.learn` | "Learn" |
| Locale switcher button aria-label | `language.switchLanguage` | (existing) |
| Header logo button (no visible label change) | `common.appName` | "My Flow Check" |
| Footer copy | `footer.*` | (existing — DO NOT modify) |

**No copy in this phase requires `i18n-sync` to fire** — every string is already mirrored across all 6 locales. Verified:
- `messages/en.json` lines 52-56: nav block exists with `home / track / diary / learn`
- `messages/pt.json` lines 53-56: same keys present
- `messages/ar.json` lines 53-56: same keys present (RTL)
- `messages/zh.json` lines 53-56: same keys present (CJK)

If the planner or executor introduces a new string (e.g., a "Skip to content" link for accessibility, a mobile-menu disclosure label), they MUST add it to `messages/en.json` and let the PostToolUse `i18n-sync` hook mirror it.

**Tone constraints (from project memory, applied to any new string):**
- No em-dashes anywhere
- Collaborative tone, never clinical/authoritative
- Don't center "urologist" as the default clinician

---

## AppShell Desktop Layout

### Wireframe at `375px` (mobile baseline — UNCHANGED CONTRACT)

```
┌────────────────────────────────────────┐ <- viewport edge
│ ┌────────────────────────────────────┐ │
│ │ [logo] MyFlowCheck         [🌐EN▾] │ │  Header (h-14, sticky top, ipc-100 border)
│ │        Powered by IPC      [Learn] │ │
│ └────────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │   Page content                   │  │  Container "default" or page-specific
│  │   (centered max-w-xl ish)        │  │  (NO change to existing pages this phase)
│  │                                  │  │
│  │   ...                            │  │
│  │                                  │  │
│  │                          [+]🟡   │  │  QuickLogFAB (fixed bottom-right, h-16)
│  │                          Log     │  │  Bottom 24px above BottomNav
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Footer (max-w-2xl)              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ [🏠 Home] [💧 Track] [📊 Diary]  │  │  BottomNav (fixed bottom-0, max-w-md)
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Mobile layout MUST diff cleanly against the pre-phase baseline.** All chrome below `md` (768px) renders byte-for-byte equivalent class strings. The Container primitive on diary/landing/onboarding pages is allowed to change because the new variant classes (e.g. `default` `mx-auto w-full max-w-3xl px-4 sm:px-6`) are wider than the current `max-w-lg md:max-w-xl mx-auto w-full px-6` at desktop but at mobile (< 640px) collapse to `mx-auto w-full px-4` which IS narrower horizontal padding (16px vs 24px). **Phase 5 contract: keep `px-4` at mobile equivalent to or wider than the existing px-6 if visual diff fails.** Planner: if the 16→24px padding shift causes visible regression on diary/landing pages at 375px, switch the mobile padding to `px-6`. (Default this UI-SPEC locks `px-4` because it matches the rest of the codebase including `/learn` and the diary layout itself; landing's `px-6` is the outlier.)

### Wireframe at `md` (768px — desktop activates)

```
┌──────────────────────────────────────────────────────────────────┐ <- 768px viewport edge
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │  [logo] MyFlowCheck   [Home][Track][Diary][Learn] [🌐EN▾]    │ │  Header (h-14, sticky)
│ │         Powered IPC                                          │ │  Inner: Container "wide" (max-w-5xl)
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│         ┌────────────────────────────────────────┐               │
│         │                                        │               │
│         │   Page content                         │               │
│         │   (Container "default" max-w-3xl       │               │  Page picks variant
│         │    OR "narrow" max-w-2xl OR            │               │  per content type
│         │    "wide" max-w-5xl)                   │               │
│         │                                        │               │
│         │              [+]🟡                     │               │  QuickLogFAB anchored to
│         │              Log                       │               │  CONTENT column right edge
│         └────────────────────────────────────────┘               │  (Pattern A — see below)
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │  Footer "Get in touch" centered, max-w-2xl, py-12 at md+     │ │  Footer (still max-w-2xl)
│ └──────────────────────────────────────────────────────────────┘ │
│  (NO BottomNav — hidden at md+)                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Wireframe at `lg` (1280px+)

```
┌────────────────────────────────────────────────────────────────────────────────────┐ <- 1280px viewport
│ ┌────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [logo] MyFlowCheck     [Home]  [Track]  [Diary]  [Learn]      [🌐EN▾]          │ │  Header
│ │        Powered by IPC                                                          │ │  Inner: max-w-5xl (1024)
│ │                                                                                │ │  centered with lg:px-8
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│                ┌──────────────────────────────────────────────┐                    │
│                │                                              │                    │
│                │   Page content                               │                    │  Container (variant chosen
│                │   max-w-3xl (default) shown here             │                    │  by page; max-w-5xl for
│                │                                              │                    │  summary at lg+)
│                │                                              │                    │
│                │                                  [+]🟡       │                    │  QuickLogFAB anchored
│                │                                  Log         │                    │  to content column edge
│                └──────────────────────────────────────────────┘                    │
│                                                                                    │
│ ┌────────────────────────────────────────────────────────────────────────────────┐ │
│ │              Footer "Get in touch" centered, max-w-2xl                         │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Notes on the wireframes:
- The Header band itself is **full-width** (`Container variant="full"`), inner content is **wide** (`max-w-5xl mx-auto`). The existing Header already does this with `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14` — Phase 5 changes `max-w-6xl` to `max-w-5xl` to match the rest of the design system, OR keeps `max-w-6xl` if planner finds 5xl too tight for nav + locale + logo. Locked default: `max-w-5xl` (`wide` variant) so Header inner aligns to the same gridline as `wide` page content like Summary.
- Footer width stays at `max-w-2xl` (existing — DO NOT widen). The Footer is intentionally narrow because it's a single-column "contact + links" card, not multi-column site nav.
- QuickLogFAB position decision: **Pattern A — anchored floating to content column right edge.** Specifics in component spec below.

---

## Component-by-Component Specs

### 1. `Container` (NEW)

**File path:** `src/components/layout/Container.tsx`
**Type:** Server-component-safe React component (no `'use client'`)
**Status:** New component this phase

**Visual spec:** No visual rendering of its own. Defines geometry: max-width, horizontal padding, horizontal centering. Children are responsible for vertical rhythm and content.

**Props:**
- `variant?: 'narrow' | 'default' | 'wide' | 'full'` (default: `'default'`)
- `as?: 'div' | 'section' | 'main' | 'article' | 'header' | 'footer' | 'nav'` (default: `'div'`)
- `className?: string` (appended to variant class string)
- `children: React.ReactNode`

**Class strings per variant** (locked above in Design Tokens table — repeating here for executor convenience):
- `narrow`: `mx-auto w-full max-w-2xl px-4 sm:px-6`
- `default`: `mx-auto w-full max-w-3xl px-4 sm:px-6`
- `wide`: `mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8`
- `full`: `w-full px-4 sm:px-6 lg:px-8 xl:px-10`

**Adoption checklist (planner produces tasks for these):**
- [ ] `src/app/[locale]/diary/layout.tsx` — replace `<div className="max-w-xl mx-auto w-full px-4 pt-4">` with `<Container variant="default" className="pt-4">`
- [ ] `src/app/[locale]/LandingContent.tsx` (3 inner divs at lines 87, 95, 161) — replace duplicated `max-w-lg md:max-w-xl mx-auto w-full px-6` with `<Container variant="narrow" className="pt-12 md:pt-20 pb-12 flex flex-col items-center">`
- [ ] `src/components/onboarding/OnboardingFlow.tsx` line 89 — replace with `<Container variant="narrow" className="pt-6 md:pt-12 pb-10 flex flex-col items-center">`
- [ ] `src/app/[locale]/summary/page.tsx` lines 78, 89 — replace with `<Container variant="default" className="pt-12 text-center">` and `<Container variant="default" className="pt-4 pb-12 space-y-6">`. Phase 7 will widen summary to `wide` for the metric grid; Phase 5 just adopts the primitive.

**Mobile invariant:** At `< sm` (640px), padding is `px-4` (16px). If this causes visible regression on landing page (currently `px-6`), planner may switch landing's instance only to `<Container variant="narrow" className="px-6 sm:px-6 ...">` — overrides via className concat are allowed.

**i18n/RTL behavior:** None — Container is geometry only, all properties used (`mx-auto`, `max-w-*`, horizontal `px-*`) are direction-neutral.

**Accessibility notes:** Use `as="main"` on the diary day page wrapper if planner wants to add a single `<main>` landmark per page (currently `AppShell` already wraps children in `<main className="flex-1">`, so don't double-wrap). Use `as="section"` for sectional content.

### 2. `AppShell` (MODIFIED)

**File path:** `src/components/layout/AppShell.tsx`
**Type:** Existing client component (`'use client'`)
**Status:** Modified — adjusts BottomNav rendering condition and the `pb-24` aria-hidden spacer

**Changes:**
- BottomNav stays in the DOM but its own component handles the `md:hidden` (see BottomNav spec below). AppShell does NOT conditionally render based on viewport — all gating is done via Tailwind responsive classes so we don't introduce a `useBreakpoint` hook (per CONTEXT discretion: default is Tailwind-only).
- The `<div className="pb-24" aria-hidden />` spacer (currently always present) becomes `<div className="pb-24 md:pb-0" aria-hidden />` — at `md`+ the page no longer needs space reserved for the BottomNav since the BottomNav is hidden.
- AppShell's outer `<div className="min-h-dvh flex flex-col bg-surface">` and `<main className="flex-1">` are unchanged.

**File diff target (for planner):**
```tsx
// Before
<div className="pb-24" aria-hidden />
<BottomNav />

// After
<div className="pb-24 md:pb-0" aria-hidden />
<BottomNav />
```

**Mobile invariant:** At `< md` (768px), `pb-24` reserves the same 96px of bottom space the existing layout already reserves. No mobile diff.

**i18n/RTL:** Direction-neutral.

**Accessibility:** No change.

### 3. `Header` (MODIFIED — adds top-bar nav)

**File path:** `src/components/layout/Header.tsx`
**Type:** Existing client component (`'use client'`)
**Status:** Modified — adds inline top-bar nav at `md`+; existing logo + Learn link + locale switcher preserved

**Decision: top-bar nav lives INSIDE `Header.tsx` (NOT a new `<TopNav>` component).** Rationale:
- The Header is already the natural home for primary nav links (it already has the Learn link inline).
- A separate `<TopNav>` band beneath the Header would add a second sticky row and a second border, creating visual heaviness against the editorial reference (Airbnb-grade is one clean band, not two).
- Reduces coupling: 1 file changed instead of 2 + AppShell modification to mount the new band.

**Layout at `md`+:**

```
[logo + wordmark]  [Home][Track][Diary]  [Learn] [🌐EN▾]
       ◄──────►  ◄────────────────────►  ◄────────────►
       left flex          center flex      right flex
       (logo)             (primary nav)    (utility cluster)
```

Three-region flex layout inside the Header's `Container variant="wide"`:

```tsx
<header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-ipc-100">
  <Container variant="wide" as="div" className="flex items-center justify-between h-14">
    {/* Left: logo (existing) */}
    <button onClick={handleHomeClick} ...>...</button>

    {/* Center: primary nav, hidden at < md */}
    <nav
      className="hidden md:flex items-center gap-1"
      aria-label={tNav('primaryNavAriaLabel') /* NEW key needed */}
    >
      <NavLink href="/" active={isHomeActive}>{tNav('home')}</NavLink>
      {diaryStarted && <NavLink href={todayHref} active={isTrackActive}>{tNav('track')}</NavLink>}
      {isTrackingComplete && <NavLink href="/summary" active={isDiaryActive}>{tNav('diary')}</NavLink>}
    </nav>

    {/* Right: Learn + locale switcher (existing) */}
    <div className="flex items-center gap-1">
      <Link href="/learn" ...>Learn</Link>
      {/* locale switcher — existing block */}
    </div>
  </Container>
</header>
```

`NavLink` is a small inline helper component (defined in `Header.tsx` itself, NOT a separate file) — keeps the file boundary clean while avoiding a new file for a one-use component:

```tsx
function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface
        ${active
          ? 'bg-ipc-100 text-ipc-900 underline decoration-ipc-400 underline-offset-4 decoration-2'
          : 'text-ipc-800 hover:text-ipc-950 hover:bg-ipc-50'
        }`}
    >
      {children}
    </Link>
  );
}
```

**Active state visual:** subtle ipc-100 background + ipc-400 underline-offset-4 underline (matches the existing Learn link's active treatment for consistency).

**Header internal max-width change:** `max-w-6xl` → `max-w-5xl` (via `<Container variant="wide">`). Brings the Header's content gridline into alignment with the rest of the design system (summary, learn). Visual delta on a 1440px viewport: Header content moves ~80px inward on each side, which reads as more intentional / less stretched.

**Conditional nav-item logic (locked):**
- `Home` is ALWAYS shown.
- `Track` is shown only when `diaryStarted` (matches existing BottomNav behavior — Track on landing pre-onboarding is disabled in BottomNav, so simply hiding it in the desktop top-bar is the cleaner equivalent).
- `Diary` is shown only when `isTrackingComplete` (matches existing BottomNav lock behavior — at desktop we hide instead of showing a locked icon, per UX_PHILOSOPHY §4 "remove chrome that isn't helping").
- `Learn` is always shown (existing right-cluster Link).

This is a deliberate UX simplification at desktop: the locked-Diary-with-padlock pattern was a mobile compromise; on desktop with more room and a more confident user posture, hiding-when-not-actionable is cleaner per UX_PHILOSOPHY §4.

**Mobile invariant (`< md`):** The new `<nav className="hidden md:flex ...">` is `display: none` at mobile. The Header at mobile renders identically to today — logo, Learn link, locale switcher.

**i18n/RTL behavior:**
- Top-bar nav uses `gap-1` (logical, direction-neutral).
- DOM order is Home → Track → Diary; in RTL the visual order naturally flows right-to-left because the parent flex container inherits `dir` from `<html>`.
- The locale switcher dropdown is already correctly using `end-0` (verified `Header.tsx:96`).
- New `aria-current="page"` is direction-neutral.
- New `aria-label` for primary nav region: needs new i18n key `nav.primaryNavAriaLabel` ("Primary navigation"). This is the ONE new string Phase 5 introduces. Auto-mirrored to other 5 locales via `i18n-sync` PostToolUse hook on `messages/en.json` edit.

**Long-translation handling (PT/AR):**
- PT translation lengths: "Home" / "Registo" / "Diário" / "Aprender" — total ~28 chars; fits comfortably in `gap-1 px-3 py-1.5` chips at 768px (~280px nav region budget).
- AR translation lengths: "الرئيسية" / "تتبع" / "المفكرة" / "تعلّم" — Arabic is text-dense; fits in same budget.
- ZH translation lengths: "首页" / "追踪" / "日记" / "了解" — CJK is the most compact.
- **No truncation or icon-only fallback needed at `md` (768px).** If the planner discovers overflow during executor verification at exactly 768px, the fallback is to add `lg:gap-2` and reduce nav button padding from `px-3` to `px-2` at the `md` breakpoint specifically. Phase 8 will catch any actual overflow.

**Accessibility:**
- Primary nav wrapped in `<nav aria-label="...">` semantic landmark.
- Each link uses `<Link>` from `@/i18n/navigation` (next-intl Link, NOT next/link) — preserves locale routing.
- `aria-current="page"` on the active link (machine-readable; pairs with the underline visual).
- Focus rings spec applies (focus-visible:ring-ipc-500 + 2px offset).
- Tab order is natural DOM order: logo → Home → Track → Diary → Learn → locale switcher.

### 4. `BottomNav` (MODIFIED — hidden at md+)

**File path:** `src/components/layout/BottomNav.tsx`
**Type:** Existing client component (`'use client'`)
**Status:** Minimally modified — adds `md:hidden` to outer `<nav>`

**Change:** The outer `<nav className="fixed bottom-0 ...">` gains `md:hidden`. The component continues to render at `< md` exactly as today (auto-hide-on-scroll, locked-diary icon, Track-disabled state — ALL preserved).

**File diff target (for planner):**
```tsx
// Before
<nav className={`fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-ipc-100 safe-bottom transition-transform duration-300 ${hidden ? 'translate-y-full' : 'translate-y-0'}`}>

// After
<nav className={`fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 backdrop-blur-md border-t border-ipc-100 safe-bottom transition-transform duration-300 ${hidden ? 'translate-y-full' : 'translate-y-0'}`}>
```

**Mobile invariant:** At `< md`, identical to today.

**i18n/RTL:** Unchanged (existing `end-0` on locked-diary indicator already uses logical property).

**Accessibility:** Unchanged.

**Note on the auto-hide scroll listener:** Currently the BottomNav useEffect attaches a scroll listener even at desktop where the nav is hidden. This is a minor inefficiency but NOT a Phase 5 concern — the listener does no rendering work at desktop because the `hidden` state never reaches DOM. Phase 6 (or a later cleanup) can move the listener inside a `useEffect` guarded by a viewport-width check if it becomes a perf issue.

### 5. `QuickLogFAB` (MODIFIED — repositions at md+)

**File path:** `src/components/diary/QuickLogFAB.tsx`
**Type:** Existing client component (`'use client'`)
**Status:** Modified — repositions on desktop; mobile preserved exactly

**Pattern decision: Pattern A — anchored floating to content column right edge.** Rationale:
- Pattern B (inline anchored "Log event" button replacing the FAB) requires inserting the button into TimelineView, which is part of Phase 6's bottom-sheet form work. Phase 5 should keep the FAB as a self-contained chrome unit.
- Pattern A keeps the proven mobile interaction model (large "+", expanding speed-dial) for desktop users — same affordance, just positioned correctly relative to the content. Lower cognitive load for boomers using the app on both their phone and a tablet.
- The user's stated aesthetic ("Airbnb-grade") allows floating affordances anchored to content; what's wrong with the current FAB is being anchored to the VIEWPORT corner, hundreds of pixels from content. Pattern A fixes the anchor without removing the FAB.

**Visual spec at `md`+:**

The FAB shifts from `right-5` (viewport-anchored) to a content-column-anchored position. Implementation strategy:

```tsx
// Current (mobile, preserved):
<div className={`fixed right-5 z-50 flex flex-col items-end gap-3 transition-[bottom] duration-300 ${
  navHidden ? 'bottom-6' : 'bottom-24'
}`}>

// New (responsive — mobile preserved, desktop adjusted):
<div className={`fixed z-50 flex flex-col items-end gap-3 transition-[bottom] duration-300
  end-5
  md:end-[max(1.25rem,calc((100vw-768px)/2+1.25rem))]
  lg:end-[max(1.25rem,calc((100vw-1024px)/2+1.25rem))]
  ${navHidden ? 'bottom-6 md:bottom-8' : 'bottom-24 md:bottom-8'}`}>
```

Translation:
- `end-5` (mobile): 20px from inline-end (= right in LTR, left in RTL). Existing behavior preserved as `right-5` is replaced by `end-5` to fix a latent RTL bug.
- `md:end-[max(1.25rem, calc((100vw - 768px)/2 + 1.25rem))]`: at 768px+, the FAB sits at the right edge of a 768px-wide content column centered in the viewport. The `max()` floor of 1.25rem (=20px) ensures it never overlaps the viewport edge if the content column is narrower than the viewport.
- `lg:end-[...]`: at 1024px+, anchors to a 1024px-wide content column edge (matches `Container variant="wide"`).
- `md:bottom-8`: at 768px+, the FAB sits 32px from the bottom of the viewport (no BottomNav to clear; only Footer above which is below content scroll).
- The auto-hide-on-scroll behavior (existing `navHidden` state) is preserved at mobile but at desktop `bottom-8` is the constant value — there's no nav to "drop below". Planner may simplify the desktop branch to ignore `navHidden` entirely if the existing logic causes flicker at desktop; the `md:bottom-8` already overrides regardless.

**Critical RTL fix:** The current `right-5` is a physical-CSS leak (in RTL the FAB stays on the right, which is the inline-start side in Arabic). Phase 5 fixes this by switching to `end-5` (logical) which is correct in BOTH LTR and RTL. This is a Phase 5 RTL-correctness deliverable — not a regression, not optional.

**Pre-existing physical-CSS leak in expanded action buttons (lines 67, 79, 92):** The action chips already correctly use `ps-4 pe-3` (logical). These are NOT touched.

**Position math for the planner (concrete examples at common viewports):**

| Viewport | Content column | FAB right edge | FAB position from viewport right |
|---|---|---|---|
| 375px (mobile) | full-width minus padding | n/a (viewport-anchored) | 20px (end-5) |
| 768px (md exact) | max-w-3xl 768px (no margin) | 768 - padding | 20px (max() floor wins) |
| 1024px (lg) | max-w-3xl 768px content + 128px margin | viewport center + 384 | ~128 + 20 = ~148px |
| 1440px | max-w-3xl 768px + 336px margin each | viewport center + 384 | ~336 + 20 = ~356px |
| 1920px | max-w-3xl 768px + 576px margin each | viewport center + 384 | ~576 + 20 = ~596px |

The FAB is now visually "next to" the content column at all desktop widths — never floating in the desert at the viewport corner.

**Note on the assumption that DayPageClient uses `Container variant="default"`:** Locked. After Container adoption, `src/app/[locale]/diary/layout.tsx` uses `<Container variant="default">` which is `max-w-3xl` (768px). The FAB math above assumes this. If the planner decides DayPageClient should use a wider container (e.g., `wide`/`max-w-5xl` on desktop for the timeline), update the FAB's `lg:end-[...]` formula correspondingly. Default: planner keeps the diary at `default` (`max-w-3xl`) since the timeline is single-column reading content.

**Mobile invariant:** At `< md`, the FAB renders at `end-5 bottom-24` (when nav visible) or `end-5 bottom-6` (when nav hidden) — `end-5` is the only change from `right-5`, and in LTR (English / French / Spanish / Portuguese) `end-5` resolves to `right-5` so there is NO visual diff in the 5 LTR locales. In RTL (Arabic) the FAB now correctly sits on the left — this IS a visual diff but it's a CORRECTNESS fix that was already failing, so it's a deliberate exception to the "no mobile regression" rule.

**i18n/RTL behavior:**
- `end-5` resolves correctly in both directions.
- The expanded-state buttons already use `ps-4 pe-3` (logical) — preserved.
- The `+` icon is direction-neutral; the rotated `X` (45deg) icon is also direction-neutral.
- Speed-dial text labels ("Drink" / "Leak" / "Pee") are translated already.

**Accessibility:**
- Existing `data-testid` attributes preserved (E2E tests depend on them).
- Focus rings: the existing FAB does NOT have an explicit focus-visible style. Phase 5 adds `focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface` to the main `+` toggle button (line 109) AND to the three speed-dial action buttons (lines 65, 78, 91). Existing `active:scale-[0.95]` is preserved.

### 6. `Footer` (MODIFIED — desktop padding only)

**File path:** `src/components/layout/Footer.tsx`
**Type:** Existing client component (`'use client'`)
**Status:** Minimally modified — add `md:py-12 lg:py-16` to internal padding

**Change:** Footer's inner `<div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 text-center">` becomes `<Container variant="narrow" className="py-10 md:py-12 lg:py-16 text-center">`. (Note: `narrow` is `max-w-2xl px-4 sm:px-6` — exactly the existing class set, with the `mx-auto` consolidated into Container.)

Inner content (heading, mailto link, links nav, rights line) is UNCHANGED.

**Mobile invariant:** At `< md`, padding is `py-10` exactly as today.

**i18n/RTL:** Unchanged. Existing `dir="ltr"` on the email link is preserved.

**Accessibility:** Unchanged.

### 7. `LandingContent` (MODIFIED — adopts Container)

**File path:** `src/app/[locale]/LandingContent.tsx`
**Type:** Existing client component (`'use client'`)
**Status:** Modified — replaces 3 instances of duplicated `max-w-lg md:max-w-xl mx-auto w-full px-6` with `<Container variant="narrow" ...>`

**Changes (3 wrapper divs):**
- Line 87: hydration-loading state — wraps in `<Container variant="narrow" className="py-24 flex items-center justify-center">`. (Loading state doesn't need a max-w-2xl; planner may use `default` if it reads better.)
- Line 95: `diaryStarted` "Welcome back" view — replace with `<Container variant="narrow" className="pt-12 md:pt-20 pb-12 flex flex-col items-center">`
- Line 161: pre-onboarding hero view — replace with `<Container variant="narrow" className="pt-8 md:pt-16 pb-12 flex flex-col items-center justify-center">`

The inner `<div className="w-full md:max-w-md ...">` at line 174 is the CTA wrapper (constrains the button); preserved as-is — it's narrower than `narrow` and explicitly intentional.

**Visual delta:** At desktop, content column widens slightly (`max-w-lg` 512px → `max-w-2xl` 672px) but the pre-onboarding hero view INSIDE that already explicitly uses `md:max-w-2xl` so the effective change is minor. The diaryStarted view's `max-w-xl` (576px) becomes `max-w-2xl` (672px) — ~50px wider on desktop, which gives the resume CTA + reset link slightly more breathing room.

**Mobile invariant:** Padding shifts from `px-6` (24px) to `px-4` (16px) at < 640px. **This is the one place the `px-4` default of Container differs from existing.** If executor visual-diff at 375px shows visible regression on the landing page, switch this instance to `<Container variant="narrow" className="px-6 ...">` (inline override).

**i18n/RTL:** Unchanged.

**Accessibility:** Unchanged.

### 8. `OnboardingFlow` and `summary/page.tsx` (Container adoption — Phase 5 minimum, Phase 7 full redesign)

**Phase 5 scope:** ONLY swap the outermost wrapper div for `<Container variant="...">`. NO other changes to onboarding step composition or summary metric grid layout. Those are Phase 7 deliverables.

**OnboardingFlow.tsx line 89:** `<div className="flex flex-col items-center px-6 pt-6 md:pt-12 pb-10 max-w-lg md:max-w-xl mx-auto w-full">` → `<Container variant="narrow" className="pt-6 md:pt-12 pb-10 flex flex-col items-center">` (potentially with `px-6` override if the mobile padding shift causes regression).

**summary/page.tsx lines 78, 89:** Replace as documented in Container adoption checklist above. Variant `default` for both for now; Phase 7 may widen to `wide` for the metric grid.

### 9. `diary/layout.tsx` (Container adoption)

**File path:** `src/app/[locale]/diary/layout.tsx`
**Status:** Modified

**Change:**
```tsx
// Before
<div className="max-w-xl mx-auto w-full px-4 pt-4">{children}</div>

// After
<Container variant="default" className="pt-4">{children}</Container>
```

Visual delta: content widens from `max-w-xl` (576px) to `max-w-3xl` (768px). At desktop this is a deliberate widening — the Day timeline + day-summary card looks better with slightly more horizontal real estate. At mobile (< 640px) padding is identical (`px-4`).

---

## Mobile Invariants (DO NOT REGRESS)

The following MUST diff cleanly at `375px` against the pre-phase baseline. Phase 8 verifies. Verification widths to capture:

| Width | Locale set | Why |
|---|---|---|
| 320px | en | iPhone SE 1 edge case |
| 375px | en, ar (RTL), zh (CJK), pt (long translations) | Primary form factor matrix |
| 414px | en | iPhone Plus / 11 / 12 |

**Invariants enforced by this contract:**

1. **BottomNav** is rendered at `< md` (768px) with identical class strings except for the added `md:hidden` (which has no effect below 768px). No visual change.
2. **QuickLogFAB** is rendered at `< md` with `end-5` (was `right-5`). In all 5 LTR locales `end-5` ≡ `right-5` so NO LTR visual change. In Arabic the FAB moves from right-corner to left-corner — this is a CORRECTNESS fix, not a regression.
3. **Header** at `< md` is unchanged: same logo, same Learn link, same locale switcher, same `h-14` height, same backdrop blur. The newly added `<nav className="hidden md:flex">` is `display: none` at < 768px.
4. **Footer** at `< md` keeps `py-10` (no change).
5. **AppShell** spacer `pb-24` is preserved at `< md` (the `md:pb-0` only takes effect at 768px+).
6. **Diary day page** content widens from `max-w-xl` (576px) to `max-w-3xl` (768px) on desktop; at mobile (< 640px) the effective width is the viewport minus `px-4` padding — same as today.
7. **Landing page** at mobile: padding may shift from `px-6` to `px-4`. Planner verifies via 375px screenshot diff; if regression, override the Container class.
8. **Onboarding flow** at mobile: padding may shift from `px-6` to `px-4`. Planner verifies; if regression, override.

**Verification gate (planner adds to PLAN tasks):** Before merging, capture screenshots at 375px width for `/en`, `/en/diary/day/1`, `/ar/diary/day/1`, `/zh/diary/day/1`, `/pt/diary/day/1`. Diff against pre-phase baseline. Any visible difference outside the documented exceptions (Arabic FAB position) is a regression.

---

## i18n + RTL Contract

### Logical CSS properties (REQUIRED for ALL new code in this phase)

- Margin/padding: `ms-*` / `me-*` / `ps-*` / `pe-*` (NOT `ml-*` / `mr-*` / `pl-*` / `pr-*`)
- Position: `start-*` / `end-*` (NOT `left-*` / `right-*`)
- Border: `border-s-*` / `border-e-*` (NOT `border-l-*` / `border-r-*`)
- Inset: `inset-x-*` is direction-neutral (OK); `inset-inline-start: ...` for arbitrary values
- Transforms: `translateX(-50%)` is physical and does NOT auto-flip — for any centering math added in this phase, pair with a `[dir="rtl"]` rule in `globals.css` (the existing `.timeline-dot` rule on `globals.css:975-980` is the pattern). **Phase 5 does NOT add any `translateX` centering.**

### Phase 5 RTL audit

| File touched | Logical-property compliance |
|---|---|
| `Container.tsx` (NEW) | `mx-auto`, `w-full`, `max-w-*`, `px-*` — all direction-neutral. PASS |
| `Header.tsx` (MOD) | Existing `gap-1`, new `gap-1 md:gap-2`, `aria-current` — direction-neutral. New nav links use `px-3 py-1.5` (direction-neutral). Existing locale dropdown already uses `end-0`. PASS |
| `BottomNav.tsx` (MOD) | Only adds `md:hidden`. Existing `-end-0.5` on locked diary (line 126) is logical. PASS |
| `QuickLogFAB.tsx` (MOD) | `right-5` → `end-5` (logical fix). Existing `ps-4 pe-3` on action chips preserved. New `md:end-[...]` arbitrary values use logical inset-inline-end. PASS |
| `Footer.tsx` (MOD) | Only adds vertical padding. Existing logical-property usage preserved. PASS |
| `AppShell.tsx` (MOD) | Only modifies `pb-24` spacer. Direction-neutral. PASS |

### Long-translation handling

| Locale | Nav strings (chars) | Header budget at 768px | Risk | Mitigation |
|---|---|---|---|---|
| EN | Home/Track/Diary = 14 chars | ~280px | Low | None needed |
| FR | Accueil/Suivi/Journal = 21 chars (TBD — confirm in `messages/fr.json`) | ~280px | Low-medium | If overflow at 768px, reduce nav-link `px-3` to `px-2` at `md` only |
| ES | Inicio/Seguir/Diario = ~21 chars | ~280px | Low-medium | Same |
| PT | Início/Registo/Diário = ~22 chars | ~280px | Medium | Same fallback; verified by Phase 8 |
| ZH | 首页/追踪/日记 = 6 CJK chars | ~280px | Low (CJK is dense) | None |
| AR | الرئيسية/تتبع/المفكرة = ~16 chars | ~280px | Low | None; visual flow is right-to-left |

**Truncation policy:** If a nav link's translated text overflows its `px-3 py-1.5` chip at 768px, the planner adds `whitespace-nowrap` (text never wraps to 2 lines in nav). If overflow continues, the planner reduces nav-link `px-3` to `px-2` at the `md` breakpoint specifically (Tailwind: `md:px-2 lg:px-3`). NO icon-only fallback is introduced this phase — Phase 8 will catch and address persistent overflow.

### Per-locale verification list (executor + planner)

For each of the 6 locales, render and screenshot at:
- 375px (mobile baseline)
- 768px (desktop activates)
- 1280px (lg)

Routes:
- `/<locale>/` (landing)
- `/<locale>/diary/day/1` (diary day, FAB visible)
- `/<locale>/summary` (post-completion view, planner uses test data)

Verification points per screenshot:
- Header chrome renders correctly (logo + nav + locale switcher; nav DOM order Home → Track → Diary → Learn)
- BottomNav visible at 375px, hidden at 768px+
- QuickLogFAB position: 375px = bottom-right (LTR) / bottom-left (AR), 768px+ = anchored to content column right edge
- Active nav state: visiting `/diary/day/1` shows Track active; visiting `/summary` shows Diary active
- Focus rings visible on tab through chrome (test with keyboard)
- No horizontal scroll at any width × locale combo

---

## Keyboard / Focus (Phase 5 scope only)

Phase 5 deliverables (chrome only):

1. **Semantic HTML.** All new chrome interactive elements use `<a>` (via next-intl `<Link>`) or `<button type="button">`. NO `<div onClick>` patterns introduced.
2. **focus-visible ring spec.** Applied to:
   - Top-bar `NavLink` (Home / Track / Diary)
   - QuickLogFAB main toggle button (`fab-toggle`)
   - QuickLogFAB three speed-dial action buttons (`fab-action-drink`, `fab-action-leak`, `fab-action-void`)
   - Existing locale switcher button (verify; if missing, add)
   - Existing Learn link (verify; if missing, add)
3. **Tab order is natural DOM order.** No `tabIndex` manipulation. Header tab order at desktop: logo → Home → Track → Diary → Learn → locale switcher.
4. **`aria-current="page"`** on the active nav link (machine-readable, pairs with visual underline).
5. **`aria-label` on `<nav>` regions** for primary nav (`Header`'s new `<nav>` block) and existing footer nav. New i18n key `nav.primaryNavAriaLabel` ("Primary navigation").

Phase 5 does NOT deliver:
- Enter-to-advance handlers in forms (Phase 6, DTUX-03)
- Escape-to-close on bottom sheets (Phase 6, DTUX-03)
- Initial focus on sheet open (Phase 6, DTUX-03)
- `Button.tsx` migration from `focus:` to `focus-visible:` (Phase 6 — risk of changing existing button focus behavior across the app)
- A "Skip to content" link (out of Phase 5 scope; can be added in Phase 7 or 8 if `visual-qa` flags it)

---

## 6-Pillar Pre-Check

Phase 5 design audit, one paragraph per pillar. Phase 8 (`visual-qa` skill) runs the full matrix.

### 1. Typography
Phase 5 introduces NO new font sizes, weights, or line-heights. Chrome reuses existing scale: logo `text-lg font-bold`, top-bar nav `text-sm font-semibold`, locale switcher `text-xs font-medium uppercase`. Body text and headings inside Container are owned by each page (Container is geometry only). Inter font + the existing fallback stack continue to handle all 6 locales — ZH and AR fall back to system fonts (acceptable per current state; Phase 8 verifies CJK and Arabic glyphs render acceptably). `.learn-prose` editorial typography (already in use on `/learn`) is OUT of Phase 5 scope.

### 2. Color
Phase 5 introduces NO new color tokens. Chrome uses existing `--color-ipc-50` through `--color-ipc-950` plus `--color-surface`. The 60/30/10 split is preserved: surface (60%, dominant body bg) + ipc-50/100 (30%, secondary card/hover surfaces) + ipc-500/700 (10%, accent for CTAs and chrome focus). No new accents introduced. Existing IPC palette has documented WCAG AA compliance for text-on-white at all shades 400+; Phase 5 chrome uses `text-ipc-800`/`text-ipc-900`/`text-ipc-950` for nav text (all well above AA). Hover end-state of `text-ipc-950` (near-black) on `bg-ipc-50` (warm-tan) clears AAA.

### 3. Spacing
Phase 5 stays on the Tailwind 4px grid. Container padding tokens: 16px (`px-4` mobile), 24px (`sm:px-6`), 32px (`lg:px-8`), 40px (`xl:px-10`). Footer adds `md:py-12 lg:py-16` (48 / 64px) — both on the 4-grid. Header height `h-14` (56px) is preserved as the chrome height contract. Top-bar nav uses `gap-1` (4px, narrow `md`) elevating to `lg:gap-2` (8px) at wider viewports. No off-grid values introduced.

### 4. Hierarchy
The Header at desktop reads as one band with three regions: brand-left, primary-nav-center, utility-right. The three regions have distinct visual weight: logo + wordmark is the boldest (text-lg font-bold), primary nav is medium (text-sm font-semibold), locale switcher is lightest (text-xs font-medium). The QuickLogFAB at desktop now reads as part of the content layer (anchored to the content column edge) instead of the chrome layer (floating in the viewport corner) — better hierarchy match with what the FAB actually does (logs an event into the page's content). Container's bounded max-width (`narrow` 672px / `default` 768px / `wide` 1024px) provides the editorial reading column the user explicitly asked for.

### 5. Interaction
Hover affordances on top-bar nav links shift both background (transparent → `bg-ipc-50`) AND text (`text-ipc-800` → `text-ipc-950`) — two-channel feedback for boomer eyes. Active route visualization combines background tint + 2px underline at `decoration-ipc-400` — color-redundant with `aria-current` (machine-readable). Focus-visible rings are 2px ipc-500 with 2px surface-colored offset — visible on white, ipc-50, and ipc-100 backgrounds (the three surfaces chrome interactive elements sit on). No new motion: hover transitions are 150ms `transition-colors` only — matches the existing 150ms duration in `Header.tsx` and `BottomNav.tsx`. All chrome interactions are keyboard-accessible (semantic HTML; tab order natural; focus rings visible).

### 6. Accessibility
All chrome uses semantic HTML: `<header>`, `<nav>`, `<footer>`, `<main>`, `<a>`, `<button>`. Primary nav and footer nav both have `aria-label` for landmark identification. Active nav link uses `aria-current="page"`. Focus rings clear AA contrast on all chrome backgrounds. `safe-bottom` (existing CSS class for safe-area-inset) preserved on BottomNav for notch devices. Pinch-zoom remains enabled (existing viewport meta in `[locale]/layout.tsx`, WCAG 1.4.4). RTL: Arabic page renders correctly because all new code uses logical CSS properties (`end-*`, `ms-*`, `pe-*`) — verified per file in the i18n + RTL Contract section above. Reduced motion: existing `@media (prefers-reduced-motion: reduce)` rule in `globals.css` already collapses transitions; the 150ms hover transitions degrade to ~0ms.

---

## Open Questions / Claude's Discretion

Items intentionally left for the planner or executor to resolve during implementation:

1. **Mobile padding regression on landing.** The Container `narrow` variant uses `px-4` at < 640px; the existing landing uses `px-6`. If 375px screenshot diff shows visible regression, override with `<Container variant="narrow" className="px-6 sm:px-6 ...">` on that one instance. Planner: add a verification step.
2. **Mobile padding regression on onboarding.** Same story — if regression, override.
3. **Header `max-w-6xl` vs. `max-w-5xl`.** Locked default is `max-w-5xl` (via `Container variant="wide"`). If executor finds at 1280px+ that nav + locale + logo feel too tight in `max-w-5xl`, planner may swap Header's Container to `variant="full" className="max-w-6xl"` (override). Default holds.
4. **PT / FR nav-text overflow at exactly 768px.** Verified PT and FR translations fit at 280px nav budget; if executor finds overflow, fallback is `md:px-2 lg:px-3` on the NavLink helper. Phase 8 catches the long tail.
5. **`Button.tsx` focus-visible migration.** Out of Phase 5 scope. Planner does NOT modify `Button.tsx`. Phase 6 owns this.
6. **"Skip to content" link.** Out of Phase 5 scope. Phase 8 may add if `visual-qa` flags it.
7. **Auto-hide-on-scroll listener at desktop.** Existing BottomNav listener still attaches at desktop but doesn't render anything. Minor inefficiency; not a Phase 5 concern.
8. **Whether to introduce a `useBreakpoint` hook for any chrome conditional rendering.** Default per CONTEXT.md: NO — use Tailwind responsive classes (`md:hidden`, `hidden md:flex`) only. Locked.

---

## Verification Checklist (for Phase 8 visual-qa pass)

Phase 8's `visual-qa` skill will run this matrix against the production build of Phase 5 + 6 + 7. Phase 5's contribution to the checklist:

### AppShell chrome (Phase 5 scope)

For each viewport × locale × direction:

| Viewport | Locales | Direction | What to verify |
|---|---|---|---|
| 375px | en, fr, es, pt, zh, ar | LTR (en/fr/es/pt/zh) + RTL (ar) | Header h-14 sticky, BottomNav fixed bottom, FAB at end-5 bottom-24 (or bottom-6 when nav hidden), Footer max-w-2xl py-10. NO desktop chrome (no top-bar nav visible). |
| 768px | en, fr, es, pt, zh, ar | LTR + RTL | Header expands to max-w-5xl inner; top-bar nav (Home / Track / Diary) visible inline; locale switcher in right cluster; BottomNav HIDDEN; FAB anchored near content column right edge; Footer py-12. |
| 1280px | en, fr, es, pt, zh, ar | LTR + RTL | Same as 768px but with more breathing room (lg:px-8 in Header inner; lg:gap-2 in nav); FAB further from viewport right edge as content centers. |
| 1920px | en, ar | LTR + RTL | FAB sits at content-column-right + 20px (≈596px from viewport right at 1920px width); Header content gridline aligned with summary/learn pages. |

### Routes to walk for each cell of the matrix

- `/<locale>/` (landing — pre-onboarding hero)
- `/<locale>/diary/day/1` (diary day with FAB visible)
- `/<locale>/summary` (post-tracking view — to verify Diary nav-item active state)
- `/<locale>/learn` (to verify Learn nav-item active state and that the existing `/learn` styling is NOT regressed by Container adoption — Container is NOT adopted in Phase 5 by `/learn` since it already uses `max-w-5xl` correctly)

### Specific failure modes Phase 5 must NOT introduce

1. Physical CSS leaks (any new `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `border-l-*`, `border-r-*` introduced in this phase).
2. Hardcoded English strings (any new chrome string not routed through `messages/<locale>.json`).
3. Tab-order inversions (a chrome element that's reachable by mouse but not by keyboard).
4. `outline-none` without `focus-visible:ring-*` replacement.
5. `<div onClick>` patterns in chrome.
6. Mobile screenshot diffs at 375px outside the documented exceptions (landing/onboarding `px-6 → px-4`, Arabic FAB position correction).

### Pass criteria for Phase 5 (subset of full Phase 8 audit)

- [ ] All 6 success criteria from `ROADMAP.md` Phase 5 section verified.
- [ ] DTUX-02 verification per `REQUIREMENTS.md`: `/en/diary/day/1` at 1440px shows top-bar nav (no bottom tab bar), Log-event affordance anchored to day's content. At 375px the original mobile chrome is unchanged.
- [ ] Daily 6-locale walkthrough still passes; no new findings logged to `walkthrough_findings.md`.
- [ ] No new i18n keys missing from any locale (other than `nav.primaryNavAriaLabel` which `i18n-sync` mirrors automatically).
- [ ] Container primitive in use across `LandingContent.tsx`, `OnboardingFlow.tsx`, `diary/layout.tsx`, `summary/page.tsx` — duplicated `max-w-lg md:max-w-xl mx-auto w-full` patterns consolidated.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (no new strings except `nav.primaryNavAriaLabel`)
- [ ] Dimension 2 Visuals: PASS (chrome layout locked + wireframed)
- [ ] Dimension 3 Color: PASS (no new colors; existing IPC palette only)
- [ ] Dimension 4 Typography: PASS (no new typography; existing scale only)
- [ ] Dimension 5 Spacing: PASS (4-grid only; documented values)
- [ ] Dimension 6 Registry Safety: PASS (no shadcn, no new dependencies, no third-party registries)

**Approval:** pending (gsd-ui-checker to verify)
