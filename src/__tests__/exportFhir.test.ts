/**
 * FHIR R4 generator core. Spec for Phase 13 Plan 1.
 *
 * Locks behaviors from the 5 PLAN.md tasks:
 *   Task 1: types.ts. FHIR R4 shape interfaces (PHI-safe by construction).
 *   Task 2: loinc.ts. Code system constants (LOINC/SNOMED/UCUM + custom).
 *   Task 3: patient.ts. buildPatient(state). year-only birthDate + tracking
 *           identifier.
 *   Task 4: observations.ts. buildVoidObservation / buildDrinkObservation /
 *           buildLeakObservation.
 *   Task 5: index.ts. generateFhirBundle(state). Bundle orchestrator + barrel.
 *
 * Coverage philosophy: shape + invariant checks that catch the high-risk
 * regressions called out in the plan's `<behavior>` blocks. Full schema
 * validation comes in 13-02 via AJV + R4 schema.
 */

import { describe, it, expect } from 'vitest';
import type { DiaryState, VoidEntry, DrinkEntry, LeakEntry } from '@/lib/types';
import {
  generateFhirBundle,
  buildPatient,
  buildVoidObservation,
  buildDrinkObservation,
  buildLeakObservation,
  type FhirBundle,
  type FhirObservation,
  type FhirPatient,
} from '@/lib/exportFhir';
import {
  LOINC,
  SNOMED,
  UCUM,
  OBS_CATEGORY,
  CLINIC_CODE,
} from '@/lib/exportFhir/loinc';

const TZ = 'Asia/Singapore';
const START = '2026-05-15';

function baseState(overrides: Partial<DiaryState> = {}): DiaryState {
  return {
    startDate: START,
    age: null,
    voids: [],
    drinks: [],
    leaks: [],
    bedtimes: [],
    wakeTimes: [],
    volumeUnit: 'mL',
    hapticEnabled: true,
    diaryStarted: true,
    clinicCode: null,
    timeZone: TZ,
    morningAnchor: null,
    day1CelebrationShown: true,
    fmvTooltipShown: false,
    ...overrides,
  };
}

function voidEntry(overrides: Partial<VoidEntry> & { id: string }): VoidEntry {
  return {
    timestampIso: '2026-05-15T08:30:00Z',
    volumeMl: 250,
    sensation: null,
    leak: false,
    note: '',
    isFirstMorningVoid: false,
    ...overrides,
  };
}

function drinkEntry(overrides: Partial<DrinkEntry> & { id: string }): DrinkEntry {
  return {
    timestampIso: '2026-05-15T09:00:00Z',
    volumeMl: 240,
    drinkType: 'water',
    note: '',
    ...overrides,
  };
}

