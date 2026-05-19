# Phase 13: Clinical Export Package — Research

**Researched:** 2026-05-18
**Domain:** FHIR R4 + clinical interop + browser-side zip + Web Share API
**Confidence:** HIGH on FHIR shape and code-system selection; HIGH on jszip vs fflate; MEDIUM on Web Share API zip-MIME edge cases (depends on per-OS behavior, not spec); HIGH on AJV bundling strategy.

## Summary

Phase 13 reshapes `<ExportActions>` from three peer buttons into one hero "Send to healthcare team" CTA that emits a 4-file zip (PDF, CSV, FHIR R4 Bundle, README) + demoted "More options" for legacy paths. The codebase is already 80% ready: `generatePdfBlob` and `generateCsvBlob` already return `{blob, filename}` tuples, dynamic-import is already in use for jspdf, and the Web Share API integration plus desktop fallback path already exists for the individual PDF/CSV buttons. The new work is concentrated in three places: a new `src/lib/exportFhir/` module, a new `src/lib/exportPackage/` module (zip + README), and a UI reshape of `<ExportActions>`.

The FHIR direction is straightforward: `Bundle (type: collection)` wrapping one `Patient` (year-only birthDate, no PHI), one `QuestionnaireResponse` recording IPC clinical metrics, and N `Observation` resources (one per event). LOINC codes that the planner should select are pinned below — `9187-6` for single-void urine output (random-time, volume-property) is the best Epic-flowsheet match for our use case; the often-cited `19153-6` is a *specimen* code, not an output-event code, and is the wrong fit. SNOMED `162172004` is the canonical incontinence-event code.

JSZip is the safe default at the cost of bundle size (~50KB gzipped vs ~11KB for fflate). JSZip has not shipped a new release in ~3 years but the maintainer status is "sustainable" and weekly downloads are ~13.75M. For this app fflate at ~11KB would save ~40KB on a code path that fires once per patient at the very end of the diary — the marginal gain is small relative to JSZip's API maturity and worked examples. The planner should default to JSZip unless something else forces a switch.

**Primary recommendation:** Use JSZip + AJV (devDependency only, runs in vitest CI, not bundled into the client). FHIR codes: `9187-6` for voids, `9108-2` for daily fluid intake tracked at event-grain via SNOMED for the incontinence side. Build the FHIR module with full UCUM (`mL` from `http://unitsofmeasure.org`). Web Share API: extend the existing `canShareFiles()` probe pattern to test a real zip File at mount time — don't trust spec-level claims about `application/zip` support. README: a single big key in `messages/*.json` per locale is the right architecture (it's prose, not template data; reuses the existing `i18n-sync` + `naturalize-prose` pipelines).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FHIR Bundle assembly | Browser / Client | — | Static-export app, no server. Pure transform `DiaryState → BundleJson`. |
| Zip composition | Browser / Client | — | JSZip runs in the browser; no upstream. |
| README text composition | Browser / Client | — | Reads from next-intl translations bundled at build time. |
| Web Share API dispatch | Browser / Client | — | `navigator.share` is browser-only by definition. |
| FHIR R4 schema validation | Build / Test (vitest CI) | — | AJV + fhir.schema.json (~3MB) is too large to ship to client. Validation is a build-time guarantee. |
| Translation of README copy | Build / i18n pipeline | Browser at render time | `i18n-sync` mirrors EN → 5 locales at edit time; runtime reads bundled messages. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jszip | 3.10.1 | Browser-side zip composition for the 4-file package | De facto choice for browser zip; ~13.75M weekly downloads; ~50KB gzipped; mature API, Web Streams compatible. `[VERIFIED: Snyk + npmjs.com via WebSearch 2026-05-18]` |
| ajv | latest stable (8.x line) | FHIR R4 JSON Schema validation in vitest CI | Industry-standard JSON Schema validator; `devDependency` only — does NOT bundle into the client. `[VERIFIED: ajv.js.org docs]` |
| jspdf | 4.2.0 (already installed) | PDF generation (existing) | No new install needed. `[VERIFIED: package.json L25]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/jszip | (bundled with jszip 3.x) | TS types | Auto-installed with jszip 3.10+ — `@types/jszip` is officially stale (3.4.1) per registry; jszip itself now ships types. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jszip (~50KB gz) | fflate (~11KB gz) | fflate saves ~40KB; faster (uses Web Workers); API less mature. **Recommend jszip** — bundle hit is one-time on the rarely-visited summary page, and the export module already uses dynamic-import (`await import('@/lib/exportPdf')` in `ExportActions.tsx:51`) so this code path never enters the main bundle. The 40KB saving lands on a path that's already lazy. `[CITED: github.com/101arrowz/fflate]` |
| ajv runtime validation in browser | ajv standalone codegen | Standalone pre-compiles validators at build time, eliminates `unsafe-eval` CSP requirement, but adds ~2-4MB to repo as generated code. Not needed — we validate in vitest CI, not at runtime. `[CITED: ajv.js.org/standalone.html]` |
| jszip 3.10.1 (last release ~2022) | fork or zip.js | jszip *is* "sustainable maintenance" per Snyk; no critical CVEs; widely battle-tested. Switching to a less-popular alternative for "freshness" signal is a worse risk trade. `[VERIFIED: Snyk via WebSearch]` |

**Installation:**
```bash
npm install jszip
npm install --save-dev ajv
# devDependency: FHIR R4 JSON Schema — download as a build-step artifact, not an npm install
# Either fetch fhir.schema.json (3-5MB unpacked) from hl7.org/fhir/R4/fhir.schema.json.zip
# and check it into the repo under e.g. test-fixtures/fhir/, or write a small build script.
```

**Version verification:**
- jszip 3.10.1 — last published ~2022 per Snyk; 13.75M weekly downloads. Sustainable. `[VERIFIED: Snyk via WebSearch 2026-05-18]`
- fflate 0.8.3 — 0.8.2 last published ~2023; latest 0.8.3 with ~8kB core build. `[VERIFIED: npmjs.com via WebSearch]`
- ajv: latest 8.x line is stable (precise patch number wasn't queryable in this session because `npm view` was sandboxed; planner should run `npm view ajv version` once during plan execution). `[ASSUMED]`

## Architecture Patterns

### System Architecture Diagram

```
                        Summary Page (/summary)
                                 │
                                 ▼
                       <ExportActions> (client)
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
   "Send to healthcare    "More options"     (hidden when
    team" hero CTA       disclosure (col-     hasData==false)
              │           lapsed by default)
              ▼                  │
   handleSendPackage()     existing handlers:
              │            handlePdf / handleCsv
              ▼            handlePdfDownload / handleCsvDownload
   await import('@/lib/exportPackage')
              │
              ▼
   generatePackageBlob(state, locale)
              │
   ┌──────────┼──────────────────────┬─────────────────┐
   ▼          ▼                      ▼                 ▼
 PDF       CSV                   FHIR Bundle        README.txt
 (reuses   (reuses               (NEW module        (NEW module
  exportPdf) exportCsv)          exportFhir/)       exportPackage/readme.ts)
   │          │                      │                 │
   └──────────┴──────────────────────┴─────────────────┘
                       ▼
              JSZip.generateAsync({type:'blob'})
                       │
                       ▼
              { blob, filename: 'myflowcheck-<YYYY-MM-DD>.zip' }
                       │
                       ▼
        ┌──────────────┴──────────────┐
        ▼                              ▼
