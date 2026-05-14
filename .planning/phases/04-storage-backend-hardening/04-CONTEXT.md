# Phase 4: Storage backend hardening - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Source:** Direct conversation (no formal discuss-phase — context was captured live)

<domain>
## Phase Boundary

Swap the Zustand `persist` middleware's storage backend from the default `localStorage` to IndexedDB, via a custom `StateStorage` adapter wrapping [`idb-keyval`](https://github.com/jakearchibald/idb-keyval). The patient's diary data stays on their device — same Same-Origin Policy sandbox, same privacy model — but the app gains:

- Larger quota (5–10 MB → ~50 MB+ typical)
- Marginally better survivability against Safari ITP's 7-day inactivity eviction
- Async storage (no main-thread blocking on large writes)

The swap includes a one-time `localStorage` → IndexedDB migration so existing patients with an in-progress diary don't lose data on the version bump. Bump store version from 2 → 3 to mark this transition.

**What this phase is NOT:**
- Not a privacy/threat-model change. Encryption-at-rest was considered and deferred (see Key Decisions in PROJECT.md). Same Same-Origin Policy sandbox as before.
- Not a multi-device sync, cloud backup, or accounts feature — those are explicitly out of scope per `project_localstorage_by_design`.
- Not a refactor of the Zustand store shape, calculations, or any other module. Storage backend only.

</domain>

<decisions>
## Implementation Decisions

### Library choice
- **Use `idb-keyval`** — minimal, well-maintained, ~600 lines, no dependencies. Zustand's docs reference it explicitly as the canonical IndexedDB option for `createJSONStorage`.
- NOT `idb` (it's lower-level — `idb-keyval` is built on `idb` and gives us exactly the get/set/del surface Zustand's `StateStorage` interface wants).
- NOT Dexie (too heavy for our simple single-key use case).

### Adapter location
- New file: `src/lib/storage/indexedDbAdapter.ts`. Stays a thin wrapper — exports a single `createIndexedDbStorage()` function that returns a Zustand `StateStorage` shape (`getItem`/`setItem`/`removeItem`).
- Adapter must use the SAME store key name as the current localStorage key (`bladder-diary-patient`, per `src/lib/store.ts:328`). The Zustand `name` config field is the IDB key.

### Migration strategy (v2 localStorage → v3 IndexedDB)
- **One-time copy on first hydrate after the version bump.** When Zustand's persist middleware calls `getItem(name)` for the first time and IndexedDB returns `null`, the adapter checks `localStorage.getItem(name)`. If present, copy the value over to IndexedDB, then clear the `localStorage` key. The persist middleware then hydrates normally from IndexedDB.
- Adapter handles the migration silently — no UI flash, no user-visible state change.
- After successful migration, `localStorage` is left clean for that key (avoids stale-data confusion in DevTools and frees the small quota).
- Bump store `version` from 2 → 3 in `src/lib/store.ts`. The existing `migrateBladderDiaryState` function (extracted in STAB-05) gets a `version < 3` branch that's mostly a no-op for state shape — the backend change is invisible to the migration function. But add a `v3` branch so a future store bump knows where this transition landed.

### Async storage contract
- Zustand's `createJSONStorage` already supports async storage (the underlying API returns `Promise<string | null>` from `getItem`). The adapter implementation must return promises.
- IMPORTANT: this changes the `persist` hydration timing from sync-on-create to async-on-mount. The existing `useStoreHydrated()` hook (in `src/lib/store.ts`) ALREADY handles this — it was added because Zustand's persist is microtask-deferred. Verify the hook still gates correctly after the swap. No new hydration plumbing needed.

### Error handling
- IndexedDB can fail in private/incognito mode (some browsers disable it). The adapter should:
  - On `getItem` failure: log and return `null` (treated as fresh state).
  - On `setItem` failure: log and silently swallow. Writes will retry naturally on the next state change. The diary in-memory state is preserved either way.
