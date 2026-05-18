import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format } from 'date-fns';
import { getPdfStrings, getDateLocale } from '@/lib/exportPdf/strings';

// All six app locales are covered after plan 09-05 — ZH and AR arrived with
// Unicode font registration in LP-02. The structural-parity assertions below
// now iterate over the full set, activating coverage for ZH + AR translations.
const SUPPORTED_PDF_LOCALES = ['en', 'fr', 'es', 'pt', 'zh', 'ar'] as const;

describe('PDF strings table (LP-03 + LP-02)', () => {
  it('exports PDF_STRINGS entries for en, fr, es, pt, zh, ar', () => {
    for (const L of SUPPORTED_PDF_LOCALES) {
      const s = getPdfStrings(L);
      expect(s).toBeTruthy();
      expect(s.appName).toBeTruthy();
    }
    // EN is the fallback for any unsupported locale
    expect(getPdfStrings('xx').appName).toBe(getPdfStrings('en').appName);
  });

  it('every locale has the same set of keys as EN (structural parity)', () => {
    const enKeys = new Set(Object.keys(getPdfStrings('en')));
    for (const L of SUPPORTED_PDF_LOCALES) {
      const lKeys = new Set(Object.keys(getPdfStrings(L)));
      expect(lKeys).toEqual(enKeys);
    }
  });

  it('every locale has the 3 newly-added keys (structuredDataTitle, eventsTitle, structuredDataSubtitle)', () => {
    for (const L of SUPPORTED_PDF_LOCALES) {
      const s = getPdfStrings(L);
      expect(s.structuredDataTitle).toBeTruthy();
      expect(s.eventsTitle).toBeTruthy();
      expect(s.structuredDataSubtitle).toBeTruthy();
    }
  });

  it('every locale has populated sensLabels (5 keys: 0..4)', () => {
    for (const L of SUPPORTED_PDF_LOCALES) {
      const s = getPdfStrings(L);
      for (const i of [0, 1, 2, 3, 4]) {
        expect(s.sensLabels[i as 0 | 1 | 2 | 3 | 4]).toBeTruthy();
      }
    }
  });

  it('every locale has populated drinkLabels for all 8 DrinkType values', () => {
    for (const L of SUPPORTED_PDF_LOCALES) {
      const s = getPdfStrings(L);
      for (const t of ['water', 'coffee', 'tea', 'juice', 'carbonated', 'alcohol', 'milk', 'other']) {
        expect(s.drinkLabels[t]).toBeTruthy();
      }
    }
  });

  it('every locale has populated leakTriggerLabels for all 8 LeakTrigger values', () => {
    for (const L of SUPPORTED_PDF_LOCALES) {
      const s = getPdfStrings(L);
      for (const t of ['cough', 'sneeze', 'laugh', 'lifting', 'exercise', 'toilet_way', 'other', 'not_sure']) {
        expect(s.leakTriggerLabels[t]).toBeTruthy();
      }
    }
  });

  it('source files contain no hardcoded English literals from the audit (static guard)', () => {
    const dailyDiarySrc = readFileSync(resolve('src/lib/exportPdf/dailyDiary.ts'), 'utf8');
    expect(dailyDiarySrc).not.toMatch(/head:\s*\[\s*\[\s*'Time'/);

    const machineDataSrc = readFileSync(resolve('src/lib/exportPdf/machineData.ts'), 'utf8');
    expect(machineDataSrc).not.toMatch(/doc\.text\('Structured Data'/);
    expect(machineDataSrc).not.toMatch(/doc\.text\('For clinical software ingestion/);
    expect(machineDataSrc).not.toMatch(/doc\.text\('Events',\s+MARGIN/);

    const slotsSrc = readFileSync(resolve('src/lib/exportPdf/slots.ts'), 'utf8');
    expect(slotsSrc).not.toMatch(/'12 AM'|'12 PM'/);
    expect(slotsSrc).not.toMatch(/\bconst ampm =/);

    const combinedDiarySrc = readFileSync(resolve('src/lib/exportPdf/combinedDiary.ts'), 'utf8');
    expect(combinedDiarySrc).not.toMatch(/'12 AM'|'12 PM'/);

    const graphsSrc = readFileSync(resolve('src/lib/exportPdf/graphs.ts'), 'utf8');
    expect(graphsSrc).not.toMatch(/'6am'|'12pm'/);
    expect(graphsSrc).toMatch(/'06:00'/);
    expect(graphsSrc).toMatch(/'14:00'/);
  });

  it('PT uses European Portuguese phrasing, not Brazilian', () => {
    const pt = getPdfStrings('pt');
    // EU-PT: 'sumo' for juice (BR-PT would be 'suco')
    expect(pt.drinkLabels.juice).toBe('Sumo');
    // EU-PT: 'Não registado' (BR-PT would be 'Não registrado')
    expect(pt.notRecorded).toBe('Não registado');
  });

  it('getDateLocale returns the correct date-fns locale for all 6 app locales (LP-02 sub-bug c)', () => {
    const sample = new Date('2026-05-18T12:00:00Z');

    // Latin-script locales: assert locale-correct month names
    expect(format(sample, 'PPP', { locale: getDateLocale('en') })).toMatch(/May/);
    expect(format(sample, 'PPP', { locale: getDateLocale('fr') })).toMatch(/mai/i);
    expect(format(sample, 'PPP', { locale: getDateLocale('es') })).toMatch(/mayo/i);
    expect(format(sample, 'PPP', { locale: getDateLocale('pt') })).toMatch(/maio/i);

    // ZH: simplified-chinese date should contain Chinese characters
    expect(format(sample, 'PPP', { locale: getDateLocale('zh') })).toMatch(/[一-鿿]/);

    // AR: Arabic date should contain Arabic-script characters
    expect(format(sample, 'PPP', { locale: getDateLocale('ar') })).toMatch(/[؀-ۿ]/);

    // None of the non-EN locales should fall back to enUS
    expect(getDateLocale('pt')).not.toBe(getDateLocale('en'));
    expect(getDateLocale('zh')).not.toBe(getDateLocale('en'));
    expect(getDateLocale('ar')).not.toBe(getDateLocale('en'));
  });
});