canShareFiles(zip File)        Desktop / no-share fallback:
   true: navigator.share          createObjectURL + <a download>
   false: download path
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── exportPackage/        # NEW — zip composer
│   │   ├── index.ts          # generatePackageBlob(state, locale)
│   │   └── readme.ts         # buildReadme(state, locale): string
│   ├── exportFhir/           # NEW — FHIR R4 Bundle module
│   │   ├── index.ts          # generateFhirBundle(state, locale): object
│   │   ├── types.ts          # FHIR R4 resource shape interfaces (R4 subset)
│   │   ├── patient.ts        # buildPatient(state): Patient
│   │   ├── observations.ts   # buildObservations(state): Observation[]
│   │   ├── questionnaireResponse.ts  # buildQuestionnaireResponse(state, metrics): QuestionnaireResponse
│   │   ├── loinc.ts          # LOINC code constants + UCUM unit constants
│   │   └── validate.ts       # ajv-based validator (called from tests only)
│   ├── exportPdf/            # EXISTING — no changes
│   ├── exportCsv.ts          # EXISTING — no changes
│   └── store.ts              # EXISTING — read-only consumer here
└── components/
    └── export/
        └── ExportActions.tsx # MODIFY — add hero CTA + disclosure
```

### Pattern 1: Single-purpose generator modules return `{blob, filename}` tuples

**What:** Each export submodule (`exportPdf`, `exportCsv`, future `exportPackage`) exposes the same `(state, locale) => Promise<{blob, filename}>` shape so the UI layer can stay generic across all three.

**When to use:** Any time a new export format is added. The pattern is already in use — see `generatePdfBlob` at `src/lib/exportPdf/index.ts:26` and `generateCsvBlob` at `src/lib/exportCsv.ts:176`.

**Example:**
```typescript
// src/lib/exportPackage/index.ts
import JSZip from 'jszip';
import { generatePdfBlob } from '@/lib/exportPdf';
import { generateCsvBlob } from '@/lib/exportCsv';
import { generateFhirBundle } from '@/lib/exportFhir';
import { buildReadme } from './readme';
import type { DiaryState } from '@/lib/types';

export async function generatePackageBlob(
  state: DiaryState,
  locale: string = 'en',
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();

  const [pdf, csv] = await Promise.all([
    generatePdfBlob(state, locale),
    Promise.resolve(generateCsvBlob(state)),
  ]);
  const fhirBundle = generateFhirBundle(state, locale);
  const readmeText = buildReadme(state, locale);

  zip.file('01-clinical-report.pdf', pdf.blob);
  zip.file('02-events.csv', csv.blob);
  zip.file('03-emr-bundle.fhir.json', JSON.stringify(fhirBundle, null, 2));
  zip.file('README.txt', readmeText);

  const blob = await zip.generateAsync({ type: 'blob' });
  return {
    blob,
    filename: `myflowcheck-${state.startDate}.zip`,
  };
}
```

### Pattern 2: FHIR Bundle is plain JSON, not OO

**What:** Build the FHIR Bundle as a literal TypeScript object that conforms to a thin R4 subset interface. Do not pull in `@types/fhir` (~10MB of types) or HAPI-style classes.

**When to use:** Always for browser-side FHIR generation. The FHIR R4 spec is a JSON schema; we emit JSON; types are documentation for us, not runtime structure.

**Example:**
```typescript
// src/lib/exportFhir/types.ts — narrow R4 subset
export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;          // ISO 8601 UTC
  entry: FhirBundleEntry[];
}

export interface FhirBundleEntry {
  fullUrl: string;            // urn:uuid:<random>
  resource: FhirPatient | FhirObservation | FhirQuestionnaireResponse;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: FhirIdentifier[]; // optional clinicCode
  birthDate?: string;            // YEAR ONLY — "1970", not "1970-05-14"
  // NO name, NO address, NO telecom, NO communication
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final';
  category: [{ coding: [{ system: string; code: string; display: string }] }];
  code: { coding: [{ system: string; code: string; display: string }] };
  subject: { reference: string };       // "Patient/<id>"
  effectiveDateTime: string;            // ISO 8601 UTC
  valueQuantity?: { value: number; unit: 'mL'; system: 'http://unitsofmeasure.org'; code: 'mL' };
  // ...
}
```

### Pattern 3: Lazy-load the zip code path

**What:** Use `await import('@/lib/exportPackage')` from `ExportActions.tsx`, matching the existing pattern for `exportPdf`.

**When to use:** Any new export code path. The pattern is already in use at `ExportActions.tsx:51` for `exportPdf` to keep jsPDF + jspdf-autotable out of the main bundle.

**Example:**
```typescript
const handleSendPackage = useCallback(async () => {
  setExporting('package');
  try {
    const { generatePackageBlob } = await import('@/lib/exportPackage');
    const { blob, filename } = await generatePackageBlob(store, locale);
    if (shareSupported) {
      const file = new File([blob], filename, { type: 'application/zip' });
      // Re-probe with the real file (not the boot-time test File('test'))
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '...' });
        track('package_shared');
        return;
      }
    }
    // Fallback: trigger download
    triggerDownload(blob, filename);
    track('package_downloaded');
  } catch (err) { /* ... */ }
}, [store, locale, shareSupported]);
```

### Anti-Patterns to Avoid

- **Don't hand-roll a zip writer.** Browser-side zip generation has edge cases (UTF-8 filenames, central directory offsets, deflate streams) that JSZip handles cleanly. Hand-rolling has been tried and abandoned by many projects.
- **Don't bundle the FHIR R4 schema (~3-5MB) into the client.** Validate in vitest, not at runtime. Patient flow doesn't need runtime validation; build CI does.
- **Don't include PHI fields in `Patient`.** Even empty arrays (`name: []`) signal an intent to populate names later. Omit the field entirely.
- **Don't compute volume display unit in FHIR output.** Always emit canonical `volumeMl` from storage. UCUM `mL` is fixed; the patient's `volumeUnit: 'mL' | 'oz'` is a *display* preference and must not leak into the clinical payload.
- **Don't reuse `generatePdfBlob`'s `filename` field in the zip.** The standalone PDF filename is `my-flow-check-<startDate>.pdf` but inside the zip we use the clinician-friendly sort-order name `01-clinical-report.pdf`. Strip and rename when zipping.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser zip composition | Custom CDH + LFH writer | jszip 3.10.1 | UTF-8 filenames, deflate streams, central directory offsets are bug-prone. |
| FHIR Bundle validation | Custom schema walker | ajv + fhir.schema.json | FHIR R4 has ~150 resource types and inherited constraints; AJV handles `$ref` resolution correctly. |
| UUID generation for `Bundle.entry.fullUrl` | Custom random | `crypto.randomUUID()` | Available in all target browsers (iOS 14.5+, all modern Chrome/Firefox/Edge). |
| 80-char text wrapping for README | Custom word-wrapper | Pre-wrap manually in i18n string OR use simple `\n`-preserving template | The README is small enough (~50 lines/locale) that a simple template with literal `\n`s and a verified-on-write style guide is cheaper than a wrapper algorithm. JSZip just writes bytes. |
| ISO 8601 emission for FHIR `effectiveDateTime` | `new Date().toISOString().slice(...)` | Existing `timestampIso` field — already UTC ISO 8601 | The codebase already stores all event timestamps as ISO 8601 UTC strings (see `types.ts` interfaces — `VoidEntry.timestampIso`, etc.). Pass through unchanged. |

**Key insight:** This phase has *zero* novel algorithm work. Every primitive (zip writing, JSON schema validation, ISO 8601 dates, UCUM units, LOINC codes) is provided by existing libraries or the existing codebase. The work is wiring and matching: pick LOINC codes, shape the JSON, glue PDF/CSV/FHIR/README into one zip, reshape the button.

## Runtime State Inventory

> Greenfield additive phase (new modules only); no rename / refactor of existing identifiers. **Skipping** the runtime state inventory section per phase-researcher conventions.

## Common Pitfalls

### Pitfall 1: Wrong LOINC code class — using `19153-6` ("Volume in Urine collected") for a single void event
**What goes wrong:** `19153-6` is a *specimen* code (collected sample), not an *output event* code. Method/system semantics differ. An Epic flowsheet looking for "I/O Urine Output" won't match this code path.
**Why it happens:** Confused by the "unspecified duration" suffix, which sounds permissive but is actually a specimen-collection scope.
**How to avoid:** Use `9187-6` ("Urine output", Property=Volume, Scale=Quantitative, Time=Point in time, System=Fluid output urine, Class=IO_OUTPUT). This is the IO-flowsheet code. The 24-hour variant `9192-6` aggregates and is wrong for per-event observations. `[CITED: loinc.org/9187-6 via WebSearch 2026-05-18]`
**Warning signs:** Bundle imports into Epic but shows up under "Specimen Volume" tab instead of "I/O" tab.

### Pitfall 2: `valueQuantity` missing `system` + `code` fields
**What goes wrong:** Emitting `{value: 250, unit: "mL"}` without `{system: "http://unitsofmeasure.org", code: "mL"}` is technically valid FHIR but unparseable by Epic's UCUM-strict pipeline. Some EHRs silently drop the value.
**Why it happens:** The `unit` field is human-readable; `code` is machine-readable; both are required for UCUM compliance.
**How to avoid:** Always emit all four fields: `{value, unit: 'mL', system: 'http://unitsofmeasure.org', code: 'mL'}`. `[CITED: hl7.org/fhir/R4/observation.html]`
**Warning signs:** Validation passes but Epic flowsheet shows blank value column.

### Pitfall 3: `Patient.birthDate` precision leak
**What goes wrong:** Emitting `"birthDate": "1970-05-14"` (day-precision) qualifies as PHI under HIPAA Safe Harbor § 164.514(b)(2)(i)(C) — full DOB. Year-only is permitted.
**Why it happens:** `new Date(year, 0, 1).toISOString().slice(0, 10)` is a tempting one-liner; it emits day-precision.
**How to avoid:** Compute and emit `String(year)` only. Test asserts both: `/birthDate.*\d{4}-\d{2}-\d{2}/` regex must NOT match; `/birthDate.*\d{4}"/` must match. The existing requirement FHIR-EX-03 already specifies this check.
**Warning signs:** Privacy-audit grep test fails.

