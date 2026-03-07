'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TimelineView from '@/components/diary/TimelineView';
import QuickLogFAB from '@/components/diary/QuickLogFAB';
import BottomSheet from '@/components/ui/BottomSheet';
import LogVoidForm from '@/components/diary/LogVoidForm';
import LogDrinkForm from '@/components/diary/LogDrinkForm';
import SetBedtimeForm from '@/components/diary/SetBedtimeForm';
import Toast from '@/components/ui/Toast';
import { useDiaryStore } from '@/lib/store';

type SheetMode = null | 'void' | 'drink' | 'bedtime';

export default function DayPageClient() {
  const params = useParams();
  const router = useRouter();
  const dayNumber = Math.min(3, Math.max(1, Number(params.dayNumber))) as 1 | 2 | 3;
  const { diaryStarted } = useDiaryStore();

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Redirect to landing if diary not started
  useEffect(() => {
    if (!diaryStarted) {
      router.replace('/');
    }
  }, [diaryStarted, router]);

  const handleSave = useCallback((message: string) => {
    setSheetMode(null);
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const sheetTitles: Record<string, string> = {
    void: 'Log Void',
    drink: 'Log Drink',
    bedtime: 'Set Bedtime',
  };

  if (!diaryStarted) return null;

  return (
    <>
      <TimelineView dayNumber={dayNumber} />

      <QuickLogFAB onAction={(action) => setSheetMode(action)} />

      <BottomSheet
        open={sheetMode !== null}
        onClose={() => setSheetMode(null)}
        title={sheetMode ? sheetTitles[sheetMode] : ''}
      >
        {sheetMode === 'void' && (
          <LogVoidForm
            dayNumber={dayNumber}
            onSave={() => handleSave('Void logged ✓')}
          />
        )}
        {sheetMode === 'drink' && (
          <LogDrinkForm
            onSave={() => handleSave('Drink logged ✓')}
          />
        )}
        {sheetMode === 'bedtime' && (
          <SetBedtimeForm
            dayNumber={dayNumber}
            onSave={() => handleSave('Bedtime saved ✓')}
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
