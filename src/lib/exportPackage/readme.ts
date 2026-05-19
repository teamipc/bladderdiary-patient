// README composer. Plain-text, locale-aware.
//
// Reads from next-intl messages under the exportPackage.readme namespace.
// The caller (13-04's ExportActions component) resolves the namespace via
// useTranslations('exportPackage.readme') and passes the resulting `t`
// function in. This keeps next-intl out of the package module's static
// imports, lets buildReadme stay synchronous, and lets the test suite
// pass a stub translator without mounting React.
//
// The README is plain text (NOT Markdown, NOT HTML). 80-char wrapped at
// authoring time inside messages/<locale>.json. Fax-friendly per
// CONTEXT §Constraints.
//
// No em-dashes anywhere in the output. Neither in the message values nor
// in the substituted ICU placeholders. Memory: feedback_no_em_dashes.
//
// Byte-deterministic: the completion-date placeholder is sourced from
// state.startDate, NOT new Date(). Two calls with the same state + same
// translator produce byte-identical output. This matters because the README
// is hashed inside the zip (PKG-02 clinician-sort-order assertion) and
// because future plans may want to diff or cache the package bytes.

import type { DiaryState } from '../types';

/** Translation function signature. Matches next-intl's `t()` shape. */
export type ReadmeTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Re-apply the regex validator from exportFhir/patient.ts. Defense in depth. */
const CLINIC_CODE_REGEX = /^[A-Za-z0-9-]{1,32}$/;

/**
 * Compose the README plain-text content.
 *
 * @param state  DiaryState. Read for age, timezone, clinicCode, startDate.
 * @param locale Locale code. Reserved for future locale-specific formatting
 *               (e.g. date format per locale). Currently unused inside the
 *               composer because `t` is already locale-bound by the caller.
 * @param t      Translation function bound to the `exportPackage.readme` namespace.
 */
export function buildReadme(
  state: DiaryState,
  locale: string,
  t: ReadmeTranslator,
): string {
  // Reserved for future locale-conditional formatting. Reference the param
  // explicitly so eslint doesn't flag it as unused.
  void locale;

  // Use state.startDate (already YYYY-MM-DD per DiaryState type) as the
  // completion-date placeholder. Avoids Date.now() inside this function so
  // the README stays byte-deterministic per the package planner constraint.
  const completedDate = state.startDate;

  // Plain ASCII fallback for missing age. Never em-dash, never the literal
  // string "null" / "undefined".
  const ageDisplay = state.age !== null ? String(state.age) : 'unknown';

  const clinicCodeDisclaimer =
    state.clinicCode !== null && CLINIC_CODE_REGEX.test(state.clinicCode)
      ? t('clinicCodeDisclaimer')
      : '';

  const sections: string[] = [
    t('title'),
    '',
    t('patientLine', { age: ageDisplay, timezone: state.timeZone }),
    t('completedLine', { date: completedDate }),
    '',
    t('intro'),
    '',
    t('fileDescriptions'),
    '',
    t('ehrInstructions'),
  ];

  if (clinicCodeDisclaimer !== '') {
    sections.push('', clinicCodeDisclaimer);
  }

  sections.push('', t('footer'));

  return sections.join('\n');
}
