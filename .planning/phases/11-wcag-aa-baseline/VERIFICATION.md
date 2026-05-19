---
phase: 11-wcag-aa-baseline
verified: 2026-05-19T03:55:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
verdict: GOAL ACHIEVED — WCAG 2.1 AA baseline shipped at the source level. The 4 required surfaces (h1, Toast aria-live, skip-link, ConfirmDialog safe-default) are wired in the codebase exactly as the audit + plans specified. Plan 11-04 verification spec is in place; user runs it locally per phase contract.
---

# Phase 11 — WCAG 2.1 AA Baseline · VERIFICATION

**Phase Goal (from ROADMAP.md):**
> Every interactive surface meets WCAG 2.1 AA. For medical-grade software this is the floor, not aspirational. Screen-reader users hear toasts. Keyboard users can skip past nav directly to content. Diary day pages have a proper `<h1>` landmark. Destructive actions in ConfirmDialog default to safe, not destroy.

**Commits inspected:** `fc96cb1` (A11Y-01), `bf740bb` (A11Y-02 + A11Y-03), `44ce783` (A11Y-04), `b25406e` (axe-core spec). All present on main; HEAD at `b25406e`.

**Verdict:** GOAL ACHIEVED. Every must-have lands in the codebase with file:line evidence below.

---

## Coverage Matrix

| # | Must-Have (Observable Truth) | Requirement | Source Evidence | Status |
|---|------------------------------|-------------|-----------------|--------|
| 1 | TimelineView day/night header is `<h1>` | A11Y-01 | `src/components/diary/TimelineView.tsx:506` — `<h1 className="text-xl font-bold text-balance …">` with `tc('day'/'night')` text content. Tailwind classes preserved verbatim (no visual regression). | VERIFIED |
| 2 | OnboardingFlow active-step heading is `<h1>` on each of 3 mutually-exclusive step components | A11Y-01 | `src/components/onboarding/OnboardingFlow.tsx:107` (step 1 ageTitle), `:149` (step 2 unitTitle), `:211` (step 3 dateTitle). Each is rendered inside `{step === N && …}` block at lines 105/147/209 — only one `<h1>` mounts per render. | VERIFIED |
| 3 | Day1Celebration modal h1 still anchored via `aria-labelledby` (multiple-h1-with-aria-modal is acceptable) | A11Y-01 | `src/components/diary/Day1Celebration.tsx:87-88` — `aria-modal="true"` + `aria-labelledby="day1-celebration-title"`. The h1 at line 97-100 carries `id="day1-celebration-title"`. Modal-pattern intact. | VERIFIED |
| 4 | Toast root carries `role="status"` + `aria-live="polite"` + `aria-atomic="true"` | A11Y-02 | `src/components/ui/Toast.tsx:25-29` — three ARIA attrs land before the existing `className` on the outer wrapper div. Inner content + dismiss button + auto-dismiss `useEffect` (lines 16-20) untouched. | VERIFIED |
| 5 | AppShell renders skip-link as first child of wrapper, pointing to `#main-content`, invisible until focused | A11Y-03 | `src/components/layout/AppShell.tsx:13-18` — `<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 …">` BEFORE `<Header />` (line 19). Logical-CSS (`focus:start-2`, NOT `focus:left-2`). | VERIFIED |
| 6 | `<main>` is the skip-link target with `id="main-content"` + `tabIndex={-1}` for programmatic focus | A11Y-03 | `src/components/layout/AppShell.tsx:20` — `<main id="main-content" tabIndex={-1} className="flex-1">`. Canonical pattern. | VERIFIED |
| 7 | `nav.skipToContent` translation key present in all 6 locales with locale-natural values | A11Y-03 | `messages/en.json` "Skip to content", `fr.json` "Aller au contenu", `es.json` "Saltar al contenido", `pt.json` "Ir para o conteúdo" (European PT), `zh.json` "跳至内容" (Simplified peer-direct), `ar.json` "تخطّي إلى المحتوى" (MSA masdar form). All 6 message files at 701 scalar paths (parity preserved). | VERIFIED |
| 8 | ConfirmDialog: orphan `confirmBtnRef` removed, `cancelBtnRef` declared + assigned + autoFocused on Cancel; defensive `useEffect` programmatic refocus; destructive button in left/secondary DOM position | A11Y-04 | `src/components/ui/ConfirmDialog.tsx:27` — `const cancelBtnRef = useRef<HTMLButtonElement>(null);`. Line 46-56 — defensive useEffect on `[open]` with `setTimeout(_, 0) → cancelBtnRef.current?.focus()`. Lines 77-84 — Confirm button (onConfirm) renders FIRST. Lines 85-93 — Cancel button (ref + autoFocus) renders SECOND. Variant styling preserved (lines 60-63). | VERIFIED |
| 9 | axe-core spec extended to 6-locale × 5-route matrix with 4 per-criterion targeted assertions | A11Y-01..04 | `e2e/a11y.spec.ts:202-539` — `for (const locale of LOCALES)` loop with homepage + diaryDay1 + summary + learnTopic + learnArticle scans (lines 204-314) AND targeted assertions: A11Y-01 h1 count per route (lines 327-356), A11Y-03 skip-link Tab+Enter (lines 358-420), A11Y-02 toast aria sampled (lines 444-484), A11Y-04 dialog Cancel-focus sampled (lines 494-537). Sampled locales: `['en', 'ar', 'zh']` at line 199. | VERIFIED |

