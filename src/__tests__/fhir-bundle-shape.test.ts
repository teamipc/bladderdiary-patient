// FHIR Bundle shape + PHI audit + locked-code invariants.
//
// Runs without AJV (no schema validation here. That's fhir-validate.test.ts).
// Asserts the contract locked in 13-01 (Bundle shape, LOINC/SNOMED codes,
// UCUM canonical mL, PHI-safe Patient, ID prefix scheme) plus the QR shape
// locked in 13-02 (linkId catalog, null-metric handling, bedtime/wake items).
//
// Designed to fail fast and clearly. Each `expect` includes a message
// pointing to which 13-NN plan owns the contract that broke.

import { describe, it, expect } from 'vitest';
import { generateFhirBundle } from '@/lib/exportFhir';
import type {
  FhirPatient,
  FhirObservation,
  FhirQuestionnaireResponse,
} from '@/lib/exportFhir';
import type { DiaryState } from '@/lib/types';

function buildMinimalDiaryState(overrides: Partial<DiaryState> = {}): DiaryState {
  const base: DiaryState = {
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
    voids: [
      {
        id: 'v1',
        timestampIso: '2026-05-18T08:30:00.000Z',
        volumeMl: 250,
        sensation: null,
        leak: false,
        note: '',
        isFirstMorningVoid: true,
      },
      {
        id: 'v2',
        timestampIso: '2026-05-19T07:15:00.000Z',
        volumeMl: 300,
        doubleVoidMl: 80,
        sensation: null,
        leak: false,
        note: '',
        isFirstMorningVoid: true,
      },
      {
        id: 'v3',
        timestampIso: '2026-05-20T08:00:00.000Z',
        volumeMl: 280,
        sensation: null,
        leak: false,
        note: '',
        isFirstMorningVoid: true,
      },
    ],
    drinks: [
      {
        id: 'd1',
        timestampIso: '2026-05-18T09:00:00.000Z',
        volumeMl: 240,
        drinkType: 'coffee',
        note: '',
      },
      {
        id: 'd2',
        timestampIso: '2026-05-19T09:00:00.000Z',
        volumeMl: 240,
        drinkType: 'water',
        note: '',
      },
      {
        id: 'd3',
        timestampIso: '2026-05-20T09:00:00.000Z',
        volumeMl: 200,
        drinkType: 'tea',
        note: '',
      },
    ],
    leaks: [
      {
        id: 'l1',
        timestampIso: '2026-05-19T15:00:00.000Z',
        trigger: 'cough',
        urgencyBeforeLeak: null,
      },
    ],
    bedtimes: [
      { id: 'b1', timestampIso: '2026-05-18T22:30:00.000Z', dayNumber: 1 },
      { id: 'b2', timestampIso: '2026-05-19T22:00:00.000Z', dayNumber: 2 },
      { id: 'b3', timestampIso: '2026-05-20T22:15:00.000Z', dayNumber: 3 },
    ],
    wakeTimes: [
      { id: 'w1', timestampIso: '2026-05-19T07:00:00.000Z', dayNumber: 1 },
      { id: 'w2', timestampIso: '2026-05-20T07:00:00.000Z', dayNumber: 2 },
      { id: 'w3', timestampIso: '2026-05-21T07:00:00.000Z', dayNumber: 3 },
    ],
  };
  return { ...base, ...overrides };
}

// The locked 16-item QR linkId catalog (per revised D-02; NBC dropped).
const LOCKED_QR_LINKIDS = new Set([
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
]);

