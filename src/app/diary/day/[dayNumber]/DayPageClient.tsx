'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function DayPageClient() {
  const params = useParams();
  const router = useRouter();
  const dayNumber = Math.min(3, Math.max(1, Number(params.dayNumber))) as 1 | 2 | 3;
  const { diaryStarted, getBedtimeForDay, getVoidsForDay } = useDiaryStore();
  // Check if previous day is complete (needed to access this day)
  const prevDayComplete = dayNumber === 1 ? true
    : !!getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3);

  // Hide add buttons once day is complete
  const hasBedtime = !!getBedtimeForDay(dayNumber);
  const dayVoids = getVoidsForDay(dayNumber);
  const isDayComplete = dayNumber === 1
    ? dayVoids.length > 0 && hasBedtime
    : dayVoids.some((v) => v.isFirstMorningVoid) && hasBedtime;

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [toastMessage, setToastMessage] = useState('');
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

  const handleSave = useCallback((message: string) => {
    setSheetMode(null);
    setEditVoidEntry(undefined);
    setEditDrinkEntry(undefined);
    setInitialTime(undefined);
    setToastMessage(message);
    setShowToast(true);
  }, []);

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
        onLogBedtime={() => setSheetMode('bedtime')}
        onLogWakeUp={() => setSheetMode('wakeup')}
        onEditVoid={handleEditVoid}
        onEditDrink={handleEditDrink}
        onEditBedtime={handleEditBedtime}
      />

      {!isDayComplete && (
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
            onSave={() => handleSave(editVoidEntry ? 'Pee updated' : 'Pee saved')}
          />
        )}
        {sheetMode === 'drink' && (
          <LogDrinkForm
            key={editDrinkEntry?.id ?? initialTime ?? 'new'}
            dayNumber={dayNumber}
            editEntry={editDrinkEntry}
            initialTime={initialTime}
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
        visible={showToast}
        onDismiss={() => setShowToast(false)}
      />
    </>
  );
}