### Pitfall 4: `Patient.identifier` value carries actual clinic-assigned PHI
**What goes wrong:** A user-provided `clinicCode` like `"NHS-1234567890"` could accidentally be a national health ID, MRN, or other PHI — even though the URL-param validator restricts to `[A-Za-z0-9-]{1,32}`.
**Why it happens:** Patient enters their MRN into the `?clinic=` URL param thinking it's the right field.
**How to avoid:** Set `Patient.identifier[0].use = 'secondary'` and `Patient.identifier[0].type.coding = [{system: '<our-codesystem>', code: 'TRACKING', display: 'Clinic-assigned tracking code, not a medical record identifier'}]` and `system = 'https://myflowcheck.com/clinic-code'`. Document in README that this is NOT an MRN. Belt-and-suspenders: only emit `Patient.identifier` when `clinicCode !== null` AND `clinicCode` regex-passes the existing `[A-Za-z0-9-]{1,32}` validator (already enforced in store; verify in `exportFhir/patient.ts` as well). `[CITED: hl7.org/fhir/R4/patient.html; hl7.org/fhir/identifier-registry.html]`
**Warning signs:** Bundle imports into Epic and creates a duplicate patient because the EHR matches the tracking code to an existing MRN.

### Pitfall 5: `navigator.canShare()` boot-time probe returns true, but real zip share fails on iOS
**What goes wrong:** The existing `canShareFiles()` probe tests a fake `text/plain` File (`ExportActions.tsx:18`). On iOS, that returns `true` — but a real `application/zip` File later fails the share with an opaque error.
**Why it happens:** iOS Safari's `canShare()` is sometimes optimistic on the abstract capability check; the real determination happens when the share sheet inspects the actual MIME type.
**How to avoid:** Two-stage check. First, the existing boot-time `canShareFiles()` gates the UI affordance. Second, at click time, re-probe with the real zip File via `navigator.canShare({files: [realZipFile]})` — if that returns false, fall through to the download path. The existing PDF handler at `ExportActions.tsx:52` does NOT do this second probe and works because PDF is universally accepted; for zip we should add it.
**Warning signs:** iOS users report "Share button does nothing"; share sheet flashes and disappears.

### Pitfall 6: README RTL handling
**What goes wrong:** Arabic README arrives in the clinician's Mail.app/Outlook reading pane left-aligned, with the 80-char wrap producing visually confusing lines.
**Why it happens:** We're emitting plain text. Plain text has no `dir="rtl"` signal. The reader's text engine decides.
**How to avoid:** Don't try to flip the string ourselves. Plain text RTL is the receiver's responsibility (Mail.app, Outlook, gmail web all auto-detect script direction at paragraph granularity). What we *do* need: ensure each paragraph contains predominantly Arabic glyphs so script auto-detection lands correctly. EHR proper nouns like "Epic, Cerner" sprinkled into RTL paragraphs are fine — they'll get bidi-isolated by the renderer. `[CITED: Unicode UAX #9 bidirectional algorithm; W3C i18n guidance for plain text]`
**Warning signs:** Manual locale spot-check shows Arabic README rendering LTR in test viewers. Usually means the test viewer is wrong, not the file. Cross-check in Mail.app and a real email client.

## Code Examples

### Generating the FHIR Observation for a single void event

```typescript
// src/lib/exportFhir/observations.ts — example
import { LOINC, UCUM, OBS_CATEGORY } from './loinc';
import type { VoidEntry, FhirObservation } from './types';

export function buildVoidObservation(v: VoidEntry, patientId: string): FhirObservation {
  return {
    resourceType: 'Observation',
    id: `void-${v.id}`,
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'activity',
        display: 'Activity',
      }],
    }],
    code: {
      coding: [{
        system: LOINC.SYSTEM,                 // 'http://loinc.org'
        code: LOINC.URINE_OUTPUT_POINT,       // '9187-6'
        display: 'Urine output',
      }],
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: v.timestampIso,        // already ISO 8601 UTC
    valueQuantity: {
      value: v.volumeMl + (v.doubleVoidMl ?? 0),  // combined per IPC method
      unit: 'mL',
      system: UCUM.SYSTEM,                     // 'http://unitsofmeasure.org'
      code: 'mL',
    },
    // Optional: note via Observation.note if v.note is non-empty
  };
}
```

