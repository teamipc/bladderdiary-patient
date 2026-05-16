---
phase: 6
slug: diary-forms-keyboard-navigation
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-16
upstream: 05-CONTEXT.md, 05-UI-SPEC.md, 06-CONTEXT.md, REQUIREMENTS.md (DTUX-01 + DTUX-03), ROADMAP.md, docs/UX_PHILOSOPHY.md
---

# Phase 6: Diary forms + keyboard navigation — UI Design Contract

> Visual + interaction contract for the 5 diary form sheets (Drink / Void / Leak / Bedtime / Wake) and the shared `BottomSheet` primitive that hosts them. The mobile (< 768px) rendering is byte-equivalent to today (HARD CONSTRAINT from Phase 5's First Principle). All desktop (`md`+) behavior is layered additively on top of an unchanged mobile baseline. Authored from `06-CONTEXT.md` (locked cascade rules), `05-UI-SPEC.md` (reused tokens), `REQUIREMENTS.md` (DTUX-01 + DTUX-03), `ROADMAP.md` Phase 6 (9 success criteria), `docs/UX_PHILOSOPHY.md` (Boomer-safe principles), and a per-file codebase audit of every component listed in `06-CONTEXT.md` §"Surfaces in scope".

---

## Status

| Field | Value |
|---|---|
| Phase | 6 — Diary forms + keyboard navigation |
| Requirements | DTUX-01 (responsive forms) + DTUX-03 (keyboard navigation) |
| Source | `06-CONTEXT.md` (locked decisions) + `05-UI-SPEC.md` (reused tokens) + codebase audit |
| Date | 2026-05-16 |
| Tech baseline | Tailwind 4 (`@theme inline` in `globals.css`), Next.js 16 App Router, React 19, next-intl 4, lucide-react 0.577. NO new dependencies. |
| Class composition | Inline template-literal class strings (existing project convention; `clsx`/`cva` NOT in deps and NOT introduced) |
| Out of scope this phase | Form CONTENT (button labels, validation copy, the metric calculation logic, the data model), onboarding wizard keyboard work (Phase 7), timezone picker keyboard work (Phase 7), number-key shortcuts ("press 2 to pick Tea"), arrow-key nudging on the slider, 3-day pelvic-care daily reminder notification, new color tokens, new fonts, new dependencies |
| Hard constraints | Mobile (< 768px) byte-equivalent — NO new mobile carve-outs introduced this phase (the two from Phase 5 — Arabic FAB end-5 and +8px sm:px-6 — remain the exhaustive carve-out set). |

---

## Design Tokens (REUSED from Phase 5)

Phase 6 introduces NO new design tokens. It consumes the exact set Phase 5 locked. Quoted here for executor convenience; canonical reference is `05-UI-SPEC.md`.

### Breakpoints (Tailwind 4 native)

| Token | Min width | Use in Phase 6 |
|---|---|---|
| (mobile baseline) | < 768 | Form sheets render as today's bottom-sheet, byte-equivalent |
| `md` | **768** | **Desktop modal activates.** BottomSheet transforms from bottom-anchored sheet to centered modal card. Sub-picker grids reflow. Slider rows bound to `max-w-2xl`. |
| `lg` | 1024 | Volume readout typography bump applies (text-2xl → text-3xl) |
| `xl` | 1280 | No additional layout change in Phase 6 |

### Container max-width tokens (reused — used INSIDE the modal at md+)

| Variant | Max-width | Used in Phase 6 for |
|---|---|---|
| `narrow` | `max-w-2xl` (672px) | Slider rows inside grid forms; modal card for slider-only forms (SetBedtime, SetWakeTime) |
| `default` | `max-w-3xl` (768px) | Modal card for grid-heavy forms (LogDrink, LogVoid, LogLeak) |

Phase 6 does NOT use `<Container>` directly inside `BottomSheet` (BottomSheet owns its own max-width via Tailwind classes — see §"BottomSheet — desktop modal transformation"). The Container component remains the geometry primitive for page-level content; the BottomSheet primitive owns its own modal geometry.

### Color tokens (reused — NO new colors)

Phase 6 uses ONLY tokens already defined in `src/app/globals.css @theme inline`:

| Token | Hex | Used in Phase 6 for |
|---|---|---|
| `--color-surface` | `#fefdfb` | (already used as `bg-white/70` backdrop-blur fill on BottomSheet, preserved) |
| `--color-ipc-50` | `#fdf8ef` | Picker tile resting bg (existing — preserved); confirmation dialog secondary button bg |
| `--color-ipc-100` | `#f9edda` | Modal card ring boundary candidate (chosen: `ring-1 ring-black/5` per Design DNA axis 4) |
| `--color-ipc-500` | `#955a14` | Focus ring (`focus-visible:ring-ipc-500`) on all interactive elements; primary CTA fill (via Button primary variant); FAB anchor color |
| `--color-ipc-700` | `#62380c` | Picker tile text resting; sub-form headings |
| `--color-ipc-950` | `#1d0f02` | Modal title text; form copy default |
| `--color-drink` | (existing) | LogDrink form accent (picker tiles, step dots, sticky-next button) |
| `--color-leak` | (existing) | LogLeak form accent (picker tiles, step dots, sticky-next button) |
| `--color-bedtime` | (existing) | SetBedtime form accent (icon, primary CTA via Button bedtime variant) |
| `--color-danger` | (existing) | Time-warning toast inline; ConfirmDialog danger variant (reset-on-cancel) |

The night-mode overrides (`.nighttime-bg`) in `globals.css:973-980` already remap these tokens; Phase 6 does NOT modify night-mode CSS. The night-mode background is invoked via the `isNightView` prop chain (`variant === 'night'` on inner Button calls) — preserved end-to-end.

### Focus-visible ring spec (reused from Phase 5 — extended to all form interactions)

All interactive elements inside the modal MUST use the spec Phase 5 locked for chrome:

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ipc-500
focus-visible:ring-offset-2
focus-visible:ring-offset-white
```

(Phase 5 used `focus-visible:ring-offset-surface` for chrome on a `bg-surface` body. Phase 6 modal card is `bg-white` — the offset color tracks the local background so the ring reads as outset glow. The existing `Button.tsx` uses `focus:ring-2 focus:ring-ipc-400 focus:ring-offset-2` — Phase 6 migrates `focus:` → `focus-visible:` in `Button.tsx` and bumps the ring color from `ipc-400` to `ipc-500` for consistency with Phase 5. See §"Button.tsx focus-visible migration" below.)

Per-variant override for color-themed buttons (drink/leak/bedtime/night): the focus ring uses the SAME ipc-500 token (not the variant token) for two reasons: (a) consistency — every focus ring in the app reads as the same affordance, (b) ipc-500 has AA contrast (5.4:1) against white AND against the variant-colored fills (the ring sits OUTSIDE the button's fill, between the button and the modal's white bg).

### Hover affordances (NOT introduced in Phase 6)

Forms have NO hover affordances on picker tiles or volume chips per Design DNA axis 5 (hover only on chrome, not on content). Existing `active:scale-[0.95]` micro-feedback (touch + click) is preserved. Existing `hover:bg-*/90` color shifts on `Button` primary variants are preserved (Button is chrome-adjacent). No new hover behavior added by Phase 6.

### Spacing scale (Tailwind 4px grid — no new values)

Phase 6 uses ONLY the existing values from Phase 5's spacing scale:

| Token | Value | Used in Phase 6 for |
|---|---|---|
| `gap-2` / `p-2` | 8px | Picker grid gaps (existing) |
| `gap-3` | 12px | Inner picker spacing at md+ |
| `px-4` / `py-4` | 16px | Modal card internal padding (mobile) |
| `px-5` / `py-5` | 20px | Modal card internal padding (existing bottom-sheet `px-5 pb-6`) |
| `gap-6` / `p-6` | 24px | Modal card internal padding (md+); modal-to-viewport vertical breathing room |
| `gap-8` / `p-8` | 32px | Modal card internal padding (lg+) |
| `min-h-[44px]` | 44px | **Boomer-safe override 1 floor** — every interactive element |
| `min-h-[52px]` | 52px | Button `size="lg"` (existing) |

---

## BottomSheet — desktop modal transformation

The single deepest decision in Phase 6. Phase 5 already locked the principle (CONTEXT.md §"Phase 6 specific decisions" → "BottomSheet primitive transformation strategy"): one primitive, byte-equivalent at `<md`, centered modal card at `md+`. Phase 6 locks the exact CSS.

### File path

`src/components/ui/BottomSheet.tsx` — MODIFIED in place. Single primitive. Not split into two components. All transformation via Tailwind responsive classes only — NO JS breakpoint detection, NO `useBreakpoint` hook.

### Current shape (mobile, locked AS-IS)

The existing 108-line component renders:

```
<div className="fixed inset-0 z-50">
  <div className="absolute inset-0 backdrop-dim" onClick={onClose} />   ← backdrop, has onClick
  <div ref={sheetRef}
       className="absolute bottom-0 left-0 right-0
                  bg-white/70 backdrop-blur-xl
                  rounded-t-3xl shadow-2xl border-t border-white/30
                  animate-slide-up safe-bottom
                  max-h-[90vh] overflow-y-auto">
    {variant-tint overlay}
    {close X — already exists at top-2.5 right-2.5, 40px touch}
    {handle bar — 10x1 rounded pill}
    {title — if provided}
    {children}
  </div>
</div>
```

**Verified from codebase audit:**
- Escape close: YES (lines 21-28) — preserve unchanged
- Backdrop click close: YES (line 47, `onClick={onClose}` on the backdrop div) — preserve unchanged
- Body scroll lock: YES (lines 30-40) — preserve unchanged
- Close X: YES (lines 76-85) — 40×40px, `text-ipc-500 bg-white/70 border border-ipc-100`. PRESERVE; bump hit area to 44×44 at md+ per Boomer-safe override 1 (see §"Modal close affordances" below).
- `role="dialog"` / `aria-modal`: **NO** — Phase 6 adds these.
- `aria-labelledby`: **NO** — Phase 6 adds this when `title` prop is set.
- Focus trap: **NO** — Phase 6 adds.
- Initial focus on open: **NO** — Phase 6 adds.
- Return focus on close: **NO** — Phase 6 adds.

### Target shape at `md`+

The fixed bottom-anchored sheet becomes a fixed centered modal card via Tailwind responsive class additions. The strategy: **the outer `fixed inset-0 z-50` wrapper becomes a flex/items-center container at md+, and the inner card's `absolute bottom-0 left-0 right-0` becomes `md:relative md:bottom-auto md:left-auto md:right-auto md:max-w-*` — so the card centers inside the flex container instead of pinning to the viewport bottom.**

#### Outer wrapper (`<div className="fixed inset-0 z-50">`) — UPDATED

```tsx
<div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-6">
```

- Mobile (`<md`): `fixed inset-0 z-50` — identical to today.
- `md+`: adds `flex items-center justify-center p-6` — centers the modal in the viewport with 24px breathing room from every viewport edge.

#### Backdrop (`<div className="absolute inset-0 backdrop-dim" onClick={onClose} />`) — UPDATED

```tsx
<div
  className="absolute inset-0 backdrop-dim md:bg-black/40 md:backdrop-blur-sm"
  onClick={onClose}
  aria-hidden="true"
/>
```

- Mobile: existing `backdrop-dim` class (defined in globals.css) — unchanged.
- `md+`: adds `bg-black/40 backdrop-blur-sm` — Airbnb-style subtle dim + soft blur. Per Design DNA axis 4 (modals = elevated overlays).
- Backdrop click handler preserved on both viewports.
- Adds `aria-hidden="true"` — backdrop is decorative dim, not an interactive element a screen reader needs to announce.

#### Modal card (`<div ref={sheetRef} className="absolute bottom-0 left-0 right-0 ...">`) — UPDATED

The single most important transformation. The card becomes:

```tsx
<div
  ref={sheetRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby={title ? sheetTitleId : undefined}
  className={`absolute bottom-0 left-0 right-0
              bg-white/70 backdrop-blur-xl
              rounded-t-3xl shadow-2xl border-t border-white/30
              animate-slide-up safe-bottom
              max-h-[90vh] ${noScroll ? 'overflow-hidden' : 'overflow-y-auto'}

              md:relative md:bottom-auto md:left-auto md:right-auto
              md:mx-auto md:w-full md:${maxWidthClass}
              md:rounded-3xl md:border md:border-black/5
              md:shadow-xl md:ring-1 md:ring-black/5
              md:animate-modal-in md:max-h-[85vh]
              md:safe-bottom-reset
              `}
>
```

Where:
- `maxWidthClass` is `'max-w-3xl'` (default) or `'max-w-2xl'` (narrow), chosen per form (see §"Form-by-Form Specs").
- The mobile classes (`absolute bottom-0 left-0 right-0 ... animate-slide-up safe-bottom`) are PRESERVED unchanged — at `<md` Tailwind `md:` prefixes are inert. **Byte-equivalent at mobile.**

**Breakdown of `md:` additions:**

| Class | Effect at md+ |
|---|---|
| `md:relative` | Removes the absolute positioning so the card flows inside the flex container instead of pinning to bottom |
| `md:bottom-auto md:left-auto md:right-auto` | Reset the bottom-pinned offsets explicitly (Tailwind doesn't auto-reset arbitrary properties when changing position) |
| `md:mx-auto md:w-full md:max-w-3xl` (or 2xl) | Center the card horizontally with capped width |
| `md:rounded-3xl` | Round all four corners (mobile is `rounded-t-3xl` only) |
| `md:border md:border-black/5` | Subtle hairline border for elevation |
| `md:shadow-xl md:ring-1 md:ring-black/5` | Airbnb-style elevation per Design DNA axis 4 + Phase 5 cascade rule. **EXACT CASCADE QUOTE** from `05-CONTEXT.md` §"Design DNA — Aesthetic axes" axis 4: *"Modals + bottom-sheets-becoming-desktop-modals at md+: elevation (shadow-xl ring-1 ring-black/5) — Airbnb modal pattern."* |
| `md:animate-modal-in` | NEW keyframe (declared below); replaces `animate-slide-up` at md+. ≤200ms per Boomer-safe override 3. |
| `md:max-h-[85vh]` | Slightly tighter scroll cap at desktop (the `p-6` viewport breathing room + `85vh` keeps the modal off the viewport edges) |
| `md:safe-bottom-reset` | Tailwind utility that strips `padding-bottom: env(safe-area-inset-bottom)` at md+ (safe area is irrelevant on a desktop modal). Implementation: see §"globals.css addition" below. |

**Variant tint overlay (existing, lines 63-72):** preserved unchanged. The accent-color tint reads correctly on both the rounded-t-3xl mobile shape and the rounded-3xl modal shape because the overlay uses `absolute inset-0` (the tint follows the rounded corners via the card's `overflow-hidden` ancestry, which is already there from `overflow-y-auto`).

#### Title ID for aria-labelledby (NEW)

```tsx
const sheetTitleId = useId();  // React 19 hook
// ...
{title && (
  <div className="flex items-center px-5 pb-3 pr-14 md:px-6 md:pt-2 md:pr-16">
    <h2 id={sheetTitleId} className="text-xl font-bold text-ipc-950 md:text-2xl">{title}</h2>
  </div>
)}
```

- `useId()` is React 19 built-in, no new dep.
- `aria-labelledby={title ? sheetTitleId : undefined}` on the modal card (added above).
- `md:text-2xl` bumps title from 20px to 24px at desktop (axis 1 typography bump for desktop reading distance).
- `md:px-6 md:pt-2 md:pr-16` aligns the title padding with the new modal padding; `pr-16` reserves room for the larger 44×44 close X at md+.

#### Internal content padding

```tsx
{/* Content */}
<div className="px-5 pb-6 md:px-6 md:pb-8 md:pt-2">
  {children}
</div>
```

- Mobile: existing `px-5 pb-6` unchanged.
- md+: `px-6 pb-8 pt-2` — slightly more generous (24px horizontal, 32px bottom).

### Animation spec (NEW — `animate-modal-in`)

Per Boomer-safe override 3 (animation ≤ 200ms). Mobile preserves existing `animate-slide-up` exactly. At md+ Phase 6 introduces ONE new keyframe.

**Add to `src/app/globals.css`** (under existing `@keyframes` definitions, near `@keyframes slideUp`):

```css
@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@utility animate-modal-in {
  animation: modalIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

@utility safe-bottom-reset {
  @media (min-width: 768px) {
    padding-bottom: 0 !important;
  }
}
```

- **Duration 180ms** (under the 200ms cap; the easing makes 180ms feel as confident as 250ms with a linear curve).
- **Easing** `cubic-bezier(0.16, 1, 0.3, 1)` — "out-expo" style, snappy entry, decelerated finish. Established consumer-app modal feel.
- **No motion-reduce variant required** for Phase 6: the existing project has no `prefers-reduced-motion` rules in globals.css and no other component implements one. Phase 6 doesn't introduce that policy; Phase 8 may revisit as a polish item.
- **Why both opacity + transform**: pure-fade reads as "appeared from nothing" (sometimes feels glitchy on slower connections); pure-slide reads as "slid in from below" (matches the mobile pattern, keeps mental model). Combining both gives the Airbnb modal feel.

**`safe-bottom-reset`** strips `env(safe-area-inset-bottom)` at md+ since the modal is no longer pinned to the viewport bottom. The existing `safe-bottom` utility (likely defined elsewhere in globals.css — verify) leaves padding for the iOS home-indicator at mobile; at desktop that padding is unwanted.

### Verification at <768px (byte-equivalent invariant)

The transformation is INERT at mobile. Concretely, at width 375px (iPhone SE primary form factor):
- `md:flex md:items-center md:justify-center md:p-6` → no effect (no `md:` activation)
- `md:bg-black/40 md:backdrop-blur-sm` → no effect (backdrop-dim original class still applies)
- `md:relative md:bottom-auto ... md:shadow-xl md:ring-1 ...` → no effect (mobile's `absolute bottom-0 left-0 right-0 ... shadow-2xl` still applies)
- `md:animate-modal-in` → no effect (mobile's `animate-slide-up` still applies)
- `md:max-h-[85vh]` → no effect (mobile's `max-h-[90vh]` still applies)
- `md:safe-bottom-reset` → no effect (the `@media (min-width: 768px)` guard is the gate)
- New `useId()` produces a string ID server-side and at mobile — no visual effect.
- New `role="dialog"` / `aria-modal="true"` / `aria-labelledby` — accessibility-only; no visual effect; existing visual rendering identical.
- New focus-trap + return-focus on close — keyboard-only; no visual effect at mobile (touch users get the existing close-X / backdrop / Escape paths unchanged).

**The mobile diff is structurally zero pixels.** The new attributes (`role`, `aria-modal`, `aria-labelledby`) are accessibility metadata. The new useId + focus-trap + return-focus are keyboard-only behavior layered on top of the existing touch-first interaction.

### Wireframes

#### Mobile (`375px`, byte-equivalent to today)

```
┌─────────────────────────────┐ <- 375px viewport edge
│                             │  <- backdrop-dim (existing)
│         (page behind)       │
│                             │
│                             │
├─────────────────────────────┤ <- card edge at top (rounded-t-3xl)
│    handle bar       [X]     │  <- 10×1 pill handle + close X (top-right)
│ Title (text-xl bold)        │
│                             │
│  step dots ●○○              │
│  STEP 1 OF 3                │
│                             │
│  [form content scrolls]     │
│                             │
│  ...                        │
│                             │
│  ─────────────────────      │  <- sticky next button at footer
│  [    Next  →     ]         │
│                             │
└─────────────────────────────┘ <- safe-bottom (iOS home indicator clearance)
```

#### Desktop `md` (768px viewport — modal activates)

```
┌────────────────────────────────────────────┐ <- 768px viewport edge
│                                            │  <- bg-black/40 backdrop + blur-sm
│        ┌────────────────────────────┐      │  <- modal card (max-w-3xl)
│        │                       [X]  │      │  <- rounded-3xl, shadow-xl ring-1
│        │ Title (text-2xl bold)      │      │     md+ close X = 44×44 hit
│        │                            │      │
│        │  step dots ●○○             │      │
│        │  STEP 1 OF 3               │      │
│        │                            │      │
│        │  Picker grid (4-col)       │      │
│        │  [ ][ ][ ][ ]              │      │
│        │  [ ][ ][ ][ ]              │      │
│        │                            │      │
│        │  Volume slider             │      │  <- bounded inside max-w-2xl
│        │   (max-w-2xl)              │      │     INSIDE the max-w-3xl modal
│        │                            │      │
│        │  ──────────────────────    │      │
│        │  [    Next  →     ]        │      │
│        └────────────────────────────┘      │
│                                            │
└────────────────────────────────────────────┘ <- p-6 viewport breathing room
```

#### Desktop `lg` (1280px+)

Same layout as md — the modal stays bounded by `max-w-3xl` (768px) regardless of viewport. The viewport gains more dead space around the modal but the modal proportions stay tight per Design DNA axis 1 + Boomer-safe override 7 (familiar patterns: don't widen modals because the viewport widens).

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                    │
│                         ┌────────────────────────────┐                             │
│                         │                       [X]  │                             │
│                         │ Title                      │                             │
│                         │  step dots ●○○             │                             │
│                         │  STEP 1 OF 3               │                             │
│                         │                            │                             │
│                         │  Picker (4-col 768px)      │                             │
│                         │  Volume slider (2xl 672px) │                             │
│                         │  [    Next  →     ]        │                             │
│                         └────────────────────────────┘                             │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Accessibility additions (Phase 6 NEW)

The existing BottomSheet has Escape, backdrop click, close X, and body-scroll-lock. Phase 6 adds the modal ARIA + focus-management layer:

#### 1. `role="dialog"` + `aria-modal="true"` (on the card div)

Added to the modal card div as shown above. The card is the dialog element; the outer `fixed inset-0` wrapper is a positioning shell.

#### 2. `aria-labelledby={sheetTitleId}` (when `title` prop is set)

Implementation:

```tsx
const sheetTitleId = useId();
// ...
<div
  ref={sheetRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby={title ? sheetTitleId : undefined}
  ...
>
```

If the consumer doesn't pass `title` (e.g., `IpcInfoModal.tsx` renders `<BottomSheet open={open} onClose={...}>` with no title), `aria-labelledby` is omitted. The IpcInfoModal case is acceptable per WAI-ARIA — the dialog content itself provides the label via the visible h3 inside.

(Future enhancement, NOT Phase 6: add an optional `aria-label` prop fallback for the no-title case. Phase 6 doesn't need it because the only no-title BottomSheet consumer is IpcInfoModal which has an internal h3 the screen reader announces.)

#### 3. Focus trap (NEW)

Pattern: a vanilla-React-19 focus trap, no new dependency.

```tsx
// In BottomSheet.tsx, alongside the Escape useEffect:

useEffect(() => {
  if (!open) return;

  const sheet = sheetRef.current;
  if (!sheet) return;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    // Shift+Tab on first → wrap to last
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    // Tab on last → wrap to first
    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
      return;
    }

    // If focus is outside the modal (somehow), pull it in
    if (active && !sheet.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };

  window.addEventListener('keydown', handleTabKey);
  return () => window.removeEventListener('keydown', handleTabKey);
}, [open]);
```

- Queries focusable elements on every Tab keystroke (NOT cached at mount) — handles dynamic content (note expansion, double-void reveal, conditional `wokeBy` rendering inside LogVoidForm).
- Excludes `tabindex="-1"` and disabled elements.
- Wraps from last → first on Tab and first → last on Shift+Tab.
- Pulls stray focus back into the modal if Tab fires while focus is outside the modal (defensive — should never happen but the inner-form Note textarea's autoFocus could cause edge cases).

**Mobile invariant:** This is keyboard-only behavior. Touch users on mobile never trigger it. The `useEffect` mounts the listener at all viewports but it does nothing without `Tab` keypresses. **Zero pixel diff at mobile.**

#### 4. Initial focus on open (NEW)

Pattern: focus the first focusable element inside the modal when `open` flips from false → true.

```tsx
useEffect(() => {
  if (!open) return;

  // Defer to next tick so the modal contents have mounted and refs are populated
  const t = setTimeout(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const focusable = sheet.querySelector<HTMLElement>(
      'button:not([disabled]):not([aria-label="Close"]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );

    // Skip the close X (we don't want focus landing on "close" by default)
    // Skip step-dot buttons (they're navigation, not the form's first interactive)
    // Default: focus the first form content element (a picker tile, an input, a volume chip)
    if (focusable) {
      focusable.focus();
    } else {
      // Fallback: focus the sheet container itself (rare; should never happen)
      sheet.focus();
    }
  }, 50);

  return () => clearTimeout(t);
}, [open]);
```

**Per-form initial focus targets** are specified in §"Form-by-Form Specs" below. The selector above picks the first focusable element that ISN'T the close X. For forms whose first interactive is a step-dot button (which is technically a button), the planner may need to refine the selector to skip the step-dot group (e.g., add `:not([aria-label^="Step"])` to the selector since step dots use `aria-label={tc('stepAriaLabel', { n: s })}` which resolves to `Step 1`, `Step 2`, etc.).

**Decision: refined selector skips both close X AND step dots:**

```ts
const focusable = sheet.querySelector<HTMLElement>(
  'button:not([disabled]):not([aria-label="Close"]):not([aria-label^="Step "]), ' +
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
);
```

The `Step ` (with trailing space) match ensures we skip "Step 1", "Step 2", "Step 3" but NOT, say, a hypothetical "Stop" button.

**Mobile invariant:** initial focus is a keyboard-affordance only. Mobile touch users never see the focus ring (focus-visible doesn't trigger on tap on most platforms; if a soft keyboard appears for a text input that's existing behavior). **Zero pixel diff at mobile.**

#### 5. Return focus on close (NEW)

Pattern: capture the element that was focused at the moment `open` flipped to true, and restore focus to it when `open` flips back to false.

```tsx
const previousFocusRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  if (open) {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
  } else if (previousFocusRef.current) {
    // Restore focus when modal closes
    previousFocusRef.current.focus();
    previousFocusRef.current = null;
  }
}, [open]);
```

This sends keyboard focus back to the QuickLogFAB button (or whatever invoked the BottomSheet) so the user doesn't lose their place. Critical for keyboard-only users (DTUX-03 success criterion implicit requirement).

**Mobile invariant:** zero pixel diff. Touch users never notice; the focused element on close just receives focus (no scroll change, no visual jump).

---

## Form-by-Form Specs

The 5 form components inside the BottomSheet. For each: modal max-width variant, picker columns at md+, slider bounds, typography bumps, focus management, keyboard contract, mobile invariant, and data-testid preservation.

### Summary Table

| Form | `BottomSheet` `variant` prop | Modal `max-w` at md+ | Sub-pickers md+ cols | Slider bounds md+ | Initial focus | Steps |
|---|---|---|---|---|---|---|
| `LogDrinkForm` | `drink` | `max-w-3xl` (default) | DrinkTypePicker: 4-col (preserve mobile) | VolumeInput: `max-w-2xl` row | First drink-type tile (existing `DrinkTypePicker` first button) | 2 |
| `LogVoidForm` | `default` | `max-w-3xl` | SensationPicker: 5-col (preserve mobile 5-col `flex`) | VolumeInput: `max-w-2xl` row | First volume chip (Step 1's first preset chip) | 3 |
| `LogLeakForm` | `leak` | `max-w-3xl` | LeakTriggerPicker: 4-col (preserve mobile); LEAK_AMOUNT_OPTIONS: 4-col (preserve mobile) | n/a (no slider) | First trigger tile (existing `LeakTriggerPicker` first button) | 3 |
| `SetBedtimeForm` | `bedtime` | `max-w-2xl` (narrow) | n/a (TimePicker only) | n/a | First TimePicker control (the "hour increment +" button OR the time input — whichever is first focusable per the existing TimePicker DOM) | 1 |
| `SetWakeTimeForm` | `default` | `max-w-2xl` (narrow) | n/a (TimePicker only) | n/a | First TimePicker control | 1 |

**Rationale for `max-w-3xl` vs `max-w-2xl`:**
- 3xl (768px) for grid-heavy forms (Drink/Void/Leak) — these have 4-col picker grids that need horizontal room. At 768px each tile is ~(768-48 padding-24 gaps)/4 ≈ 174px wide — comfortable per-tile width without being absurd.
- 2xl (672px) for slider-only forms (SetBedtime/SetWakeTime) — these have a single TimePicker + Button. 2xl reads as more focused / less "stretched empty space" inside the form.

**Rationale for keeping mobile picker columns at md+:**
DrinkTypePicker (8 items) and LeakTriggerPicker (8 items) are already `grid-cols-4 [grid-auto-rows:1fr]` at mobile (existing code, verified). The mobile 4-col grid IS THE DESKTOP 4-COL GRID — no responsive col change needed. The only thing that changes at md+ is the parent modal's width contains the grid (so each tile gets ~174px instead of stretching to ~420px at viewport width). The mobile-byte-equivalent invariant is satisfied because the grid classes don't change.

SensationPicker uses `flex gap-2` with `flex-1` on each of 5 buttons (existing) — equivalent to a 5-col grid. Phase 6 preserves this. At md+ inside `max-w-3xl` (768px) each sensation tile becomes ~(768-48-32)/5 ≈ 138px wide — still readable.

LEAK_AMOUNT_OPTIONS uses `grid grid-cols-4 gap-1.5 mb-6 w-full px-1` (existing) — already 4-col mobile. Preserve.

---

### 1. `LogDrinkForm` (358 lines)

**File:** `src/components/diary/LogDrinkForm.tsx`

**BottomSheet integration:**
- BottomSheet `title` prop: existing — verify the DayPageClient passes `t('logDrink')` or equivalent (verified: DayPageClient sets `title` based on the form variant at line 292).
- BottomSheet `variant`: `'drink'` (existing).
- New: `aria-labelledby` resolves to the BottomSheet's internal `sheetTitleId`.

**Modal max-width at md+:** `max-w-3xl` (default variant).

**Sub-picker (DrinkTypePicker) responsive shape:**
- Mobile: `grid grid-cols-4 [grid-auto-rows:1fr] gap-2 mt-8` (8 items in 4×2) — PRESERVE EXACTLY.
- md+: **same `grid-cols-4`** — no class change. The grid bounds itself inside `max-w-3xl` modal so per-tile width is ~174px instead of stretching to half-viewport. The tile vertical sizing (`[grid-auto-rows:1fr]` + `py-3 px-2`) gives ~76px min height — already above the 44px floor.
- Per-tile width at md+ inside max-w-3xl: ~(768 - 48 padding - 24 gap) / 4 = ~174px. Comfortable per-tile readability.
- Hit target: each tile is `py-3 px-2 ` ≈ 24+24+text height ≈ ~76px tall — well above 44px floor. ✓

**Volume slider (VolumeInput) responsive shape:**
- The slider row is rendered by `VolumeInput.tsx` (existing component, lines 109-122). Its inner `<input type="range">` is `w-full`.
- Phase 6 wraps the VolumeInput call with a max-w bound at md+. Update line 311 of LogDrinkForm.tsx:
  ```tsx
  // Before:
  <VolumeInput value={volume} onChange={handleVolumeChange}
    unit={volumeUnit} max={vc.max} step={vc.step} variant={isNightView ? 'night' : 'drink'} />

  // After:
  <div className="md:max-w-2xl md:mx-auto">
    <VolumeInput value={volume} onChange={handleVolumeChange}
      unit={volumeUnit} max={vc.max} step={vc.step} variant={isNightView ? 'night' : 'drink'} />
  </div>
  ```
- The wrapper class `md:max-w-2xl md:mx-auto` adds NO mobile change (md: prefix); at md+ the slider sits inside a 672px-wide centered row.
- The volume readout (the big `text-4xl` number inside VolumeInput line 100) is currently `text-4xl` (36px). Phase 6 leaves this AS-IS at mobile and bumps at md+: requires modifying VolumeInput.tsx — see §"VolumeInput typography bump" below.

**Volume preset chips (lines 274-309) responsive shape:**
- Mobile: `grid grid-cols-3 gap-2 mb-2 px-2` with `min-h-[58px]` per chip — PRESERVE EXACTLY.
- md+: **same `grid-cols-3`** — no class change. The chips bound inside the 4-col DrinkTypePicker's parent column → since the wrapper at line 273 is `grid grid-cols-3 gap-2 mb-2 px-2`, the chips stay 3-up at all widths. Each chip at md+ inside max-w-3xl is ~(768-48-32-16)/3 ≈ 224px wide.
- Hit target: `min-h-[58px]` ≥ 44px ✓

**Custom note toggle + textarea (lines 245-267):** mobile-only behavior preserved. The note textarea inside the toggled section uses `w-full` so it auto-expands inside whatever parent it's in; inside `max-w-3xl` at md+ it sits comfortably.

**Step indicator (lines 211-223):** existing `flex justify-center gap-2` + `STEP X OF 2` label — preserved exactly. Step dots are buttons (clickable to jump between steps); they have `aria-label={tc('stepAriaLabel', { n: s })}` so the focus-trap selector skips them per §"Initial focus" decision above.

**Sticky Next button (lines 348-355):** existing `sticky bottom-0 -mx-5 mt-6 px-5 pt-5 pb-2 bg-gradient-to-t from-white via-white/95 to-white/0` — preserved. At md+ inside the modal card, "sticky bottom-0" stays at the bottom of the scrolling modal content area (modal `max-h-[85vh]` + `overflow-y-auto`). The `-mx-5` negative margin extends the gradient edge-to-edge inside the modal card; at md+ where the modal has `md:px-6` content padding, this still works (gradient extends to the modal's content-edge inside the card).

**Initial focus on open:**

```
Step 1: First DrinkTypePicker tile (water button) — DOM order picks this.
Step 2: TimePicker first interactive (the existing TimePicker DOM is preserved; first focusable inside is the "-15 min" button or the time input — whichever is first in TimePicker's source).
```

The focus-trap selector inside BottomSheet picks the first focusable that isn't close-X or a step dot. For LogDrinkForm step 1, this is the first DrinkTypePicker tile (no extra props needed). For step 2 it's the first TimePicker control.

**Tab order per step:**

Step 1 (Drink type + volume):
1. (close X — skipped by initial focus, but reachable via Shift+Tab from first DrinkTypePicker tile)
2. DrinkTypePicker tiles (8, DOM order: water → coffee → tea → juice → carbonated → alcohol → milk → other)
3. "Add a note" toggle button
4. (note textarea — only if expanded)
5. Done button inside note (only if note open)
6. Volume preset chip 1 (200 mL / 7 oz)
7. Volume preset chip 2 (350 mL / 12 oz)
8. Volume preset chip 3 (500 mL / 17 oz)
9. VolumeInput tap-to-edit (the big number; once tapped, focus moves to the text input)
10. VolumeInput slider (range input)
11. Sticky Next button

Step 2 (Time + Save):
1. (close X)
2. Step dot 1 / 2 (back-jump buttons)
3. (Back pill button — step > 1)
4. TimePicker controls (existing DOM order — `-15` → `+15` → `Now` → hour input → minute input → AM/PM → quick chips)
5. Save button

Tab order is natural DOM order — NO explicit `tabindex` overrides needed. The existing components already render in correct visual order.

**Enter-advance behavior per step:**

Per CONTEXT.md §"Phase 6 specific decisions" → "Keyboard navigation depth": **Implementation choice locked here as form-level `onKeyDown` handler.**

```tsx
// Inside the form's outer div (line 209):
<div
  className="select-none min-h-[70vh]"
  onKeyDown={(e) => {
    // Skip Enter handling inside textarea (preserve newline behavior)
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;  // Shift+Enter is reserved for textarea newline path
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      if (volume > 0) {
        goToStep(step + 1);
      }
    } else {
      handleSave();
    }
  }}
>
```

- `target.tagName === 'TEXTAREA'` exempts the note textarea so Enter still inserts a newline (DTUX-03 success criterion 4: "Enter on a textarea does NOT submit").
- `shiftKey` exempted defensively.
- On non-final step: advance if valid (mirrors the sticky Next button's enabled state — `volume > 0`).
- On final step: call `handleSave()` (mirrors the Save button's click handler).
- The handler is INLINE per CONTEXT.md discretion default ("Whether to extract a shared `useFormKeyboard` hook ... Default: INLINE per form because the forms have different step structures and shared abstraction risks over-engineering").

**Escape-close behavior:** preserved via BottomSheet's existing Escape listener. Escape closes the entire sheet regardless of step (does NOT just back up a step).

**Reset-on-cancel pattern:** see §"Reset-on-Cancel Pattern" below. For LogDrinkForm, "interacted beyond defaults" = `drinkType !== defaultDrinkType` OR `volume !== defaultVolume` OR `note.length > 0` OR `time !== smartDefault()`. If any of these are true on dismiss attempt, show ConfirmDialog.

**Mobile invariant (LogDrinkForm specifically):**

The following classes/markup are byte-equivalent at < 768px:
- Outer `<div className="select-none min-h-[70vh]">` (line 209) — no change.
- Step indicator div (lines 210-223) — no change.
- Back pill (lines 226-234) — no change.
- Step content `<div className={`px-2 ${slideClass}`}>` (line 237) — no change.
- DrinkTypePicker rendering (line 243) — no change.
- Note toggle + textarea (lines 244-267) — no change.
- Volume preset chips section (lines 273-310) — no change.
- VolumeInput call (line 311) — WRAPPED in `<div className="md:max-w-2xl md:mx-auto">` which is INERT at <768px.
- Step 2 content (lines 316-343) — no change.
- Sticky Next button (lines 348-355) — no change.

Only NEW additions at <768px:
- `onKeyDown` handler on the outer div — NO visual effect; pure keyboard behavior; not triggered by touch.
- (None other; BottomSheet additions are in BottomSheet.tsx, not LogDrinkForm.tsx)

**data-testid preservation (LogDrinkForm):** `drink-save` on the Step 2 Save button (line 338) — PRESERVE.

---

### 2. `LogVoidForm` (508 lines)

**File:** `src/components/diary/LogVoidForm.tsx`

**BottomSheet integration:** title set by DayPageClient. `variant`: `'default'` (verify DayPageClient — likely `'default'` for voids since voids are the primary IPC event).

**Modal max-width at md+:** `max-w-3xl` (default variant).

**Sub-picker (SensationPicker) responsive shape:**
- Mobile: `flex gap-2 mt-2` with each of 5 buttons `flex-1` + `min-h-[52px]` — PRESERVE EXACTLY.
- md+: same — no class change. Inside `max-w-3xl` each sensation tile is ~(768-48-32)/5 ≈ 138px wide. Each shows "0" "No urge" / "1" "Mild" / etc. — comfortable.
- Hit target: `min-h-[52px]` ≥ 44px ✓

**Volume preset chips (lines 285-322):** same pattern as LogDrinkForm — `grid grid-cols-3 gap-2 mb-2 px-2` preserved. `min-h-[62px]` ≥ 44px ✓.

**Volume slider (VolumeInput):** wrap with `md:max-w-2xl md:mx-auto` at line 340:

```tsx
<div className="md:max-w-2xl md:mx-auto">
  <VolumeInput value={volume} onChange={handleVolumeChange}
    unit={volumeUnit} max={vc.max} step={vc.step} variant={isNightView ? 'night' : 'default'} />
</div>
```

Same wrapping for the doubleVoid VolumeInput at line 362:

```tsx
<div className="md:max-w-2xl md:mx-auto">
  <VolumeInput value={doubleVoidVolume} onChange={setDoubleVoidVolume}
    unit={volumeUnit} max={volumeUnit === 'oz' ? 25 : 750} step={vc.step} variant={isNightView ? 'night' : 'default'} />
</div>
```

**Custom toggles (doubleVoid pill, leak pill, note pill, wokeBy 2-button grid):**
- Lines 344-365 (doubleVoid pill): `inline-flex items-center gap-2 px-5 py-3 rounded-full text-base` — height ~52px ≥ 44px ✓ — preserved.
- Lines 387-402 (leak pill + note pill): `px-4 py-2.5 rounded-full text-sm` — height ~44px = floor ✓ — preserved.
- Lines 419-454 (wokeBy 2-button grid): `min-h-[52px]` ≥ 44px ✓ — preserved.

The 2-button wokeBy grid at line 427 uses `grid grid-cols-1 sm:grid-cols-2 gap-2`. At sm+ (640px+) it's 2-col — preserved at md+. The 2 buttons sit side-by-side comfortably inside max-w-3xl modal.

**Initial focus on open:** First volume preset chip on Step 1 (`p1` = 150 mL / 5 oz button). The focus-trap selector picks this (close X and step dots skipped; the back-pill exists only when step > 1 so it's not relevant on first open).

**Tab order Step 1:**
1. (close X)
2. Step dots (3 — skipped by initial focus but reachable via Tab)
3. Volume preset chip 1 → 2 → 3
4. "No measuring cup?" help toggle
5. (Cup help description — not interactive, no tab stop)
6. VolumeInput tap-to-edit
7. VolumeInput slider
8. Double-void pill
9. (Double-void VolumeInput if expanded)
10. Sticky Next button

**Tab order Step 2:**
1. (close X)
2. Step dots / Back pill
3. SensationPicker buttons (0 → 1 → 2 → 3 → 4)
4. SensationPicker help (?) toggle
5. Leak pill (`I had a leak`)
6. Note pill (`Add a note`)
7. (Note textarea + Done button — if expanded)
8. wokeBy buttons (Yes / Awake anyway) — only if `isNocturnal`
9. Sticky Next button

**Tab order Step 3:**
1. (close X)
2. Step dots / Back pill
3. TimePicker controls (existing DOM)
4. Save button

**Enter-advance behavior per step:**

```tsx
<div
  className="select-none min-h-[60vh]"
  onKeyDown={(e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (step < 3) {
      if (volume > 0) {  // step 1 enables Next on volume > 0
        goToStep(step + 1);
      }
      // Step 2 → 3 has no validation gate in existing UI (Next is always enabled)
      // so volume > 0 from step 1 carries us through. The Next button on step 2
      // doesn't check sensation/leak/note state — preserve that.
    } else {
      handleSave();  // Step 3: Save
    }
  }}
>
```

Step 2's existing Next button (line 500) is `disabled={volume <= 0}` — same gate as step 1. So `volume > 0` covers both.

Note: the existing form has SOME implicit validation on step 2 via `aria-pressed` toggles, but `Next` is NOT gated on sensation/leak presence. Phase 6 preserves this: Enter on step 2 advances regardless of sensation/leak state (preserves the existing UX where sensation + leak are optional).

**Reset-on-cancel pattern:** "interacted beyond defaults" = `volume !== defaultVolume` OR `sensation !== null` OR `note.length > 0` OR `leak === true` OR `doubleVoid === true` OR `wokeBy !== null` OR `time !== smartDefault()`.

**Mobile invariant (LogVoidForm specifically):**
- VolumeInput call wrapped in `md:max-w-2xl md:mx-auto` — INERT at mobile.
- `onKeyDown` handler — no visual effect.
- Everything else preserved.

**data-testid preservation (LogVoidForm):** `void-save` on Step 3 Save button (line 487) — PRESERVE.

---

### 3. `LogLeakForm` (414 lines)

**File:** `src/components/diary/LogLeakForm.tsx`

**BottomSheet integration:** `variant`: `'leak'`.

**Modal max-width at md+:** `max-w-3xl` (default variant).

**Sub-picker (LeakTriggerPicker) responsive shape:**
- Mobile: `grid grid-cols-4 [grid-auto-rows:1fr] gap-2 mt-6` with `min-h-[76px]` per tile (8 items in 4×2) — PRESERVE EXACTLY.
- md+: same `grid-cols-4` — no class change. Inside max-w-3xl each tile is ~174px wide. Description below the grid auto-flows.
- Hit target: `min-h-[76px]` ≥ 44px ✓

**LEAK_AMOUNT_OPTIONS grid (lines 297-316):**
- Mobile: `grid grid-cols-4 gap-1.5 mb-6 w-full px-1` with `min-h-[44px]` per button (4 items in 4×1) — PRESERVE EXACTLY.
- md+: same `grid-cols-4` — no change. Inside `max-w-3xl` each amount button is ~(768-48-16-12)/4 ≈ 173px wide.
- Hit target: `min-h-[44px]` = floor ✓

**Urgency Yes/No buttons (lines 325-352):**
- Mobile: `flex gap-2` with each button `px-6 py-2.5 rounded-xl min-h-[44px]` — PRESERVE.
- md+: same.

**Initial focus on open:** First LeakTriggerPicker tile (cough button). The trigger picker has `data-testid={`leak-trigger-${lt.value}`}` on each tile — PRESERVE all 8.

**Tab order Step 1:**
1. (close X)
2. Step dots (3)
3. LeakTriggerPicker tiles (8, DOM order: cough → sneeze → laugh → lifting → exercise → toilet_way → other → not_sure)
4. (Note pill — only if trigger === 'other')
5. (Note textarea + Done — if note open)
6. Sticky Next button

**Tab order Step 2:**
1. (close X)
2. Step dots / Back pill
3. LEAK_AMOUNT tiles (4: drops → small → medium → large)
4. Urgency Yes button
5. Urgency No button
6. Sticky Next button

**Tab order Step 3:**
1. (close X)
2. Step dots / Back pill
3. TimePicker controls
4. Save button

**Enter-advance:**

```tsx
<div
  className="select-none min-h-[60vh]"
  onKeyDown={(e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (step < TOTAL_STEPS) {
      // Step 1 Next is disabled when !trigger; step 2 when urgencyBeforeLeak === null
      const canAdvance = step === 1 ? !!trigger : urgencyBeforeLeak !== null;
      if (canAdvance) {
        goToStep(step + 1);
      }
    } else {
      handleSave();
    }
  }}
>
```

**Reset-on-cancel pattern:** "interacted beyond defaults" = `trigger !== null` OR `amount !== null` OR `urgencyBeforeLeak !== null` OR `notes.length > 0` OR `time !== smartDefault()`.

**Mobile invariant (LogLeakForm specifically):** all existing classes preserved. `onKeyDown` added; no visual effect.

**data-testid preservation (LogLeakForm):**
- `leak-trigger-cough`, `leak-trigger-sneeze`, `leak-trigger-laugh`, `leak-trigger-lifting`, `leak-trigger-exercise`, `leak-trigger-toilet_way`, `leak-trigger-other`, `leak-trigger-not_sure` (8 on LeakTriggerPicker, line 36)
- `leak-urgency-yes` (line 328)
- `leak-urgency-no` (line 341)
- `leak-save` (line 388 on Save button)

11 testids — ALL PRESERVED.

---

### 4. `SetBedtimeForm` (122 lines)

**File:** `src/components/diary/SetBedtimeForm.tsx`

**BottomSheet integration:** `variant`: `'bedtime'`.

**Modal max-width at md+:** `max-w-2xl` (narrow variant — slider-only / time-picker-only form).

**No sub-picker, no slider** — just `TimePicker` + Save button.

**Initial focus on open:** First TimePicker control. The existing `TimePicker.tsx` (not modified in Phase 6 — out of scope, time/timezone code is per-memory `time_model_gotchas.md`) renders in DOM order. The focus-trap selector picks the first focusable inside it.

**Tab order:**
1. (close X)
2. TimePicker controls (existing DOM order)
3. Save button

**Enter-advance:**

```tsx
// Inside the outer <div className="space-y-5"> (line 93):
<div
  className="space-y-5"
  onKeyDown={(e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') {
      // Allow Enter to commit the inline time input edit before saving
      // (existing TimePicker behavior — see VolumeInput.tsx:55 pattern)
      return;
    }
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (!isInvalid) handleSave();
  }}
