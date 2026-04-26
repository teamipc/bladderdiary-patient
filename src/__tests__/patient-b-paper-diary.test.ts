/**
 * Generate PDF from Patient B's paper bladder diary (PROCARE template, dates blank).
 *
 * Run: npx vitest run src/__tests__/patient-b-paper-diary.test.ts
 * Output: $DIARY_PDF_OUT (or os.tmpdir() if unset) / patient-b-bladder-diary.pdf
 *
 * Interpretation notes:
 *   - Drinks column: paper shows ∧ at 7:00, "1.5L" in the middle row, ∨ at 14:00
 *     each day, so the patient consumed 1.5L total between 7:00 and 14:00.
 *     Distributed as 3 x 500 mL water entries at the start, middle, and end
 *     of that window.
 *   - No drink type specified on paper, defaulted to water.
 *   - No bladder sensation values entered, sensation: null on every void.
 *   - "Other" column blank on every row, so no leaks.
 *   - Dates blank on paper, using 2026-04-22 to 2026-04-24 (the 3 days
 *     before today).
 *   - Wake / bedtime not on paper: wake 07:00, bedtime 22:30 (Day 1, 2),
 *     21:30 (Day 3, which had its last evening void at 21:00).
 *   - The 3:00 AM voids written in each day's column are nocturia events
 *     timestamped on the following calendar morning.
 */
import { describe, it } from 'vitest';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generatePdfBlob } from '@/lib/exportPdf';
import { computeMetrics } from '@/lib/calculations';
import type { DiaryState } from '@/lib/types';

const OUTPUT_DIR = process.env.DIARY_PDF_OUT ?? tmpdir();

function uid(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

const patientB: DiaryState = {
  startDate: '2026-04-22',
  age: 80,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  timeZone: 'UTC',
  morningAnchor: null,
  day1CelebrationShown: true,
  leaks: [],
  voids: [
    // Day 1, Apr 22 (leaks marked on paper at 07:00 FMV and 22:00 evening void)
    { id: uid('v', 1), timestampIso: '2026-04-22T07:00:00.000Z', volumeMl: 200, sensation: null, leak: true, note: '', isFirstMorningVoid: true },
    { id: uid('v', 2), timestampIso: '2026-04-22T09:00:00.000Z', volumeMl: 300, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 3), timestampIso: '2026-04-22T10:00:00.000Z', volumeMl: 275, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 4), timestampIso: '2026-04-22T14:00:00.000Z', volumeMl: 500, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 5), timestampIso: '2026-04-22T17:00:00.000Z', volumeMl: 225, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 6), timestampIso: '2026-04-22T22:00:00.000Z', volumeMl: 200, sensation: null, leak: true, note: '', isFirstMorningVoid: false },
    // Night 1 nocturia (paper Day 1 column, 3:00 row), timestamped Apr 23
    { id: uid('v', 7), timestampIso: '2026-04-23T03:00:00.000Z', volumeMl: 450, sensation: null, leak: false, note: 'nocturia', isFirstMorningVoid: false },

    // Day 2, Apr 23 (leaks at 07:00 FMV and 22:00 evening void)
    { id: uid('v', 8), timestampIso: '2026-04-23T07:00:00.000Z', volumeMl: 200, sensation: null, leak: true, note: '', isFirstMorningVoid: true },
    { id: uid('v', 9), timestampIso: '2026-04-23T11:00:00.000Z', volumeMl: 250, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 10), timestampIso: '2026-04-23T12:00:00.000Z', volumeMl: 200, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 11), timestampIso: '2026-04-23T14:00:00.000Z', volumeMl: 450, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 12), timestampIso: '2026-04-23T17:00:00.000Z', volumeMl: 250, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 13), timestampIso: '2026-04-23T22:00:00.000Z', volumeMl: 200, sensation: null, leak: true, note: '', isFirstMorningVoid: false },
    // Night 2 nocturia (paper Day 2 column, 3:00 row), timestamped Apr 24
    { id: uid('v', 14), timestampIso: '2026-04-24T03:00:00.000Z', volumeMl: 500, sensation: null, leak: false, note: 'nocturia', isFirstMorningVoid: false },

    // Day 3, Apr 24 (leaks at 07:00 FMV and 21:00 evening void)
    { id: uid('v', 15), timestampIso: '2026-04-24T07:00:00.000Z', volumeMl: 200, sensation: null, leak: true, note: '', isFirstMorningVoid: true },
    { id: uid('v', 16), timestampIso: '2026-04-24T11:00:00.000Z', volumeMl: 275, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 17), timestampIso: '2026-04-24T14:00:00.000Z', volumeMl: 375, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 18), timestampIso: '2026-04-24T15:00:00.000Z', volumeMl: 300, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 19), timestampIso: '2026-04-24T17:00:00.000Z', volumeMl: 275, sensation: null, leak: false, note: '', isFirstMorningVoid: false },
    { id: uid('v', 20), timestampIso: '2026-04-24T21:00:00.000Z', volumeMl: 250, sensation: null, leak: true, note: '', isFirstMorningVoid: false },
    // Night 3 nocturia (paper Day 3 column, 3:00 row), timestamped Apr 25
    { id: uid('v', 21), timestampIso: '2026-04-25T03:00:00.000Z', volumeMl: 575, sensation: null, leak: false, note: 'nocturia', isFirstMorningVoid: false },
  ],
  drinks: [
    // Day 1: 1.5 L between 7:00 and 14:00 = 3 x 500 mL
    { id: uid('d', 1), timestampIso: '2026-04-22T07:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 2), timestampIso: '2026-04-22T10:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 3), timestampIso: '2026-04-22T14:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    // Day 2: 1.5 L between 7:00 and 14:00 = 3 x 500 mL
    { id: uid('d', 4), timestampIso: '2026-04-23T07:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 5), timestampIso: '2026-04-23T11:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 6), timestampIso: '2026-04-23T14:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    // Day 3: 1.5 L between 7:00 and 14:00 = 3 x 500 mL
    { id: uid('d', 7), timestampIso: '2026-04-24T07:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 8), timestampIso: '2026-04-24T11:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
    { id: uid('d', 9), timestampIso: '2026-04-24T14:00:00.000Z', volumeMl: 500, drinkType: 'water', note: '' },
  ],
  bedtimes: [
    { id: uid('bt', 1), timestampIso: '2026-04-22T22:30:00.000Z', dayNumber: 1 },
    { id: uid('bt', 2), timestampIso: '2026-04-23T22:30:00.000Z', dayNumber: 2 },
    { id: uid('bt', 3), timestampIso: '2026-04-24T21:30:00.000Z', dayNumber: 3 },
  ],
  wakeTimes: [
    { id: uid('wt', 1), timestampIso: '2026-04-22T07:00:00.000Z', dayNumber: 1 },
    { id: uid('wt', 2), timestampIso: '2026-04-23T07:00:00.000Z', dayNumber: 2 },
    { id: uid('wt', 3), timestampIso: '2026-04-24T07:00:00.000Z', dayNumber: 3 },
  ],
};

