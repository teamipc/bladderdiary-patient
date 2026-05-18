# Phase 9 Plan-Check — 2026-05-18

## Verdict

**PASS-WITH-NOTES (with one BLOCKER strongly recommended fixed pre-execution)**

The 6 plans collectively deliver Phase 9's 6 success criteria with strong rigor — surgical edits, named test files, named grep guards, locked-in design decisions, and an end-to-end verification spec. Three concrete BLOCKERS need a small revision before execute-phase, but none of them invalidate the overall plan structure. Two of the blockers are mechanical (wrong Playwright CLI flag, wrong pdf-parse API) inherited from inadequate Phase-5 prior-art reading; one is a real coverage gap (date-fns locale registration for LP-02 sub-bug "c"). The remaining issues are non-blocking quality notes.

This is a strong planning package (6 plans / 3431 lines) for a medical-grade hotfix. The blockers below should take ~10 minutes of plan revision to close.

## Coverage matrix

| Requirement | Plan(s) | Covered? | Evidence |
|---|---|---|---|
| LP-01: ArticleCard regex strips all 6 locales | 09-01, 09-06 | YES | 09-01 Task 1 replaces regex driven from `locales`; Task 2 unit tests 6 locales + lookahead boundary; 09-06 Playwright tests double-prefix bug across 6 locales. Surgical fix shape (a) locked with rationale. |
| LP-02: Clinical PDF renders correct strings + glyphs for PT/ZH/AR | 09-03 (PT strings) + 09-05 (ZH/AR strings + Unicode fonts), 09-06 | **PARTIAL** | Strings (a) and glyphs (b) covered. **Date-fns locale registration (c) NOT covered** — `DATE_LOCALES = { en, fr, es }` in strings.ts:6 doesn't include pt/zh/ar; `pdfFormatDate` is called from combinedDiary, dailyDiary, resultsOverview. PT/ZH/AR dates will fall back to en-US. CONTEXT.md §LP-02 explicitly lists this as sub-bug (c). |
| LP-03: No hardcoded English in EN/FR/ES PDFs | 09-03 | YES | All 8 audit-flagged sites (dailyDiary:55, slots:44+142, machineData:17/21/55/70, graphs:194, combinedDiary:45 — all confirmed by spot-checks) addressed; 24hr-axis decision locked; static guard via vitest. |
| LP-04: TimePicker chips via formatTime() in 6 locales | 09-02 | YES | 09-02 Task 4 + Task 5 with explicit FR-negative-PM regression test; consistency invariant (label ≡ click outcome) enforced. |
| LP-05: Breadcrumb aria-label translated | 09-02 | YES | 09-02 Task 1-3 wires `learn.breadcrumbs.ariaLabel` + Breadcrumbs.tsx server-component async conversion. |
| LP-06: Author photos sourced + wired | 09-04 | YES | 09-04 includes checkpoint:decision (real / placeholder / defer), Person JSON-LD already correctly emits absolutized image URL (verified at JsonLd.tsx:234). |

## Strengths

1. **Surgical edits with file:line references.** Every plan names exact files and line numbers; spot-checked against codebase, all references are correct (e.g. TimePicker.tsx lines 159/166/173 do contain the literal `'10 PM'`/`'11 PM'`/`'12 AM'`; machineData.ts:17/21/55/70 confirmed).