### Generating the Patient resource with year-only birthDate + clinic-code identifier

```typescript
// src/lib/exportFhir/patient.ts — example
import type { DiaryState, FhirPatient } from './types';

export function buildPatient(state: DiaryState): FhirPatient {
  const patient: FhirPatient = {
    resourceType: 'Patient',
    id: 'patient-1',  // local synthetic ID; clinician re-links on upload
  };

  if (state.age !== null) {
    // birthDate is year-only — Safe Harbor compliant
    const year = new Date().getFullYear() - state.age;
    patient.birthDate = String(year);  // "1970", NEVER "1970-05-14"
  }

  if (state.clinicCode !== null && /^[A-Za-z0-9-]{1,32}$/.test(state.clinicCode)) {
    patient.identifier = [{
      use: 'secondary',
      type: {
        coding: [{
          system: 'https://myflowcheck.com/codesystem/identifier-type',
          code: 'TRACKING',
          display: 'Clinic-assigned tracking code, not a medical record identifier',
        }],
      },
      system: 'https://myflowcheck.com/clinic-code',
      value: state.clinicCode,
    }];
  }

  return patient;
}
```

### Bundle assembly

```typescript
// src/lib/exportFhir/index.ts — example
export function generateFhirBundle(state: DiaryState, locale: string): FhirBundle {
  const patient = buildPatient(state);
  const metrics = computeMetrics(state);
  const qr = buildQuestionnaireResponse(state, metrics, locale, patient.id);
  const observations = [
    ...state.voids.map(v => buildVoidObservation(v, patient.id)),
    ...state.drinks.map(d => buildDrinkObservation(d, patient.id)),
    ...state.leaks.map(l => buildLeakObservation(l, patient.id)),
  ];

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [
      { fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource: patient },
      { fullUrl: `urn:uuid:${crypto.randomUUID()}`, resource: qr },
      ...observations.map(o => ({
        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
        resource: o,
      })),
    ],
  };
}
```

## LOINC Code Decision Matrix

> The single most important plan-time decision in this phase. Codes selected wrong → Epic flowsheet doesn't auto-populate → clinician scrambles → phase fails its core promise.

### Urine output (void event) — RECOMMEND **9187-6**

| Code | Display | Property | Time | System | Class | Verdict | Confidence |
|------|---------|----------|------|--------|-------|---------|------------|
| **9187-6** | **Urine output** | **Volume** | **Pt (point in time)** | **Fluid output urine** | **IO_OUTPUT** | **PICK — exact match for "per-event void volume". Maps to Epic I&O flowsheet `[VERIFIED: loinc.org/9187-6 via WebSearch + findacode.com mirror]`** | **HIGH** |
| 9192-6 | Urine output 24 hour | Volume | 24H | Fluid output urine | IO_OUTPUT | WRONG — aggregate, not per-event. Use for QuestionnaireResponse summary metrics, not for Observation events. | HIGH |
| 19153-6 | Volume in Urine collected for unspecified duration | Vol | * | Urine (specimen) | — | WRONG — specimen-collection code. Different class. `[VERIFIED: loinc.org/19153-6 via WebSearch]` | HIGH |
| 9188-4 | Urine output 1 hour | Vol | 1H | Fluid output urine | IO_OUTPUT | WRONG — 1-hour timeframe doesn't match per-event. | HIGH |
| 9197-5 | Urine output --post void | Vol | Pt | Bladder | — | WRONG — post-void residual measurement, not a void event. | HIGH |
| 28009-9 | Volume of Urine | Vol | Pt | Urine (specimen) | — | WRONG — same class confusion as 19153-6. | HIGH |
| 80523-4 | Urine output by Uroflowmetry | Vol | Pt | Urine | — | WRONG — requires instrumented uroflowmetry; this is patient-reported. | HIGH |

**Reasoning:** `9187-6` has Property=Volume, Time=Point in time, Class=IO_OUTPUT — exactly the semantics of a single self-reported void at a moment. Epic's intake/output flowsheet maps from the IO_OUTPUT LOINC class. The CONTEXT.md note ("candidates 19153-6 / 9192-6") gets this wrong — 19153-6 is specimen-class, 9192-6 is 24-hour aggregate. The correct primary code is **9187-6**.

### Fluid intake (drink event) — RECOMMEND **9108-2** at event grain (CAVEAT)

| Code | Display | Time | System | Verdict | Confidence |
|------|---------|------|--------|---------|------------|
| 9108-2 | Fluid intake total 24 hour | 24H | Fluid input | Best available but technically 24H-aggregate. **Use at event grain with a comment in `Observation.note` explaining the per-event interpretation, OR aggregate per day in the QuestionnaireResponse and only emit 3 daily summary Observations for intake.** `[VERIFIED: loinc.org/9108-2 via WebSearch]` | MEDIUM |
| 81951-6 | Fluid intake 24 hour Measured | 24H | Fluid input | Equivalent to 9108-2; "measured" qualifier doesn't help. | MEDIUM |
| 8999-5 | Fluid intake oral Estimated | Pt | Fluid input | **Strong candidate** — Property=Volume, Time=Point in time, *and* "Estimated" qualifier matches patient self-report. `[CITED: findacode.com/loinc/8999-5]` Recommend planner verify this against Epic flowsheet vocabulary; if it maps cleanly, prefer this over 9108-2 at event grain. | MEDIUM |
| 34537-1 | Fluid intake and output panel 8 hour | 8H | — | WRONG — panel resource type, not single observation. | HIGH |

**The 8657-8 from CONTEXT.md does not appear in the LOINC catalog according to our searches.** `[VERIFIED: search returned no result for 8657-8 in loinc.org indexed pages]` The CONTEXT.md guess was wrong. The planner should choose between **8999-5** (point-in-time oral fluid intake estimated — best fit if Epic accepts it) and **9108-2** with a `note` clarifying per-event semantics.

**Recommendation:** Use **8999-5** as primary, fall back to **9108-2** if Epic-side validation rejects 8999-5 in pilot.

### Urinary incontinence event — RECOMMEND **SNOMED CT 162172004** + LOINC 9187-6 valueBoolean

| Code | System | Display | Verdict | Confidence |
|------|--------|---------|---------|------------|
| **SNOMED 162172004** | http://snomed.info/sct | **Urinary incontinence** | **PICK — canonical SNOMED disease/finding code for incontinence event. FHIR R4 explicitly allows `Observation.code` from SNOMED in addition to LOINC.** | HIGH |
| LOINC 28232-7 | http://loinc.org | Total urinary incontinence [CCC] | RUNNER-UP — assessment-level, not event-level (Scale=Ord/Ordinal). Useful in QuestionnaireResponse, not Observation per-event. `[VERIFIED: loinc.org/28232-7 via WebSearch]` | HIGH |
| LOINC 54770-3 | http://loinc.org | Urinary continence in last 7 days [CMS Assessment] | WRONG — CMS MDS assessment, retrospective 7-day timeframe. | HIGH |
| LOINC 28009-9 | http://loinc.org | Volume of Urine | WRONG — specimen volume. | HIGH |

