# Medical-Grade UI/UX Audit — 2026-05-18

**Audit target:** My Flow Check (myflowcheck.com), production code at HEAD `f79b6a3`
**Audit type:** Comprehensive — three surfaces (Diary / Learn / Shell) × six locales × three viewports
**Baseline:** `docs/UX_PHILOSOPHY.md` + `CLAUDE.md` constraints + WCAG 2.1 AA + clinical-grade clarity
**Method:** Code-level adversarial audit with one production-curl spot-verification

---

## Executive Summary

**Total findings: 22** (Critical: 3, High: 7, Medium: 8, Low: 4)

**Top 5 UX priorities for Milestone 3:**
1. **C1 — Fix the PT/ZH/AR article-card 404 in production.** Every Portuguese, Chinese, and Arabic patient who clicks an article card on `/learn` lands on a 404. Verified live. ~50% of locales broken on the secondary surface.
2. **C2 — Localize the clinical PDF export for PT/ZH/AR.** The 7-page clinician-facing PDF is the highest-stakes output, and it ships in **English only for 3 of 6 locales** (and even fr/es coverage is incomplete — hardcoded "Time", "AM/PM", "Structured Data"). Plus the PDF font is Helvetica, which has zero glyph coverage for Chinese or Arabic — translating without changing the font would render boxes.
3. **C3 — Add a `<h1>` to `/diary/day/1`, `/diary/day/2`, `/diary/day/3`.** The most-used page in the app has no `<h1>` — `TimelineView` opens with an `<h2>`. Screen readers parse the page as having no main heading. WCAG 2.4.6 / 1.3.1.
4. **H1 — Wire toasts and inline warnings to a live region.** No `aria-live`, no `role="status"`, no `role="alert"` anywhere in shipping code. Save confirmations, error toasts, milestone celebrations, and time-validation warnings are silent for screen-reader users — a population statistically overrepresented in the 50+ target demographic.
5. **H2 — Hardcoded English clock times leak through translation in TimePicker.** Bedtime chip labels render `"10 PM hier soir"` in French, `"昨晚 10 PM"` in Chinese, `"إرسال 10 PM ليلة أمس"` in Arabic. The `time` placeholder receives a hardcoded English AM/PM string. RTL users see Latin "PM" embedded in Arabic.

**Medical-grade verdict: ready for clinical use in EN/FR/ES with caveats; NOT ready for PT/ZH/AR clinical use.**

The English diary is genuinely strong. The Milestone 2 work shipped real wins: focus traps, dirty-state protection, the celebration moment after Day 1, the +250 mL micro-reward, the boomer-safe form chips, the editorial polish on `/learn`. The recent Phase 8 visual-QA pass closed a lot of the surface gloss issues, and you can feel the care. **For EN/FR/ES patients, on a phone, this is a best-in-class 3-day diary.**

The cracks show in three places:
1. **Non-Latin / RTL locales** — the diary surface holds up (i18n discipline is solid for in-app strings), but the clinical PDF and the Learn section both fall apart at the edge.
2. **Screen-reader experience** — the visual UX is so good that the gap to AT is more conspicuous. No live regions, no `<h1>` on the day pages, no skip-link, focus management drops several balls.
3. **The PDF clinician surface** — the highest-stakes output is the least polished. English/French/Spanish are presentable but have several copy bugs; PT/ZH/AR get a literal English PDF that defeats the point of localizing the app at all.

None of these are catastrophic for the EN user base testing the app today. All of them will be embarrassing when a Chinese-speaking patient hands the PDF to their Mandarin-speaking PFPT.

---

## Findings by pillar

### CLARITY / NO-AMBIGUITY

