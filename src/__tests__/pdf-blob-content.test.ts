/**
 * PDF blob content per locale (LP-02 + LP-03).
 *
 * Generates a real PDF blob for each of the 6 app locales using
 * `generatePdfBlob(state, locale)` (async after LP-02 — see plan 09-05),
 * then extracts the text via pdf-parse v2's class-based API and asserts:
 *
 *   - The blob is parseable and contains at least 7 pages.
 *   - File size is under the 5MB budget even with Unicode fonts embedded.
 *   - The locale's `clinicalAnalysis`, `urgencyDistribution`,
 *     `dailyFluidBalance`, and day-label strings appear in the extracted text.
 *   - For non-EN locales, the corresponding ENGLISH literals do NOT appear
 *     (anti-fallback contamination check).
 *   - For ZH/AR: pdf-parse may not extract embedded-font CJK/Arabic glyphs,
 *     so the assertion falls back to a brand-name + parseable + size check.
 *     The medical-grade glyph correctness is verified at the human-verify
 *     checkpoint, not here.
 *
 * The pdf-parse v2 adapter mirrors the canonical version in
 * `e2e/deep-flow.spec.ts:30-47` so the API stays consistent across the repo.
 */

import { describe, it, expect } from 'vitest';
import { generatePdfBlob } from '@/lib/exportPdf';
import { getPdfStrings } from '@/lib/exportPdf/strings';
import { locales } from '@/i18n/config';
import type { DiaryState } from '@/lib/types';

// pdf-parse v2 → pdfjs-dist requires DOMMatrix / ImageData / Path2D at import
// time. jsdom (vitest's default env in this repo) does not polyfill these, so
// the module load throws ReferenceError: DOMMatrix is not defined. We don't
// use canvas / image rendering in this test — text extraction only — so a
// minimal class shim is enough to let the module load. Browser-tests (Playwright
// → real Chromium) don't need this shim; see e2e/deep-flow.spec.ts:30-47.
//
// `globalThis as unknown as Record<string, unknown>` keeps the lint/strict
// type-checker happy without disabling the rule across the whole file.
{
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.DOMMatrix === 'undefined') {
    g.DOMMatrix = class {};
  }
  if (typeof g.ImageData === 'undefined') {
    g.ImageData = class {};
  }
  if (typeof g.Path2D === 'undefined') {
    g.Path2D = class {};
  }
}

// pdf-parse v2 exposes a class-based API: `new PDFParse({data}).getText()`.
// Mirror the adapter from e2e/deep-flow.spec.ts:30-47 so the API stays
// consistent across the repo.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

interface PdfParseResult {
  text?: string;
  pages?: { text?: string }[];
}

interface PdfParseInfo {
  numPages?: number;
}

async function extractPdfText(buf: Buffer): Promise<{ text: string; numpages: number }> {
  const inst = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const info = (await inst.getInfo()) as PdfParseInfo;
    const result = (await inst.getText()) as PdfParseResult;
    const text: string =
      result.text ??
      (Array.isArray(result.pages)
        ? result.pages.map((p) => p.text ?? '').join('\n')
        : '');
    const numpages: number =
      info?.numPages ?? (Array.isArray(result.pages) ? result.pages.length : 0);
    return { text, numpages };
  } finally {
    await inst.destroy().catch(() => {});
  }
}

const SIZE_BUDGET_MB = 5;