**Score:** 9/9 must-haves verified.

---

## Goal-Level Invariants

### Goal sentence 1: "Screen-reader users hear toasts"

`src/components/ui/Toast.tsx:25-29` — outer wrapper div carries `role="status"` + `aria-live="polite"` + `aria-atomic="true"`. The `if (!visible) return null;` pattern at line 22 means the live region only exists in the DOM while the toast is visible — that is the correct pattern for a live region toggling visibility. Every "Pee saved", "Drink saved", "+250 mL", "Day 1 complete!" toast will announce to NVDA / VoiceOver / TalkBack.

VERIFIED.

### Goal sentence 2: "Keyboard users can skip past nav directly to content"

`src/components/layout/AppShell.tsx:13-18` — `<a href="#main-content">` is the first focusable element in every page (rendered BEFORE `<Header />` at line 19). Tailwind `sr-only focus:not-sr-only` pattern keeps it invisible until keyboard-focused. `<main id="main-content" tabIndex={-1}>` at line 20 makes the anchor target programmatically focusable. The `nav.skipToContent` label has full 6-locale parity (verified for all 6 files including RTL Arabic).

VERIFIED.

### Goal sentence 3: "Diary day pages have a proper `<h1>` landmark"

`src/components/diary/TimelineView.tsx:506` — `<h1>` rendering "Day N" or "Night N" (line 507 conditional on `isNighttime`) with the existing Tailwind hierarchy preserved (`text-xl font-bold text-balance` + conditional night-mode color). The diary day surface — the app's most-used route — now has a real h1 landmark. The `<h2>` it replaced is gone (verified by grep: only `<h3>` at line 863 remains, and that's correctly subordinate inside the inline reset overlay).

VERIFIED.

### Goal sentence 4: "Destructive actions in ConfirmDialog default to safe, not destroy"

`src/components/ui/ConfirmDialog.tsx:77-94` — the `.flex.gap-3` button row renders Confirm (destructive, `onClick={onConfirm}` at line 80) FIRST/left and Cancel (safe, `ref={cancelBtnRef} autoFocus onClick={onCancel}` at lines 86-88) SECOND/right. The defensive `useEffect` on `[open]` (lines 46-56) programmatically refocuses Cancel via `setTimeout(_, 0)` to backstop React 19 autoFocus on conditional re-mounts.

Both active callers (DayPageClient.tsx:425 dirty-discard, TimelineView.tsx:845 delete-event) use `variant="danger"` and benefit without API change — confirmed by reading those call sites.

VERIFIED.

### Goal sentence 5 (success criterion 5): "axe-core sweep across 6 locales × 3 viewports on diary day 1 / summary / landing / one learn article reports 0 WCAG 2.1 AA violations"

`e2e/a11y.spec.ts` extends the existing axe spec to a 6-locale × 5-route matrix (homepage + diaryDay1 + summary + learnTopic + learnArticle) with `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])`. Per-criterion DOM assertions complement the axe scan. Routes that 404 for a given locale fall through to a low-severity skip; this is the documented defensive contract.

The PLAN-prescribed matrix sampling decision (1 viewport × 6 locales × 5 routes = 30 scans, not 90) is documented in 11-04-PLAN.md §matrix-scope-decision and is consistent with the audit recommendation ("6 × 1 × 5 for the regression spec").

VERIFIED at the source level. End-to-end run (local serve + Playwright browser) is the user's gate per the user's framing in the verification request ("Don't run the Playwright a11y spec (requires local serve + browser; user does that)").

---

## Test Coverage Map

