# Testing Patterns

**Analysis Date:** 2026-05-14

## Test Framework

**Unit/Integration Runner:**
- Vitest 3.x
- Config: `vitest.config.ts`
- Environment: `jsdom` (browser-like DOM for localStorage/store tests)
- Globals: enabled (`describe`, `it`, `expect`, `beforeEach` available without import, though most test files import explicitly from `'vitest'`)
- Setup file: `src/__tests__/setup.ts` (imports `@testing-library/jest-dom/vitest` for DOM matchers)

**E2E Runner:**
- Playwright 1.59+
- Config: `playwright.config.ts`
- Browser: Chromium only (mobile iPhone 14 UA, 390x844 viewport, `isMobile: true`, `hasTouch: true`)

**Assertion Library:**
- Vitest built-in `expect` for unit tests
- `@testing-library/jest-dom` for DOM matchers (extended via setup file)
- Playwright `expect` for e2e assertions

**Run Commands:**
```bash
npx vitest run                        # Run all unit tests once
npx vitest                            # Watch mode
npx vitest run src/__tests__/calculations.test.ts  # Single file

npm run e2e:walkthrough               # All 6 locales, headless, writes findings JSON
npm run e2e:walkthrough:headed        # en-locale only, headed browser
npm run e2e:walkthrough:deep          # deep-flow spec (medical-grade 3-day simulation)
npm run e2e:walkthrough:a11y          # axe-core accessibility scan, 6 locales
npm run e2e:walkthrough:locales       # Explicit 6-locale cross-locale run
```

## Test File Organization

**Unit tests — separate `__tests__` directory:**
```
src/__tests__/
├── setup.ts                          # Global test setup
├── calculations.test.ts              # IPC metric computation (hand-verified case data)
├── store.test.ts                     # Zustand store CRUD and actions
├── utils.test.ts                     # Timezone helpers, ID generation, formatters
├── observations.test.ts              # Pattern observation generator
├── leak.test.ts                      # Standalone leak feature (CRUD + calculations + CSV)
├── boundaries.test.ts                # Bedtime boundary logic (day number assignment)
├── time-validation.test.ts           # Night/day event separation, wake-time validation
├── edge-cases.test.ts                # Medical-grade edge cases (data-loss, back-edits, tz mismatch)
├── back-edits-after-completion.test.ts  # Retroactive edit correctness
├── clock-pick-disambiguation.test.ts    # Bug regression: clock-pick date resolution
├── wake-time-edit-bug.test.ts           # Bug regression: UTC/tz mismatch for wake times
├── early-wake-day2.test.ts              # Edge: Day 2 early wake across midnight
├── edge-wake-times.test.ts              # Edge: wake time boundary conditions
├── patient-a-paper-diary.test.ts        # End-to-end fixture: real patient case A
├── patient-b-paper-diary.test.ts        # End-to-end fixture: real patient case B
├── generate-test-exports.test.ts        # Integration: generates PDF+CSV to ~/Desktop
└── pwa-viewport.test.ts                 # Static config: manifest.json, PWA requirements
```

**E2E tests — `e2e/` directory:**
```
e2e/
├── walkthrough.spec.ts        # Daily 6-locale smoke test (homepage → onboarding → diary → summary → PDF)
├── deep-flow.spec.ts          # Medical-grade 3-day simulation + PDF/CSV content checks
├── a11y.spec.ts               # axe-core scan on homepage + summary, 6 locales
└── helpers/
    ├── fixtures.ts            # buildSeedState() — deterministic 3-day localStorage seed
    ├── forms.ts               # logVoid(), logDrink(), logLeak(), setBedtime(), setWakeTime()
    └── messages.ts            # Per-locale label lookups for selectors
```

**Naming:**
- Unit test files: `kebab-case.test.ts`
- E2E spec files: `kebab-case.spec.ts`
- Vitest includes pattern: `src/**/*.test.{ts,tsx}` (from `vitest.config.ts`)
- Playwright matches: `/(walkthrough|deep-flow|a11y)\.spec\.ts/`

