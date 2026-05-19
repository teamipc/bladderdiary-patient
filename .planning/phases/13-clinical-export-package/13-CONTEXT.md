# Phase 13 — Clinical Export Package (PDF + CSV + FHIR + README) · CONTEXT

**Milestone:** Clinical Polish + Interop (Milestone 4)
**Started:** 2026-05-18 (scaffolded)
**Revised:** 2026-05-18 (reframed from "add FHIR button" → "clinical export package")
**Status:** Awaiting M3 close-out, then ready to plan
**Depends on:** Nothing (independent of M3 work; touches new module `src/lib/exportPackage/` + UI reshape of `<ExportActions>`)

---

## Why this phase exists

The patient finishes a 3-day diary. Today they hit Export and see three separate buttons (CSV, PDF, Share). The clinician on the other end gets one or two of those files — usually the PDF — and the rest of the workflow (Excel-friendly analysis, EHR ingestion) is left to the clinician to figure out. Different clinicians use different systems (Epic, Prompt, Cerner, Allscripts, paper), each of which prefers a different file format. The patient has to know which one their clinician wants.

**The user's framing (correct):** "when the patient sends to health care team it should be a package include pdf csv and emr ingestable files so that way they don't need to scramble around."

Right product shape: **the patient hits one button — "Send to my healthcare team" — and gets a single zip the clinician can drop into whatever system they use, with a README telling them which file is which.**

This subsumes the original "add a FHIR button" framing — FHIR becomes one component of a package, not a standalone deliverable. It also gives us the future-compatibility story for Prompt (their FHIR support is coming) and Cerner / Allscripts / athenahealth (already FHIR-capable) without writing per-EHR code.

---

## Goal

> A patient completes a 3-day diary, taps "Send to healthcare team", and the share sheet offers a single zip (`myflowcheck-<date>.zip`) containing PDF + CSV + FHIR R4 Bundle + a README with EHR-specific upload instructions. The clinician on the other end opens the zip, picks the file that matches their EHR (PDF for Prompt / paper; CSV for Excel analysis; FHIR for Epic / Cerner / Allscripts; README for "what do I do with this"), and finishes their workflow without scrambling.

---

## Requirements (added to REQUIREMENTS.md as PKG-* + FHIR-EX-*)

### Package surface (Phase 13's primary product)

- **PKG-01** — Hero action: `<ExportActions>` gets a primary "Send to healthcare team" button that generates a single zip. Existing individual CSV / PDF / Share buttons demote to a "More options" disclosure (still accessible for power users / fallback paths).
- **PKG-02** — Zip contents: 4 files, named for clinician-friendly sort order: `01-clinical-report.pdf`, `02-events.csv`, `03-emr-bundle.fhir.json`, `README.txt`.
- **PKG-03** — README.txt explains each file in plain English + gives EHR-specific upload instructions (Epic, Prompt, Cerner, Allscripts, athenahealth + "other / paper"). Locale-aware (translated to all 6 locales).
- **PKG-04** — Web Share API integration: tapping the hero button on mobile triggers the system share sheet with the zip as the payload, so Mail / Messages / Doximity / AirDrop all surface as recipients. Desktop fallback: regular download.
- **PKG-05** — Backward compatibility: individual CSV / PDF / Share buttons still work (demoted UI, same generators). No behavioral regression for users who prefer file-at-a-time.

### FHIR Bundle component (one file inside the zip)

- **FHIR-EX-01** — Each `VoidEntry`, `DrinkEntry`, `LeakEntry` encoded as a FHIR R4 `Observation` resource with appropriate LOINC code (urine output, fluid intake, urinary incontinence event), valueQuantity in mL with UCUM unit code, effectiveDateTime from `timestampIso`, subject referencing the contained Patient.
- **FHIR-EX-02** — Wrap in FHIR R4 `Bundle` (type `collection`) with a skeletal `Patient` (age + tz only, NO PHI) and a `QuestionnaireResponse` resource documenting the IPC diary structure with clinical-metrics references (24HV, NPi, AVV, MVV, NBC).
- **FHIR-EX-03** — Output validates against FHIR R4 schema via `ajv` in vitest CI; zero-PHI privacy audit confirms no `name`, no day-precision `birthDate`, no `address`, no `telecom`, no identifiable extension fields.

---

## Success Criteria (from ROADMAP.md, to be updated)

