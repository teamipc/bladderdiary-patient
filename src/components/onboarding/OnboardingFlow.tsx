'use client';

import { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Globe, Check } from 'lucide-react';
import { track } from '@vercel/analytics';
import { useTranslations, useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import BottomSheet from '@/components/ui/BottomSheet';
import { detectTimeZone, timeZoneCity, getTimezoneOffset, formatFullDayDate } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Curated timezone list                                              */
/* ------------------------------------------------------------------ */

const CURATED_TIMEZONES = [
  // Asia-Pacific
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  // Europe
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Rome',
  // Americas
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
] as const;

interface OnboardingFlowProps {
  onComplete: (age: number, startDate: string, volumeUnit: 'mL' | 'oz', timeZone: string) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [age, setAge] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<'mL' | 'oz'>('mL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeZone, setTimeZone] = useState(detectTimeZone);
  const [showTzPicker, setShowTzPicker] = useState(false);

  const ageNum = parseInt(age, 10);
  const isAgeValid = !isNaN(ageNum) && ageNum >= 18 && ageNum <= 120;

  const goForward = (target: 2 | 3) => {
    setDirection('left');
    setStep(target);
  };

  const goBack = (target: 1 | 2) => {
    setDirection('right');
    setStep(target);
  };

  const handleConfirm = () => {
    if (!isAgeValid) return;
    track('onboarding_complete', { age: ageNum, unit: volumeUnit, tz: timeZone });
    onComplete(ageNum, startDate, volumeUnit, timeZone);
  };

  // Compute the 3 tracking days
  const day1 = parseISO(startDate + 'T12:00:00');
  const day2 = addDays(day1, 1);
  const day3 = addDays(day1, 2);

  // Build timezone options — auto-detected first if not already in list
  const tzOptions = CURATED_TIMEZONES.includes(timeZone as typeof CURATED_TIMEZONES[number])
    ? [...CURATED_TIMEZONES]
    : [timeZone, ...CURATED_TIMEZONES];

  const animClass = direction === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center px-6 pt-6 pb-10 max-w-lg mx-auto w-full">

        {/* Step dots + plain-English label (wayfinding for older / non-tech users) */}
        <div className="flex flex-col items-center gap-1.5 mb-5">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 1 ? 'bg-ipc-500' : 'bg-ipc-200'}`} />
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 2 ? 'bg-ipc-500' : 'bg-ipc-200'}`} />
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 3 ? 'bg-ipc-500' : 'bg-ipc-200'}`} />
          </div>
          <span className="text-[11px] font-semibold tracking-wide text-ipc-400 uppercase">
            {tc('stepOf', { current: step, total: 3 })}
          </span>
        </div>

        {/* Step 1: Age */}
        {step === 1 && (
          <div key="step1" className={`w-full text-center ${animClass}`}>
            <h2 className="text-2xl font-bold text-ipc-950 mb-2 text-balance">
              {t('ageTitle')}
            </h2>
            <p className="text-sm text-ipc-500 mb-8">
              {t('ageSubtitle')}
            </p>

            <div className="flex justify-center mb-8">
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('agePlaceholder')}
                min={18}
                max={120}
                className="w-28 text-center text-3xl font-bold text-ipc-950
                  bg-white/60 border-2 border-ipc-200/50 rounded-2xl py-3
                  outline-none focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30
                  transition-all placeholder:text-ipc-200 placeholder:text-xl
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
            </div>

            <div className="max-w-xs mx-auto">
              <Button
                onClick={() => { if (isAgeValid) { track('onboarding_age', { age: ageNum }); goForward(2); } }}
                fullWidth
                size="lg"
                disabled={!isAgeValid}
              >
                {tc('next')}
                <ChevronRight size={18} className="ml-1 inline" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Unit selection */}
        {step === 2 && (
          <div key="step2" className={`w-full text-center ${animClass}`}>
            <h2 className="text-2xl font-bold text-ipc-950 mb-2 text-balance">
              {t('unitTitle')}
            </h2>
            <p className="text-sm text-ipc-500 mb-8">
              {t('unitSubtitle')}
            </p>

            <div className="flex gap-3 justify-center mb-8">
              <button
                type="button"
                onClick={() => setVolumeUnit('mL')}
                className={`flex-1 max-w-[160px] py-6 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                  volumeUnit === 'mL'
                    ? 'border-ipc-500 bg-ipc-50 ring-2 ring-ipc-200/50'
                    : 'border-ipc-200/50 bg-white/60 hover:border-ipc-300'
                }`}
              >
                <span className="block text-3xl font-bold text-ipc-950 mb-1">mL</span>
                <span className="block text-sm text-ipc-500">{tc('millilitres')}</span>
              </button>

              <button
                type="button"
                onClick={() => setVolumeUnit('oz')}
                className={`flex-1 max-w-[160px] py-6 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                  volumeUnit === 'oz'
                    ? 'border-ipc-500 bg-ipc-50 ring-2 ring-ipc-200/50'
                    : 'border-ipc-200/50 bg-white/60 hover:border-ipc-300'
                }`}
              >
                <span className="block text-3xl font-bold text-ipc-950 mb-1">oz</span>
                <span className="block text-sm text-ipc-500">{tc('fluidOunces')}</span>
              </button>
            </div>

            <div className="space-y-3 max-w-xs mx-auto">
              <Button
                onClick={() => { track('onboarding_unit', { unit: volumeUnit }); goForward(3); }}
                fullWidth
                size="lg"
              >
                {tc('next')}
                <ChevronRight size={18} className="ml-1 inline" />
              </Button>
              <button
                type="button"
                onClick={() => goBack(1)}
                className="inline-flex items-center justify-center gap-1 px-4 min-h-[40px] rounded-full
                  text-sm font-semibold text-ipc-700 bg-white border border-ipc-200
                  hover:bg-ipc-50 active:scale-[0.97] transition-all"
              >
                <ChevronLeft size={16} />
                {tc('back')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date confirmation + Timezone */}
        {step === 3 && (
          <div key="step3" className={`w-full text-center ${animClass}`}>
            <h2 className="text-2xl font-bold text-ipc-950 mb-1.5 text-balance">
              {t('dateTitle')}
            </h2>
            <p className="text-sm text-ipc-500 mb-4 text-balance">
              {t('dateSubtitle')}
            </p>

            {/* Date input */}
            <div className="flex justify-center mb-2.5">
              <div className="relative">
                <Calendar size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ipc-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 pr-4 py-3 text-base font-semibold text-ipc-950
                    bg-white/60 border-2 border-ipc-200/50 rounded-2xl
                    outline-none focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30
                    transition-all"
                />
              </div>
            </div>

            {/* Timezone display — "Change" reads as a real button for older users */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-sm text-ipc-500">
                <Globe size={14} className="text-ipc-400" />
                {timeZoneCity(timeZone)} ({getTimezoneOffset(timeZone)})
              </span>
              <button
                type="button"
                onClick={() => setShowTzPicker(true)}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                  text-ipc-700 bg-white/70 border border-ipc-200 hover:bg-ipc-50 active:scale-[0.96] transition-all"
              >
                {t('timezoneChange')}
              </button>
            </div>

            {/* 3-day preview (compact) */}
            <div className="bg-white/60 border border-ipc-100 rounded-2xl px-3 py-2.5 mb-5 text-left">
              <p className="text-[10px] font-semibold text-ipc-400 uppercase tracking-wide mb-1.5">{t('trackingPeriodLabel')}</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 px-2 py-1.5 bg-ipc-50/60 rounded-lg">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-ipc-500 text-white text-[10px] font-bold shrink-0">1</span>
                  <span className="text-sm font-medium text-ipc-800">{formatFullDayDate(format(day1, 'yyyy-MM-dd'), locale)}</span>
                </div>
                <div className="flex items-center gap-2.5 px-2 py-1.5 bg-ipc-50/40 rounded-lg">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-ipc-300 text-white text-[10px] font-bold shrink-0">2</span>
                  <span className="text-sm font-medium text-ipc-600">{formatFullDayDate(format(day2, 'yyyy-MM-dd'), locale)}</span>
                </div>
                <div className="flex items-center gap-2.5 px-2 py-1.5 bg-ipc-50/30 rounded-lg">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-ipc-200 text-ipc-600 text-[10px] font-bold shrink-0">3</span>
                  <span className="text-sm font-medium text-ipc-500">{formatFullDayDate(format(day3, 'yyyy-MM-dd'), locale)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleConfirm}
                fullWidth
                size="lg"
              >
                {t('confirmAndStart')}
              </Button>
              <button
                type="button"
                onClick={() => goBack(2)}
                className="inline-flex items-center justify-center gap-1 px-4 min-h-[40px] rounded-full
                  text-sm font-semibold text-ipc-700 bg-white border border-ipc-200
                  hover:bg-ipc-50 active:scale-[0.97] transition-all"
              >
                <ChevronLeft size={16} />
                {tc('back')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timezone Picker BottomSheet */}
      <BottomSheet open={showTzPicker} onClose={() => setShowTzPicker(false)} title={t('timezonePickerTitle')}>
        <div className="space-y-1 pb-4">
          {tzOptions.map((tz) => (
            <button
              key={tz}
              type="button"
              onClick={() => { setTimeZone(tz); setShowTzPicker(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                tz === timeZone
                  ? 'bg-ipc-50 border border-ipc-200'
                  : 'hover:bg-ipc-50/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ipc-900">{timeZoneCity(tz)}</span>
                <span className="block text-xs text-ipc-400">{getTimezoneOffset(tz)}</span>
              </div>
              {tz === timeZone && <Check size={18} className="text-ipc-500 shrink-0" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