## Test Structure

**Suite Organization:**
```typescript
/**
 * File-level JSDoc explaining test scope and which clinical
 * failure modes are covered (mandatory on every test file).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDiaryStore } from '@/lib/store';

// ──────────────────────────────────────────────
// Section header comments group related tests
// ──────────────────────────────────────────────

beforeEach(() => {
  useDiaryStore.getState().resetDiary();
  useDiaryStore.setState({ startDate: START_DATE, timeZone: 'UTC' });
});

describe('descriptive group name', () => {
  it('specific behavior being tested', () => {
    // arrange
    // act
    // assert
  });
});
```

**Patterns:**
- Setup: `beforeEach` resets store state with `resetDiary()` + explicit `startDate` and `timeZone` via `setState()`
- Fixture data: local helper functions that build typed entry objects (`vid()`, `did()`, `bed()`, `wake()`, `lid()`)
- Assertions: direct `expect(value).toBe(literal)` or `.toBeGreaterThan()` / `.toBeLessThan()` for ranges
- Inline calculation comments document the expected arithmetic before the `expect()` call

## Mocking

**Framework:** None. The test suite does not use `vi.mock`, `vi.fn`, `vi.spyOn`, or any stub pattern.

**Strategy:** Tests exercise real code with constructed state objects and store resets. Key substitutions:
- Timestamps use fixed calendar dates (2026-03-xx or 2026-04-xx) for determinism
- Timezone is always specified explicitly (`'UTC'`, `'America/New_York'`, `'Asia/Singapore'`) rather than relying on the browser's detected timezone
- Store is accessed via `useDiaryStore.getState()` / `useDiaryStore.setState()` directly — no React rendering required

**E2E isolation:**
- Each Playwright project (one per locale) runs sequentially (not parallel) with `workers: 1`
- `page.context().addInitScript()` seeds `localStorage` with `buildSeedState()` to bypass 90+ form interactions per locale while still exercising the real summary page

**What to Mock:**
- Nothing in unit tests; prefer real code with controlled inputs

**What NOT to Mock:**
- The Zustand store (test with real store state)
- `computeMetrics`, `generateCsv`, `generatePdfBlob` (these are the functions under test)
- `localStorage` (provided by jsdom environment)

## Fixtures and Factories

**Unit test helpers — defined per test file:**
```typescript
// Pattern from calculations.test.ts and leak.test.ts
let idCounter = 0;

function vid(day, hour, minute, volumeMl, sensation, opts?): VoidEntry {
  const date = new Date(Date.UTC(2026, 2, day, hour, minute, 0));
  return {
    id: `v${++idCounter}`,
    timestampIso: date.toISOString(),
    volumeMl,
    doubleVoidMl: opts?.doubleVoidMl,
    sensation,
    leak: opts?.leak ?? false,
    note: '',
    isFirstMorningVoid: opts?.fmv ?? false,
  };
}

function baseState(overrides: Partial<DiaryState> = {}): DiaryState {
  return {
    startDate: START, age: null, voids: [], drinks: [], leaks: [],
    bedtimes: [], wakeTimes: [], volumeUnit: 'mL', diaryStarted: true,
    clinicCode: null, timeZone: TZ, morningAnchor: null,
    day1CelebrationShown: true,
    ...overrides,
  };
}
```

**E2E fixture — shared in `e2e/helpers/fixtures.ts`:**
```typescript
// buildSeedState() returns a complete DiaryState + version for localStorage injection
export function buildSeedState(opts?: FixtureOptions): SeedState { ... }
export const STORE_KEY = 'bladder-diary-patient'; // Zustand persist key
```

**Location:**
- Unit test factories are inlined per-file (no shared factory module)
- E2E shared fixtures in `e2e/helpers/fixtures.ts`
- `generate-test-exports.test.ts` contains full `DiaryState` objects for 3 patient personas (early riser, night shift, normal schedule with leaks)