describe('Bundle shape', () => {
  it('returns Bundle of type collection with ISO 8601 UTC timestamp', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    expect(b.resourceType, 'Bundle.resourceType per 13-01').toBe('Bundle');
    expect(b.type, 'Bundle.type per 13-01').toBe('collection');
    expect(b.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  });

  it('entry order is [Patient, QuestionnaireResponse, ...Observations]', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    expect(b.entry[0].resource.resourceType, 'Patient first per 13-01').toBe('Patient');
    expect(b.entry[1].resource.resourceType, 'QR at entry[1] per 13-02 D-12').toBe(
      'QuestionnaireResponse',
    );
    for (let i = 2; i < b.entry.length; i++) {
      expect(b.entry[i].resource.resourceType, `Observation at entry[${i}] per 13-01`).toBe(
        'Observation',
      );
    }
  });

  it('entry count is 2 + Nvoids + Mdrinks + Lleaks (= 2 + 3 + 3 + 1 = 9 for fixture)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    expect(b.entry, 'Bundle.entry length per fixture').toHaveLength(9);
  });

  it('every entry has urn:uuid fullUrl with unique UUIDs', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const uuidRegex = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const entry of b.entry) {
      expect(entry.fullUrl, 'urn:uuid fullUrl per 13-01').toMatch(uuidRegex);
    }
    const unique = new Set(b.entry.map((e) => e.fullUrl));
    expect(unique.size, 'fullUrls unique per 13-01').toBe(b.entry.length);
  });
});

describe('Patient PHI audit', () => {
  it('Patient has only resourceType + id + birthDate (when age, no clinicCode)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as FhirPatient;
    expect(Object.keys(patient).sort(), 'Patient key set per 13-01 PHI audit').toEqual([
      'birthDate',
      'id',
      'resourceType',
    ]);
  });

  it('birthDate is year-only string (4-char numeric, never day-precision)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as FhirPatient;
    expect(patient.birthDate, 'birthDate year-only per 13-01').toMatch(/^\d{4}$/);
    expect(patient.birthDate).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('no name field', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as unknown as Record<string, unknown>;
    expect(patient.name, 'no PHI name per 13-01').toBeUndefined();
  });

  it('no address field', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as unknown as Record<string, unknown>;
    expect(patient.address, 'no PHI address per 13-01').toBeUndefined();
  });

  it('no telecom field', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as unknown as Record<string, unknown>;
    expect(patient.telecom, 'no PHI telecom per 13-01').toBeUndefined();
  });

  it('no communication field', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as unknown as Record<string, unknown>;
    expect(patient.communication, 'no PHI communication per 13-01').toBeUndefined();
  });

  it('no gender field', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as unknown as Record<string, unknown>;
    expect(patient.gender, 'no PHI gender per 13-01').toBeUndefined();
  });

  it('identifier omitted when clinicCode is null', () => {
    const b = generateFhirBundle(buildMinimalDiaryState({ clinicCode: null }));
    const patient = b.entry[0].resource as FhirPatient;
    expect(patient.identifier, 'no identifier when clinicCode=null per 13-01').toBeUndefined();
  });

  it('identifier emitted with TRACKING-typed shape when clinicCode is valid', () => {
    const b = generateFhirBundle(buildMinimalDiaryState({ clinicCode: 'IPC-2026' }));
    const patient = b.entry[0].resource as FhirPatient;
    expect(patient.identifier, 'identifier shape per 13-01').toEqual([
      {
        use: 'secondary',
        type: {
          coding: [
            {
              system: 'https://myflowcheck.com/codesystem/identifier-type',
              code: 'TRACKING',
              display: 'Clinic-assigned tracking code, not a medical record identifier',
            },
          ],
        },
        system: 'https://myflowcheck.com/clinic-code',
        value: 'IPC-2026',
      },
    ]);
  });

  it('identifier omitted when clinicCode fails regex (contains space)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState({ clinicCode: 'has spaces!' }));
    const patient = b.entry[0].resource as FhirPatient;
    expect(patient.identifier, 'reject malformed clinicCode per 13-01').toBeUndefined();
  });
});

