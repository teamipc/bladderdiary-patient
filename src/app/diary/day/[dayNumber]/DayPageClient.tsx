'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TimelineView from '@/components/diary/TimelineView';
import QuickLogFAB from '@/components/diary/QuickLogFAB';
import BottomSheet from '@/components/ui/BottomSheet';
import LogVoidForm from '@/components/diary/LogVoidForm';
import LogDrinkForm from '@/components/diary/LogDrinkForm';
import SetBedtimeForm from '@/components/diary/SetBedtimeForm';
import SetWakeTimeForm from '@/components/diary/SetWakeTimeForm';
import Toast from '@/components/ui/Toast';
import { useDiaryStore } from '@/lib/store';
import type { VoidEntry, DrinkEntry, BedtimeEntry } from '@/lib/types';

type SheetMode = null | 'void' | 'drink' | 'bedtime' | 'wakeup';

// Milestone messages — shown once per session via localStorage
const MILESTONES: Record<string, { emoji: string; message: string; subtitle: string; duration: number }> = {
  first_event:   { emoji: '\u{1F4AA}', message: 'You\'re on your way!', subtitle: 'Your data is saved on this device \u2014 come back anytime', duration: 3000 },
  day1_complete:  { emoji: '\u{1F31F}', message: 'Day 1 complete!', subtitle: 'Great job \u2014 2 more days to go', duration: 2500 },
  day2_complete:  { emoji: '\u{1F525}', message: 'Day 2 done!', subtitle: 'You\'re over halfway \u2014 keep it up!', duration: 2500 },
  day3_complete:  { emoji: '\u{1F389}', message: 'All 3 days complete!', subtitle: 'Tap View Results to see your diary', duration: 3000 },
};

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
  const dayNumber = Math.min(3, Math.max(1, Number(params.dayNumber))) as 1 | 2 | 3;
  const { diaryStarted, getBedtimeForDay, getVoidsForDay, getWakeTimeForDay } = useDiaryStore();
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

  // Edit state — track the entry being edited
  const [editVoidEntry, setEditVoidEntry] = useState<VoidEntry | undefined>();
  const [editDrinkEntry, setEditDrinkEntry] = useState<DrinkEntry | undefined>();

  // Initial time — pre-set when inserting between events via "+" button
  const [initialTime, setInitialTime] = useState<string | undefined>();

  // Redirect to landing if diary not started
  useEffect(() => {
    if (!diaryStarted) {
      router.replace('/');
    }
  }, [diaryStarted, router]);

  // Redirect to previous day if it's not complete yet
  useEffect(() => {
    if (diaryStarted && !prevDayComplete) {
      router.replace(`/diary/day/${dayNumber - 1}`);
    }
  }, [diaryStarted, prevDayComplete, dayNumber, router]);

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
  }, []);

  const handleSave = useCallback((message: string) => {
    setSheetMode(null);
    setEditVoidEntry(undefined);
    setEditDrinkEntry(undefined);
    setInitialTime(undefined);

    // Check milestones (read fresh state from store)
    const store = useDiaryStore.getState();
    const totalEvents = store.getVoidsForDay(dayNumber).length + store.getDrinksForDay(dayNumber).length;
    const bedtime = store.getBedtimeForDay(dayNumber);

    // First action on Day 1: wake-up or first void/drink
    if (dayNumber === 1 && !bedtime) {
      if (message === 'Wake-up time saved' || totalEvents === 1) {
        showMilestoneToast('first_event');
        return;
      }
    }

    // Day complete (bedtime just saved)
    if (bedtime && message === 'Bedtime saved') {
      const shown = showMilestoneToast(`day${dayNumber}_complete`);
      if (shown) return;
    }

    // Default save toast
    setToastEmoji(undefined);
    setToastSubtitle(undefined);
    setToastDuration(3000);
    setToastMessage(message);
    setShowToast(true);
  }, [dayNumber, showMilestoneToast]);

  const handleClose = useCallback(() => {
    setSheetMode(null);
    setEditVoidEntry(undefined);
    setEditDrinkEntry(undefined);
    setInitialTime(undefined);
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

  // All forms manage their own headings — no external sheet title needed

  if (!diaryStarted || !prevDayComplete) return null;

  return (
    <>
      <TimelineView
        dayNumber={dayNumber}
        onLogVoid={handleLogVoid}
        onLogDrink={handleLogDrink}
        onLogBedtime={isNightView ? undefined : () => setSheetMode('bedtime')}
        onLogWakeUp={() => setSheetMode('wakeup')}
        onEditVoid={handleEditVoid}
        onEditDrink={handleEditDrink}
        onEditBedtime={handleEditBedtime}
      />

      {canLogEntries && (isNightView || !isDayComplete) && (
        <QuickLogFAB onAction={(action) => setSheetMode(action)} />
      )}

      <BottomSheet
        open={sheetMode !== null}
        onClose={handleClose}
        noScroll={false}
        variant={sheetMode === 'drink' ? 'drink' : sheetMode === 'bedtime' ? 'bedtime' : 'default'}
      >
        {sheetMode === 'void' && (
          <LogVoidForm
            key={editVoidEntry?.id ?? initialTime ?? 'new'}
            dayNumber={dayNumber}
            editEntry={editVoidEntry}
            initialTime={initialTime}
            isNightView={isNightView}
            onSave={() => handleSave(editVoidEntry ? 'Pee updated' : 'Pee saved')}
          />
        )}
        {sheetMode === 'drink' && (
          <LogDrinkForm
            key={editDrinkEntry?.id ?? initialTime ?? 'new'}
            dayNumber={dayNumber}
            editEntry={editDrinkEntry}
            initialTime={initialTime}
            isNightView={isNightView}
            onSave={() => handleSave(editDrinkEntry ? 'Drink updated' : 'Drink saved')}
          />
        )}
        {sheetMode === 'bedtime' && (
          <SetBedtimeForm
            dayNumber={dayNumber}
            onSave={() => handleSave('Bedtime saved')}
          />
        )}
        {sheetMode === 'wakeup' && (
          <SetWakeTimeForm
            dayNumber={dayNumber}
            onSave={() => handleSave('Wake-up time saved')}
          />
        )}
      </BottomSheet>

      <Toast
        message={toastMessage}
        subtitle={toastSubtitle}
        emoji={toastEmoji}
        visible={showToast}
        onDismiss={() => setShowToast(false)}
        duration={toastDuration}
      />
    </>
  );
}
