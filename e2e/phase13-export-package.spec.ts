// Phase 13 Clinical Export Package verification spec.
//
// Asserts all 8 Phase 13 requirements (PKG-01..05 + FHIR-EX-01..03) against
// a LOCAL static-export build served at http://localhost:4173.
//
// Test counts (approximate):
//   PKG-01 Hero CTA + disclosure:        6 locales = 6 tests
//   PKG-02 + PKG-03 Zip + README:        6 locales = 6 tests
//   PKG-04 Web Share (mocked + fallback): 2 tests
//   PKG-05 Backward compat:               3 tests
//   FHIR-EX-01 Per-event Observations:    1 test
//   FHIR-EX-02 Bundle + Patient + QR:     1 test
//   FHIR-EX-03 AJV + PHI audit:           2 tests
//   Prior-phase regression smoke:         2 tests
//   TOTAL: ~23 tests
//
// Invocation:
//   npm run build
//   npx --yes serve out -l 4173 &
//   sleep 2
//   PW_TEST_MATCH='phase13-export-package\.spec\.ts' \
//     npx playwright test e2e/phase13-export-package.spec.ts
//   pkill -f "serve out -l 4173" || true
//
// The PW_TEST_MATCH env var is REQUIRED. The default testMatch in
// playwright.config.ts is /(walkthrough|deep-flow|a11y)\.spec\.ts/ which
// excludes this file. Per the Phase 5-07 + Phase 12-04 lesson:
// --grep filters test TITLES not file paths; --test-match (via env var)
// is the supported override path for one-off verification specs.
//
// Discoverability self-check:
//   PW_TEST_MATCH='phase13-export-package\.spec\.ts' \
//     npx playwright test e2e/phase13-export-package.spec.ts --list

import { test, expect, type Page } from '@playwright/test';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import JSZip from 'jszip';
import { mkdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSeedState, STORE_KEY } from './helpers/fixtures';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

const BASE_URL = process.env.PHASE13_BASE_URL ?? 'http://localhost:4173';
const SCREENSHOT_DIR = resolve('test-results/phase13-export-package');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const OUT_DIR = resolve(process.cwd(), 'out');
const FHIR_SCHEMA_PATH = resolve(
  process.cwd(),
  'test-fixtures',
  'fhir',
  'fhir.schema.json',
);
const DRAFT_06_META_PATH = resolve(
  process.cwd(),
  'node_modules',
  'ajv',
  'dist',
  'refs',
  'json-schema-draft-06.json',
);

// next-intl localePrefix: 'as-needed' for nav URLs. EN is at bare path; the
// 5 others are prefixed. Mirrors phase12-seo.spec.ts:localePath.
function localePath(locale: Locale, path: string): string {
  if (locale === 'en') return path;
  return `/${locale}${path}`;
}

// ---------------------------------------------------------------------------
// Localized labels (read from messages/<locale>.json, locked at execution time)
// ---------------------------------------------------------------------------

// Hero CTA label depends on shareSupported probe at component mount:
//   shareSupported -> ts('exportSendPdf')   "Send to your healthcare team"
//   !shareSupported -> ts('exportSavePackage') "Save your healthcare team package"
// The spec runs in headless Chromium where navigator.share is undefined by
// default; the rendered label is exportSavePackage UNLESS we mock the share
// API via addInitScript BEFORE page load. Two label tables, one per branch.

const HERO_LABEL_SHARE: Record<Locale, string> = {
  en: 'Send to your healthcare team',
  fr: 'Envoyer à votre équipe soignante',
  es: 'Enviar a su equipo médico',
  pt: 'Enviar à equipa de saúde',
  zh: '发给你的医疗团队',
  ar: 'إرسال إلى فريق الرعاية الصحية',
};

const HERO_LABEL_SAVE: Record<Locale, string> = {
  en: 'Save your healthcare team package',
  fr: "Enregistrer votre dossier pour l'équipe soignante",
  es: 'Guardar su paquete para el equipo médico',
  pt: 'Guardar o teu pacote para a equipa de saúde',
  zh: '保存给医疗团队的资料包',
  ar: 'احفظ حزمتك للفريق الطبي',
};

const MORE_OPTIONS_LABEL: Record<Locale, string> = {
  en: 'More options',
  fr: "Plus d'options",
  es: 'Más opciones',
  pt: 'Mais opções',
  zh: '更多选项',
  ar: 'خيارات إضافية',
};

