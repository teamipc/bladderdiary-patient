# Phase 14 — Onboarding Empathy Beats · CONTEXT

**Milestone:** Clinical Polish + Interop (Milestone 4)
**Started:** 2026-05-18 (scaffolded)
**Status:** Awaiting Phase 13 (Clinical Export Package); plans not yet written
**Depends on:** Nothing structural (independent UI surface); Phase 13 not a hard dep, but ordered after to keep the medical-grade arc coherent (M3 floor → 13 interop ceiling → 14-17 polish ceiling)

---

## Why this phase exists

The current 3-step onboarding (age → start date → unit/timezone) is functional but cold. A first-time 55-year-old patient hits it after their clinician handed them the URL, and the first thing they see is a form. There's no "why am I doing this," no privacy reassurance, no sense of what they'll get out of completing the diary, and no signal that this app is *for them* rather than a generic medical form.

Airbnb's mobile flow does the opposite: it briefs intent ("Stay anywhere"), reassures ("free cancellation on most stays"), shows the destination before asking for any input, and uses micro-celebration on each step (price-drop badges, host-verified ticks). The user feels carried.

This phase brings that empathy register to onboarding for the boomer-safe 50+ patient. Not gamification — *empathy*. The patient should feel that the app respects their time, protects their data, and is going to produce something their clinician will actually use.

---

## Goal

> A first-time patient hits `/{locale}` and is carried through onboarding by a sequence of reassuring beats: welcome panel framing the value, animated privacy reassurance, sample-export preview, explicit per-step time estimates, and subtle micro-celebration on each step completion. The 3-step wizard remains functional — these are additive empathy beats on top of the existing flow, not a replacement. By the end, the patient knows what they're about to do, why it matters, how long it'll take, and that their data stays on their device.

---

## Requirements (to be added to REQUIREMENTS.md as EM-01..05)

- **EM-01** — **Welcome panel** above the existing wizard. Frames the value ("Your clinician needs this picture of your bladder — 3 days, 30 seconds per entry, then you're done"). Sticky CTA: "Start tracking" — gets the patient to step 1 of the wizard.
- **EM-02** — **Animated privacy reassurance** — a small graphic (animated, `prefers-reduced-motion`-safe) showing "Stays on this device. Nothing uploaded." Cloud icon with strike-through line that draws on first paint. Below the welcome panel; collapsed by default with a "How is my data protected?" disclosure.
- **EM-03** — **Sample-export preview** — thumbnail of a representative PDF first page (the daily-summary view) with caption "Your clinician will see something like this when you're done." Helps the patient understand the deliverable before they invest time.
- **EM-04** — **Per-step time estimate** — each wizard step shows "~10 seconds" / "~30 seconds" in subtle copy near the step indicator. Sets expectation; reduces "is this almost over?" anxiety.
- **EM-05** — **Step-completion micro-celebration** — between wizard steps, a subtle visual beat (checkmark glow + step-indicator advance with motion) acknowledges progress. Boomer-safe: NO confetti, NO sound, NO overlay — just refinement of the existing step transition.

---

## Success criteria (TBD via planner; sketch)

1. Welcome panel + privacy reassurance visible on first paint of `/{locale}` before the patient sees the wizard.
2. Sample-export preview thumbnail loads in under 100ms (pre-bundled as an inline SVG or sized PNG; no network request).
3. Each wizard step shows its time estimate in `messages/<locale>.json` (6-locale parity).
4. Step transitions animate (180ms cubic-bezier, under the Boomer-safe 200ms cap from existing memory `ux_philosophy`).
5. `prefers-reduced-motion: reduce` honored — all animations degrade to instant transitions; static content + checkmarks remain.
6. axe-core a11y sweep passes (Phase 11 baseline holds).

---

## Constraints

- **Boomer-safe.** No confetti, no sounds, no auto-playing video. Subtle is better than splashy.
- **`prefers-reduced-motion` first-class.** Single helper from Phase 17's motion-system phase if it lands first; otherwise inline `@media` guards.
- **6-locale parity** for new copy. `i18n-sync` hook handles the auto-mirror; `naturalize-prose` for register quality (FR=vous, ES=tú, etc.).
- **No new server runtime.** Sample-export preview is a static asset (SVG or PNG in `public/`).
- **No regression on Phase 7's editorial onboarding layout.** This phase adds beats *before* and *between* the wizard; the wizard itself stays at Phase 7's quality.
- **TS strict + ESLint clean.**

---

## Out of scope

- Replacing the 3-step wizard (Phase 7 work; out of bounds)
- Gamification beyond Day 1 celebration (medical-grade-ness suffers)
- A/B testing infrastructure for onboarding variants (separate workstream)
- Animated character or mascot (anti-pattern for clinical software)
- Auto-playing tutorial video (anti-pattern for boomer-safe UX)

---

## Key planning questions

1. **Sample-export preview source:** inline SVG (sharper, scales cleanly, can be locale-aware) vs. PNG screenshot (richer detail, but locale-specific). Recommend SVG.
2. **Privacy graphic implementation:** custom SVG animation vs. Lottie. Recommend custom SVG (no new dependency; <5KB).
3. **Step-transition animation:** Tailwind-class-driven keyframe vs. Framer Motion. Recommend Tailwind keyframe (no new dependency; already used in Phase 6 BottomSheet).
4. **Plan splitting:** 3 plans (welcome+privacy / sample-preview+time-estimate / step-transition+verification spec) OR 1 bundled plan. Recommend 3 — smaller surface per plan.

---

## Related artifacts

- `src/components/onboarding/OnboardingFlow.tsx` (Phase 7 editorial layout to preserve)
- `src/app/[locale]/LandingContent.tsx` (welcome-panel install site)
- `docs/UX_PHILOSOPHY.md` — boomer-safe principles
- Memory `ux_philosophy.md` — 200ms animation cap, no-confetti rule
