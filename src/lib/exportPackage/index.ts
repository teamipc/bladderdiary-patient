// Package zip composer.
//
// generatePackageBlob(state, locale, t) returns a Blob containing
// the 4-file clinician package per PKG-02:
//   01-clinical-report.pdf       (from exportPdf)
//   02-events.csv                (from exportCsv)
//   03-emr-bundle.fhir.json      (from exportFhir, JSON.stringified)
//   README.txt                   (built by buildReadme inside this module)
//
// jszip is dynamic-imported at first call so the ~50KB library lands as
// a separate chunk, only loaded when the patient hits Day 3 export.
//
// README composition: the caller passes the pre-resolved next-intl `t`
// translator (bound to the `exportPackage.readme` namespace). This module
// invokes buildReadme(state, locale, t) to produce the plain-text README.
// The package layer therefore depends only on the translator interface,
// not on next-intl itself.
//
// Backward compatibility (PKG-05): this module does NOT modify
// generatePdfBlob, generateCsvBlob, generateFhirBundle, or any existing
// export path. The PDF/CSV blobs are byte-identical to the standalone
// exports; only the in-zip filenames differ per the clinician-sort-order
// convention.

import { generatePdfBlob } from '../exportPdf';
import { generateCsvBlob } from '../exportCsv';
import { generateFhirBundle } from '../exportFhir';
import type { DiaryState } from '../types';
import { buildReadme, type ReadmeTranslator } from './readme';

/** Re-export the README composer + translator type for direct consumer use. */
export { buildReadme } from './readme';
export type { ReadmeTranslator } from './readme';

/**
 * Compose the 4-file clinician package as a single zip Blob.
 *
 * @param state  DiaryState. Read for PDF/CSV/FHIR/README composition.
 * @param locale Locale code passed through to PDF generation (PDF is the only
 *               locale-aware artifact apart from the README) and to buildReadme.
 * @param t      Translation function bound to the `exportPackage.readme`
 *               namespace. Resolved by the calling component via
 *               `useTranslations('exportPackage.readme')`.
 */
export async function generatePackageBlob(
  state: DiaryState,
  locale: string = 'en',
  t: ReadmeTranslator,
): Promise<{ blob: Blob; filename: string }> {
  // Dynamic-import jszip per D-02. Keeps the ~50KB library out of the static
  // module graph; lands as a separate sub-chunk even within the already-lazy
  // exportPackage chunk.
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default;
  const zip = new JSZip();

  // Reuse existing generators. PDF is async (jsPDF + jspdf-autotable take
  // ~1-2s on mobile). CSV is sync. FHIR is sync.
  const [pdfResult] = await Promise.all([generatePdfBlob(state, locale)]);
  const csvResult = generateCsvBlob(state);
  const bundle = generateFhirBundle(state);
  const bundleJson = JSON.stringify(bundle, null, 2);
  const readmeText = buildReadme(state, locale, t);

  // Zip filenames per PKG-02. Clinician-sort-order, NOT the standalone
  // filenames. generatePdfBlob returns filename = 'my-flow-check-<date>.pdf';
  // we discard the .filename field and rename to '01-clinical-report.pdf'
  // inside the zip. Same for CSV.
  zip.file('01-clinical-report.pdf', pdfResult.blob);
  zip.file('02-events.csv', csvResult.blob);
  zip.file('03-emr-bundle.fhir.json', bundleJson);
  zip.file('README.txt', readmeText);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
  });

  return {
    blob,
    filename: `myflowcheck-${state.startDate}.zip`,
  };
}

/**
 * Trigger a browser download of the package zip.
 *
 * Used as the desktop fallback when navigator.share is unavailable.
 * Mirrors the generatePdf download pattern from src/lib/exportPdf/index.ts:71-87
 * exactly. 500ms cleanup timeout, link.style.display = 'none', document.body
 * appendChild + removeChild.
 */
export async function downloadPackage(
  state: DiaryState,
  locale: string = 'en',
  t: ReadmeTranslator,
): Promise<void> {
  const { blob, filename } = await generatePackageBlob(state, locale, t);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup after a short delay.
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 500);
}
