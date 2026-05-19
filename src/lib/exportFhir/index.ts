// FHIR R4 Bundle orchestrator + module barrel.
//
// Public entry: generateFhirBundle(state). A pure synchronous transform
// returning a fully-shaped Bundle ready for JSON.stringify. The
// exportPackage module (13-03) calls this, stringifies, and zips
// alongside PDF/CSV/README.
//
// Locale-neutral: no locale arg, because FHIR clinical terminology
// stays English per Epic/Cerner expectations (RESEARCH §Architectural
// Responsibility Map). The patient's UI locale influences only the
// README inside the zip, not the FHIR payload.
//
// Entry order (13-01 ships items 1 + 3):
//   1. Patient resource (always)
//   2. QuestionnaireResponse. IPC clinical metrics (added in 13-02)
//   3. Observation resources. One per VoidEntry, DrinkEntry, LeakEntry

import type { DiaryState } from '../types';
import type { FhirBundle, FhirBundleEntry } from './types';
import { buildPatient } from './patient';
import {
  buildVoidObservation,
  buildDrinkObservation,
  buildLeakObservation,
} from './observations';

/** Re-export the type module so callers can `import type { FhirBundle } from '@/lib/exportFhir'`. */
export type {
  FhirBundle,
  FhirBundleEntry,
  FhirPatient,
  FhirObservation,
  FhirQuestionnaireResponse,
  FhirCoding,
  FhirCodeableConcept,
  FhirReference,
  FhirQuantity,
  FhirIdentifier,
} from './types';

/** Re-export the builders so test code + future plans can import directly. */
export { buildPatient } from './patient';
export {
  buildVoidObservation,
  buildDrinkObservation,
  buildLeakObservation,
} from './observations';

/**
 * Build a FHIR R4 collection Bundle from a DiaryState snapshot.
 *
 * Synchronous + pure. Does NOT take a locale: clinical terminology stays
 * English regardless of patient UI locale (per Epic/Cerner expectations).
 */
export function generateFhirBundle(state: DiaryState): FhirBundle {
  const patient = buildPatient(state);

  // 13-02 will insert the QuestionnaireResponse entry here (between Patient
  // and the Observations). The extension point is: build qrEntry above the
  // observationEntries, then concat [patientEntry, qrEntry, ...observationEntries].
  // 13-01 omits the QR entry. Bundle is still a valid collection with just
  // Patient + Observations.

  const observations = [
    ...state.voids.map((v) => buildVoidObservation(v, patient.id)),
    ...state.drinks.map((d) => buildDrinkObservation(d, patient.id)),
    ...state.leaks.map((l) => buildLeakObservation(l, patient.id)),
  ];

  const patientEntry: FhirBundleEntry = {
    fullUrl: `urn:uuid:${crypto.randomUUID()}`,
    resource: patient,
  };
  const observationEntries: FhirBundleEntry[] = observations.map((o) => ({
    fullUrl: `urn:uuid:${crypto.randomUUID()}`,
    resource: o,
  }));

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: [patientEntry, ...observationEntries],
  };
}
