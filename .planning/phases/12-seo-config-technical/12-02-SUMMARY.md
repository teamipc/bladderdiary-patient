---
phase: 12
plan: 2
subsystem: build-pipeline
tags: [seo, static-export, build-step, indexability, canonicalization, vercel]
requirements: ["SEO-M3-02"]
provides:
  - "scripts/post-build-copy-en-root.mjs (idempotent post-build copy with 50KB sanity floor)"
  - "package.json build script wiring (next build && node scripts/post-build-copy-en-root.mjs)"
  - "src/__tests__/bare-root-html-shape.test.ts (6 vitest cases asserting the copy contract)"
  - "Bare-root indexability: out/index.html is now byte-identical to out/en.html post-build"
requires:
  - "out/en.html emitted by next build (next-intl localePrefix='as-needed' + Next.js static export)"
  - "Node.js >= 23 in build environment (used by Vercel's build pipeline)"
affects:
  - "https://myflowcheck.com/ — apex now serves substantive HTML with <title> and canonical to /en"
  - "Googlebot/Bingbot crawl experience on the apex URL"
  - "Search Console canonicalization signal (apex consolidates into /en via rel=canonical)"
tech-stack:
  added: []
  patterns: ["post-build copy step", "build-time idempotent file overwrite", "size-floor sanity guard"]
key-files:
  created:
    - "scripts/post-build-copy-en-root.mjs"
    - "src/__tests__/bare-root-html-shape.test.ts"
    - ".planning/phases/12-seo-config-technical/12-02-SUMMARY.md"
  modified:
    - "package.json (scripts.build chained with && node scripts/post-build-copy-en-root.mjs)"
decisions:
  - "D-01: chose option (iii) byte-for-byte copy out/en.html -> out/index.html. Rejected (i) reconfigure next-intl static export (no documented switch) and (ii) Vercel-side routing (re-introduces canonical vs served-URL split)."
  - "D-02: script lives in scripts/ alongside check-search-console.mjs + generate-icons.mjs, uses .mjs extension."
  - "D-03: explicit && chaining in scripts.build rather than a separate postbuild hook (more discoverable; prebuild slot already taken by build-pdf-font-subsets.mjs)."
  - "D-04: 50KB sanity floor on out/en.html (real value is 81KB+) — refuses to overwrite if EN landing is suspiciously small."
  - "D-05: vitest unit test uses spawnSync('node', [scriptPath], {cwd: tmpdir}) — no real Next.js build invoked in CI loop."
  - "D-06: src/app/page.tsx + src/app/LocaleRedirect.tsx unchanged — the LocaleRedirect spinner stays as a defensive layer."
metrics:
  duration: "~22 minutes"
  completed: "2026-05-18T21:13Z"
  tasks: 3
  files: 3
  test_count_delta: "+6 (530 → 536 passing)"
---

# Phase 12 Plan 02: Bare-root indexability via post-build copy step (SEO-M3-02) Summary

**One-liner:** Post-build copy step in `scripts/post-build-copy-en-root.mjs` (wired via `npm run build`) overwrites the JS-only `out/index.html` shell with a byte-for-byte copy of the substantive `out/en.html`, restoring `<title>` + body content + canonical-to-`/en` on the apex URL.

## What shipped