2. **Locked design decisions with rationale, not deferred.** 09-01 explicitly locks fix shape (a) over (b) with a usage-impact analysis (`urlPath` used in 19 places, only 1 is inside next-intl's `<Link>`). 09-03 locks the 24hr-axis decision with rationale (medical convention + already-consistent with daily-grid hourStr). 09-05 locks `subset-font` + `@fontsource/noto-sans-sc` + `@fontsource/noto-sans-arabic` with size budget justification.

3. **Wave structure mostly correct.** 09-05 → 09-03 dependency is real (the extended PdfStrings interface). 09-06 → all-prior is genuine integration verification. Wave 1 (09-01, 09-02) and Wave 2 (09-03, 09-04) have zero file-overlap, confirmed.

4. **Explicit regression guards for the audit-flagged bugs.** 09-02 Task 5 has an FR-negative-PM assertion (`chipText.match(/\bPM\b|\bAM\b/) === null`) catching the exact LP-04 bug. 09-03 Task 4 has a SOURCE-FILE-CONTENT guard (`expect(machineDataSrc).not.toMatch(/doc\.text\('Structured Data'/)`) catching regression to hardcoded literals.

5. **Out-of-scope items honored.** Phase 11 (a11y, ConfirmDialog) and Phase 10 (CRI Discard fix) are explicitly NOT touched. No scope creep.

## Concerns

### BLOCKING (must fix before execute-phase)

**B-1. Plan 09-06 uses non-existent Playwright CLI flag.**

Plan 09-06 line 254 and acceptance criteria invoke `npx playwright test --test-match='**/phase9-locale-parity.spec.ts'` and `npx playwright list-tests --test-match=...`. The `--test-match` CLI flag does NOT exist in Playwright 1.59.1 (verified via `npx playwright test --help` — only `--grep` / `--grep-invert` exist). Phase 7's plan-summary explicitly documents this: "Used `PW_TEST_MATCH='phase7-onboarding-summary\\.spec\\.ts'` env-var pattern from Phase 5 (not --test-match CLI flag which does not exist in Playwright 1.59.1)". The Phase 5 spec's own docstring perpetuates the mistake but Phase 7 corrected it. Plan 09-06 reverts to the wrong pattern.

**Fix:** Change all `--test-match` invocations in 09-06 to `PW_TEST_MATCH='phase9-locale-parity\\.spec\\.ts' npx playwright test e2e/phase9-locale-parity.spec.ts --reporter=list`. Update the spec's docstring + the acceptance criteria's `npx playwright list-tests --test-match` step (use `npx playwright test --list` with PW_TEST_MATCH instead).

**B-2. Plan 09-06 Task 2 uses wrong pdf-parse API.**

The plan writes `import pdfParse from 'pdf-parse';` and `const parsed = await pdfParse(buf);`. But pdf-parse v2 (installed at v2.4.5) exposes a class-based API: `const { PDFParse } = require('pdf-parse'); const inst = new PDFParse({ data: new Uint8Array(buf) }); const result = await inst.getText();`. Confirmed via the existing `e2e/deep-flow.spec.ts:34` adapter pattern. The plan-as-written will fail at runtime.

**Fix:** Plan 09-06 Task 2 must mirror the deep-flow.spec.ts adapter pattern: `extractPdfText(buf)` wrapper that uses `PDFParse` class, calls `getInfo()` + `getText()`, returns `{ text, numpages }`, and properly disposes via `inst.destroy()`.

**B-3. LP-02 sub-bug (c) date-formatting localization is uncovered.**

CONTEXT.md §LP-02 evidence enumerates THREE sub-bugs: (a) strings missing in pt/zh/ar — covered by 09-03 + 09-05; (b) helvetica has no CJK/Arabic glyphs — covered by 09-05; **(c) date-fns locale registration likely covers en/fr/es only; pt/zh/ar dates fall back to en-US format**. Sub-bug (c) is not addressed by any plan. `src/lib/exportPdf/strings.ts:6` defines `DATE_LOCALES = { en: enUS, fr, es }`; `pdfFormatDate` is called from combinedDiary, dailyDiary, resultsOverview. A PT user's PDF will render dates as "Monday, May 18th, 2026" instead of "Segunda, 18 de Maio de 2026". ROADMAP Phase 9 success criterion #2 says "all page headers, table headers, section labels (…), and time-axis labels (`6am/8am/.../2am/4am`) render in the patient's locale" — dates fall under "section labels" in the PDF, so this criterion is unmet without (c).

**Fix:** Extend 09-03 (or add a small new task) to import `pt, zhCN, arSA` from `date-fns/locale` and extend `DATE_LOCALES = { en: enUS, fr, es, pt, zh: zhCN, ar: arSA }`. ZH might need to map to `zhCN` and AR to `arSA` (the date-fns locale code conventions); verify by checking date-fns/locale exports.

### NON-BLOCKING (worth surfacing but executor can proceed)

**W-1. Plan 09-05 async signature change ripples to 4 test files not listed in `files_modified`.**

Making `generatePdfBlob` async breaks `const { blob } = generatePdfBlob(state)` destructuring at 4 sites: `src/__tests__/generate-test-exports.test.ts:327`, `patient-a-paper-diary.test.ts:85`, `patient-b-paper-diary.test.ts:105`, and `scripts/test-pdf-multi-void.ts:136`. `npx tsc --noEmit` will catch the type errors, so the executor will surface them — but the plan doesn't pre-emptively list them in `files_modified` or acceptance criteria, which means execute-phase will need an ad-hoc fix-loop. `export-actions-error-toast.test.tsx` mocks `generatePdfBlob: vi.fn(() => { throw … })` and may need adjustment to return a rejected Promise.

**Fix (recommended, not required):** Add these 5 files to 09-05's `files_modified` and add a Task 4-F: "Update all in-repo callers of `generatePdfBlob` / `generatePdf` to use `await`. Verify with `grep -rn 'generatePdfBlob\\|generatePdf\\b' src scripts e2e | grep -v 'await'` returns no results."

**W-2. Wave/depends_on inconsistency.**

09-03 (Wave 2) and 09-04 (Wave 2) have `depends_on: []`. By GSD's wave-derivation rule (wave = max(deps) + 1 = 0 + 1 = 1), both should be Wave 1. The plan body of 09-04 explicitly claims "Wave dependencies enforce this ordering already" relative to 09-02 — but the empty `depends_on` does not enforce it. Functionally, this isn't a bug (different namespaces don't collide) but `gsd-plan-checker` may flag it and `gsd-execute-phase` may run 09-03/04 in Wave 1 alongside 09-01/02, generating four concurrent en.json edits and four concurrent i18n-sync hook fires.

**Fix:** Either drop 09-03/04 to Wave 1 (and add a comment explaining the namespace-isolation), OR add `depends_on: ["09-02"]` to 09-04 (and to 09-03 if any en.json overlap exists; 09-03 actually does NOT touch en.json so its Wave-2 placement is purely a scope/parallelization convention — could remain Wave 2 with `depends_on: []` if the executor accepts it as a planning convention).

**W-3. 09-06 LP-04 Playwright test best-effort, may always skip.**

The plan's LP-04 e2e test seeds a diary state, navigates to `/diary/day/1`, clicks `[data-testid="fab-toggle"]`, then attempts a selector chain `[data-testid="fab-bedtime"], button:has-text("Bedtime"), …`. But the actual QuickLogFAB only exposes `fab-action-drink`, `fab-action-leak`, `fab-action-void` (no bedtime). **There is no bedtime FAB action — bedtime is set elsewhere in the diary flow**. The plan correctly anticipates this with `test.skip()` fallback, BUT the practical outcome is that LP-04 only has the 09-02 unit-test regression guard and no e2e coverage. The plan acknowledges this honestly ("the unit test in 09-02 is the primary LP-04 regression guard; this e2e is a nice-to-have smoke test"). Accept as-is OR strengthen by triggering the bedtime form via a stable interaction path.

**Fix (optional):** Either accept the `test.skip()` fallback as documented (this is the path of least resistance), OR navigate to a form that mounts SetBedtimeForm directly (`/diary/day/1` exposes Set Bedtime via the timeline's empty-day prompt — verify the actual UX trigger).

**W-4. Author photo dimension claim (option-real-photos: 600x600) — checkpoint provides no rights/license guidance.**

09-04 Task 1 surfaces 3 options for author photo sourcing. The `option-real-photos` path says "the user attached `dr-di-wu.jpg` + `dr-steven-tijerina.jpg`" but doesn't document who owns the rights or how the project owner should obtain them (LinkedIn profile photos are NOT license-clear for redistribution). The plan correctly defers this to the user but should explicitly list "rights-cleared" as a checkpoint precondition.

**Fix:** Add to 09-04 Task 1 `<context>`: "Rights: photos must be either (a) authored by the clinician and licensed to the patient app, or (b) commissioned headshots with usage rights granted, or (c) the clinician's own LinkedIn photo with explicit written permission from the clinician. LinkedIn profile photos are NOT public-domain by default."

**W-5. 09-05 `font: 'courier'` claim for machineData verified — but autoTable head font inheritance edge case unaddressed.**

Plan 09-05 Task 4-C asserts: "as long as we set the right font BEFORE calling autoTable, the table inherits the family". Verified against jspdf-autotable source — it inherits the document's current `fontName` when `styles.font` is unset. BUT machineData.ts uses `styles: { …, font: 'courier' }` explicitly, which means courier (built-in) is used for the body. The Plan correctly preserves this. However, line 59 `headStyles: { …, fontStyle: 'bold' }` will trigger jspdf-autotable to call `doc.setFont(<current fontName>, 'bold')` — at the moment that runs, `<current fontName>` is whatever was set most recently. If the last `setFont` call was `currentFontFamily(locale)` (NotoSansArabic), then autoTable will try to use `'NotoSansArabic'` + `'bold'` for the head — which is registered by `registerArFont`. OK. But the body's `font: 'courier'` overrides this — both head + body could end up courier. Result: head ALSO renders in courier (not the bold weight of NotoSansArabic), which is fine because machineData is English-only.

**Fix:** None needed — this is OK by design.

**W-6. PDF size budget claim under-tested for AR.**

09-05's claim: "Subset size budget: ~150-400KB per locale per weight" + "Total static-asset cost: ~600KB-1.5MB". The vitest test in 09-05 Task 5 has assertions `BASE64.length > 50000` and `< 2_000_000`, which converts to ~37KB-1.5MB raw TTF. The actual size depends entirely on how many unique glyphs are in the strings table — likely on the upper end of the budget given ZH strings contain ~200 unique CJK characters. The Plan budgets 5MB total PDF, which is generous. **The actual risk is that the embedded font duplicates between Regular + Bold (since they share glyph coverage) and the PDF blob carries both — could approach 1-1.5MB per PDF.** Still under 5MB but eats most of the budget for ZH.

**Fix:** None required pre-execution; will surface in 09-06's size-budget assertion if a problem.

## Recommended actions

1. **Fix B-1 (Playwright CLI flag):** In Plan 09-06, replace all `--test-match` references with `PW_TEST_MATCH` env-var invocations per the Phase 7 pattern. Update the spec docstring and acceptance criteria. ~5 min change.

2. **Fix B-2 (pdf-parse API):** In Plan 09-06 Task 2, replace the `pdfParse(buf)` import + call pattern with the v2 class API (`new PDFParse({ data })`); mirror the `extractPdfText` adapter from `e2e/deep-flow.spec.ts:34-50`. ~10 min change.

3. **Fix B-3 (date-fns locale registration):** Add a Task 5 to Plan 09-03 (OR extend Task 1) that imports `pt, zhCN, arSA` from `date-fns/locale` and extends `DATE_LOCALES` to all 6 locales. Plan 09-05 Task 3 can additionally add a vitest assertion `expect(pdfFormatDate('2026-05-18T12:00:00', 'PPP', 'pt')).toMatch(/de maio/i)`. ~10 min change.

4. **Optional W-1 (async ripple):** Add 4-5 files to Plan 09-05's `files_modified` and add a sub-task verifying all callers `await` the now-async generators.

5. **Optional W-2 (wave/depends_on):** Tighten 09-04's `depends_on: ["09-02"]` to make the en.json sequencing explicit, OR adjust waves to match deps.

After these revisions (especially B-1, B-2, B-3), proceed to execute-phase. The remaining warnings are sandpaper, not structural.

---

## Calibration note

This is high-quality planning for a medical-grade hotfix. The blockers are mostly inherited-prior-art bugs (the Phase 5 spec's incorrect `--test-match` documentation; the absence of a Phase 9 test using pdf-parse v2's class API in any prior plan) rather than reasoning failures. The planner correctly locked design decisions, addressed every audit-flagged file:line, and built end-to-end verification. The one real coverage gap (LP-02 sub-bug c) is small but visible in the audit text — easy to miss without a tight cross-check of CONTEXT.md against task coverage.

---

## Second-pass verification (2026-05-18)

Re-checked the 3 BLOCKERS from the original report after planner revisions.

### Blocker closure status

- **B-1 (Playwright `--test-match` CLI flag): CLOSED.** All live invocations in `09-06-PLAN.md` now use the `PW_TEST_MATCH` env-var pattern (lines 254, 272, 533, 666). The 3 remaining `test-match` text mentions (lines 45, 254, 267) are anti-pattern guards: an inline read_first warning, an explicit inline "do NOT use" warning, and an acceptance criterion that verifies the spec documents the anti-pattern. The Phase 7 post-mortem pattern is correctly inherited.
- **B-2 (pdf-parse v2 class-based API): CLOSED.** Task 2 now declares `const { PDFParse } = require('pdf-parse')` (line 307) and defines an `extractPdfText(buf)` adapter (lines 308-319) that mirrors `e2e/deep-flow.spec.ts:30-47`, calls `new PDFParse({ data })`, `getInfo()`, `getText()`, and disposes via `inst.destroy()`. The adapter returns `{ text, numpages }`, which matches every downstream usage (`parsed.text` and `parsed.numpages` on lines 375, 384, 418, 450). No signature mismatch; the v1 `pdfParse(buf)` pattern is fully gone. The four call sites use `await extractPdfText(buf)`.
- **B-3 (date-fns locale registration for LP-02 sub-bug c): CLOSED.** Task 1 name now includes "+ register date-fns locales for pt/zh/ar"; Task 1 action §4 (lines 186-205) specifies the import extension and `DATE_LOCALES` widening with `pt → pt`, `zh → zhCN`, `ar → arSA`. Acceptance criteria (lines 224-226) adds 3 new grep guards. Task 4 case 9 (lines 547-569) asserts `getDateLocale('pt'/'zh'/'ar')` are non-enUS AND that `date-fns/format` produces locale-correct output (`/maio/i`, `[一-鿿]`, `[؀-ۿ]`). Acceptance bumped to "at least 9 `it()` blocks" — confirmed 9 cases enumerated. The `done` statement explicitly mentions the date-fns extension.

### No new blockers introduced

The new `extractPdfText` adapter return shape `{ text, numpages }` matches the existing downstream usage. The `DATE_LOCALES` extension is purely additive — no callsite changes needed at `combinedDiary.ts`, `dailyDiary.ts`, `resultsOverview.ts`. Wave graph unchanged: 09-06 still depends on `["09-01", "09-02", "09-03", "09-04", "09-05"]`; no cycles.

### Updated coverage matrix row

| Requirement | Plan(s) | Covered? | Evidence |
|---|---|---|---|
| LP-02: Clinical PDF renders correct strings + glyphs for PT/ZH/AR | 09-03 (PT strings + date-fns pt/zh/ar) + 09-05 (ZH/AR strings + Unicode fonts), 09-06 | **YES** | Strings (a), glyphs (b), AND date-fns locale registration (c) all covered. `DATE_LOCALES` now includes `pt`, `zh: zhCN`, `ar: arSA`; vitest case 9 asserts locale-correct date output. |

### Final verdict

**PASS.** All 3 BLOCKERS closed; no new BLOCKERS introduced. The 6 non-blocking warnings (W-1 through W-6) from the original report remain as-is per scope. Phase 9 plans are ready for `gsd-execute-phase`.
