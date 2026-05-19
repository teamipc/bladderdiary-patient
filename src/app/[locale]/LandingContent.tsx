'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { useDiaryStore, useStoreHydrated } from '@/lib/store';
import { PlayCircle, RotateCcw, Download, Ellipsis } from 'lucide-react';

/** iOS share icon — rectangle with arrow pointing up (matches the real Safari icon). */
function IosShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <rect x="4" y="11" width="16" height="11" rx="2" />
    </svg>
  );
}
import Image from 'next/image';
import { Link, useRouter } from '@/i18n/navigation';
import { track } from '@vercel/analytics';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import WelcomePanel from '@/components/onboarding/WelcomePanel';
import Container from '@/components/layout/Container';
import IpcInfoModal from '@/components/ui/IpcInfoModal';
import { getCurrentDay } from '@/lib/utils';
import { usePwaInstall } from '@/lib/usePwaInstall';
import {
  requestNotificationPermission,
  scheduleReminders,
  scheduleDiaryCompleteReminder,
} from '@/lib/notifications';

/**
 * Validation for the `?clinic=` URL search param.
 *
 * Rule: alphanumeric + hyphen, 1 to 32 characters. Anything outside
 * this charset (including <script>, multi-thousand-char payloads,
 * URL-encoded entities, whitespace, etc.) is silently rejected —
 * the param is NOT persisted to the diary store. A dev-only
 * console.warn fires for debugging visibility.
 *
 * Locked at gate: see .planning/phases/03-ux-polish-input-validation/03-CONTEXT.md
 * §"STAB-08 — locked details".
 */
export const CLINIC_CODE_RE = /^[A-Za-z0-9-]{1,32}$/;

function LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('landing');
  const tc = useTranslations('common');
  const { diaryStarted, startDate, timeZone, startDiary, setStartDate, setAge, setVolumeUnit, setTimeZone, setClinicCode, resetDiary } = useDiaryStore();
  const hydrated = useStoreHydrated();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { canPrompt, isIos, isInstalled, promptInstall } = usePwaInstall();

  useEffect(() => {
    const clinic = searchParams.get('clinic');
    if (clinic && CLINIC_CODE_RE.test(clinic)) {
      setClinicCode(clinic);
    } else if (clinic && process.env.NODE_ENV !== 'production') {
      // Truncate payload at 100 chars to prevent dev-tools console
      // blow-up on a 5000-char attack string.
      console.warn('Ignored invalid clinicCode:', clinic.slice(0, 100));
    }
  }, [searchParams, setClinicCode]);

  const handleOnboardingComplete = async (age: number, selectedDate: string, volumeUnit: 'mL' | 'oz', tz: string) => {
    setAge(age);
    setStartDate(selectedDate);
    setVolumeUnit(volumeUnit);
    setTimeZone(tz);
    startDiary();

    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      scheduleReminders(tz);
      scheduleDiaryCompleteReminder(selectedDate, tz);
    }

    router.push('/diary/day/1');
  };

  const handleResume = () => {
    const currentDay = getCurrentDay(startDate, timeZone);
    track('resume_tracking', { day: currentDay });
    router.push(`/diary/day/${currentDay}`);
  };

  const handleStartNew = () => {
    track('reset_diary');
    resetDiary();
    setShowResetConfirm(false);
    setShowOnboarding(false);
  };

  // Wait for persist rehydration before deciding which view to render.
  // Without this gate, a returning patient sees the "start tracking" hero
  // for one render frame before the store hydrates and we swap to "Welcome
  // back" — visible flicker, especially on slower devices.
  if (!hydrated) {
    return (
      <Container variant="narrow" as="div" className="flex items-center justify-center py-24 bg-surface">
        <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
      </Container>
    );
  }

  if (diaryStarted) {
    return (
      <Container variant="narrow" as="div" noPadding className="px-6 sm:px-6 pt-12 md:pt-20 pb-12 flex flex-col items-center">
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
          <Button variant="hero" onClick={handleResume} fullWidth size="lg">
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
      </Container>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <WelcomePanel
        onStart={() => { track('start_tracking'); setShowOnboarding(true); }}
      />

      <Container variant="narrow" as="div" noPadding className="px-6 sm:px-6 pb-12 flex flex-col items-center">
        {!isInstalled && (canPrompt || isIos) && (
          <div className="w-full mt-2 animate-fade-slide-up stagger-4">
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
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-ipc-800">
                    {t('pwaPromptTitle')}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-ipc-700">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ipc-200 text-xs font-bold text-ipc-700 shrink-0">1</span>
                    <span className="flex items-center gap-1.5">
                      {t.rich('pwaStep1', {
                        dots: () => <Ellipsis size={16} className="inline-block text-ipc-600 mx-0.5" />,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-ipc-700">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ipc-200 text-xs font-bold text-ipc-700 shrink-0">2</span>
                    <span className="flex items-center gap-1.5">
                      {t.rich('pwaStep2', {
                        share: () => <IosShareIcon className="inline-block w-4 h-4 text-ipc-600 mx-0.5" />,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-ipc-700">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ipc-200 text-xs font-bold text-ipc-700 shrink-0">3</span>
                    <span>{t('pwaStep3')}</span>
                  </div>
                  <p className="text-xs text-ipc-400 mt-1">
                    {t('pwaPromptFooter')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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
      </Container>
    </>
  );
}

export default function LandingContentWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24 bg-surface">
        <div className="w-10 h-10 rounded-full border-3 border-ipc-200 border-t-ipc-500 animate-spin" />
      </div>
    }>
      <LandingContent />
    </Suspense>
  );
}