## Coverage

**Requirements:** None enforced — no coverage threshold in `vitest.config.ts`.

**View Coverage:**
```bash
npx vitest run --coverage    # requires @vitest/coverage-v8 or similar (not currently installed)
```

Coverage tooling (`@vitest/coverage-v8`, `c8`, `istanbul`) is not in `devDependencies`. There is no configured coverage target.

## Test Types

**Unit Tests (`src/__tests__/`):**
- Scope: pure functions in `src/lib/` (calculations, utils, observations, constants) and the Zustand store
- No DOM rendering, no React component tests (no `@testing-library/react` usage in current tests despite it being installed)
- Static file tests: `pwa-viewport.test.ts` reads `public/manifest.json` and `src/app/globals.css` via `readFileSync`
- Export integration tests: `patient-a-paper-diary.test.ts`, `patient-b-paper-diary.test.ts`, `generate-test-exports.test.ts` call the real `generatePdfBlob` and `generateCsv` functions and write output to `~/Desktop`

**E2E Tests (`e2e/`):**
- `walkthrough.spec.ts`: smoke test — homepage loads, onboarding 3 steps, diary day 1, seed + summary metrics, PDF download. Runs against `https://myflowcheck.com` (or `WALKTHROUGH_BASE_URL`). One Playwright project per locale (6 total).
- `deep-flow.spec.ts`: medical-grade flow — real Day 1 form interaction, persistence across reload, void edit, deep-link hydration, seeded Days 2+3, summary metric rendering, PDF and CSV content extraction with keyword assertions.
- `a11y.spec.ts`: axe-core scan via `@axe-core/playwright` on homepage + summary for all 6 locales. Violations mapped to `high`/`med`/`low` severity.

## Common Patterns

**Async Testing:**
```typescript
// PDF generation requires Promise wrapper (jsPDF uses callbacks)
it('generates PDF', async () => {
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = generatePdfBlob(state);
    doc.getBuffer((buf) => resolve(Buffer.from(buf)));
  });
  expect(buffer.length).toBeGreaterThan(1000);
});

// Dynamic import for regression isolation (wake-time-edit-bug.test.ts)
it('round-trip is stable', async () => {
  const { buildIsoForClockTimeInTz } = await import('@/lib/utils');
  ...
});
```

**Error Testing:**
```typescript
// Negative-case pattern: verify function returns false / does not mutate
it('rapid double-save drops the duplicate cleanly', () => {
  expect(s.addVoid(data)).toBe(true);
  expect(s.addVoid(data)).toBe(false);              // second attempt is a no-op
  expect(useDiaryStore.getState().voids).toHaveLength(1);
});
```

**Range Assertions (medical tolerances):**
```typescript
// Used when exact values depend on case reconstruction uncertainty
expect(metrics.periods[1].nPi).toBeGreaterThan(30);
expect(metrics.periods[1].nPi).toBeLessThan(50);
expect(metrics.periods[0].avv).toBeGreaterThanOrEqual(100);
expect(metrics.periods[0].avv).toBeLessThanOrEqual(120);
```

**Bug Regression Pattern:**
Each regression test file opens with a detailed comment block referencing the specific patient-reported bug, the incorrect behavior observed, and the fix. Test titles name the bug behavior explicitly (e.g., `'"12:00 AM" picked after 10:30 PM bedtime resolves to the morning AFTER bedtime'`).

**E2E Findings Output:**
Both `walkthrough.spec.ts` and `deep-flow.spec.ts` write structured JSON findings to `test-results/walkthrough/findings/<locale>.json` on every run. Each finding captures per-phase `status: 'OK' | 'FAIL' | 'BLOCKED' | 'SKIPPED'` plus `consoleErrors[]`, `pageErrors[]`, and `issues[]` arrays. This powers the `walkthrough_findings.md` auto-update in the daily walkthrough workflow.

---

*Testing analysis: 2026-05-14*
