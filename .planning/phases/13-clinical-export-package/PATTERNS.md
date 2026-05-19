# Phase 13: Clinical Export Package — Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 5 categories (FHIR module, package module, ExportActions reshape, messages/*.json keys, vitest suites)
**Analogs found:** 5 / 5 — all categories have a strong in-repo analog

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `src/lib/exportFhir/index.ts` + 6 submodules (`patient.ts`, `observations.ts`, `questionnaireResponse.ts`, `loinc.ts`, `types.ts`, `validate.ts`) | export library (multi-file module) | transform (DiaryState → JSON string) | `src/lib/exportPdf/` (12-file module) | **exact** (canonical pattern in repo) |
| `src/lib/exportPackage/index.ts` + `readme.ts` | export library (zip assembler) | transform (DiaryState → Blob) | `src/lib/exportPdf/index.ts` (`generatePdfBlob`) for the async Blob orchestrator + `src/lib/exportCsv.ts` (`generateCsv`) for the single-file string composer | **role-match** (composes existing generators rather than emitting one format) |
| `src/components/export/ExportActions.tsx` (reshape) | client component | request-response (button click → export side effect) | itself — already exposes `pdfOnly` + share/download dual-path; disclosure analog is `<details>/<summary>` in `src/app/[locale]/help/page.tsx` lines 69-87 | **exact** (component already exists; only the disclosure half is new) |
| `messages/*.json` — new `export.packageHero*` + `export.moreOptions*` + `export.readme*` keys | i18n string table | data (read-only by UI) | `summary.exportSendPdf` / `summary.forTeamBody` for short single-line UI strings; `learn.forMen.intro` / `learn.forWomen.intro` (lines 745/754 in `messages/en.json`) for multi-paragraph `\n\n`-separated body content | **exact** for short keys, **role-match** for multi-paragraph README body |
| `src/__tests__/exportFhir.test.ts` + `exportPackage.test.ts` | vitest suite | data-roundtrip validation | `src/__tests__/pdf-blob-content.test.ts` for "generate blob in vitest + parse it + assert content", `src/__tests__/pdf-strings-table.test.ts` for "every locale has matching key set" structural-parity sweep | **role-match** (no existing `ajv` / JSON-schema validator in repo — Phase 13 introduces the dependency) |

---

## Pattern Assignments

### 1. `src/lib/exportFhir/` (multi-file export module)

**Analog:** `src/lib/exportPdf/` — 12-file module under one directory, barrel `index.ts` re-exporting + a single top-level orchestrator function.

**Files to mirror (1:1 role mapping):**

