/**
 * Generate PDF from Patient A's paper bladder diary (Jan 22-24).
 *
 * Run: npx vitest run src/__tests__/patient-a-paper-diary.test.ts
 * Output: $DIARY_PDF_OUT (or os.tmpdir() if unset) / patient-a-bladder-diary.pdf
 *
 * Interpretation notes:
 *   - "drops" written in the Other column on every void row is read as
 *     post-void dribbling, so leak: true on each VoidEntry.
 *   - Sensation 1 per the paper's legend means normal desire, no urgency.
 *   - No explicit wake/bedtime on the paper; grid starts at 6:00 each day
 *     and last event is 21:00, so wake = 06:00, bedtime = 22:00.
 *   - Timezone stored as UTC and timestamps use matching UTC hours so the
 *     rendered times line up with the handwritten clock times.
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

const patientA: DiaryState = {
  startDate: '2026-01-22',
  age: null,
  volumeUnit: 'mL',
  diaryStarted: true,
  clinicCode: null,
  timeZone: 'UTC',
  morningAnchor: null,
  day1CelebrationShown: true,
  leaks: [],
  voids: [
    // Day 1, Jan 22
    { id: uid('v', 1), timestampIso: '2026-01-22T06:00:00.000Z', volumeMl: 120, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: true },
    { id: uid('v', 2), timestampIso: '2026-01-22T14:00:00.000Z', volumeMl: 360, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: false },
    { id: uid('v', 3), timestampIso: '2026-01-22T21:00:00.000Z', volumeMl: 430, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: false },
    // Day 2, Jan 23
    { id: uid('v', 4), timestampIso: '2026-01-23T06:00:00.000Z', volumeMl: 140, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: true },
    { id: uid('v', 5), timestampIso: '2026-01-23T14:00:00.000Z', volumeMl: 340, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: false },
    { id: uid('v', 6), timestampIso: '2026-01-23T21:00:00.000Z', volumeMl: 470, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: false },
    // Day 3, Jan 24
    { id: uid('v', 7), timestampIso: '2026-01-24T06:00:00.000Z', volumeMl: 125, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: true },
    { id: uid('v', 8), timestampIso: '2026-01-24T16:00:00.000Z', volumeMl: 500, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: false },
    { id: uid('v', 9), timestampIso: '2026-01-24T21:00:00.000Z', volumeMl: 275, sensation: 1, leak: true, note: 'drops', isFirstMorningVoid: false },
  ],
  drinks: [
    // Day 1, Jan 22
    { id: uid('d', 1), timestampIso: '2026-01-22T07:00:00.000Z', volumeMl: 200, drinkType: 'coffee', note: '' },
    { id: uid('d', 2), timestampIso: '2026-01-22T12:00:00.000Z', volumeMl: 180, drinkType: 'juice', note: '' },
    { id: uid('d', 3), timestampIso: '2026-01-22T17:00:00.000Z', volumeMl: 150, drinkType: 'juice', note: '' },
    { id: uid('d', 4), timestampIso: '2026-01-22T20:00:00.000Z', volumeMl: 340, drinkType: 'alcohol', note: 'beer' },
    // Day 2, Jan 23
    { id: uid('d', 5), timestampIso: '2026-01-23T07:00:00.000Z', volumeMl: 200, drinkType: 'coffee', note: '' },
    { id: uid('d', 6), timestampIso: '2026-01-23T12:00:00.000Z', volumeMl: 200, drinkType: 'carbonated', note: 'Pepsi' },
    { id: uid('d', 7), timestampIso: '2026-01-23T17:00:00.000Z', volumeMl: 150, drinkType: 'juice', note: '' },
    { id: uid('d', 8), timestampIso: '2026-01-23T19:00:00.000Z', volumeMl: 120, drinkType: 'water', note: '' },
    // Day 3, Jan 24
    { id: uid('d', 9), timestampIso: '2026-01-24T07:00:00.000Z', volumeMl: 200, drinkType: 'coffee', note: '' },
    { id: uid('d', 10), timestampIso: '2026-01-24T12:00:00.000Z', volumeMl: 180, drinkType: 'juice', note: '' },
    { id: uid('d', 11), timestampIso: '2026-01-24T17:00:00.000Z', volumeMl: 150, drinkType: 'carbonated', note: 'Pepsi' },
    { id: uid('d', 12), timestampIso: '2026-01-24T20:00:00.000Z', volumeMl: 120, drinkType: 'water', note: '' },
  ],
  bedtimes: [
    { id: uid('bt', 1), timestampIso: '2026-01-22T22:00:00.000Z', dayNumber: 1 },
    { id: uid('bt', 2), timestampIso: '2026-01-23T22:00:00.000Z', dayNumber: 2 },
    { id: uid('bt', 3), timestampIso: '2026-01-24T22:00:00.000Z', dayNumber: 3 },
  ],
  wakeTimes: [
    { id: uid('wt', 1), timestampIso: '2026-01-22T06:00:00.000Z', dayNumber: 1 },
    { id: uid('wt', 2), timestampIso: '2026-01-23T06:00:00.000Z', dayNumber: 2 },
    { id: uid('wt', 3), timestampIso: '2026-01-24T06:00:00.000Z', dayNumber: 3 },
  ],
};

describe('patient A paper diary', () => {
  it('generates PDF', async () => {
    const { blob } = generatePdfBlob(patientA);
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const path = join(OUTPUT_DIR, 'patient-a-bladder-diary.pdf');
    writeFileSync(path, buffer);
    console.log(`  PDF: ${path}`);
  });

  it('computes functional diagnosis', () => {
    const m = computeMetrics(patientA);
    const combined24HV = (m.periods[0].twentyFourHV + m.periods[1].twentyFourHV) / 2;
    const combinedNoct = m.periods[0].nocturnalVolumeMl + m.periods[1].nocturnalVolumeMl;
    const combinedDenom = m.periods[0].twentyFourHV + m.periods[1].twentyFourHV;
    const combinedNPi = combinedDenom > 0 ? (combinedNoct / combinedDenom) * 100 : 0;
    const avvA = m.periods[0].avv;
    const avvB = m.periods[1].avv;
    const avvLow = Math.min(avvA ?? 0, avvB ?? 0);
    const avvHigh = Math.max(avvA ?? 0, avvB ?? 0);

    console.log('\n=== PATIENT A functional diagnosis ===');
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