1. **`scripts/post-build-copy-en-root.mjs`** — Node ESM script that:
   - Resolves `out/` relative to `process.cwd()` (so the same script works on the developer machine and Vercel's build container).
   - Validates `out/en.html` exists and is `>= 50_000` bytes (sanity floor — actual size is 81,033 bytes).
   - Calls `fs.cpSync(SOURCE, DEST)` for the byte-for-byte copy.
   - Logs source + destination size to stdout.
   - Exits 0 on success, 1 on missing source or sub-floor size.
   - Idempotent — re-running on an unchanged `out/` produces the same output.

2. **`package.json` `scripts.build`** changed from `next build` to `next build && node scripts/post-build-copy-en-root.mjs`. The trailing-comma is preserved; no new `postbuild` hook; no other field touched. Vercel's build pipeline runs `npm run build`, so production deploys always include the copy step.

3. **`src/__tests__/bare-root-html-shape.test.ts`** — Six vitest unit tests exercising the script end-to-end via `spawnSync('node', [scriptPath], { cwd: tmpdir })`:
   - Happy path (>= 50KB en.html → exit 0, byte-identical destination).
   - Missing source (no en.html → exit 1, no destructive partial copy).
   - Below sanity floor (7,330-byte en.html — exact broken-state size — → exit 1, no destructive partial copy).
   - Idempotency (run twice → identical output).
   - Byte-identity contract (realistic head with `<title>` + canonical → identical destination buffer).
   - Regression: post-copy `index.html` does NOT contain the noscript meta-refresh signature of the JS-only shell.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit 0 (silent) |
| `npx eslint scripts/post-build-copy-en-root.mjs src/__tests__/bare-root-html-shape.test.ts` | exit 0 (silent) |
| `npx vitest run src/__tests__/bare-root-html-shape.test.ts` | 6 passed |
| `npx vitest run` (full suite) | 35 files, 536 passed + 1 skipped |
| `npm run build` (end-to-end) | post-build step logged `OK: copied out/en.html (81033 bytes) -> out/index.html (81033 bytes)` |
| `wc -c out/index.html` | 81,033 bytes (was 7,327 — sub-floor — pre-fix) |
| `diff out/en.html out/index.html` | exit 0 (byte-identical) |
| `grep -c '<title>' out/index.html` | 1 (was 0) |
| `grep -c 'My Flow Check' out/index.html` | 1 |
| `grep -c 'rel="canonical" href="https://myflowcheck.com/en"' out/index.html` | 1 |

## Deviations from Plan

None. The three tasks were executed exactly as specified. Task 1 created the script with the documented comment block + validation guard + cpSync call. Task 2 used the Edit tool with the exact `old_string`/`new_string` from the plan (preserving the trailing comma). Task 3 created six `it()` blocks matching the contracts the plan enumerated.

### Scope-boundary note (out-of-scope items deferred)

`src/lib/exportPdf/fonts/ar.ts` and `src/lib/exportPdf/fonts/zh.ts` had a 1-line diff each after `npm run build` ran — a UTC date stamp flipped from `2026-05-18` to `2026-05-19` in their auto-generated comment headers (these are emitted by the Phase 9 `scripts/build-pdf-font-subsets.mjs` prebuild step on each fresh build day). Per the scope-boundary rule, these are NOT included in this commit — they're unrelated build noise that any `npm run build` would touch. A future plan or routine build cycle will pick them up.

## Why this is the right fix

The audit's T-2 finding identified the bare apex (`https://myflowcheck.com/`) as the worst-rendering URL in the property — a 7.3KB JS-only `LocaleRedirect` shell with no `<title>`, no body content, no JSON-LD. Crawlers reading it see soft 404 / thin-content signature.

The three options surfaced in `12-CONTEXT.md` for SEO-M3-02 were:
1. Reconfigure next-intl to emit en-locale as bare root — REJECTED (no documented switch; would force `localePrefix: 'always'`, breaking every bare-path URL the Vercel rewrites depend on).
2. Vercel-side routing serves `out/en.html` at `/` — REJECTED (re-introduces a canonical-vs-served-URL split, the exact pattern the deleted `vercel.json` had).
3. **Post-build copy** — CHOSEN. Surgical build-output adjustment. The two files are now byte-identical with a canonical inside both pointing to `https://myflowcheck.com/en`. Google's documented behavior for "duplicate page with canonical" is to consolidate ranking signal to the canonical target — textbook canonicalization, far better than the current soft-404 signature.

`src/app/page.tsx` and `src/app/LocaleRedirect.tsx` are unchanged. The LocaleRedirect spinner stays as a defensive layer: if someone ever runs `next build` without the copy step (e.g., a developer running a partial sub-script), the bare root degrades to the old JS-only shell but isn't catastrophically broken. The build-script wiring guarantees normal builds — including every Vercel deploy — always include the copy.

## Commit

`e5f6a1b feat(seo): post-build copy step restores bare-root indexability (SEO-M3-02)`

Three files: `scripts/post-build-copy-en-root.mjs` (created), `src/__tests__/bare-root-html-shape.test.ts` (created), `package.json` (1-line modified).

## Self-Check: PASSED

- `scripts/post-build-copy-en-root.mjs` — FOUND
- `src/__tests__/bare-root-html-shape.test.ts` — FOUND
- `package.json` modified with chained build script — FOUND (grep match: 1)
- Commit `e5f6a1b` — FOUND in `git log`
- `out/index.html` 81,033 bytes — FOUND
- `diff out/en.html out/index.html` — exit 0 (byte-identical)
- Full vitest: 536 passed + 1 skipped — FOUND
