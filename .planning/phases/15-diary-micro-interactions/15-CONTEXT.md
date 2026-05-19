# Phase 15 — Diary Micro-Interactions · CONTEXT

**Milestone:** Clinical Polish + Interop (Milestone 4)
**Started:** 2026-05-18 (scaffolded)
**Status:** Awaiting Phase 14; plans not yet written
**Depends on:** Phase 14 (empathy beats lock the visual language Phase 15 builds on); no hard dep on Phase 13

---

## Why this phase exists

The diary is where the patient spends 90% of their time in the app. Today, each log action (void, drink, leak) is mechanically correct but feels like filling out a form. Volume preset chips do nothing visually when tapped beyond a color change. Day transitions happen abruptly. The first morning void auto-detection is a clinical achievement the patient never knows happened.

Airbnb-grade detail isn't about adding animation for its own sake — it's about every interaction having a small confirmation that the system noticed. A volume chip tap should feel *satisfying*. A successful log save should feel *registered*. A day transition should feel *acknowledged*. None of these are required for clinical correctness; all of them are required for the app to feel alive instead of clinical.

---

## Goal

> Every action in the diary surface has a small interaction confirmation that respects the boomer-safe UX register. Volume chips fill with color on tap. Logging saves with a haptic + soft visual confirmation on mobile. Day transitions ack the patient's progress with a brief celebratory beat. The first morning void educational tooltip surfaces once, with the right context, never nagging. Nighttime fades in gently when bedtime is logged. By the end of this phase, the diary surface feels alive without crossing into gimmicky.

---

## Requirements (to be added to REQUIREMENTS.md as MI-01..06)

- **MI-01** — **Volume preset chip liquid-fill animation**. On tap, the chip fills with its selected color from bottom-up over ~180ms. Visually communicates "your selection is registered" beyond color change alone. Honors `prefers-reduced-motion` → instant fill.
- **MI-02** — **Haptic feedback on log save** (mobile only). `navigator.vibrate(15)` on a successful void/drink/leak save. Single short pulse — not a buzz. Web Vibration API gracefully degrades on browsers/devices without support. User-settable toggle in settings (default ON for mobile, N/A for desktop).
- **MI-03** — **Day-transition acknowledgment**. When the patient completes the last expected event of Day 1 (or 2) and the route advances to Day 2 (or 3), a brief acknowledgment overlay appears for ~1.5s: "Day 1 done. 2 to go." Auto-dismisses; no user action required. Locale-aware copy.
- **MI-04** — **FMV educational tooltip** — first time the auto-detector flags a void as the first morning void, a single-pass tooltip appears explaining what FMV means and why it matters for the clinical metrics. Persists state — never shown twice. Dismissible.
- **MI-05** — **Bedtime "good night" cue** — when the patient logs a bedtime that triggers nighttime mode, a subtle ~2s fade-in transition into the existing night-mode color palette. Currently the night-mode color shift happens instantly; this phase gives it a moment to land.
- **MI-06** — **Subtle time-of-day gradient drift** — the AppShell background subtly shifts hue based on the patient's stored timezone time (warm morning, neutral midday, cool evening). Lower-priority polish; can be cut if it conflicts with the night-mode aesthetic.

---

## Success criteria (TBD via planner; sketch)

1. Tap a volume preset chip → visible liquid-fill animation completes in 180ms.
2. Save a void on a mobile browser with Vibration API → device vibrates once (verified via mobile manual checkpoint).
3. Complete Day 1's last expected event → Day-transition overlay shows for 1.5s with locale-correct copy in all 6 locales.
4. First FMV auto-detection → tooltip appears once; subsequent FMV detections do not re-fire (localStorage flag).
5. Log a bedtime in afternoon → night-mode fade-in animates over 2s instead of switching instantly.
6. `prefers-reduced-motion: reduce` → all animations become instant; haptic still fires (it's not motion).
7. axe-core a11y sweep passes (Phase 11 baseline holds; new tooltip is properly announced).

---

## Constraints

- **Boomer-safe.** Subtle is better than splashy. No bouncy easings; cubic-bezier curves should feel professional.
- **Haptic is optional and opt-out-able.** Some users find vibrations jarring.
- **6-locale parity** for new copy (Day-transition overlay, FMV tooltip).
- **Performance.** Animations must not jank on a 4-year-old Android device. Use `transform` + `opacity` only; avoid layout-triggering properties.
- **No new heavy dependencies.** Framer Motion / GSAP rejected; use Tailwind keyframes + CSS variables.
- **TS strict + ESLint clean.**

---

## Out of scope

- Sound design / chimes (auditory accessibility complexity; explicit out-of-scope per audit guidance)
- Gamification beyond Day 1 celebration (medical-grade integrity)
- Full Lottie animation system (overkill for this scope)
- Customizable haptic patterns (over-engineering)

---

## Key planning questions

1. **MI-02 haptic settings integration:** new settings panel or piggy-back on existing notifications-permission UX? Recommend the latter.
2. **MI-03 day-transition overlay placement:** between diary day routes, or as a route-level overlay? Recommend route-level.
3. **MI-04 FMV tooltip storage:** localStorage flag `fmvTooltipShown` vs. store action. Recommend store action for IndexedDB persistence.
4. **MI-06 time-of-day gradient priority:** include in initial plan or defer to post-launch polish? Recommend defer if it conflicts with night-mode timing.
5. **Plan splitting:** 3 plans (chip + haptic / day-transition + FMV tooltip / bedtime fade + verification spec) OR 4 (split day-transition from FMV tooltip). Recommend 3.

---

## Related artifacts

- `src/components/diary/LogVoidForm.tsx`, `LogDrinkForm.tsx`, `LogLeakForm.tsx` — chip-fill install sites
- `src/components/diary/QuickLogFAB.tsx` — haptic trigger site
- `src/components/diary/DayPageClient.tsx` — day-transition acknowledgment site
- `src/components/diary/Day1Celebration.tsx` — pattern reference for celebration overlays
- `src/lib/store.ts` — `markMorningVoid` for FMV detection callback hook
- `src/app/globals.css` — night-mode CSS overrides
- `docs/UX_PHILOSOPHY.md` — boomer-safe register
