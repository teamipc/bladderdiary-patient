// QuestionnaireResponse builder. IPC clinical metrics plus per-day diary
// structure (bedtime/wake markers plus diary metadata) encoded as one
// narrative FHIR R4 resource.
//
// Per RESEARCH 'Clinical metrics' and 'Bedtime / wake time markers':
// computed metrics belong in QR (assessment data), not in Observation
// resources (direct measurements). Bedtime and wake markers also live
// here so the clinician gets a coherent diary-summary section
// without picking up free-form clinical-event semantics for the
// "I went to sleep" markers.
//
// linkIds are self-describing kebab-case strings. The corresponding
// Questionnaire resource (which would define these IDs) is out of
// scope for this app.
//
// null metrics ARE emitted as items, with `answer: []` and a `text`
// field explaining insufficient data. Gives the clinician the
// explicit "this metric was computed but data was insufficient"
// signal vs. "this metric was not present in the export at all".
//
// 16-item catalog (locked):
//   3 diary metadata + 2 24HV + 2 NPi + 2 AVV (per-period) + 1 MVV (top-level)
//   + 3 bedtime + 3 wake.
// NBC is intentionally absent (not in DiaryMetrics today; deferred).
// Derivation hint for clinicians: NBC can be derived from
// metrics.nights[i].nocturnalVolumeMl plus the FMV timestamp in
// metrics.nights[i].fmvIso when needed. Computing NBC inside
// calculations.ts is intentional scope expansion deferred to a
// future phase.

import type { DiaryState, BedtimeEntry, WakeTimeEntry } from '../types';
import type { DiaryMetrics } from '../calculations';
import type {
  FhirQuestionnaireResponse,
  FhirQuestionnaireResponseItem,
} from './types';

/** Build an item with a single decimal answer, or an empty-answer item with insufficiency text when value is null. */
function decimalItem(
  linkId: string,
  value: number | null,
  insufficiencyText: string,
): FhirQuestionnaireResponseItem {
  if (value === null) {
    return { linkId, text: insufficiencyText, answer: [] };
  }
  return { linkId, answer: [{ valueDecimal: value }] };
}

/** Build an item with a single dateTime answer, or empty-answer when undefined. */
function dateTimeItem(
  linkId: string,
  isoTimestamp: string | undefined,
  insufficiencyText: string,
): FhirQuestionnaireResponseItem {
  if (!isoTimestamp) {
    return { linkId, text: insufficiencyText, answer: [] };
  }
  return { linkId, answer: [{ valueDateTime: isoTimestamp }] };
}

/** Find the timestamp for a specific day's bedtime / wake-time, or undefined. */
function findByDayNumber<T extends { dayNumber: 1 | 2 | 3; timestampIso: string }>(
  entries: T[],
  dayNumber: 1 | 2 | 3,
): string | undefined {
  return entries.find((e) => e.dayNumber === dayNumber)?.timestampIso;
}

/**
 * Build a fully-shaped FHIR R4 QuestionnaireResponse from diary state + metrics.
 *
 * Reads the canonical DiaryMetrics shape from src/lib/calculations.ts:
 *   metrics.periods (NOT periodMetrics) is PeriodMetrics[] of length 0..2.
 *   period.twentyFourHV (NOT twentyFourHourVolume) is a number (NOT nullable
 *   per the field type), but the period itself may not exist in the array.
 *   period.avv and period.nPi are number | null.
 *   metrics.mvv is a single top-level number (NOT per-day).
 *   DiaryMetrics has NO `nbc` field.
 */
export function buildQuestionnaireResponse(
  state: DiaryState,
  metrics: DiaryMetrics,
  patientId: string,
): FhirQuestionnaireResponse {
  const item: FhirQuestionnaireResponseItem[] = [];

  // -- Diary metadata (3 items) --
  item.push({
    linkId: 'qr-diary-startdate',
    answer: [{ valueString: state.startDate }],
  });
  item.push({
    linkId: 'qr-diary-timezone',
    answer: [{ valueString: state.timeZone }],
  });
  if (state.age !== null) {
    item.push({
      linkId: 'qr-diary-age',
      answer: [{ valueInteger: state.age }],
    });
  } else {
    item.push({
      linkId: 'qr-diary-age',
      text: 'No age recorded',
      answer: [],
    });
  }

  // -- Per-period metrics (6 items: 24HV x 2 + NPi x 2 + AVV x 2) --
  // Canonical field: metrics.periods (NOT periodMetrics).
  // metrics.periods may have length 0, 1, or 2 depending on data.
  const p1 = metrics.periods[0] ?? null;
  const p2 = metrics.periods[1] ?? null;
  item.push(decimalItem(
    'qr-metric-24hv-period1',
    p1?.twentyFourHV ?? null,
    'Insufficient data for 24HV (Period 1). IPC excludes Day 1 from this metric.',
  ));
  item.push(decimalItem(
    'qr-metric-24hv-period2',
    p2?.twentyFourHV ?? null,
    'Insufficient data for 24HV (Period 2).',
  ));
  item.push(decimalItem(
    'qr-metric-npi-period1',
    p1?.nPi ?? null,
    'Insufficient data for NPi (Period 1). Requires First Morning Void.',
  ));
  item.push(decimalItem(
    'qr-metric-npi-period2',
    p2?.nPi ?? null,
    'Insufficient data for NPi (Period 2). Requires First Morning Void.',
  ));
  item.push(decimalItem(
    'qr-metric-avv-period1',
    p1?.avv ?? null,
    'Insufficient data for AVV (Period 1). Requires at least one void.',
  ));
  item.push(decimalItem(
    'qr-metric-avv-period2',
    p2?.avv ?? null,
    'Insufficient data for AVV (Period 2). Requires at least one void.',
  ));

  // -- Top-level MVV (1 item) --
  // metrics.mvv is a number (always present, 0 when no voids). The decimalItem
  // helper accepts number directly because the value-or-null union widens to number.
  item.push(decimalItem(
    'qr-metric-mvv',
    metrics.mvv,
    'Insufficient data for MVV. Requires at least one void.',
  ));

  // -- Per-day bedtime + wake markers (6 items: bedtime x 3 + wake x 3) --
  for (const dayNumber of [1, 2, 3] as const) {
    item.push(dateTimeItem(
      `qr-bedtime-day-${dayNumber}`,
      findByDayNumber<BedtimeEntry>(state.bedtimes, dayNumber),
      `No bedtime recorded for Day ${dayNumber}.`,
    ));
    item.push(dateTimeItem(
      `qr-wake-day-${dayNumber}`,
      findByDayNumber<WakeTimeEntry>(state.wakeTimes, dayNumber),
      `No wake time recorded for Day ${dayNumber}.`,
    ));
  }

  return {
    resourceType: 'QuestionnaireResponse',
    id: 'qr-1',
    status: 'completed',
    subject: { reference: `Patient/${patientId}` },
    authored: new Date().toISOString(),
    item,
  };
}