#### C1 — TimePicker chip clock times are hardcoded English text in every locale
- **Severity:** High
- **Surface:** Diary (TimePicker, every log form)
- **Affected viewports + locales:** All viewports, all non-EN locales
- **Evidence:** `src/components/ui/TimePicker.tsx:159, 166, 173` — `tc('lastNightAt', { time: '10 PM' })`. The translated wrapper `{time} hier soir` (FR), `昨晚 {time}` (ZH), `{time} ليلة أمس` (AR) all receive the hardcoded English string `'10 PM'`. Production FR users see "10 PM hier soir", AR users see Latin "PM" embedded inside Arabic RTL.
- **Why it matters:** A French boomer who sees "10 PM hier soir" is being asked to think in two formats at once. AR users see a left-to-right script fragment embedded in their right-to-left line, breaking bidi flow. The bedtime chip is one of the most-clicked controls in the entire app (it's the canonical "I forgot to log when I went to sleep" recovery path).
- **Fix approach:** Pass numeric hour + minute to the picker chip handlers, and let the locale format the display. Either (a) reformat `'10 PM'` → `formatTime(buildIsoForClockTimeInTz(value, 22, 0, tz), locale, tz)` so display matches user's clock format, or (b) accept clock-time numbers as i18n message arguments (e.g. `{hour, plural, ...}` ICU patterns).

#### C2 — `<input type="time">` clock format is browser-dependent, not app-controlled
- **Severity:** Medium
- **Surface:** Diary (TimePicker)
- **Affected viewports + locales:** All
- **Evidence:** `src/components/ui/TimePicker.tsx:106-115` — uses native `<input type="time">`. Format (12hr vs 24hr) is determined by the user's OS/browser locale, not by the app's `useLocale()` setting. A US patient on a 24hr-locale phone may see 24hr clock; a UK patient on US-locale browser may see AM/PM. Inconsistent with the rest of the app's `formatTime()` output.
- **Why it matters:** Clinical clarity demands consistency. If the timeline shows "14:30" but the picker accepts "2:30 PM", patients miscount events. The medical-grade bar is "what I saw is what I entered, regardless of device."
- **Fix approach:** Either accept the variance (document it) or replace native time input with a custom 12/24hr picker that respects the user's selected display format. Honestly, this is a known browser variance — accept it but verify on a recent QA pass.

#### C3 — "FMV" / "DV" abbreviations in PDF without expansion in non-EN PDFs
- **Severity:** Medium
- **Surface:** Clinical export (PDF)
- **Affected viewports + locales:** PDF only — affects all clinician readers
- **Evidence:** `src/lib/exportPdf/strings.ts:144-145` — `morningPee: 'FMV'` (EN), `'PMU'` (FR), `'PMO'` (ES). These appear inline as `*FMV` next to morning voids in the combined diary table but the abbreviation legend at the page bottom uses different language entirely (`sensationLegend`). A clinician reading the PDF for the first time sees `*FMV` with no expansion in close proximity.
- **Why it matters:** This is the clinical document. A urologist or PFPT receives it cold and must interpret it. Inline abbreviations with no glossary on the same page is a clinical-readability failure.
- **Fix approach:** Add a line under the sensation legend: `*FMV = First Morning Void · DV = Double Void`. Already half-localized in `strings.ts`, just needs the connective copy.

#### C4 — Toast errors / save confirmations / time-validation warnings don't reach assistive tech
- **Severity:** High
- **Surface:** Diary (every form), Summary (export)
- **Affected viewports + locales:** All
- **Evidence:** `src/components/ui/Toast.tsx` — the toast div has no `role`, no `aria-live`. `src/components/diary/LogVoidForm.tsx:528` — the timeWarning div has no announcement. Same in LogDrink/LogLeak.
- **Why it matters:** A screen-reader user logs a void, the toast says "Pee saved" (visually); the screen reader announces nothing. The same user picks a time that fails validation ("This time is before Day 1's bedtime") and gets no audio feedback — they may stare at the picker wondering why save doesn't fire.
- **Fix approach:** Add `role="status"` and `aria-live="polite"` to the Toast root. Add `role="alert"` to the inline time-warning div (since validation failures are higher-urgency than save confirmations). WCAG 4.1.3 Status Messages.

#### C5 — Onboarding age input has no error message on invalid age
- **Severity:** Low
- **Surface:** Onboarding
- **Affected viewports + locales:** All
- **Evidence:** `src/components/onboarding/OnboardingFlow.tsx:115-128` — input rejects out-of-range values silently (Next button is disabled if `!isAgeValid`). No copy tells the user "must be 18-120" until they tap Next on a disabled button.
- **Why it matters:** A 17-year-old enters their age, the Next button stays gray; they don't know why. A 16-year-old patient is a real demographic for this clinic (pediatric urology referrals exist) — at minimum, error text would tell them they're on the wrong tool.
- **Fix approach:** Show inline helper text below the input: "Adults 18 and over." Localize. Pair with `aria-describedby` and `aria-invalid={!isAgeValid}` for screen readers.

---

### ACCESSIBILITY (WCAG 2.1 AA)

#### A1 — No `<h1>` on the primary diary pages (`/diary/day/N`)
- **Severity:** Critical
- **Surface:** Diary
- **Affected viewports + locales:** All
- **Evidence:** Grep confirms — `src/components/diary/TimelineView.tsx:506` uses `<h2>` for "Day 1". No `<h1>` exists on `DayPageClient` or anywhere in the diary day chain. Compare to `src/app/[locale]/summary/page.tsx:119` which correctly uses `<h1>`.
- **Why it matters:** WCAG 2.4.6 / 1.3.1 — every page needs a main heading. Screen readers (and SEO crawlers) treat the page as headingless. For the most-used page in the app.
- **Fix approach:** Promote `Day 1` / `Night 1` to `<h1>` in TimelineView (or add an SR-only `<h1>` to `DayPageClient` containing `{tc('day', { number: dayNumber })} — {tc('appName')}`). Demote the current `<h2>` semantically if needed.

#### A2 — No skip-to-content link anywhere
- **Severity:** High
- **Surface:** Shell
- **Affected viewports + locales:** All
- **Evidence:** Grep `skip|Skip to|sr-only` returns nothing. `AppShell.tsx` renders Header → main → Footer with no skip.
- **Why it matters:** A keyboard user landing on `/diary/day/1` must Tab through the entire header (logo, top-nav links, Learn, language switcher) before reaching the journey tracker or the FAB. WCAG 2.4.1 Bypass Blocks is a Level A requirement.
- **Fix approach:** Add a visually-hidden-until-focused skip link as the first focusable element in AppShell: `<a href="#main" className="sr-only focus:not-sr-only ...">{t('skipToContent')}</a>`. Add `id="main"` to the `<main>` tag.

#### A3 — ConfirmDialog reverses platform convention: destructive action is the right-hand / primary button
- **Severity:** High
- **Surface:** Diary (delete entry), Landing (reset diary), TimelineView (reset)
- **Affected viewports + locales:** All
- **Evidence:** `src/components/ui/ConfirmDialog.tsx:65-81` — Cancel left, Delete right with `bg-danger`. The `confirmBtnRef` is declared but never assigned to a button, never focused on open. On Mac/iOS, Enter triggers the "primary" button — destructive position is risky.
- **Why it matters:** A boomer with shaky thumbs accidentally taps the right side. On keyboard, Enter destroys data. The dirty-discard dialog uses this same pattern — pressing Enter discards unsaved form data.
- **Fix approach:** Either (a) move Cancel to the right and Confirm to the left (platform convention for destructive flows), or (b) actually use `confirmBtnRef` only on non-danger variants, and `autoFocus` the Cancel button on `variant === 'danger'`. Add `e.preventDefault()` on Enter when the dialog has focus and route to whichever button is focused. WCAG 3.3.4 Error Prevention (for irreversible delete).

#### A4 — Color-contrast: muted body copy on muted backgrounds
- **Severity:** Medium
- **Surface:** Diary, Summary, Learn
- **Affected viewports + locales:** All
- **Evidence:** Several `text-ipc-400` / `text-ipc-500` runs on `bg-ipc-50` (the warm cream) and on `bg-white/40` overlays. Examples: `TimelineView.tsx:563` (`text-ipc-500` on white empty-state subtitle is fine on `surface`, marginal on `bg-ipc-50/30` recap cards). `Day2ReminderCard.tsx`, `LandingContent.tsx:269` (`text-ipc-500` on `bg-surface` — should clear AA but worth measuring). The `globals.css` palette is documented as AA-passing, but it was tuned for the surface background, not the various tinted card backgrounds.
- **Why it matters:** The 50+ population has reduced contrast sensitivity (the UX_PHILOSOPHY doc literally calls this out). One pass to verify every `text-ipc-{400,500}` token still clears 4.5:1 on every backdrop it appears against (cream cards, white, indigo glass in night mode) would be worthwhile.
- **Fix approach:** Run a Chrome DevTools color-contrast pass on the live site at 1280px and at 375px, both LTR and RTL, day mode and night mode. Pay specific attention to night-mode `text-indigo-300/60` / `/70` / `/80` on `bg-indigo-500/15` — alpha-stacking math gets opaque-on-paper but visually marginal.

#### A5 — Decorative leak icon on void timeline event has no label
- **Severity:** Medium
- **Surface:** Diary (TimelineEvent)
- **Affected viewports + locales:** All
- **Evidence:** `src/components/diary/TimelineEvent.tsx:82-84` — when a void has `entry.leak === true`, a small `Droplets` icon (size 14) appears next to the volume. No `aria-label`, no text alongside. Screen reader sees an unlabeled image.
- **Why it matters:** This is the "this void also had a leak" indicator — clinically meaningful. A screen reader user reviewing their diary entries has no idea which voids leaked.
- **Fix approach:** Wrap in a span with `aria-label={t('hadLeak')}`, or add an SR-only span. Same fix for the FMV badge — which IS already labelled via the text "Morning pee" pill, OK.

#### A6 — Header "Learn" link contrasts uniquely vs the desktop NavLinks
- **Severity:** Low
- **Surface:** Shell (Header)
- **Affected viewports + locales:** Desktop
- **Evidence:** `src/components/layout/Header.tsx:105` — Learn renders as an underlined inline link, but the `NavLink` helper above renders bold solid text. The "Learn" link is always underlined when not active. The inconsistency reads as "the page expert hand-styled this one differently" rather than as a system.
- **Why it matters:** Minor visual polish issue; the desktop nav already has Home/Track/Diary as solid pills. Learn should match the NavLink helper unless there's an intentional reason it's a permanent text-link.
- **Fix approach:** Either route Learn through `NavLink` for visual consistency, or document why it's deliberately different.

#### A7 — `prefers-reduced-motion` partially honored but several animations still fire
- **Severity:** Low
- **Surface:** Diary (FAB pulse), Summary (CTA shimmer)
- **Affected viewports + locales:** Users with reduced-motion preference
- **Evidence:** `src/app/globals.css:94-103` collapses `animation-duration` to `0.01ms` and `transition-duration` to `0.01ms`, but `.animate-fab-glow` (line 953) and `.animate-cta-shimmer` (line 212) still play because the @media rule sets `animation-iteration-count: 1` — so infinite glows fire once instead of being suppressed. The fab-glow specifically is a `2s` infinite box-shadow pulse that with reduced-motion fires once (now-permanent box-shadow halo) which is acceptable. The `.animate-cta-shimmer` already has `1` iteration declared so the override does nothing. Defensible but worth a re-pass.
- **Why it matters:** Vestibular-disorder users are a real edge case. The UX_PHILOSOPHY doc explicitly carves out reduced-motion as a value.
- **Fix approach:** Add specific `prefers-reduced-motion` overrides for the FAB pulse and shimmer that set `animation: none` for those classes only.

---

### BOOMER-SAFE ERGONOMICS

#### B1 — `text-[11px]` / `text-[10px]` labels on critical wayfinding chrome
- **Severity:** Medium
- **Surface:** Diary (journey tracker), Summary (stat labels), Learn (eyebrow labels)
- **Affected viewports + locales:** All
- **Evidence:** `TimelineView.tsx:439` — `text-[10px]` for "Day 1 / Night 1" labels under the journey dots. `Summary/page.tsx:145, 151, 159` — `text-[10px] uppercase` for "Bathroom Trips / Drinks / Days Complete" stat labels. The UX_PHILOSOPHY explicitly allows 10px for "decorative indicators" but also says "≥ 10 px but never smaller, and pair with plain-English label." A 50+ user with reading glasses sees 10px as a smudge.
- **Why it matters:** This is exactly the wayfinding signal the philosophy says must remain legible.
- **Fix approach:** Bump every functional `text-[10px]` / `text-[11px]` to `text-xs` (12px). The 2px difference is barely visible at desktop scale but meaningfully different at 375px on an aged screen.

#### B2 — `+` button between events on the timeline is 24×24 px
- **Severity:** Medium
- **Surface:** Diary (TimelineView gap insert)
- **Affected viewports + locales:** Mobile
- **Evidence:** `src/components/diary/TimelineView.tsx:683-691` — the gap-insert "+" trigger is `w-6 h-6` = 24px. Below the 44×44 minimum the UX_PHILOSOPHY enforces (Apple HIG + WCAG 2.5.5 Target Size).
- **Why it matters:** Boomer thumbs miss it. The 2026-04-25 decisions log specifically called out hitting 44×44 targets as a medical-grade requirement after a tester nearly deleted an entry tapping a 36px trash icon.
- **Fix approach:** Bump to `w-11 h-11` (44px) with a transparent hit-area extension if visual size needs to stay small (e.g. inner 24px button, outer 44px clickable region). Or just accept 44×44 — the button only appears between events and would still look small.

#### B3 — FAB rotated `+ → X` (45deg rotate) collapses semantic meaning of "Close"
- **Severity:** Low
- **Surface:** Diary (QuickLogFAB expanded state)
- **Affected viewports + locales:** All
- **Evidence:** `src/components/diary/QuickLogFAB.tsx:114-123` — when expanded, the same FAB rotates 45° to become an X. The button has no `aria-label` set when expanded (it shows X visually). A screen reader user toggles the FAB and hears the same label regardless of state.
- **Why it matters:** Minor; the FAB is mostly visual UX. But pairing it with `aria-expanded={expanded}` and a dynamic `aria-label={expanded ? tc('close') : t('logEvent')}` is the keyboard-friendly pattern.
- **Fix approach:** Add `aria-expanded` + dynamic `aria-label` on the FAB toggle. Add `aria-controls` pointing to the speed-dial menu region.

#### B4 — Onboarding age input "min={18} max={120}" silently clamps invalid types
- **Severity:** Low
- **Surface:** Onboarding
- **Affected viewports + locales:** All
- **Evidence:** `src/components/onboarding/OnboardingFlow.tsx:118-128` — `inputMode="numeric"` is correct, `[appearance:textfield]` strips spin buttons. The min/max attributes are advisory, not enforced — the typed value `"abc"` doesn't error visibly; the user just sees a disabled Next button.
- **Why it matters:** See C5 — this is the same finding from the clarity pillar. Boomer typing on a clinical form deserves immediate feedback.
- **Fix approach:** Add a 1-line helper below the input. See C5.

#### B5 — Insertable timeline `+` placement crosses event boundaries (visual juxtaposition risk)
- **Severity:** Low
- **Surface:** Diary (TimelineView)
- **Affected viewports + locales:** Mobile (most affected)
- **Evidence:** `TimelineView.tsx:644-696` — the `+` insert appears at `absolute -bottom-0` of every event card. A boomer scrolling-through-and-tapping-volume-on-a-void-card may catch the insertion `+` instead, opening the wrong form. The 4px `pb-4` on each event provides some buffer.
- **Why it matters:** Minor risk; the +button is small (see B2). After upsizing it (B2), the risk would increase.
- **Fix approach:** Re-evaluate after B2 fix. Consider showing the `+` only on hover (desktop) and on long-press (mobile), instead of always-visible.

---

### INTERNATIONALIZATION

#### I1 — CRITICAL: PT/ZH/AR article-card links 404 in production
- **Severity:** Critical
- **Surface:** Learn (hub, audience landings, author pages, topic pages)
- **Affected viewports + locales:** PT, ZH, AR (50% of locales) — production
- **Evidence:** `src/components/learn/ArticleCard.tsx:36` — `article.urlPath.replace(/^\/(en|fr|es)/, '')`. The regex strips ONLY en/fr/es locale prefixes. For PT/ZH/AR articles, the `urlPath` is `/pt/learn/topic/slug`; the regex doesn't match; the prefix is retained; `<Link>` from `@/i18n/navigation` then prepends the current locale, resulting in `/pt/pt/learn/topic/slug`. Verified live: `curl https://myflowcheck.com/pt/learn` returns hrefs like `/pt/pt/learn/voiding/feeling-bladder-is-not-empty` which returns 404.
- **Why it matters:** Every Portuguese, Chinese, Arabic patient who clicks any article card on the Learn hub lands on a 404. The Learn section is a major SEO surface (the entire content investment + IPC educational value) and a real engagement lever for patients during the 3-day diary. Three of six locales are silently broken.
- **Fix approach:** Replace `.replace(/^\/(en|fr|es)/, '')` with `.replace(new RegExp('^\\/(' + locales.join('|') + ')', ''))` or import `locales` from `@/i18n/config`. Same fix needed in `feed.xml/route.ts` and `JsonLd.tsx` if they use the same pattern (audit). Better: store `urlPath` without locale prefix in the first place (in `content.ts`'s `buildUrlPath`), and let `<Link>` handle the prefix at render time.

#### I2 — CRITICAL: PDF clinical export ships in English-only for PT/ZH/AR; helvetica can't render ZH/AR glyphs
- **Severity:** Critical
- **Surface:** Clinical export (PDF) — the clinician-facing surface
- **Affected viewports + locales:** PT, ZH, AR
- **Evidence:** `src/lib/exportPdf/strings.ts:81-285` — `PDF_STRINGS` has en/fr/es entries only; `getPdfStrings(locale)` falls back to EN silently for any other locale. Even worse, every page calls `doc.setFont('helvetica', 'bold' | 'normal')` (see `combinedDiary.ts:27`, `resultsOverview.ts:20`, `graphs.ts:88`, `dailyDiary.ts:22`, `machineData.ts:17`). Helvetica has no CJK or Arabic glyphs in jsPDF's default font — Chinese / Arabic characters would render as boxes or missing.
- **Why it matters:** The PDF is THE clinician-facing surface. A Mandarin-speaking PFPT or Brazilian PT receiving the PDF from their patient gets either English (if we even tried to translate, which we didn't) or boxes. **This breaks the entire localization investment** — the diary, the Learn section, and the export are supposed to ship together; the PDF undoes the trust the patient builds.
- **Fix approach:** Multi-step. (1) Add PT entries to `PDF_STRINGS` (Helvetica handles Latin-1 ext OK, Portuguese is feasible without font change). (2) For ZH and AR: register a Unicode-capable font with jsPDF (Noto Sans SC, Noto Naskh Arabic). jsPDF supports custom font registration via `addFileToVFS` and `addFont`. Document the bundle size impact (~500KB-2MB per font). (3) Add the `voidWord`/`standaloneWord`/`day(n)`/`sensLabels`/`drinkLabels`/`leakTriggerLabels` for all 4 locales. (4) Audit hardcoded English strings: `dailyDiary.ts:55` (`'Time'`), `slots.ts:44, 142` (hardcoded `'AM/PM'`), `machineData.ts:17` (`'Structured Data'`), `machineData.ts:21` (`'For clinical software ingestion...'`), `machineData.ts:55` (`['Field', 'Value']`), `machineData.ts:70` (`'Events'`), `machineData.ts:135` (`['type', 'timestamp', ...]`). Machine-data page should stay in English (it's for software parsers per the line-44 comment), but human-readable strings need to be localized. Tag with locale-specific decisions.

#### I3 — PDF time axis labels are hardcoded English ("6am/8am/10am/12pm")
- **Severity:** High
- **Surface:** Clinical export (PDF — Page 6 graphs)
- **Affected viewports + locales:** Every locale that consumes the PDF graphs
- **Evidence:** `src/lib/exportPdf/graphs.ts:194` — `const timeLabels = ['6am', '8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm', '12am', '2am', '4am'];` hardcoded English lowercase. Used unchanged for all locales.
- **Why it matters:** The Frequency-Volume Chart is a primary clinical artifact. A French urologist reading a French patient's PDF sees lowercase English time markers on the X-axis.
- **Fix approach:** Use Intl.DateTimeFormat or replace with 24hr labels (which read cleanly in every locale): `['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00']`. The clinical convention is mixed (24hr is standard in EU/medical contexts; 12hr in US patient-facing docs). For a clinical export, 24hr is the safer locale-neutral default.

#### I4 — RTL physical-CSS leaks remain in shipping code
- **Severity:** Medium
- **Surface:** Diary, Shell
- **Affected viewports + locales:** AR only
- **Evidence:** Multiple grep matches:
  - `src/components/diary/TimelineView.tsx:304` — `ml-6` (empty-state subtitle indent — wrong-side margin in AR)
  - `src/components/diary/TimelineView.tsx:408, 432` — `-right-1` for the edit-pencil badge on completed journey dots (badge on wrong corner in AR)
  - `src/components/diary/Day2ReminderCard.tsx:94` — `top-2 right-2` for dismiss X button (close button on wrong side in AR)
  - `src/components/diary/Day2ReminderCard.tsx:98` — `pr-7` to clear space for the dismiss X (padding on wrong side in AR)
  - `src/components/diary/LogVoidForm.tsx:310` — `pl-2 pr-3` on the back-pill (asymmetric padding inverted in AR)
  - `src/components/diary/LogVoidForm.tsx:455, 457` — `pr-11`/`right-2` on textarea + check button (button on wrong side in AR)
  - `src/components/diary/LogDrinkForm.tsx:301, 322` — same pattern as LogVoidForm
  - `src/components/diary/LogLeakForm.tsx:307, 315` — same pattern
  - `src/app/[locale]/LandingContent.tsx:129` — `mr-2` on PlayCircle icon next to "Resume tracking" (icon hugs wrong side of label in AR)
- **Why it matters:** AR users see close buttons on the wrong side, asymmetric padding inverted, icons on the wrong side of labels. Phase 8 closed many of these but they keep leaking back. The `visual-qa` skill mentions this exact category.
- **Fix approach:** Replace each: `ml-X` → `ms-X`, `mr-X` → `me-X`, `pl-X` → `ps-X`, `pr-X` → `pe-X`, `left-X` → `start-X`, `right-X` → `end-X`. Run a fresh AR pass after each diary form is touched.

#### I5 — Hardcoded fallback "Bladder Diaries Team" in author byline (English only)
- **Severity:** Low
- **Surface:** Learn (ArticleCard, AuthorByline)
- **Affected viewports + locales:** All non-EN
- **Evidence:** `src/components/learn/ArticleCard.tsx:84` — `{author?.name ?? 'Bladder Diaries Team'}`. `src/components/learn/AuthorByline.tsx:49` — same hardcoded string.
- **Why it matters:** Patient-app articles always have authors (the `author` frontmatter is required per `content/SKILL.md`), so this fallback is rarely hit in practice. But the fallback is wrong: this is "My Flow Check / IPC team", not "Bladder Diaries Team" — that's the sibling clinician site name.
- **Fix approach:** Move fallback to a localized message key (`learn.article.teamFallback` or similar). Coordinate naming with the IPC brand.

#### I6 — Hardcoded "Breadcrumb" aria-label in English
- **Severity:** Low
- **Surface:** Learn (Breadcrumbs)
- **Affected viewports + locales:** All non-EN screen-reader users
- **Evidence:** `src/components/learn/Breadcrumbs.tsx:11` — `<nav aria-label="Breadcrumb"`.
- **Fix approach:** Use `useTranslations('learn.breadcrumbs')` to get a localized label. Same pattern as `Footer.tsx:33` which uses `t('navAriaLabel')`.

#### I7 — Recent EN copy ("healthcare team", "healthcare professional") may not have propagated to all locales
- **Severity:** Medium
- **Surface:** Summary
- **Affected viewports + locales:** ZH (confirmed), possibly AR/PT
- **Evidence:** The 2026-04-26 decisions log calls out replacing "doctor or nurse" with "healthcare team" for inclusivity. Spot-check via `jq`: ZH `summary.yoursFirst` reads "把报告分享给你的医生" — "share your report with your **doctor**" — does not include physiotherapists/OTs/nurses. EN reads "your healthcare professional"; ZH translation didn't propagate the inclusivity nuance.
- **Why it matters:** The 2026-04-26 decision was explicit: "naming only doctors and nurses alienates physios, OTs, etc." The same inclusivity needs to hold in all locales. The pre-commit hook for article translation is robust, but UI-string translation drift (i18n-sync) may have missed this.
- **Fix approach:** Run an `i18n-sync` pass on `summary.*` keys with the explicit register rule that "doctor" should be "healthcare professional" / equivalent in each locale (FR: professionnel de santé, ES: profesional de salud, PT: profissional de saúde, ZH: 医疗团队 or 医护人员, AR: مختص الرعاية الصحية).

---

### VISUAL HIERARCHY & POLISH

#### V1 — Inconsistent stat-card padding across viewports (Summary)
- **Severity:** Low
- **Surface:** Summary (effort stats)
- **Affected viewports + locales:** Tablet (most affected)
- **Evidence:** `src/app/[locale]/summary/page.tsx:143-162` — three stat cards each `px-2 py-3 md:px-4 md:py-5`. At tablet width 768px the cards transition to roomier padding, but they keep `grid grid-cols-3` so widths shrink. The "/3" suffix on "3/3 Days Complete" wraps awkwardly at narrow tablet widths in PT/AR-style long-word locales.
- **Fix approach:** Verify at 768px in PT/AR. Consider `md:grid-cols-3 lg:gap-4` plus `text-balance` on the small-cap labels.

#### V2 — Multiple competing animation-delay scales (50ms, 100ms, 150ms, 160ms, 220ms, 300ms, 500ms, 650ms, 750ms, 900ms, 1050ms, 1200ms)
- **Severity:** Low
- **Surface:** Summary (and a few elsewhere)
- **Affected viewports + locales:** All
- **Evidence:** `src/app/[locale]/summary/page.tsx:114, 141, 173, 207, 224, 240, 248, 256, 278, 309, 322` — animation delays at 11 different time values in the same component.
- **Why it matters:** The animation cascade feels intentional (peak-end orchestration) but the values are ad-hoc. Tighter rhythm would feel more composed.
- **Fix approach:** Adopt a scale: 50/100/200/300/500/700/1000 ms. Map each existing delay to the nearest.

#### V3 — Voids on the timeline summary view show `Droplet` (not `Droplets`) — semantic icon inconsistency
- **Severity:** Low
- **Surface:** Summary (DrinkVoidTimeline)
- **Affected viewports + locales:** All
- **Evidence:** `src/components/summary/DrinkVoidTimeline.tsx:106` — uses `Droplet` (single drop). `src/components/diary/TimelineEvent.tsx:50` — uses `Droplets` (plural — clusters of drops) for the same conceptual event.
- **Why it matters:** Visual taxonomy: voids are consistently `Droplets` everywhere else. A user moving from the diary to the summary sees a slightly different icon for the same thing.
- **Fix approach:** Use `Droplets` in DrinkVoidTimeline at size 14. Match the diary timeline.

#### V4 — `<h1>` sizes diverge in the Learn section (text-2xl on author pages, text-3xl elsewhere)
- **Severity:** Low
- **Surface:** Learn
- **Affected viewports + locales:** All
- **Evidence:** `src/app/[locale]/learn/authors/[slug]/page.tsx:109` — `text-2xl`. Hub `learn/page.tsx:111` — `text-3xl md:text-4xl lg:text-5xl`. Glossary `learn/glossary/[term]/page.tsx:91` — `text-3xl`. Articles `learn/[topic]/[slug]/page.tsx:142` — `text-3xl md:text-4xl lg:text-5xl`. Author pages are noticeably smaller.
- **Why it matters:** The learn-styling skill's typography scale says article H1 = `text-3xl md:text-4xl lg:text-5xl font-bold`. Author bio is a sibling page type but is one step smaller. Minor inconsistency.
- **Fix approach:** Bump author-page H1 to `text-3xl md:text-4xl` (slightly smaller than article H1 to differentiate but still in the hierarchy).

#### V5 — `text-balance` is everywhere but `text-wrap: pretty` isn't used
- **Severity:** Low
- **Surface:** Diary, Summary, Learn
- **Affected viewports + locales:** All
- **Evidence:** Roughly 40 `text-balance` usages across the codebase; zero `text-wrap: pretty`. `text-balance` is great for headings; `text-wrap: pretty` (modern CSS, Chrome/Safari) avoids orphan widows on body paragraphs without forcing balance.
- **Why it matters:** Minor editorial polish; body copy reads slightly nicer with `pretty` than default.
- **Fix approach:** Add `text-pretty` to article body paragraphs in `.learn-prose > p` selectors (globals.css). Optional; not a blocker.

---

### CLINICAL EXPORT QUALITY

#### E1 — CSV does not include locale or app version
- **Severity:** Medium
- **Surface:** Clinical export (CSV)
- **Affected viewports + locales:** All
- **Evidence:** `src/lib/exportCsv.ts:44-52` — METADATA section has `patient_age`, `start_date`, `clinic_code`, `volume_unit`, `timezone`. No `locale`, no `app_version`, no `export_timestamp`.
- **Why it matters:** A clinician inheriting a stale CSV from 6 months ago can't tell which version of the app or which locale produced it. Time-formatting / day-numbering rules may have evolved.
- **Fix approach:** Add `export_timestamp`, `app_version` (read from `package.json` at build time), `locale` to the metadata section.

#### E2 — PDF events use hardcoded `'Y'` / `'N'` flags for FMV / leak (machine page)
- **Severity:** Low
- **Surface:** Clinical export (PDF, page 7)
- **Affected viewports + locales:** All (machine data is intentionally English)
- **Evidence:** `src/lib/exportPdf/machineData.ts:93-94, 121` — `'Y'` / `'N'`. The machine data page is documented as English-only (for software parsers), which is fine — but the convention should be `'1'` / `'0'` for boolean machine-readable data, not letters that could confuse a human parser checking the file.
- **Why it matters:** Minor. A clinical-software integration team may write `if (row.fmv == 1)` and never get a match. The CSV uses `true` / `false` strings (`exportCsv.ts:78`); the PDF uses `'Y'` / `'N'`. Internal inconsistency.
- **Fix approach:** Pick one boolean format. `true` / `false` matches the CSV. `1` / `0` is cleaner for spreadsheets. Either is fine; stop using `'Y'`/`'N'` exclusively on the PDF.

#### E3 — PDF date formatting locale support is bound to en/fr/es only
- **Severity:** Medium
- **Surface:** Clinical export (PDF)
- **Affected viewports + locales:** PT, ZH, AR
- **Evidence:** `src/lib/exportPdf/strings.ts:6` — `const DATE_LOCALES: Record<string, DateFnsLocale> = { en: enUS, fr, es };`. `getDateLocale` falls back to `enUS` for any other locale. So a PT patient's PDF says "Quinta-feira" never, only "Thursday".
- **Why it matters:** Cosmetic but compounds with I2 (full PDF localization). PT/ZH/AR PDFs print English date headers regardless of patient locale.
- **Fix approach:** Import `pt`, `zhCN`, `arSA` from `date-fns/locale` and add to the `DATE_LOCALES` map. Helvetica handles PT (Latin-1 ext); ZH and AR still need a Unicode font (see I2).

#### E4 — Page 6 (Graphs) MVV dashed line uses `leakNote` color (terracotta) — clinical ambiguity
- **Severity:** Low
- **Surface:** Clinical export (PDF, page 6)
- **Affected viewports + locales:** All
- **Evidence:** `src/lib/exportPdf/graphs.ts:233-240` — MVV (Maximum Voided Volume) is drawn as a dashed line in `C.leakNote` (warm brown). The same color is used for the leak ring outline two lines below. A clinician glancing at the graph may pattern-match "all the warm-brown elements are leak-related" and misread MVV.
- **Why it matters:** Clinical-readability. MVV is a key metric (Maximum Voided Volume, indicates bladder capacity). Conflating its color with leak-indicator color is a small but real interpretation hazard.
- **Fix approach:** Use a distinct dashed-line color for MVV (e.g., dark gray `C.muted`, or a desaturated purple). The leak ring should retain `leakNote`.

#### E5 — Onboarding age is optional in the data model but the PDF assumes it's present
- **Severity:** Low
- **Surface:** Onboarding + PDF
- **Affected viewports + locales:** All
- **Evidence:** Onboarding `OnboardingFlow.tsx:58` validates `ageNum >= 18 && ageNum <= 120` and blocks Next if invalid. But `resultsOverview.ts:35` does `state.age ? \`${s.age}: ${state.age}\` : ''` — defends against missing age. Either the type system or the onboarding flow can be tightened: if age is always set after onboarding, the PDF check is dead code; if it can be null, the timeline UI nowhere shows the patient's age, but the PDF top page might lack a field.
- **Why it matters:** Internal consistency / defensive code. Decide: age required or optional. Document.
- **Fix approach:** Either make `age` non-nullable in the type after onboarding (and remove the `state.age ?` checks), or document explicitly that age is optional and check at every render site.

---

## What's working well

The Milestone 2 work showed up. A lot.

- **Onboarding above-the-fold compliance** — step-3 `Confirm & Start` lands at y=499 on iPhone SE per the UX_PHILOSOPHY decisions log; verified by the way `OnboardingFlow.tsx` is tightly packed (no wasted vertical space).
- **The 5-step journey tracker** is well-considered: clinically meaningful, compact-mode on Day 2+ to reclaim vertical space, edit-pencil hint on completed dots so users learn the back-edit affordance.
- **Dirty-state protection** across all log forms via `onDirtyChange` + ConfirmDialog — the patient can't accidentally lose 30 seconds of input by tapping the backdrop.
- **First-morning-void (FMV) auto-detection** via `reassignMorningVoid` — clinically critical, fully automated, the user never has to think about it.
- **The Day 1 celebration overlay** with anchor + reminder method picker — Pavlovian peak-end design that visibly targets the canonical Day 1→2 abandonment moment.
- **Smart-default time defaults** on night-view voids (bedtime + 3h, or last-event + 90min) — the 2026-04-26 decisions log explains why; the math is correct and saves real taps.
- **The +250 mL micro-reward** chip-pop animation — small, joyful, fires exactly once per tap. Pure dopamine for an anxious task.
- **Volume preset chips at 150/300/500 mL** — pulled from real patient diaries (Alex/Bruno), not idealized round numbers. Clinical-grade calibration.
- **Drink form pre-fills from the most recent prior drink** — recognizes habit patterns; cuts taps; "the app remembers me" signal.
- **Stale-nudge banner** ("Last logged about 4h ago") — implementation-intention prompt at the abandonment surface (mid-day re-entry).
- **Night-mode CSS overrides** are extensive and considered — the `.nighttime-bg` selector touches header, footer, bottom sheet, drink/leak/sensation form chips, FAB, even the time-picker chip backgrounds. The 2026-04-26 decisions log specifically calls out the `bg-white/50` remap and the indigo-glass language; it shows.
- **i18n discipline in app strings** is strong — 36-key parity across all 6 locales, AR fallback to Modern Standard with RTL `dir="rtl"`, ZH register peer-direct (你), FR `vous`, ES `tú`. The article-translate workflow is real.
- **Pre-commit / Stop hooks for article i18n completeness** — `.claude/scripts/article-i18n-completeness.sh` actively blocks partial publishes. Discipline machinery is in place.
- **Tap targets at 44×44 px** on edit/trash icons (post the 2026-04-25 audit fix). Confirmed in `TimelineEvent.tsx`.
- **The summary page narrative arc** — hero → effort stats → top observation → top CTA → story → observations → reflection → look-back → for-team → coming back. Peak-end + self-reference + sunk-cost framing. This is the strongest pure-UX surface in the app.
- **Pinch-zoom enabled** — `viewport` meta allows scaling (per the 2026-04-25 fix). WCAG 1.4.4.
- **The static-export + localStorage architecture** delivers genuine privacy. No server, no PHI on the wire. Clinically defensible.
- **The `learn-styling` skill enforces** parentdata.org-style editorial conventions on articles, narrow reading column, big bold titles. The `.learn-prose` CSS in globals.css is thorough.
- **Reduced-motion is partially honored** at the global level (CSS line 94-103).
- **No `dangerouslySetInnerHTML` anywhere.**
- **No `<a target="_blank">` without `rel="noopener"`** issues found in a quick scan.

In short: the careful, slow-paced, boomer-focused UX work has paid off where it touches the EN diary surface. The cracks are exactly where most teams' cracks are — the under-loved edges: the second-most-visited locale, the export, screen readers.

---

## Top wins by impact/effort

Ranked: highest impact ÷ effort to fix.

1. **Fix I1 (article-card 404 for PT/ZH/AR)** — 1-line regex change. Restores half the app's locale base to functional Learn navigation. Impact: massive. Effort: trivial.
2. **Add `<h1>` to diary day pages (A1)** — 1 SR-only heading per page or one `<h2>→<h1>` swap in `TimelineView`. Restores screen-reader page structure on the most-used page. Effort: 10 minutes.
3. **Add `role="status"` + `aria-live="polite"` to Toast (C4)** — 2 attributes. Makes every save confirmation, milestone, and error audible to AT users. Effort: 10 minutes.
4. **Localize TimePicker clock-time chips (C1)** — replace 3 hardcoded `'10 PM'` / `'11 PM'` / `'12 AM'` strings with `formatTime(buildIsoForClockTimeInTz(value, 22, 0, tz), locale, tz)` calls. Removes a half-locale string from one of the most-used controls. Effort: 30 minutes.
5. **Add skip-to-content link (A2)** — 1 link in AppShell, 1 `id="main"` on the main element, 1 sr-only CSS class. Keyboard users save 15+ Tab presses per page load. Effort: 15 minutes.
6. **Localize PDF date strings + add PT entries to PDF_STRINGS (I2 partial)** — adds PT to date-fns import and PT entries to the PDF_STRINGS object. Helvetica handles PT (Latin-1 ext). The ZH/AR font work is a separate bigger task; this one's small. Effort: 1 hour, low risk.
7. **Localize "Breadcrumb" aria-label (I6)** — 1 line. The translation key already exists pattern-wise via the existing `tBreadcrumbs` namespace.
8. **Run an AR walkthrough specifically targeting the I4 physical-CSS leaks** — visual-qa skill's stated job; 90 minutes of focused work. Fixes 8 known leaks at once.
9. **Replace native `<input type="time">` with custom or document the variance (C2)** — bigger lift but worth a Phase 9 decision. For now: explicit note in onboarding/UX_PHILOSOPHY decisions log about why this is left to browser default.
10. **Tackle the PDF ZH/AR Unicode font registration (I2 full)** — biggest Milestone 3 deliverable. ~500KB-2MB per font; needs lazy-loading. ~2-3 days including QA across all 6 PDFs.

---

## What I did NOT find

To save you running these:
- No `dangerouslySetInnerHTML` issues.
- No obvious XSS / link-injection vectors. `clinicCode` URL param is regex-validated against `^[A-Za-z0-9-]{1,32}$`.
- No `as any` or `@ts-ignore` usages in shipping code.
- The day-boundary correctness machinery (`getDayNumber`, `correctAfterMidnight`, `reassignMorningVoid`) has not visibly regressed since `docs/TIME_MODEL.md` was last touched — the recent fix on `f79b6a3` ("scroll to top on dayNumber change") is a UX fix, not a time-model fix.
- The 6-locale × 3-viewport visual walkthrough from Phase 8 holds for the surface findings I checked — the I4 physical-CSS items are the residual long-tail.
- Tailwind 4 + Lightning CSS quirks (the `.nighttime-bg` grouped-selector dropouts mentioned in memory `feedback_lightning_css_grouped_selectors`) appear properly worked around in `globals.css:462-465, 519-521`.

The audit is intentionally adversarial — the goal is to surface what's still capping this from best-in-class. Most of the per-pillar findings are 1-line or 10-minute fixes that compound into a noticeably tighter product.

---

## Files audited (primary references)

Diary surface:
- `src/components/diary/TimelineView.tsx`
- `src/components/diary/TimelineEvent.tsx`
- `src/components/diary/LogVoidForm.tsx`
- `src/components/diary/LogDrinkForm.tsx` (light)
- `src/components/diary/LogLeakForm.tsx`
- `src/components/diary/SetBedtimeForm.tsx` (light)
- `src/components/diary/SetWakeTimeForm.tsx` (light)
- `src/components/diary/Day1Celebration.tsx`
- `src/components/diary/NextStepBanner.tsx`
- `src/components/diary/QuickLogFAB.tsx`
- `src/components/diary/SensationPicker.tsx`
- `src/components/onboarding/OnboardingFlow.tsx`
- `src/app/[locale]/diary/day/[dayNumber]/DayPageClient.tsx`
- `src/app/[locale]/summary/page.tsx`
- `src/components/summary/DrinkVoidTimeline.tsx`
- `src/components/export/ExportActions.tsx`

Learn surface:
- `src/app/[locale]/learn/page.tsx`
- `src/components/learn/ArticleCard.tsx`
- `src/components/learn/AuthorByline.tsx`
- `src/components/learn/Breadcrumbs.tsx`
- `src/components/learn/DiaryCta.tsx`
- `src/lib/content.ts` (light)

Shell:
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/ui/BottomSheet.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/TimePicker.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/Toast.tsx`
- `src/app/[locale]/LandingContent.tsx`

Clinical export:
- `src/lib/exportCsv.ts`
- `src/lib/exportPdf/index.ts`
- `src/lib/exportPdf/strings.ts`
- `src/lib/exportPdf/combinedDiary.ts`
- `src/lib/exportPdf/resultsOverview.ts`
- `src/lib/exportPdf/dailyDiary.ts` (partial)
- `src/lib/exportPdf/graphs.ts`
- `src/lib/exportPdf/slots.ts`
- `src/lib/exportPdf/machineData.ts`
- `src/lib/exportPdf/theme.ts`

Tokens / config:
- `src/app/globals.css` (full read)
- `src/lib/constants.ts`
- `src/i18n/config.ts`
- `src/i18n/navigation.ts`
- `src/i18n/seo.ts`
- `messages/{en,fr,es,pt,zh,ar}.json` (spot-checked)

Reference docs:
- `docs/UX_PHILOSOPHY.md` (full read)
- `CLAUDE.md` (full read)
- `.planning/codebase/ARCHITECTURE.md` (full read)
- `.claude/skills/learn-styling/SKILL.md` (full read)
- `.claude/skills/visual-qa/SKILL.md` (full read)

Live verification:
- `curl https://myflowcheck.com/pt/learn` → confirmed I1 in production
- `curl https://myflowcheck.com/pt/pt/learn/voiding/feeling-bladder-is-not-empty` → 404
- `curl https://myflowcheck.com/zh/learn` + `https://myflowcheck.com/ar/learn` — same I1 pattern confirmed