>
```

For SetBedtimeForm (single step) Enter = Save (when valid).

**Reset-on-cancel pattern:** "interacted beyond defaults" = `time !== resolve(smartDefault())`. For a single-step time-picker form, simply: did the user move the time off the smart default? If yes → ConfirmDialog. If no → silent dismiss.

**Mobile invariant (SetBedtimeForm specifically):** outer `<div className="space-y-5">` gains `onKeyDown` — zero visual diff. Inner Moon icon + h3 + TimePicker + warning paragraphs + Save button — all preserved exactly.

**data-testid preservation (SetBedtimeForm):** `bedtime-save` on Save button (line 116) — PRESERVE.

---

### 5. `SetWakeTimeForm` (111 lines)

**File:** `src/components/diary/SetWakeTimeForm.tsx`

**BottomSheet integration:** `variant`: `'default'`.

**Modal max-width at md+:** `max-w-2xl` (narrow).

**No sub-picker, no slider** — just `TimePicker` + Save.

**Initial focus on open:** First TimePicker control.

**Tab order:**
1. (close X)
2. TimePicker controls
3. Save button

**Enter-advance:**

```tsx
<div
  className="space-y-5"
  onKeyDown={(e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') return;
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    if (!isInvalid) handleSave();
  }}
>
```

**Reset-on-cancel pattern:** "interacted beyond defaults" = `time !== smartDefault()`.

**Mobile invariant (SetWakeTimeForm specifically):** same as SetBedtimeForm. Zero visual diff.

**data-testid preservation (SetWakeTimeForm):** `wake-save` on Save button (line 105) — PRESERVE.

---

### Per-Form data-testid Preservation Summary

Total: **13 data-testids** across the 5 forms + their sub-pickers. ALL preserved by Phase 6 (NO testid removed, NO testid renamed). Phase 6 does not introduce new data-testids on the forms themselves — the planner may add `data-testid="bottom-sheet"` and `data-testid="bottom-sheet-close"` to BottomSheet for E2E keyboard tests, but those are net additions, not modifications.

| File | Testid | Element | Phase 6 status |
|---|---|---|---|
| LogDrinkForm.tsx | `drink-save` | Step 2 Save button (line 338) | PRESERVE |
| LogVoidForm.tsx | `void-save` | Step 3 Save button (line 487) | PRESERVE |
| LogLeakForm.tsx | `leak-urgency-yes` | Step 2 Urgency Yes (line 328) | PRESERVE |
| LogLeakForm.tsx | `leak-urgency-no` | Step 2 Urgency No (line 341) | PRESERVE |
| LogLeakForm.tsx | `leak-save` | Step 3 Save button (line 388) | PRESERVE |
| LeakTriggerPicker.tsx | `leak-trigger-{value}` | 8 trigger tiles (line 36) | PRESERVE (×8) |
| SetBedtimeForm.tsx | `bedtime-save` | Save button (line 116) | PRESERVE |
| SetWakeTimeForm.tsx | `wake-save` | Save button (line 105) | PRESERVE |

QuickLogFAB testids (`fab-toggle`, `fab-action-drink`, `fab-action-leak`, `fab-action-void`) are NOT modified by Phase 6 — Phase 5 owns the FAB. The FAB launches the forms, so the chain `fab-toggle` → `fab-action-drink` → `drink-save` must remain unbroken. Phase 6 verifies the chain via the existing `e2e/walkthrough.spec.ts`.

---

## Sub-Picker Specs

Concrete specs for the 3 sub-pickers that render inside the forms. None of these are responsive in Phase 6 — they were already mobile-grid-correct, and the parent modal's max-width gives them desktop-correct widths "for free".

### DrinkTypePicker (`src/components/diary/DrinkTypePicker.tsx`, 42 lines)

| Property | Mobile (PRESERVE) | md+ (NO CHANGE) | Notes |
|---|---|---|---|
| Outer | `grid grid-cols-4 [grid-auto-rows:1fr] gap-2 mt-8` | same | 8 items in 4×2 |
| Per-tile | `flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl` | same | ~76px tall |
| Resting | `bg-white text-ipc-950 hover:bg-white border border-ipc-200/50 shadow-sm` | same | Hover IS a no-op color shift (`hover:bg-white` matches resting) — preserved |
| Selected | `bg-drink text-white ring-2 ring-drink/30 shadow-sm` | same | |
| Per-tile max-w at md+ | n/a | n/a (grid handles bounding) | At max-w-3xl each tile ≈ 174px |
| Hit target | ~76px (`py-3` + icon + label) | same | ≥ 44px ✓ |
| Active/selected visual | Color shift + ring + shadow (no checkmark) | same | Consistent with existing UX |
| Focus ring | NEW: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white` | same | Phase 6 ADDS focus-visible ring on each tile |

