---
phase: 11-wcag-aa-baseline
plan: 03
subsystem: ui-a11y
tags: [wcag, a11y, confirm-dialog, safe-default, autofocus, medical-grade, A11Y-04]
requirements: [A11Y-04]
dependency_graph:
  requires:
    - "src/components/ui/ConfirmDialog.tsx (pre-existing component, audited at UI-REVIEW.md §A3)"
  provides:
    - "Safe-default focus pattern in every ConfirmDialog instance (Cancel autoFocused on right/primary, destructive Confirm on left/secondary)"
    - "Enter-at-dialog-open activates Cancel (medical-grade Boomer-safe default protecting clinical record integrity)"
    - "cancelBtnRef wired and assigned (audit-cited orphan confirmBtnRef fully removed)"
  affects:
    - "DayPageClient dirty-form discard ConfirmDialog (Discard now left, Keep Editing now right/autoFocus — Plan 06-10 protection strengthened)"
    - "TimelineView delete-event ConfirmDialog (Delete now left, Cancel now right/autoFocus — Phase 5 deletion safety strengthened)"
    - "Plan 11-04 axe-core spec will validate end-to-end keyboard behavior (deferred per <verification> block of 11-03-PLAN.md)"
tech_stack:
  added: []
  patterns:
    - "React 19 autoFocus attribute + defensive useEffect double-focus pattern (autoFocus handles common case; useEffect backstops conditional re-mount edge cases observed in React 19)"
    - "setTimeout(_, 0) next-tick programmatic focus (canonical pattern for focusing newly-mounted DOM nodes)"
    - "Logical flex DOM ordering for RTL-aware button rows (no physical-CSS left/right; flex automatically inverts in dir=rtl)"
key_files:
  created: []
  modified:
    - "src/components/ui/ConfirmDialog.tsx (+21/-8) — ref rename, defensive useEffect, button DOM swap, autoFocus on Cancel"
decisions:
  - "Comment in defensive useEffect uses 'conditional re-mounts' (not 'portal-style mounts') because ConfirmDialog renders inline, not via createPortal"
  - "Variant styling preserved as-is — Cancel always cream (bg-ipc-50), Confirm danger=red (bg-danger), Confirm default=amber (bg-ipc-500). The safe button is visually neutral so muscle-memory + platform convention guides Enter to the safe action"
  - "TimelineView inline reset-overlay (lines 856-879) deliberately left untouched — it is NOT a <ConfirmDialog> use; it is a hand-rolled overlay with its own (already Cancel-default) button layout. Documented as a known v2-polish refactor candidate, not a safety bug"
  - "Caller prop API unchanged — both active callers (DayPageClient + TimelineView) benefit from the swap without any caller-side code change"
metrics:
  duration_seconds: 244
  completed_at: "2026-05-19T00:39:51Z"
  tasks_completed: 2
  files_modified: 1
  commit: b74bf7d
---

# Phase 11 Plan 03: ConfirmDialog Safe-Default Focus + Button Position Swap (A11Y-04) Summary

**One-liner:** ConfirmDialog now autoFocuses Cancel on the right/primary side and renders the destructive Confirm on the left/secondary side, so Enter at dialog-open keeps in-progress diary data instead of silently destroying it.

## What Was Built

A single-file change to `src/components/ui/ConfirmDialog.tsx` that delivers the audit-cited medical-grade safe-default pattern (UI-REVIEW.md §A3 / 11-CONTEXT.md A11Y-04). Three coordinated edits:

1. **Renamed `confirmBtnRef` to `cancelBtnRef`.** The audit flagged the original ref as an orphan declaration (declared at line 27, never assigned to any DOM element). The renamed ref is now correctly assigned to the Cancel button.

2. **Added a defensive `useEffect` on `[open]`** that programmatically calls `cancelBtnRef.current?.focus()` via a `setTimeout(_, 0)` after dialog open. This backstops React 19's known-flaky autoFocus behavior on conditional re-mounts (where the same component instance toggles `open=false → true` without unmounting). The comment in the source is intentional and explanatory per CONVENTIONS.md.

