---
phase: 7
plan: "07-03"
subsystem: "export"
tags: ["hover-affordance", "responsive-wrap", "tailwind", "mobile-first", "boomer-safe"]
dependency_graph:
  requires: ["06-03"]
  provides: ["07-04"]
  affects: ["src/components/export/ExportActions.tsx"]
tech_stack:
  added: []
  patterns: ["md: breakpoint-gated hover-lift", "md:max-w-2xl responsive cap + mx-auto centering"]
key_files:
  created: []
  modified:
    - "src/components/export/ExportActions.tsx"
decisions:
  - "All 5 Phase 7 tokens carry md: prefix — mobile layout is byte-identical to pre-Phase-7"
  - "No hover:bg-* override added — Button primitive variant hovers (ipc-600 / ipc-100) inherited unchanged"
  - "Template literal used for PDF Button className to preserve conditional animate-cta-shimmer with proper space separator"
  - "alert() calls preserved unchanged — STAB-07 Toast swap is separate out-of-scope work"
metrics:
  duration: "11 minutes"
  completed: "2026-05-17T14:02:40Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 7 Plan 03: ExportActions.tsx — desktop hover affordance + responsive wrap Summary

Pure className addition to `src/components/export/ExportActions.tsx` applying the locked Phase 7 design contract: 1px upward hover-lift (`md:hover:-translate-y-px`) with 150ms gated transition (`md:transition-all md:duration-150`) on both the PDF (primary) and CSV (secondary) Buttons, plus an `md:max-w-2xl md:mx-auto` cap on the outer wrapper div so the export-button row centers at 672px inside the summary page's 768px Container at desktop widths.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| d8512f8 | style(07): ExportActions — md:hover:-translate-y-px lift + md:max-w-2xl wrap | src/components/export/ExportActions.tsx |

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| 1 | ExportActions — add hover lift + wrapper responsive cap | Done | d8512f8 |

## Changes Made

### src/components/export/ExportActions.tsx

**Edit 1 — Outer wrapper div (line 108):**
`<div className="space-y-3">` → `<div className="space-y-3 md:max-w-2xl md:mx-auto">`

**Edit 2 — PDF (primary) Button className (line 114):**
`className={shimmer ? 'animate-cta-shimmer' : ''}` → `className={\`${shimmer ? 'animate-cta-shimmer ' : ''}md:hover:-translate-y-px md:transition-all md:duration-150\`}`

The template literal preserves the conditional shimmer with a trailing space inside the truthy branch so the classes concatenate correctly (`animate-cta-shimmer md:hover:-translate-y-px...`).

**Edit 3 — CSV (secondary) Button (line 126):**
Added new prop: `className="md:hover:-translate-y-px md:transition-all md:duration-150"`

## Verification Results

| Check | Result |
|-------|--------|
| `grep -c 'md:max-w-2xl md:mx-auto'` | 1 |
| `grep -c 'space-y-3 md:max-w-2xl md:mx-auto'` | 1 |
| `grep -c 'md:hover:-translate-y-px'` | 2 |
| `grep -c 'md:transition-all md:duration-150'` | 2 |
| `grep -c 'hover:bg-ipc-'` | 0 |
| `grep -c 'hover:text-ipc-'` | 0 |
| `grep -c 'animate-cta-shimmer'` | 1 |
| `grep -c "alert(t("` | 2 |
| `grep -c "from 'lucide-react'"` | 1 |
| `grep -c 'data-testid'` | 0 |
| Physical CSS guard (no ml-/mr-/pl-/pr-/left-/right-) | PASS |
| `npx tsc --noEmit` | Exit 0 |
| `npx eslint` | Exit 0 (2 pre-existing warnings, 0 new errors) |
| Vitest (424/427 passing) | Pre-existing 3 PDF-timeout failures confirmed; no regression |
| `npm run build` | Exit 0; out/ generated |

### Pre-existing test note

`patient-b-paper-diary.test.ts` has 1 failing test (PDF generation timeout at 5000ms) that is pre-existing — confirmed by stashing Phase 7 changes and re-running the test identically. Not introduced by this plan.

### Pre-existing ESLint warnings

Two `react-hooks/exhaustive-deps` warnings on the `t` translation function in `handlePdf` and `handleCsv` useCallback dependencies — pre-existing before this plan. No new errors introduced.

## Deviations from Plan

None — plan executed exactly as written. All 3 edits applied at the exact locations described, all acceptance criteria pass.

## Known Stubs

None — this plan is className-only. No data-flow, no rendering logic, no stubs introduced.

## Threat Flags

None — purely additive CSS class changes. No new network endpoints, auth paths, or trust-boundary changes.

## Self-Check

- [x] Modified file exists: `/Users/zhen/bladderdiary-patient/src/components/export/ExportActions.tsx`
- [x] Commit d8512f8 exists: confirmed via git log
- [x] out/ directory freshly generated at 2026-05-17 10:02
- [x] All grep acceptance criteria pass (counts verified above)

## Self-Check: PASSED
