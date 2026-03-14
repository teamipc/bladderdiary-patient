'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { Lock, PlayCircle, RotateCcw, Download, Share2 } from 'lucide-react';
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/navigation';
import { track } from '@vercel/analytics';
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
  const t = useTranslations('landing');
  const tc = useTranslations('common');
  const { diaryStarted, startDate, startDiary, setStartDate, setAge, setVolumeUnit, setClinicCode, resetDiary } = useDiaryStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { canPrompt, isIos, isInstalled, promptInstall } = usePwaInstall();

  useEffect(() => {
    const clinic = searchParams.get('clinic');
    if (clinic) {
      setClinicCode(clinic);
    }
  }, [searchParams, setClinicCode]);

  const handleOnboardingComplete = async (age: number, selectedDate: string, volumeUnit: 'mL' | 'oz') => {
    setAge(age);
    setStartDate(selectedDate);
    setVolumeUnit(volumeUnit);
    startDiary();

    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      scheduleReminders();
      scheduleDiaryCompleteReminder(selectedDate);
    }

    router.push('/diary/day/1');
  };

  const handleResume = () => {
    const currentDay = getCurrentDay(startDate);
    track('resume_tracking', { day: currentDay });
    router.push(`/diary/day/${currentDay}`);
  };

  const handleStartNew = () => {
    track('reset_diary');
    resetDiary();
    setShowResetConfirm(false);
    setShowOnboarding(false);
  };

  if (diaryStarted) {
    return (
      <div className="flex flex-col items-center px-6 pt-12 pb-12 max-w-lg mx-auto w-full">
        <div className="text-center mb-8 animate-fade-slide-up">
          <div className="w-20 h-20 rounded-2xl bg-ipc-100 flex items-center justify-center mx-auto mb-4">
            <Image src="/app-logo.png" alt="My Flow Check" width={52} height={52} />
          </div>
          <h1 className="text-2xl font-bold text-ipc-950 mb-2 text-balance">
            {t('welcomeBack')}
          </h1>
          <p className="text-base text-ipc-500">
            {t('sessionInProgress')}
          </p>
        </div>

        <div className="w-full space-y-3 animate-fade-slide-up stagger-2">
          <Button onClick={handleResume} fullWidth size="lg">
            <PlayCircle size={20} className="mr-2" />
            {t('resumeTracking')}
          </Button>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm text-ipc-400 hover:text-ipc-600 transition-colors"
            >
              <RotateCcw size={16} />
              {t('startNewTracking')}
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-danger-light border border-danger/20 space-y-3 animate-fade-slide-up">
              <p className="text-base font-semibold text-danger">
                {t('areYouSure')}
              </p>
              <p className="text-sm text-ipc-700">
                {t('resetWarning')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleStartNew}
                  className="flex-1"
                >
                  {t('yesStartFresh')}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1"
                >
                  {tc('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 pt-8 pb-12 max-w-lg mx-auto w-full">
      <div className="text-center mb-8 animate-fade-slide-up">
        <div className="w-28 h-28 rounded-3xl bg-ipc-100 flex items-center justify-center mx-auto mb-5">
          <Image src="/app-logo.png" alt="My Flow Check bladder diary tracker" width={72} height={72} />
        </div>
        <h1 className="text-2xl font-bold text-ipc-950 mb-3 leading-tight text-balance">
          {t('heroTitle')}
        </h1>
        <p className="text-lg text-ipc-500 leading-relaxed">
          {t('heroSubtitle')}
        </p>
      </div>

      <div className="w-full animate-fade-slide-up stagger-3">
        <Button onClick={() => { track('start_tracking'); setShowOnboarding(true); }} fullWidth size="lg">
          {t('startTracking')}
        </Button>
      </div>

      {!isInstalled && (canPrompt || isIos) && (
        <div className="w-full mt-6 animate-fade-slide-up stagger-4">
          <div className="p-4 rounded-2xl bg-ipc-50 border border-ipc-100">
            {canPrompt ? (
              <>
                <p className="text-sm text-ipc-700 mb-3">
                  {t('pwaPromptAndroid')}
                </p>
                <button
                  type="button"
                  onClick={promptInstall}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm
                    font-semibold bg-ipc-600 text-white active:scale-[0.95] transition-all"
                >
                  <Download size={15} />
                  {t('addToHomeScreen')}
                </button>
              </>
            ) : (
              <p className="text-sm text-ipc-700 leading-relaxed">
                {t('pwaPromptIos')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="w-full mt-8 animate-fade-slide-up stagger-4">
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Lock size={13} className="text-ipc-400" />
          <p className="text-xs font-semibold text-ipc-500 uppercase tracking-wide">
            {t('privacyTitle')}
          </p>
        </div>
        <p className="text-sm text-ipc-500 text-center leading-relaxed">
          {t('privacyBody')}
        </p>
      </div>

      <footer className="w-full mt-8 animate-fade-slide-up stagger-4">
        <p className="text-[10px] text-ipc-300 text-center leading-relaxed mb-4">
          {t('disclaimer')}
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <IpcInfoModal>
            <span className="flex items-center gap-1">
              <Image src="/ipc-logo.png" alt="IPC" width={14} height={14} className="opacity-40" />
              <span className="text-[10px] text-ipc-300">{tc('poweredByIpc')}</span>
            </span>
          </IpcInfoModal>
          <span className="text-ipc-200">&middot;</span>
          <Link href="/privacy" className="text-[10px] text-ipc-300 underline underline-offset-2">
            {tc('privacyPolicy')}
          </Link>
          <span className="text-ipc-200">&middot;</span>
          <Link href="/terms" className="text-[10px] text-ipc-300 underline underline-offset-2">
            {tc('termsOfUse')}
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