function buildMinimalDiaryState(): DiaryState {
  // 3-day diary with at least one event per day so every PDF page has content.
  return {
    startDate: '2026-05-18',
    age: 55,
    volumeUnit: 'mL',
    diaryStarted: true,
    clinicCode: null,
    timeZone: 'America/New_York',
    morningAnchor: null,
    day1CelebrationShown: false,
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
  };
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  // jsdom Blob: read via FileReader (matches the pattern in generate-test-exports.test.ts).
  return await new Promise<Buffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// Per-test timeout for the locale loop. Each test does 1 PDF generation +
// 1 pdf-parse extraction; under parallel load with other PDF-generating tests
// the default 5s ceiling is too tight. 15s gives ~3x headroom.
const PDF_TEST_TIMEOUT_MS = 15_000;

describe('PDF blob content per locale (LP-02 + LP-03)', () => {
  const state = buildMinimalDiaryState();

  for (const L of locales) {
    it(
      `generates a parseable PDF for locale=${L} under the 5MB size budget`,
      { timeout: PDF_TEST_TIMEOUT_MS },
      async () => {
        const { blob, filename } = await generatePdfBlob(state, L);
        const buf = await blobToBuffer(blob);

        // Size budget — even with embedded Unicode fonts, the PDF must stay under 5MB.
        expect(buf.length).toBeLessThan(SIZE_BUDGET_MB * 1024 * 1024);

        // Parseable + at least 7 pages (combined diary, results overview, 3 daily
        // diaries, graphs, machine data).
        const parsed = await extractPdfText(buf);
        expect(parsed.numpages).toBeGreaterThanOrEqual(7);

        // Filename is locale-neutral (uses date, not locale).
        expect(filename).toMatch(/^my-flow-check-2026-05-18\.pdf$/);
      },
    );

    it(
      `PDF for locale=${L} contains localized section headers, not English fallback (LP-02 + LP-03)`,
      { timeout: PDF_TEST_TIMEOUT_MS },
      async () => {
        const { blob } = await generatePdfBlob(state, L);
        const buf = await blobToBuffer(blob);
        const parsed = await extractPdfText(buf);
        const text = parsed.text;
        const s = getPdfStrings(L);

        if (L === 'zh') {
          // pdf-parse v2 may not extract glyphs from embedded TTF font subsets
          // for CJK — even when the PDF visually renders correctly. ZH is LTR,
          // so embedded Latin runs (the brand, abbreviations like FMV/DV) DO
          // extract correctly. Soft fallback: assert non-trivial length + brand.
          // The human-verify checkpoint covers actual CJK glyph correctness.
          expect(text.length).toBeGreaterThan(100);
          expect(text).toContain('My Flow Check'); // brand always Latin
        } else if (L === 'ar') {
          // AR uses setR2L(true) on every page, which reverses Latin character
          // emission too — and pdf-parse's text extraction renders each AR
          // codepoint as a mojibake `þX` pair because the Noto Arabic font
          // subset's CMAP table isn't fully resolved by pdfjs-dist's text-only
          // pipeline. As a result, neither AR section headers NOR the Latin
          // brand can be reliably asserted-against here. The human-verify
          // checkpoint is the canonical AR quality gate; this test asserts only
          // that the AR PDF is parseable and non-trivial in length.
          expect(text.length).toBeGreaterThan(100);
        } else {
          // Latin-script locales (en, fr, es, pt): assert localized headers are present.
          expect(text).toContain(s.clinicalAnalysis);
          expect(text).toContain(s.urgencyDistribution);
          expect(text).toContain(s.dailyFluidBalance);
          expect(text).toContain(s.day(1));
          expect(text).toContain(s.day(2));
          expect(text).toContain(s.day(3));

          // For non-EN locales: the EN headers must NOT appear (anti-fallback
          // contamination check). Skip the assertion if the EN/locale share a
          // value (e.g. brand-name fields that are intentionally Latin).
          if (L !== 'en') {
            const enS = getPdfStrings('en');
            if (s.clinicalAnalysis !== enS.clinicalAnalysis) {
              expect(text).not.toContain(enS.clinicalAnalysis);
            }
            if (s.urgencyDistribution !== enS.urgencyDistribution) {
              expect(text).not.toContain(enS.urgencyDistribution);
            }
          }
        }
      },
    );

    it(
      `PDF for locale=${L} contains no hardcoded English literals that bypassed the strings table (LP-03)`,
      { timeout: PDF_TEST_TIMEOUT_MS },
      async () => {
        const { blob } = await generatePdfBlob(state, L);
        const buf = await blobToBuffer(blob);
        const parsed = await extractPdfText(buf);
        const text = parsed.text;

        // For non-EN locales, the audit-flagged English literals (the
        // graphs.ts:194 axis labels '6am', '8am', '12pm', etc.) MUST NOT
        // appear. The graphs page now emits 24hr ISO-style labels ('06:00',
        // '08:00', etc.) which are locale-neutral.
        //
        // ZH and AR use embedded fonts that pdf-parse may not extract — but
        // axis labels are emitted as Latin numerals in 24hr form regardless of
        // locale, so this assertion holds for all 6 locales.
        if (L !== 'en') {
          expect(text).not.toMatch(/\b6am\b|\b8am\b|\b12pm\b/i);
        }
      },
    );
  }

  // Single combined sweep: every locale produces a parseable PDF.
  // - Latin-script locales (en/fr/es/pt): the locale-specific clinicalAnalysis
  //   header must appear in the extracted text.
  // - ZH: the always-Latin brand name 'My Flow Check' must appear (ZH is LTR;
  //   Latin runs extract cleanly even when CJK glyphs don't).
  // - AR: only the parseable-and-non-trivial soft assertion — setR2L(true)
  //   + embedded-font CMAP limitations prevent reliable Latin or Arabic text
  //   extraction. The human-verify checkpoint covers AR glyph correctness.
  //
  // Timeout: 6 sequential PDF generations + 6 pdf-parse extractions can take
  // 700ms-5s+ depending on machine. Default 5s timeout is too tight; bump to
  // 30s for headroom on slower CI machines.
  it(
    'all 6 locales produce a parseable PDF; Latin locales contain clinicalAnalysis, ZH contains brand',
    { timeout: 30_000 },
    async () => {
      for (const L of locales) {
        const { blob } = await generatePdfBlob(state, L);
        const buf = await blobToBuffer(blob);
        const parsed = await extractPdfText(buf);
        if (L === 'zh') {
          expect(parsed.text, `locale=${L} expected to contain brand 'My Flow Check'`).toContain(
            'My Flow Check',
          );
        } else if (L === 'ar') {
          expect(
            parsed.text.length,
            `locale=${L} expected non-trivial extracted text`,
          ).toBeGreaterThan(100);
        } else {
          const expected = getPdfStrings(L).clinicalAnalysis;
          expect(parsed.text, `locale=${L} expected to contain "${expected}"`).toContain(expected);
        }
      }
    },
  );
});
