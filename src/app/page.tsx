'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { Lock, PlayCircle, RotateCcw, Download, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import IpcInfoModal from '@/components/ui/IpcInfoModal';
import { getCurrentDay } from '@/lib/utils';
import { usePwaInstall } from '@/lib/usePwaInstall';
import {
  requestNotificationPermission,
  scheduleReminders,
  scheduleDiaryCompleteReminder,
} from '@/lib/notifications';

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { diaryStarted, startDate, startDiary, setStartDate, setAge, setClinicCode, resetDiary } = useDiaryStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { canPrompt, isIos, isInstalled, promptInstall } = usePwaInstall();

  // Save clinic code from URL param
  useEffect(() => {
    const clinic = searchParams.get('clinic');
    if (clinic) {
      setClinicCode(clinic);
    }
  }, [searchParams, setClinicCode]);

  const handleOnboardingComplete = async (age: number, selectedDate: string) => {
    setAge(age);
    setStartDate(selectedDate);
    startDiary();

    // Request notification permission and schedule reminders
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      scheduleReminders();
      scheduleDiaryCompleteReminder(selectedDate);
    }

    router.push(`/diary/day/1`);
  };

  const handleResume = () => {
    const currentDay = getCurrentDay(startDate);
    router.push(`/diary/day/${currentDay}`);
  };

  const handleStartNew = () => {
    resetDiary();
    setShowResetConfirm(false);
    setShowOnboarding(false);
  };

  // Active session → show resume / start new
  if (diaryStarted) {
    return (
      <div className="flex flex-col items-center px-6 pt-12 pb-12 max-w-lg mx-auto w-full">
        <div className="text-center mb-8 animate-fade-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-ipc-100 flex items-center justify-center mx-auto mb-4">
            <Image src="/app-logo.png" alt="My Flow Check" width={52} height={52} />
          </div>
          <h1 className="text-2xl font-bold text-ipc-950 mb-2">
            Welcome back!
          </h1>
          <p className="text-base text-ipc-500">
            You have a tracking session in progress.
          </p>
        </div>

        <div className="w-full space-y-3 animate-fade-slide-up stagger-2">
          <Button onClick={handleResume} fullWidth size="lg">
            <PlayCircle size={20} className="mr-2" />
            Resume Tracking
          </Button>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-ipc-400 hover:text-ipc-600 transition-colors"
            >
              <RotateCcw size={16} />
              Start a New Tracking
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-danger-light border border-danger/20 space-y-3 animate-fade-slide-up">
              <p className="text-base font-semibold text-danger">
                Are you sure?
              </p>
              <p className="text-sm text-ipc-700">
                This will delete all your current entries. Make sure you have exported your data first.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleStartNew}
                  className="flex-1"
                >
                  Yes, Start Fresh
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show onboarding flow after clicking Start Tracking
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // No session → welcome page
  return (
    <div className="flex flex-col items-center justify-center px-6 pt-8 pb-12 max-w-lg mx-auto w-full">
      {/* Logo / Branding */}
      <div className="text-center mb-8 animate-fade-slide-up">
        <div className="w-28 h-28 rounded-3xl bg-ipc-100 flex items-center justify-center mx-auto mb-5">
          <Image src="/app-logo.png" alt="My Flow Check bladder diary tracker" width={72} height={72} />
        </div>
        <h1 className="text-2xl font-bold text-ipc-950 mb-3 leading-tight">
          Track your drinks and bathroom habits in 3 days
        </h1>
        <p className="text-lg text-ipc-500 leading-relaxed">
          Track when you drink, when you pee, and see useful patterns. All in 3 days.
        </p>
      </div>

      {/* Start button */}
      <div className="w-full animate-fade-slide-up stagger-3">
        <Button onClick={() => setShowOnboarding(true)} fullWidth size="lg">
          Start Tracking
        </Button>
      </div>

      {/* PWA Install Prompt - only shown when not already installed */}
      {!isInstalled && (canPrompt || isIos) && (
        <div className="w-full mt-6 animate-fade-slide-up stagger-4">
          <div className="p-4 rounded-2xl bg-ipc-50 border border-ipc-100">
            <p className="text-sm font-semibold text-ipc-800 mb-1.5">
              Add to your home screen
            </p>
            {canPrompt ? (
              <>
                <p className="text-xs text-ipc-500 mb-3">
                  Install My Flow Check for quick access and reminders. No app store needed.
                </p>
                <button
                  type="button"
                  onClick={promptInstall}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm
                    font-semibold bg-ipc-600 text-white active:scale-[0.95] transition-all"
                >
                  <Download size={15} />
                  Install App
                </button>
              </>
            ) : (
              <p className="text-xs text-ipc-500 leading-relaxed">
                Tap <Share2 size={12} className="inline -mt-0.5 text-ipc-600" /> <strong>Share</strong> at the bottom of your screen, then tap <strong>&quot;Add to Home Screen&quot;</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Privacy reassurance */}
      <div className="w-full mt-8 animate-fade-slide-up stagger-4">
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Lock size={13} className="text-ipc-400" />
          <p className="text-xs font-semibold text-ipc-500 uppercase tracking-wide">
            Your privacy matters
          </p>
        </div>
        <p className="text-sm text-ipc-500 text-center leading-relaxed">
          Your data never leaves your phone. No account needed, no sign-up, nothing stored on our servers. When you&apos;re done, you choose what to share with your health professional.
        </p>
      </div>

      {/* Footer */}
      <footer className="w-full mt-8 animate-fade-slide-up stagger-4">
        {/* Disclaimer */}
        <p className="text-[10px] text-ipc-300 text-center leading-relaxed mb-4">
          This app is intended for personal tracking and educational purposes only. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified health professional regarding any medical condition or health concerns.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <IpcInfoModal>
            <span className="flex items-center gap-1">
              <Image src="/ipc-logo.png" alt="IPC" width={14} height={14} className="opacity-40" />
              <span className="text-[10px] text-ipc-300">Powered by IPC</span>
            </span>
          </IpcInfoModal>
          <span className="text-ipc-200">&middot;</span>
          <Link href="/privacy" className="text-[10px] text-ipc-300 underline underline-offset-2">
            Privacy Policy
          </Link>
          <span className="text-ipc-200">&middot;</span>
          <Link href="/terms" className="text-[10px] text-ipc-300 underline underline-offset-2">
            Terms of Use
          </Link>
        </div>
      </footer>
    </div>
  );
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'My Flow Check',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  url: 'https://myflowcheck.com',
  description:
    'A simple bladder diary tool that helps people track drinks, bathroom trips, and patterns over 3 days.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={
        <div className="flex items-center justify-center py-24 bg-surface">
          <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
        </div>
      }>
        <LandingContent />
      </Suspense>
    </>
  );
}
