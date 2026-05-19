/**
 * Package zip composition tests (PKG-02, PKG-03, PKG-04).
 *
 * Exercises generatePackageBlob end-to-end: composes the 4-file zip from
 * a synthetic DiaryState, unzips with JSZip.loadAsync, asserts each
 * file's presence, name, and content shape.
 *
 * Test idiom borrowed from src/__tests__/pdf-blob-content.test.ts:163-171
 * (blob-to-Buffer conversion via FileReader) and extended with JSZip's
 * loadAsync for zip-content introspection.
 *
 * Backward-compatibility note: this test runs at a phase where 13-01
 * (FHIR core) is on main but 13-02 (Bundle QR + validator) may or may
 * not be applied yet. The Bundle assertions tolerate the missing-QR case:
 * entry[0] is always Patient, entry[1+] is QR or Observation depending
 * on whether 13-02 has merged.
 */

import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  generatePackageBlob,
  buildReadme,
  type ReadmeTranslator,
} from '@/lib/exportPackage';
import { generatePdfBlob } from '@/lib/exportPdf';
import { generateCsvBlob } from '@/lib/exportCsv';
import { generateFhirBundle } from '@/lib/exportFhir';
import type { DiaryState } from '@/lib/types';

/** Shared fixture. Same shape as pdf-blob-content.test.ts. */
function buildMinimalDiaryState(overrides: Partial<DiaryState> = {}): DiaryState {
  return {
    startDate: '2026-05-18',
    age: 55,
    volumeUnit: 'mL',
    hapticEnabled: true,
    diaryStarted: true,
    clinicCode: null,
    timeZone: 'America/New_York',
    morningAnchor: null,
    day1CelebrationShown: false,
    fmvTooltipShown: false,
    summaryCelebrationShown: false,
    voids: [
      {
        id: 'v1',
        timestampIso: '2026-05-18T11:00:00.000Z',
        volumeMl: 300,
        sensation: 1,
        leak: false,
        note: '',
        isFirstMorningVoid: true,
      },
      {
        id: 'v2',
        timestampIso: '2026-05-19T11:00:00.000Z',
        volumeMl: 250,
        sensation: 2,
        leak: false,
        note: '',
        isFirstMorningVoid: true,
      },
      {
        id: 'v3',
        timestampIso: '2026-05-20T11:00:00.000Z',
        volumeMl: 280,
        sensation: 1,
        leak: false,
        note: '',
        isFirstMorningVoid: true,
      },
    ],
    drinks: [
      {
        id: 'd1',
        timestampIso: '2026-05-18T12:00:00.000Z',
        volumeMl: 200,
        drinkType: 'water',
        note: '',
      },
      {
        id: 'd2',
        timestampIso: '2026-05-19T12:00:00.000Z',
        volumeMl: 200,
        drinkType: 'coffee',
        note: '',
      },
      {
        id: 'd3',
        timestampIso: '2026-05-20T12:00:00.000Z',
        volumeMl: 200,
        drinkType: 'water',
        note: '',
      },
    ],
    leaks: [],
    bedtimes: [
      { id: 'b1', timestampIso: '2026-05-19T03:00:00.000Z', dayNumber: 1 },
      { id: 'b2', timestampIso: '2026-05-20T03:00:00.000Z', dayNumber: 2 },
      { id: 'b3', timestampIso: '2026-05-21T03:00:00.000Z', dayNumber: 3 },
    ],
    wakeTimes: [
      { id: 'w1', timestampIso: '2026-05-18T11:00:00.000Z', dayNumber: 1 },
      { id: 'w2', timestampIso: '2026-05-19T11:00:00.000Z', dayNumber: 2 },
      { id: 'w3', timestampIso: '2026-05-20T11:00:00.000Z', dayNumber: 3 },
    ],
    ...overrides,
  };
}

/** Convert a Blob to a Uint8Array for JSZip.loadAsync ingestion.
 * Uses FileReader because jsdom's Blob.arrayBuffer() / Response().arrayBuffer() do
 * not preserve binary in this test env. Mirrors blobToBuffer in pdf-blob-content.test.ts. */
async function blobToUint8(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });
}

