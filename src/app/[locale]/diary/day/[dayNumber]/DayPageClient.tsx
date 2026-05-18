'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import TimelineView from '@/components/diary/TimelineView';
import NextStepBanner from '@/components/diary/NextStepBanner';
import QuickLogFAB from '@/components/diary/QuickLogFAB';
import BottomSheet from '@/components/ui/BottomSheet';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LogVoidForm from '@/components/diary/LogVoidForm';
import LogDrinkForm from '@/components/diary/LogDrinkForm';
import LogLeakForm from '@/components/diary/LogLeakForm';
import SetBedtimeForm from '@/components/diary/SetBedtimeForm';
import SetWakeTimeForm from '@/components/diary/SetWakeTimeForm';
import Day1Celebration from '@/components/diary/Day1Celebration';
import Toast from '@/components/ui/Toast';
import { useDiaryStore, useStoreHydrated } from '@/lib/store';
import type { VoidEntry, DrinkEntry, LeakEntry, BedtimeEntry } from '@/lib/types';

type SheetMode = null | 'void' | 'drink' | 'leak' | 'bedtime' | 'wakeup';

function checkMilestone(key: string): boolean {
  const storageKey = `milestone_${key}`;
  if (typeof window !== 'undefined' && !sessionStorage.getItem(storageKey)) {
    sessionStorage.setItem(storageKey, '1');
    return true;
  }
  return false;
}