**Recommendation:** Encode each `LeakEntry` as `Observation` with `code = SNOMED 162172004`, `effectiveDateTime` from `timestampIso`, optional `valueCodeableConcept` for the trigger (cough/sneeze/etc — map to SNOMED if straightforward, else free-text in `note`), and `category = "exam"`. Optionally enrich with LOINC 28232-7 as a secondary `coding` inside the same `code.coding[]` array — Epic readers will pick whichever they understand.

### Bedtime / wake time markers — DEFER to QuestionnaireResponse, not Observation

| Code | Display | Verdict | Confidence |
|------|---------|---------|------------|
| LOINC 103215-0 | Wake time after sleep onset | OK for the *duration* between sleep onset and final wake, but not for the moment-in-time markers we collect. | MEDIUM |
| LOINC 80287-6 | Sleep duration | Aggregate, not event. | MEDIUM |

**Recommendation:** Do NOT emit `BedtimeEntry` and `WakeTimeEntry` as separate `Observation` resources. Instead, record them inside the `QuestionnaireResponse` as structured items (`item.linkId = 'bedtime-day-1'`, `answer.valueDateTime = "..."`). This is what `QuestionnaireResponse` is *for* (free-form clinical questionnaire data) — and avoids choosing a LOINC code that doesn't quite fit the event-marker semantics.

### Clinical metrics (24HV, NPi, AVV, MVV, NBC) — DEFER to QuestionnaireResponse

The IPC clinical metrics (`computeMetrics` output) are computed values, not observed values. They belong in the `QuestionnaireResponse` as response items with their numeric answers, NOT as separate `Observation` resources. Rationale:
1. Per FHIR semantics, `Observation` = directly observed measurement; computed metrics aren't observations.
2. EHRs trip on auto-flowsheet-importing computed metrics because they lack provenance.
3. Clinician opens the `QuestionnaireResponse` as a single narrative "patient diary summary" and gets the metric values in context.

The CONTEXT.md's question "Should clinical metrics be Observation resources too rather than QuestionnaireResponse items?" — **answer: keep them in QuestionnaireResponse**. This is the FHIR-canonical answer.

## JSZip vs fflate Decision Matrix

| Criterion | JSZip 3.10.1 | fflate 0.8.3 | Winner |
|-----------|---------------|---------------|--------|
| Gzipped bundle size | ~50KB | ~11KB | fflate (–40KB) |
| API maturity | 10+ yr battle-tested, 13.75M weekly | Newer, smaller community | jszip |
| Last release | ~2022 | ~2023 | tied — both "stable but not active" |
| TypeScript types | Bundled in package (jszip 3.10+) | Bundled | tied |
| Worker support | Sync, blocks main thread | Async with worker offload | fflate |
| Web Streams | Supported (`generateAsync`) | Supported | tied |
| Documentation | Extensive | Adequate | jszip |
| Worked examples for our use case | Abundant on Stack Overflow / GitHub | Sparser | jszip |
| Vendor health | "Sustainable maintenance" per Snyk | Active maintainer | tied |
| Lazy-load mitigates bundle size? | YES — already lazy-imported via `await import('@/lib/exportPackage')` | YES, same | mitigates the size disadvantage |

**Recommendation: JSZip.** The 40KB delta lands on a code path that's already dynamic-imported (only loaded when the patient hits Day 3 export). Maintenance signals for both are similar — both are mature/quiet, not abandoned. JSZip wins on API ergonomics and worked examples; fflate's perf advantage doesn't matter for a one-off zip of ~750KB total. Re-evaluate if and only if bundle-size budget gets tight elsewhere. `[VERIFIED: github.com/101arrowz/fflate README; Snyk + npmjs.com via WebSearch 2026-05-18]`

## Web Share API Support Matrix

> The existing `canShareFiles()` probe at `ExportActions.tsx:13-23` is good but uses a `text/plain` test file. For zip, we need a two-stage probe.

| Browser / OS | `navigator.share` (file) | Zip MIME accepted | Recommended behavior |
|-------------|--------------------------|---------------------|----------------------|
| iOS Safari 17+ | ✅ Yes | ✅ Yes — iOS share sheet treats `.zip` as a generic file, surfaces Mail/Messages/AirDrop/Files | Hero CTA → real `canShare({files: [zipFile]})` probe at click time → share path |
| iOS Chrome (WebKit-based) | ✅ Yes | ✅ Yes | Same as Safari |
| Android Chrome | ✅ Yes | ✅ Yes — Chrome share-target accepts any registered MIME on the OS, `.zip` is registered | Same path |
| Android Firefox | ⚠️ Partial — `share` exists but `canShare({files})` may return false | ⚠️ Unreliable | Fall through to download |
| Desktop Chrome (ChromeOS) | ✅ Yes (ChromeOS) | ✅ Yes | Share path |
| Desktop Chrome (Win/Linux/macOS) | ❌ `canShare({files})` returns false | n/a | Fall through to download |
| Desktop Safari (macOS) | ⚠️ `share` works for text/url, files generally unsupported | ❌ No | Fall through to download |
| Desktop Edge | ⚠️ `share` for text/url, files limited | ❌ Generally no | Fall through to download |
| Desktop Firefox | ❌ Not implemented | n/a | Fall through to download |

**Recommendation:**
1. **Boot probe** (existing pattern at `ExportActions.tsx:18`): test a synthetic File — this gates whether the hero CTA *labels* itself as a "Send" or "Save" action.
2. **Click-time probe** (NEW pattern for zip): immediately before `navigator.share()`, call `navigator.canShare({files: [realZipFile]})`. If it returns false, fall back to download. This catches iOS-specific MIME-mismatch edge cases.
3. **Always handle `AbortError`** (existing pattern at `ExportActions.tsx:67`) — user cancels the share sheet, that's not an error.
4. **Web Share API testing matrix**: per PKG-04, manually verify on iOS Safari, Chrome Android, Edge desktop, Safari desktop, Firefox. Document outcomes in plan SUMMARY.

`[VERIFIED: caniuse.com / MDN via WebSearch; supplemented by ExportActions.tsx existing implementation]`

## FHIR Patient.identifier Decision (clinicCode handling)

The CONTEXT.md explicitly asks: should `clinicCode` go in `Patient.identifier.value` or in `Patient.identifier.system`?

**Answer: `Patient.identifier.value` is the right field.** The `system` is the URI that identifies *which* identifier namespace this code lives in. The `value` is the actual code within that namespace. Per FHIR spec:
- `system`: "Establishes the namespace for the value — that is, a URL that describes a set values that are unique." → use `https://myflowcheck.com/clinic-code`
- `value`: "The portion of the identifier typically relevant to the user and which is unique within the context of the system." → use the actual code string