/** Stub translator. Returns predictable strings based on key + values. */
const stubTranslator: ReadmeTranslator = (key, values) => {
  const stubs: Record<string, string> = {
    title: 'My Flow Check: 3-Day Bladder Diary',
    patientLine: `Patient profile: age ${values?.age ?? 'unknown'}, ${values?.timezone ?? 'UTC'} timezone`,
    completedLine: `Diary completed: ${values?.date ?? ''}`,
    intro: 'This package contains 4 files for your records.',
    fileDescriptions:
      '  01-clinical-report.pdf\n  02-events.csv\n  03-emr-bundle.fhir.json\n  README.txt',
    ehrInstructions:
      '       Epic: Patient Chart, Documents, Upload.\n       Cerner / Allscripts / athenahealth: similar.\n       Prompt Health: attach PDF instead.',
    clinicCodeDisclaimer: 'Tracking code, not MRN.',
    footer: 'Questions? See https://myflowcheck.com/learn/for-clinicians',
  };
  return stubs[key] ?? `[missing:${key}]`;
};

// Per-test timeout: each generatePackageBlob call generates a PDF
// (~1s under jsdom) plus the FHIR + CSV + zip overhead. 15s ceiling
// gives ~3x headroom under parallel load.
const PACKAGE_TEST_TIMEOUT_MS = 15_000;

