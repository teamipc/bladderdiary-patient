'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { Droplets, ShieldCheck, Smartphone, Clock } from 'lucide-react';
import {
  requestNotificationPermission,
  scheduleReminders,
  scheduleDiaryCompleteReminder,
} from '@/lib/notifications';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { diaryStarted, startDiary, setStartDate, setClinicCode } = useDiaryStore();

  // Save clinic code from URL param
  useEffect(() => {
    const clinic = searchParams.get('clinic');
    if (clinic) {
      setClinicCode(clinic);
    }
  }, [searchParams, setClinicCode]);

  // If diary already started, go to day 1
  useEffect(() => {
    if (diaryStarted) {
      router.replace('/diary/day/1');
    }
  }, [diaryStarted, router]);

  const handleStart = async () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    startDiary();

    // Request notification permission and schedule reminders
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      scheduleReminders();
      scheduleDiaryCompleteReminder(today);
    }

    router.push('/diary/day/1');
  };

  if (diaryStarted) return null;

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-lg mx-auto w-full">
        {/* Logo / Branding */}
        <div className="text-center mb-8 animate-fade-slide-up">
          <div className="w-20 h-20 rounded-3xl bg-ipc-100 flex items-center justify-center mx-auto mb-5">
            <Droplets size={40} className="text-ipc-500" />
          </div>
          <h1 className="text-3xl font-bold text-ipc-950 mb-2">
            Bladder Diary
          </h1>
          <p className="text-lg text-ipc-600">
            Track your bladder habits for 3 days
          </p>
        </div>

        {/* Benefits */}
        <div className="w-full space-y-3 mb-10 animate-fade-slide-up stagger-2">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-ipc-100">
            <div className="w-10 h-10 rounded-xl bg-success-light flex items-center justify-center shrink-0">
              <Clock size={20} className="text-success" />
            </div>
            <div>
              <p className="text-base font-semibold text-ipc-950">Quick & Easy</p>
              <p className="text-sm text-ipc-600">Log each event in just 2 taps</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-ipc-100">
            <div className="w-10 h-10 rounded-xl bg-info-light flex items-center justify-center shrink-0">
              <Smartphone size={20} className="text-info" />
            </div>
            <div>
              <p className="text-base font-semibold text-ipc-950">Works Offline</p>
              <p className="text-sm text-ipc-600">No internet needed after first visit</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-ipc-100">
            <div className="w-10 h-10 rounded-xl bg-ipc-50 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-ipc-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-ipc-950">Private & Secure</p>
              <p className="text-sm text-ipc-600">
                No account needed. Data stays on your phone.
              </p>
            </div>
          </div>
        </div>

        {/* Start button */}
        <div className="w-full animate-fade-slide-up stagger-4">
          <Button onClick={handleStart} fullWidth size="lg">
            Start 3-Day Diary
          </Button>
          <p className="text-center text-sm text-ipc-400 mt-3">
            Your diary starts today
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 px-4">
        <p className="text-xs text-ipc-300">
          Powered by IPC
        </p>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-surface">
        <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
      </div>
    }>
      <LandingContent />
    </Suspense>
  );
}