The CONTEXT.md note ("Verify the clinicCode (if set) flows to Patient.identifier with a system reference, NOT as a Patient.identifier.value PHI leak") conflates two concerns:
1. **System reference**: yes, always set `system` so the code is namespaced (not a free-floating MRN-shaped string).
2. **PHI leak**: NOT about which field; it's about *making sure the value isn't really a PHI code masquerading as a clinic code*. The mitigation is: regex-validate the value (which the URL-param validator already does — `[A-Za-z0-9-]{1,32}`), AND set `Identifier.use = 'secondary'` AND set `Identifier.type.coding` to "TRACKING" — all of which make it clear to the receiving EHR that this is NOT an MRN.

The recommended shape:
```json
{
  "identifier": [{
    "use": "secondary",
    "type": {
      "coding": [{
        "system": "https://myflowcheck.com/codesystem/identifier-type",
        "code": "TRACKING",
        "display": "Clinic-assigned tracking code, not a medical record identifier"
      }]
    },
    "system": "https://myflowcheck.com/clinic-code",
    "value": "IPC-2026"
  }]
}
```

`[CITED: hl7.org/fhir/R4/datatypes.html#Identifier; hl7.org/fhir/identifier-registry.html via WebSearch 2026-05-18]`

## README Locale-Aware Authoring Decision

CONTEXT.md asks: one giant `messages/*.json` key vs template + per-EHR snippets?

**Recommendation: one big key per locale.** Reasoning:

1. **The README is prose, not data.** Templated assembly creates correctness traps — line breaks in the wrong place, capitalization drift across locales, EHR names duplicated and easy to miss-translate.
2. **Existing pipelines handle this.** `i18n-sync` (PostToolUse hook on `messages/en.json` edits) and `naturalize-prose` (per-locale native-speaker editor) both operate at the key granularity. One key = one translation unit = clean fan-out.
3. **80-char wrap is enforced in source.** The EN canonical version is wrapped at 80 chars by hand; the `naturalize-prose` cycle preserves the wrap point per locale (translators are explicitly told the target medium is plain text).
4. **EHR proper nouns stay English by reference.** The string `"Epic"` appears verbatim in all 6 locale READMEs; no template substitution needed.

JSON-with-`\n` storage format:
```json
{
  "exportPackage": {
    "readme": "My Flow Check — 3-Day Bladder Diary\n\nPatient profile: age {age}, {timezone} timezone\nDiary completed: {date}\n\nThis package contains 4 files...\n\n  01-clinical-report.pdf\n     The 7-page clinical PDF...\n..."
  }
}
```

ICU placeholders for the 3 dynamic fields (`{age}`, `{timezone}`, `{date}`) are the only template-ish bits — these are already a standard `next-intl` pattern in the codebase (see `pdfError`, `aboutBoldShort` etc. in `messages/en.json`).

**Arabic (RTL) plain-text confirmation:** Yes, no string-flipping needed. Plain text has no `dir="rtl"` attribute and no markup; the rendering engine (Mail, Outlook, gmail web, notepad, Files preview) auto-detects per-paragraph. We just write Arabic glyphs into the same `\n`-separated string. The pre-wrap (80 chars) operates on visual columns the same way for LTR or RTL — the receiver's text engine handles direction. `[CITED: Unicode UAX #9; W3C i18n on plain text]`

## AJV + FHIR R4 Schema Validation Strategy

**Confirmed: devDependency only, vitest CI only, NOT bundled into the client.**

- **Schema source:** Official FHIR R4 schema at https://hl7.org/fhir/R4/fhir.schema.json.zip — ~3-5MB unpacked.
- **Storage:** Check the schema into the repo at e.g. `test-fixtures/fhir/fhir.schema.json` (gzipped if file-size policy prefers). Git LFS not needed for a 3-5MB file.
- **Validation file:** `src/__tests__/export-fhir.test.ts` uses ajv to validate generated bundles. Per CONTEXT.md FHIR-EX-03, the test asserts:
  1. Valid Bundle passes ajv against the R4 schema.
  2. Intentionally-malformed Bundle (missing required field or wrong cardinality) is rejected by ajv.
  3. Zero-PHI grep assertions pass against the seed-state Patient (regex tests for `"name":`, `"address":`, `"telecom":`, day-precision `birthDate`).
- **Build-time cost:** Compiling the full FHIR schema in ajv takes ~1-3s on first run; subsequent runs benefit from `--cache` if vitest is configured for it.
- **Subset optimization:** If schema compilation is too slow, generate a subset schema covering only `Bundle`, `Patient`, `Observation`, `QuestionnaireResponse` and their transitive references. Use `ajv-cli` or a small Node script. Defer this optimization unless it's measurably needed.

**Why not runtime validation in the browser?**
1. Schema is 3-5MB unpacked — exceeds the 5MB total export size budget by itself.
2. The patient is not the right validator. If they hit Day 3 with a malformed FHIR Bundle, that's a bug in our code, not something for the patient to fix.
3. Runtime ajv requires either codegen-at-build-time OR `unsafe-eval` in CSP — both expensive.

The CONTEXT.md's strategy is correct. `[CITED: ajv.js.org/standalone.html; d4l-data4life/js-fhir-validator README]`

## Existing State Recon (verified against CONTEXT.md assumptions)

| Assumption | Verified? | Notes |
|------------|-----------|-------|
| `generatePdfBlob` exists and returns `{blob, filename}` | ✅ | `src/lib/exportPdf/index.ts:26` — exact signature matches. |
| `generateCsvBlob` exists and returns `{blob, filename}` | ✅ | `src/lib/exportCsv.ts:176` — exact signature matches. |
| `ExportActions.tsx` has 3 buttons (PDF / CSV / Share) + download-alt links | ✅ | `ExportActions.tsx:142-194`. NOTE: the third "Share" button mentioned in CONTEXT.md is actually merged into the PDF button (when `shareSupported` is true, the PDF button labels as "Send to your healthcare team" already — see `pdfLabel` at L137). So the "3 buttons" framing in CONTEXT.md is slightly off; today's reality is more like 2 primary buttons (PDF, CSV), each with a "save to device" alt link. **Planner note:** the reshape should preserve both the share-mode primary CTA AND the explicit save-alt link (the latter is a recently-added pattern per git log "fix(diary): scroll to top on any dayNumber change (covers Continue + Log overnight)" and adjacent commits suggesting the save-alt was added per user feedback). |
| `clinicCode` field on `DiaryState` | ✅ | `types.ts:141` — `clinicCode: string \| null`. URL validator at `LandingContent.tsx:67`. Validated regex confirmed in test `clinic-code-url-validation.test.tsx`. |
| `DiaryState` shape (voids, drinks, leaks, bedtimes, wakeTimes, age, startDate, timeZone) | ✅ | `types.ts:120-148` — matches CONTEXT.md description. |
| jspdf 4.2.0, jspdf-autotable 5.0.7 already installed | ✅ | `package.json:25-26`. |
| `jszip` NOT yet installed | ✅ | `package.json` deps confirmed — no jszip. Net-new install. |
| `ajv` NOT yet installed | ✅ | `package.json` devDeps confirmed — no ajv. Net-new devDependency install. |
| Existing `canShareFiles()` probe pattern | ✅ | `ExportActions.tsx:13-23`. Tests with `text/plain` File — should extend to also test with `application/zip` File at click time. |
| Web Share API + jsPDF dynamic-import pattern already in place | ✅ | `ExportActions.tsx:51` — `await import('@/lib/exportPdf')`. Phase 13 should follow this for `exportPackage`. |
| Export-related i18n strings in `messages/en.json` | ✅ | Section `summary.exportSendPdf` / `exportSavePdf` / `exportSendCsv` / `exportSaveCsv` at messages/en.json:296-299; section `export.generating` / `pdfError` / `csvError` / `noDataYet` at messages/en.json:312-318. Phase 13 will add `summary.exportSendPackage` (hero label) + `summary.exportMoreOptions` (disclosure label) + new `export` keys + `exportPackage.readme` (the big README key). |
| Volume conversion: storage is canonical `volumeMl`, display is `volumeUnit: 'mL' \| 'oz'` | ✅ | `types.ts:67` for `VoidEntry.volumeMl`, `utils.ts:206` for `mlToDisplayVolume`. FHIR must emit canonical mL. Existing CSV at `exportCsv.ts:65-83` already converts to display unit — this is potentially a bug for clinician downstream tools that expect mL. **Planner note:** confirm with user whether FHIR should always emit mL (recommend yes) regardless of `volumeUnit`. CSV behavior is out of Phase 13 scope but worth flagging. |
| `clinicCode` regex `[A-Za-z0-9-]{1,32}` | ✅ | Verified in `clinic-code-url-validation.test.tsx`. Apply same validator in `exportFhir/patient.ts` as a belt-and-suspenders check before emitting the identifier. |