| File | Purpose | Status |
|------|---------|--------|
| `src/components/diary/TimelineView.tsx` | A11Y-01 h1 promotion (day/night header at line 506) | VERIFIED — Tailwind classes preserved verbatim per git diff |
| `src/components/onboarding/OnboardingFlow.tsx` | A11Y-01 h1 promotion (3 mutex step headings at 107/149/211) | VERIFIED — only one h1 mounts at a time (`step === N` guards) |
| `src/components/ui/Toast.tsx` | A11Y-02 ARIA live-region | VERIFIED — 3 ARIA attrs land on outer wrapper, no behavioral side-effects |
| `src/components/layout/AppShell.tsx` | A11Y-03 skip-link + main element + i18n hook | VERIFIED — skip-link is first child, no physical-CSS leak, useTranslations imported |
| `src/components/ui/ConfirmDialog.tsx` | A11Y-04 safe-default focus + button swap | VERIFIED — orphan ref removed, autoFocus + useEffect + DOM swap all wired |
| `messages/{en,fr,es,pt,zh,ar}.json` | A11Y-03 i18n parity for `nav.skipToContent` | VERIFIED — all 6 locales populated, 701 scalar paths preserved per file |
| `e2e/a11y.spec.ts` | A11Y-01..04 regression guard (Plan 11-04) | VERIFIED — 6-locale × 5-route axe matrix + 4 per-criterion DOM assertions + defensive `skipped-manual-verify` fallbacks |

**Aggregate h1 audit:** `grep -rn '<h1\b' src/app src/components | wc -l` returns 23 (was 19 before this phase; +1 TimelineView + 3 OnboardingFlow). Matches 11-01-SUMMARY's explicit reconciled count. Per the mutex-branch pattern documented in 11-01-SUMMARY `patterns-established`, source-tree count > 1 is correct because conditional branches each carry their own h1 but only one mounts at a time.

---

## Caller Audit (A11Y-04 Button Swap)

Both active `ConfirmDialog` callers verified to benefit from the swap without code change:

| Caller | File:Line | Variant | confirmLabel | cancelLabel | Post-swap UX |
|--------|-----------|---------|--------------|-------------|--------------|
| Dirty-discard | `DayPageClient.tsx:425` | `danger` | `tc('discard')` | `tc('keepEditing')` | Discard left/red, Keep editing right/cream/autoFocused → **medical-grade win** |
| Delete-event | `TimelineView.tsx:845` | `danger` | `tc('delete')` | `tc('cancel')` | Delete left/red, Cancel right/cream/autoFocused → **medical-grade win** |

Inline reset-confirm overlay at `TimelineView.tsx:856-879` is NOT a `<ConfirmDialog>` use — hand-rolled overlay correctly out of scope (its own button layout was already Cancel-default; documented as future v2-polish refactor).

---

## Anti-Pattern Scan

| File | Debt Markers (TBD/FIXME/XXX) | Type Bypasses (`@ts-ignore`/`as any`) | Physical-CSS (left-/right-/ml-/mr-) | Status |
|------|------------------------------|---------------------------------------|-------------------------------------|--------|
| `Toast.tsx` | None | None | None (kept `left-4 right-4` for the existing pre-Phase-11 fixed positioning — unchanged) | CLEAN |
| `ConfirmDialog.tsx` | None | None | None | CLEAN |
| `AppShell.tsx` | None | None | None on new code (skip-link uses logical `focus:start-2 focus:top-2`) | CLEAN |
| `TimelineView.tsx` (modified line 506 only) | None on modified line | None | None on modified line | CLEAN |
| `OnboardingFlow.tsx` (modified lines 107/149/211 only) | None on modified lines | None | None on modified lines | CLEAN |
| `e2e/a11y.spec.ts` | None | None | N/A (test file) | CLEAN |

**Note on TimelineView pre-existing lint:** 6 `react-hooks/preserve-manual-memoization` errors (lines 164/172/180/187/194/201 useCallback blocks) + 1 unused `useRef` import warning at line 3. Confirmed pre-existing by 11-01-SUMMARY's git-stash baseline diff. Tracked in `.planning/phases/10-clinical-record-integrity/deferred-items.md` (3 React-19 purity errors). PRE-EXISTING, OUT-OF-SCOPE, NOT introduced by Phase 11.

---

## Deferred Items (Reference)

From `.planning/phases/10-clinical-record-integrity/deferred-items.md`:

1. **`NextStepBanner.tsx:48` — `react-hooks/purity` on `Date.now()`** — pre-existing React-19 tightening; out-of-scope for any Phase 11 plan.
2. **`Day1Celebration.tsx:40` — `react-hooks/set-state-in-effect`** — pre-existing React-19 tightening.
3. **`store.ts:425` — `react-hooks/set-state-in-effect`** on `useStoreHydrated` — pre-existing.

Plus from Phase 11-01 execution:

4. **`TimelineView.tsx` 6× `react-hooks/preserve-manual-memoization` on useCallback blocks (lines 164/172/180/187/194/201)** — pre-existing React-Compiler errors confirmed via git-stash diff against unmodified HEAD.
5. **`TimelineView.tsx:3` `useRef` defined but never used (after Phase 6 refactor)** — pre-existing warning.

All 5 deferred items should be addressed in a coherent "React-19 purity sweep" plan (recommendation logged in deferred-items.md). NOT Phase 11 gaps.

---

## Behavioral Spot-Checks

