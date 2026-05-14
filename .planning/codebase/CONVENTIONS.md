# Coding Conventions

**Analysis Date:** 2026-05-14

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` (e.g., `LogVoidForm.tsx`, `TimePicker.tsx`, `DaySummaryCard.tsx`)
- Library/utility modules: camelCase `.ts` (e.g., `calculations.ts`, `utils.ts`, `observations.ts`, `authorByline.ts`)
- Test files: `kebab-case.test.ts` (e.g., `back-edits-after-completion.test.ts`, `clock-pick-disambiguation.test.ts`)
- E2E specs: `kebab-case.spec.ts` (e.g., `walkthrough.spec.ts`, `deep-flow.spec.ts`)
- Next.js conventions: `page.tsx`, `layout.tsx`, `route.ts`, `sitemap.ts`, `robots.ts`

**Functions:**
- Public library functions: camelCase, verb-prefixed (e.g., `computeMetrics`, `generateId`, `detectTimeZone`, `buildIsoForClockTimeInTz`, `getDayNumber`)
- React components: PascalCase function declarations (e.g., `export default function LogVoidForm(...)`)
- Helper functions within modules: camelCase, lowercase prefix (e.g., `vid()`, `did()`, `bed()` in test helpers; `hourBucket()`, `drinkFollowedByVoid()` in observations)
- Store actions: verb-prefixed camelCase (e.g., `addVoid`, `removeVoid`, `setBedtime`, `setWakeTime`, `resetDiary`)

**Variables:**
- Constants: SCREAMING_SNAKE_CASE (e.g., `PREMIUM_FEATURES_ENABLED`, `VOLUME_PRESETS_ML`, `VOLUME_CONFIG`, `STORE_KEY`)
- Regular variables and parameters: camelCase
- Type-discriminated union members: descriptive camelCase strings (e.g., `'urge'`, `'awake_anyway'`, `'toilet_way'`)

**Types and Interfaces:**
- Interfaces: PascalCase with descriptive nouns (e.g., `VoidEntry`, `DrinkEntry`, `BedtimeEntry`, `DiaryState`, `DayMetrics`, `PeriodMetrics`)
- Type aliases: PascalCase (e.g., `DrinkType`, `BladderSensation`, `LeakTrigger`, `MorningAnchor`)
- Exported union literals: descriptive lower-kebab strings used as enum values

## Code Style

**Formatting:**
- No Prettier config present; formatting is left to developer/editor defaults with ESLint enforcement
- Tailwind class strings use template literals for multi-line composition (see `Button.tsx`)

**Linting:**
- ESLint via `eslint.config.mjs`: extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- TypeScript: strict mode (`"strict": true` in `tsconfig.json`), `noEmit: true`, target `ES2017`
- `@ts-expect-error` used sparingly (4 occurrences in `exportPdf/` to suppress `jspdf-autotable` missing type augmentation)
- No `@ts-ignore` or `as any` patterns found

**Directives:**
- `'use client'` placed as first line when required (all interactive components, forms, store consumers, layout pieces)
- No `'use server'` directives (no Server Actions pattern in use)
- Server components are unmarked (implicit default in Next.js App Router)

## Import Organization

**Order (observed in `LogVoidForm.tsx`, `layout.tsx`, lib files):**
1. Framework imports: `react`, `next/*`, `next-intl`
2. Third-party packages: `lucide-react`, `date-fns`, `zustand`
3. Internal `@/components/*` imports
4. Internal `@/lib/*` imports
5. `type` imports at the end of the import block (e.g., `import type { BladderSensation, VoidEntry } from '@/lib/types'`)

**Path Aliases:**
- `@/` resolves to `./src/` (configured in `tsconfig.json` and `vitest.config.ts`)
- Relative paths used only within `src/lib/exportPdf/` submodule for co-located imports

## Error Handling

**Patterns:**
- Defensive `try/catch` with fallback values in browser API calls (`detectTimeZone` returns `'UTC'`, `getTimezoneAbbr` and `getTimezoneOffset` return empty strings)
- Nullish coalescing (`??`) for optional fields throughout `calculations.ts` (e.g., `v.doubleVoidMl ?? 0`, `state.wakeTimes ?? []`)
- Optional chaining (`?.`) for nullable entry lookups (e.g., `fmv?.timestampIso ?? wakeTime?.timestampIso`)
- Store actions that can fail return `boolean`: `addVoid` returns `true` on success, `false` if dropped as duplicate
- No thrown errors from calculation functions; they return partial/null values when data is insufficient (e.g., `nPi: null` when `twentyFourHV === 0`)

## Logging

**Framework:** No logging library; no `console.log` in production code.

**Patterns:**
- No runtime logging in `src/lib/` or components
- E2E specs collect `consoleErrors` and `pageErrors` arrays during test runs and write them to findings JSON files

## Comments

**File-level JSDoc:**
Every `src/lib/*.ts` file opens with a block comment documenting what the module implements and key rules:
```ts
/**
 * Clinical bladder diary calculations.
 *
 * Implements IPC (Integrated Pelvic Care) standard metrics:
 * - 24HV  (24-hour voided volume)
 * ...
 * Day 1 is excluded from 24HV / NPi / AVV calculations (adaptation period).
 */