describe('Void Observation locked-code invariants', () => {
  it('all void observations use LOINC 9187-6 (not 19153-6 or 9192-6)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const voids = b.entry
      .map((e) => e.resource)
      .filter((r): r is FhirObservation =>
        r.resourceType === 'Observation' && r.id.startsWith('void-'),
      );
    expect(voids.length, 'at least one void observation').toBeGreaterThan(0);
    for (const o of voids) {
      expect(o.code.coding[0].code, 'LOINC 9187-6 per 13-01').toBe('9187-6');
      expect(o.code.coding[0].system).toBe('http://loinc.org');
    }
  });

  it('every void valueQuantity has all 4 UCUM fields (value/unit/system/code)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const voids = b.entry
      .map((e) => e.resource)
      .filter((r): r is FhirObservation =>
        r.resourceType === 'Observation' && r.id.startsWith('void-'),
      );
    for (const o of voids) {
      expect(o.valueQuantity, 'void has valueQuantity').toBeDefined();
      expect(Object.keys(o.valueQuantity!).sort(), 'UCUM 4 fields per 13-01').toEqual([
        'code',
        'system',
        'unit',
        'value',
      ]);
    }
  });

  it('volume always emits in mL regardless of state.volumeUnit', () => {
    const b = generateFhirBundle(buildMinimalDiaryState({ volumeUnit: 'oz' }));
    for (const entry of b.entry) {
      const r = entry.resource;
      if (r.resourceType === 'Observation' && r.valueQuantity) {
        expect(r.valueQuantity.unit, 'mL canonical per 13-01').toBe('mL');
        expect(r.valueQuantity.code).toBe('mL');
      }
    }
  });

  it('double-void combines volumes (v.volumeMl + v.doubleVoidMl)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const v2 = b.entry
      .map((e) => e.resource)
      .find((r): r is FhirObservation =>
        r.resourceType === 'Observation' && r.id === 'void-v2',
      );
    expect(v2, 'void-v2 observation').toBeDefined();
    expect(v2!.valueQuantity!.value, '300 + 80 combined per 13-01').toBe(380);
  });

  it('void ID prefix prevents cross-type collision', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const voids = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('void-'),
      );
    expect(voids.length, 'all voids prefixed void-').toBeGreaterThan(0);
  });
});

describe('Drink Observation locked-code invariants', () => {
  it('all drink observations use LOINC 8999-5 (not 8657-8)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const drinks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('drink-'),
      );
    expect(drinks.length, 'at least one drink observation').toBeGreaterThan(0);
    for (const o of drinks) {
      expect(o.code.coding[0].code, 'LOINC 8999-5 per 13-01').toBe('8999-5');
      expect(o.code.coding[0].system).toBe('http://loinc.org');
    }
  });

  it('every drink valueQuantity has all 4 UCUM fields', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const drinks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('drink-'),
      );
    for (const o of drinks) {
      expect(Object.keys(o.valueQuantity!).sort()).toEqual(['code', 'system', 'unit', 'value']);
    }
  });

  it('drink ID prefix is drink-', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const drinks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('drink-'),
      );
    expect(drinks.length).toBeGreaterThan(0);
  });
});

describe('Leak Observation locked-code invariants', () => {
  it('leak observations have dual coding: SNOMED 162172004 primary + LOINC 28232-7 secondary', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const leaks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('leak-'),
      );
    expect(leaks.length, 'at least one leak observation').toBeGreaterThan(0);
    for (const o of leaks) {
      expect(o.code.coding[0], 'SNOMED primary per 13-01').toEqual({
        system: 'http://snomed.info/sct',
        code: '162172004',
        display: 'Urinary incontinence',
      });
      expect(o.code.coding[1], 'LOINC secondary per 13-01').toEqual({
        system: 'http://loinc.org',
        code: '28232-7',
        display: 'Total urinary incontinence',
      });
    }
  });

  it('leak category is exam (not activity)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const leaks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('leak-'),
      );
    for (const o of leaks) {
      expect(o.category[0].coding[0].code, 'leak category=exam per 13-01').toBe('exam');
    }
  });

  it('leak Observation has no valueQuantity (event itself is the assertion)', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const leaks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('leak-'),
      );
    for (const o of leaks) {
      expect(o.valueQuantity, 'no leak valueQuantity per 13-01').toBeUndefined();
    }
  });

  it('leak Observation note carries the trigger text', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const leaks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('leak-'),
      );
    expect(leaks.length).toBeGreaterThan(0);
    for (const o of leaks) {
      expect(o.note, 'leak note present').toBeDefined();
      expect(o.note![0].text, 'leak note starts with Trigger: per 13-01').toMatch(/^Trigger: /);
      expect(o.note![0].text).toContain('cough');
    }
  });

  it('leak ID prefix is leak-', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const leaks = b.entry
      .map((e) => e.resource)
      .filter(
        (r): r is FhirObservation => r.resourceType === 'Observation' && r.id.startsWith('leak-'),
      );
    expect(leaks.length).toBeGreaterThan(0);
  });
});

