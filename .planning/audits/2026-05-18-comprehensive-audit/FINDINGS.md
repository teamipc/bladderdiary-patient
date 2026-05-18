# Comprehensive Audit — Synthesis & Milestone 3 Proposal

**Date:** 2026-05-18
**Auditors:** gsd-code-reviewer + general-purpose (SEO lens) + gsd-ui-auditor
**Scope:** Whole-app, between-milestones (after Milestone 1 Stabilization + Milestone 2 Desktop & Tablet UX shipped)

---

## Headline

**69 findings across 3 audits:** 7 Critical · 17 High · 24 Medium · 21 Low.

**Of the 7 Critical findings:**
- **4 are user-facing in production right now** (PT/ZH/AR article cards 404, PDF export English-only for non-EN/FR/ES, BreadcrumbList JSON-LD broken, no `<h1>` on diary pages)
- **2 are clinical-record-integrity** (Log{Void,Drink,Leak}Form Discard actually saves)
- **1 is a config-drift landmine** (untracked `vercel.json` would break canonical-vs-redirect contract if shipped)

**Verdict:** Substantially better shape than the stale CONCERNS.md (2026-05-14) reflects. Milestone 2 work paid off visibly in the audit. The remaining issues cluster cleanly into **four failure classes**, each suitable for one phase.

---

## Cross-audit cluster map

### Cluster 1 — Locale parity broken below the visible UI

Three audits independently surfaced the same pattern: the recent locale expansion to 6 was done at the message-strings layer but never finished at the article-discovery + clinical-export layer.