1. `<ExportActions>` renders a primary "Send to healthcare team" button (locale-aware copy) above a "More options" disclosure with the existing CSV / PDF / Share buttons. Clicking the primary button generates `myflowcheck-<date>.zip` (client-side, no server).
2. The zip contains exactly 4 files: `01-clinical-report.pdf` (existing PDF byte-identical to the current standalone PDF export), `02-events.csv` (existing CSV byte-identical), `03-emr-bundle.fhir.json` (new FHIR R4 Bundle per FHIR-EX-*), `README.txt` (new, locale-aware).
3. Web Share API: on mobile, tapping the hero button surfaces the zip in the system share sheet — Mail, Messages, Doximity, AirDrop all work as recipients. Desktop: triggers a regular `.zip` download via the same path used for PDF/CSV today.
4. README.txt content per locale: opens with what the package is, lists the 4 files with one-line descriptions, gives EHR-specific upload instructions for Epic / Prompt / Cerner / Allscripts / athenahealth / "other or paper", closes with a support link. Plain text, fax-friendly, 80-char wrapped.
5. The FHIR Bundle inside validates against FHIR R4 schema; zero PHI in the `Patient` resource; LOINC codes resolve; UCUM units for all `valueQuantity`.
6. Individual CSV / PDF / Share buttons still functional (no regression on the current export paths).
7. (Manual checkpoint) A clinician test-uploads the FHIR file into an Epic sandbox and sees events in the patient's flowsheet without manual data entry. User responsibility — Epic sandbox access not provided by this app.

---

## What the README says (draft — planner finalizes per-locale)

```
My Flow Check — 3-Day Bladder Diary

Patient profile: age 55, Asia/Singapore timezone
Diary completed: 2026-05-18

This package contains 4 files for your records. Pick whichever matches
your workflow — they all carry the same patient-reported data.

  01-clinical-report.pdf
     The 7-page clinical PDF with patient timeline, IPC clinical metrics
     (24HV, NPi, AVV, MVV, NBC), event scatter plots, and clinical
     observations. Read this first.

  02-events.csv
     Raw event data in spreadsheet format. Open in Excel or Google Sheets
     if you want to manipulate the data manually or build custom analyses.

  03-emr-bundle.fhir.json
     FHIR R4 Bundle for direct upload into your EHR.
       Epic: Patient Chart -> Documents -> Upload -> select this file.
             Observation resources map to the I&O flowsheet automatically.
       Cerner / Allscripts / athenahealth: similar "Upload Document" or
             "Import FHIR" affordance in the patient chart.
       Prompt Health: FHIR import not yet supported (as of early 2026).
             Attach the PDF (file 01) to the patient chart instead.
       Other EHR / paper: try FHIR import if your system supports it.
             Otherwise use the PDF.

  README.txt
     This file.

Questions about what's in the diary or how to read the metrics?
See https://myflowcheck.com/learn/for-clinicians (TBD content workstream).
```

Locale-aware: the entire file is translated. EHR names stay English (Epic, Prompt, Cerner — proper nouns) but the body prose mirrors `messages/*.json` register conventions.

---

## Technical context

### Architecture

New module `src/lib/exportPackage/`:
- `index.ts` — `generatePackageBlob(state, locale): Promise<{blob, filename}>` returns the zip.
- `readme.ts` — `buildReadme(state, locale): string` — composes the README per locale.
- New dependency: `jszip` (~30KB gzipped, mature library, widely-used in browser zip generation).

`<ExportActions>` reshape:
- Primary CTA: "Send to healthcare team" — calls `generatePackageBlob` + `navigator.share` (or download fallback).
- Below: collapsed "More options" disclosure with the existing CSV / PDF / Share buttons.
- Mobile-first sizing; existing visual hierarchy preserved on the primary CTA.

`src/lib/exportFhir/` — new module per the original Phase 13 plan:
- `index.ts`, `patient.ts`, `observations.ts`, `questionnaireResponse.ts`, `validate.ts`, `loinc.ts`, `types.ts`.
- Builds the FHIR JSON string that `exportPackage` then bundles into the zip.

### Static export compatibility

Everything happens client-side at export time. No server, no Epic credentials, no App Orchard registration, no BAA. `jszip` runs in the browser (uses Web Streams API). Web Share API gracefully degrades to download on browsers without share support.

### FHIR R4 resource shapes (unchanged from original Phase 13 plan)

`Bundle` wraps `Patient` (skeletal) + `QuestionnaireResponse` (IPC diary structure with clinical metrics) + N `Observation` resources. LOINC codes for events (candidates 19153-6 / 9192-6 urine volume; 8657-8 fluid intake; SNOMED 162172004 incontinence — planner verifies at plan time). UCUM units for all valueQuantity. Patient resource: birthDate fuzzed to year only, no name/MRN/DOB-precision-to-day/address/telecom.

---

## What's explicitly out of scope

