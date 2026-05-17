---
phase: "07"
plan: "01"
subsystem: onboarding
tags: [typography, desktop-scaling, keyboard, focus-visible, hit-target, accessibility]
dependency_graph:
  requires: [Phase 5 Container narrow token, Phase 6 Button focus-visible spec]
  provides: [OnboardingFlow desktop layout contract, Enter-advance keyboard contract]
  affects: [OnboardingFlow.tsx only — single-file plan per file-ownership rule]
tech_stack:
  added: []
  patterns: [Tailwind responsive md: prefix additive layering, focus-visible keyboard-only ring, onKeyDown Enter-advance with TEXTAREA+shiftKey guards]
key_files:
  created: []
  modified:
    - src/components/onboarding/OnboardingFlow.tsx
decisions:
  - h2 typography bump locked at md:text-3xl (not md:text-4xl) per UI-SPEC Q1 default
  - Illustration NOT added per UI-SPEC Q2 default-locked (type-driven only)
  - Timezone-change pill NOT touched per UI-SPEC Q4 default (Phase 8 deferral)
  - Calendar icon absolute left-3.5 NOT migrated to start-3.5 (Phase 8 scope)
  - Back-pill +4px (40→44px) is the single accepted Phase 7 mobile carve-out per Boomer-safe override 1
metrics:
  duration_minutes: 30
  completed: "2026-05-17T14:02:29Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 1
---

# Phase 7 Plan 01: OnboardingFlow desktop redesign Summary

**One-liner:** Desktop-responsive typography bumps (md:text-3xl h2s, md:text-4xl age input), unit-toggle widening (md:max-w-[200px] md:py-8), date input scaling (md:py-4 md:text-lg), 44px back-pill hit-target fix, Enter-advance keyboard contract on all 3 steps, and focus-visible ring migration on all 4 non-Button inputs.

## Objective

Apply the locked Phase 7 design contract to `src/components/onboarding/OnboardingFlow.tsx` (7 atomic changes). Closes DTUX-04. Single file, no other surfaces touched.

## What Was Done

### Task 1 — Step 1 typography + age input scaling + focus-visible (commit `591c68b`)

- Step 1 `<h2>`: `text-2xl` → `text-2xl md:text-3xl`
- Age `<input>`: width `w-28` → `w-28 md:w-32`; size `text-3xl` → `text-3xl md:text-4xl`
- Age input focus ring: `focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30` → `focus-visible:border-ipc-500/60 focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white`
- `autoFocus`, `inputMode="numeric"`, `min`/`max` preserved

### Task 2 — Unit toggles, back-pills, Enter-advance handlers (commit `8791349`)

- mL + oz toggle buttons: `max-w-[160px] py-6` → `max-w-[160px] md:max-w-[200px] py-6 md:py-8`
- mL + oz toggle buttons: added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface`
- Step 2 back-pill: `min-h-[40px]` → `min-h-[44px]` + focus-visible ring (ring-offset-surface)
- Step 3 back-pill: `min-h-[40px]` → `min-h-[44px]` + focus-visible ring (ring-offset-surface)
- Step 1 container: `onKeyDown` → Enter advances to step 2 if `isAgeValid` (TEXTAREA+shiftKey guards)
- Step 2 container: `onKeyDown` → Enter advances to step 3 (TEXTAREA+shiftKey guards)
- Step 3 container: `onKeyDown` → Enter fires `handleConfirm()` (TEXTAREA+shiftKey guards)

### Task 3 — Step 2+3 h2 bumps + date input scaling + focus-visible (commit `cf982f0`)

- Step 2 `<h2>` unitTitle: `text-2xl` → `text-2xl md:text-3xl`
- Step 3 `<h2>` dateTitle: `text-2xl` → `text-2xl md:text-3xl` (`mb-1.5` intentional spacing preserved)
- Date `<input type="date">`: `py-3` → `py-3 md:py-4`; `text-base` → `text-base md:text-lg`
- Date input focus ring: `focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30` → `focus-visible:border-ipc-500/60 focus-visible:ring-2 focus-visible:ring-ipc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white`
- `ps-10 pe-4` (RTL-safe logical CSS) preserved unchanged

## Verification Observations

Final class counts verified against plan spec:
- `text-2xl md:text-3xl`: 3 (one per step h2) ✓
- `w-28 md:w-32`: 1 (age input) ✓
- `text-3xl md:text-4xl`: 1 (age input) ✓
- `max-w-[160px] md:max-w-[200px]`: 2 (mL + oz toggles) ✓
- `py-6 md:py-8`: 2 (mL + oz toggles) ✓
- `py-3 md:py-4`: 1 (date input) ✓
- `text-base md:text-lg`: 1 (date input) ✓
- `min-h-[44px]`: 2 (back-pill Step 2 + Step 3) ✓
- `min-h-[40px]`: 0 (zero remaining old floor) ✓
- `onKeyDown=`: 3 (one per step container) ✓
- `focus-visible:ring-ipc-500`: 6 (age input + date input + 2 unit toggles + 2 back pills) ✓
- `focus:border-ipc-500`: 0 (no old focus: rings remaining) ✓
- `autoFocus`: 1 (age input preserved) ✓
- `focus-visible:ring-offset-white`: 2 (age + date inputs) ✓
- `focus-visible:ring-offset-surface`: 4 (2 unit toggles + 2 back pills) ✓

Quality gates:
- `npx tsc --noEmit`: exit 0 ✓
- `npx eslint OnboardingFlow.tsx`: exit 0 ✓
- `npx vitest run`: 427/427 passing ✓
- `npm run build`: static export clean ✓
- Logical CSS guard (no new physical ml-/mr-/pl-/pr-/right- classes): clean ✓

## Deviations from Plan

None — plan executed exactly as written. Line numbers in the plan were accurate to within 1 line; the actual h2 headings were at lines 107/149/210 matching the plan's approximations.

UI-SPEC Q1 (md:text-3xl locked default), Q2 (no illustration), Q4 (timezone pill deferred) all applied as specified.

## Known Stubs

None — this plan is purely visual/interaction enhancement; no data wiring or stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. ClassNames only.

## Self-Check: PASSED

- `src/components/onboarding/OnboardingFlow.tsx` modified: confirmed (git diff shows 3 commits of changes)
- Commit `591c68b` exists: confirmed
- Commit `8791349` exists: confirmed
- Commit `cf982f0` exists: confirmed
- All 16 class-count assertions verified against actual file grep output