**One inconsistency to flag for the planner:** The "5MB total export size budget" mentioned in CONTEXT.md's Constraints section — verify whether this refers to the zip file size or the bundle-size budget for the client app. The two budgets are different; conflating them affects whether ajv runtime is even on the table (it isn't, but the budget should be stated unambiguously in the plan).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HL7 v2 (pipe-delimited) | FHIR R4 (JSON) | ~2019 production-ready; 2024 USCDI v4 mandate | FHIR R4 is the only modern target. CDA / HL7 v2 are out of scope per CONTEXT.md. |
| Custom EHR-specific exports | Standards-compliant FHIR Bundle | 2020s | "Write once, ingest anywhere" — Epic / Cerner / Allscripts / athenahealth all support FHIR R4. |
| `Patient.identifier.value = MRN` | `Patient.identifier.use='secondary'` + `type.code='TRACKING'` for non-MRN codes | FHIR R4 maturation | Avoids the Epic "duplicate patient" trap from accidentally matching the tracking code to a real MRN. |
| Bundle FHIR validation at runtime | Build-time only | Generally accepted browser practice | 3-5MB schema is too big to ship; build-time validation is sufficient. |
| jszip | jszip (still) — but fflate is a legitimate alternative | fflate matured ~2022-2024 | We pick jszip for ecosystem maturity; fflate viable for size-constrained builds. |

**Deprecated/outdated:**
- HL7 v2 / CDA messaging — fully out of scope for this app.
- Plain CSV-only handoff to clinician — still supported via the demoted "More options" disclosure, but no longer the recommended path.

## Project Constraints (from CLAUDE.md)

- **Static export:** `output: "export"` in `next.config.ts` — Phase 13 must remain browser-side. JSZip runs in the browser ✓.
- **localStorage only:** No server, no cloud. Phase 13 honors this — FHIR Bundle is computed and emitted client-side; never sent to a server.
- **6-locale parity:** README must be translated to en/fr/es/pt/zh/ar. The Stop hook + pre-commit hook enforce article translation coverage; same `messages/*.json` mechanism via `i18n-sync` skill applies to the new `exportPackage.readme` key. RTL handling for Arabic confirmed safe.
- **Tech stack pinned:** Next.js 16 + React 19 + Tailwind 4 + Zustand + next-intl 4. No new framework choices in Phase 13.
- **No em-dashes:** Already absent in existing export copy. Applies to the new README + all new i18n keys.
- **Day-boundary correctness:** Phase 13 doesn't touch `getDayNumber` or `reassignMorningVoid`. FHIR Bundle uses raw `timestampIso` values (UTC, already canonical), not derived `dayNumber` for clinical encoding — though dayNumber can be added as a non-clinical `note` for clinician convenience.
- **TS strict + ESLint clean:** All new modules under `strict` mode; no `as any` allowed.
- **Daily walkthrough must keep passing:** Phase 13 reshape of `<ExportActions>` must not break the existing PDF/CSV download paths. PKG-05 explicitly covers this regression check.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ajv latest 8.x line is the right major version to pin | Standard Stack | Low — switching majors is trivial; ajv 6/7/8 share the validate() API. |
| A2 | Epic flowsheet matches the LOINC `IO_OUTPUT` class for the I&O flowsheet vocabulary | LOINC matrix (`9187-6`) | Medium — if Epic uses a different LOINC class, we'd need to re-pick. Mitigation: clinical pilot validates this before phase ships. The README's "manual checkpoint" success criterion (item 7) covers this. |
| A3 | Epic accepts SNOMED CT `162172004` for incontinence event in addition to LOINC | LOINC matrix (leaks) | Medium — FHIR R4 spec allows mixed coding systems, but some Epic instances are LOINC-only. Mitigation: emit BOTH SNOMED 162172004 AND LOINC 28232-7 in `code.coding[]` array; the EHR picks whichever it understands. |
| A4 | iOS Safari accepts `application/zip` MIME in `navigator.share` with `files` | Web Share API matrix | Low — the existing PDF share already works on iOS via the same mechanism; zip is a more generic file type and is broadly supported. Mitigation: click-time `canShare({files: [realZipFile]})` check + download fallback. |
| A5 | `Patient.identifier.type.coding` with our custom CodeSystem URL won't trip Epic strict validators | FHIR Patient.identifier section | Low-medium — custom CodeSystems are spec-compliant per `hl7.org/fhir/identifier-registry.html`, but very strict validators may warn. Mitigation: the receiving EHR usually warns but accepts; if Epic rejects, fall back to a barebones `system + value` shape and rely on the receiving clinician to interpret. |
| A6 | `crypto.randomUUID()` is available in all target browsers | FHIR Bundle code example | Low — available in iOS 14.5+, all modern Chrome/Firefox/Edge. If we need to support older devices, polyfill with a 4-line UUIDv4 generator. |
| A7 | The CONTEXT.md candidate code `8657-8` for fluid intake does not exist in LOINC | LOINC matrix (fluid intake) | Low — our searches returned no result; CONTEXT.md note appears to be a hallucinated code. Mitigation: use `8999-5` or `9108-2` as documented above. |
| A8 | The "5MB total export size budget" in CONTEXT.md refers to zip size, not bundle size | Existing State Recon | Low — affects how the planner frames the budget in the plan SUMMARY. Clarify with user during plan-check. |
| A9 | FHIR Bundle should emit canonical `mL` regardless of `volumeUnit: 'mL' \| 'oz'` setting | Existing State Recon | Low — UCUM standard is mL; clinician-side parsers expect mL; converting from `oz` for display only happens at the UI layer, not the clinical-payload layer. Recommend planner confirm. |

## Open Questions