3. **Swapped the button order in the `.flex.gap-3` row** so the destructive Confirm button is now LEFT/secondary and the safe Cancel button is now RIGHT/primary with `autoFocus`. The visible styling per button is unchanged (Cancel keeps the neutral cream `bg-ipc-50`; Confirm keeps variant-conditional `bg-danger` red or `bg-ipc-500` amber).

The prop API is unchanged — every existing caller continues to work without modification.

## Why It Matters Medically

Two of the three ConfirmDialog callers guard clinical record integrity:

- **`DayPageClient.tsx:425` dirty-discard dialog** ("Your changes won't be saved"). Before this plan, a patient pressing Enter at dialog-open would lose 30 seconds of in-progress diary input. After this plan, Enter at dialog-open keeps the form open (Cancel = "Keep editing" autoFocused).
- **`TimelineView.tsx:845` delete-event dialog** ("Delete this entry?"). Before this plan, Enter at dialog-open would silently delete the entry the patient was trying to inspect. After this plan, Enter keeps the entry (Cancel = "Cancel" autoFocused).

Plus the `confirmBtnRef` orphan that the audit cited as evidence the original developer had INTENDED to autoFocus a button but the wiring was incomplete. This plan closes the loop — autoFocus is now wired to the Cancel button (the correct medical-grade default), with a useEffect backstop for React 19 quirks.

## Caller-Side Audit (Task 2)

Read-only verification that the visual swap doesn't break any caller. The prop API (`title / message / confirmLabel / cancelLabel / variant / onConfirm / onCancel`) is unchanged, so the only way a caller could break is if it depended on a side-effect that shifted. Two side-effects shifted, both intentional:

1. **Default focus on open.** Was: indeterminate (browser body or backdrop). Now: Cancel button. → Any caller that wanted Confirm-autoFocused (Enter-commits semantic) would be broken on purpose. No such caller exists; the two callers WANT Cancel-default. **Confirmed safe.**

2. **Visible button position.** Was: Cancel left, Confirm right. Now: Confirm left, Cancel right. → No caller has logic that depends on button position. **Confirmed safe.**

Caller-by-caller:

| Caller | File:Line | Variant | Confirm Label | Cancel Label | Post-swap UX |
|---|---|---|---|---|---|
| Dirty-discard | `DayPageClient.tsx:425` | `danger` | "Discard" | "Keep editing" | Discard left/red, Keep editing right/cream/autoFocused — **medical-grade win** |
| Delete-event | `TimelineView.tsx:845` | `danger` | "Delete" | "Cancel" | Delete left/red, Cancel right/cream/autoFocused — **medical-grade win** |
| (Inline reset overlay) | `TimelineView.tsx:856-879` | n/a | n/a | n/a | **NOT a ConfirmDialog** — hand-rolled `<div className="fixed inset-0...">` overlay. Left untouched. Already Cancel-default. Documented as v2-polish refactor candidate (out of scope) |
| Vitest mock | `milestone-toast-locale-switch.test.tsx:78` | n/a | n/a | n/a | `vi.mock(...)` replaces the component entirely — not affected by internal changes |

The TimelineView reset-overlay inconsistency is a known UX gap: it predates `ConfirmDialog` and uses an inline overlay pattern. Its current button layout happens to already match the new safe-default (Cancel cream/left, Reset red/right, but no autoFocus). A future plan could consolidate it onto `ConfirmDialog`. **Out of scope for Plan 11-03**, but flagged here for traceability.

## Deviations from Plan

None — plan executed exactly as written, with ONE intentional clarification:

The plan's `<interfaces>` block (line 164) suggested the defensive-useEffect comment include the phrase "portal-style mounts." The orchestrator-level prompt explicitly corrected this, noting that `ConfirmDialog` does NOT use `createPortal` and the comment should say "conditional re-mounts" instead. The written comment honors that correction. This is not a deviation from the plan's logical intent (defensive backup focus) — only a textual correction to the embedded comment so the code documents itself accurately.