| `exportPdf/` file | Purpose | `exportFhir/` equivalent |
|-------------------|---------|--------------------------|
| `index.ts` | Barrel + `generatePdfBlob(state, locale)` orchestrator | `index.ts` + `generateFhirBundle(state, locale): string` orchestrator |
| `theme.ts` | Shared constants (colors, page dims) | `loinc.ts` (LOINC + UCUM code registry — the "constants" of FHIR) |
| `shared.ts` | `addLogo`, `addFooter`, `dv()` helpers used by every page module | (no equivalent — FHIR modules don't share render helpers; types in `types.ts` fill this role) |
| `strings.ts` | Locale-keyed string table | (no equivalent — FHIR is locale-neutral by spec; clinical terminology stays English) |
| `combinedDiary.ts` / `dailyDiary.ts` / `resultsOverview.ts` / `graphs.ts` / `machineData.ts` | One file per "page" (= one logical section of output) | `patient.ts` / `observations.ts` / `questionnaireResponse.ts` (one file per FHIR resource type) |
| (no analog) | — | `validate.ts` (new: ajv-based schema check) |
| (no analog) | — | `types.ts` (FHIR R4 shape interfaces — see "Why diverges" below) |

**Imports pattern to mirror** (from `src/lib/exportPdf/index.ts` lines 14-23):

```typescript
import { jsPDF } from 'jspdf';
import { computeMetrics } from '../calculations';
import type { DiaryState } from '../types';
import { addFooter } from './shared';
import { pageCombinedDiary } from './combinedDiary';
import { pageResultsOverview } from './resultsOverview';
// ... one import per submodule, all relative paths within the subdirectory
```

For `exportFhir/index.ts` mirror:
```typescript
import { computeMetrics } from '../calculations';
import type { DiaryState } from '../types';
import { buildPatient } from './patient';
import { buildObservations } from './observations';
import { buildQuestionnaireResponse } from './questionnaireResponse';
// ... etc.
```

**Orchestrator pattern to mirror** (from `src/lib/exportPdf/index.ts` lines 26-68):

```typescript
export async function generatePdfBlob(state: DiaryState, locale: string = 'en'): Promise<{ blob: Blob; filename: string }> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const metrics = computeMetrics(state);
  await ensureLocaleFontRegistered(doc, locale);

  pageCombinedDiary(doc, state, locale, true);
  pageResultsOverview(doc, state, metrics, locale);
  for (const dayNum of [1, 2, 3] as const) {
    pageDailyDiary(doc, state, dayNum, metrics.dayMetrics[dayNum - 1], locale);
  }
  // ...
  return {
    blob: doc.output('blob'),
    filename: `my-flow-check-${state.startDate}.pdf`,
  };
}
```

For `exportFhir/index.ts` the orchestrator returns a **string** (FHIR JSON), not a Blob — because the package layer wraps it. Mirror the structure (compute metrics first, then call submodules in fixed order, return a packaged result):

```typescript
export function generateFhirBundle(state: DiaryState): string {
  const metrics = computeMetrics(state);
  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      { resource: buildPatient(state) },
      { resource: buildQuestionnaireResponse(state, metrics) },
      ...buildObservations(state).map(o => ({ resource: o })),
    ],
  };
  return JSON.stringify(bundle, null, 2);
}
```

**Why this diverges from exportPdf:**
1. **No locale arg in FHIR orchestrator.** Per CONTEXT.md §"6-locale parity" — FHIR clinical terminology stays English (Epic/Cerner expectation). `generateFhirBundle` takes `state` only; locale matters only for the README inside the zip wrapper.
2. **No font registration step.** FHIR is pure JSON; the `await ensureLocaleFontRegistered` line has no equivalent.
3. **No `shared.ts` `addFooter` walk.** PDF post-processes every page to add footers; FHIR Bundle assembly is one-shot. Drop the trailing `for (let i = 1; i <= pageCount; i++)` loop entirely.
4. **`types.ts` is mandatory** (no PDF equivalent). FHIR R4 has dozens of resource shapes — define only the subset we emit (`FhirBundle`, `FhirPatient`, `FhirObservation`, `FhirQuestionnaireResponse`) with strict TS interfaces. Don't import a third-party `@types/fhir` package — keep the surface small and auditable.

**Submodule signature pattern** (every PDF page module follows this shape — `src/lib/exportPdf/machineData.ts` line 12):
```typescript
export function pageMachineData(doc: jsPDF, state: DiaryState, metrics: DiaryMetrics, locale: string) {
```

FHIR builders should mirror the same signature but return a resource instead of mutating a shared doc:
```typescript
export function buildPatient(state: DiaryState): FhirPatient { /* ... */ }
export function buildObservations(state: DiaryState): FhirObservation[] { /* ... */ }
export function buildQuestionnaireResponse(state: DiaryState, metrics: DiaryMetrics): FhirQuestionnaireResponse { /* ... */ }
```

---

### 2. `src/lib/exportPackage/` (zip assembler)

**Two analogs combined:**
- **`src/lib/exportPdf/index.ts`** for the async-Blob-returning orchestrator shape (`generatePdfBlob` returns `Promise<{ blob: Blob; filename: string }>` — exact same shape Phase 13's `generatePackageBlob` needs).
- **`src/lib/exportCsv.ts`** for the dual-export pattern: `generateCsv(state)` returns the raw string, then `generateCsvBlob(state)` wraps it, then `downloadCsv(state)` triggers the browser download. Phase 13's `exportPackage/` should expose the same trio.

**Orchestrator signature to mirror** (from `src/lib/exportPdf/index.ts` line 26 and `src/lib/exportCsv.ts` line 176):

```typescript
// exportPdf/index.ts:26 — async, returns { blob, filename }
export async function generatePdfBlob(state: DiaryState, locale: string = 'en'): Promise<{ blob: Blob; filename: string }> { ... }

// exportCsv.ts:176 — sync, same return shape
export function generateCsvBlob(state: DiaryState): { blob: Blob; filename: string } { ... }
```

For `exportPackage/index.ts` mirror the **async** form (because the inner PDF generation is async):

```typescript
export async function generatePackageBlob(state: DiaryState, locale: string = 'en'): Promise<{ blob: Blob; filename: string }> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const { blob: pdfBlob } = await generatePdfBlob(state, locale);
  const csvString = generateCsv(state);
  const fhirString = generateFhirBundle(state);
  const readme = buildReadme(state, locale);

  zip.file('01-clinical-report.pdf', pdfBlob);
  zip.file('02-events.csv', csvString);
  zip.file('03-emr-bundle.fhir.json', fhirString);
  zip.file('README.txt', readme);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
  return {
    blob,
    filename: `myflowcheck-${state.startDate}.zip`,
  };
}
```

**Dynamic-import pattern to mirror** (from `src/components/export/ExportActions.tsx` lines 48-52):

```typescript
// Dynamic-import: jsPDF + jspdf-autotable are ~80KB gzipped and only
// needed when the patient finishes day 3 and exports. Keeping them out
// of the main bundle improves initial-load performance for everyone
// who never reaches the export step.
const { generatePdf, generatePdfBlob } = await import('@/lib/exportPdf');
```

Phase 13: `jszip` is ~30KB gzipped — same reasoning applies. Either dynamic-import `jszip` from inside `generatePackageBlob` (preferred — keeps it out of the entry bundle), OR dynamic-import the whole `@/lib/exportPackage` module from `<ExportActions>`. The latter is more consistent with the existing PDF pattern; see line 51 in `ExportActions.tsx`.

**Download-fallback helper pattern** (from `src/lib/exportPdf/index.ts` lines 71-87):

```typescript
export async function generatePdf(state: DiaryState, locale: string = 'en'): Promise<void> {
  const { blob, filename } = await generatePdfBlob(state, locale);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}
```

Phase 13 should expose `downloadPackage(state, locale): Promise<void>` mirroring this exactly. Same 500ms cleanup timeout; same `link.style.display = 'none'`; same `document.body.appendChild` / removeChild.

**`readme.ts` submodule pattern** — no exact analog. The closest is `src/lib/exportPdf/strings.ts` lines 87-158 (`PDF_STRINGS` per-locale const + getter). But for README the per-locale content is much longer than a UI string table.

Recommend: keep `readme.ts` minimal — read the README text from the next-intl messages catalog (the canonical translation source), don't duplicate it inside `exportFhir/strings.ts`-style:

```typescript
import { getTranslations } from 'next-intl/server';
// or for client-side:
import { useTranslations } from 'next-intl';

export async function buildReadme(state: DiaryState, locale: string): Promise<string> {
  // Pull the README body from messages/{locale}.json via next-intl
  // Inject state-specific values (age, startDate, timezone) via ICU placeholders
  // Return plain string (already 80-char-wrapped in the message catalog)
}
```

**Why this diverges** from `exportPdf/strings.ts`:
1. README content is **long-form translated prose**, not a UI string table. Living in `messages/*.json` means the existing `i18n-sync` hook auto-mirrors it across all 6 locales when EN changes (see `.claude/settings.json` PostToolUse hook). Duplicating it in `exportFhir/strings.ts` would create a second translation surface to keep in sync — bad.
2. The README needs runtime data interpolation (age, startDate, timezone) — easy via next-intl ICU placeholders (e.g. `{age}`, `{timezone}`); harder via a custom strings table.

---

### 3. `src/components/export/ExportActions.tsx` (UI reshape)

**Two analogs combined:**
- **The file itself** (line 1-211) — already exposes `pdfOnly` prop, the `canShareFiles()` detection, the share-vs-download dual-path, the `<Toast>` error pattern, the dynamic-import of `@/lib/exportPdf`. The Phase 13 hero CTA reshape is additive — don't rewrite the file, **add a new primary button above and demote the existing 3 into a disclosure**.
- **`src/app/[locale]/help/page.tsx` lines 69-87** — the canonical `<details>/<summary>` disclosure pattern in the codebase (used for FAQ accordions).

**Web Share API detection — already present** at `ExportActions.tsx` lines 12-23:

```typescript
function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}
```

Phase 13: **reuse this exact function** — don't add a second share-detection helper. The package-share path uses the same predicate.

**Web Share call pattern — already present** at `ExportActions.tsx` lines 52-60 (PDF) and 98-106 (CSV):

```typescript
if (shareSupported) {
  const { blob, filename } = await generatePdfBlob(store, locale);
  track('pdf_generated', { method: 'share' });
  const file = new File([blob], filename, { type: 'application/pdf' });
  await navigator.share({
    title: 'My Flow Check — Bladder Diary',
    files: [file],
  });
  track('pdf_shared');
} else {
  await generatePdf(store, locale);
  track('pdf_generated', { method: 'download' });
}
```

For the hero button, mirror this exactly but with the zip:
```typescript
const file = new File([blob], filename, { type: 'application/zip' });
await navigator.share({
  title: 'My Flow Check — Bladder Diary',
  files: [file],
});
```

**AbortError swallowing pattern** — from `ExportActions.tsx` lines 66-67:
```typescript
} catch (err) {
  // Ignore user-cancelled share (AbortError)
  if (err instanceof Error && err.name === 'AbortError') return;
  console.error('PDF export failed:', err);
```
Mirror exactly for the package handler. User-cancelled share-sheet must not raise a toast.

**Analytics tracking pattern** (from lines 54, 63, 84) — `track('pdf_generated', { method: 'share' | 'download' | 'download_alt' })`. For the package, emit:
- `track('package_generated', { method: 'share' })` on hero-share path
- `track('package_generated', { method: 'download' })` on hero-download fallback
- `track('package_shared')` after successful `navigator.share()` resolves

The existing `pdf_*` and `csv_*` events are preserved (the demoted buttons still emit them).

**Disclosure pattern to mirror — from `src/app/[locale]/help/page.tsx` lines 69-87:**

```typescript
<details
  className="group rounded-2xl bg-white border border-ipc-100 overflow-hidden"
>
  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer
    list-none text-base font-semibold text-ipc-950
    [&::-webkit-details-marker]:hidden">
    {item.q}
    <ChevronLeft
      size={18}
      className="text-ipc-400 transition-transform -rotate-90
        group-open:rotate-[-270deg] shrink-0 ml-2 rtl:scale-x-[-1]"
    />
  </summary>
  <div className="px-5 pb-4 text-base text-ipc-700 leading-relaxed">
    {item.a}
  </div>
</details>
```

For Phase 13's "More options" disclosure, mirror exactly:
- Native `<details>/<summary>` — no JS state, no aria-expanded plumbing needed (browser handles it).
- Same Tailwind classes: `group rounded-2xl bg-white border border-ipc-100 overflow-hidden`.
- Same chevron rotation pattern: `group-open:rotate-[-270deg]` + `rtl:scale-x-[-1]` for RTL flip.
- `[&::-webkit-details-marker]:hidden` to suppress the default Safari triangle.
- The disclosure body contains the **existing CSV button + existing PDF button + existing share-alt buttons** (lines 142-194 of current `ExportActions.tsx`) — they move into the `<div>` block under `<summary>` verbatim, no behavior change.

**Why this is the right disclosure choice** (vs. building a custom collapsible):
1. The codebase already commits to native `<details>` for FAQ — consistency.
2. No new state to manage (no `useState(false)` + click handlers + outside-click + a11y plumbing).
3. Free a11y: `<details>` is a real disclosure widget; screen-readers announce expand/collapse without ARIA.
4. Free RTL: the chevron flip with `rtl:scale-x-[-1]` already works.
5. SSR-safe — no hydration flash; the closed state is the default.

**Hero CTA button pattern** — reuse `<Button variant="primary" fullWidth>` from `ExportActions.tsx` line 144-152:

```tsx
<Button
  onClick={handleHeroPackage}
  fullWidth
  variant="primary"
  disabled={!hasData || exporting === 'package'}
  className="md:hover:-translate-y-px md:transition-all md:duration-150"
>
  <Share2 size={20} />
  {exporting === 'package' ? t('generating') : t('packageHero')}
</Button>
```

(The existing PDF/CSV buttons stop being the *primary*; demote them to `variant="secondary"` inside the disclosure, or leave their existing variants but understand the visual weight no longer dominates.)

**Error toast pattern — already present** (line 70 + line 202-208):
```typescript
setErrorToast(t('pdfError', { msg }));
// ...
<Toast
  message={errorToast ?? ''}
  emoji="⚠️"
  visible={errorToast !== null}
  onDismiss={() => setErrorToast(null)}
  duration={5000}
/>
```
Reuse the same `<Toast>` with a new key `t('packageError', { msg })`. One toast component covers all three error paths (PDF, CSV, package).

---

### 4. `messages/*.json` — new keys

**Two analogs** depending on key purpose:

**(a) Short UI strings (button labels, disclosure label, error toast):**

Closest analog: `summary.exportSendPdf` / `summary.exportSavePdf` (lines 296-299 of `messages/en.json`):

```json
"exportSendPdf": "Send to your healthcare team",
"exportSavePdf": "Save the PDF for me",
"exportSendCsv": "Send a spreadsheet",
"exportSaveCsv": "Save the spreadsheet",
```

For Phase 13, add to the existing `export` namespace (lines 312-321 of `messages/en.json`):

```json
"export": {
  // existing keys ...
  "sharePackage": "Send to healthcare team",
  "downloadPackage": "Download package",
  "moreOptions": "More options",
  "packageGenerating": "Preparing your package...",
  "packageError": "Package error: {msg}"
}
```

OR add the hero label to `summary` namespace alongside the other export labels (lines 296-299) — choose one location and stick to it. Recommend the existing `export` namespace because that's where the dynamic copy already lives (`pdfError`, `csvError`, `generating`).

**(b) Multi-paragraph README body content:**

Closest analog: `learn.forMen.intro` / `learn.forWomen.intro` (lines 745 + 754 of `messages/en.json`) — 600+ word multi-paragraph strings with `\n\n` separators. Exact shape:

```json
"intro": "Men experience bladder and pelvic symptoms across the lifespan ... [first paragraph].\n\nThe articles below cover the patterns ... [second paragraph].\n\nThe 3-day bladder diary captures ... [third paragraph]."
```

For Phase 13, add to `export.readme` namespace:

```json
"export": {
  ...
  "readme": {
    "title": "My Flow Check — 3-Day Bladder Diary",
    "patientLine": "Patient profile: age {age}, {timezone} timezone",
    "completedLine": "Diary completed: {date}",
    "intro": "This package contains 4 files for your records. Pick whichever matches\nyour workflow — they all carry the same patient-reported data.",
    "fileDescriptions": "  01-clinical-report.pdf\n     The 7-page clinical PDF ... \n\n  02-events.csv\n     Raw event data ...",
    "ehrInstructions": "  03-emr-bundle.fhir.json\n     FHIR R4 Bundle for direct upload ...\n       Epic: Patient Chart -> Documents -> ...",
    "footer": "Questions about what's in the diary or how to read the metrics?\nSee https://myflowcheck.com/learn/for-clinicians"
  }
}
```

Why nested `readme` object vs flat keys: groups all README content for the `i18n-sync` skill to translate as a coherent block.

**i18n-sync auto-mirror confirmation:**

`.claude/settings.json` (already verified, line 5) wires a `PostToolUse` hook:

> "messages/en.json was just edited — sync the new or changed keys into messages/{fr,es,pt,zh,ar}.json using the i18n-sync skill"

So **yes** — editing `messages/en.json` to add the new `export.readme.*` keys will automatically trigger `i18n-sync` to mirror them across all 5 non-English locales. Phase 13's planner does NOT need to manually edit 6 files. Only `en.json` is hand-authored.

**ICU placeholder pattern** (from line 16 of `messages/en.json`):
```json
"subtractMinutes": "Subtract {n} minutes"
```

For runtime patient data (age, timezone, completion date), use ICU placeholders:
```json
"patientLine": "Patient profile: age {age}, {timezone} timezone"
```

Then at the call site in `readme.ts`:
```typescript
const t = await getTranslations({ locale, namespace: 'export.readme' });
t('patientLine', { age: state.age, timezone: state.timeZone });
```

**No em-dashes constraint** (per CONTEXT.md + user memory `feedback_no_em_dashes.md`): the README uses periods/commas/colons. The existing `forMen.intro` follows this rule already — use it as the register reference.

---

### 5. `src/__tests__/exportFhir.test.ts` + `exportPackage.test.ts`

**Three analogs combined** depending on what each test asserts:

**(a) Generating a blob/string from a synthetic DiaryState** — `src/__tests__/pdf-blob-content.test.ts`:

Read lines 86-161 of `pdf-blob-content.test.ts` for the `buildMinimalDiaryState()` helper. Reuse the **exact same fixture shape** for FHIR tests — 3 bedtimes, 3 wake times, 3 voids (one per day with `isFirstMorningVoid: true`), 3 drinks, no leaks. This shape is already known to satisfy `computeMetrics` for all 3 days and 2 periods.

```typescript
function buildMinimalDiaryState(): DiaryState {
  return {
    startDate: '2026-05-18',
    age: 55,
    volumeUnit: 'mL',
    diaryStarted: true,
    clinicCode: null,
    timeZone: 'America/New_York',
    morningAnchor: null,
    day1CelebrationShown: false,
    voids: [ /* ... */ ],
    drinks: [ /* ... */ ],
    leaks: [],
    bedtimes: [ /* ... */ ],
    wakeTimes: [ /* ... */ ],
  };
}
```

**(b) Blob-to-Buffer conversion for content assertion** — `pdf-blob-content.test.ts` lines 163-171:

```typescript
async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
```

For `exportPackage.test.ts`, after `generatePackageBlob`, use the same helper to read the zip into a Buffer, then pipe into JSZip's `loadAsync` to inspect contents.

**(c) Per-locale structural-parity sweep** — `src/__tests__/pdf-strings-table.test.ts` lines 22-29:

```typescript
it('every locale has the same set of keys as EN (structural parity)', () => {
  const enKeys = new Set(Object.keys(getPdfStrings('en')));
  for (const L of SUPPORTED_PDF_LOCALES) {
    const lKeys = new Set(Object.keys(getPdfStrings(L)));
    expect(lKeys).toEqual(enKeys);
  }
});
```

For `exportPackage.test.ts`, mirror — sweep all 6 locales and assert the README content exists for each. Import `locales` from `@/i18n/config` (the constant already lists all 6).

**(d) Schema-validation pattern — NO in-repo analog.**

Phase 13 introduces `ajv` (per CONTEXT.md FHIR-EX-03). The codebase has **no existing pattern** for JSON-schema validation. The closest existing test paradigm is the static guard in `pdf-strings-table.test.ts` lines 67-87:

```typescript
it('source files contain no hardcoded English literals from the audit (static guard)', () => {
  const machineDataSrc = readFileSync(resolve('src/lib/exportPdf/machineData.ts'), 'utf8');
  expect(machineDataSrc).not.toMatch(/doc\.text\('Structured Data'/);
  // ... etc.
});
```

That's `readFileSync` + regex assertion. For FHIR, the planner should add a **new** dependency (`ajv` + the FHIR R4 core schema JSON file in `src/__tests__/fixtures/fhir-r4-schema.json` or similar) and write a new test pattern:

```typescript
import Ajv from 'ajv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateFhirBundle } from '@/lib/exportFhir';

describe('FHIR Bundle validates against R4 schema', () => {
  const schemaJson = JSON.parse(
    readFileSync(resolve('src/__tests__/fixtures/fhir-r4-bundle.schema.json'), 'utf8')
  );
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validate = ajv.compile(schemaJson);

  it('synthetic Bundle from minimal DiaryState passes schema validation', () => {
    const state = buildMinimalDiaryState();
    const bundleJson = generateFhirBundle(state);
    const bundle = JSON.parse(bundleJson);
    const valid = validate(bundle);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });
});
```

Note `readFileSync` + `resolve(...)` is the **established codebase idiom** for fixture loading in tests — see `pdf-strings-table.test.ts` lines 68, 71, 76, 80, 83. Use it.

**(e) PHI audit pattern — NO in-repo analog.**

Phase 13 introduces a new test idiom (per FHIR-EX-03):

```typescript
it('Patient resource contains no PHI fields', () => {
  const state = buildMinimalDiaryState();
  const bundleJson = generateFhirBundle(state);
  const bundle = JSON.parse(bundleJson);
  const patient = bundle.entry.find((e: any) => e.resource.resourceType === 'Patient')?.resource;

  expect(patient).toBeTruthy();
  expect(patient.name).toBeUndefined();
  expect(patient.address).toBeUndefined();
  expect(patient.telecom).toBeUndefined();
  // birthDate is permitted but must be year-only (YYYY), never day-precision (YYYY-MM-DD)
  if (patient.birthDate) {
    expect(patient.birthDate).toMatch(/^\d{4}$/);
  }
  // identifier is permitted only if it's the clinicCode pointer, never a PHI value
  if (patient.identifier) {
    for (const id of patient.identifier) {
      expect(id.value).not.toMatch(/^\d{3}-\d{2}-\d{4}$/); // not an SSN-shaped string
    }
  }
});
```

This is a **new pattern** — call it out clearly in the PLAN.md as "Phase 13 establishes the PHI-audit test idiom; future FHIR/EHR-export work can extend it."

**(f) Zip-content assertion pattern — NO in-repo analog.**

Phase 13 introduces the pattern. Use `jszip`'s `loadAsync` API:

```typescript
import JSZip from 'jszip';

describe('Package zip contents', () => {
  it('contains exactly 4 files with correct names and order', async () => {
    const state = buildMinimalDiaryState();
    const { blob, filename } = await generatePackageBlob(state, 'en');
    expect(filename).toBe('myflowcheck-2026-05-18.zip');

    const buf = await blobToBuffer(blob);
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual([
      '01-clinical-report.pdf',
      '02-events.csv',
      '03-emr-bundle.fhir.json',
      'README.txt',
    ]);
  });

  it('PDF inside zip is byte-identical to standalone PDF export', async () => {
    const state = buildMinimalDiaryState();
    const { blob: standalonePdf } = await generatePdfBlob(state, 'en');
    const { blob: pkgBlob } = await generatePackageBlob(state, 'en');
    const zip = await JSZip.loadAsync(await blobToBuffer(pkgBlob));
    const pdfInZip = await zip.file('01-clinical-report.pdf')!.async('uint8array');
    const standalonePdfBytes = new Uint8Array(await standalonePdf.arrayBuffer());
    // PDFs include a timestamp in the trailer; comparing bytes is fragile.
    // Compare size as a proxy + parse both with pdf-parse to assert same page count.
    expect(Math.abs(pdfInZip.length - standalonePdfBytes.length)).toBeLessThan(1000);
  });
});
```

**jsdom DOMMatrix / Path2D shim pattern** — from `pdf-blob-content.test.ts` lines 38-49 — applies **only if Phase 13 tests touch pdf-parse**. For pure FHIR / zip tests, no shim needed (no canvas, no pdfjs-dist).

---

## Shared Patterns

### Web Share API + AbortError handling

**Source:** `src/components/export/ExportActions.tsx` lines 12-23 (detection), 52-67 (call + AbortError swallow), and `src/lib/reminders.ts` lines 117-131 (URL-only share variant).

**Apply to:** Phase 13's hero CTA `handleHeroPackage` handler.

The exact shape to copy:

```typescript
async function handleHeroPackage() {
  setExporting('package');
  try {
    const { generatePackageBlob, downloadPackage } = await import('@/lib/exportPackage');
    if (shareSupported) {
      const { blob, filename } = await generatePackageBlob(store, locale);
      track('package_generated', { method: 'share' });
      const file = new File([blob], filename, { type: 'application/zip' });
      await navigator.share({
        title: 'My Flow Check — Bladder Diary',
        files: [file],
      });
      track('package_shared');
    } else {
      await downloadPackage(store, locale);
      track('package_generated', { method: 'download' });
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    console.error('Package export failed:', err);
    const msg = err instanceof Error ? err.message : String(err);
    setErrorToast(t('packageError', { msg }));
  } finally {
    setTimeout(() => setExporting(null), 1000);
  }
}
```

### Async-dynamic-import for heavy modules

**Source:** `src/components/export/ExportActions.tsx` lines 48-52, 82.

**Apply to:** ALL Phase 13 export consumers in the React component. Never static-import `@/lib/exportPackage` or `@/lib/exportFhir` at the top of `ExportActions.tsx` — keep them lazy-loaded. `jszip` is ~30 KB; FHIR types + builder may add another ~10 KB. Together that's a meaningful first-load saving for the 95% of patients who never reach Day 3.

### Privacy invariant — no PHI, no network calls

**Source:** Memory `project_localstorage_by_design.md` + CONTEXT.md line 137.

**Apply to:** Every Phase 13 module. Never `fetch`, never POST to an external validator. The ajv schema lives in `src/__tests__/fixtures/` and is read with `readFileSync` at test time only. Production code never touches a network. PHI audit pattern (see test analog (e) above) is the per-Bundle gatekeeper.

### Locale-as-string parameter (default 'en')

**Source:** `src/lib/exportPdf/index.ts` line 26 — `locale: string = 'en'`, and `src/lib/exportCsv.ts` line 40 — currently takes `(state)` only, but exportPdf is the more recent pattern.

**Apply to:** `generatePackageBlob(state, locale = 'en')` and `downloadPackage(state, locale = 'en')`. `generateFhirBundle(state)` is the **exception** — no locale arg, per FHIR clinical-terminology convention. `buildReadme(state, locale)` takes locale (it's the part that needs translating).

### Filename convention

**Source:** `src/lib/exportPdf/index.ts` line 66 — `my-flow-check-${state.startDate}.pdf` and `src/lib/exportCsv.ts` line 180 — `my-flow-check-${state.startDate}.csv`.

**Phase 13 diverges intentionally** — per CONTEXT.md line 32, the zip uses `myflowcheck-` (no hyphens between words, matches the domain) not `my-flow-check-`:

```typescript
filename: `myflowcheck-${state.startDate}.zip`
```

This is deliberate — the zip name appears in the share-sheet title row and clinician's downloads folder, both of which benefit from the more compact "brand-y" form. Existing PDF/CSV names stay as-is for backward compatibility.

---

## No Analog Found

| File | Role | Data Flow | Reason / What to Do |
|------|------|-----------|---------------------|
| `src/lib/exportFhir/validate.ts` (ajv-based schema validator) | utility | data validation | No existing JSON-schema validator anywhere in `src/lib/`. Phase 13 introduces `ajv` as a new dependency. Treat `validate.ts` as a thin wrapper around `ajv.compile(schemaJson)` + a `validateBundle(bundle): { valid: boolean; errors: ErrorObject[] }` export, called only from tests (not from production). |
| `src/lib/exportFhir/types.ts` (FHIR R4 interface subset) | utility | type-only | No existing FHIR type definitions. Define ONLY the resources we emit (`FhirBundle`, `FhirPatient`, `FhirObservation`, `FhirQuestionnaireResponse`). Do not depend on `@types/fhir` — it's a large surface and the planner audit benefits from a hand-curated minimal type file. |
| `src/lib/exportFhir/loinc.ts` (LOINC + UCUM code registry) | constants | data | No existing clinical-terminology code registry. The closest spiritual analog is `src/lib/constants.ts` (line 1) — flat `const X = ... as const` exports. Follow the same idiom: `export const LOINC = { urineVolume: '...', fluidIntake: '...', incontinenceEvent: '...' } as const;`. Planner researches actual codes at plan time (CONTEXT.md §"Key planning questions" item 4). |

---

## Metadata

**Analog search scope:** `/Users/zhen/bladderdiary-patient/src/lib/`, `/src/components/`, `/src/__tests__/`, `/src/app/`, `/messages/`, `/.claude/settings.json`, `/e2e/helpers/`.

**Files read in full or in targeted ranges:**
- `src/lib/exportPdf/index.ts` (87 lines — full)
- `src/lib/exportPdf/shared.ts` (50 lines — full)
- `src/lib/exportPdf/machineData.ts` (157 lines — full)
- `src/lib/exportPdf/combinedDiary.ts` (174 lines — full)
- `src/lib/exportPdf/theme.ts` (46 lines — full)
- `src/lib/exportPdf/strings.ts` (lines 1-220 only — large file, targeted ranges; full file is 22 KB / ~700 lines)
- `src/lib/exportCsv.ts` (193 lines — full)
- `src/lib/reminders.ts` (lines 115-149 — targeted range for `shareDiaryLink`)
- `src/lib/types.ts` (149 lines — full)
- `src/components/export/ExportActions.tsx` (211 lines — full)
- `src/components/layout/Header.tsx` (183 lines — full, for disclosure state pattern reference)
- `src/app/[locale]/help/page.tsx` (115 lines — full, primary disclosure analog)
- `src/__tests__/pdf-blob-content.test.ts` (315 lines — full, primary blob-content test analog)
- `src/__tests__/pdf-strings-table.test.ts` (117 lines — full, primary structural-parity test analog)
- `src/__tests__/export-actions-error-toast.test.tsx` (191 lines — full, ExportActions test analog including Web Share stub)
- `src/__tests__/generate-test-exports.test.ts` (lines 1-80, fixture-shape reference)
- `messages/en.json` (targeted: lines 1-30, 285-340, 405-455, 745-754 — top-level structure, `summary` keys, `help` disclosure keys, multi-paragraph `learn.forMen.intro` analog)
- `e2e/helpers/fixtures.ts` (lines 1-60, fixture-shape reference)
- `.claude/settings.json` (full, confirms `i18n-sync` PostToolUse hook auto-fires on `messages/en.json` edits)
- `.planning/phases/13-clinical-export-package/13-CONTEXT.md` (full)
- `package.json` (targeted grep for current export-related deps)

**Files NOT read but confirmed to exist for completeness:**
- `src/lib/calculations.ts` — `computeMetrics(state): DiaryMetrics` signature already exposed; FHIR `QuestionnaireResponse` will import this.
- `src/lib/store.ts` — `useDiaryStore` already wired into `ExportActions.tsx`; no changes needed.
- `src/lib/exportPdf/dailyDiary.ts`, `graphs.ts`, `resultsOverview.ts`, `slots.ts`, `fonts/*.ts` — subordinate page modules; mirror by directory shape only.

**Pattern extraction date:** 2026-05-18
