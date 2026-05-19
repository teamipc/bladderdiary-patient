// Patient resource builder. PHI-safe by construction.
//
// Privacy invariants (FHIR-EX-03, per RESEARCH §Pitfalls 3 + 4):
//   1. birthDate is YEAR ONLY (4-char string like '1971'). Day-precision DOB
//      is full-PHI under HIPAA Safe Harbor § 164.514(b)(2)(i)(C).
//   2. identifier is emitted ONLY when clinicCode passes the same regex the
//      store validates against. Shape is TRACKING-typed (NOT MRN-shaped) to
//      avoid the Epic "duplicate patient via matched tracking code" trap.
//   3. No name, address, telecom, communication, or gender fields. These
//      are absent from the FhirPatient interface, so TypeScript enforces
//      the omission at compile time as well as runtime.
//
// The clinician fills in real PHI when they upload into their EHR. This
// app's role is patient-side data capture, not identity assertion.

import type { DiaryState } from '../types';
import type { FhirPatient } from './types';
import { CLINIC_CODE } from './loinc';

/** Regex re-applied here as defense in depth. Store also validates at ingest. */
const CLINIC_CODE_REGEX = /^[A-Za-z0-9-]{1,32}$/;

export function buildPatient(state: DiaryState): FhirPatient {
  const patient: FhirPatient = {
    resourceType: 'Patient',
    id: 'patient-1',
  };

  if (state.age !== null) {
    // YEAR ONLY. Safe Harbor compliant. Never use toISOString().slice(0, 10).
    const year = new Date().getFullYear() - state.age;
    patient.birthDate = String(year);
  }

  if (state.clinicCode !== null && CLINIC_CODE_REGEX.test(state.clinicCode)) {
    patient.identifier = [
      {
        use: 'secondary',
        type: {
          coding: [
            {
              system: CLINIC_CODE.TYPE_CODESYSTEM,
              code: CLINIC_CODE.TYPE_CODE,
              display: CLINIC_CODE.TYPE_DISPLAY,
            },
          ],
        },
        system: CLINIC_CODE.SYSTEM,
        value: state.clinicCode,
      },
    ];
  }

  return patient;
}