No auto-fixes were needed (no bugs found, no missing critical functionality discovered, no blocking issues).

## Verification Gates

All gates passed:

| Gate | Command | Result |
|---|---|---|
| Orphan ref removed | `grep -c 'confirmBtnRef' src/components/ui/ConfirmDialog.tsx` | `0` ✓ |
| New ref present | `grep -c 'cancelBtnRef' ...` | `3` (decl + ref={} + focus() call) ✓ |
| autoFocus on Cancel | `grep -c 'autoFocus' ...` | `3` (1 attr + 2 comment lines) ✓ |
| Defensive focus useEffect | `grep -q 'cancelBtnRef.current?.focus()' ...` | found ✓ |
| DOM order (Confirm before Cancel) | line 80 (onConfirm) < line 86 (cancelBtnRef ref) | ✓ |
| No physical-CSS leak | `grep -nE '\b(left\|right\|ml\|mr)-[0-9]'` | no match ✓ |
| TypeScript strict | `npx tsc --noEmit` | exit 0 ✓ |
| ESLint clean | `npx eslint src/components/ui/ConfirmDialog.tsx` | exit 0 ✓ |
| Mock test (ConfirmDialog-dependent) | `npx vitest run src/__tests__/milestone-toast-locale-switch.test.tsx` | 2 passed / 1 skipped ✓ |
| Full suite | `npx vitest run` | **530 passed / 1 skipped (531 total) across 34 files** ✓ |
| Caller usages stable | DayPageClient + TimelineView + mock all match expected lines | ✓ |

End-to-end keyboard behavior (Enter at dialog-open activates Cancel; focused element on open is the Cancel button) is explicitly deferred to **Plan 11-04** per the `<verification>` block at line 365 of 11-03-PLAN.md. That plan extends `e2e/a11y.spec.ts` with an axe-core test that deep-links to a route, seeds a dirty-form localStorage state, opens the discard dialog, and asserts `document.activeElement` equals the Cancel button.

## Architectural Constraints Respected

- **Tech stack pinned:** No new dependencies added. Pure refactor of an existing React 19 component.
- **Static export OK:** Component is `'use client'`, runs entirely client-side. No server-side runtime changes.
- **localStorage-only:** No storage impact.
- **i18n parity:** No new translation keys added. Labels still come from caller-provided props (`confirmLabel` / `cancelLabel`) which are already locale-aware in every caller.
- **Day-boundary correctness:** No time/timezone code touched.
- **RTL-aware:** Used `flex` (logical direction), not physical `left-*`/`right-*`/`ml-*`/`mr-*`. Arabic users will see Confirm on the visual right and Cancel on the visual left — which is correct because Cancel is on the `dir=end` side in both LTR and RTL.
- **No `as any`, no `@ts-ignore`, no ESLint disables.**
- **No em-dashes** in commit message or summary copy.

## Known Stubs

None. All changes are fully implemented and active.

## Files Touched

- **Modified:** `src/components/ui/ConfirmDialog.tsx` (+21 / −8 lines)
- **No files created.**
- **No files deleted.**

## Commit

- `b74bf7d` — fix(a11y): ConfirmDialog destructive button to left/secondary, autoFocus Cancel on right/primary (A11Y-04)

## Browser-Preview Verification Note

A PostToolUse hook on Edit reminded that this change is observable in a browser preview. The plan's verification gates do NOT include a preview-server gate (the plan defers end-to-end keyboard validation to Plan 11-04's axe-core spec). All plan-prescribed gates passed. The visual swap will be visible in production after the next deploy and is the deliberate medical-grade win per A11Y-04.

## Self-Check: PASSED

- `src/components/ui/ConfirmDialog.tsx` exists at the expected path ✓
- Commit `b74bf7d` exists in `git log` on branch `worktree-agent-a496dd2a9090d94a4` ✓
- 530 vitest tests pass ✓
- No accidental deletions in the commit ✓
- Working tree clean post-commit ✓
