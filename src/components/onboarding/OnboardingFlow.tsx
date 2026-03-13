'use client';

import { useState } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { ChevronRight, Calendar } from 'lucide-react';
import { track } from '@vercel/analytics';
import Button from '@/components/ui/Button';

interface OnboardingFlowProps {
  onComplete: (age: number, startDate: string, volumeUnit: 'mL' | 'oz') => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [age, setAge] = useState('');
  const [volumeUnit, setVolumeUnit] = useState<'mL' | 'oz'>('mL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
    track('onboarding_complete', { age: ageNum, unit: volumeUnit });
    onComplete(ageNum, startDate, volumeUnit);
  };

  // Compute the 3 tracking days
  const day1 = parseISO(startDate + 'T12:00:00');
  const day2 = addDays(day1, 1);
  const day3 = addDays(day1, 2);

  const animClass = direction === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center px-6 pt-12 pb-12 max-w-lg mx-auto w-full">

        {/* Step dots */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 1 ? 'bg-ipc-500' : 'bg-ipc-200'}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 2 ? 'bg-ipc-500' : 'bg-ipc-200'}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 3 ? 'bg-ipc-500' : 'bg-ipc-200'}`} />
        </div>

        {/* Step 1: Age */}
        {step === 1 && (
          <div key="step1" className={`w-full text-center ${animClass}`}>
            <h2 className="text-2xl font-bold text-ipc-950 mb-2">
              What&apos;s your age?
            </h2>
            <p className="text-sm text-ipc-500 mb-8">
              This is useful information for your health professional.
            </p>

            <div className="flex justify-center mb-8">
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
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
                Next
                <ChevronRight size={18} className="ml-1 inline" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Unit selection */}
        {step === 2 && (
          <div key="step2" className={`w-full text-center ${animClass}`}>
            <h2 className="text-2xl font-bold text-ipc-950 mb-2">
              How do you measure?
            </h2>
            <p className="text-sm text-ipc-500 mb-8">
              Choose the unit you&apos;re most comfortable with. This will be used throughout the app.
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
                <span className="block text-sm text-ipc-500">Millilitres</span>
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
                <span className="block text-sm text-ipc-500">Fluid ounces</span>
              </button>
            </div>

            <div className="space-y-3 max-w-xs mx-auto">
              <Button
                onClick={() => { track('onboarding_unit', { unit: volumeUnit }); goForward(3); }}
                fullWidth
                size="lg"
              >
                Next
                <ChevronRight size={18} className="ml-1 inline" />
              </Button>
              <button
                type="button"
                onClick={() => goBack(1)}
                className="text-sm text-ipc-400 hover:text-ipc-600 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date confirmation */}
        {step === 3 && (
          <div key="step3" className={`w-full text-center ${animClass}`}>
            <h2 className="text-2xl font-bold text-ipc-950 mb-2">
              When do you want to start?
            </h2>
            <p className="text-sm text-ipc-500 mb-6">
              You need to track for <span className="font-semibold text-ipc-700">3 consecutive days</span> for it to work. Start on a morning when you can record your first pee of the day.
            </p>

            {/* Date input */}
            <div className="flex justify-center mb-6">
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

            {/* 3-day preview */}
            <div className="bg-white/60 border border-ipc-100 rounded-2xl p-4 mb-8 text-left">
              <p className="text-xs font-semibold text-ipc-400 uppercase tracking-wide mb-3">Your 3-day tracking period</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-3 py-2.5 bg-ipc-50/60 rounded-xl">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-ipc-500 text-white text-xs font-bold">1</span>
                  <span className="text-sm font-medium text-ipc-800">{format(day1, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 bg-ipc-50/40 rounded-xl">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-ipc-300 text-white text-xs font-bold">2</span>
                  <span className="text-sm font-medium text-ipc-600">{format(day2, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 bg-ipc-50/30 rounded-xl">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-ipc-200 text-ipc-600 text-xs font-bold">3</span>
                  <span className="text-sm font-medium text-ipc-500">{format(day3, 'EEEE, MMMM d, yyyy')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleConfirm}
                fullWidth
                size="lg"
              >
                Confirm & Start
              </Button>
              <button
                type="button"
                onClick={() => goBack(2)}
                className="text-sm text-ipc-400 hover:text-ipc-600 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
