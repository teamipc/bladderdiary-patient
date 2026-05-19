# Phase 17 — Motion System + Page Transitions · CONTEXT

**Milestone:** Clinical Polish + Interop (Milestone 4)
**Started:** 2026-05-18 (scaffolded)
**Status:** Awaiting Phases 14 + 15 + 16; plans not yet written
**Depends on:** Phases 14-16 (the motion language settles across those phases; Phase 17 consolidates)

---

## Why this phase exists

Phases 14-16 introduce dozens of small animations (chip fills, day transitions, count-ups, observation reveals, celebration markers). Without a motion system, these will drift in timing, easing, and `prefers-reduced-motion` handling. Each phase will solve those locally in its own way, and 6 months from now the codebase will have 8 different easing curves and 3 reduced-motion strategies.

Airbnb's motion language is the opposite: every animation in the app uses a small handful of curves, every duration is one of ~3 values, and `prefers-reduced-motion` is honored from a single place. Patterns compose because they share vocabulary.

This phase is the consolidation pass: extract the motion vocabulary from Phases 14-16 into a single source of truth, refine the BottomSheet motion curves to feel cohesive with everything else, add page-to-page transitions for the diary-day flow, and consolidate `prefers-reduced-motion` into one helper used everywhere.

---

## Goal

> The app has a coherent motion vocabulary: 3 duration tokens (fast/normal/slow), 2-3 easing curves, and a single `useReducedMotion()` helper that all animations consult. Page-to-page transitions in the diary flow (Day 1 → Day 2 → Day 3 → Summary) use a slide / cross-fade pattern. The BottomSheet motion curves refine to match. The codebase reads as if one designer wrote every animation in it.

---

## Requirements (to be added to REQUIREMENTS.md as MOT-01..05)

- **MOT-01** — **Motion design tokens in Tailwind config** — add `duration-fast` (120ms), `duration-normal` (180ms), `duration-slow` (300ms) extending Tailwind's defaults. Add `ease-emphasized` (cubic-bezier matching iOS spec), `ease-decelerated` (entrance), `ease-accelerated` (exit). All animation phases (14-16) must consume these tokens; no inline ms values remain after this phase.
- **MOT-02** — **`useReducedMotion()` hook** — single source of truth at `src/lib/hooks/useReducedMotion.ts`. Subscribes to `prefers-reduced-motion` MediaQueryList. All animation components consume this hook; no inline `@media (prefers-reduced-motion)` queries remain in component code (CSS-level `@media` queries in `globals.css` are still fine for framework-level rules).
- **MOT-03** — **Page-to-page transitions for the diary flow** — slide / cross-fade between `/diary/day/1` → `/diary/day/2` → `/diary/day/3` → `/summary`. Uses View Transitions API where supported with a Tailwind keyframe fallback. Honors `prefers-reduced-motion`.
- **MOT-04** — **BottomSheet motion refinement** — consume the new motion tokens (currently uses hardcoded `180ms cubic-bezier`). Verify the existing Phase 6 BottomSheet feels cohesive with the new page transitions + diary micro-interactions.
- **MOT-05** — **Loading skeleton states with motion personality** — the existing loading states (server-component hydration, summary metric reveal pre-mount, learn article render) get subtle skeleton placeholders with a slow shimmer animation. `prefers-reduced-motion` → static placeholders.

---

## Success criteria (TBD via planner; sketch)

1. Tailwind config exposes 3 duration + 3 easing tokens; all animation phases (14-16) reference them by name; `grep -rn "transition-\\[.*ms\\]" src/` returns zero hits (inline ms eliminated).
2. `useReducedMotion()` hook used in at least 6 animation components across Phases 14-16; `grep -rn "prefers-reduced-motion" src/components` returns zero hits (queries pushed to globals.css + the hook).
3. Navigating Day 1 → Day 2 → Day 3 → Summary uses page transitions (View Transitions API on Chrome 111+, Safari 18+; Tailwind keyframe fallback elsewhere). On `prefers-reduced-motion: reduce`, transitions are instant.
4. BottomSheet open/close animations now reference `duration-normal` + `ease-emphasized` tokens.
5. Summary metric reveal pre-mount shows skeleton placeholders; once data hydrates, real values fade in.
6. axe-core a11y sweep passes (Phase 11 baseline holds).
7. Daily 6-locale walkthrough still green; no visual regression on mobile / tablet / desktop matrices from Phase 8.

---

## Constraints

- **Boomer-safe.** Animations refine but don't bounce. Cubic-beziers feel professional.
- **`prefers-reduced-motion` first-class** — single source of truth via `useReducedMotion()`. Components consult the hook; CSS-level fallback for framework rules.
- **Performance.** View Transitions API where available; Tailwind keyframes otherwise. No layout-triggering properties in transition CSS.
- **No new heavy dependencies.** Reject Framer Motion / GSAP at this scale.
- **6-locale parity** for any new loading-state copy.
- **TS strict + ESLint clean.**
- **View Transitions API graceful degradation.** Browsers without support fall back to keyframe-based transitions; no functionality lost.

---

## Out of scope

- Shared-element transitions (Airbnb-style "tap card → expand to detail view"). Too complex for this scale + not a clear UX win for the diary surface.
- Lottie animation infrastructure. No.
- Animation choreography tools (Storybook stories for motion states, Framer Motion lab). Overkill.
- Customizable motion preferences beyond the OS-level `prefers-reduced-motion`. Over-engineering.

---

## Key planning questions

1. **MOT-03 View Transitions API support matrix:** Chrome 111+, Safari 18+, Firefox 127+. Verify Vercel deploy targets cover the matrix; document fallback for older browsers.
2. **MOT-01 token naming:** Tailwind's existing `duration-*` utilities collide with our intended names. Use `duration-fast` / `duration-normal` / `duration-slow` as custom utilities? OR namespace with `mfc-duration-fast`? Recommend Tailwind extend (less friction).
3. **MOT-04 BottomSheet refinement scope:** just consume tokens, or also visually retune (e.g. tighter spring feel)? Recommend tokens-only — visual is already good per Phase 6 review.
4. **MOT-05 skeleton implementation:** new component vs. inline per-component. Recommend new `<Skeleton>` component with variants (text, card, metric).
5. **Plan splitting:** 4 plans (tokens + hook / page transitions / BottomSheet refine + skeleton / verification) OR 3 (combine BottomSheet + skeleton). Recommend 4.

---

## Related artifacts

- `tailwind.config.js` (or `globals.css` `@theme` block in Tailwind 4) — token install site
- `src/lib/hooks/` — `useReducedMotion` install site (new directory if needed)
- `src/components/ui/BottomSheet.tsx` — MOT-04 refinement site
- `src/app/[locale]/diary/day/[dayNumber]/layout.tsx` — page-transition install site
- Phases 14-16 components — token consumers post-migration
- Memory `ux_philosophy.md` — Boomer-safe 200ms cap (still applies; tokens respect)
