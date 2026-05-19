// FHIR R4 resource shape interfaces. Minimal subset emitted by this app.
//
// Why hand-rolled (not @types/fhir): the official FHIR types package is
// roughly 10MB of TypeScript covering ~150 resource types. We emit four
// resource types (Bundle, Patient, Observation, QuestionnaireResponse). A
// hand-rolled subset gives the planner audit benefit (small, reviewable
// surface) plus zero deps.
//
// PHI safety is enforced by the type system: FhirPatient deliberately omits
// name, address, telecom, communication, gender, photo, contact,
// maritalStatus, multipleBirth, deceased, generalPractitioner fields, so
// any code path that tries to set them is a TypeScript compile error.
//
// 13-02 will replace the FhirQuestionnaireResponse stub with a fully-typed
// interface; the BundleEntry union does not change shape because the union
// literal still resolves to FhirQuestionnaireResponse.

/** A reference triple naming a value in a coded system (LOINC/SNOMED/UCUM). */
export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

/** A wrapper around a coding[] array. The FHIR R4 way to express "this means X". */
export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

/** A reference to another resource within the Bundle (e.g. "Patient/patient-1"). */
export interface FhirReference {
  reference: string;
}

/** UCUM-strict 4-field quantity. ALL fields required to satisfy Epic's pipeline. */
export interface FhirQuantity {
  value: number;
  unit: string;
  system: string;
  code: string;
}

/** Identifier for a patient. Constrained to the FHIR-R4 spec-defined `use` values. */
export interface FhirIdentifier {
  use: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  system?: string;
  value: string;
}

/** PHI-safe skeletal Patient.
 *
 * CRITICAL: NO `name`, `address`, `telecom`, `communication`, `gender` fields.
 * The interface deliberately makes those fields a TypeScript compile error if
 * any code tries to set them.
 */
export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  birthDate?: string;
  identifier?: FhirIdentifier[];
  // Intentionally omitted (PHI safety, enforced by type system):
  //   name, address, telecom, communication, gender, photo, contact,
  //   maritalStatus, multipleBirth, deceased, generalPractitioner.
}

/** One Observation. status='final' literal (patient submitted; observations are final). */
export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final';
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime: string;
  valueQuantity?: FhirQuantity;
  valueBoolean?: boolean;
  valueCodeableConcept?: FhirCodeableConcept;
  note?: { text: string }[];
}

/** Stub for 13-01. 13-02 fleshes this out with IPC clinical metrics + per-day
 *  diary structure. Kept as an open index signature so the BundleEntry union
 *  compiles in 13-01 without forcing 13-02's shape decisions now. */
export interface FhirQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  [k: string]: unknown;
}

/** One entry in the Bundle. fullUrl is `urn:uuid:<crypto.randomUUID()>`. */
export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirPatient | FhirObservation | FhirQuestionnaireResponse;
}

/** The top-level Bundle wrapping all resources for one diary export. */
export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'collection';
  timestamp: string;
  entry: FhirBundleEntry[];
}