| Finding | Audit | Severity | Evidence |
|---|---|---|---|
| Article cards 404 in PT/ZH/AR | UI | Critical | `ArticleCard.tsx:36` regex `/^\/(en|fr|es)/` strips 3 of 6 locales. Live-verified via curl: `/pt/learn/voiding/...` → 404 |
| PDF export English-only for PT/ZH/AR | UI | Critical | `exportPdf/strings.ts:81-285` has only en/fr/es; every page uses `doc.setFont('helvetica')` which has no CJK/Arabic glyphs |
| PDF hardcoded English strings even in EN/FR/ES | UI | Critical | `dailyDiary.ts:55` ("Time"), `slots.ts:44,142` (AM/PM), `machineData.ts:17,21,55,70`, `graphs.ts:194` (time axis "6am/8am/...") |
| TimePicker bedtime chips hardcoded "10 PM"/"11 PM"/"12 AM" | UI | High | `TimePicker.tsx:159,166,173`. FR users see "10 PM hier soir", AR users see Latin "PM" in RTL line |
| Breadcrumb aria-label not translated | UI | High | hardcoded English in nav landmark |
| Author photos missing (`photoUrl` empty, `public/authors/` dir doesn't exist) | SEO | High | Medical YMYL E-E-A-T trust signal |

**Why this is the #1 priority:** The clinical PDF export IS the product surface a clinician evaluates. A Mandarin-speaking PFPT receiving a patient's PDF currently sees English headers or boxes-where-glyphs-should-be — undoing the entire localization investment. And the article-card 404 is silently sending half of the locale audience to broken URLs.

---

### Cluster 2 — Clinical record integrity (the highest-stakes correctness bugs)

| Finding | Audit | Severity | Evidence |
|---|---|---|---|
| LogVoidForm Discard actually saves | Code | Critical | `LogVoidForm.tsx` autosave-on-unmount `useEffect` fires even after explicit Discard ConfirmDialog said "Your changes won't be saved" |
| LogDrinkForm/LogLeakForm same pattern | Code | Critical | Same autosave-on-unmount anti-pattern in both forms |
| NextStepBanner uses browser-local `getHours()` | Code | High | `NextStepBanner.tsx:79` — reintroduces the exact anti-pattern Phases 1-2 spent months eliminating |
| `reminders.ts:anchorTimeLabel` uses `new Date().setHours()` | Code | High | Same browser-local-time leak in displayed reminder time |
| `removeWakeTime` doesn't recompute FMV | Code | Medium | FMV anchor can drift after wake-time deletion |
| `observations.ts` doesn't filter Day 1 from caffeine pattern detection | Code | Medium | Inconsistent with IPC "exclude Day 1 from 24HV/NPi/AVV" rule |

**Why this matters:** "Discard" saving the dirty record means clinical data the patient explicitly chose to discard ends up in the export the clinician reads. Plus the timezone leaks are regressions of work that Phases 1-2 closed.

---

### Cluster 3 — WCAG 2.1 AA baseline + accessibility polish

For medical-grade software, WCAG 2.1 AA isn't aspirational — it's the floor.

| Finding | Audit | Severity | Evidence |
|---|---|---|---|
| No `<h1>` on any diary day page | UI | Critical | `DayPageClient` opens with `<h2>` "Day 1". WCAG 2.4.6 / 1.3.1 |
| Toasts not announced to screen readers | UI | High | No `aria-live` / `role="status"` / `role="alert"` anywhere |
| Skip-to-content link missing | UI | High | WCAG 2.4.1 |
| ConfirmDialog destructive in primary (right) position + no autoFocus on Cancel | UI | High | `confirmBtnRef` declared but never assigned. Enter destroys data |
| Multiple smaller a11y gaps | UI | Medium/Low | Color contrast in muted text, focus-ring visibility on some buttons |

---

### Cluster 4 — SEO config drift + content-architecture gaps

The recent commits genuinely fixed major SEO debt (sitemap slim 216→156, author bios expanded, Search Console CLI). What's left is a config-drift landmine and three under-built pillars.

| Finding | Audit | Severity | Evidence |
|---|---|---|---|
| Untracked `vercel.json` would break canonical contract | SEO | Critical | Proposes rewriting `/learn/*` → `/en/learn/*` + 308 `/en/*` → `/*`, but canonicals hardcode `/en/learn/...` and sitemap emits locale-prefixed URLs. Status `??` — never deployed but sitting in working tree |
| 3 pillars have zero clusters (`bph`, `frequency`, `urgency`) | SEO | Critical | Spec target: "pillar plus 2-3 clusters". These are also three highest-volume search terms in topical scope |
| Bare `/` returns JS-only shell (no `<title>`, no body) | SEO | High | Soft-content risk for Googlebot |
| BreadcrumbList JSON-LD broken | SEO | High | Positions 1-3 use bare paths that 404 live; position 3 name renders raw slug ("nocturia" not "Nocturia") |
| 3 more topics under-clustered (`bladder-irritants`, `nocturia`, `post-prostatectomy` have only 1 cluster) | SEO | High | Spec target 2-3 |
| Audience landing intros still under 600-word spec target | SEO | Medium | Recent commit expanded but not to spec |

---

### Cluster 5 — Defense-in-depth + code-quality (could ride along on any other phase)

| Finding | Audit | Severity | Evidence |
|---|---|---|---|
| `JsonLd` doesn't escape `</` in JSON.stringify | Code | High | Trusted content today but standard hardening missing |
| TimelineView.tsx is 884-line monolith with no unit tests | Code | Medium | Refactor candidate when next touched |
| `VOLUME_PRESETS` deprecated re-export still alive | Code | Low | Dead code; safe to remove |
| `@ts-expect-error` × 4 for `jspdf-autotable` typings | Code | Low | One-time `declare module` augmentation |
| ESLint-disable / `as any` audit | Code | Low | Posture check |

---

## What's genuinely working well (preserve these)

**Clinical correctness:**
- IPC calculations are clean and well-tested. Day-1-excluded rule, double-void aggregation, FMV anchor all handled correctly.
- Time/timezone canonical module is genuinely good — the bug is unfaithful adoption in 2 places, not the design.
- Store migrations (v0→v1→v2 + IndexedDB) handle edge cases.

**Localization depth:**
- Six-locale content parity is exact line-by-line (4971 EN lines = 4974 AR lines).
- Spot checks of Arabic and Chinese confirm full human-quality translation through case-study narratives and CTAs.
- Foreign-locale register rules (FR=vous, ES=tú, PT=tu/você, ZH=peer-direct 你, AR=MSA) are actually enforced.

**SEO infrastructure:**
- Sitemap `lastmod` correctly anchored to content-modification dates, not build time.
- JSON-LD includes `MedicalWebPage`, ICD-10 codes, `MedicalAudience`, `citation` arrays — unusually thorough for the medical YMYL bar.
- In-body images render via `next/image` with build-time-resolved dimensions — CLS-safe.
- Search Console indexing CLI is real diagnostic infrastructure.

**UX wins from Milestone 2:**
- Night mode CSS overrides touching FAB/footer/header
- Smart bedtime defaults (`bedtime + 3h`, not `bedtime + 5min`)
- 5-step journey tracker with edit-pencil hints
- Day 1 celebration, dirty-state protection ConfirmDialog, FMV auto-detection
- Boomer-safe 3-chip volume presets calibrated to real Bruno/Alex paper diaries
- Summary page narrative arc (hero → stats → top observation → CTA → story → observations → reflection → look-back → for-team) — strongest pure-UX surface

---

## Proposed Milestone 3 shape

The 5 clusters above correspond to 4 natural phases (Cluster 5 rides along). Phases are sized so each one ships discrete clinical/user-facing value and has a tight verification surface.

### Phase 9 — Locale parity production-hotfix
**Goal:** PT/ZH/AR users get the same clinical product EN/FR/ES users get.
**Includes:** ArticleCard regex fix (1-line), PDF localization for PT/ZH/AR (font registration for CJK/Arabic + string tables + date-fns locales), eliminate hardcoded English strings in EN/FR/ES PDFs, TimePicker chip localization, Breadcrumb aria-label, author photos sourced + wired.
**Sizing:** ~3-5 days. Largest item is ZH/AR PDF Unicode font registration (~500KB-2MB per font, lazy-loaded).
**Severity:** Emergency-grade. Three locales currently broken in production.

### Phase 10 — Clinical record integrity
**Goal:** Close the "Discard saves anyway" bug class + finish eliminating browser-local-time leaks.
**Includes:** Remove autosave-on-unmount from Log{Void,Drink,Leak}Form (now that explicit Save + Discard exist), add regression tests, fix NextStepBanner timezone, fix reminders.ts anchorTimeLabel, fix `removeWakeTime` FMV recomputation, filter Day 1 from caffeine pattern detection in observations.ts.
**Sizing:** ~2-3 days. Bug class is well-contained but needs tests to prevent recurrence.

### Phase 11 — WCAG 2.1 AA baseline
**Goal:** Reach unambiguous WCAG 2.1 AA on every interactive surface.
**Includes:** `<h1>` on diary day pages + landing + summary, `aria-live` on Toast + time warnings, skip-to-content link, ConfirmDialog destructive-button position + autoFocus + Cancel-as-default, color contrast sweep on muted text.
**Sizing:** ~1-2 days. Most fixes are small but verification needs axe-core run across 6 locales × 3 viewports.

### Phase 12 — SEO config + content architecture
**Goal:** Close the canonical-vs-redirect landmine, fix BreadcrumbList JSON-LD, fill the three pillar-cluster gaps that cap organic growth.
**Includes:** Decide vercel.json fate (delete it OR ship with canonical migration), fix BreadcrumbList URLs + Title-Case name, draft 6-9 cluster articles for `bph`/`frequency`/`urgency` (2-3 each), expand `bladder-irritants`/`nocturia`/`post-prostatectomy` to spec target.
**Sizing:** Variable. Config decision is 1 day. Cluster articles depend on whether you want them drafted via the SEO workflow (separate workstream) or planned here.

---

## Open questions before scoping Milestone 3

1. **Phase 9 — PDF Unicode font choice.** Two viable paths: (a) embed Noto Sans CJK + Noto Sans Arabic subsets (~500KB-2MB per locale, lazy-loaded), (b) use an HTML→PDF approach for non-Latin locales (different codepath). Decision affects sizing significantly.
2. **Phase 12 — cluster-article authorship.** Are these drafted by the existing SEO workflow + `article-intake` skill (separate milestone-parallel workstream), or planned as part of Milestone 3?
3. **Phase ordering.** Default proposal: 9 → 10 → 11 → 12. But Phase 10 (Discard bug) is also production-affecting; could swap to 10 → 9 if you prefer clinical-integrity-first.
4. **vercel.json (untracked).** Was this an in-progress experiment? Decision needed: delete vs. complete the canonical migration. This blocks Phase 12.

---

## Artifacts

- `CODE-REVIEW.md` — 300 lines, full code audit
- `SEO-REVIEW.md` — 511 lines, full SEO audit
- `UI-REVIEW.md` — 470 lines, full UI/UX audit
- `FINDINGS.md` — this file (synthesis)