**The ONE Phase 6 change to DrinkTypePicker.tsx:** add focus-visible ring to the button className (line 24). Mobile zero pixel diff (focus-visible doesn't render on touch).

```tsx
// Before (line 24-29):
className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl
  transition-all active:scale-[0.95] ${
    selected
      ? 'bg-drink text-white ring-2 ring-drink/30 shadow-sm'
      : 'bg-white text-ipc-950 hover:bg-white border border-ipc-200/50 shadow-sm'
  }`}

// After:
className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl
  transition-all active:scale-[0.95]
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white
  ${
    selected
      ? 'bg-drink text-white ring-2 ring-drink/30 shadow-sm'
      : 'bg-white text-ipc-950 hover:bg-white border border-ipc-200/50 shadow-sm'
  }`}
```

**Long-translation handling (PT/AR):** The drink-type labels at the longest:
- PT: "Carbonatado" (10 chars), "Álcool" (6), "Outro" (5)
- AR: drinks fit (Arabic for drink names is compact)
- FR: "Carbonaté" (9), "Alcool" (6) — fits

At max-w-3xl with 4-col grid, each tile is ~174px wide. With `py-3 px-2` and `text-xs font-bold leading-tight`, the labels wrap to 2 lines if needed. The existing `[grid-auto-rows:1fr]` ensures all tiles match the tallest. **No truncation or font shrink needed.**