- No alerts, no toasts, no error UI — these errors should be invisible to the patient and recoverable on the next interaction. (Note: `STAB-07` will introduce a toast system for export errors; this storage-error path stays silent to avoid alarming non-tech-savvy patients during normal use.)

### Out of scope for this phase
- Encryption-at-rest (SubtleCrypto + PIN/WebAuthn) — deferred, see `project_localstorage_by_design.md` memory.
- General storage abstraction layer (multiple backends, persistence strategies). Keep this swap surgical.
- Removing the legacy `localStorage` import or any other code unrelated to the persist backend.

### Claude's Discretion
- Exact adapter API shape, function naming inside `indexedDbAdapter.ts`, internal type defs.
- Test file location (likely `src/__tests__/storage-adapter.test.ts` and `src/__tests__/store-migration-v3.test.ts`).
- Whether to add a one-line "IndexedDB backend" mention to the diary "Settings"/"Help" page or keep the swap fully invisible — recommend invisible, since the patient doesn't care about storage internals.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project state
- `.planning/PROJECT.md` — Active requirements include STAB-09; Key Decisions table notes "Storage upgrade path = IndexedDB (not encryption-at-rest)"
- `.planning/REQUIREMENTS.md` — STAB-09 full spec with verify criteria
- `.planning/ROADMAP.md` — Phase 4 success criteria
- `.planning/codebase/CONCERNS.md` — Original audit context: localStorage eviction risk + the cap

### Codebase
- `src/lib/store.ts` — Zustand store with `persist` config; `migrateBladderDiaryState` exported (post STAB-05); store version is currently 2 → bumps to 3
- `src/lib/types.ts` — `DiaryState` and related types
- `src/__tests__/store.test.ts` — Existing test patterns; STAB-05 added v0 → current migration tests that this phase will mirror for v2 → v3
- `src/i18n/config.ts` — Not directly relevant but the store is locale-agnostic; no i18n entanglement expected

### External
- Zustand persist docs: https://zustand.docs.pmnd.rs/integrations/persisting-store-data — `createJSONStorage` API + `StateStorage` interface contract
- `idb-keyval` README: https://github.com/jakearchibald/idb-keyval — `get`, `set`, `del` API surface

</canonical_refs>

<specifics>
## Specific Ideas

### Verification path
- New tests:
  - `src/__tests__/storage-adapter.test.ts` — unit tests for `createIndexedDbStorage` (get/set/del/migration path). Use `fake-indexeddb` package (already-present pattern in the test ecosystem; verify if it's a new dep) OR mock IndexedDB via vitest spies.
  - `src/__tests__/store-migration-v3.test.ts` — integration: v2 localStorage state + empty IndexedDB → on first read, state is copied to IndexedDB and localStorage is cleared.
- The daily walkthrough (`walkthrough_findings.md` memory) will surface any production regression on actual browsers.

### Manual verification (post-merge, before considering the phase truly done)
- Open the deployed app in Safari 17+ on macOS. Verify a fresh diary persists across browser restarts in IndexedDB (DevTools → Storage → IndexedDB → `bladder-diary-patient`).
- Migration check: load the deployed v2 build, fill in some data, then deploy the v3 build → reload → verify the diary is now in IndexedDB and `localStorage` no longer has the key.
- Private mode: verify the app degrades gracefully (in-memory state works, just won't persist).

</specifics>

<deferred>
## Deferred Ideas

- Encryption-at-rest (SubtleCrypto + PIN/WebAuthn). Reconsider if a shared-device threat model becomes load-bearing.
- General storage strategy abstraction (multiple backends, configurable persistence). Wait for a second use case.
- Removing the legacy `localStorage` migration code in a future store version (v4) once we're confident no v2 users remain — wait at least 6 months post-deployment of v3.

</deferred>

---

*Phase: 04-storage-backend-hardening*
*Context gathered: 2026-05-14 via direct conversation*