const SAVE_PDF_LABEL: Record<Locale, string> = {
  en: 'Save the PDF for me',
  fr: 'Garder une copie du PDF',
  es: 'Guardar el PDF',
  pt: 'Guardar uma cópia em PDF',
  zh: '把 PDF 留给我',
  ar: 'احفظ ملف PDF لي',
};

const SAVE_CSV_LABEL: Record<Locale, string> = {
  en: 'Save the spreadsheet',
  fr: 'Garder le tableur',
  es: 'Guardar la hoja de cálculo',
  pt: 'Guardar a folha de cálculo',
  zh: '保存表格',
  ar: 'حفظ جدول البيانات',
};

// README locale-specific patient-profile substring per the EN template
// (messages/<locale>.json:exportPackage.readme.patientLine). Verified
// against the live message files at spec authoring time.
const README_PATIENT_LINE_TERM: Record<Locale, string> = {
  en: 'Patient profile',
  fr: 'Profil du patient',
  es: 'Perfil del paciente',
  pt: 'Perfil do paciente',
  zh: '患者档案',
  ar: 'ملف المريض',
};

// Helper: build the regex that matches EITHER hero label (share OR save) for
// a locale. The hero text changes based on the page-mount shareSupported
// probe; this regex tolerates either rendering so the same selector works
// whether or not the test mocks navigator.share before navigation.
function heroLabelRegex(locale: Locale): RegExp {
  const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `${escape(HERO_LABEL_SHARE[locale])}|${escape(HERO_LABEL_SAVE[locale])}`,
  );
}

// ---------------------------------------------------------------------------
// AJV setup at module scope (compile once, reuse across tests)
//
// Mirrors src/lib/exportFhir/validate.ts EXACTLY:
//   1. Register the draft-06 meta-schema (FHIR R4 declares draft-06).
//   2. Rename root-level `id` to `$id` (AJV 8.x speaks draft-07+ key names).
// These two steps are required; a stock `new Ajv()` rejects the FHIR schema
// with "no schema with key or ref 'http://json-schema.org/draft-06/schema#'".
// ---------------------------------------------------------------------------

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const rawSchema = JSON.parse(readFileSync(FHIR_SCHEMA_PATH, 'utf8')) as Record<
  string,
  unknown
>;
const draft06Meta = JSON.parse(readFileSync(DRAFT_06_META_PATH, 'utf8')) as Record<
  string,
  unknown
>;
ajv.addMetaSchema(draft06Meta);
const fhirSchema: Record<string, unknown> = { ...rawSchema };
if (typeof fhirSchema.id === 'string' && fhirSchema.$id === undefined) {
  fhirSchema.$id = fhirSchema.id;
  delete fhirSchema.id;
}
ajv.addSchema(fhirSchema, 'fhir-r4');
const validateBundle: ValidateFunction = ajv.compile({
  $ref: 'fhir-r4#/definitions/Bundle',
});

// ---------------------------------------------------------------------------
// Page-context helpers
// ---------------------------------------------------------------------------

// Seed the Zustand persist envelope into localStorage BEFORE page JS runs.
// Mirrors phase10-clinical-record-integrity.spec.ts:seedStore. The
// addInitScript callback runs in the page context; pass the JSON-stringified
// envelope as a serializable arg to avoid the cross-context unstructured
// clone error on Date instances.
async function seedDiary(page: Page): Promise<void> {
  const envelope = buildSeedState();
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // sandbox may deny localStorage; ignore (page will render empty state).
      }
    },
    { key: STORE_KEY, value: JSON.stringify(envelope) },
  );
}