export default function DayPageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('toasts');
  const tm = useTranslations('milestones');
  const tc = useTranslations('common');
  const dayNumber = Math.min(3, Math.max(1, Number(params.dayNumber))) as 1 | 2 | 3;
  const {
    diaryStarted,
    getBedtimeForDay,
    getVoidsForDay,
    getWakeTimeForDay,
    day1CelebrationShown,
    markDay1CelebrationShown,
    setMorningAnchor,
  } = useDiaryStore();
  // Don't make any routing decision until persist has finished rehydrating from
  // localStorage — otherwise a deep-link to /diary/day/N fires the redirect
  // useEffect on the empty initial state (diaryStarted = false) and bounces the
  // patient to "/" even when localStorage holds a valid in-progress diary.
  // Mirrors the same pattern in src/app/[locale]/summary/page.tsx and
  // src/app/[locale]/LandingContent.tsx.
  const hydrated = useStoreHydrated();

  // Milestone messages — shown once per session via localStorage
  const MILESTONES: Record<string, { emoji: string; message: string; subtitle: string; duration: number }> = {
    first_event:   { emoji: '\u{1F4AA}', message: tm('firstEvent'), subtitle: tm('firstEventSubtitle'), duration: 3000 },
    day1_complete:  { emoji: '\u{1F31F}', message: tm('day1Complete'), subtitle: tm('day1CompleteSubtitle'), duration: 2500 },
    day2_complete:  { emoji: '\u{1F525}', message: tm('day2Complete'), subtitle: tm('day2CompleteSubtitle'), duration: 2500 },
    day3_complete:  { emoji: '\u{1F389}', message: tm('day3Complete'), subtitle: tm('day3CompleteSubtitle'), duration: 3000 },
  };

  // Check if previous day is complete (needed to access this day)
  const prevDayComplete = dayNumber === 1 ? true
    : !!getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3);

  // Hide add buttons once day is complete
  const hasBedtime = !!getBedtimeForDay(dayNumber);
  const hasWakeTime = !!getWakeTimeForDay(dayNumber);
  const prevDayBedtime = dayNumber > 1 ? !!getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : false;
  const dayVoids = getVoidsForDay(dayNumber);
  const isDayComplete = dayNumber === 1
    ? dayVoids.length > 0 && hasBedtime
    : dayVoids.some((v) => v.isFirstMorningVoid) && hasBedtime;

  // Night view detection (mirrors TimelineView logic)
  const hasNightPhase = dayNumber > 1 && prevDayBedtime;
  const viewParam = searchParams.get('view');
  const isNightView = hasNightPhase && (viewParam === 'night' || (!viewParam && !hasWakeTime));
  const isNightComplete = isNightView && hasWakeTime;

  // Day 1 requires wake time before logging anything
  // Night complete: no more events can be added
  const canLogEntries = (dayNumber !== 1 || hasWakeTime) && !isNightComplete;

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSubtitle, setToastSubtitle] = useState<string | undefined>();
  const [toastEmoji, setToastEmoji] = useState<string | undefined>();
  const [toastDuration, setToastDuration] = useState(3000);
  const [showToast, setShowToast] = useState(false);

  // Dirty-state tracking for reset-on-cancel pattern (Phase 6 / DTUX-03).
  // Updated by each form's onDirtyChange callback; gates whether dismiss
  // attempts (close X / Escape / backdrop click) trigger a ConfirmDialog.
  const [activeFormDirty, setActiveFormDirty] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  // Edit state — track the entry being edited
  const [editVoidEntry, setEditVoidEntry] = useState<VoidEntry | undefined>();
  const [editDrinkEntry, setEditDrinkEntry] = useState<DrinkEntry | undefined>();
  const [editLeakEntry, setEditLeakEntry] = useState<LeakEntry | undefined>();

  // Initial time — pre-set when inserting between events via "+" button
  const [initialTime, setInitialTime] = useState<string | undefined>();

  // Day 1 peak-end celebration state
  const [day1CelebrationOpen, setDay1CelebrationOpen] = useState(false);
  const [day1EventCount, setDay1EventCount] = useState(0);

  // Reset scroll position whenever the dayNumber changes. Next.js preserves
  // scroll across same-route-pattern navigations (/diary/day/1 → /diary/day/2),
  // so the "Continue to day N+1" link at the bottom of Day N's timeline (and
  // the "Log overnight pee" link below that) would leave the user staring at
  // Day N+1's footer instead of the top of the new day. Fires on initial
  // mount too (no-op since scrollY is already 0 on fresh load).
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [dayNumber]);

  // Auto-open void form when arriving with ?add=void (from "Log overnight pee" shortcut)
  const autoOpenConsumed = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (autoOpenConsumed.current) return;
    if (!diaryStarted || !prevDayComplete) return;
    if (searchParams.get('add') === 'void' && canLogEntries) {
      autoOpenConsumed.current = true;
      // Belt-and-suspenders scroll reset for the rare case where ?add=void
      // is toggled on the SAME day without a dayNumber change (the
      // dayNumber-change useEffect above doesn't fire in that path).
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      setSheetMode('void');
    }
  }, [hydrated, diaryStarted, prevDayComplete, searchParams, canLogEntries]);

  // Track page view once per day number
  const trackedDay = useRef(0);
  useEffect(() => {
    if (!hydrated) return;
    if (diaryStarted && prevDayComplete && trackedDay.current !== dayNumber) {
      trackedDay.current = dayNumber;
      track('view_day', { day: dayNumber });
    }
  }, [hydrated, diaryStarted, prevDayComplete, dayNumber]);

  // Redirect to landing if diary not started — gated on hydration to avoid a
  // race where the persist middleware hasn't yet loaded localStorage and
  // diaryStarted reads as the default `false` from the unhydrated store,
  // causing a wrong redirect when the user deep-links to /diary/day/N.
  useEffect(() => {
    if (!hydrated) return;
    if (!diaryStarted) {
      router.replace('/');
    }
  }, [hydrated, diaryStarted, router]);

  // Redirect to previous day if it's not complete yet — same hydration gate.
  useEffect(() => {
    if (!hydrated) return;
    if (diaryStarted && !prevDayComplete) {
      router.replace(`/diary/day/${dayNumber - 1}`);
    }
  }, [hydrated, diaryStarted, prevDayComplete, dayNumber, router]);

  // Toggle full-page night background on body
  useEffect(() => {
    if (isNightView) {
      document.documentElement.classList.add('nighttime-bg');
      document.body.classList.add('nighttime-bg');
    }
    return () => {
      document.documentElement.classList.remove('nighttime-bg');
      document.body.classList.remove('nighttime-bg');
    };
  }, [isNightView]);

  const showMilestoneToast = useCallback((key: string) => {
    const m = MILESTONES[key];
    if (m && checkMilestone(key)) {
      // Delay milestone toast slightly so it doesn't clash with the save toast
      setTimeout(() => {
        setToastEmoji(m.emoji);
        setToastMessage(m.message);
        setToastSubtitle(m.subtitle);
        setToastDuration(m.duration);
        setShowToast(true);
      }, 800);
      return true;
    }
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tm]);

  const handleSave = useCallback((message: string) => {
    setSheetMode(null);
    setEditVoidEntry(undefined);
    setEditDrinkEntry(undefined);
    setEditLeakEntry(undefined);
    setInitialTime(undefined);
    setActiveFormDirty(false);

    // Check milestones (read fresh state from store)
    const store = useDiaryStore.getState();
    const totalEvents = store.getVoidsForDay(dayNumber).length + store.getDrinksForDay(dayNumber).length;
    const bedtime = store.getBedtimeForDay(dayNumber);

    // First action on Day 1: wake-up or first void/drink
    if (dayNumber === 1 && !bedtime) {
      if (message === t('wakeUpSaved') || totalEvents === 1) {
        showMilestoneToast('first_event');
        return;
      }
    }

    // Day complete (bedtime just saved)
    if (bedtime && message === t('bedtimeSaved')) {
      // Day 1 first-time completion → full-screen peak-end moment instead of toast.
      // Targets the EN Day 1 → Day 2 return bleed (60% drop).
      if (dayNumber === 1 && !day1CelebrationShown) {
        const count =
          store.getVoidsForDay(1).length +
          store.getDrinksForDay(1).length +
          store.getLeaksForDay(1).length +
          (store.getWakeTimeForDay(1) ? 1 : 0) +
          1; // bedtime just saved
        setDay1EventCount(count);
        setDay1CelebrationOpen(true);
        track('day1_celebration_shown');
        return;
      }

      const shown = showMilestoneToast(`day${dayNumber}_complete`);

      // Day 3 bedtime = diary complete. Auto-redirect to summary so users
      // actually reach the finish-line moment — funnel showed ~60% drop here.
      // Delay lets the celebration toast land first (peak-end rule).
      if (dayNumber === 3) {
        track('auto_redirect_to_summary');
        setTimeout(() => router.push('/summary'), shown ? 2500 : 1000);
      }

      if (shown) return;
    }

    // Default save toast
    setToastEmoji(undefined);
    setToastSubtitle(undefined);
    setToastDuration(3000);
    setToastMessage(message);
    setShowToast(true);
  }, [dayNumber, showMilestoneToast, t, day1CelebrationShown, router]);

  // Internal close — unconditionally tears down the sheet + edit state.
  // Used by handleSave (after a successful save) AND by handleDiscardConfirm
  // (after the user confirms discarding unsaved changes).
  const closeSheet = useCallback(() => {
    setSheetMode(null);
    setEditVoidEntry(undefined);
    setEditDrinkEntry(undefined);
    setEditLeakEntry(undefined);
    setInitialTime(undefined);
    setActiveFormDirty(false);
  }, []);

  // Public close gate — fired by BottomSheet's onClose (close X / Escape / backdrop click).
  // If the active form is dirty, show ConfirmDialog; otherwise close silently.
  const handleSheetClose = useCallback(() => {
    if (activeFormDirty) {
      setPendingClose(true);
    } else {
      closeSheet();
    }
  }, [activeFormDirty, closeSheet]);

  const handleDiscardConfirm = useCallback(() => {
    setPendingClose(false);
    closeSheet();
  }, [closeSheet]);

  const handleDiscardCancel = useCallback(() => {
    setPendingClose(false);
    // Keep modal open; user returns to editing.
  }, []);

  const handleEditVoid = useCallback((entry: VoidEntry) => {
    setEditVoidEntry(entry);
    setInitialTime(undefined);
    setSheetMode('void');
  }, []);

  const handleEditDrink = useCallback((entry: DrinkEntry) => {
    setEditDrinkEntry(entry);
    setInitialTime(undefined);
    setSheetMode('drink');
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleEditBedtime = useCallback((_entry: BedtimeEntry) => {
    setSheetMode('bedtime');
  }, []);

  // Open void form — optionally with a pre-set time (from "+" insertion)
  const handleLogVoid = useCallback((time?: string) => {
    setInitialTime(time);
    setSheetMode('void');
  }, []);

  // Open drink form — optionally with a pre-set time (from "+" insertion)
  const handleLogDrink = useCallback((time?: string) => {
    setInitialTime(time);
    setSheetMode('drink');
  }, []);

  const handleEditLeak = useCallback((entry: LeakEntry) => {
    setEditLeakEntry(entry);
    setInitialTime(undefined);
    setSheetMode('leak');
  }, []);

  const handleLogLeak = useCallback((time?: string) => {
    setInitialTime(time);
    setSheetMode('leak');
  }, []);

  // Until hydration finishes, show a non-committal loading state. This avoids
  // a flash of either the redirect target or the page content while the Zustand
  // persist middleware is asynchronously rehydrating from localStorage.
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24 bg-surface">
        <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
      </div>
    );
  }

  if (!diaryStarted || !prevDayComplete) return null;

  return (
    <>
      <NextStepBanner dayNumber={dayNumber} isNightView={isNightView} />

      <TimelineView
        dayNumber={dayNumber}
        onLogVoid={handleLogVoid}
        onLogDrink={handleLogDrink}
        onLogLeak={handleLogLeak}
        onLogBedtime={isNightView ? undefined : () => setSheetMode('bedtime')}
        onLogWakeUp={() => setSheetMode('wakeup')}
        onEditVoid={handleEditVoid}
        onEditDrink={handleEditDrink}
        onEditLeak={handleEditLeak}
        onEditBedtime={handleEditBedtime}
      />

      {canLogEntries && (isNightView || !isDayComplete) && (
        <QuickLogFAB onAction={(action) => setSheetMode(action)} />
      )}

      <BottomSheet
        open={sheetMode !== null}
        onClose={handleSheetClose}
        noScroll={false}
        variant={sheetMode === 'drink' ? 'drink' : sheetMode === 'leak' ? 'leak' : sheetMode === 'bedtime' ? 'bedtime' : 'default'}
        maxWidth={sheetMode === 'bedtime' || sheetMode === 'wakeup' ? 'narrow' : 'default'}
        inert={pendingClose}
      >
        {sheetMode === 'void' && (
          <LogVoidForm
            key={editVoidEntry?.id ?? initialTime ?? 'new'}
            dayNumber={dayNumber}
            editEntry={editVoidEntry}
            initialTime={initialTime}
            isNightView={isNightView}
            onSave={() => { track('log_void', { day: dayNumber, edit: !!editVoidEntry }); handleSave(editVoidEntry ? t('peeUpdated') : t('peeSaved')); }}
            onDirtyChange={setActiveFormDirty}
          />
        )}
        {sheetMode === 'drink' && (
          <LogDrinkForm
            key={editDrinkEntry?.id ?? initialTime ?? 'new'}
            dayNumber={dayNumber}
            editEntry={editDrinkEntry}
            initialTime={initialTime}
            isNightView={isNightView}
            onSave={() => { track('log_drink', { day: dayNumber, edit: !!editDrinkEntry }); handleSave(editDrinkEntry ? t('drinkUpdated') : t('drinkSaved')); }}
            onDirtyChange={setActiveFormDirty}
          />
        )}
        {sheetMode === 'leak' && (
          <LogLeakForm
            key={editLeakEntry?.id ?? initialTime ?? 'new'}
            dayNumber={dayNumber}
            editEntry={editLeakEntry}
            initialTime={initialTime}
            isNightView={isNightView}
            onSave={() => { track('log_leak', { day: dayNumber, edit: !!editLeakEntry }); handleSave(editLeakEntry ? t('leakUpdated') : t('leakSaved')); }}
            onDirtyChange={setActiveFormDirty}
          />
        )}
        {sheetMode === 'bedtime' && (
          <SetBedtimeForm
            dayNumber={dayNumber}
            onSave={() => { track('log_bedtime', { day: dayNumber }); handleSave(t('bedtimeSaved')); }}
            onDirtyChange={setActiveFormDirty}
          />
        )}
        {sheetMode === 'wakeup' && (
          <SetWakeTimeForm
            dayNumber={dayNumber}
            onSave={() => { track('log_wake', { day: dayNumber }); handleSave(t('wakeUpSaved')); }}
            onDirtyChange={setActiveFormDirty}
          />
        )}
      </BottomSheet>

      <ConfirmDialog
        open={pendingClose}
        title={tc('discardEntryTitle')}
        message={tc('discardEntryMessage')}
        confirmLabel={tc('discard')}
        cancelLabel={tc('keepEditing')}
        variant="danger"
        onConfirm={handleDiscardConfirm}
        onCancel={handleDiscardCancel}
      />

      <Toast
        message={toastMessage}
        subtitle={toastSubtitle}
        emoji={toastEmoji}
        visible={showToast}
        onDismiss={() => setShowToast(false)}
        duration={toastDuration}
      />

      <Day1Celebration
        open={day1CelebrationOpen}
        eventCount={day1EventCount}
        onClose={({ anchor, method }) => {
          if (anchor) {
            setMorningAnchor(anchor);
            track('day1_anchor_selected', { anchor });
          }
          track('day1_reminder_method', { method });
          markDay1CelebrationShown();
          setDay1CelebrationOpen(false);
        }}
      />
    </>
  );
}
