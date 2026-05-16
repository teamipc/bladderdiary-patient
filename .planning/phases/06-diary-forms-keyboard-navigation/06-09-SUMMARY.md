---
phase: 06-diary-forms-keyboard-navigation
plan: 09
subsystem: ui
tags: [tailwind, focus-visible, accessibility, keyboard-navigation, sub-pickers, mobile-pristine]

# Dependency graph
requires:
  - phase: 06-diary-forms-keyboard-navigation
    provides: "Plan 06-03 Button.tsx focus-visible:* migration pattern (commit 0984ff4) — established the 5-token spec (outline-none + ring-2 + ring-ipc-500 + ring-offset-2 + ring-offset-white) and the touch-vs-keyboard discrimination contract reused on these 4 files"
  - phase: 05-layout-foundation-appshell-chrome
    provides: "Phase 5 NavLink focus-visible spec (canonical chrome focus ring with ipc-500 token color) — exact same token re-used on sub-picker tiles per UI-SPEC §Sub-Picker Specs"
provides:
  - "All 3 standalone sub-picker components (DrinkTypePicker / LeakTriggerPicker / SensationPicker) emit focus-visible rings on keyboard tab; touch users see ZERO change"
  - "VolumeInput tap-to-edit display button gains focus-visible ring with rounded-lg soft corner (UI-SPEC Open Question 8 lock: YES)"
  - "All 8 LeakTriggerPicker `data-testid='leak-trigger-*'` attributes preserved verbatim (E2E walkthrough.spec.ts dependency)"
  - "Mobile pixel-diff: zero — focus-visible: only triggers on keyboard navigation, not on tap"