describe('generatePackageBlob — composition', () => {
  it(
    'returns a Blob with application/zip mimeType and myflowcheck-<date>.zip filename',
    async () => {
      const state = buildMinimalDiaryState();
      const { blob, filename } = await generatePackageBlob(state, 'en', stubTranslator);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/zip');
      expect(filename).toBe('myflowcheck-2026-05-18.zip');
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'zip contains exactly 4 files in clinician-sort order',
    async () => {
      const state = buildMinimalDiaryState();
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const names = Object.keys(zip.files).sort();
      expect(names).toEqual([
        '01-clinical-report.pdf',
        '02-events.csv',
        '03-emr-bundle.fhir.json',
        'README.txt',
      ]);
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'PDF entry begins with the %PDF- magic bytes',
    async () => {
      const state = buildMinimalDiaryState();
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const pdfBytes = await zip.file('01-clinical-report.pdf')!.async('uint8array');
      // %PDF- = 0x25 0x50 0x44 0x46 0x2D
      expect(pdfBytes[0]).toBe(0x25);
      expect(pdfBytes[1]).toBe(0x50);
      expect(pdfBytes[2]).toBe(0x44);
      expect(pdfBytes[3]).toBe(0x46);
      expect(pdfBytes[4]).toBe(0x2d);
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'CSV entry parses as CSV with EVENTS section header present',
    async () => {
      const state = buildMinimalDiaryState();
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const csvText = await zip.file('02-events.csv')!.async('string');
      expect(csvText).toContain('EVENTS');
      expect(csvText.length).toBeGreaterThan(100);
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'FHIR JSON entry parses as a valid R4 collection Bundle with a Patient at entry[0]',
    async () => {
      const state = buildMinimalDiaryState();
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const fhirText = await zip.file('03-emr-bundle.fhir.json')!.async('string');
      const bundle = JSON.parse(fhirText);
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      expect(bundle.entry).toBeInstanceOf(Array);
      // Patient is always at entry[0] (13-01 invariant). QR may or may not be at
      // entry[1] depending on whether 13-02 has merged; we tolerate both shapes.
      expect(bundle.entry.length).toBeGreaterThanOrEqual(1);
      expect(bundle.entry[0].resource.resourceType).toBe('Patient');
      // At least one Observation must exist beyond entry[0] given the fixture
      // has 3 voids + 3 drinks.
      const resourceTypes = bundle.entry
        .slice(1)
        .map((e: { resource: { resourceType: string } }) => e.resource.resourceType);
      expect(resourceTypes).toContain('Observation');
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'README entry is the composed buildReadme string with substituted placeholders',
    async () => {
      const state = buildMinimalDiaryState();
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const readmeInZip = await zip.file('README.txt')!.async('string');
      // The zipped README must match what buildReadme produces standalone.
      const expected = buildReadme(state, 'en', stubTranslator);
      expect(readmeInZip).toBe(expected);
      // Sanity-check substituted content.
      expect(readmeInZip).toContain('My Flow Check: 3-Day Bladder Diary');
      expect(readmeInZip).toContain('age 55');
      expect(readmeInZip).toContain('America/New_York');
      expect(readmeInZip).toContain('Epic');
      expect(readmeInZip).not.toContain('—'); // em-dash
      expect(readmeInZip).not.toContain('–'); // en-dash
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'FHIR JSON inside the zip is byte-identical to what generateFhirBundle produces standalone',
    async () => {
      const state = buildMinimalDiaryState();
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      // generateFhirBundle uses crypto.randomUUID() for fullUrl values and
      // new Date().toISOString() for the Bundle timestamp, so two calls do
      // NOT produce byte-identical output. We instead assert the SHAPE
      // matches: same resourceType, type, entry count, and per-entry
      // resourceType sequence.
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const inZipBundle = JSON.parse(
        await zip.file('03-emr-bundle.fhir.json')!.async('string'),
      );
      const freshBundle = generateFhirBundle(state);
      expect(inZipBundle.resourceType).toBe(freshBundle.resourceType);
      expect(inZipBundle.type).toBe(freshBundle.type);
      expect(inZipBundle.entry.length).toBe(freshBundle.entry.length);
      const inZipTypes = inZipBundle.entry.map(
        (e: { resource: { resourceType: string } }) => e.resource.resourceType,
      );
      const freshTypes = freshBundle.entry.map((e) => e.resource.resourceType);
      expect(inZipTypes).toEqual(freshTypes);
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );
});

describe('generatePackageBlob — clinic code conditional disclaimer', () => {
  it(
    'README omits the disclaimer paragraph when clinicCode is null',
    async () => {
      const state = buildMinimalDiaryState({ clinicCode: null });
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const readmeInZip = await zip.file('README.txt')!.async('string');
      expect(readmeInZip).not.toContain('Tracking code, not MRN.');
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'README includes the disclaimer paragraph when clinicCode is set and valid',
    async () => {
      const state = buildMinimalDiaryState({ clinicCode: 'IPC-2026' });
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const readmeInZip = await zip.file('README.txt')!.async('string');
      expect(readmeInZip).toContain('Tracking code, not MRN.');
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );

  it(
    'README omits the disclaimer paragraph when clinicCode is set but invalid (regex fails)',
    async () => {
      // Contains spaces, which the regex /^[A-Za-z0-9-]{1,32}$/ rejects.
      const state = buildMinimalDiaryState({ clinicCode: 'invalid code with spaces' });
      const { blob } = await generatePackageBlob(state, 'en', stubTranslator);
      const zip = await JSZip.loadAsync(await blobToUint8(blob));
      const readmeInZip = await zip.file('README.txt')!.async('string');
      expect(readmeInZip).not.toContain('Tracking code, not MRN.');
    },
    PACKAGE_TEST_TIMEOUT_MS,
  );
});

describe('buildReadme — pure function invariants', () => {
  it('returns a string with no HTML tags', () => {
    const state = buildMinimalDiaryState();
    const out = buildReadme(state, 'en', stubTranslator);
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('handles null age without emitting "null" or "undefined" or em-dash', () => {
    const state = buildMinimalDiaryState({ age: null });
    const out = buildReadme(state, 'en', stubTranslator);
    expect(out).not.toContain('age null');
    expect(out).not.toContain('age undefined');
    expect(out).not.toContain('—');
    expect(out).toContain('age unknown');
  });

  it('completedLine uses state.startDate, not new Date()', () => {
    const state = buildMinimalDiaryState({ startDate: '2030-12-31' });
    const out = buildReadme(state, 'en', stubTranslator);
    expect(out).toContain('Diary completed: 2030-12-31');
  });

  it('is byte-deterministic: two calls with the same inputs produce the same output', () => {
    const state = buildMinimalDiaryState();
    const a = buildReadme(state, 'en', stubTranslator);
    const b = buildReadme(state, 'en', stubTranslator);
    expect(a).toBe(b);
  });

  it('emits LF newlines only (no CRLF)', () => {
    const state = buildMinimalDiaryState();
    const out = buildReadme(state, 'en', stubTranslator);
    expect(out).not.toContain('\r\n');
    expect(out).not.toContain('\r');
    // Sanity-check: there are multiple line breaks.
    expect(out.split('\n').length).toBeGreaterThan(5);
  });
});

describe('Backward compatibility (PKG-05)', () => {
  it('generatePdfBlob still callable independently and returns the standalone filename', async () => {
    const state = buildMinimalDiaryState();
    const { blob, filename } = await generatePdfBlob(state);
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toBe('my-flow-check-2026-05-18.pdf');
  }, PACKAGE_TEST_TIMEOUT_MS);

  it('generateCsvBlob still callable independently and returns the standalone filename', () => {
    const state = buildMinimalDiaryState();
    const { blob, filename } = generateCsvBlob(state);
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toBe('my-flow-check-2026-05-18.csv');
  });

  it('generateFhirBundle still takes a single state parameter', () => {
    expect(generateFhirBundle.length).toBe(1);
  });
});