describe('patient B paper diary', () => {
  it('generates PDF', async () => {
    const { blob } = generatePdfBlob(patientB);
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const path = join(OUTPUT_DIR, 'patient-b-bladder-diary.pdf');
    writeFileSync(path, buffer);
    console.log(`  PDF: ${path}`);
  });

  it('computes functional diagnosis', () => {
    const m = computeMetrics(patientB);
    const combined24HV = (m.periods[0].twentyFourHV + m.periods[1].twentyFourHV) / 2;
    const combinedNoct = m.periods[0].nocturnalVolumeMl + m.periods[1].nocturnalVolumeMl;
    const combinedDenom = m.periods[0].twentyFourHV + m.periods[1].twentyFourHV;
    const combinedNPi = combinedDenom > 0 ? (combinedNoct / combinedDenom) * 100 : 0;
    const avvA = m.periods[0].avv;
    const avvB = m.periods[1].avv;
    const avvLow = Math.min(avvA ?? 0, avvB ?? 0);
    const avvHigh = Math.max(avvA ?? 0, avvB ?? 0);

    console.log('\n=== PATIENT B functional diagnosis ===');
    console.log(`Age: ${m.age ?? 'unknown'}`);
    console.log(`Period 1 (Day 2):  24HV=${m.periods[0].twentyFourHV} mL  NPi=${m.periods[0].nPi}%  AVV=${avvA} mL  voids=${m.periods[0].voidCount}`);
    console.log(`Period 2 (Day 3):  24HV=${m.periods[1].twentyFourHV} mL  NPi=${m.periods[1].nPi}%  AVV=${avvB} mL  voids=${m.periods[1].voidCount}`);
    console.log(`Combined 24HV (avg): ${combined24HV} mL = ${(combined24HV / 1000).toFixed(1)} L`);
    console.log(`Combined NPi:        ${combinedNPi.toFixed(1)} %`);
    console.log(`MVV:                 ${m.mvv} mL`);
    console.log(`AVV range:           ${avvLow}/${avvHigh} mL`);
    console.log(`Total void leaks:    ${m.totalLeaks}`);
    console.log(`Standalone leaks:    ${m.totalStandaloneLeaks}`);
    console.log(`Continence:          ${m.isContinent ? 'CONTINENT' : 'INCONTINENT'}`);
  });
});