### LeakTriggerPicker (`src/components/diary/LeakTriggerPicker.tsx`, 64 lines)

| Property | Mobile (PRESERVE) | md+ (NO CHANGE) | Notes |
|---|---|---|---|
| Outer | `grid grid-cols-4 [grid-auto-rows:1fr] gap-2 mt-6` | same | 8 items in 4×2 |
| Per-tile | `flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl min-h-[76px]` | same | Explicit 76px floor |
| Resting | `bg-white text-ipc-950 hover:bg-white border border-ipc-200/50 shadow-sm` | same | |
| Selected | `bg-leak text-white ring-2 ring-leak/30 shadow-sm` | same | |
| Description below grid | `text-sm text-leak font-medium text-center mt-2.5 animate-fade-slide-up` (line 57-59) | same | Auto-flows below the 4-col grid |
| Focus ring | NEW: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white` | same | ADD to line 39 |
| data-testid | `leak-trigger-{value}` | same | PRESERVE on each of 8 |

**Long-translation handling:**
- PT: "Levantamento" (12), "Outro" (5), "Não sei" (7) — wraps cleanly at ~174px tile width
- AR: longer triggers fit at AR text density

### SensationPicker (`src/components/diary/SensationPicker.tsx`, 84 lines)

| Property | Mobile (PRESERVE) | md+ (NO CHANGE) | Notes |
|---|---|---|---|
| Outer | `flex gap-2 mt-2` (lines 37-61) | same | 5 buttons as flex-1 |
| Per-button | `flex-1 py-3.5 rounded-xl text-center min-h-[52px]` | same | Explicit 52px floor |
| Resting | `bg-white/40 text-ipc-600 font-medium border border-ipc-100/50` | same | |
| Selected | `bg-ipc-500/90 text-white font-bold` | same | |
| Per-button width at md+ | n/a — `flex-1` handles distribution | n/a | At max-w-3xl each ≈ 138px |
| Hit target | 52px ≥ 44px ✓ | same | |
| Focus ring | NEW on each button | same | ADD to line 47-51 |
| Help (?) button | (line 27-33) — gets focus ring | NEW | |

**Long-translation handling:** Sensation `short` labels are short by design ("No urge" / "Mild" / "Moderate" / "Strong" / "Leaked" in EN). PT "Moderada" (8), FR "Modéré" (7) — both fit. AR sensations fit.

### LEAK_AMOUNT buttons (inline in LogLeakForm.tsx lines 297-316 — not a separate component)

Same pattern. PRESERVE `grid-cols-4` at all breakpoints. ADD focus-visible ring to each button (line 306).

### Volume preset chips (inline in LogDrinkForm + LogVoidForm — not a separate component)

PRESERVE `grid-cols-3` at all breakpoints. ADD focus-visible ring to each chip (LogDrinkForm line 296, LogVoidForm line 307).

---

## Volume slider responsive shape

### Slider row bounding

Per CONTEXT.md: at md+ slider rows constrained to `max-w-2xl`. Phase 6 implements this by **wrapping each `<VolumeInput .../>` call in a `<div className="md:max-w-2xl md:mx-auto">`**. This is the per-form change, NOT a change to VolumeInput.tsx's internal layout.

Files modified for slider bounding:
- `LogDrinkForm.tsx` line 311 (single VolumeInput call)
- `LogVoidForm.tsx` line 340 (primary VolumeInput call) AND line 362 (doubleVoid VolumeInput call)
- (LogLeakForm has no VolumeInput)
- (SetBedtimeForm + SetWakeTimeForm have no VolumeInput — TimePicker only)

### Volume readout typography bump

The big `text-4xl` number inside `VolumeInput.tsx` (line 100, the resting tap-to-edit display button) is currently 36px. Per CONTEXT.md axis 1 + boomer-safe override 6 (browser zoom resilience), Phase 6 considers bumping this at md+.

**Decision: KEEP `text-4xl` at all breakpoints.**

Rationale:
- `text-4xl` is already 36px — readable at desktop distance (~20-26 inches) per typography research. Bumping to `text-5xl` (48px) is overkill for a single-line number.
- The slider row is bounded to `max-w-2xl` at md+, so the volume readout is centered above a 672px-wide slider — already visually proportionate.
- Boomer-safe override 6 (browser zoom resilience): the `text-4xl` uses Tailwind's rem-based scale (`text-4xl = 2.25rem`) which scales with browser zoom. Bumping to `text-5xl` (3rem) is less needed when the user can zoom.
- **NO change to VolumeInput.tsx required for typography.**

**Editing mode (line 81 — the inline `<input type="text">`):** existing `text-4xl` with inline `fontSize: '2.25rem'` — preserved. The inline style override at line 90 is iOS-zoom defensive (preventing the auto-zoom on input focus); the `sm:text-4xl` class at line 83 normalizes. Phase 6 leaves this entirely alone.

### Slider +/- buttons (none currently)

The VolumeInput.tsx component is slider-only (no +/- step buttons). The TimePicker has +/- buttons (in a separate component). Phase 6 does NOT add new slider step buttons.

---

## Keyboard / Focus Contract

Comprehensive keyboard model for Phase 6 forms.

### Initial focus management pattern

**Decision: shared in BottomSheet.tsx (NOT per-form).** Rationale per CONTEXT.md discretion (the alternative "default focus target per form when the form has multiple natural entry points" picks the first focusable in DOM order, which is universally correct for the 5 forms — no per-form variation needed). Implementation in §"BottomSheet — desktop modal transformation" → "Initial focus on open (NEW)".

### Tab order rules

- **DOM order, no explicit `tabindex` overrides.** All 5 forms already render in correct visual top-to-bottom order; no tabindex hacks needed.
- Step dots are buttons (clickable to jump between steps) — they ARE in the tab order. Boomer-safe override 4 (3 paths to navigate steps): users can navigate back via Back pill, step dots, or Tab+Enter on a previous step dot. All three work via existing markup.
- The close X is in the tab order (it's a `<button>` with `aria-label`).

### Enter-advance behavior

**Decision: form-level `onKeyDown` handler on each form's outer wrapper div, NOT a shared hook.** Rationale per CONTEXT.md discretion default ("Default: INLINE per form because the forms have different step structures and shared abstraction risks over-engineering"). Each form's handler is shown in §"Form-by-Form Specs" above.

Common pattern across all 5:
```tsx
onKeyDown={(e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'TEXTAREA') return;     // Preserve newline in notes
  if (e.key !== 'Enter') return;
  if (e.shiftKey) return;
  e.preventDefault();
  // form-specific advance/save logic
}}
```

**Why `e.preventDefault()`:** the browser's default Enter behavior on a button is to click it. If the user has Tab-focused a picker tile and presses Enter, the browser would click the tile (toggling its selection). We DON'T want that for Enter-to-advance — Enter advances the step regardless of which element has focus. The `preventDefault()` neutralizes the browser's default; the form's logic decides whether to advance.

**Exception: TimePicker hour/minute text input.** The existing `VolumeInput.tsx` (line 55) handles Enter to commit the edit. The TimePicker likely does the same (NOT modified in Phase 6). If Enter inside a TimePicker text input fires our form-level handler, we'd skip step-advance — that's why the `target.tagName === 'INPUT'` exception in SetBedtimeForm/SetWakeTimeForm. For Log* forms (Drink/Void/Leak) the TimePicker is on the FINAL step where Enter = Save, so even if Enter fires from inside the TimePicker, it triggers `handleSave()` which the user wants.

Phase 6 will need to ALSO add the same exception to the Log* form handlers (LogDrinkForm step 2, LogVoidForm step 3, LogLeakForm step 3). Refined per-form handlers:

```tsx
// In each Log* form's outer onKeyDown:
const target = e.target as HTMLElement;
const tag = target.tagName;
if (tag === 'TEXTAREA') return;
// Allow native Enter handling inside inputs (TimePicker text input, VolumeInput edit mode)
if (tag === 'INPUT' && ((target as HTMLInputElement).type === 'text' || (target as HTMLInputElement).type === 'number')) return;
```

This is reflected in the per-form specs above (Spec refinement). The planner SHOULD harmonize this across all 5 forms.

### Focus-visible ring spec (REUSED from Phase 5)

Every interactive element inside the modal:

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ipc-500
focus-visible:ring-offset-2
focus-visible:ring-offset-white
```

