'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import { useDiaryStore } from '@/lib/store';
import DaySummaryCard from '@/components/export/DaySummaryCard';
import ExportActions from '@/components/export/ExportActions';
import DrinkVoidTimeline from '@/components/summary/DrinkVoidTimeline';
import SummaryObservations from '@/components/summary/SummaryObservations';
import Button from '@/components/ui/Button';
import { HelpCircle, Lock, AlertTriangle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { getCurrentDay } from '@/lib/utils';
import Image from 'next/image';
import IpcInfoModal from '@/components/ui/IpcInfoModal';

export default function SummaryPage() {
  const router = useRouter();
  const t = useTranslations('summary');
  const { diaryStarted, startDate, timeZone, getBedtimeForDay, getVoidsForDay, getDrinksForDay } = useDiaryStore();
  const isComplete = diaryStarted && !!getBedtimeForDay(3);

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
    if (!diaryStarted) router.replace('/');
  }, [diaryStarted, router]);

  const tracked = useRef(false);
  useEffect(() => {
    if (isComplete && !tracked.current) {
      tracked.current = true;
      track('view_results');
    }
  }, [isComplete]);

  if (!diaryStarted) return null;

  if (!isComplete) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center">
        <div className="w-16 h-16 rounded-full bg-ipc-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-ipc-400" />
        </div>
        <h2 className="text-xl font-bold text-ipc-950 mb-2 text-balance">{t('diaryLocked')}</h2>
        <p className="text-base text-ipc-500 leading-relaxed">{t('diaryLockedDescription')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-12 space-y-6">
      {/* Back link */}
      <Link
        href={`/diary/day/${getCurrentDay(startDate, timeZone)}`}
        className="inline-flex items-center gap-1 text-ipc-600 hover:text-ipc-800 transition-colors"
      >
        <ChevronLeft size={20} />
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
        <h1 className="text-2xl font-bold text-ipc-950 text-balance leading-tight px-4">
          {t('heroTitle')}
        </h1>
        <p className="text-base text-ipc-600 mt-2 text-balance px-4">
          {t('heroSubtitle')}
        </p>
        <p className="text-sm text-ipc-500 mt-3 text-balance px-6 italic">
          {t('yoursFirst')}
        </p>
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
        <h2 className="text-lg font-bold text-ipc-950 text-balance mb-1.5">{t('storyTitle')}</h2>
        <p className="text-sm text-ipc-600 leading-relaxed mb-4">{t('storyBody')}</p>
        <div className="space-y-3">
          <DrinkVoidTimeline dayNumber={1} />
          <DrinkVoidTimeline dayNumber={2} />
          <DrinkVoidTimeline dayNumber={3} />
        </div>
      </section>

      {/* OBSERVATIONS — gentle, plain-English */}
      <section
        className="animate-fade-slide-up opacity-0"
        style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
      >
        <SummaryObservations />
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
        <h2 className="text-lg font-bold text-ipc-950 text-balance mb-3">{t('lookBackTitle')}</h2>
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
    </div>
  );
}