- **SMART on FHIR launch** — clinician opens our app from inside Epic with patient context. Requires App Orchard registration (months) + OAuth server. Tier-2; never in this phase.
- **Direct Epic FHIR write-back** — our app POSTs Observations into Epic via FHIR API. Requires Epic credentials, BAA, per-site enablement. Tier-3; never in this app.
- **EHR-specific tailored bundles** — Cerner-flavored vs Epic-flavored vs Allscripts-flavored FHIR variants. We target Epic-compatible-and-R4-standards-compliant. If a specific EHR breaks, we document the workaround in README; we don't fork the export.
- **Prompt Health direct integration** — Prompt's API is clinic-side (OAuth + clinic credentials). Patient app can't push to Prompt without clinician auth. Out of scope.
- **PHI in the Bundle** — no names, MRN, DOB-precision-to-day, addresses, phone. Birthdate fuzzed to year. Clinician fills in real PHI when they upload into their EHR.
- **CDA / HL7 v2** — older standards. FHIR R4 only.
- **DICOM** — not applicable (we don't produce images).
- **A clinician portal** — a separate website where clinicians see their patients' diaries. That's a Tier-2 product, not this phase.

---

## Constraints

- **Static export only.** Everything must happen browser-side. No SSR, no API calls to external validators.
- **Bundle size budget.** Aim for < 1 MB total zip for a typical 3-day diary. PDF ~500 KB + CSV ~30 KB + FHIR JSON ~200 KB + README ~5 KB + zip overhead = ~750 KB. Within budget.
- **No PHI ever.** Audit every field. Birthdate fuzzed to year.
- **6-locale parity.** README content is locale-aware (translated). FHIR JSON itself is locale-neutral (clinical terminology stays English per Epic/Cerner expectations).
- **TS strict + ESLint clean.**
- **No em-dashes** in any string field.
- **Web Share API graceful fallback.** Desktop browsers (no share API) fall back to direct download. iOS Safari, Chrome on Android, Edge — all supported.
- **Compatibility with the existing 5MB total export size budget.**
- **README is plain text, not HTML.** Fax-friendly, EHR-friendly, 80-char wrapped.

---

## Key planning questions to surface (for gsd-planner)

1. **`jszip` vs alternatives.** Plan-time decision. `jszip` is the de facto. Alternatives: `fflate` (smaller, faster, less popular). Recommend `jszip` for ecosystem maturity unless bundle-size constraint forces `fflate`.

2. **`<ExportActions>` UI hierarchy.** Hero CTA above; "More options" below. Disclosed by default or collapsed? Recommend collapsed by default — keeps the page clean, the hero CTA is what 95% of patients should use. Power users (clinicians testing the app) open the disclosure.

3. **README authoring.** EN first as canonical, then `article-translate` / `naturalize-prose` skill cycles for fr / es / pt / zh / ar. The README references EHR proper nouns (Epic, Cerner, Prompt) which stay English across all locales — register stays formal-clinical.

4. **LOINC code selection.** Same as original Phase 13 — research at plan time. Pick Epic-flowsheet-compatible codes.

5. **FHIR Patient resource scope.** Same as original — birthdate fuzzed to year, no PHI. Verify the `clinicCode` (if set) flows to `Patient.identifier` with a system reference, NOT as a `Patient.identifier.value` PHI leak.

6. **Validation strategy.** `ajv` + FHIR R4 core JSON schema. Vitest CI suite generates a synthetic Bundle and validates. Negative case: intentionally-malformed Bundle rejected.

7. **Plan splitting.** Recommend 5 plans:
   - **13-01:** FHIR generator core — types, Bundle assembler, Patient + Observation builders, LOINC code registry.
   - **13-02:** FHIR generator — QuestionnaireResponse + clinical metrics encoding + validation suite.
   - **13-03:** Package zip generator + README authoring (EN canonical + 5-locale translations).
   - **13-04:** `<ExportActions>` UI reshape — hero CTA + "More options" disclosure + Web Share API integration + responsive behavior.
   - **13-05:** Verification — vitest + Playwright spec covering hero CTA flow / zip contents / share-sheet behavior + Epic-sandbox manual checkpoint.

8. **Filename + copy.** Default: `myflowcheck-<YYYY-MM-DD>.zip`. Hero button label TBD per UX-philosophy doc — candidates: "Send to my healthcare team", "Export for clinician", "Share with my doctor". `naturalize-prose` cycles to confirm register per locale.

9. **Web Share API testing.** Browser support varies; verify on iOS Safari, Chrome Android, Edge desktop, Safari desktop. Document fallback behavior per browser in the test matrix.

10. **CSV/PDF inclusion in zip — generate fresh or reuse cached?** Generate fresh inside `generatePackageBlob` to keep things simple (no cache invalidation logic). Cost: re-runs PDF generation (~1-2s on mobile). If too slow, plan-time cache flag.

---

## Related artifacts

- `src/lib/exportPdf/` — pattern to mirror for `exportFhir/` + the PDF generator the package consumes
- `src/lib/exportCsv.ts` — CSV generator the package consumes
- `src/components/export/ExportActions.tsx` — UI extension site (hero CTA + More options reshape)
- `src/lib/calculations.ts` — `computeMetrics` for FHIR `QuestionnaireResponse` clinical metrics
- `e2e/helpers/fixtures.ts` — `buildSeedState` for test data
- `docs/TIME_MODEL.md` — canonical time-model reference (FHIR uses ISO 8601 UTC)
- Memory `project_localstorage_by_design.md` — privacy invariant the package + FHIR must preserve
- Memory `ipc-calculations.md` — clinical metric definitions for the QuestionnaireResponse
- External (planner research only): FHIR R4 spec at `https://hl7.org/fhir/R4/`, LOINC code search at `https://loinc.org`
