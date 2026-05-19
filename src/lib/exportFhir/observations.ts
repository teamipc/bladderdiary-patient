// Per-event Observation resource builders.
//
// One Observation per VoidEntry, DrinkEntry, LeakEntry. Codes per
// RESEARCH §LOINC Code Decision Matrix (verified 2026-05-18):
//   Void:  LOINC 9187-6 "Urine output" (IO_OUTPUT class)
//   Drink: LOINC 8999-5 "Fluid intake oral Estimated" (point-in-time)
//   Leak:  SNOMED 162172004 (PRIMARY) + LOINC 28232-7 (SECONDARY)
//
// valueQuantity always emits the canonical mL value from storage. The
// user's volumeUnit display preference is UI-only and does not leak
// into the clinical payload (RESEARCH §Anti-Patterns).
//
// valueQuantity MUST have all 4 UCUM fields (value/unit/system/code).
// Two-field { value, unit } is technically valid FHIR but Epic's
// UCUM-strict pipeline silently drops the value (RESEARCH §Pitfall 2).

import type { VoidEntry, DrinkEntry, LeakEntry } from '../types';
import type { FhirObservation, FhirCodeableConcept, FhirQuantity } from './types';
import { LOINC, SNOMED, UCUM, OBS_CATEGORY } from './loinc';

/** Builds a single-coding CodeableConcept. The common case for category. */
function singleCoding(system: string, code: string, display: string): FhirCodeableConcept {
  return { coding: [{ system, code, display }] };
}

/** Builds the 'activity' category. Used by voids and drinks. */
function activityCategory(): FhirCodeableConcept[] {
  return [singleCoding(OBS_CATEGORY.SYSTEM, OBS_CATEGORY.ACTIVITY, OBS_CATEGORY.ACTIVITY_DISPLAY)];
}

/** Builds the 'exam' category. Used by leaks. */
function examCategory(): FhirCodeableConcept[] {
  return [singleCoding(OBS_CATEGORY.SYSTEM, OBS_CATEGORY.EXAM, OBS_CATEGORY.EXAM_DISPLAY)];
}

/** Builds the canonical UCUM mL quantity. */
function mlQuantity(value: number): FhirQuantity {
  return { value, unit: UCUM.ML, system: UCUM.SYSTEM, code: UCUM.ML };
}

/** Build a FHIR Observation for one void event. */
export function buildVoidObservation(v: VoidEntry, patientId: string): FhirObservation {
  const obs: FhirObservation = {
    resourceType: 'Observation',
    id: `void-${v.id}`,
    status: 'final',
    category: activityCategory(),
    code: singleCoding(LOINC.SYSTEM, LOINC.URINE_OUTPUT_POINT, LOINC.URINE_OUTPUT_DISPLAY),
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: v.timestampIso,
    valueQuantity: mlQuantity(v.volumeMl + (v.doubleVoidMl ?? 0)),
  };
  if (v.note.trim() !== '') {
    obs.note = [{ text: v.note }];
  }
  return obs;
}

/** Build a FHIR Observation for one drink event. */
export function buildDrinkObservation(d: DrinkEntry, patientId: string): FhirObservation {
  const obs: FhirObservation = {
    resourceType: 'Observation',
    id: `drink-${d.id}`,
    status: 'final',
    category: activityCategory(),
    code: singleCoding(LOINC.SYSTEM, LOINC.FLUID_INTAKE_ORAL_ESTIMATED, LOINC.FLUID_INTAKE_DISPLAY),
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: d.timestampIso,
    valueQuantity: mlQuantity(d.volumeMl),
  };
  if (d.note.trim() !== '') {
    obs.note = [{ text: d.note }];
  }
  return obs;
}

/** Build a FHIR Observation for one urinary-incontinence (leak) event. */
export function buildLeakObservation(l: LeakEntry, patientId: string): FhirObservation {
  const obs: FhirObservation = {
    resourceType: 'Observation',
    id: `leak-${l.id}`,
    status: 'final',
    category: examCategory(),
    code: {
      coding: [
        // PRIMARY. SNOMED finding code (event-grain).
        { system: SNOMED.SYSTEM, code: SNOMED.URINARY_INCONTINENCE, display: SNOMED.URINARY_INCONTINENCE_DISPLAY },
        // SECONDARY. LOINC assessment code (Epic readers may prefer this).
        { system: LOINC.SYSTEM, code: LOINC.INCONTINENCE_TOTAL, display: LOINC.INCONTINENCE_DISPLAY },
      ],
    },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: l.timestampIso,
  };
  // Trigger surfaces as a free-text note. SNOMED trigger codes are out of scope per D-01.
  // CRITICAL: LeakEntry's free-text field is `notes` (PLURAL, optional), NOT `note`.
  const triggerText = `Trigger: ${l.trigger}`;
  const noteText =
    l.notes && l.notes.trim() !== '' ? `${triggerText} | ${l.notes}` : triggerText;
  obs.note = [{ text: noteText }];
  return obs;
}
