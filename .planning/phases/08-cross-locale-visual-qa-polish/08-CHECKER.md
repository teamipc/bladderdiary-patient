# Phase 8 Plan Checker Report

**One-line summary:** BLOCKER — Plan 08-01 Task 2 verify command checks the wrong static-export path (`out/$l.html` landing page instead of `out/$l/summary.html` summary page); Plan 08-02 C2 describe block navigates to `/diary/day/1` without seeding diary state, so the FAB will not render and the spec cannot run green as required by its own acceptance criteria.

---

## Verdict: BLOCKER

**Plans checked:** 08-01, 08-02
**Blockers:** 2
**Warnings:** 3
**Recommendation:** REVISE

---

## Blockers (must fix before execution)

### Blocker 1: Plan 08-01 Task 2 — C1 verify command checks landing-page HTML, not summary-page HTML

**Dimension:** task_completeness
**Severity:** BLOCKER
**Plan:** 08-01
**Task:** 2 (C1 — H1 hydration race on /summary)

**The problem:**

The C1 fix targets `src/app/[locale]/summary/page.tsx`, making the `<h1>` appear in `out/{locale}/summary.html` (the summary page's static export). The static export path for the summary route under Next.js 16 + next-intl `localePrefix: 'as-needed'` is confirmed to be `out/en/summary.html`, `out/fr/summary.html`, etc. — one level nested under the locale directory.

However, the Task 2 `<verify>` command — as well as the `<action>` prose, `<acceptance_criteria>`, and the plan-level `<verification>` section — all reference `out/$l.html` (i.e., `out/en.html`, `out/fr.html`, etc.). That path is the **landing page** (`LandingContent.tsx`), not the summary page.

Verified via static build in the working tree:
- `out/en.html` exists — this is the landing page; current H1 count = 0 (LandingContent uses the same hydration-gate pattern; its loading state has no H1)
- `out/en/summary.html` exists (76 KB) — this is the summary page; current H1 count = 0 (pre-fix, as expected)
- `out/en/summary/index.html` does NOT exist

The C1 fix adds an `<h1>` to `summary/page.tsx`'s loading state. After the fix, `out/en/summary.html` will contain `>=1 <h1>`. But `out/en.html` will still contain 0 `<h1>` elements because `LandingContent.tsx` is NOT touched by Task 2. The verify command `grep -c '<h1' out/$l.html` will therefore **return 0 and FAIL** even after a correct fix.

The error propagates to three locations in 08-01-PLAN.md:
1. `<verify>` block, Task 2 (line ~398): `grep -c '<h1' out/$l.html`
2. `<acceptance_criteria>`: "grep -c '<h1' out/$l.html returns ≥ 1"
3. `<verification>` section (line ~858): "SEO regression (C1): for each locale, grep -c '<h1' out/$l.html returns ≥ 1"
4. `<success_criteria>` (line ~879): "out/{locale}.html for all 6 locales contains ≥ 1 `<h1>`"

**Fix required:**

Change all four references from `out/$l.html` to `out/$l/summary.html`. Correct verify command:

```bash
npm run build > /tmp/c1-build.log 2>&1 && for l in en fr es pt zh ar; do count=$(grep -c '<h1' out/$l/summary.html 2>/dev/null || echo 0); [ "$count" -ge "1" ] || { echo "FAIL: $l summary H1 count = $count"; exit 1; }; done && npx tsc --noEmit && git log -1 --pretty=%s | grep -q "fix(08): C1"
```

Also update the action's "SEO regression verification" prose block and the plan-level verification/success_criteria sections to use `out/$l/summary.html`.

---

### Blocker 2: Plan 08-02 Task 1 — C2 describe block navigates to `/diary/day/1` without seeding diary state; FAB will not render

**Dimension:** task_completeness
**Severity:** BLOCKER
**Plan:** 08-02
**Task:** 1 (Describe block 2: PrivacyNotice no-overlap with FAB)

**The problem:**

The Describe 2 (C2 guard) code navigates to `localePath(locale, '/diary/day/1')` after only removing the `mfc-privacy-notice-seen` key from localStorage. It does NOT seed any diary state.

`DayPageClient.tsx` (after the C3 fix applied by Plan 08-01 Task 4) gates its entire render on `useStoreHydrated()` and returns a spinner until hydration completes. After hydration, if `!diaryStarted`, it `router.replace('/')` redirects to the landing page. The FAB (`QuickLogFAB`) is only rendered within the `DayPageClient` main body — it never renders if the diary is not started.

Consequence: when the C2 spec navigates to `/diary/day/1` without diary state:
1. The page shows a spinner briefly (hydration gate)
2. After hydration, `diaryStarted = false` → redirect to landing page
3. `fab-toggle` is never in the DOM
4. `await expect(page.getByTestId('fab-toggle')).toBeVisible()` will time out and the test will fail

The acceptance criteria for Plan 08-02 require: "Running `PW_TEST_MATCH='phase8-regression-guards\.spec\.ts' npx playwright test ... --reporter=line` exits 0." The C2 describe block will not pass.

The C4 describe block (Describe 4) correctly seeds the diary state with `await seedDay1CompleteOnly(page)` before navigating to `/diary/day/1`. The C2 describe block must do the same.

**Fix required:**

After removing `mfc-privacy-notice-seen` and before navigating to `/diary/day/1`, seed at least a Day 1 in-progress diary state. Use the same `seedDay1CompleteOnly(page)` helper that Describe 4 uses. The seeded state must have `diaryStarted: true` and `prevDayComplete` satisfied for Day 1 (no bedtime prerequisite for Day 1 itself). Example addition to Describe 2:

```ts
// Seed diary so DayPageClient renders (FAB only visible when diary is started)
await page.goto(`${BASE_URL}${localePath(locale, '/')}`);
await seedDay1CompleteOnly(page);
await page.evaluate(() => window.localStorage.removeItem('mfc-privacy-notice-seen'));
await page.goto(`${BASE_URL}${localePath(locale, '/diary/day/1')}`);
```

---

## Warnings (should fix; execution may proceed if user accepts risk)

### Warning 1: Plan 08-02 Task 1 — Describe 3 (C3 guard) promises `/diary/day/3` coverage in must_haves and done section but omits it from the action code

**Dimension:** task_completeness
**Severity:** WARNING
**Plan:** 08-02
**Task:** 1

The `must_haves.truths[0]` states: "DayPageClient deep-link redirect race for {`/diary/day/2`, `/diary/day/3`} × {no-state, mid-diary-state, complete-state}."

The spec header comment (line 128) also lists: "c) /diary/day/3 with full diary seed → loading then Day 3 view."

The `<done>` section repeats: "DayPageClient hydration race scenarios for /diary/day/2 + /diary/day/3 + /summary deep-links."

However, the actual Describe 3 code in `<action>` only contains tests for:
- `/diary/day/2` with no state → redirect
- `/diary/day/2` with Day 1 complete → Day 2 view
- `/summary` with complete diary → summary view (×6 locales)

There is no test for `/diary/day/3`. The executor reading `must_haves` and `done` will expect 3-route coverage but the code only delivers 2-route coverage. This creates a documentation-versus-implementation gap that will confuse the executor and result in a spec that does not match its declared scope.

**Fix:** Either add a `/diary/day/3` test (seed a 2-day-complete diary state, deep-link to Day 3, assert Day 3 renders) OR remove the `diary/day/3` claim from `must_haves`, the header comment, and the `done` section.

---

### Warning 2: Plan 08-02 Task 1 — C1 guard fallback path `out/${locale}/summary/index.html` does not exist

**Dimension:** task_completeness
**Severity:** WARNING
**Plan:** 08-02
**Task:** 1

The Describe 1 (C1 guard) code tries the summary path as:
```ts
const summaryPath = resolve('out', locale, 'summary.html');  // CORRECT: out/en/summary.html
// fallback:
html = readFileSync(resolve('out', `${locale}/summary/index.html`), 'utf8');  // WRONG
```

The confirmed static export structure (verified against the working tree build):
- `out/en/summary.html` EXISTS (76 KB, correct path)
- `out/en/summary/` is a directory containing only Next.js internal manifest files (no `index.html`)
- `out/en/summary/index.html` does NOT exist

The primary path is correct and will succeed. However, if the primary path fails for any unexpected reason (e.g., stale `out/` without a fresh build), the fallback will also throw an error rather than providing a meaningful recovery. The catch block should use `expect.fail()` with a descriptive message rather than trying a non-existent fallback path.

This is a low-risk issue (primary path always succeeds after `npm run build`) but will produce a confusing double-error if the build is stale.

**Fix:** Replace the fallback `readFileSync` with a `test.fail()` call that explains the path convention:
```ts
} catch {
  throw new Error(`summary.html not found at ${summaryPath}. Confirm 'npm run build' completed. Path convention: out/{locale}/summary.html per Next.js 16 + next-intl 'as-needed'.`);
}
```

---

### Warning 3: Plan 08-01 — 6 tasks (including checkpoint) exceeds the 5-task scope threshold

**Dimension:** scope_sanity
**Severity:** WARNING
**Plan:** 08-01

Plan 08-01 has 6 tasks: Task 1 (audit), Tasks 2/3/4/5 (C1/C2/C3/C4 fixes), Task 6 (human-verify checkpoint). The standard threshold flags 5+ tasks as a BLOCKER. However, two mitigating factors reduce this to a WARNING:

1. Task 6 is a `checkpoint:human-verify` type — it contains no code, no files, no automated verify. It is a review gate, not an implementation task. The effective code-producing task count is 5 (Tasks 1–5).

2. The CONTEXT.md `<decisions>` section explicitly locks the plan structure as "ONE bundled plan (08-01) covers Bucket A + Bucket B" per user gate. The bundled approach is user-authorized.

3. Tasks 2/3/4/5 are each 1–10 line changes in well-understood, isolated files. The complexity per task is low.

The executor should remain alert to context-budget pressure during Task 1 (the 64-screen audit), which is the highest-context task. If the audit surfaces many BLOCKER/MAJOR findings requiring fixes, the plan may need to defer some findings to a follow-up quick task.

**No action required** unless the executor hits context pressure during Task 1.

---

## Goal-backward Coverage Matrix

| ROADMAP / CONTEXT Success Criterion | Plan | Task | Delivery mechanism |
|---|---|---|---|
| 1. visual-qa matrix produces ZERO new findings | 08-01 | Task 1 (audit) + Task 6 (walkthrough gate) | 64-screen matrix per visual-qa skill + `npx playwright test e2e/walkthrough.spec.ts` |
| 2. No `ml-/mr-/pl-/pr-/left-/right-` physical CSS from Phases 5–7 remains | 08-01 | Task 1 Step C | Aggregate `grep -rn` physical-CSS scan across `src/components/` + `src/app/`; allowlisted pre-existing entries verified in RTL; new violations fixed inline |
| 3. ZH+AR proper font fallback; PT+AR overflow fits bounded widths | 08-01 | Task 1 Step B | Chrome MCP screenshots at each (locale, route, width) combination; font fallback failure mode B per visual-qa skill |
| 4. Focus rings visible (white / bg-ipc-50 / dark hover); AA contrast ≥ 4.5:1 | 08-01 | Task 1 Step D | Chrome MCP + `preview_inspect` computed RGB; focus-visible contrast failure mode D per visual-qa skill |
| 5. Daily 6-locale walkthrough still passes | 08-01 | Task 6 | `npx playwright test e2e/walkthrough.spec.ts --reporter=line` exits 0; `walkthrough_findings.md` gains no new entries |
| 6a. C1 closed — H1 hydration race on /summary | 08-01 | Task 2 | `src/app/[locale]/summary/page.tsx`: H1 moved outside `if (!hydrated)` gate; commit `fix(08): C1 — render summary H1 outside hydration gate for SEO` |
| 6b. C2 closed — PrivacyNotice overlaps FAB | 08-01 | Task 3 | `src/components/layout/PrivacyNotice.tsx`: `bottom-20` → `bottom-44 md:bottom-28`; commit `fix(08): C2 — PrivacyNotice positioned above FAB at all viewports (no overlap)` |
| 6c. C3 closed — DayPageClient redirect race | 08-01 | Task 4 | `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx`: `useStoreHydrated` import + 4 useEffects gated; commit `fix(08): C3 — gate DayPageClient redirects on store hydration (no flicker on deep-link)` |
| 6d. C4 closed — QuickLogFAB speed-dial 40px hit target | 08-01 | Task 5 | `src/components/diary/QuickLogFAB.tsx` lines 67/80/93: `min-h-[44px]` added; commit `fix(08): C4 — QuickLogFAB speed-dial min-h-[44px] (Boomer-safe override 1)` |

---

## Verification Tool-Pattern Correctness

### PW_TEST_MATCH env-var (both plans)
Both plans correctly use the `PW_TEST_MATCH` env-var hook (set in `playwright.config.ts:30` as `const VERIFICATION_MATCH = process.env.PW_TEST_MATCH`). Neither plan uses the non-existent `--test-match` CLI flag. **PASS.**

### out/{locale}.html path convention
Plan 08-02's Describe 1 (C1 landing check) correctly uses `readFileSync(resolve('out', `${locale}.html`))` — top-level `out/en.html` convention. This is correct for the landing page. **PASS for landing check.**

For the summary page check, the primary path `resolve('out', locale, 'summary.html')` = `out/en/summary.html` is CORRECT. Fallback path wrong (see Warning 2). **WARNING for summary fallback only.**

### ZH data-attribute selectors
Plan 08-02 uses `page.getByTestId('fab-toggle')` and `page.getByTestId('fab-action-drink')` etc. — these are stable `data-testid` attributes confirmed present in `src/components/diary/QuickLogFAB.tsx` (lines 65, 78, 91, 108). No `^=` aria-label matching is used in the FAB tests. **PASS.**

### Physical-CSS guard allowlist correctness
The allowlist in Plan 08-02's spec header comment and `PHYSICAL_CSS_ALLOWLIST` const documents 11 entry groups. Cross-checked against the files in the working tree:
- `BottomNav.tsx:49` — `fixed bottom-0 left-0 right-0` confirmed present
- `Toast.tsx:25` — `fixed bottom-24 left-4 right-4` confirmed present (pre-existing)
- `QuickLogFAB.tsx` lines 67/80/93 — note these lines will have `min-h-[44px]` ADDED by Task 5; the `py-2.5` / `ps-4 pe-3` on those lines do NOT contain physical CSS that would trip the guard
All documented allowlist entries appear structurally correct. **PASS.**

---

## Context Compliance Check

### Locked decisions honored
- ONE bundled plan (08-01) + optional Plan 08-02: **PASS** — structure matches exactly
- ALL 4 carry-overs folded in (not deferred): **PASS** — C1/C2/C3/C4 each have a named task
- Scoped-down 64-screen visual-qa with documented rationale: **PASS** — Plan 08-01 objective documents the 54+10 breakdown with explicit CONTEXT reference

### Deferred ideas not included
STAB-06/07/08, new features, article content, PWA/SW, perf audits: all correctly excluded from both plans. **PASS.**

### i18n zero-new-keys contract
Plan 08-01 Tasks 2/3/4/5 all state ZERO new i18n keys. Task 2 uses the existing `summary.heroTitle` key. **PASS.**

### Physical CSS contract (no new physical CSS introduced)
All four C-tasks use logical CSS or existing properties. `min-h-[44px]` (C4) is not a directional property. `bottom-44 md:bottom-28` (C2) uses the `bottom-*` property which is a vertical (non-directional) physical property — acceptable for vertical stacking. **PASS.**

---

## Structured Issues

```yaml
issues:

  - plan: "08-01"
    task: 2
    dimension: "task_completeness"
    severity: "blocker"
    description: "C1 verify command uses out/$l.html (landing page path) instead of out/$l/summary.html (summary page path). After the fix, out/en.html will still return 0 h1 elements; verify will always fail. Affects verify block, acceptance_criteria, action prose, and plan-level verification + success_criteria sections."
    fix_hint: "Replace all four occurrences of 'out/$l.html' / 'out/{locale}.html' with 'out/$l/summary.html' / 'out/{locale}/summary.html' in Task 2 and in the plan-level verification section."

  - plan: "08-02"
    task: 1
    dimension: "task_completeness"
    severity: "blocker"
    description: "C2 describe block (Describe 2) navigates to /diary/day/1 without seeding diary state. DayPageClient returns null + redirects when diaryStarted=false; the fab-toggle testid will never be in the DOM; the spec cannot run green as required by acceptance criteria."
    fix_hint: "Add seedDay1CompleteOnly(page) call before navigating to /diary/day/1 in the Describe 2 test body, matching the pattern already used in Describe 4 (C4 guard)."

  - plan: "08-02"
    task: 1
    dimension: "task_completeness"
    severity: "warning"
    description: "Describe 3 (C3 guard) promises /diary/day/3 coverage in must_haves, spec header comment, and done section, but the action code only has tests for /diary/day/2 and /summary. No /diary/day/3 test is written."
    fix_hint: "Either add a /diary/day/3 deep-link test (seed 2-day-complete state, assert Day 3 view) OR remove the /diary/day/3 claim from must_haves, the header comment, and the done section."

  - plan: "08-02"
    task: 1
    dimension: "task_completeness"
    severity: "warning"
    description: "Fallback path in C1 describe block uses resolve('out', `${locale}/summary/index.html`) which does not exist in the static export. out/en/summary/ is a directory containing only Next.js internal manifests, no index.html. The fallback will throw a second error instead of recovering."
    fix_hint: "Replace the fallback readFileSync with a descriptive test.fail() explaining the out/{locale}/summary.html path convention."

  - plan: "08-01"
    dimension: "scope_sanity"
    severity: "warning"
    description: "Plan 08-01 has 6 tasks including a human-verify checkpoint, exceeding the 5-task threshold. Mitigated by CONTEXT.md's explicit bundled-plan decision and the fact that Tasks 2/3/4/5 are each 1-10 line changes. Task 6 is a review gate, not an implementation task."
    fix_hint: "No action required unless executor hits context pressure during Task 1. If audit surfaces many findings, defer MINOR fixes to a follow-up quick task."
```

---

## Recommendation: REVISE

Two blockers require revision before execution:

1. **Plan 08-01 Task 2:** Fix the C1 verify path from `out/$l.html` → `out/$l/summary.html` in four locations (verify block, acceptance_criteria, action prose, plan-level verification section).

2. **Plan 08-02 Task 1:** Add diary state seeding to the C2 describe block before navigating to `/diary/day/1`.

Both fixes are mechanical — they do not change the goal, the architecture, or the scope. After revision, the plans should pass all dimensions.


---

## Re-Check (Round 2)

**One-line summary:** PASS (with 3 non-blocking warnings) — both blockers resolved; B1 path corrections are complete across all functional code; B2 seed call is correctly placed with a clear C3-dependency comment; W1 Day 3 test uses the right seed; W2 fallback code removed — but three stale prose/metadata remnants remain that are documentation noise only, not execution blockers.

---

### Updated Verdict: WARNING (execution may proceed)

**Plans checked:** 08-01, 08-02
**Blockers:** 0
**Warnings:** 3 (all new, documentation-level only)
**Recommendation:** PROCEED

---

### Resolution Status of First-Pass Findings

#### B1 — RESOLVED

**Finding:** All `out/$l.html` / `out/{locale}.html` references in Plan 08-01 needed to become `out/$l/summary.html` / `out/{locale}/summary.html`.

**Verification:**

- `must_haves.truths[0]` (line 17): now says `out/{locale}/summary.html` with an explicit clarifying note ("NOT `out/{locale}.html` (which is the landing page)"). CORRECT.
- Task 2 `<action>` bash block (line 374): `grep -c '<h1' out/$l/summary.html` — CORRECT.
- Task 2 `<acceptance_criteria>` (line 390): `grep -c '<h1' out/$l/summary.html` — CORRECT.
- Task 2 `<verify>` (line 398): `grep -c '<h1' out/$l/summary.html` — CORRECT.
- Task 6 `<how-to-verify>` bash block (line 827): `grep -c '<h1' out/$l/summary.html` — CORRECT.
- Plan-level `<verification>` (line 858): `grep -c '<h1' out/$l/summary.html` returns ≥ 1 — CORRECT.
- `<success_criteria>` (line 879): `out/{locale}/summary.html` for all 6 locales — CORRECT.

The one remaining `out/{locale}.html` reference in 08-01 is at line 310 in a `<read_first>` prose citation that says Phase 7's plan "grep'd the landing page `out/{locale}.html`" — this is a historically accurate description of what Phase 7 did, not a prescription for Phase 8. It is contextually correct.

**Status: RESOLVED — all functional code paths use the correct summary path.**

---

#### B2 — RESOLVED

**Finding:** C2 describe block navigated to `/diary/day/1` without seeding diary state; after C3 fix lands, the redirect-race fix would redirect un-seeded navigation to landing.

**Verification (08-02 lines 306-315):**

```ts
await page.goto(`${BASE_URL}${localePath(locale, '/')}`);
await page.evaluate(() => window.localStorage.removeItem('mfc-privacy-notice-seen'));
// CRITICAL: seed Day 1 state so the C3 fix (08-01 Task 4) does NOT
// redirect us to landing. After Plan 08-01 ships, DayPageClient
// guards its render path on hydrated diary state; un-seeded navigation
// to /diary/day/1 will redirect to /. seedDay1CompleteOnly mirrors
// the pattern used by the C4 describe block below (line ~403/431).
await seedDay1CompleteOnly(page);
// Navigate to /diary/day/1 (the surface where both render together)
await page.goto(`${BASE_URL}${localePath(locale, '/diary/day/1')}`);
```

The seed call appears BEFORE the `page.goto` to `/diary/day/1`. The order is: (1) goto landing, (2) remove privacy flag, (3) seed Day 1 diary state, (4) goto `/diary/day/1`. This is the correct sequence — the store is seeded before navigation so DayPageClient renders (not redirects). The comment block explicitly documents the C3-dependency rationale.

**Status: RESOLVED — seed placement is correct; C3-dependency comment is clear.**

---

#### W1 — RESOLVED

**Finding:** Describe 3 promised `/diary/day/3` coverage in must_haves and JSDoc but had no test for it.

**Verification (08-02 lines 365-373):**

```ts
test('Deep-link /diary/day/3 with full diary seed → spinner then Day 3 view', async ({ page }) => {
  // Mirror the truths list + JSDoc promise to cover /diary/day/3.
  // seedCompleteDiary seeds all 3 days; navigating to /diary/day/3
  // must resolve to the Day 3 view (not redirect back to summary or landing).
  await page.goto(`${BASE_URL}/en/`);
  await seedCompleteDiary(page);
  await page.goto(`${BASE_URL}/en/diary/day/3`);
  await expect(page).toHaveURL(/\/en\/diary\/day\/3$/, { timeout: 5000 });
  await expect(page.locator('main')).toBeVisible();
});
```

The test exists. It correctly uses `seedCompleteDiary` (all 3 days seeded) rather than `seedDay1CompleteOnly` (which would leave Days 2-3 incomplete, making Day 3 inaccessible). The seed is appropriate: Day 3 view requires the full diary to have been started.

**Status: RESOLVED — `/diary/day/3` test is present and uses the correct seed helper.**

---

#### W2 — RESOLVED (code) / PARTIAL (prose cleanup missed)

**Finding:** Fallback path `out/${locale}/summary/index.html` (non-existent) was in the C1 describe block.

**Verification of code block (08-02 lines 285-288):**

```ts
const summaryPath = resolve('out', locale, 'summary.html');
const html = readFileSync(summaryPath, 'utf8');
const h1Count = (html.match(/<h1\b/g) || []).length;
expect(h1Count).toBeGreaterThanOrEqual(1);
```

The code block has no fallback `readFileSync` and no try/catch with a wrong path. The comment inside the code block (lines 281-284) says explicitly: "No fallback path is needed."

However: **line 294** is a stale prose note immediately after the closing ``` that says:

> "Note: the executor verifies the exact `out/` path for /summary at runtime (Next.js 16's emit pattern for nested routes under a [locale] segment is `out/{locale}/summary.html` per the localePrefix='as-needed' convention, but could be `out/{locale}/summary/index.html` for some configurations; both are tried)."

This contradicts the code block. The code block says "No fallback path is needed"; the prose note says "both are tried." The executor following this note might introduce the wrong fallback. Assessed as WARNING only (the code block is the authoritative implementation spec; the prose note is guidance text below the block, not code).

**Status: PARTIAL — fallback code removed (correct); stale prose at line 294 contradicts the fix (new warning introduced by the revision).**

---

#### W3 — UNCHANGED (acceptable)

**Finding:** Plan 08-01 has 6 tasks (above threshold), mitigated by CONTEXT.md bundled-plan decision.

No change made per user gate. The mitigating factors remain valid:
- Task 6 is a `checkpoint:human-verify` (no code production).
- CONTEXT.md explicitly locks the bundled structure.
- Tasks 2/3/4/5 are each 1–10 line changes in isolated files.

**Status: UNCHANGED — acceptable as-is.**

---

### New Issues Introduced by Revisions

#### New Warning 1: Plan 08-02 — Stale prose note at line 294 contradicts the W2 fix

**Dimension:** task_completeness
**Severity:** WARNING
**Plan:** 08-02
**Task:** 1

The revision correctly removed the fallback `readFileSync` call from the Describe 1 code block. However, the prose note at line 294 was not removed. It says "both are tried" (referring to `summary.html` and `summary/index.html`), which directly contradicts the code block comment at line 284 that says "No fallback path is needed." An executor reading the plan will encounter conflicting guidance. Low execution risk (the code block wins), but the note could prompt unnecessary debugging or addition of the wrong fallback.

**Fix:** Remove or rewrite line 294. Correct replacement: "Note: the path `out/{locale}/summary.html` is confirmed by a `find out -name 'summary.html'` scan during planning — all 6 locales emit at this exact path. The `out/{locale}/summary/` directory contains only Next.js internal manifests; no `index.html` is emitted there."

---

#### New Warning 2: Plan 08-02 frontmatter `key_links[1].via` retains the landing-page path

**Dimension:** task_completeness
**Severity:** WARNING
**Plan:** 08-02
**Task:** N/A (frontmatter)

The `key_links` array in the YAML frontmatter, line 30:

```yaml
via: "fs.readFileSync(resolve('out', `${locale}.html`))"
```

This shows `resolve('out', \`${locale}.html\`)` — that is the landing-page path (`out/en.html`), not the summary path. The key_link claims to be documenting "Plan 08-02 spec out/{locale}/summary.html SEO check" (line 28) but the `via` field describes the wrong function call. The actual code at line 285 correctly uses `resolve('out', locale, 'summary.html')`. This is a documentation inconsistency in the frontmatter metadata only — it does not affect execution, but misrepresents the plan's artifact wiring.

**Fix:** Change line 30 to: `via: "fs.readFileSync(resolve('out', locale, 'summary.html'), 'utf8')"`

---

#### New Warning 3: Plan 08-02 `<done>` section says `out/{locale}.html` instead of `out/{locale}/summary.html`

**Dimension:** task_completeness
**Severity:** WARNING
**Plan:** 08-02
**Task:** 1

The `<done>` acceptance narrative at line 540 reads:

> "(1) SEO H1 count on out/{locale}.html for all 6 locales (C1 backstop)"

This should say `out/{locale}/summary.html`. As written, the `<done>` description implies the spec checks the landing page H1, which is the opposite of what the plan intends (the comment at line 122 in the spec header explicitly says "NOT the bare out/{locale}.html landing page"). An executor checking the `<done>` criteria against the spec code will find a mismatch.

**Fix:** Change "out/{locale}.html for all 6 locales" to "out/{locale}/summary.html for all 6 locales."

---

### Structured Issues

```yaml
new_issues:

  - plan: "08-02"
    task: 1
    dimension: "task_completeness"
    severity: "warning"
    description: "Stale prose note at line 294 says 'both are tried' (referring to summary.html and summary/index.html fallback) but the code block directly above says 'No fallback path is needed.' The W2 fix removed the fallback code but did not remove this contradictory prose. Executor may be confused into adding the wrong fallback."
    fix_hint: "Remove line 294 or replace with: 'Note: out/{locale}/summary.html confirmed via find during planning. No fallback path needed.'"

  - plan: "08-02"
    task: null
    dimension: "task_completeness"
    severity: "warning"
    description: "Frontmatter key_links[1].via at line 30 reads resolve('out', `${locale}.html`) which is the landing-page path, not the summary path. The key_link claims to document the C1 summary SEO check. Documentation inconsistency only — does not affect execution."
    fix_hint: "Change line 30 to: via: \"fs.readFileSync(resolve('out', locale, 'summary.html'), 'utf8')\""

  - plan: "08-02"
    task: 1
    dimension: "task_completeness"
    severity: "warning"
    description: "<done> section at line 540 says 'SEO H1 count on out/{locale}.html' instead of 'out/{locale}/summary.html'. Contradicts the spec header comment at line 122 which explicitly says NOT the landing page."
    fix_hint: "Change 'out/{locale}.html for all 6 locales' to 'out/{locale}/summary.html for all 6 locales' in the <done> text."
```

---

### Final Recommendation: PROCEED

All two blockers from Round 1 are resolved. The three new warnings are documentation-level inconsistencies in Plan 08-02 — prose notes and frontmatter metadata that contradict the fixed code but cannot cause incorrect execution because the code block is the authoritative implementation guide. An executor working from the code blocks (the correct pattern per GSD conventions) will produce correct output. An executor who reads the prose note at line 294 before reading the code block might be temporarily confused, but the comment at line 284 inside the code block will override it.

**The plans are executable.** The three warnings are low-priority fixups that can be addressed in the next revision cycle or corrected inline by the executor without re-checking.

