// Clinical-code constants registry for the FHIR R4 Bundle.
//
// Single source of truth for LOINC/SNOMED/UCUM codes the per-resource
// builders reference. Verified against RESEARCH §LOINC Code Decision
// Matrix dated 2026-05-18.
//
// CONTEXT.md's candidates 19153-6 (specimen-class, WRONG), 9192-6
// (24-hour aggregate, WRONG), and 8657-8 (does not exist in LOINC,
// WRONG) are explicitly NOT used here. See RESEARCH §Pitfalls 1.
//
// Updating a code: change ONLY the value here; the per-resource builders
// import these constants by name, never hard-code strings inline.

/** LOINC code system constants + the 3 verified codes the FHIR module emits. */
export const LOINC = {
  SYSTEM: 'http://loinc.org',
  // Voids. Per RESEARCH §LOINC matrix row 1 (PICK 9187-6, Class=IO_OUTPUT).
  URINE_OUTPUT_POINT: '9187-6',
  URINE_OUTPUT_DISPLAY: 'Urine output',
  // Drinks. Per RESEARCH §LOINC matrix row 2 (PICK 8999-5, point-in-time estimated).
  FLUID_INTAKE_ORAL_ESTIMATED: '8999-5',
  FLUID_INTAKE_DISPLAY: 'Fluid intake oral Estimated',
  // Leaks (SECONDARY coding; SNOMED is primary per RESEARCH §LOINC matrix row 3).
  INCONTINENCE_TOTAL: '28232-7',
  INCONTINENCE_DISPLAY: 'Total urinary incontinence',
} as const;

/** SNOMED CT. Primary leak finding code. */
export const SNOMED = {
  SYSTEM: 'http://snomed.info/sct',
  URINARY_INCONTINENCE: '162172004',
  URINARY_INCONTINENCE_DISPLAY: 'Urinary incontinence',
} as const;

/** UCUM (Unified Code for Units of Measure). Mandatory on every valueQuantity. */
export const UCUM = {
  SYSTEM: 'http://unitsofmeasure.org',
  ML: 'mL',
} as const;

/** FHIR R4 observation-category code system + the two values we use. */
export const OBS_CATEGORY = {
  SYSTEM: 'http://terminology.hl7.org/CodeSystem/observation-category',
  ACTIVITY: 'activity',
  ACTIVITY_DISPLAY: 'Activity',
  EXAM: 'exam',
  EXAM_DISPLAY: 'Exam',
} as const;

/** Our custom CodeSystem URLs for Patient.identifier (tracking code, never PHI). */
export const CLINIC_CODE = {
  SYSTEM: 'https://myflowcheck.com/clinic-code',
  TYPE_CODESYSTEM: 'https://myflowcheck.com/codesystem/identifier-type',
  TYPE_CODE: 'TRACKING',
  TYPE_DISPLAY: 'Clinic-assigned tracking code, not a medical record identifier',
} as const;
