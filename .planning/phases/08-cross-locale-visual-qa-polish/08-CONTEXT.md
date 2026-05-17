# Phase 8: Cross-locale visual QA + polish — Context

**Gathered:** 2026-05-17
**Status:** Ready for planning
**Source:** Inline gate (no discuss-phase) after Phase 7 SHIPPED
**Phase requirements:** DTUX-06
**Milestone:** Desktop & Tablet UX (Milestone 2) — the closeout phase

<domain>
## Phase Boundary

Phase 8 is the **closeout** phase for the Desktop & Tablet UX milestone. Three phases shipped before it (5, 6, 7) introduced the desktop chrome, redesigned the 5 diary forms as desktop modals, and polished onboarding + summary surfaces. Phase 8's job is to **verify nothing regressed across the 6-locale × LTR/RTL × md/lg/xl matrix** that the prior phases were too narrow to walk, AND to close 4 specific carry-over concerns surfaced during Phases 5/6/7 verification.

The deliverable splits into **two scope buckets**:

### Bucket A — Visual-QA matrix run
Invoke the `.claude/skills/visual-qa/SKILL.md` harness against the production-rendered site (myflowcheck.com OR a local dev/static-export). The skill defines its own methodology — route matrix, failure modes (RTL physical-CSS leaks, font-fallback tofu, contrast, overflow), screenshot loop, triage scoring (BLOCKER/MAJOR/MINOR). Phase 8 does NOT redesign the skill; it executes it.

### Bucket B — 4 named carry-overs (folded in per user gate)
Each is a pre-existing concern documented in Phase 5/6 verification but explicitly deferred to Phase 8:

| # | Concern | Source location | Class |
|---|---------|-----------------|-------|
| C1 | **H1 hydration race on `/summary`** — `<h1>` is client-rendered behind `useStoreHydrated()`, so it's empty in pre-hydration static `out/{locale}.html` (SEO grep returns 0). Phase 5 + 6 + 7 verification specs treat it as informational; Phase 8 closes it. | `src/app/[locale]/summary/page.tsx` line ~29 (`useStoreHydrated()`), line ~114 (the H1) | SEO + accessibility |
| C2 | **PrivacyNotice overlap** — the bottom-pinned PrivacyNotice can occlude the FAB or bottom-of-page content depending on viewport + diary state. | `src/components/layout/PrivacyNotice.tsx` + `src/components/layout/AppShell.tsx:18` | Layout |
| C3 | **DayPageClient redirect race** — when the patient lands on `/diary/day/N` before the store has hydrated, the redirect-to-onboarding logic can flicker. | `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx` | Hydration race |
| C4 | **QuickLogFAB speed-dial 40px hit target** — the 3 speed-dial action chips use `py-2.5` + `w-10 h-10` icon = effective ~40px height; Boomer-safe override 1 requires 44px minimum, same correctness class as the Phase 7 back-pill bump. | `src/components/diary/QuickLogFAB.tsx` lines 67/80/93 (button) + 71/84/97 (icon disc) | Boomer-safe correctness |

</domain>

<decisions>
## Implementation Decisions

### Plan structure (user-locked at gate)
- **ONE bundled plan** (08-01) covers Bucket A + Bucket B. No split between audit-then-fix; the visual-qa skill triages + fixes inline, then C1–C4 close in the same pass.
- **Optional Plan 08-02 verification spec** if the planner identifies new automated guards worth adding (e.g., a Playwright assertion on the FAB speed-dial 44px). Otherwise the daily walkthrough is the regression gate.

