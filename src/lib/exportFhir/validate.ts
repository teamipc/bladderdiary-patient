// AJV-based FHIR R4 Bundle validator. VITEST-ONLY.
//
// CRITICAL: this file MUST NOT be imported from any production source
// under src/app/, src/components/, src/lib/exportPackage/, or
// src/lib/exportPdf/. The FHIR R4 schema is ~3-5MB unpacked. Bundling
// it into the client violates the 5MB total export-size budget AND
// requires unsafe-eval in CSP (RESEARCH AJV strategy).
//
// Verification of this invariant: src/__tests__/fhir-validate.test.ts
// includes a static-grep guard that fails if any production source
// file imports from '@/lib/exportFhir/validate'.
//
// The validator is intentionally NOT re-exported from
// src/lib/exportFhir/index.ts. The barrel only exposes builders.
// Test code imports the path directly:
//   import { validateFhirBundle } from '@/lib/exportFhir/validate';

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FhirBundle } from './types';

/** Path to the vendored FHIR R4 JSON Schema. Resolved from process.cwd(). */
const SCHEMA_PATH = resolve(process.cwd(), 'test-fixtures', 'fhir', 'fhir.schema.json');

/** Path to AJV's bundled JSON Schema draft-06 meta-schema. The FHIR R4 schema
 *  declares "$schema": "http://json-schema.org/draft-06/schema#", which AJV 8.x
 *  does not load by default (only draft-07 + 2019-09 + 2020-12 are built in).
 *  Without this meta-schema added, `addSchema` rejects the FHIR schema with
 *  "no schema with key or ref 'http://json-schema.org/draft-06/schema#'". */
const DRAFT_06_META_PATH = resolve(
  process.cwd(),
  'node_modules',
  'ajv',
  'dist',
  'refs',
  'json-schema-draft-06.json',
);

let cachedValidate: ValidateFunction | null = null;
let cachedAjv: Ajv | null = null;

/** Lazy AJV setup. Compiles once per process; subsequent calls reuse the compiled validator. */
function getValidator(): { ajv: Ajv; validate: ValidateFunction } {
  if (cachedValidate && cachedAjv) {
    return { ajv: cachedAjv, validate: cachedValidate };
  }
  const rawSchema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Record<string, unknown>;
  // AJV 8.x speaks draft-07/2019-09/2020-12. The FHIR R4 schema declares
  // draft-06 ("$schema": "http://json-schema.org/draft-06/schema#") and uses
  // the draft-06 spelling "id" for schema identifiers (renamed to "$id" in
  // draft-07+). Two compatibility steps before adding to AJV:
  //   1. Register the draft-06 meta-schema so AJV recognizes the dialect.
  //   2. Rename root-level "id" to "$id" so AJV's compile step does not
  //      complain "NOT SUPPORTED: keyword id, use $id for schema ID".
  // The FHIR R4 schema only uses bare "id" at the root, not inside
  // definitions, so a single key rename is sufficient. RESEARCH AJV strategy:
  // documented FHIR R4 compatibility step on AJV 8.x.
  const schema: Record<string, unknown> = { ...rawSchema };
  if (typeof schema.id === 'string' && schema.$id === undefined) {
    schema.$id = schema.id;
    delete schema.id;
  }
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const draft06 = JSON.parse(readFileSync(DRAFT_06_META_PATH, 'utf8')) as Record<string, unknown>;
  ajv.addMetaSchema(draft06);
  ajv.addSchema(schema, 'fhir-r4');
  // FHIR's $ref-based schema means we compile the Bundle reference, not the top-level schema.
  const validate = ajv.compile({ $ref: 'fhir-r4#/definitions/Bundle' });
  cachedAjv = ajv;
  cachedValidate = validate;
  return { ajv, validate };
}

/** Validate a FHIR Bundle against the R4 JSON Schema. Returns { valid, errors }. */
export function validateFhirBundle(
  bundle: FhirBundle | unknown,
): { valid: boolean; errors: ErrorObject[] } {
  const { validate } = getValidator();
  const valid = validate(bundle);
  const errors = validate.errors ?? [];
  return { valid, errors };
}