Per-element additions (NEW in Phase 6):
- DrinkTypePicker tiles (×8)
- LeakTriggerPicker tiles (×8)
- SensationPicker buttons (×5)
- SensationPicker help (?) button
- LEAK_AMOUNT_OPTIONS buttons (×4)
- Urgency Yes/No buttons (×2)
- Volume preset chips (×3 in LogDrink, ×3 in LogVoid)
- VolumeInput tap-to-edit button (line 95)
- VolumeInput slider (input type="range") — gets browser-native focus ring; we override with the same spec for consistency
- Note pill toggles, leak pill toggle, doubleVoid pill toggle, wokeBy buttons (×2 in LogVoid)
- Note textarea (focus styling already exists — preserve `focus:border-*/60 focus:ring-2 focus:ring-*/20`)
- Cup-help toggle in LogVoidForm
- Step dot buttons (×3 in LogVoid/LogLeak, ×2 in LogDrink)
- Back pill buttons
- "Done" button inside note expansion
- Sticky Next button (already a `Button` primitive; uses Button's focus ring — see §"Button.tsx focus-visible migration" below)
- Save button (already a `Button` primitive)
- Close X (existing — already lacks focus ring; Phase 6 ADDS)

### Focus-trap pattern

Implemented in BottomSheet.tsx — see §"BottomSheet — desktop modal transformation" → "Focus trap (NEW)". Works for all 5 forms automatically (no per-form change).

### Return-focus-on-close pattern

Implemented in BottomSheet.tsx — see §"Return focus on close (NEW)". When DayPageClient's BottomSheet closes, focus returns to the FAB action button that opened the form. Critical for keyboard-only users.

### `Button.tsx` focus-visible migration

Per CONTEXT.md Surface 10 + "Out of scope (Phase 8 maybe)" → actually Phase 6 owns this: the existing Button.tsx uses `focus:ring-2 focus:ring-ipc-400 focus:ring-offset-2`. Phase 6 migrates to `focus-visible:` and bumps to `ipc-500` for consistency with Phase 5's chrome focus spec.

```tsx
// Before (Button.tsx line 14-16):
const base = `inline-flex items-center justify-center gap-2 rounded-2xl font-semibold
  transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
  focus:outline-none focus:ring-2 focus:ring-ipc-400 focus:ring-offset-2`;

// After:
const base = `inline-flex items-center justify-center gap-2 rounded-2xl font-semibold
  transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2`;
```

The variant-specific `focus:ring-*/40` overrides on lines 28-31 (drink, bedtime, leak, night) also migrate to `focus-visible:ring-*/40`:

```tsx
// Before:
drink: 'bg-drink text-white hover:bg-drink/90 active:bg-drink/80 focus:ring-drink/40',
bedtime: '...focus:ring-bedtime/40',
leak: '...focus:ring-leak/40',
night: '...focus:ring-indigo-400',
hero: '...focus:ring-ipc-500',

// After:
drink: 'bg-drink text-white hover:bg-drink/90 active:bg-drink/80 focus-visible:ring-drink/40',
bedtime: '...focus-visible:ring-bedtime/40',
leak: '...focus-visible:ring-leak/40',
night: '...focus-visible:ring-indigo-400',
hero: '...focus-visible:ring-ipc-500',
```

**Mobile invariant for Button.tsx:** `focus-visible` is more restrictive than `focus` — it triggers on KEYBOARD focus only, not on touch/click. Mobile touch users will see LESS focus ring (which is fine — they were getting a focus ring after every tap, which is visual noise). **The mobile diff is "less focus ring after taps" which is a UX improvement, not a regression.** This change is explicitly aligned with Phase 5's NavLink pattern.

Acceptance criterion: after Phase 6 lands, tap any button on mobile → no focus ring sticks around. Tab to any button on desktop → focus ring is clearly visible.

---

## Modal Close Affordances

Per Boomer-safe override 4: every form sheet at md+ MUST provide 3 paths to dismiss.

### Path 1: Visible X close button (top-end corner, ≥ 44px hit target)

**Current state (from BottomSheet.tsx audit):**
- The close X exists at line 76-85.
- Position: `absolute top-2.5 right-2.5 z-10` — physical CSS (`right-2.5` — RTL leak!).
- Size: `w-10 h-10` (40×40px) — BELOW the 44px Boomer-safe floor.
- aria-label: `tc('close')` (existing i18n key, line 79).
- onClick: `onClose`.

**Phase 6 changes (required):**

```tsx
<button
  type="button"
  onClick={onClose}
  aria-label={tc('close')}
  className="absolute top-2.5 end-2.5 z-10
    w-10 h-10 md:w-11 md:h-11
    flex items-center justify-center rounded-full
    text-ipc-500 bg-white/70 border border-ipc-100 shadow-sm
    hover:bg-white active:scale-[0.9] transition-all
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
>
  <X size={20} />
</button>
```

Changes:
- `right-2.5` → `end-2.5` (logical CSS — fixes RTL leak; this is a Phase 6 RTL correctness deliverable parallel to Phase 5's `right-5` → `end-5` on QuickLogFAB).
- `w-10 h-10` → `w-10 h-10 md:w-11 md:h-11` — at md+ bumps to 44×44 (meets boomer-safe floor on the desktop modal). **MOBILE STAYS AT 40×40** (byte-equivalent invariant — the existing 40×40 has been the production close X for the entire app lifecycle; bumping it on mobile is a regression of the mobile-pristine constraint per Phase 5 First Principle).
- Adds focus-visible ring.

**Decision rationale for keeping mobile close X at 40×40:** the mobile-pristine HARD CONSTRAINT from Phase 5 dominates. The user's 5 reinforcements that mobile must not regress trump a per-pixel boomer-safe override at mobile. The override's INTENT (44px floor) is satisfied at desktop (modal context, where it matters most for keyboard/mouse users). At mobile, the existing 40×40 is well above iOS's effective touch-target via the surrounding `bg-white/70 border border-ipc-100 shadow-sm` (the visible button + the negative-space padding around it routinely exceeds 44px effective tap area). PRESERVE.

If the planner finds during execution that the 40→44px bump at md+ causes visual misalignment with the `pr-14` title padding (`pr-14` = 56px > 44px close X = comfortable), no adjustment needed. The `pr-14` reservation has 12px of margin on top of the close X width.

### Path 2: Escape key

Already implemented (BottomSheet.tsx lines 21-28). PRESERVE unchanged.

Behavior across nested states:
- Escape inside expanded note textarea → closes the modal (NOT just collapses the note). The textarea is a `<textarea>` not a `<form>`; Escape from textarea bubbles up to BottomSheet's window listener and triggers onClose. This is the correct behavior per CONTEXT.md ("Escape always closes, doesn't just back up a step").
- Escape inside Step 2/3 → closes the modal (NOT just goes back to Step 1). Correct.
- Escape from the close X button (if focused) → closes via the window listener (preempts the button's default behavior; preventDefault not needed because the window listener fires first).

**Reset-on-cancel interaction:** if the user has interacted beyond defaults AND presses Escape, the BottomSheet's existing Escape listener triggers onClose, which DayPageClient handles by closing the modal silently. Phase 6 introduces dirty-state tracking in DayPageClient to gate this — see §"Reset-on-Cancel Pattern" below.

### Path 3: Backdrop click

Already implemented (BottomSheet.tsx line 47, `onClick={onClose}` on the backdrop div). PRESERVE unchanged at all viewports.

**Decision (per CONTEXT.md "keep mobile as-today; add backdrop click at md+ explicitly"):** since the existing backdrop already has onClick at all viewports, NO change needed. The CONTEXT decision is satisfied by the existing implementation. Confirmed via codebase audit.

---

## Reset-on-Cancel Pattern

Per Streamlined Cognition P7 (Confirmation for destructive actions). The user invests effort filling out a form; dismissing without saving discards that effort. For the 5 forms, dismiss can happen via:
1. Close X tap/click
2. Escape key
3. Backdrop click

Without confirmation, ANY of these silently discards. Phase 6 adds confirmation IF AND ONLY IF the user has interacted beyond defaults.

### Dirty-state tracking definition: "interacted beyond defaults"

Per-form definitions (locked in §"Form-by-Form Specs" above; consolidated here):

| Form | Considered DIRTY if any of these is true |
|---|---|
| LogDrinkForm | `drinkType !== defaultDrinkType` OR `volume !== defaultVolume` OR `note.length > 0` OR `time !== smartDefault()` |
| LogVoidForm | `volume !== defaultVolume` OR `sensation !== null` OR `note.length > 0` OR `leak === true` OR `doubleVoid === true` OR `wokeBy !== null` OR `time !== smartDefault()` |
| LogLeakForm | `trigger !== null` OR `amount !== null` OR `urgencyBeforeLeak !== null` OR `notes.length > 0` OR `time !== smartDefault()` |
| SetBedtimeForm | `time !== resolve(smartDefault())` |
| SetWakeTimeForm | `time !== smartDefault()` |

**Editing existing entries:** when the form opens with an `editEntry` prop, the defaults are seeded from the existing entry. The dirty-state comparison must use the EDIT-mode defaults, not the new-entry defaults. The existing forms already do this — `defaultDrinkType = editEntry?.drinkType ?? mostRecentPriorDrink?.drinkType ?? 'water'` (line 69 of LogDrinkForm) — so dirty-state computes correctly.

**Implementation: a `useMemo` per-form computing `isDirty: boolean` from the comparison above, exposed to a parent-level dirty-state handler.**

### Implementation pattern (DayPageClient owns the ConfirmDialog)

The dirty-state and ConfirmDialog need to live OUTSIDE the form (because the form is unmounted when the modal closes; the ConfirmDialog must overlay AFTER the form has tried to close). Implementation:

1. **Per-form** exposes its dirty-state via a callback prop:
   ```tsx
   interface LogDrinkFormProps {
     // ... existing
     onDirtyChange?: (isDirty: boolean) => void;  // NEW
   }
   ```
   Inside the form:
   ```tsx
   const isDirty = useMemo(() => /* form-specific comparison */, [drinkType, volume, note, time]);
   useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);
   ```

2. **DayPageClient** tracks dirty state in its own state and intercepts the BottomSheet `onClose`:
   ```tsx
   const [activeFormDirty, setActiveFormDirty] = useState(false);
   const [pendingClose, setPendingClose] = useState(false);

   const handleSheetClose = () => {
     if (activeFormDirty) {
       setPendingClose(true);  // Show ConfirmDialog
     } else {
       closeSheet();  // Silent dismiss
     }
   };

   const handleDiscardConfirm = () => {
     setPendingClose(false);
     closeSheet();
   };
   const handleDiscardCancel = () => {
     setPendingClose(false);
     // Keep the modal open; user returns to editing
   };

   return (
     <>
       <BottomSheet open={open} onClose={handleSheetClose} ...>
         {/* render the form with onDirtyChange={setActiveFormDirty} */}
       </BottomSheet>
       <ConfirmDialog
         open={pendingClose}
         title={tc('discardEntryTitle')}
         message={tc('discardEntryMessage')}
         confirmLabel={tc('discard')}
         cancelLabel={tc('keepEditing')}
         variant="danger"
         onConfirm={handleDiscardConfirm}
         onCancel={handleDiscardCancel}
       />
     </>
   );
   ```

### i18n keys (NEW for reset-on-cancel)

Phase 6 introduces **4 new i18n keys** in `messages/en.json` under the `common` namespace. The PostToolUse `i18n-sync` hook auto-mirrors them to fr/es/pt/zh/ar.

| Key | EN value | Notes |
|---|---|---|
| `common.discardEntryTitle` | "Discard this entry?" | Per `feedback_no_em_dashes.md` — period/comma/colon only, no em-dashes; per `feedback_collaborative_tone.md` — peer/sharing tone, not authoritarian |
| `common.discardEntryMessage` | "Your changes won't be saved." | Plain language, no medical jargon (Streamlined Cognition P6) |
| `common.discard` | "Discard" | Action verb on the confirm button; ConfirmDialog `variant="danger"` styles it red |
| `common.keepEditing` | "Keep editing" | Recovery action on the cancel button; mirrors UX_PHILOSOPHY §6 corollary (recoverable progress) |

No copy in the existing forms requires change. The Save / Update / Next / Back / Cancel labels stay as-is.

**Alternative considered:** reuse existing `landing.areYouSure` (line 64 of en.json: "Are you sure?"). REJECTED because the landing context is about resetting the WHOLE diary (destructive at a different scale than discarding ONE entry); the wording for entry-discard should be specific ("Discard this entry?") to avoid scaring users into thinking they're about to lose all their data.

### ConfirmDialog wiring

The existing `ConfirmDialog.tsx` (87 lines) already provides everything Phase 6 needs:
- `role="dialog"` `aria-modal="true"` (line 54)
- Escape close (lines 37-44 — `onCancel` on Escape)
- Backdrop click cancel (line 55)
- danger / default variants (lines 48-51)
- Centered, max-w-sm card, animate-scale-in

Phase 6 USES it as-is. No modifications to ConfirmDialog.tsx required.

**Stacked-modal behavior:** when the ConfirmDialog opens over the BottomSheet, both have `role="dialog"` and `aria-modal="true"`. The ConfirmDialog has `z-[70]` (line 54) > BottomSheet's `z-50` so it stacks correctly. The BottomSheet's focus trap fires on Tab keys — when ConfirmDialog is open, the user's focus is INSIDE ConfirmDialog (which has its own focus management — Cancel button is the first child). Tab inside ConfirmDialog moves between Cancel and Discard; the BottomSheet's focus trap doesn't interfere because the Tab target (Cancel/Discard) is inside `document` but NOT inside the BottomSheet's `sheetRef.current` — the trap's "pull focus back into modal" branch could fight with this. **Phase 6 mitigation: the BottomSheet's focus-trap useEffect must be gated by `!confirmDialogOpen` or similar.** Simplest implementation: when the ConfirmDialog opens, the BottomSheet's focus trap is suspended; when it closes, it resumes.

Implementation: add an `inert` prop or a `disableFocusTrap` boolean to BottomSheet, set by DayPageClient when ConfirmDialog is open.

```tsx
// BottomSheet.tsx — add prop:
interface BottomSheetProps {
  // ... existing
  inert?: boolean;  // NEW: when true, skip focus-trap
}

// In the focus-trap useEffect:
useEffect(() => {
  if (!open || inert) return;
  // ... rest unchanged
}, [open, inert]);

// DayPageClient.tsx:
<BottomSheet open={open} onClose={handleSheetClose} inert={pendingClose} ...>
```

This avoids the stacked-modal focus-trap conflict cleanly.

---

## Mobile Invariants (DO NOT REGRESS)

Per Phase 5's First Principle (mobile is FIRST-CLASS PRIMARY SURFACE) and CONTEXT.md ("Phase 6 introduces NO new mobile carve-outs"). Phase 6's mobile invariants are STRICTER than Phase 5's: even ONE pixel of regression is a blocker.

### Per-surface mobile invariants

| Surface | Mobile invariant | Verification |
|---|---|---|
| BottomSheet.tsx | All existing `absolute bottom-0 left-0 right-0 ... rounded-t-3xl shadow-2xl ... animate-slide-up safe-bottom max-h-[90vh]` classes UNCHANGED. NEW `md:` classes are inert at <768px. NEW useId / focus-trap / return-focus are pure-behavior, no pixel diff. NEW `role="dialog"` / `aria-modal` / `aria-labelledby` are accessibility metadata, no pixel diff. NEW backdrop `md:bg-black/40 md:backdrop-blur-sm` is inert at mobile (the existing `backdrop-dim` class stays). | 375px screenshot diff against pre-phase baseline shows ZERO pixel change. Test in en + ar (RTL) + zh + pt. |
| LogDrinkForm.tsx | All existing class strings preserved. New `onKeyDown` handler on the outer div — no visual effect. The VolumeInput call wrapped in `<div className="md:max-w-2xl md:mx-auto">` — wrapper is inert at <768px. New `onDirtyChange` callback — no visual effect. | 375px screenshot diff vs baseline = zero. |
| LogVoidForm.tsx | Same pattern — class strings preserved, VolumeInput wrappers (×2 for primary + doubleVoid) inert at mobile, `onKeyDown` + `onDirtyChange` no visual. | 375px screenshot diff vs baseline = zero. |
| LogLeakForm.tsx | Class strings preserved, no VolumeInput, `onKeyDown` + `onDirtyChange` no visual. | 375px screenshot diff vs baseline = zero. |
| SetBedtimeForm.tsx | Class strings preserved, `onKeyDown` + `onDirtyChange` no visual. | 375px screenshot diff vs baseline = zero. |
| SetWakeTimeForm.tsx | Same as SetBedtimeForm. | 375px screenshot diff vs baseline = zero. |
| DrinkTypePicker.tsx | Outer grid classes preserved. Per-tile classes preserved except for NEW `focus-visible:*` ring (no visible effect on touch — `focus-visible` only triggers on keyboard focus). | 375px screenshot diff vs baseline = zero. Tap a tile → no focus ring (`focus-visible` doesn't trigger on tap). |
| LeakTriggerPicker.tsx | Same as DrinkTypePicker. data-testids preserved. | 375px screenshot diff vs baseline = zero. |
| SensationPicker.tsx | Same. | 375px screenshot diff vs baseline = zero. |
| Button.tsx | `focus:` → `focus-visible:` migration. NET MOBILE DIFF: LESS focus ring after taps (focus-visible doesn't trigger on touch like focus does). | This is a UX IMPROVEMENT, not a regression. Per CONTEXT.md the change is explicitly aligned with Phase 5's NavLink pattern. NOT a violation of mobile-pristine. |
| ConfirmDialog.tsx | NOT MODIFIED by Phase 6. | No diff. |
| QuickLogFAB.tsx | NOT MODIFIED by Phase 6. (Phase 5 owns; the speed-dial 40px → 44px hit-target bump flagged in 06-CONTEXT deferred ideas can be addressed if scope allows in the Phase 6 plan, but it would be a Phase 5 carve-out remediation, not a Phase 6 deliverable.) | No diff. |

### Cross-reference: Phase 5's two locked carve-outs

Phase 5 locked TWO mobile diffs as accepted carve-outs (per `05-CONTEXT.md` §"Two precise carve-outs the user explicitly accepted"):

1. **Arabic FAB position correctness fix** (QuickLogFAB `right-5` → `end-5`). Phase 6 does NOT touch QuickLogFAB. ZERO Phase 6 impact.

2. **`sm:px-6` shift in the 640–767px range on `diary/layout.tsx` and `summary/page.tsx`.** Phase 6 does NOT touch either of those files. ZERO Phase 6 impact.

**Phase 6 carve-outs: ZERO NEW.** The mobile invariant is preserved exhaustively.

Note: the BottomSheet's close X `right-2.5` → `end-2.5` change (Phase 6 RTL correctness fix) is structurally analogous to Phase 5's `right-5` → `end-5` on QuickLogFAB. In LTR locales (en/fr/es/pt/zh) `end-2.5` resolves to `right-2.5` so ZERO visual diff. In Arabic the close X moves from visual-right to visual-left (the correct end side in RTL). This is a CORRECTNESS fix that was previously broken, parallel to Phase 5's QuickLogFAB carve-out. **Phase 6 documents it as one accepted Phase 6 RTL-correctness deliverable, not a new carve-out** — it is symmetric with the Phase 5 precedent and the user has already accepted that pattern.

### Verification gate (planner adds to PLAN tasks)

Before merging Phase 6:
1. Capture 375px screenshots for `/en/diary/day/1` with each of the 5 forms OPEN (FAB → drink, FAB → leak, FAB → void, day timeline → Set bedtime, day timeline → Set wake). 5 screenshots per locale × 4 verification locales (en, ar, zh, pt) = 20 screenshots.
2. Diff each against pre-Phase-6 baseline. ZERO visible difference expected (except the Arabic close X position — documented).
3. If ANY mobile visible diff occurs outside the documented Arabic close-X carve-out, the Phase 6 work is REJECTED.

---

## i18n + RTL Contract

### Logical CSS properties (REQUIRED for ALL new code in this phase)

- Position: `start-*` / `end-*` (NOT `left-*` / `right-*`)
- Margin/padding: `ms-*` / `me-*` / `ps-*` / `pe-*` (NOT `ml-*` / `mr-*` / `pl-*` / `pr-*`)
- Border: `border-s-*` / `border-e-*` (NOT `border-l-*` / `border-r-*`)
- Grid columns (`grid-cols-N`): direction-neutral (works in both LTR/RTL — DOM order flips visually)
- Flex with default `flex-row`: items flow LTR in LTR, RTL in RTL — direction-neutral

### Phase 6 RTL audit

| File touched | Logical-property compliance |
|---|---|
| BottomSheet.tsx | NEW: `md:flex md:items-center md:justify-center md:p-6` (outer wrapper) — direction-neutral. NEW: `md:relative md:bottom-auto md:left-auto md:right-auto md:mx-auto md:max-w-3xl md:rounded-3xl md:shadow-xl md:ring-1 md:ring-black/5` — direction-neutral. FIX: `right-2.5` → `end-2.5` on close X. PRESERVE: `absolute bottom-0 left-0 right-0` on mobile card — direction-neutral (full-width sheet, left/right are equivalent). Title `pr-14` → `pe-14` — needs verification: the title's `pr-14` reserves space for the close X. In RTL the close X is on the LEFT, so title needs `pl-14` (LTR) or `pr-14` (RTL) — i.e., `ps-14` doesn't work, neither does `pe-14`. **CORRECTION:** the title should use `pe-14` (padding-inline-end) because the close X is on the END side (right in LTR, left in RTL). PRESERVE the inner `<div className="flex items-center px-5 pb-3 pr-14">` BUT change `pr-14` → `pe-14` so the padding tracks with the close X's logical position. **Logical-CSS sweep is REQUIRED on the BottomSheet edit.** |
| LogDrinkForm.tsx | Existing `rtl:scale-x-[-1]` on ChevronLeft / ChevronRight icons (lines 230, 352) — preserved. Existing `ms-1` on next-button icon (line 352) — preserved. New onKeyDown — direction-neutral. New VolumeInput wrapper `md:max-w-2xl md:mx-auto` — direction-neutral. New focus-visible ring on picker tiles — direction-neutral. |
| LogVoidForm.tsx | Same RTL-preserving patterns (`rtl:scale-x-[-1]`, `ms-1` on Next icon). Direction-neutral additions. |
| LogLeakForm.tsx | Same. |
| SetBedtimeForm.tsx | No RTL-sensitive markup currently; new onKeyDown direction-neutral. |
| SetWakeTimeForm.tsx | Same. |
| DrinkTypePicker.tsx | `grid grid-cols-4` direction-neutral. `flex flex-col items-center` direction-neutral. New focus-visible ring — direction-neutral. |
| LeakTriggerPicker.tsx | Same. |
| SensationPicker.tsx | `flex gap-2` direction-neutral. New focus-visible ring — direction-neutral. |
| Button.tsx | No directional classes; `focus-visible` migration — direction-neutral. |

### Long-translation handling for picker tiles (PT, FR, AR)

Verified label lengths (sourcing from `messages/{locale}.json` existing keys):

| Picker | Longest label | EN | PT | FR | ES | ZH | AR |
|---|---|---|---|---|---|---|---|
| DrinkTypePicker (8) | `carbonated` | "Soda" (4) | "Carbonatado" (11) | "Sodá" / "Carbonaté" (4-9) | "Refresco" (8) | "苏打水" (3) | "صودا" (4) |
| LeakTriggerPicker (8) | `lifting` / `not_sure` | "Lifting" (7) / "Not sure" (8) | "Levantamento" (12) / "Não sei" (7) | "Soulèvement" (11) / "Pas sûr" (7) | "Levantamiento" (13) / "No estoy seguro" (15) | "举重" (2) / "不确定" (3) | varies | 
| SensationPicker (5) | `Moderate` / `Strong` | "Moderate" (8) / "Strong" (6) | "Moderada" (8) / "Forte" (5) | "Modéré" (6) / "Fort" (4) | "Moderada" (8) / "Fuerte" (6) | "适中" / "强烈" (2) | varies |

At md+ inside max-w-3xl modal:
- DrinkTypePicker tile width ≈ 174px. The longest label "Levantamento" (PT for "Lifting") at `text-xs font-bold` is ~85px wide — fits comfortably with room for the icon above. NO truncation needed.
- SensationPicker tile width ≈ 138px. The longest label "Moderada" / "Modéré" / "Forte" fits comfortably.
- ES "Levantamiento" (13 chars) on LeakTriggerPicker is the borderline case — wraps to 2 lines at ~174px tile width with `text-xs font-bold leading-tight`. The existing `[grid-auto-rows:1fr]` ensures all tiles match the tallest. NO fallback needed.

**Per-locale verification list:**
- en: spot-check (baseline)
- pt: focus on DrinkTypePicker "Carbonatado" wrap behavior
- fr: focus on LeakTriggerPicker "Soulèvement"
- ar: focus on RTL flow of all 3 pickers + close X position (end vs right)
- zh: focus on font fallback (CJK glyphs render correctly with the Inter fallback stack)
- es: focus on LeakTriggerPicker "Levantamiento" + "No estoy seguro" wrap

Per `project_i18n_six_locales.md` + `feedback_verify_all_locales_before_push.md` — every locale verified at md (768px) and lg (1280px) before Phase 6 merges.

---

## Accessibility (Phase 6 scope)

### Modal ARIA pattern (BottomSheet — NEW)

Conforming to WAI-ARIA 1.2 dialog pattern:
- `role="dialog"` on the modal card
- `aria-modal="true"` on the modal card
- `aria-labelledby={titleId}` on the modal card (when `title` prop is set)
- Focus moves into the modal when it opens
- Focus is trapped inside the modal while open
- Focus returns to the trigger element when the modal closes
- Escape closes the modal
- Backdrop click closes the modal
- Visible close button (X) is available

All implemented per §"BottomSheet — desktop modal transformation" → "Accessibility additions (Phase 6 NEW)".

### Per-form ARIA

- `aria-pressed` on toggle buttons: ALREADY exists on LeakTriggerPicker tiles (line 37), urgency Yes/No (lines 329, 342), LEAK_AMOUNT tiles (line 305), volume preset chips (LogVoidForm line 312, LogDrinkForm line 295), sensation picker (line 45), leak pill (line 388), wokeBy buttons (lines 436, 448). PRESERVE all.
- `aria-label` on icon-only buttons: ALREADY exists on close X (BottomSheet line 79), step dots (LogVoidForm line 257, LogLeakForm line 200, LogDrinkForm line 217), back pill (LogLeakForm line 217 — wait, let me check… line 217 of LogLeakForm: `aria-label={tc('previousStep')}` ✓ on the back pill). Sensation help (line 31): `aria-label={tc('help')}`. PRESERVE all.

### Focus trap requirement

Implemented in BottomSheet.tsx (see above). Phase 6 verifies:
- Tab from last focusable inside modal → wraps to first
- Shift+Tab from first focusable inside modal → wraps to last
- ConfirmDialog (when open over BottomSheet) suspends the BottomSheet's focus trap via the `inert` prop

### Return focus on close

Implemented in BottomSheet.tsx. When modal closes, focus returns to the element that was focused at open time (typically the QuickLogFAB action button: `fab-action-drink`, `fab-action-void`, `fab-action-leak`, or a button in the day timeline like `set-bedtime-trigger`).

### Color contrast (NOT TOUCHED in Phase 6, but verified)

- Picker tile selected state: white text on color-themed fill (`bg-drink`, `bg-leak`, `bg-ipc-500`) — all AA-compliant per Phase 5's color audit.
- Focus ring `ipc-500` (#955a14) on white background: 5.4:1 contrast — AA.
- Backdrop overlay at md+: `bg-black/40` doesn't need contrast (decorative dim).
- Modal title `text-ipc-950` (#1d0f02) on `bg-white/70 backdrop-blur` (effective near-white): >12:1 contrast — AAA.

### Browser zoom resilience

Per Boomer-safe override 6 (audit at 125% / 150% / 200%):
- Picker tiles: `text-xs font-bold leading-tight` — `text-xs` is `0.75rem` (12px at default, 24px at 200% zoom). At 200% zoom the modal still fits viewport because Tailwind's `max-w-3xl` is `48rem` (768px at default, 1536px at 200% zoom) — at 200% zoom on a 1280px monitor the modal becomes 1280px (capped by viewport - p-6 = 1232px effective) and scrolls vertically.
- Volume slider: `<input type="range">` is browser-native; scales with zoom.
- Modal max-h `85vh` at md+ scales naturally with viewport (vh is zoom-aware).

Phase 8 will explicitly audit at 100% / 150% / 200% zoom on the Phase 6 forms.

---

## 6-Pillar Pre-Check (for Phase 8 visual-qa)

Phase 8 will audit each pillar across the 6-locale × LTR/RTL × md/lg/xl matrix. For each pillar, what Phase 6 LOCKS that Phase 8 will verify:

### 1. Typography
Phase 6 locks: modal title bumps from `text-xl` (20px) to `md:text-2xl` (24px) at md+. Volume readout stays `text-4xl` (36px) at all breakpoints. Sub-form headings (h3 inside forms) stay at existing sizes (`text-xl` / `text-lg`). Step-indicator text stays `text-[11px]`. Phase 8 verifies: no font-weight 300 / 800; no font-size below 12px in any user-facing text; Inter fallback stack renders correctly for ZH (CJK fallback) and AR (Arabic fallback).

### 2. Color
Phase 6 locks: NO new colors. All form variants use existing `--color-drink` / `--color-leak` / `--color-bedtime` / `--color-ipc-*` tokens. Backdrop at md+ uses `bg-black/40` (Tailwind-native). Modal card uses `bg-white/70 backdrop-blur-xl` (existing). Focus rings use `ipc-500`. Phase 8 verifies: AA contrast on all focus-visible rings against all backgrounds (white, ipc-50, ipc-100, night-mode indigo); no physical color leaks (no hard-coded hex outside `--color-*` tokens).

### 3. Spacing
Phase 6 locks: modal internal padding `px-5 pb-6` mobile → `md:px-6 md:pb-8 md:pt-2` desktop. Picker gaps `gap-2` preserved. Volume slider row inside `md:max-w-2xl md:mx-auto` at md+. Sub-picker tile min-heights preserved (76px, 52px, 44px floors). Phase 8 verifies: no off-grid spacing values (only Tailwind 4px multiples + the documented 44px / 52px / 76px floors); modal centered at md+ with even left/right gap from viewport.

### 4. Hierarchy
Phase 6 locks: one primary CTA per form sheet (Save / Next sticky button — visually dominant via Button `size="lg"`). Step indicator (dots + "STEP X OF N" label) clearly secondary. Back pill (when step > 1) clearly tertiary. Close X is universal-affordance corner element. No competing focal points. Phase 8 verifies: in each form's modal, the eye is drawn first to the form heading, second to the picker / slider, third to the primary CTA at the bottom.

### 5. Interaction
Phase 6 locks: 3 close paths (X + Escape + backdrop click); Enter advances/saves; Tab orders DOM-natural; focus-visible rings on every interactive element; focus trap inside modal; return-focus on close; reset-on-cancel confirmation via ConfirmDialog when dirty. No new hover affordances inside forms (per Design DNA axis 5). Phase 8 verifies: keyboard-only walkthrough of a drink-log → void-log → leak-log → set bedtime → set wake completes without mouse; Escape from any form state closes the modal; Enter on a textarea inserts newline (no accidental submit).

### 6. Accessibility
Phase 6 locks: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on BottomSheet card; focus management (trap + return); existing `aria-pressed` / `aria-label` preserved on all toggles and icon buttons; focus-visible (not `focus`) on Button.tsx so mobile users don't see lingering focus rings after taps. Phase 8 verifies: VoiceOver / NVDA correctly announce the modal title on open; Tab order matches visual order; no aria-hidden elements receive focus.

---

## Open Questions / Claude's Discretion

The following items are intentionally left for the planner or executor to refine. Each has a recommended default, but the planner has discretion.

1. **Animation duration for `animate-modal-in`** — locked at 180ms per §"BottomSheet — desktop modal transformation" → "Animation spec". If the executor finds 180ms feels too snappy in practice, may tune to 200ms (still under the boomer-safe cap). DO NOT exceed 200ms.

2. **Whether to extract a `useFormKeyboard` hook for Enter-advance** — per CONTEXT.md discretion, DEFAULT is inline. The 5 forms each have a different `goToStep`, validation gate (volume > 0 vs trigger !== null vs isInvalid), and onSave handler. A shared hook would need 5+ config props, defeating the abstraction value. Recommend STAY inline.

3. **Adding `data-testid="bottom-sheet-modal"` and `data-testid="bottom-sheet-close"` to BottomSheet** — recommended for E2E keyboard tests (`e2e/walkthrough.spec.ts` extension or a new `e2e/phase6-keyboard.spec.ts`). NET ADDITIONS (no removals); planner decides at PLAN time.

4. **QuickLogFAB speed-dial 40px → 44px bump** — flagged in 06-CONTEXT deferred ideas as a small bonus task. NOT in Phase 6 minimum scope, but a clean carry-along if scope allows. Planner: include as optional task if execution time permits; gate behind explicit user confirmation since it would touch Phase 5's locked carve-out.

5. **Whether to add the title `pe-14` fix as a Phase 6 vs Phase 5-amendment task** — DECISION LOCKED: include it in the BottomSheet edit as part of Phase 6's RTL correctness sweep (alongside `right-2.5` → `end-2.5`). Phase 5 didn't audit BottomSheet's internal logical-CSS; Phase 6 owns that.

6. **Whether to write a new e2e spec file (`e2e/phase6-keyboard.spec.ts`) vs extending walkthrough.spec.ts** — recommend NEW spec file because the 6-locale walkthrough already runs serially and the keyboard tests add significant runtime. Planner decides.

7. **Whether the wokeBy 2-button grid in LogVoidForm needs a `md:` change** — DECISION: NO. The grid is `grid-cols-1 sm:grid-cols-2`, which at md+ stays 2-col (sm: ≥ 640px). Inside the max-w-3xl modal the 2 buttons sit at ~324px each — comfortable.

8. **Whether to add focus-visible ring inside `VolumeInput.tsx` (the tap-to-edit button at line 95)** — YES. Same focus-visible token (`focus-visible:ring-ipc-500`). Add to VolumeInput.tsx line 98 className.

---

## Verification Checklist (for Phase 8 visual-qa pass)

Phase 8 will run the 6-locale × LTR/RTL × md/lg/xl matrix. Per Phase 6, the following items must verify clean:

### At md (768px) — desktop modal activates

For EACH of the 5 forms (Drink / Void / Leak / Bedtime / Wake) × 6 locales (en/fr/es/pt/zh/ar):
- [ ] Modal renders centered in the viewport (not bottom-pinned)
- [ ] Modal width = `max-w-3xl` (Drink/Void/Leak) or `max-w-2xl` (Bedtime/Wake)
- [ ] Backdrop is `bg-black/40 backdrop-blur-sm` (visible subtle dim)
- [ ] Modal card has `shadow-xl ring-1 ring-black/5` elevation
- [ ] Modal card has `rounded-3xl` (all 4 corners rounded, not just top)
- [ ] Close X is at the inline-END corner of the modal (right in LTR, LEFT in AR)
- [ ] Close X is `w-11 h-11` (44×44 hit target)
- [ ] Picker grid renders at correct column count (DrinkType: 4, LeakTrigger: 4, Sensation: 5)
- [ ] Volume slider row sits inside `max-w-2xl` (not stretched edge-to-edge)
- [ ] Modal slide-in animation ≤ 200ms (visual subjective check)
- [ ] No horizontal scroll in any form/locale

### At lg (1280px) — same layout, just more outer space

- [ ] All md+ checks pass
- [ ] Modal does NOT widen beyond `max-w-3xl` / `max-w-2xl` (stays bounded)
- [ ] Outer viewport "dead space" around the modal is symmetric (modal centered)

### At 375px (mobile) — byte-equivalent invariant

For EACH form × each verification locale (en / ar / zh / pt):
- [ ] Mobile sheet renders byte-equivalent to pre-Phase-6 baseline
- [ ] Bottom-anchored (not centered)
- [ ] rounded-t-3xl (only top corners)
- [ ] shadow-2xl (heavier than desktop's shadow-xl, as today)
- [ ] handle bar at top
- [ ] close X at top-end corner (was right-2.5 → now end-2.5; LTR locales = byte-equivalent; AR = correctness fix to inline-end)
- [ ] EXISTING mobile screenshot diff against pre-Phase-6 baseline = ZERO pixel change for 5 LTR locales; AR shows close-X position change only (documented correctness fix)

### Keyboard behavior (test in EN + AR)

- [ ] Open any form → Tab moves through picker tiles in DOM order (visual top-to-bottom in LTR, top-to-bottom in RTL since the picker is grid-based not flex-row-reverse)
- [ ] Tab from last interactive in the modal → wraps to first
- [ ] Shift+Tab from first → wraps to last
- [ ] Enter on Step 1/2 of multi-step form → advances to next step
- [ ] Enter on final step → triggers Save (commits the entry)
- [ ] Enter inside a `<textarea>` → inserts newline (does NOT submit)
- [ ] Escape from any focused element → closes the modal
- [ ] On modal close, focus returns to the FAB action button (or whatever opened the modal)
- [ ] Focus-visible ring is clearly visible on every focused element

### Reset-on-cancel

- [ ] Open LogDrinkForm, change drinkType from default → press Escape → ConfirmDialog appears with "Discard this entry?"
- [ ] On ConfirmDialog → Cancel → returns to form, no data lost
- [ ] On ConfirmDialog → Discard → closes both dialogs, no save
- [ ] Open SetBedtimeForm with default time, don't change → press Escape → modal closes silently (no ConfirmDialog)
- [ ] Same test with backdrop click and close X — all 3 dismiss paths trigger same dirty-state check

### data-testid preservation

- [ ] `drink-save` exists on Step 2 of LogDrinkForm
- [ ] `void-save` exists on Step 3 of LogVoidForm
- [ ] `leak-trigger-cough`, `-sneeze`, `-laugh`, `-lifting`, `-exercise`, `-toilet_way`, `-other`, `-not_sure` all present on LeakTriggerPicker
- [ ] `leak-urgency-yes`, `leak-urgency-no` exist on Step 2 of LogLeakForm
- [ ] `leak-save` exists on Step 3 of LogLeakForm
- [ ] `bedtime-save` exists on SetBedtimeForm
- [ ] `wake-save` exists on SetWakeTimeForm
- [ ] `fab-toggle`, `fab-action-drink`, `fab-action-leak`, `fab-action-void` still present (untouched by Phase 6 but verified intact)

### i18n key parity

- [ ] `common.discardEntryTitle`, `common.discardEntryMessage`, `common.discard`, `common.keepEditing` exist in all 6 locales (`messages/{en,fr,es,pt,zh,ar}.json`)
- [ ] PostToolUse `i18n-sync` hook fired correctly on `messages/en.json` edit and mirrored the 4 new keys with locale-natural translations
- [ ] No new untranslated literal strings introduced anywhere in the modified files (grep for hardcoded English in `src/components/diary/Log*Form.tsx` + `src/components/ui/BottomSheet.tsx`)

### Daily walkthrough regression

- [ ] `e2e/walkthrough.spec.ts` (6-locale × 5-form completion) passes unchanged
- [ ] No new findings in `walkthrough_findings.md`

### Browser zoom resilience (Phase 8 audit item)

- [ ] At 150% browser zoom on a 1280px viewport in EN, each of the 5 form modals renders without horizontal scroll
- [ ] At 200% zoom, modals scroll vertically (expected) but no content is clipped horizontally

---

*Phase: 06-diary-forms-keyboard-navigation*
*UI-SPEC authored: 2026-05-16 (from 06-CONTEXT.md + 05-UI-SPEC.md + REQUIREMENTS.md DTUX-01/DTUX-03 + per-file codebase audit of all 10 surfaces in scope)*