// Share-mock script: records every navigator.share + navigator.canShare call,
// also reads the first file's bytes back into __capturedZipBytes so the
// test can introspect the zip without intercepting a download event.
//
// Pattern from 13-05 PLAN D-05, extended to capture File bytes inline.
// Defined as a string so addInitScript can inject it pre-load; defining as
// a function and using addInitScript(fn) leaks closure references that the
// serializer cannot clone.
const SHARE_MOCK_WITH_BYTES = `
(function() {
  window.__shareCalls = [];
  window.__canShareCalls = [];
  window.__capturedZipBytes = null;
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: function(data) {
      window.__canShareCalls.push({
        filesPresent: !!(data && data.files && data.files.length),
      });
      // Always-true so the ExportActions stage-1 + stage-2 probes both pass.
      return !!(data && Array.isArray(data.files) && data.files.length > 0);
    },
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async function(data) {
      var f = data && data.files && data.files[0];
      window.__shareCalls.push({
        filesCount: (data && data.files && data.files.length) || 0,
        firstFileType: (f && f.type) || '',
        firstFileName: (f && f.name) || '',
        firstFileSize: (f && f.size) || 0,
      });
      if (f && typeof f.arrayBuffer === 'function') {
        var buf = await f.arrayBuffer();
        window.__capturedZipBytes = Array.from(new Uint8Array(buf));
      }
    },
  });
})();
`;

// Stage-1-true + stage-2-false: canShare returns FALSE so ExportActions
// falls through to the download path. share() throws if called (it must NOT
// be reached on this codepath per RESEARCH section Pitfall 5).
const SHARE_MOCK_FALLBACK = `
(function() {
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: function() { return false; },
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: function() {
      throw new Error('navigator.share must not be called when canShare returns false');
    },
  });
})();
`;

interface ShareCallRecord {
  filesCount: number;
  firstFileType: string;
  firstFileName: string;
  firstFileSize: number;
}

interface CapturedZipResult {
  zip: JSZip;
  shareCalls: ShareCallRecord[];
}

// Run the share-mock + click flow and return the JSZip handle plus the
// recorded share() calls. Centralizes the boilerplate so PKG-02 / PKG-03 /
// FHIR-EX-01 / FHIR-EX-02 / FHIR-EX-03 tests can reuse a single capture.
async function captureZipViaShareMock(
  page: Page,
  locale: Locale = 'en',
): Promise<CapturedZipResult> {
  await seedDiary(page);
  await page.addInitScript(SHARE_MOCK_WITH_BYTES);
  await page.goto(`${BASE_URL}${localePath(locale, '/summary')}`, {
    waitUntil: 'domcontentloaded',
  });
  // Hero is rendered with share-label because mock installs navigator.share
  // before mount. Use the regex form so a locale-natural variation still hits.
  const hero = page
    .locator('button')
    .filter({ hasText: heroLabelRegex(locale) })
    .first();
  await hero.waitFor({ state: 'visible', timeout: 8_000 });
  await hero.click({ timeout: 3_000 });
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __capturedZipBytes?: number[] | null };
      return Array.isArray(w.__capturedZipBytes) && w.__capturedZipBytes.length > 0;
    },
    null,
    { timeout: 15_000 },
  );
  const bytesArray = (await page.evaluate(
    () => (window as unknown as { __capturedZipBytes?: number[] }).__capturedZipBytes,
  )) as number[];
  const shareCalls = (await page.evaluate(
    () => (window as unknown as { __shareCalls?: ShareCallRecord[] }).__shareCalls,
  )) as ShareCallRecord[];
  const zipBuf = Buffer.from(bytesArray);
  const zip = await JSZip.loadAsync(zipBuf);
  return { zip, shareCalls };
}

// ---------------------------------------------------------------------------
// Per-spec viewport + baseURL (desktop chromium under the verification project)
// ---------------------------------------------------------------------------

test.use({
  baseURL: BASE_URL,
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});

// ---------------------------------------------------------------------------
// PKG-01 Hero CTA renders + 'More options' disclosure present
// ---------------------------------------------------------------------------