describe('QuestionnaireResponse shape', () => {
  function getQr(state: DiaryState = buildMinimalDiaryState()): FhirQuestionnaireResponse {
    const b = generateFhirBundle(state);
    return b.entry[1].resource as FhirQuestionnaireResponse;
  }

  it('QR has status=completed, subject=Patient/<id>, authored=ISO UTC', () => {
    const qr = getQr();
    expect(qr.status, 'QR status per 13-02 D-02').toBe('completed');
    expect(qr.subject.reference, 'QR subject reference per 13-02').toBe('Patient/patient-1');
    expect(qr.authored, 'QR authored ISO UTC per 13-02 D-05').toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    );
  });

  it('QR has the locked 16-item linkId catalog (NBC dropped per revised D-02)', () => {
    const qr = getQr();
    const linkIds = new Set(qr.item.map((i) => i.linkId));
    expect(linkIds, 'QR linkId catalog per 13-02 D-02').toEqual(LOCKED_QR_LINKIDS);
    expect(qr.item, 'QR item count locked at 16 per 13-02').toHaveLength(16);
  });

  it('bedtime items have valueDateTime from BedtimeEntry.timestampIso', () => {
    const qr = getQr();
    const bed1 = qr.item.find((i) => i.linkId === 'qr-bedtime-day-1');
    expect(bed1?.answer?.[0]?.valueDateTime, 'bedtime pass-through per 13-02 D-05').toBe(
      '2026-05-18T22:30:00.000Z',
    );
  });

  it('wake items have valueDateTime from WakeTimeEntry.timestampIso', () => {
    const qr = getQr();
    const wake1 = qr.item.find((i) => i.linkId === 'qr-wake-day-1');
    expect(wake1?.answer?.[0]?.valueDateTime, 'wake pass-through per 13-02 D-05').toBe(
      '2026-05-19T07:00:00.000Z',
    );
  });

  it('missing bedtime emits item with empty answer + insufficiency text', () => {
    const state = buildMinimalDiaryState({
      bedtimes: [
        { id: 'b1', timestampIso: '2026-05-18T22:30:00.000Z', dayNumber: 1 },
        // day 2 + day 3 missing
      ],
    });
    const qr = getQr(state);
    const bed2 = qr.item.find((i) => i.linkId === 'qr-bedtime-day-2');
    expect(bed2?.answer, 'missing bedtime answer=[] per 13-02 D-03').toEqual([]);
    expect(bed2?.text, 'missing bedtime text per 13-02 D-03').toMatch(/No bedtime/);
  });

  it('missing wake emits item with empty answer + insufficiency text', () => {
    const state = buildMinimalDiaryState({
      wakeTimes: [
        { id: 'w1', timestampIso: '2026-05-19T07:00:00.000Z', dayNumber: 1 },
      ],
    });
    const qr = getQr(state);
    const wake3 = qr.item.find((i) => i.linkId === 'qr-wake-day-3');
    expect(wake3?.answer, 'missing wake answer=[] per 13-02 D-03').toEqual([]);
    expect(wake3?.text, 'missing wake text per 13-02 D-03').toMatch(/No wake time/);
  });

  it('age item is valueInteger when set', () => {
    const qr = getQr();
    const age = qr.item.find((i) => i.linkId === 'qr-diary-age');
    expect(age?.answer?.[0]?.valueInteger, 'age=valueInteger per 13-02').toBe(55);
  });

  it('null age emits item with empty answer + insufficiency text', () => {
    const qr = getQr(buildMinimalDiaryState({ age: null }));
    const age = qr.item.find((i) => i.linkId === 'qr-diary-age');
    expect(age?.answer, 'null age answer=[] per 13-02 D-03').toEqual([]);
    expect(age?.text, 'null age text per 13-02').toMatch(/No age/);
  });

  it('startdate item is valueString from state.startDate', () => {
    const qr = getQr();
    const sd = qr.item.find((i) => i.linkId === 'qr-diary-startdate');
    expect(sd?.answer?.[0]?.valueString, 'startdate=valueString per 13-02').toBe('2026-05-18');
  });

  it('timezone item is valueString from state.timeZone', () => {
    const qr = getQr();
    const tz = qr.item.find((i) => i.linkId === 'qr-diary-timezone');
    expect(tz?.answer?.[0]?.valueString, 'timezone=valueString per 13-02').toBe(
      'America/New_York',
    );
  });

  it('null period metric (Period 1 AVV adapter-excluded) emits empty answer + Insufficient text', () => {
    // Empty diary forces all PeriodMetrics to be absent. Both period AVV items must use
    // the insufficiency branch.
    const qr = getQr(
      buildMinimalDiaryState({ voids: [], drinks: [], leaks: [], bedtimes: [], wakeTimes: [] }),
    );
    const avv1 = qr.item.find((i) => i.linkId === 'qr-metric-avv-period1');
    expect(avv1?.answer, 'avv-period1 empty when no data per 13-02 D-03').toEqual([]);
    expect(avv1?.text, 'avv-period1 Insufficient text per 13-02 D-03').toMatch(/Insufficient/);
  });

  it('top-level MVV item always emits valueDecimal (never empty-answer)', () => {
    const qr = getQr();
    const mvv = qr.item.find((i) => i.linkId === 'qr-metric-mvv');
    expect(mvv?.answer, 'mvv answer present').toBeDefined();
    expect(mvv?.answer?.length, 'mvv answer has one entry').toBe(1);
    expect(mvv?.answer?.[0]?.valueDecimal, 'mvv valueDecimal per 13-02').toBeTypeOf('number');
  });

  it('catalog has NO qr-metric-nbc entry (deferred per revised D-02)', () => {
    const qr = getQr();
    const nbc = qr.item.find((i) => i.linkId === 'qr-metric-nbc');
    expect(nbc, 'NBC absent per 13-02 D-02').toBeUndefined();
  });

  it('catalog has NO per-day AVV entries (per-period only per revised D-02)', () => {
    const qr = getQr();
    const perDayAvv = qr.item.find((i) => /^qr-metric-avv-day/.test(i.linkId));
    expect(perDayAvv, 'no per-day AVV per 13-02 D-02').toBeUndefined();
  });

  it('catalog has NO per-day MVV entries (top-level only per revised D-02)', () => {
    const qr = getQr();
    const perDayMvv = qr.item.find((i) => /^qr-metric-mvv-day/.test(i.linkId));
    expect(perDayMvv, 'no per-day MVV per 13-02 D-02').toBeUndefined();
  });
});

describe('Cross-resource consistency', () => {
  it('every Observation.subject.reference === Patient/<patient.id>', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as FhirPatient;
    const obs = b.entry
      .map((e) => e.resource)
      .filter((r): r is FhirObservation => r.resourceType === 'Observation');
    for (const o of obs) {
      expect(o.subject.reference, 'Observation subject reference per 13-01').toBe(
        `Patient/${patient.id}`,
      );
    }
  });

  it('QR.subject.reference === Patient/<patient.id>', () => {
    const b = generateFhirBundle(buildMinimalDiaryState());
    const patient = b.entry[0].resource as FhirPatient;
    const qr = b.entry[1].resource as FhirQuestionnaireResponse;
    expect(qr.subject.reference, 'QR subject reference per 13-02').toBe(`Patient/${patient.id}`);
  });
});
