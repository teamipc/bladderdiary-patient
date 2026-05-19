# Phase 16 — Summary Celebration + Animated Metrics · CONTEXT

**Milestone:** Clinical Polish + Interop (Milestone 4)
**Started:** 2026-05-18 (scaffolded)
**Status:** Awaiting Phases 14 + 15; plans not yet written
**Depends on:** Phase 15 (motion + interaction language locked) and Phase 13 (the Clinical Export Package — Phase 16 surfaces the hero CTA from Phase 13 above the fold)

---

## Why this phase exists

The summary page is the "moment of truth" — the patient just spent 3 days logging, and now they see what they accomplished. Today the page renders clinical metrics in static cards, observations in a sequential list, and an export-actions row. It's correct but uneventful. The patient who just gave you 72 hours of attention deserves a *moment*.

Airbnb's booking-confirmed screen does this well: there's a clear "✓ Booked" hero, a stat block that counts up (price, dates), a "share with co-traveler" hero CTA prominent above the fold, and observation-style detail cards that animate-in sequentially. The user feels rewarded and immediately knows what to do next.

For this clinical app, the "what to do next" is **share with clinician** — and that's exactly the Phase 13 Clinical Export Package hero CTA. Phase 16 elevates that surface.

---

## Goal

> A patient who completes 3 days of diary lands on `/summary` and is rewarded with a brief celebration moment, animated metric reveal (24HV / NPi / AVV / MVV / NBC count up from 0), sequentially-revealed observation cards, and the Phase 13 "Send to healthcare team" hero CTA above the fold. By the end of this phase, the summary page closes the diary arc with a clear sense of accomplishment + an unambiguous next step.

---

## Requirements (to be added to REQUIREMENTS.md as CEL-01..05)

- **CEL-01** — **Hero celebration moment** at the top of `/summary` for newly-completed diaries: subtle marker (NOT confetti — boomer-safe) + locale-aware "You did it. 3 days, complete." copy. Auto-fades after first view (localStorage flag).
- **CEL-02** — **Animated metric reveal** — when summary mounts, the 5 IPC clinical metrics count up from 0 to their final values over ~800ms with stagger. `prefers-reduced-motion: reduce` → values appear at final state instantly.
- **CEL-03** — **Sequential observation cards** — observation cards animate-in one at a time (~150ms stagger). Honors reduced-motion.
- **CEL-04** — **Hero "Send to healthcare team" CTA pinned above the fold** — surfaces the Phase 13 Clinical Export Package primary action prominently at the top of `/summary`, before the metrics block. The existing ExportActions component (now demoted in Phase 13 to disclosure) is still accessible below.
- **CEL-05** — **3-day completion hero state** — when the patient hits the 3-day mark, the route shows a one-time hero "your diary is ready to share" state with strong visual hierarchy. After the first dismiss/share, subsequent visits show the normal summary layout.

---

## Success criteria (TBD via planner; sketch)

1. First visit to `/summary` after Day-3 completion shows the celebration marker + hero "Send to healthcare team" CTA at the very top of the page.
2. Metric values count up from 0 to final over ~800ms with 150ms stagger per metric (5 metrics → 0.8s total).
3. Observation cards reveal sequentially as the user scrolls (intersection observer) — not all-at-once.
4. `prefers-reduced-motion: reduce` → metrics render at final values, observations render simultaneously, no count-up animation.
5. Second visit to `/summary` (returning patient) → celebration suppressed; normal layout.
6. 6-locale parity for celebration copy.
7. axe-core a11y sweep passes; `aria-live="polite"` on the metric count-up region so screen readers announce values once they settle.

---

## Constraints

- **Boomer-safe.** Celebration is a *moment*, not a *party*. Subtle marker + clear copy beats confetti every time.
- **Performance.** Number ticker must not jank — use CSS `@property` + animation or `requestAnimationFrame`-throttled state. Test on 4-year-old Android.
- **Screen-reader experience.** Count-up animations are visually compelling but should not bombard SR users with rapid number announcements. Use `aria-live="polite"` and only announce final values.
- **No new heavy dependencies.** No CountUp.js — write a small custom hook (~20 lines).
- **6-locale parity.**
- **TS strict + ESLint clean.**

---

## Out of scope

- Email follow-up to the patient ("Here's a copy of your diary") — requires email infra, out of bounds for static-export
- Sharing to social media — anti-pattern for clinical software
- Customizable celebration intensity — over-engineering
- Achievement badges / streak system — gamification, anti-pattern

---

## Key planning questions

1. **CEL-02 count-up implementation:** custom hook with `requestAnimationFrame` vs. CSS `@property` registered values + transition. Recommend custom hook for broader browser support.
2. **CEL-03 observation reveal trigger:** IntersectionObserver (reveals as scrolled into view) vs. immediate stagger (animates all at once on mount). Recommend IntersectionObserver — more polished, doesn't waste motion on cards the patient hasn't seen.
3. **CEL-05 first-visit detection:** localStorage flag vs. store action with IndexedDB persistence. Recommend store action.
4. **Plan splitting:** 3 plans (hero celebration + first-visit state / metric count-up + observation reveal / verification spec) OR 2 (combine hero + metrics). Recommend 3.

---

## Related artifacts

- `src/app/[locale]/summary/page.tsx` — primary surface
- `src/components/summary/` — observation cards + metric components
- `src/components/export/ExportActions.tsx` — Phase 13 hero CTA install site (will be reshaped in Phase 13)
- Phase 13 CONTEXT — for the hero CTA copy + behavior
- Memory `ux_philosophy.md` — boomer-safe register