affects: [06-10, 06-11, 08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sub-picker focus-visible token APPEND pattern: insert the 5-token line as a NEW logical line inside the className template literal, between the resting transition classes and the ternary `${selected ? ... : ...}` block — preserves selected-state ring contract"
    - "Help-toggle pattern in SensationPicker: a non-templated string className gets the 5-token line appended on a second physical line (Tailwind class strings can span newlines)"
    - "VolumeInput tap-to-edit pattern: focus-visible token + `rounded-lg` corner since the button is naturally inline-baseline and would otherwise show a hard rectangular focus ring around the volume readout"

key-files:
  created: []
  modified:
    - src/components/diary/DrinkTypePicker.tsx
    - src/components/diary/LeakTriggerPicker.tsx
    - src/components/diary/SensationPicker.tsx
    - src/components/ui/VolumeInput.tsx

key-decisions:
  - "Bundled single commit (4 files, +13/-5 lines) rather than 4 per-file commits — pure additive token changes with identical pattern across all 4 files; the executor brief explicitly authorized this as 'natural'"
  - "Added `rounded-lg` to VolumeInput tap-to-edit button alongside the focus-visible tokens — naked inline-baseline button would render a hard-rectangular ring around the volume readout; the rounded-lg gives the focus state a soft 6px corner that matches the modal's visual rhythm (UI-SPEC Q8 lock confirms this micro-decision)"
  - "Preserved Wave 3 unstaged form-file changes (LogDrinkForm/LogLeakForm/LogVoidForm/SetBedtimeForm/SetWakeTimeForm) by staging ONLY the 4 plan files individually — confirms the planner's file-conflict scoping was correct"

patterns-established:
  - "Sub-picker tile className APPEND: insert the focus-visible 5-token line as a NEW indented line between the resting `transition-all active:scale-[0.95]` block and the ternary `${ selected ? ... : ... }` — no token reorder, no removal, no ternary touch"
  - "Mobile-pristine verification: `git diff | grep '^+' | grep -vE 'focus-visible:|^\\+\\+\\+' | grep physical-CSS` must be empty (no new ml-/mr-/pl-/pr-/left-/right-/border-l-/border-r-); `grid-cols-` diff must also be empty"

requirements-completed: [DTUX-03]

# Metrics
duration: 38m 30s
completed: 2026-05-16
---

# Phase 6 Plan 9: Sub-Picker + VolumeInput Focus-Visible Rings Summary

**Three sub-picker components (DrinkTypePicker, LeakTriggerPicker, SensationPicker) plus VolumeInput's tap-to-edit button gain Phase-5-canonical keyboard-only focus rings; all picker grids, tile min-heights, and LeakTriggerPicker E2E testids preserved byte-for-byte**

## Performance

- **Duration:** 38m 30s
- **Started:** 2026-05-16T20:15:53Z
- **Completed:** 2026-05-16T20:54:23Z
- **Tasks:** 4/4
- **Files modified:** 4

## Accomplishments

- **DrinkTypePicker** (`src/components/diary/DrinkTypePicker.tsx`, 42→44 lines): focus-visible ring on each of the 8 drink-type tiles (rendered through `.map()` in the `grid-cols-4` layout). Selected-state `bg-drink text-white ring-2 ring-drink/30` contract preserved verbatim.
- **LeakTriggerPicker** (`src/components/diary/LeakTriggerPicker.tsx`, 64→66 lines): focus-visible ring on each of the 8 leak-trigger tiles. All 8 `data-testid={\`leak-trigger-${lt.value}\`}` template literals preserved (the single template generates 8 unique testids at runtime: cough, sneeze, laugh, lifting, exercise, toilet_way, other, not_sure). `min-h-[76px]` boomer-safe tile height preserved.
- **SensationPicker** (`src/components/diary/SensationPicker.tsx`, 84→87 lines): focus-visible ring on TWO buttons — the help (?) toggle AND each of the 5 sensation pills. The 5-equal-column `flex gap-2 + flex-1` layout preserved. `aria-pressed` and `aria-label={\`${s} ${t(...)}\`}` accessibility hooks preserved.
- **VolumeInput** (`src/components/ui/VolumeInput.tsx`, 127→128 lines): focus-visible ring with `rounded-lg` corner on the tap-to-edit display button (line 95–105). The editing-mode `<input type="text">` and the slider `<input type="range">` were intentionally NOT modified — both already have appropriate focus styles (input has `focus:border-*`; slider has browser-native focus ring + the `volume-slider*` class family which the planner explicitly deferred to Phase 8 polish).
- **Mobile-pristine verified:** `git diff` grep for physical-CSS classes (ml-/mr-/pl-/pr-/left-/right-/border-l-/border-r-) returned ZERO matches; grid-cols-* additions returned ZERO matches.
- **Focus-visible behavior contract:** On touch (tap a tile), the focus ring does NOT appear because `:focus-visible` heuristic excludes pointer events. On keyboard tab, the ring appears in `ipc-500` with a 2px white offset — visually consistent with Phase 5 NavLink and Plan 06-03 Button.

## Task Commits

All 4 file edits bundled into one atomic commit (pure additive token changes with identical pattern; executor brief authorized bundling):

1. **Bundled (Tasks 1–4):** `3294958` (feat) — focus-visible additions across DrinkTypePicker, LeakTriggerPicker, SensationPicker, VolumeInput

**No final metadata commit yet** — the SUMMARY.md / STATE.md updates are queued for the orchestrator's docs commit batch.

## Files Created/Modified

- `src/components/diary/DrinkTypePicker.tsx` — focus-visible ring on each of 8 drink-type tiles
- `src/components/diary/LeakTriggerPicker.tsx` — focus-visible ring on each of 8 leak-trigger tiles; 8 testids preserved
- `src/components/diary/SensationPicker.tsx` — focus-visible ring on help (?) toggle + each of 5 sensation pill buttons (TWO className expressions modified)
- `src/components/ui/VolumeInput.tsx` — focus-visible ring + `rounded-lg` on tap-to-edit display button

## Decisions Made

- **Bundled commit instead of 4 atomic commits.** The executor brief explicitly authorized bundling for "pure focus-visible additions across files" with identical pattern. Commit message itemizes the 4 files in bullet points.
- **VolumeInput tap-to-edit got `rounded-lg`** (in addition to the 5 focus-visible tokens). The naked inline-baseline button would render a hard-rectangular focus ring around the volume readout text — visually jarring against the modal's soft visual rhythm. `rounded-lg` (6px) gives the focus state a soft corner. This is a NET pixel diff on focus state ONLY (no diff in resting or active state because the button has no background or border).
- **Slider `<input type="range">` in VolumeInput NOT modified.** Plan defers this to Phase 8 per UI-SPEC residual Open Question 4 — the existing `volume-slider` / `volume-slider-night` / `volume-slider-drink` classes own range-input styling and an explicit Tailwind focus-visible override risks specificity conflicts. Browser-native focus ring is functional and consistent across all 6 locales.
- **Editing-mode `<input type="text">` in VolumeInput NOT modified.** It already has `focus:border-ipc-500` / `focus:border-drink` / `focus:border-indigo-500` per variant — a separate focus contract appropriate for text-edit mode.

## Deviations from Plan

None — plan executed exactly as written. All 4 tasks landed in their stated form. The `rounded-lg` addition on VolumeInput was explicitly specified in the plan body (Task 4 action block), not a deviation.

## Wave-3 Unstaged Files (Not in Scope)

At plan start, `git status` showed 5 unstaged Wave-3 form files (`LogDrinkForm.tsx`, `LogLeakForm.tsx`, `LogVoidForm.tsx`, `SetBedtimeForm.tsx`, `SetWakeTimeForm.tsx`) from parallel plan execution. These were left untouched per the plan's explicit file-conflict-avoidance scoping (Plans 06-05 / 06-06 / 06-07 / 06-08 own these files; Plan 06-09 only touches 3 standalone pickers + VolumeInput). The staging command (`git add` with explicit file paths) ensured only the 4 Plan 06-09 files entered the commit.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` on 4 files | exit 0 |
| `npx vitest run` | 427/427 tests pass |
| `npm run build` | compiled successfully; 270/270 static pages prerendered |
| `grep -c 'focus-visible:ring-ipc-500'` per file | DrinkType 1, LeakTrigger 1, Sensation 2, VolumeInput 1 (matches plan §Verification expectation) |
| `grep -c 'data-testid={\`leak-trigger-' LeakTriggerPicker.tsx` | 1 (template literal preserved) |
| All 5 focus-visible tokens per className | confirmed via per-token grep (5 of 5 in each className expression; SensationPicker has 2 expressions × 5 tokens = 10 total occurrences) |
| Physical-CSS grep (`ml-/mr-/pl-/pr-/left-/right-/border-l-/border-r-`) | EMPTY (mobile-invariant preserved) |
| Grid-columns grep (`grid-cols-/sm:grid-cols-/md:grid-cols-`) | EMPTY (mobile-pristine preserved) |
| Selected-state ring tokens (`bg-drink ring-2 ring-drink/30`, `bg-leak ring-2 ring-leak/30`, `bg-ipc-500/90 text-white font-bold`) | all preserved verbatim |
| `min-h-[76px]` (LeakTrigger), `min-h-[52px]` (Sensation) | preserved |
| VolumeInput slider `volume-slider` class | preserved (NOT modified) |
| VolumeInput editing-mode input `border-2 rounded-xl py-1` | preserved (NOT modified) |

## Self-Check: PASSED

- File `src/components/diary/DrinkTypePicker.tsx` — FOUND
- File `src/components/diary/LeakTriggerPicker.tsx` — FOUND
- File `src/components/diary/SensationPicker.tsx` — FOUND
- File `src/components/ui/VolumeInput.tsx` — FOUND
- Commit `3294958` — FOUND (verified via `git log --oneline -3`)

## Follow-ups for Phase 8 (visual-qa audit)

Per plan §Open Questions Residual (acknowledged in 2026-05-16 plan-check W2), the following INLINE form buttons remain WITHOUT focus-visible rings and are scheduled for the Phase 8 visual-qa audit pass:

- Volume preset chips in LogDrinkForm.tsx and LogVoidForm.tsx (3+3 = 6 chips)
- LEAK_AMOUNT_OPTIONS buttons in LogLeakForm.tsx
- Urgency Yes/No buttons in LogLeakForm.tsx
- Cup-help toggle / note pills / leak pill / wokeBy buttons in the 3 forms
- VolumeInput slider `<input type="range">` browser-native focus override

These were intentionally scoped OUT of Plan 06-09 to avoid Wave-3 file conflicts. Phase 8 owns the follow-up audit that surfaces any missed focus-ring gaps as findings.

## Threat Flags

None — focus-visible token additions are pure CSS visibility hints with no new network surface, auth path, file access, or schema change.
