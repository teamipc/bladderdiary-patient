# Roadmap: My Flow Check — Stabilization Milestone

## Overview

This milestone closes silent-bug gaps surfaced by the codebase audit (`.planning/codebase/CONCERNS.md`, committed cd3de78). All work is correction of existing features that mis-behave for some subset of patients — no new user-visible features. Phases are grouped by failure class so each phase's fixes share verification surface and regression risk.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Locale + reminder + observation correctness** — Close the top 3 silent bugs flagged by audit (i18n coverage, reminder timezone, observation day-attribution dedup)
- [ ] **Phase 2: Remaining timezone correctness + store hygiene** — PDF minute-rendering across half-hour-offset zones, wakeTimes null safety + migration completeness
- [ ] **Phase 3: UX polish + input validation** — Locale-aware milestone-toast dedup, export-error toast, clinicCode URL-param validation
- [ ] **Phase 4: Storage backend hardening** — Swap Zustand persist from localStorage to IndexedDB (same privacy model, better Safari-ITP survivability, larger quota)

## Phase Details

### Phase 1: Locale + reminder + observation correctness
**Goal**: Three highest-impact silent bugs from CONCERNS.md are closed: half the locales now format dates correctly, reminders fire at the patient's actual local time, and observations use the canonical day-attribution function instead of a subtly-wrong fork.
**Depends on**: Nothing (first phase)
**Requirements**: STAB-01, STAB-02, STAB-03
**Success Criteria** (what must be TRUE):
  1. Rendering a void/drink timestamp on `/pt/diary/day/1`, `/zh/diary/day/1`, `/ar/diary/day/1` produces locale-native output (Portuguese month names, Simplified Chinese characters/format, Arabic numerals + RTL date order) — no `en-US` fallback.
  2. Setting the diary timezone to `Asia/Singapore` from a `America/New_York` browser causes the next 8 AM reminder to fire at 8 AM SGT (= 20:00 EST the previous day), not at 8 AM EST.
  3. `observations.ts` no longer contains a local re-implementation of `getDayNumber`. A 5:59 AM void on the calendar day after Day 1 (with no Day-1 bedtime set) attributes to Day 1 for both `getDayNumber` and observation generation. Existing `observations.test.ts` + `boundaries.test.ts` continue to pass.
**Plans**: TBD (likely 1 if bundled, up to 3 if split per fix)

Plans:
- [ ] 01-01: TBD (bundled via `/gsd-quick` OR split into 3 atomic plans via `/gsd-plan-phase 1`)

### Phase 2: Remaining timezone correctness + store hygiene
**Goal**: Tidy the remaining timezone-correctness debt surfaced by audit (PDF graphs/slots) and prevent the v0/v1 store-migration crash path for the wakeTimes field. Closes the tz silent-bug class entirely.
**Depends on**: Phase 1 (consolidates day-attribution patterns first)
**Requirements**: STAB-04, STAB-05
**Success Criteria** (what must be TRUE):
  1. A void at 14:30 IST renders on the correct 30-minute PDF slot row and at the correct fractional-hour position on the scatter-plot for a patient stored in `Asia/Kolkata` (UTC+5:30).
  2. Loading a v0 store snapshot (no `wakeTimes` field) into the current app does not crash `generateObservations` or any other downstream consumer; the store v1→v2 migration explicitly initializes `wakeTimes: []`.
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: UX polish + input validation
**Goal**: Three smaller corrections that affect UX quality and surface area: milestone toasts stop re-firing on locale switch, export errors use the existing Toast component instead of a browser `alert()`, and the `clinicCode` URL param is validated before persistence.
**Depends on**: Phase 2 (no hard dependency, but ordered to keep the milestone close-out clean)
**Requirements**: STAB-06, STAB-07, STAB-08
**Success Criteria** (what must be TRUE):
  1. Triggering the first-void milestone toast on `/en/diary/day/1`, then switching to `/fr/diary/day/1` mid-session, does NOT re-fire the toast in the new locale.
  2. Forcing a jsPDF generation error during export surfaces a toast (using `src/components/ui/Toast.tsx`) — no browser `alert()` modal appears.
  3. Visiting `?clinic=<5000-char-string>` or `?clinic=<script>` does NOT persist the raw value to localStorage; only alphanumeric-plus-dash values within a length cap are accepted.
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Storage backend hardening
**Goal**: Swap the Zustand `persist` backend from `localStorage` to IndexedDB (via `idb-keyval`) without changing the privacy model. Same same-origin sandbox, better Safari-ITP survivability, vastly larger quota. Includes a one-time `localStorage` → IndexedDB migration so existing patients don't lose their in-progress diary.
**Depends on**: Phase 2 (must land after STAB-05's v1→v2 migration cleanup so the backend swap is the only migration left to reason about)
**Requirements**: STAB-09
**Success Criteria** (what must be TRUE):
  1. A patient who completes Day 1, idles 7+ days on iOS Safari 17+, then returns can still resume Day 2 with all events intact (manual verification via the daily walkthrough; previously, Safari ITP eviction destroyed this path on `localStorage`).
  2. An existing patient with a v2 store in `localStorage` opens the app once → diary loads from IndexedDB after migration → the `localStorage` key is cleared (verified by inspecting both storages in DevTools).
  3. `src/__tests__/store.test.ts` covers the v2→v3 backend migration; full vitest suite passes.
  4. The 6-locale daily production walkthrough continues to pass with no new findings logged to `walkthrough_findings.md`.
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Add idb-keyval dep + write createIndexedDbStorage adapter with localStorage→IDB migration + adapter unit tests
- [ ] 04-02-PLAN.md — Wire adapter into Zustand persist config, bump store version 2→3, add v3 migration branch + v2→v3 integration test

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Locale + reminder + observation correctness | 3/3 | Complete | 2026-05-14 (via quick task 260514-ndz) |
| 2. Remaining timezone correctness + store hygiene | 2/2 | Complete | 2026-05-14 (via quick task 260514-nt1) |
| 3. UX polish + input validation | 0/TBD | Not started | - |
| 4. Storage backend hardening | 2/2 | Complete | 2026-05-14 (planned route; 2 post-merge manual checks pending) |