### Inheritance — design invariants from Phase 5 CONTEXT.md (canonical)
Phase 8 inherits these locked layers unchanged:
- **Streamlined Cognition** (8 principles) — no novel UI; just close gaps.
- **Mobile-first PRIMACY** — every fix preserves mobile bit-equivalence except correctness fixes that improve mobile (e.g., C4's 40→44px FAB bump improves mobile too — accepted carve-out, same precedent as Phase 7 back-pill + Phase 5 NavLink).
- **Boomer-safe overrides** — 44px hit targets, ≤200ms animations, modal close = 3 paths, no novel patterns. C4 is a Boomer-safe correctness fix.
- **Design DNA axes** — FLAT-tile boundary preserved (axis 4); no shadow/elevation introduced on data tiles; no hover-lies on non-clickable surfaces.
- **i18n + RTL contract** — ZERO new keys this phase (visual-qa fixes are className edits + maybe a CSS rule); all spacing logical (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`); any new physical CSS is a regression to flag.

### Success criteria (from ROADMAP §"Phase 8")
1. visual-qa skill matrix produces ZERO new findings (existing findings in `.claude/projects/-Users-zhen-bladderdiary-patient/memory/walkthrough_findings.md` may persist if they're pre-Phase-5; new regressions from Phases 5–7 must close).
2. NO `ml-/mr-/pl-/pr-/left-/right-` physical CSS introduced during Phases 5–7 remains across the audited files. Exception: pre-existing physical CSS that predates Phase 5 (e.g., the Calendar icon `absolute left-3.5` allowlisted in Phase 7) gets logged but does not block Phase 8 completion unless it ACTUALLY breaks RTL — verify, don't blindly migrate.
3. ZH + AR pages render with proper font fallback (no missing-glyph tofu); PT + AR long-translation overflow fits within bounded button widths (Phase 6 max-w-*) — text wraps or truncates cleanly, never overflows.
4. Focus rings visible on white, `bg-ipc-50`, and dark hover backgrounds; AA contrast ≥ 4.5:1 on focus + hover states.
5. Daily 6-locale walkthrough passes (gate: walkthrough_findings.md gains no new entries from a Phase-8 run).
6. **C1–C4 closed** with named commits referencing the carry-over ID.

### Done criterion — "zero NEW findings" not "zero findings"
A finding is "new" if it was introduced by Phases 5/6/7 OR if visual-qa surfaces it for the first time. Pre-Phase-5 historical findings (e.g., a long-standing typography quirk on `/learn/glossary`) do NOT block Phase 8; they get logged for a future polish cycle. The planner must define the cutoff explicitly using `git log --since "Phase 5 start (2026-05-14)"` as the boundary.

### Execution context
- **visual-qa skill tooling preference order:** Chrome MCP (`mcp__Claude_in_Chrome__*`) > Preview MCP > Bash+curl fallback. Real-browser screenshots are mandatory for the RTL/font-fallback failure modes — the static HTML grep won't catch tofu boxes.
- **Server:** prefer `npx next dev --turbo` on a unique port (skill defaults to 3050) for live re-render after fixes. Production `myflowcheck.com` is the gold standard for the final pass.
- **Triage scoring:** BLOCKER = breaks the diary flow or makes content unreadable; MAJOR = visible regression vs Phase 4 baseline; MINOR = polish nit. Phase 8 closes BLOCKERS + MAJORS; MINORS log to walkthrough_findings.md for a future cycle.

### Out of scope for Phase 8
- Stabilization Phase 3 work (STAB-06/07/08 — toast dedup, export-error toast, clinicCode validation). Different milestone.
- New i18n keys. If visual-qa surfaces a copy issue (not layout), log it for `i18n-sync` skill — don't bundle into Phase 8.
- New features. Phase 8 is correctness + polish only.
- Article content (Learn section MDX). Polish-only for the Learn route layouts; article body fixes flow through `naturalize-prose` skill.
- Pre-Phase-5 historical findings in walkthrough_findings.md (logged, not closed).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill (the methodology)
- `.claude/skills/visual-qa/SKILL.md` — defines the audit workflow, route matrix, failure-mode taxonomy, tool preference order, triage scoring. Phase 8 executes this skill; do not redesign it.

### Inherited design framework
- `.planning/phases/05-layout-foundation/05-CONTEXT.md` — canonical layered design framework (Streamlined Cognition > Mobile-first PRIMACY > Boomer-safe overrides > Design DNA). Phase 8 inherits all 4 layers unchanged.
- `.planning/phases/06-responsive-diary-forms-keyboard-nav/06-CONTEXT.md` — BottomSheet desktop-modal transformation pattern + WAI-ARIA dialog conformance. Phase 8 verifies the 5 forms still render correctly across the locale matrix.
- `.planning/phases/07-onboarding-summary-surfaces/07-CONTEXT.md` + `07-UI-SPEC.md` — typography + tile-padding decisions just shipped 2026-05-17; verify the 28/28 Playwright PASS holds across locales when manually walked.

### Failure-mode references
- `docs/UX_PHILOSOPHY.md` — target user (50+, non-tech-savvy boomer), 6 principles, decisions log.
- `docs/TIME_MODEL.md` — only relevant if a fix touches time/timezone code (unlikely in Phase 8).
- `messages/{en,fr,es,pt,zh,ar}.json` — long-translation reference. PT + AR are highest-overflow risk per Phase 5 lessons.

### Carry-over source files
- C1: `src/app/[locale]/summary/page.tsx` (lines ~29, ~114)
- C2: `src/components/layout/PrivacyNotice.tsx` + `src/components/layout/AppShell.tsx:18`
- C3: `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx`
- C4: `src/components/diary/QuickLogFAB.tsx` lines 67/80/93 (button padding) + 71/84/97 (icon disc)

### Quality gates
- `.claude/projects/-Users-zhen-bladderdiary-patient/memory/walkthrough_findings.md` — the canonical findings log. Phase 8 must not add new entries.
- `e2e/walkthrough.spec.ts` — daily 6-locale Playwright walkthrough. Must stay green.
- `npm run lint` + `npx tsc --noEmit` + `npx vitest run` — standard quality gates per CLAUDE.md.

</canonical_refs>

<specifics>
## Specific Ideas

### The 4 carry-overs as concrete fixes (planner reference)

**C1 — H1 hydration race on /summary.** The H1 is gated behind `useStoreHydrated()` so the static `out/{locale}.html` contains an empty H1 — failing SEO best practice. Options for fix (planner picks one):
- (a) Render a `<h1>` placeholder with `i18n` static copy AT THE TOP of the SSR path; swap content on hydration. Preserves SEO; tiny FOUC risk.
- (b) Move H1 outside the hydration gate; show generic "Your diary summary" copy at SSR; client adds a subtitle after hydration. Cleanest.
- (c) Add `<noscript>` H1 as SEO fallback. Compromise.
Recommended starting point: (b) — generic SEO-friendly H1 outside the hydration gate, dynamic subtitle inside.

**C2 — PrivacyNotice overlap.** Likely a z-index or bottom-spacing issue. Audit at 375px / 768px / 1280px; if it overlaps the FAB or bottom-of-page content, either add bottom padding to the page wrapper OR convert PrivacyNotice from `position: fixed` to in-flow with a sticky-show-on-scroll affordance. Verify in all 6 locales.

**C3 — DayPageClient redirect race.** Likely a `useEffect` redirect that fires before `useStoreHydrated()` returns true. Pattern fix: gate the redirect on hydration; render a stable loading skeleton until hydrated, then either redirect OR render the day. Same pattern as the LandingContent guard already in place.

**C4 — QuickLogFAB speed-dial 44px.** Three speed-dial chips at lines 67/80/93 have `py-2.5` (= 10px each side = 20px vertical padding). With `w-10 h-10` icon disc inside (40px), the rendered button height is `max(40, 20+text-height)` ≈ 40-48px. Force `min-h-[44px]` on the button OR bump `py-2.5` → `py-3` (= 12px each side = 24px + icon = effective 44-52px). Same correctness fix class as Phase 7 back-pill bump.

### visual-qa skill route matrix coverage (per skill SKILL.md)

For a full Phase 8 audit (the planner can choose to scope down to a fast smoke test if time-budget is constrained):
- **Routes (8):** `/<locale>`, `/<locale>/diary`, `/<locale>/diary/day/1`, `/<locale>/summary`, `/<locale>/learn`, `/<locale>/learn/{topic}/{slug}`, `/<locale>/help`, `/<locale>/privacy`
- **Locales (6):** en, fr, es, pt, zh, ar
- **Widths (3):** 375px (mobile), 768px (md), 1280px (lg/xl)
- **Total:** 8 × 6 × 3 = 144 screens. The skill recommends a fast smoke test of 3 routes × 3 locales (en + ar + zh) × 3 widths = 27 screens if time is short — the planner chooses based on context budget.

### Phase 5/6/7 file delta = where the regression risk lives
A `git log --since "2026-05-14" --name-only --pretty=format:""` will produce the exact file set modified during Phases 5/6/7. Phase 8 audit should prioritize those files first:
- Layout primitives: `src/components/layout/{Container,Header,Footer,AppShell,BottomNav}.tsx`
- BottomSheet + 5 forms: `src/components/ui/BottomSheet.tsx` + the 5 `src/components/diary/Log*.tsx`
- Onboarding: `src/components/onboarding/OnboardingFlow.tsx`
- Summary: `src/app/[locale]/summary/page.tsx`
- ExportActions: `src/components/export/ExportActions.tsx`
- Global CSS: `src/app/globals.css` (any new rules added in Phases 5–7)

### Acceptable scope-reductions if time-budget tight (user is limit-conscious)
The user has signaled limit-consciousness multiple times this session. If the planner judges the full 144-screen audit too costly, it MAY scope down to:
- 3 routes × 6 locales × 3 widths = 54 screens (priority: `/<locale>`, `/<locale>/diary/day/1`, `/<locale>/summary` — these are the highest-risk surfaces per Phase 5–7 work)
- Plus the C1–C4 carry-overs (which are deterministic, not audit-driven)
- The remaining 5 routes (learn, learn-article, help, privacy, terms) get a single en+ar smoke pass at 1280px (10 screens)
- Total scoped-down: ~64 screens
The planner documents whichever scope it chose and the reason.

</specifics>

<deferred>
## Deferred Ideas

- **Stabilization Phase 3 (STAB-06/07/08)** — toast dedup, export-error toast, clinicCode validation. Different milestone (Stabilization). Phase 8 does not touch.
- **Pre-Phase-5 historical findings** in walkthrough_findings.md — log only; not Phase 8's job to close.
- **Article content quality** — flows through `naturalize-prose` and `i18n-sync` skills, not Phase 8.
- **New automated test coverage** — if Phase 8 surfaces a deterministic regression class worth catching automatically (e.g., a physical-CSS guard expansion to cover ALL components not just the 3 from Phase 7), the planner MAY add a Plan 08-02 verification spec. Otherwise the daily walkthrough is the gate.
- **PWA install / service-worker behavior** — out of scope; PWA is its own concern in Stabilization.
- **Performance audit (LCP / CLS / INP)** — distinct from visual-QA; can be a future quick-task.

</deferred>

---

*Phase: 08-cross-locale-visual-qa-polish*
*Context gathered: 2026-05-17 via inline gate (no discuss-phase) — user picked bundled-plan + carry-overs-folded-in*