test.describe('PKG-01 Hero CTA + disclosure', () => {
  for (const locale of LOCALES) {
    test(`${locale}: hero CTA renders and 'More options' disclosure is visible when diary is seeded`, async ({
      page,
    }) => {
      await seedDiary(page);
      const url = `${BASE_URL}${localePath(locale, '/summary')}`;
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `summary page ${url} status`).toBe(200);

      // Hero CTA: match either share-supported or save-package label per
      // headless Chromium's lack of navigator.share. Both are valid renderings.
      const hero = page
        .locator('button')
        .filter({ hasText: heroLabelRegex(locale) })
        .first();
      await expect(
        hero,
        `PKG-01 (owner: 13-04): hero CTA visible at ${url} for locale ${locale}`,
      ).toBeVisible({ timeout: 8_000 });

      // 'More options' disclosure summary present below the hero.
      const moreOptions = page
        .locator('summary')
        .filter({ hasText: MORE_OPTIONS_LABEL[locale] })
        .first();
      await expect(
        moreOptions,
        `PKG-01 (owner: 13-04): More options disclosure visible at ${url}`,
      ).toBeVisible({ timeout: 8_000 });

      await page.screenshot({
        path: resolve(SCREENSHOT_DIR, `hero-${locale}.png`),
        fullPage: true,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// PKG-02 Zip composition + PKG-03 README locale-aware content
// ---------------------------------------------------------------------------

test.describe('PKG-02 zip + PKG-03 README per locale', () => {
  for (const locale of LOCALES) {
    test(`${locale}: hero click produces 4-file zip in clinician-sort-order with locale-natural README`, async ({
      page,
    }) => {
      const { zip, shareCalls } = await captureZipViaShareMock(page, locale);

      // PKG-02 (owner: 13-03): exactly 4 files in clinician sort order.
      const names = Object.keys(zip.files).sort();
      expect(
        names,
        `PKG-02 (owner: 13-03): zip contents in clinician sort order for ${locale}`,
      ).toEqual([
        '01-clinical-report.pdf',
        '02-events.csv',
        '03-emr-bundle.fhir.json',
        'README.txt',
      ]);

      // Filename pattern: myflowcheck-<startDate>.zip per 13-03.
      expect(shareCalls.length, `share() call count for ${locale}`).toBe(1);
      expect(
        shareCalls[0].firstFileName,
        `PKG-02 (owner: 13-03): share() received zip filename for ${locale}`,
      ).toMatch(/^myflowcheck-\d{4}-\d{2}-\d{2}\.zip$/);
      expect(
        shareCalls[0].firstFileType,
        `PKG-02 (owner: 13-03): share() received application/zip MIME for ${locale}`,
      ).toBe('application/zip');
      expect(
        shareCalls[0].firstFileSize,
        `PKG-02 (owner: 13-03): zip size sanity floor for ${locale}`,
      ).toBeGreaterThan(10_000);

      // PDF entry magic bytes per src/__tests__/export-package.test.ts pattern.
      const pdfBytes = await zip.file('01-clinical-report.pdf')!.async('uint8array');
      expect(pdfBytes[0], `PDF magic byte 0 for ${locale}`).toBe(0x25);
      expect(pdfBytes[1]).toBe(0x50);
      expect(pdfBytes[2]).toBe(0x44);
      expect(pdfBytes[3]).toBe(0x46);
      expect(pdfBytes[4]).toBe(0x2d);

      // CSV section headers per project memory.
      const csvText = await zip.file('02-events.csv')!.async('string');
      expect(
        csvText,
        `PKG-02 (owner: 13-03): CSV has METADATA section for ${locale}`,
      ).toContain('METADATA');
      expect(
        csvText,
        `PKG-02 (owner: 13-03): CSV has EVENTS section for ${locale}`,
      ).toContain('EVENTS');

      // PKG-03 (owner: 13-03 + 13-04 translations): README locale-aware checks.
      const readmeText = await zip.file('README.txt')!.async('string');
      expect(
        readmeText.length,
        `PKG-03 (owner: 13-03 + 13-04): README has substantive content for ${locale}`,
      ).toBeGreaterThan(500);
      expect(
        readmeText,
        `PKG-03 (owner: 13-03 + 13-04): README preserves 'Epic' brand for ${locale}`,
      ).toContain('Epic');
      expect(
        readmeText,
        `PKG-03 (owner: 13-03 + 13-04): README preserves 'FHIR' term for ${locale}`,
      ).toContain('FHIR');
      // Project copy rule: no em-dashes or en-dashes in any locale string.
      expect(
        readmeText.includes('—'),
        `PKG-03 (owner: 13-03 + 13-04): README has no em-dashes for ${locale}`,
      ).toBe(false);
      expect(
        readmeText.includes('–'),
        `PKG-03 (owner: 13-03 + 13-04): README has no en-dashes for ${locale}`,
      ).toBe(false);
      // Locale-natural patient-profile term (loose substring from messages JSON).
      expect(
        readmeText,
        `PKG-03 (owner: 13-03 + 13-04): README contains locale patient-profile term for ${locale}`,
      ).toContain(README_PATIENT_LINE_TERM[locale]);

      // FHIR file JSON-parses regardless of locale (clinical payload is locale-neutral).
      const fhirText = await zip.file('03-emr-bundle.fhir.json')!.async('string');
      const bundle = JSON.parse(fhirText) as { resourceType?: string };
      expect(
        bundle.resourceType,
        `PKG-02 (owner: 13-01): FHIR JSON parses as Bundle for ${locale}`,
      ).toBe('Bundle');
    });
  }
});

// ---------------------------------------------------------------------------
// PKG-04 Web Share API: stage-1+stage-2 success path AND iOS-edge-case fallback
// ---------------------------------------------------------------------------

test.describe('PKG-04 Web Share API + fallback', () => {
  test('share-supported path: navigator.share is called with a zip File', async ({
    page,
  }) => {
    await seedDiary(page);
    await page.addInitScript(SHARE_MOCK_WITH_BYTES);
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    const hero = page
      .locator('button')
      .filter({ hasText: heroLabelRegex('en') })
      .first();
    await hero.waitFor({ state: 'visible', timeout: 8_000 });
    await hero.click({ timeout: 3_000 });
    await page.waitForFunction(
      () => {
        const w = window as unknown as { __shareCalls?: ShareCallRecord[] };
        return Array.isArray(w.__shareCalls) && w.__shareCalls.length > 0;
      },
      null,
      { timeout: 15_000 },
    );
    const shareCalls = (await page.evaluate(
      () => (window as unknown as { __shareCalls?: ShareCallRecord[] }).__shareCalls,
    )) as ShareCallRecord[];
    expect(
      shareCalls.length,
      'PKG-04 (owner: 13-04): exactly one share() call after hero click',
    ).toBe(1);
    expect(
      shareCalls[0].firstFileType,
      'PKG-04 (owner: 13-04): share payload is application/zip',
    ).toBe('application/zip');
    expect(
      shareCalls[0].firstFileName,
      'PKG-04 (owner: 13-04): share filename matches myflowcheck-<date>.zip',
    ).toMatch(/^myflowcheck-\d{4}-\d{2}-\d{2}\.zip$/);
  });

  test('share-unavailable path: canShare false triggers download fallback', async ({
    page,
  }) => {
    await seedDiary(page);
    await page.addInitScript(SHARE_MOCK_FALLBACK);
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });

    // When canShareFiles() on mount returns false, the hero label collapses to
    // exportSavePackage. Match by the wider regex.
    const hero = page
      .locator('button')
      .filter({ hasText: heroLabelRegex('en') })
      .first();
    await hero.waitFor({ state: 'visible', timeout: 8_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await hero.click({ timeout: 3_000 });
    const download = await downloadPromise;
    expect(
      download.suggestedFilename(),
      'PKG-04 (owner: 13-04): download fallback emits myflowcheck-<date>.zip',
    ).toMatch(/^myflowcheck-\d{4}-\d{2}-\d{2}\.zip$/);
  });
});

// ---------------------------------------------------------------------------
// PKG-05 Backward compatibility: existing PDF/CSV inside the disclosure
// ---------------------------------------------------------------------------

test.describe('PKG-05 backward compatibility', () => {
  test("'More options' expansion reveals the existing PDF + CSV buttons", async ({
    page,
  }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    const summary = page
      .locator('summary')
      .filter({ hasText: MORE_OPTIONS_LABEL.en })
      .first();
    await summary.waitFor({ state: 'visible', timeout: 8_000 });
    await summary.click();

    // PDF + CSV button labels match the standalone (non-share) renderings
    // because navigator.share is undefined in headless Chromium by default.
    await expect(
      page.locator('button').filter({ hasText: SAVE_PDF_LABEL.en }).first(),
      'PKG-05 (owner: 13-04): existing PDF button still inside disclosure',
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.locator('button').filter({ hasText: SAVE_CSV_LABEL.en }).first(),
      'PKG-05 (owner: 13-04): existing CSV button still inside disclosure',
    ).toBeVisible({ timeout: 8_000 });
  });

  test('clicking the existing PDF button triggers download with my-flow-check-<date>.pdf filename', async ({
    page,
  }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    const summary = page
      .locator('summary')
      .filter({ hasText: MORE_OPTIONS_LABEL.en })
      .first();
    await summary.click();

    const pdfButton = page
      .locator('button')
      .filter({ hasText: SAVE_PDF_LABEL.en })
      .first();
    await pdfButton.waitFor({ state: 'visible', timeout: 8_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await pdfButton.click({ timeout: 3_000 });
    const download = await downloadPromise;
    expect(
      download.suggestedFilename(),
      'PKG-05 (owner: 13-04): PDF keeps existing my-flow-check-<date>.pdf filename, NOT myflowcheck-',
    ).toMatch(/^my-flow-check-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test('clicking the existing CSV button triggers download with my-flow-check-<date>.csv filename', async ({
    page,
  }) => {
    await seedDiary(page);
    await page.goto(`${BASE_URL}/summary`, { waitUntil: 'domcontentloaded' });
    const summary = page
      .locator('summary')
      .filter({ hasText: MORE_OPTIONS_LABEL.en })
      .first();
    await summary.click();

    const csvButton = page
      .locator('button')
      .filter({ hasText: SAVE_CSV_LABEL.en })
      .first();
    await csvButton.waitFor({ state: 'visible', timeout: 8_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await csvButton.click({ timeout: 3_000 });
    const download = await downloadPromise;
    expect(
      download.suggestedFilename(),
      'PKG-05 (owner: 13-04): CSV keeps existing my-flow-check-<date>.csv filename',
    ).toMatch(/^my-flow-check-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

// ---------------------------------------------------------------------------
// FHIR-EX-01 Per-event Observation encoding (locked LOINC + SNOMED + UCUM)
// ---------------------------------------------------------------------------

interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}
interface FhirCodeableConcept {
  coding: FhirCoding[];
}
interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  code: FhirCodeableConcept;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  effectiveDateTime?: string;
}
interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  birthDate?: string;
  identifier?: unknown[];
  name?: unknown;
  address?: unknown;
  telecom?: unknown;
  communication?: unknown;
  gender?: unknown;
}
interface FhirQuestionnaireResponseItem {
  linkId: string;
}
interface FhirQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  item: FhirQuestionnaireResponseItem[];
}
interface FhirBundleEntry {
  resource:
    | FhirObservation
    | FhirPatient
    | FhirQuestionnaireResponse
    | { resourceType: string };
}
interface FhirBundle {
  resourceType: 'Bundle';
  type: string;
  entry: FhirBundleEntry[];
}

test.describe('FHIR-EX-01 per-event Observation encoding', () => {
  test('every void/drink/leak Observation uses the locked LOINC + SNOMED codes and canonical mL valueQuantity', async ({
    page,
  }) => {
    const { zip } = await captureZipViaShareMock(page, 'en');
    const fhirText = await zip.file('03-emr-bundle.fhir.json')!.async('string');
    const bundle = JSON.parse(fhirText) as FhirBundle;

    const observations = bundle.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation',
      );

    const voidObs = observations.filter((o) => o.id.startsWith('void-'));
    const drinkObs = observations.filter((o) => o.id.startsWith('drink-'));
    const leakObs = observations.filter((o) => o.id.startsWith('leak-'));

    // buildSeedState fixture yields 18 voids (6 per day x 3), 15 drinks
    // (5 per day x 3), 2 leaks (day 1 + day 3). Floor each count to a
    // sanity threshold so a fixture tweak does not silently zero the test.
    expect(
      voidObs.length,
      'FHIR-EX-01 (owner: 13-01): at least one void Observation per seeded void',
    ).toBeGreaterThanOrEqual(15);
    expect(
      drinkObs.length,
      'FHIR-EX-01 (owner: 13-01): at least one drink Observation per seeded drink',
    ).toBeGreaterThanOrEqual(12);
    expect(
      leakObs.length,
      'FHIR-EX-01 (owner: 13-01): at least one leak Observation per seeded leak',
    ).toBeGreaterThanOrEqual(2);

    for (const v of voidObs) {
      expect(
        v.code.coding[0].code,
        `FHIR-EX-01 (owner: 13-01): void uses LOINC 9187-6 for ${v.id}`,
      ).toBe('9187-6');
      expect(v.code.coding[0].system).toBe('http://loinc.org');
      expect(v.valueQuantity?.unit).toBe('mL');
      expect(v.valueQuantity?.code).toBe('mL');
      expect(v.valueQuantity?.system).toBe('http://unitsofmeasure.org');
      expect(typeof v.valueQuantity?.value).toBe('number');
      expect(v.effectiveDateTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
      );
    }
    for (const d of drinkObs) {
      expect(
        d.code.coding[0].code,
        `FHIR-EX-01 (owner: 13-01): drink uses LOINC 8999-5 for ${d.id}`,
      ).toBe('8999-5');
      expect(d.code.coding[0].system).toBe('http://loinc.org');
      expect(d.valueQuantity?.unit).toBe('mL');
      expect(d.valueQuantity?.code).toBe('mL');
      expect(d.valueQuantity?.system).toBe('http://unitsofmeasure.org');
    }
    for (const l of leakObs) {
      const codes = l.code.coding.map((c) => c.code ?? '').sort();
      expect(
        codes,
        `FHIR-EX-01 (owner: 13-01): leak has SNOMED 162172004 + LOINC 28232-7 for ${l.id}`,
      ).toEqual(['162172004', '28232-7'].sort());
    }
  });
});

// ---------------------------------------------------------------------------
// FHIR-EX-02 Bundle structure + Patient at entry[0] + QR linkId catalog
// ---------------------------------------------------------------------------

test.describe('FHIR-EX-02 Bundle + Patient + QR locked structure', () => {
  test('Bundle is type=collection, entry[0] is Patient, entry[1] is QR with the locked linkId catalog', async ({
    page,
  }) => {
    const { zip } = await captureZipViaShareMock(page, 'en');
    const fhirText = await zip.file('03-emr-bundle.fhir.json')!.async('string');
    const bundle = JSON.parse(fhirText) as FhirBundle;

    expect(
      bundle.resourceType,
      'FHIR-EX-02 (owner: 13-01 + 13-02): top resource is Bundle',
    ).toBe('Bundle');
    expect(
      bundle.type,
      "FHIR-EX-02 (owner: 13-01 + 13-02): Bundle.type is 'collection'",
    ).toBe('collection');
    expect(
      bundle.entry[0].resource.resourceType,
      'FHIR-EX-02 (owner: 13-01): entry[0] is Patient',
    ).toBe('Patient');
    expect(
      bundle.entry[1].resource.resourceType,
      'FHIR-EX-02 (owner: 13-02): entry[1] is QuestionnaireResponse',
    ).toBe('QuestionnaireResponse');

    // QR linkId catalog. Live shape from src/lib/exportFhir/questionnaireResponse.ts:
    // 3 diary metadata + 6 period-metrics (24HV x 2 + NPi x 2 + AVV x 2)
    // + 1 top-level MVV + 3 bedtimes + 3 wakes = 16 items total.
    // (NBC + per-day AVV/MVV/24HV were considered in earlier drafts; deferred.)
    const qr = bundle.entry[1].resource as FhirQuestionnaireResponse;
    const qrLinkIds = new Set(qr.item.map((i) => i.linkId));
    const expectedLinkIds = [
      'qr-diary-startdate',
      'qr-diary-timezone',
      'qr-diary-age',
      'qr-metric-24hv-period1',
      'qr-metric-24hv-period2',
      'qr-metric-npi-period1',
      'qr-metric-npi-period2',
      'qr-metric-avv-period1',
      'qr-metric-avv-period2',
      'qr-metric-mvv',
      'qr-bedtime-day-1',
      'qr-bedtime-day-2',
      'qr-bedtime-day-3',
      'qr-wake-day-1',
      'qr-wake-day-2',
      'qr-wake-day-3',
    ];
    for (const linkId of expectedLinkIds) {
      expect(
        qrLinkIds.has(linkId),
        `FHIR-EX-02 (owner: 13-02): QR linkId '${linkId}' present in the live-built bundle`,
      ).toBe(true);
    }
    expect(
      qrLinkIds.size,
      'FHIR-EX-02 (owner: 13-02): QR linkId catalog has exactly the locked 16 items',
    ).toBe(expectedLinkIds.length);
  });
});

// ---------------------------------------------------------------------------
// FHIR-EX-03 AJV schema validation + PHI audit on Patient resource
// ---------------------------------------------------------------------------

test.describe('FHIR-EX-03 AJV validation + PHI audit', () => {
  test('live-built Bundle validates against the FHIR R4 JSON Schema (AJV)', async ({
    page,
  }) => {
    const { zip } = await captureZipViaShareMock(page, 'en');
    const fhirText = await zip.file('03-emr-bundle.fhir.json')!.async('string');
    const bundle = JSON.parse(fhirText) as unknown;
    const valid = validateBundle(bundle);
    if (!valid) {
      // Surface errors before the assertion fires for grep-friendly debugging.
      console.error(
        'FHIR-EX-03 (owner: 13-01 + 13-02) AJV errors:',
        JSON.stringify(validateBundle.errors, null, 2),
      );
    }
    expect(
      valid,
      'FHIR-EX-03 (owner: 13-01 + 13-02): live-built Bundle validates against FHIR R4 schema',
    ).toBe(true);
  });

  test('Patient resource contains no PHI fields (name/address/telecom/communication/gender)', async ({
    page,
  }) => {
    const { zip } = await captureZipViaShareMock(page, 'en');
    const fhirText = await zip.file('03-emr-bundle.fhir.json')!.async('string');
    const bundle = JSON.parse(fhirText) as FhirBundle;
    const patient = bundle.entry[0].resource as FhirPatient;

    expect(
      patient.name,
      'FHIR-EX-03 (owner: 13-01): Patient.name absent (PHI Safe Harbor)',
    ).toBeUndefined();
    expect(
      patient.address,
      'FHIR-EX-03 (owner: 13-01): Patient.address absent (PHI Safe Harbor)',
    ).toBeUndefined();
    expect(
      patient.telecom,
      'FHIR-EX-03 (owner: 13-01): Patient.telecom absent (PHI Safe Harbor)',
    ).toBeUndefined();
    expect(
      patient.communication,
      'FHIR-EX-03 (owner: 13-01): Patient.communication absent (PHI Safe Harbor)',
    ).toBeUndefined();
    expect(
      patient.gender,
      'FHIR-EX-03 (owner: 13-01): Patient.gender absent (PHI Safe Harbor)',
    ).toBeUndefined();
    if (patient.birthDate !== undefined) {
      expect(
        patient.birthDate,
        'FHIR-EX-03 (owner: 13-01): Patient.birthDate is year-only (Safe Harbor)',
      ).toMatch(/^\d{4}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// Prior-phase regression smoke (per 13-05 PLAN D-08)
// ---------------------------------------------------------------------------

test.describe('Prior-phase regression smoke', () => {
  test('Phase 12: out/index.html is byte-identical to out/en.html (when present)', () => {
    const indexPath = resolve(OUT_DIR, 'index.html');
    const enPath = resolve(OUT_DIR, 'en.html');
    if (!existsSync(indexPath) || !existsSync(enPath)) {
      // Build output is not in this snapshot; the canonical Phase 12 check
      // runs via phase12-seo.spec.ts. Skip cleanly rather than fail.
      test.skip(
        true,
        'out/index.html or out/en.html not present in this build directory',
      );
      return;
    }
    const a = readFileSync(indexPath);
    const b = readFileSync(enPath);
    expect(
      a.equals(b),
      'Phase 12 bare-root copy preserved by Phase 13 (no Phase 13 edit touched scripts/post-build-copy-en-root.mjs)',
    ).toBe(true);
    // Also assert non-trivial size as a defense against an empty-copy regression.
    const stat = statSync(indexPath);
    expect(stat.size, 'out/index.html non-trivial size').toBeGreaterThanOrEqual(
      50_000,
    );
  });

  test('Phase 12: audience landing intro still meets the word-count floor on /learn/for-men', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/learn/for-men`, {
      waitUntil: 'domcontentloaded',
    });
    expect(response?.status(), 'audience landing status').toBe(200);
    const intro = page.locator('p.leading-relaxed.mb-8').first();
    await expect(intro, 'audience landing intro present').toBeVisible({
      timeout: 8_000,
    });
    const text = (await intro.textContent()) ?? '';
    const words = text.split(/\s+/).filter(Boolean).length;
    expect(
      words,
      "Phase 12-03 audience landing intro word count preserved (>=600 words on /learn/for-men)",
    ).toBeGreaterThanOrEqual(600);
  });
});