function leakEntry(overrides: Partial<LeakEntry> & { id: string }): LeakEntry {
  return {
    timestampIso: '2026-05-15T15:00:00Z',
    trigger: 'cough',
    urgencyBeforeLeak: null,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Task 2 — loinc.ts: code system constants
// ────────────────────────────────────────────────────────────────────────────

describe('Task 2 (loinc.ts): LOINC/SNOMED/UCUM/custom code constants', () => {
  it('LOINC system + the three verified codes resolve to the locked values', () => {
    expect(LOINC.SYSTEM).toBe('http://loinc.org');
    expect(LOINC.URINE_OUTPUT_POINT).toBe('9187-6');
    expect(LOINC.URINE_OUTPUT_DISPLAY).toBe('Urine output');
    expect(LOINC.FLUID_INTAKE_ORAL_ESTIMATED).toBe('8999-5');
    expect(LOINC.FLUID_INTAKE_DISPLAY).toBe('Fluid intake oral Estimated');
    expect(LOINC.INCONTINENCE_TOTAL).toBe('28232-7');
    expect(LOINC.INCONTINENCE_DISPLAY).toBe('Total urinary incontinence');
  });

  it('SNOMED system + leak primary code resolve', () => {
    expect(SNOMED.SYSTEM).toBe('http://snomed.info/sct');
    expect(SNOMED.URINARY_INCONTINENCE).toBe('162172004');
    expect(SNOMED.URINARY_INCONTINENCE_DISPLAY).toBe('Urinary incontinence');
  });

  it('UCUM system + mL code resolve', () => {
    expect(UCUM.SYSTEM).toBe('http://unitsofmeasure.org');
    expect(UCUM.ML).toBe('mL');
  });

  it('OBS_CATEGORY system + activity/exam codes resolve', () => {
    expect(OBS_CATEGORY.SYSTEM).toBe(
      'http://terminology.hl7.org/CodeSystem/observation-category',
    );
    expect(OBS_CATEGORY.ACTIVITY).toBe('activity');
    expect(OBS_CATEGORY.EXAM).toBe('exam');
  });

  it('CLINIC_CODE constants for Patient.identifier are TRACKING-typed', () => {
    expect(CLINIC_CODE.SYSTEM).toBe('https://myflowcheck.com/clinic-code');
    expect(CLINIC_CODE.TYPE_CODESYSTEM).toBe(
      'https://myflowcheck.com/codesystem/identifier-type',
    );
    expect(CLINIC_CODE.TYPE_CODE).toBe('TRACKING');
    expect(CLINIC_CODE.TYPE_DISPLAY).toBe(
      'Clinic-assigned tracking code, not a medical record identifier',
    );
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Task 3 — patient.ts: buildPatient(state)
// ────────────────────────────────────────────────────────────────────────────

describe('Task 3 (patient.ts): buildPatient', () => {
  it('returns resourceType="Patient" and id="patient-1"', () => {
    const p = buildPatient(baseState());
    expect(p.resourceType).toBe('Patient');
    expect(p.id).toBe('patient-1');
  });

  it('emits year-only birthDate when age is set', () => {
    const p = buildPatient(baseState({ age: 55 }));
    const expectedYear = String(new Date().getFullYear() - 55);
    expect(p.birthDate).toBe(expectedYear);
    expect(p.birthDate).toMatch(/^\d{4}$/);
    // Defensively check: never day-precision like '1971-01-01'.
    expect(p.birthDate).not.toContain('-');
  });

  it('omits birthDate entirely when age is null', () => {
    const p = buildPatient(baseState({ age: null }));
    expect(p.birthDate).toBeUndefined();
    expect('birthDate' in p ? p.birthDate : undefined).toBeUndefined();
  });

  it('omits identifier when clinicCode is null', () => {
    const p = buildPatient(baseState({ clinicCode: null }));
    expect(p.identifier).toBeUndefined();
  });

  it('emits TRACKING-shaped identifier when clinicCode is valid', () => {
    const p = buildPatient(baseState({ clinicCode: 'IPC-2026' }));
    expect(p.identifier).toBeDefined();
    expect(p.identifier).toHaveLength(1);
    const id = p.identifier![0];
    expect(id.use).toBe('secondary');
    expect(id.type?.coding[0].system).toBe(
      'https://myflowcheck.com/codesystem/identifier-type',
    );
    expect(id.type?.coding[0].code).toBe('TRACKING');
    expect(id.type?.coding[0].display).toBe(
      'Clinic-assigned tracking code, not a medical record identifier',
    );
    expect(id.system).toBe('https://myflowcheck.com/clinic-code');
    expect(id.value).toBe('IPC-2026');
  });

  it('rejects invalid clinicCode (defense in depth)', () => {
    const p = buildPatient(baseState({ clinicCode: 'has spaces!' }));
    expect(p.identifier).toBeUndefined();
  });

  it('PHI audit: returned object has only PHI-safe keys', () => {
    const p = buildPatient(baseState({ age: 55, clinicCode: 'CODE-1' }));
    const keys = Object.keys(p).sort();
    // Allowed: resourceType, id, birthDate, identifier. Nothing else.
    const allowed = ['birthDate', 'id', 'identifier', 'resourceType'];
    expect(keys).toEqual(allowed);
    // Explicit anti-PHI check.
    const pAsRecord = p as unknown as Record<string, unknown>;
    expect(pAsRecord.name).toBeUndefined();
    expect(pAsRecord.address).toBeUndefined();
    expect(pAsRecord.telecom).toBeUndefined();
    expect(pAsRecord.communication).toBeUndefined();
    expect(pAsRecord.gender).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Task 4 — observations.ts: builders
// ────────────────────────────────────────────────────────────────────────────

describe('Task 4 (observations.ts): buildVoidObservation', () => {
  it('produces correct shape for a basic void event', () => {
    const v = voidEntry({
      id: 'void-1',
      timestampIso: '2026-05-18T08:30:00Z',
      volumeMl: 250,
      isFirstMorningVoid: true,
    });
    const obs = buildVoidObservation(v, 'patient-1');

    expect(obs.resourceType).toBe('Observation');
    expect(obs.id).toBe('void-void-1');
    expect(obs.status).toBe('final');
    expect(obs.category[0].coding[0].code).toBe('activity');
    expect(obs.code.coding[0].system).toBe('http://loinc.org');
    expect(obs.code.coding[0].code).toBe('9187-6');
    expect(obs.code.coding[0].display).toBe('Urine output');
    expect(obs.subject.reference).toBe('Patient/patient-1');
    expect(obs.effectiveDateTime).toBe('2026-05-18T08:30:00Z');

    expect(obs.valueQuantity).toBeDefined();
    expect(obs.valueQuantity!.value).toBe(250);
    expect(obs.valueQuantity!.unit).toBe('mL');
    expect(obs.valueQuantity!.system).toBe('http://unitsofmeasure.org');
    expect(obs.valueQuantity!.code).toBe('mL');
  });

  it('combines doubleVoidMl into the valueQuantity', () => {
    const v = voidEntry({ id: 'v-1', volumeMl: 250, doubleVoidMl: 80 });
    const obs = buildVoidObservation(v, 'patient-1');
    expect(obs.valueQuantity!.value).toBe(330);
  });

  it('treats undefined doubleVoidMl as 0 (nullish-coalesce)', () => {
    const v = voidEntry({ id: 'v-1', volumeMl: 200 });
    expect(v.doubleVoidMl).toBeUndefined();
    const obs = buildVoidObservation(v, 'patient-1');
    expect(obs.valueQuantity!.value).toBe(200);
  });

  it('includes Observation.note only when v.note is non-empty (after trim)', () => {
    const empty = buildVoidObservation(voidEntry({ id: 'v-1', note: '' }), 'patient-1');
    expect(empty.note).toBeUndefined();

    const whitespace = buildVoidObservation(
      voidEntry({ id: 'v-2', note: '   ' }),
      'patient-1',
    );
    expect(whitespace.note).toBeUndefined();

    const text = buildVoidObservation(
      voidEntry({ id: 'v-3', note: 'felt urgent' }),
      'patient-1',
    );
    expect(text.note).toEqual([{ text: 'felt urgent' }]);
  });
});

describe('Task 4 (observations.ts): buildDrinkObservation', () => {
  it('produces correct shape with LOINC 8999-5', () => {
    const d = drinkEntry({
      id: 'drink-1',
      timestampIso: '2026-05-18T09:15:00Z',
      volumeMl: 240,
      drinkType: 'coffee',
    });
    const obs = buildDrinkObservation(d, 'patient-1');

    expect(obs.id).toBe('drink-drink-1');
    expect(obs.code.coding[0].code).toBe('8999-5');
    expect(obs.code.coding[0].display).toBe('Fluid intake oral Estimated');
    expect(obs.category[0].coding[0].code).toBe('activity');
    expect(obs.valueQuantity!.value).toBe(240);
    expect(obs.valueQuantity!.unit).toBe('mL');
    expect(obs.valueQuantity!.system).toBe('http://unitsofmeasure.org');
    expect(obs.valueQuantity!.code).toBe('mL');
    expect(obs.subject.reference).toBe('Patient/patient-1');
    expect(obs.effectiveDateTime).toBe('2026-05-18T09:15:00Z');
  });

  it('uses canonical mL regardless of UI volumeUnit setting (no leak into FHIR)', () => {
    // The volumeMl on the entry IS already canonical mL (storage convention).
    // Even when state.volumeUnit is 'oz', the FHIR payload is mL.
    const d = drinkEntry({ id: 'd-1', volumeMl: 300 });
    const obs = buildDrinkObservation(d, 'patient-1');
    expect(obs.valueQuantity!.unit).toBe('mL');
    expect(obs.valueQuantity!.code).toBe('mL');
    // No 'oz' anywhere in the serialized output.
    expect(JSON.stringify(obs)).not.toContain('oz');
    expect(JSON.stringify(obs)).not.toContain('[oz_fl_us]');
  });

  it('includes Observation.note only when d.note is non-empty', () => {
    const empty = buildDrinkObservation(drinkEntry({ id: 'd-1', note: '' }), 'patient-1');
    expect(empty.note).toBeUndefined();

    const text = buildDrinkObservation(
      drinkEntry({ id: 'd-2', note: 'with milk' }),
      'patient-1',
    );
    expect(text.note).toEqual([{ text: 'with milk' }]);
  });
});

describe('Task 4 (observations.ts): buildLeakObservation', () => {
  it('produces correct shape with dual coding (SNOMED PRIMARY + LOINC SECONDARY)', () => {
    const l = leakEntry({
      id: 'leak-1',
      timestampIso: '2026-05-18T15:00:00Z',
      trigger: 'cough',
      urgencyBeforeLeak: null,
    });
    const obs = buildLeakObservation(l, 'patient-1');

    expect(obs.id).toBe('leak-leak-1');
    expect(obs.status).toBe('final');
    expect(obs.category[0].coding[0].code).toBe('exam');

    // Dual coding: SNOMED first, LOINC second.
    expect(obs.code.coding).toHaveLength(2);
    expect(obs.code.coding[0]).toEqual({
      system: 'http://snomed.info/sct',
      code: '162172004',
      display: 'Urinary incontinence',
    });
    expect(obs.code.coding[1]).toEqual({
      system: 'http://loinc.org',
      code: '28232-7',
      display: 'Total urinary incontinence',
    });

    expect(obs.subject.reference).toBe('Patient/patient-1');
    expect(obs.effectiveDateTime).toBe('2026-05-18T15:00:00Z');

    // No valueQuantity. The event itself is the assertion.
    expect(obs.valueQuantity).toBeUndefined();
  });

  it('surfaces trigger via Observation.note', () => {
    const l = leakEntry({ id: 'l-1', trigger: 'cough' });
    const obs = buildLeakObservation(l, 'patient-1');
    expect(obs.note).toBeDefined();
    expect(obs.note![0].text).toBe('Trigger: cough');
  });

  it('appends notes (plural) to the trigger text when present', () => {
    const l = leakEntry({ id: 'l-1', trigger: 'sneeze', notes: 'mid-meeting' });
    const obs = buildLeakObservation(l, 'patient-1');
    expect(obs.note![0].text).toBe('Trigger: sneeze | mid-meeting');
  });

  it('omits empty/whitespace notes from the appended text', () => {
    const l1 = leakEntry({ id: 'l-1', trigger: 'cough', notes: '' });
    expect(buildLeakObservation(l1, 'patient-1').note![0].text).toBe('Trigger: cough');

    const l2 = leakEntry({ id: 'l-2', trigger: 'cough', notes: '   ' });
    expect(buildLeakObservation(l2, 'patient-1').note![0].text).toBe('Trigger: cough');

    const l3 = leakEntry({ id: 'l-3', trigger: 'cough' });
    expect(l3.notes).toBeUndefined();
    expect(buildLeakObservation(l3, 'patient-1').note![0].text).toBe('Trigger: cough');
  });
});

describe('Task 4 (observations.ts): ID prefixing prevents cross-type collisions', () => {
  it('void/drink/leak with the same source id get distinct Observation ids', () => {
    const v = buildVoidObservation(voidEntry({ id: 'abc' }), 'patient-1');
    const d = buildDrinkObservation(drinkEntry({ id: 'abc' }), 'patient-1');
    const l = buildLeakObservation(leakEntry({ id: 'abc' }), 'patient-1');

    expect(v.id).toBe('void-abc');
    expect(d.id).toBe('drink-abc');
    expect(l.id).toBe('leak-abc');
    expect(new Set([v.id, d.id, l.id]).size).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Task 5 — index.ts: generateFhirBundle orchestrator
// ────────────────────────────────────────────────────────────────────────────

describe('Task 5 (index.ts): generateFhirBundle', () => {
  it('returns Bundle of type "collection" with ISO 8601 timestamp', () => {
    const b: FhirBundle = generateFhirBundle(baseState());
    expect(b.resourceType).toBe('Bundle');
    expect(b.type).toBe('collection');
    expect(b.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
  });

  it('orders entries: Patient, QuestionnaireResponse, then Observations', () => {
    const state = baseState({
      voids: [voidEntry({ id: 'v-1' }), voidEntry({ id: 'v-2' })],
      drinks: [drinkEntry({ id: 'd-1' })],
      leaks: [leakEntry({ id: 'l-1' })],
    });
    const b = generateFhirBundle(state);

    expect(b.entry[0].resource.resourceType).toBe('Patient');
    // 13-02 inserts QR at entry[1] between Patient and Observations.
    expect(b.entry[1].resource.resourceType).toBe('QuestionnaireResponse');
    // Then observations in deterministic order: voids, drinks, leaks.
    expect(b.entry[2].resource.resourceType).toBe('Observation');
    expect((b.entry[2].resource as FhirObservation).id).toBe('void-v-1');
    expect((b.entry[3].resource as FhirObservation).id).toBe('void-v-2');
    expect((b.entry[4].resource as FhirObservation).id).toBe('drink-d-1');
    expect((b.entry[5].resource as FhirObservation).id).toBe('leak-l-1');
  });

  it('entry count is 2 + N voids + M drinks + L leaks (Patient + QR + Observations)', () => {
    const state = baseState({
      voids: [voidEntry({ id: 'v-1' }), voidEntry({ id: 'v-2' }), voidEntry({ id: 'v-3' })],
      drinks: [drinkEntry({ id: 'd-1' })],
      leaks: [leakEntry({ id: 'l-1' }), leakEntry({ id: 'l-2' })],
    });
    const b = generateFhirBundle(state);
    expect(b.entry).toHaveLength(2 + 3 + 1 + 2);
  });

  it('every entry has a unique urn:uuid: fullUrl', () => {
    const state = baseState({
      voids: [voidEntry({ id: 'v-1' }), voidEntry({ id: 'v-2' })],
      drinks: [drinkEntry({ id: 'd-1' })],
      leaks: [leakEntry({ id: 'l-1' })],
    });
    const b = generateFhirBundle(state);
    const uuidRegex = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const entry of b.entry) {
      expect(entry.fullUrl).toMatch(uuidRegex);
    }
    const uniqueUrls = new Set(b.entry.map((e) => e.fullUrl));
    expect(uniqueUrls.size).toBe(b.entry.length);
  });

  it('every Observation references the Patient by id (no dangling references)', () => {
    const state = baseState({
      voids: [voidEntry({ id: 'v-1' })],
      drinks: [drinkEntry({ id: 'd-1' })],
      leaks: [leakEntry({ id: 'l-1' })],
    });
    const b = generateFhirBundle(state);
    const patient = b.entry[0].resource as FhirPatient;
    expect(patient.id).toBe('patient-1');
    // Observations start at index 2 after 13-02 inserts the QR at index 1.
    for (let i = 2; i < b.entry.length; i++) {
      const obs = b.entry[i].resource as FhirObservation;
      expect(obs.subject.reference).toBe(`Patient/${patient.id}`);
    }
  });

  it('does not leak volumeUnit "oz" into the FHIR payload', () => {
    const state = baseState({
      volumeUnit: 'oz',
      voids: [voidEntry({ id: 'v-1', volumeMl: 250 })],
      drinks: [drinkEntry({ id: 'd-1', volumeMl: 300 })],
    });
    const b = generateFhirBundle(state);
    const json = JSON.stringify(b);
    expect(json).not.toContain('"oz"');
    expect(json).not.toContain('[oz_fl_us]');
    // Every valueQuantity in the bundle has unit 'mL'.
    for (const entry of b.entry) {
      const r = entry.resource as FhirObservation;
      if (r.resourceType === 'Observation' && r.valueQuantity) {
        expect(r.valueQuantity.unit).toBe('mL');
        expect(r.valueQuantity.code).toBe('mL');
      }
    }
  });

  it('Bundle with empty state produces Patient + QR entries (13-02: QR always present)', () => {
    const b = generateFhirBundle(baseState());
    expect(b.entry).toHaveLength(2);
    expect(b.entry[0].resource.resourceType).toBe('Patient');
    expect(b.entry[1].resource.resourceType).toBe('QuestionnaireResponse');
  });

  it('JSON.stringify round-trips without loss', () => {
    const state = baseState({
      age: 55,
      clinicCode: 'IPC-2026',
      voids: [voidEntry({ id: 'v-1', volumeMl: 250, doubleVoidMl: 80 })],
      drinks: [drinkEntry({ id: 'd-1', volumeMl: 300, note: 'water' })],
      leaks: [leakEntry({ id: 'l-1', trigger: 'cough', notes: 'mid-meeting' })],
    });
    const b = generateFhirBundle(state);
    const roundTrip = JSON.parse(JSON.stringify(b)) as FhirBundle;
    expect(roundTrip.resourceType).toBe('Bundle');
    expect(roundTrip.type).toBe('collection');
    expect(roundTrip.entry).toHaveLength(b.entry.length);

    const patient = roundTrip.entry[0].resource as FhirPatient;
    expect(patient.birthDate).toBe(String(new Date().getFullYear() - 55));
    expect(patient.identifier![0].value).toBe('IPC-2026');

    // After 13-02 inserts QR at entry[1], voids start at entry[2].
    const voidObs = roundTrip.entry[2].resource as FhirObservation;
    expect(voidObs.valueQuantity!.value).toBe(330);
  });
});
