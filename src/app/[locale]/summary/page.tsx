'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import { useDiaryStore, useStoreHydrated } from '@/lib/store';
import DaySummaryCard from '@/components/export/DaySummaryCard';
import ExportActions from '@/components/export/ExportActions';
import DrinkVoidTimeline from '@/components/summary/DrinkVoidTimeline';
import SummaryObservations, { keyToCopy as observationToCopy } from '@/components/summary/SummaryObservations';
import CompletionHero from '@/components/summary/CompletionHero';
import Button from '@/components/ui/Button';
import { HelpCircle, Lock, AlertTriangle, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { getCurrentDay } from '@/lib/utils';
import { generateObservations } from '@/lib/observations';
import Image from 'next/image';
import IpcInfoModal from '@/components/ui/IpcInfoModal';
import Container from '@/components/layout/Container';

export default function SummaryPage() {
  const router = useRouter();
  const t = useTranslations('summary');
  const store = useDiaryStore();
  const { diaryStarted, startDate, timeZone, voids, drinks, getBedtimeForDay, getVoidsForDay, getDrinksForDay } = store;
  // Don't make any rendering or redirect decision until persist has finished
  // rehydrating from localStorage — otherwise a deep-link / refresh of
  // /summary fires the redirect-to-"/" useEffect on the empty initial state
  // and bounces the patient even when localStorage holds a complete diary.
  const hydrated = useStoreHydrated();
  const isComplete = hydrated && diaryStarted && !!getBedtimeForDay(3);

  // Phase 16 CEL-05: one-time completion hero gate.
  // Latch the persisted summaryCelebrationShown flag ONCE at the moment of
  // first complete-render, so mid-visit store updates (the hero itself marks
  // the flag true on mount) do not unmount the hero during this visit. On the
  // NEXT visit, the latch starts null, captures the now-true value, the gate
  // evaluates false, and the hero does not mount. Net: hero shows exactly once.
  // We mirror the captured value into useState (not a bare ref) so the value
  // is readable during render without breaking the react-hooks/refs rule, and
  // a useRef tracks whether the capture has already happened (so a re-render
  // of the parent due to the latch-state update does not re-capture).
  // The setState-inside-useEffect is intentional and falls under the rule's
  // documented "synchronize React state with an external system (Zustand
  // persisted store) once on first hydration" exception. We intentionally do
  // not switch to useSyncExternalStore for this single one-shot latch.
  const summaryCelebrationShown = useDiaryStore((s) => s.summaryCelebrationShown);
  const [initialCelebrationShown, setInitialCelebrationShown] = useState<boolean | null>(null);
  const celebrationCaptured = useRef(false);
  useEffect(() => {
    if (!hydrated || !isComplete) return;
    if (celebrationCaptured.current) return;
    celebrationCaptured.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialCelebrationShown(summaryCelebrationShown);
  }, [hydrated, isComplete, summaryCelebrationShown]);
  const shouldShowCelebrationHero = isComplete && initialCelebrationShown === false;

  // Pavlovian rewards at the top: effort visualization + one-line standout.
  // Both computed only when the diary is complete (we never render this
  // section before isComplete is true).
  const voidCount = voids.length;
  const drinkCount = drinks.length;
  const topObservation = isComplete ? generateObservations(store)[0] : undefined;

  // Data consistency check
  const dataWarnings: string[] = [];
  if (isComplete) {
    for (const d of [1, 2, 3] as const) {
      const voids = getVoidsForDay(d);
      const drinks = getDrinksForDay(d);
      if (voids.length === 0) dataWarnings.push(t('noPeeEntries', { day: d }));
      if (drinks.length === 0) dataWarnings.push(t('noDrinkEntries', { day: d }));
    }
  }

  useEffect(() => {
    // Wait until hydration completes before deciding to redirect.
    if (!hydrated) return;
    if (!diaryStarted) router.replace('/');
  }, [hydrated, diaryStarted, router]);

  const tracked = useRef(false);
  useEffect(() => {
    if (isComplete && !tracked.current) {
      tracked.current = true;
      track('view_results');
    }
  }, [isComplete]);

  // Until hydration finishes, show a non-committal loading state matching
  // the Suspense fallback used in landing. This avoids a flash of either
  // the locked state or the redirect.
  if (!hydrated) {
    return (
      <Container variant="default" as="div" className="pt-12 text-center">
        <h1 className="text-2xl md:text-4xl font-bold text-ipc-950 text-balance leading-tight px-4 md:px-0 mb-6">
          {t('heroTitle')}
        </h1>
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
        </div>
      </Container>
    );
  }

  if (!diaryStarted) return null;

  if (!isComplete) {
    return (
      <Container variant="default" as="div" className="pt-12 text-center">
        <div className="w-16 h-16 rounded-full bg-ipc-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-ipc-400" />
        </div>
        <h2 className="text-xl font-bold text-ipc-950 mb-2 text-balance">{t('diaryLocked')}</h2>
        <p className="text-base text-ipc-500 leading-relaxed">{t('diaryLockedDescription')}</p>
      </Container>
    );
  }

  return (
    <Container variant="default" as="div" className="pt-4 pb-12 space-y-6">
      {shouldShowCelebrationHero && <CompletionHero />}
      {/* Back link — when the diary is complete, return to Day 3 (the latest
          filled day) instead of getCurrentDay(). The latter is a real-world
          calendar diff and lands on Day 1 when a tester completes all three
          days in one sitting (startDate === today), trapping them away from
          the day they actually came from. */}
      <Link
        href={`/diary/day/${isComplete ? 3 : getCurrentDay(startDate, timeZone)}`}
        className="inline-flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors"
      >
        <ChevronLeft size={20} className="rtl:scale-x-[-1]" />
        <span className="text-sm font-medium">{t('backToTracking')}</span>
      </Link>

      {/* HERO — warm, animated finish moment. The "yoursFirst" line restores
          agency: the patient is the first reader of their own story, not a
          data delivery service for the clinic. */}
      <section
        className="text-center pt-2 animate-fade-slide-up opacity-0"
        style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
      >
        <div className="inline-flex w-14 h-14 rounded-full bg-success/15 items-center justify-center mb-3">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-ipc-950 text-balance leading-tight px-4 md:px-0">
          {t('heroTitle')}
        </h1>
        <p className="text-base text-ipc-600 mt-2 text-balance px-4">
          {t('heroSubtitle')}
        </p>
        {/* Identity-framed reinforcement, just under the achievement line.
            Closes the loop "you finished" → "you're the kind of person who
            finishes," which is the lever for the share action below. */}
        <p className="text-sm font-medium text-ipc-700 mt-3 italic text-balance px-6">
          {t('identityFrame')}
        </p>
        <p className="text-sm text-ipc-500 mt-3 text-balance px-6 italic">
          {t('yoursFirst')}
        </p>
      </section>

      {/* EFFORT STATS — three numbers under the hero making the work visible.
          Effort-justification: seeing the count primes value-for-effort and
          softens the ask of sharing the report below. */}
      <section
        className="grid grid-cols-3 gap-2 animate-fade-slide-up opacity-0"
        style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
      >
        <div className="rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 md:px-4 md:py-5 text-center">
          <p className="text-2xl font-bold text-ipc-950 tabular-nums leading-none">{voidCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-ipc-600 mt-1.5 font-semibold leading-tight">
            {t('statBathroomTrips')}
          </p>
        </div>
        <div className="rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 md:px-4 md:py-5 text-center">
          <p className="text-2xl font-bold text-ipc-950 tabular-nums leading-none">{drinkCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-ipc-600 mt-1.5 font-semibold leading-tight">
            {t('statDrinks')}
          </p>
        </div>
        <div className="rounded-2xl bg-ipc-50 border border-ipc-100 px-2 py-3 md:px-4 md:py-5 text-center">
          <p className="text-2xl font-bold text-ipc-950 tabular-nums leading-none">
            3<span className="text-sm font-medium text-ipc-500 ms-1">{t('statOutOf3')}</span>
          </p>
          <p className="text-[10px] uppercase tracking-wide text-ipc-600 mt-1.5 font-semibold leading-tight">
            {t('statDaysComplete')}
          </p>
        </div>
      </section>

      {/* TOP STANDOUT — the strongest pattern from the patient's own data,
          rendered as a single warm line at the top. Self-reference effect:
          information about ME drives engagement orders of magnitude more
          than generic copy. Duplicates are filtered out of the full
          observations card below via omitKeys. */}
      {topObservation && (
        <section
          className="rounded-2xl bg-ipc-50 border border-ipc-100 p-4 animate-fade-slide-up opacity-0"
          style={{ animationDelay: '160ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-ipc-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={16} className="text-ipc-600" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wide text-ipc-600 font-semibold mb-1">
                {t('topStandoutLabel')}
              </p>
              <p className="text-sm text-ipc-800 leading-relaxed">
                {observationToCopy(topObservation, t)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TOP CTA — the primary share action mirrored here so the patient
          doesn't have to scroll a long page to find it. Single PDF button
          (no CSV) keeps the moment focused; the full export panel still
          appears at the bottom under "For your team". Shimmer fires once
          on mount to draw the eye to the share action without nagging. */}
      <section
        className="animate-fade-slide-up opacity-0"
        style={{ animationDelay: '220ms', animationFillMode: 'forwards' }}
      >
        <ExportActions pdfOnly shimmer />
      </section>

      {/* Data warning if entries are missing */}
      {dataWarnings.length > 0 && (
        <div
          className="rounded-2xl bg-amber-50 border border-amber-200 p-4 animate-fade-slide-up opacity-0"
          style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">{t('reviewData')}</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {dataWarnings.join('. ')}{t('reviewDataSuffix')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STORY — the drink-to-void rhythm visualization */}
      <section
        className="animate-fade-slide-up opacity-0"
        style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
      >
        <h2 className="text-lg md:text-xl font-bold text-ipc-950 text-balance mb-1.5">{t('storyTitle')}</h2>
        <p className="text-sm text-ipc-600 leading-relaxed mb-4">{t('storyBody')}</p>
        <div className="space-y-3">
          <DrinkVoidTimeline dayNumber={1} />
          <DrinkVoidTimeline dayNumber={2} />
          <DrinkVoidTimeline dayNumber={3} />
        </div>
      </section>

      {/* OBSERVATIONS — gentle, plain-English. The top-standout already
          surfaced the strongest observation, so omit its key here to avoid
          repeating the same line at the top and the middle of the page. */}
      <section
        className="animate-fade-slide-up opacity-0"
        style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
      >
        <SummaryObservations omitKeys={topObservation ? [topObservation.key] : []} />
      </section>

      {/* REFLECTION — one warm prompt, no input */}
      <section
        className="text-center py-2 animate-fade-slide-up opacity-0"
        style={{ animationDelay: '650ms', animationFillMode: 'forwards' }}
      >
        <p className="text-base font-medium text-ipc-700 italic">{t('reflectionPrompt')}</p>
      </section>

      {/* LOOK BACK — per-day cards with quick edit */}
      <section
        className="animate-fade-slide-up opacity-0"
        style={{ animationDelay: '750ms', animationFillMode: 'forwards' }}
      >
        <h2 className="text-lg md:text-xl font-bold text-ipc-950 text-balance mb-3">{t('lookBackTitle')}</h2>
        <div className="space-y-3">
          <DaySummaryCard dayNumber={1} />
          <DaySummaryCard dayNumber={2} />
          <DaySummaryCard dayNumber={3} />
        </div>
      </section>

      {/* Soft visual divider — separates "for you" from "for your team" */}
      <div className="flex items-center gap-3 pt-2 pb-1">
        <div className="flex-1 h-px bg-ipc-200" />
        <span className="text-xs uppercase tracking-wide text-ipc-500 font-semibold">
          {t('forTeamTitle')}
        </span>
        <div className="flex-1 h-px bg-ipc-200" />
      </div>

      {/* DOCTOR SECTION — alliance framing, IPC card, export */}
      <section
        className="space-y-4 animate-fade-slide-up opacity-0"
        style={{ animationDelay: '900ms', animationFillMode: 'forwards' }}
      >
        <div className="rounded-2xl bg-ipc-50 border border-ipc-100 p-4">
          <div className="flex items-start gap-3">
            <Image src="/ipc-logo.png" alt="IPC" width={28} height={28} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-ipc-700 leading-relaxed">{t('forTeamBody')}</p>
              <p className="text-sm text-ipc-600 leading-relaxed mt-3 italic">
                {t('notAlone')}
              </p>
              <IpcInfoModal>
                <span className="inline-block text-xs font-semibold text-ipc-600 mt-3 underline underline-offset-2">
                  {t('learnMoreIpc')}
                </span>
              </IpcInfoModal>
            </div>
          </div>
        </div>

        <ExportActions />

        {/* Privacy reassurance — important for a population that's deeply
            private about pee. Reduces shame-based avoidance of sharing. */}
        <p className="text-xs text-ipc-500 text-center leading-relaxed px-2">
          {t('privacyNote')}
        </p>
      </section>

      {/* COMING BACK — the long view. Implies progress. Not pushy. */}
      <section
        className="rounded-2xl bg-ipc-50/50 border border-ipc-100 p-4 animate-fade-slide-up opacity-0"
        style={{ animationDelay: '1050ms', animationFillMode: 'forwards' }}
      >
        <p className="text-sm font-semibold text-ipc-800 mb-1">
          {t('comingBackTitle')}
        </p>
        <p className="text-xs text-ipc-600 leading-relaxed">
          {t('comingBackBody')}
        </p>
      </section>

      {/* Help */}
      <div
        className="pt-4 border-t border-ipc-100 animate-fade-slide-up opacity-0"
        style={{ animationDelay: '1200ms', animationFillMode: 'forwards' }}
      >
        <Link href="/help">
          <Button variant="ghost" fullWidth size="md">
            <HelpCircle size={18} />
            {t('helpAndFaq')}
          </Button>
        </Link>
      </div>
    </Container>
  );
}