Per user framing in the verification request, the following were explicitly delegated to the human-verify checkpoint (Plan 11-04 Task 3) and out of scope for this VERIFICATION:

- Full vitest suite run (already passed at 530/531 per Phase 10 baseline; SUMMARY claims hold)
- Playwright a11y spec local-serve run (requires `npm run build && npx serve out -l 4173 && WALKTHROUGH_BASE_URL=http://localhost:4173 npx playwright test --project=a11y`)
- Manual keyboard walkthrough (Tab → skip-link visible → Enter → focus jumps to main)
- VoiceOver / NVDA toast announcement spot-check
- Visual diff against pre-Phase-11 production (only the ConfirmDialog button position is the deliberate visual change)

These are the canonical Phase 11 sign-off gate per the `autonomous: false` checkpoint in 11-04-PLAN.md Task 3.

---

## Human Verification Required

Per the Phase 11 plan structure, the following items remain for the user to complete locally:

### 1. Local axe-core run

**Test:**
```
npm run build
npx serve out -l 4173 &
WALKTHROUGH_BASE_URL=http://localhost:4173 npx playwright test --project=a11y
```

**Expected:**
- `test-results/walkthrough/findings/a11y.json` reports `jq '.issues | map(select(.severity == "high"))'` → `[]`
- `targetedAssertions.a11y01_h1_count_per_route` → every value is 1 across 6 locales × 5 routes
- `targetedAssertions.a11y03_skiplink_functional` → every value is `true` across 6 locales
- A11Y-02/04 targeted assertions return `true` or `'skipped-manual-verify'`

**Why human:** Requires local static export + serve + browser execution — out of scope for source-level verification.

### 2. Manual keyboard walkthrough (EN sufficient — behavior is locale-independent)

**Test:** Open `/en` in a real browser. Press Tab → skip-link pill should appear at top-start corner. Press Enter → focus jumps into `<main>`. Navigate to `/en/diary/day/1` with seeded state. Open FAB → Void → enter 200 mL → Escape. The dirty-discard ConfirmDialog appears; Cancel is right/cream, Discard is left/red. Press Enter → dialog closes, form stays open. Repeat → form data intact.

**Expected:** All steps pass exactly as described.

**Why human:** Visual/keyboard behavior requires a real browser session.

### 3. VoiceOver / NVDA spot-check (optional but recommended for medical-grade)

**Test:** Open `/en/diary/day/1` in macOS Safari + VoiceOver (Cmd+F5). Trigger a save toast (add a void, save). VoiceOver should announce the toast text within ~1 second.

**Expected:** Toast text announced.

**Why human:** Requires real screen reader hardware/software.

### 4. Daily 6-locale walkthrough (canonical CLAUDE.md quality gate)

**Test:**
```
npx playwright test e2e/walkthrough.spec.ts
```

**Expected:** Green across all 6 locales; no new findings logged to `walkthrough_findings.md`.

**Why human:** Long-running E2E test; user owns the daily walkthrough rhythm.

---

## Production Readiness

**Source-level WCAG 2.1 AA Baseline:** ACHIEVED for all 4 required surfaces:

- **A11Y-01 (h1)** — TimelineView + OnboardingFlow promoted. Aggregate source-tree h1 count: 23 (up from 19). Mutex-branch pattern preserves "exactly one h1 per rendered page" invariant.
- **A11Y-02 (toast aria)** — Toast root has `role="status"` + `aria-live="polite"` + `aria-atomic="true"` on the visible mount.
- **A11Y-03 (skip-link)** — Skip-link is first focusable element in every page; `<main id="main-content" tabIndex={-1}>` is the target. 6-locale parity on `nav.skipToContent`.
- **A11Y-04 (ConfirmDialog safe-default)** — Cancel autoFocused on right/primary, Confirm in left/secondary. Orphan ref removed. Both medical-record-integrity callers benefit.

**Visual regression risk:** Zero except the deliberate A11Y-04 button position swap (audit-budgeted per success criterion 4).

**i18n parity:** 701 scalar paths × 6 locales preserved. RTL-safe (logical CSS, no `left-`/`right-` introduced).

**Type-safety:** Zero `@ts-ignore` / `as any` introduced.

**Deferred items:** All pre-existing React-19 lint warnings remain (3 from Phase 10 + 2 surfaced by Phase 11 in TimelineView). NOT Phase 11 gaps; tracked for a future React-19 purity sweep plan.

**Phase goal:** ACHIEVED. Phase 11 is ready to push to production once the user completes the local axe-core run + manual keyboard walkthrough per Plan 11-04 Task 3.

---

_Verified: 2026-05-19T03:55:00Z_
_Verifier: Claude (gsd-verifier, goal-backward)_
_Phase 11 source-level commits: fc96cb1 → bf740bb → 44ce783 → b25406e on main_