```

**Section dividers:**
Long modules use ASCII banner dividers to group related code:
```ts
/* ------------------------------------------------------------------ */
/*  Nocturnal Volume                                                   */
/* ------------------------------------------------------------------ */
```

**Function-level JSDoc:**
Exported public functions in `utils.ts` and `store.ts` carry `/** ... */` docstrings explaining the "why" (e.g., `buildIsoForClockTimeInTz` explains timezone mismatch problem in detail).

**Inline comments:**
Explain non-obvious decisions: UX rationale for default volume pre-fill in `LogVoidForm.tsx`, WCAG rationale for `maximumScale: 5` in `layout.tsx`, midnight-is-sometimes-24 edge case in `utils.ts`.

**Test comments:**
Every test file opens with a multi-line `/** ... */` block describing the test scope and which clinical failure modes are covered.

**Deprecated annotations:**
`@deprecated` JSDoc tag used for renamed constants (e.g., `VOLUME_PRESETS` in `constants.ts`).

## TypeScript Patterns

**Type assertions:**
- `as const` used for immutable tuple/object literals (e.g., `VOLUME_PRESETS_ML`, `VOLUME_CONFIG`, iteration arrays `[1, 2, 3] as const`)
- `as unknown as T` used once in store migration path for type-unsafe legacy data reshaping
- Non-null assertion `!` used when the type system cannot infer what test logic has already proven (e.g., `lateNightVoid!.timestampIso` in test)

**Interface extension:**
`ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>` — spread-through pattern for UI primitives

**Discriminated types:**
Diary entry types (`VoidEntry`, `DrinkEntry`, `BedtimeEntry`, `LeakEntry`, `WakeTimeEntry`) are all plain interfaces with an `id: string` and `timestampIso: string` rather than class-based

## Function Design

**Size:** Functions stay focused on a single computation step; `calculations.ts` splits nocturnal volume, 24HV, day metrics, and the final `computeMetrics` assembler into separate internal functions.

**Parameters:** Prefer named-object destructuring for components with 3+ props; primitive params used for pure utility functions.

**Return Values:**
- Pure functions return `T | null` rather than throwing (e.g., `nPi: number | null`, `avv: number | null`)
- Store actions that have side effects return `boolean` to signal success/duplicate-drop

## Module Design

**Exports:**
- Components: `export default function ComponentName` (one component per file)
- Library modules: named exports only (no default exports from `lib/*.ts`)
- `Button.tsx` exception: uses `const Button = forwardRef(...)` then `export default Button` (required for `forwardRef` + `displayName`)

**Barrel Files:**
- `src/lib/exportPdf/index.ts` is the only barrel, re-exporting from `combinedDiary.ts`, `machineData.ts`, and the main `generatePdfBlob` assembler
- No barrel `index.ts` in `src/components/` or `src/lib/` root — all imports use full paths

**State module:**
Zustand store (`src/lib/store.ts`) uses the `persist` middleware with `version: 2` and an explicit `migrate` function. Store is accessed via `useDiaryStore` hook; direct `.getState()` / `.setState()` used only in tests.

---

*Convention analysis: 2026-05-14*