1. **Should clinical metrics (24HV, NPi, etc.) be `QuestionnaireResponse` items OR separate `Observation` resources?**
   - What we know: FHIR semantics favor `Observation` for direct measurements and `QuestionnaireResponse` for assessment data. Computed metrics aren't direct measurements.
   - What's unclear: Whether Epic flowsheet automation prefers seeing the metrics as Observations (so they show up next to event-level data) or as QR items (separate "diary summary" section).
   - Recommendation: Default to `QuestionnaireResponse` items (FHIR-canonical), with the planner verifying against the Epic sandbox pilot per success criterion #7.

2. **Hero CTA label copy.**
   - Candidates per CONTEXT.md: "Send to my healthcare team", "Export for clinician", "Share with my doctor".
   - The existing summary label already says "Send to your healthcare team" (`summary.exportSendPdf` at messages/en.json:296). That phrasing is already audited for register and works in EN/FR/ES/PT/ZH/AR.
   - Recommendation: Reuse "Send to your healthcare team" as the hero CTA label (it's the existing PDF button's share label). Don't introduce a new variant. The PDF button inside "More options" becomes "Save the PDF" / "Send the PDF" depending on share support — but it's no longer the hero.

3. **`Observation.encounter` reference — emit or skip?**
   - FHIR `Observation` accepts an optional `encounter` reference to tie to a clinic visit. Patient self-report at home has no encounter to reference.
   - Recommendation: omit. Clinician fills this in on import if they want to tie events to a specific encounter.

4. **Should the README include a clinic-code disclaimer when it's set?**
   - If the patient set `?clinic=NHS-1234567890` thinking it was their MRN, the FHIR Bundle's `Patient.identifier` flags it as TRACKING-not-MRN — but the README is also seen by the clinician. Should the README say "This patient used the clinic-code field on the URL — see Patient.identifier in 03-emr-bundle.fhir.json — but treat this code as a tracking reference, not a medical record number"?
   - Recommendation: Yes, conditional paragraph in the README only when `clinicCode` is non-null. Adds defensive clarity for the clinician.

## Environment Availability

> Phase 13 is code-only with no external runtime services. The only build-time dependency check needed is the npm registry for jszip + ajv installation. **Skipping** this section per phase-researcher conventions (Step 2.6 explicitly notes: skip for code-only changes).

## Validation Architecture

> `nyquist_validation: false` in `.planning/config.json` (line 19). **Skipping** this section per phase-researcher conventions.

## Sources

### Primary (HIGH confidence)
- `package.json` — current dependency versions verified directly from repo.
- `src/lib/exportPdf/index.ts:26` — `generatePdfBlob` signature verified directly.
- `src/lib/exportCsv.ts:176` — `generateCsvBlob` signature verified directly.
- `src/lib/types.ts:120-148` — `DiaryState` shape verified directly.
- `src/components/export/ExportActions.tsx` — existing UI structure verified directly.
- `src/__tests__/clinic-code-url-validation.test.tsx` — clinicCode regex verified directly.
- [HL7 FHIR R4 Observation specification](https://hl7.org/fhir/R4/observation.html)
- [HL7 FHIR R4 Patient specification](https://hl7.org/fhir/R4/patient.html)
- [HL7 FHIR R4 QuestionnaireResponse specification](https://hl7.org/fhir/R4/questionnaireresponse.html)
- [HL7 FHIR R4 Bundle specification](https://build.fhir.org/bundle.html)
- [HL7 FHIR Identifier Registry](https://www.hl7.org/fhir/identifier-registry.html)

### Secondary (MEDIUM confidence — verified via WebSearch)
- [LOINC 9187-6 — Urine output (Point in time)](https://loinc.org/9187-6)
- [LOINC 9192-6 — Urine output 24 hour](https://loinc.org/9192-6)
- [LOINC 19153-6 — Volume in Urine collected for unspecified duration](https://loinc.org/19153-6/)
- [LOINC 28232-7 — Total urinary incontinence](https://loinc.org/28232-7)
- [LOINC 28009-9 — Volume of Urine](https://loinc.org/28009-9)
- [LOINC 9108-2 — Fluid intake total 24 hour](https://loinc.org/9108-2)
- [LOINC 8999-5 — Fluid intake oral Estimated (findacode mirror)](https://www.findacode.com/loinc/8999-5--fluid-intake-oral-est.html)
- [LOINC 34537-1 — Fluid intake and output panel 8 hour](https://loinc.org/34537-1/)
- [JSZip official site + changelog](https://stuk.github.io/jszip/) — confirmed v3.10.1, sustainable maintenance per Snyk.
- [fflate GitHub repository](https://github.com/101arrowz/fflate) — confirmed v0.8.3, ~11kB gzipped including ZIP.
- [npm: jszip](https://www.npmjs.com/package/jszip) — 13.75M weekly downloads.
- [Snyk security: jszip](https://security.snyk.io/package/npm/jszip) — sustainability assessment.
- [Web Share API spec (W3C)](https://w3c.github.io/web-share/)
- [MDN: Navigator.canShare()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare)
- [web.dev — Integrate with the OS sharing UI with the Web Share API](https://web.dev/articles/web-share)
- [Can I use — Web Share API support tables](https://caniuse.com/web-share)
- [Can I use — `navigator.canShare data.files` parameter](https://caniuse.com/mdn-api_navigator_canshare_data_files_parameter)
- [Ajv standalone validation code generation](https://ajv.js.org/standalone.html)
- [Ajv TypeScript guide](https://ajv.js.org/guide/typescript.html)
- [d4l-data4life FHIR validator (bundle-size analysis)](https://www.d4l.io/blog/fhir-resource-validation-for-fun-and-nonprofit/)

### Tertiary (LOW confidence — single source, flagged for validation)
- Epic flowsheet's exact LOINC-class-matching behavior (`IO_OUTPUT` → I&O flowsheet) — inferred from LOINC class definitions + clinical-practice convention; not verified against a live Epic sandbox in this research session. Mitigation: phase success criterion #7 already mandates this verification before phase signoff.

## Metadata

**Confidence breakdown:**
- LOINC code selection: HIGH — multiple LOINC catalogue entries confirmed via web search; class semantics clear.
- FHIR Bundle shape: HIGH — official HL7 R4 spec is the single source of truth and is unambiguous on the Bundle/Patient/QuestionnaireResponse/Observation pattern.
- Patient.identifier shape: HIGH — direct quote from FHIR R4 spec on `system` vs `value` semantics; `Identifier.use = 'secondary'` and custom `type.coding` are spec-compliant.
- JSZip vs fflate: HIGH — both libraries' READMEs and registry stats confirm characteristics; recommendation defends the trade.
- Web Share API zip support: MEDIUM — spec-level support is clear; per-OS behavior for specific MIME types is empirical and best handled by the two-stage probe pattern.
- AJV strategy: HIGH — confirmed via ajv docs, d4l engineering writeup, and common practice.
- README locale strategy: HIGH — confirmed via existing project i18n patterns (`i18n-sync` + `naturalize-prose` skill setup).
- Existing codebase state: HIGH — verified directly from source files in this session.

**Research date:** 2026-05-18
**Valid until:** 2026-08-18 (FHIR R4 is stable; LOINC catalog is stable; jszip/fflate maintenance is stable; Web Share API per-browser support changes infrequently)
