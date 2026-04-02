'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import TimePicker from '@/components/ui/TimePicker';
import LeakTriggerPicker from '@/components/diary/LeakTriggerPicker';
import Button from '@/components/ui/Button';
import { LEAK_AMOUNT_OPTIONS } from '@/lib/constants';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay, correctNightDate, correctAfterMidnight } from '@/lib/utils';
import type { LeakTrigger, LeakAmount, LeakEntry } from '@/lib/types';

interface LogLeakFormProps {
  onSave: () => void;
  dayNumber: number;
  editEntry?: LeakEntry;
  initialTime?: string;
  isNightView?: boolean;
}

const TOTAL_STEPS = 3;

export default function LogLeakForm({ onSave, dayNumber, editEntry, initialTime, isNightView }: LogLeakFormProps) {
  const { addLeak, updateLeak, getBedtimeForDay, getWakeTimeForDay, startDate, timeZone } = useDiaryStore();
  const t = useTranslations('logLeak');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const locale = useLocale();
  const tla = useTranslations('leakAmounts');
  const isEditing = !!editEntry;

  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const wakeTime = getWakeTimeForDay(dayNumber as 1 | 2 | 3);
  const currentBedtime = getBedtimeForDay(dayNumber as 1 | 2 | 3);

  const smartDefault = () => {
    if (editEntry) return editEntry.timestampIso;
    if (initialTime) return initialTime;
    if (isNightView && prevDayBedtime) {
      return new Date(new Date(prevDayBedtime.timestampIso).getTime() + 5 * 60 * 1000).toISOString();
    }
    const after = wakeTime?.timestampIso ?? prevDayBedtime?.timestampIso;
    return getDefaultTimeForDay(startDate, dayNumber as 1 | 2 | 3, after, timeZone);
  };

  // In day view, correct after-midnight times so they sort after wake-up
  const handleTimeChange = useCallback((newTime: string) => {
    if (isNightView && prevDayBedtime) {
      setTime(correctNightDate(newTime, prevDayBedtime.timestampIso, timeZone));
    } else {
      setTime(correctAfterMidnight(newTime, dayNumber as 1 | 2 | 3, startDate, timeZone));
    }
  }, [isNightView, prevDayBedtime, dayNumber, startDate, timeZone]);

  // Form state
  const [trigger, setTrigger] = useState<LeakTrigger | null>(editEntry?.trigger ?? null);
  const [amount, setAmount] = useState<LeakAmount | null>(editEntry?.amount ?? null);
  const [urgencyBeforeLeak, setUrgencyBeforeLeak] = useState<boolean | null>(editEntry?.urgencyBeforeLeak ?? null);
  const [time, setTime] = useState(smartDefault);
  const [notes, setNotes] = useState(editEntry?.notes ?? '');
  const [noteOpen, setNoteOpen] = useState(false);

  // Wizard state
  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [arrowFlash, setArrowFlash] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteAreaRef = useRef<HTMLDivElement>(null);

  // Auto-save refs
  const savedRef = useRef(false);
  const formRef = useRef({ trigger, amount, urgencyBeforeLeak, time, notes });
  useEffect(() => {
    formRef.current = { trigger, amount, urgencyBeforeLeak, time, notes };
  });

  // Auto-save on unmount when editing
  useEffect(() => {
    if (!isEditing || !editEntry) return;
    return () => {
      if (savedRef.current) return;
      const d = formRef.current;
      if (!d.trigger) return;
      updateLeak(editEntry.id, {
        timestampIso: d.time,
        trigger: d.trigger,
        urgencyBeforeLeak: d.urgencyBeforeLeak,
        amount: d.amount,
        notes: d.notes,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const cancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, []);

  const flashArrow = useCallback(() => {
    setArrowFlash(false);
    requestAnimationFrame(() => setArrowFlash(true));
    setTimeout(() => setArrowFlash(false), 3200);
  }, []);

  const scheduleAutoAdvance = useCallback((targetStep: number, delay: number) => {
    cancelAutoAdvance();
    autoAdvanceTimer.current = setTimeout(() => {
      setSlideDir(targetStep > step ? 'left' : 'right');
      setStep(targetStep);
      autoAdvanceTimer.current = null;
    }, delay);
    flashArrow();
  }, [cancelAutoAdvance, flashArrow, step]);

  const goToStep = useCallback((target: number) => {
    cancelAutoAdvance();
    const clamped = Math.max(1, Math.min(TOTAL_STEPS, target));
    setSlideDir(clamped > step ? 'left' : 'right');
    setStep(clamped);
  }, [cancelAutoAdvance, step]);

  const handleTriggerChange = useCallback((t: LeakTrigger | null) => {
    setTrigger(t);
    // Auto-advance after 2.5s if a trigger was selected (not deselected) and not editing notes
    if (t !== null && !noteOpen) {
      scheduleAutoAdvance(2, 2500);
    } else {
      cancelAutoAdvance();
    }
  }, [noteOpen, scheduleAutoAdvance, cancelAutoAdvance]);

  const handleAmountChange = useCallback((a: LeakAmount) => {
    setAmount(prev => prev === a ? null : a);
  }, []);

  const handleNoteToggle = useCallback(() => {
    if (!noteOpen) {
      cancelAutoAdvance();
      setTimeout(() => {
        noteAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
    setNoteOpen(prev => !prev);
  }, [noteOpen, cancelAutoAdvance]);

  // Time boundary checks
  const isBeforePrevBedtime = prevDayBedtime ? time <= prevDayBedtime.timestampIso : false;
  const isBeforeWakeTime = !isNightView && wakeTime ? time < wakeTime.timestampIso : false;
  const isAfterWakeTime = isNightView && wakeTime ? time >= wakeTime.timestampIso : false;
  const isAfterBedtime = !isNightView && currentBedtime ? time >= currentBedtime.timestampIso : false;

  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(() => {
    if (!trigger || urgencyBeforeLeak === null) return;
    if (isBeforePrevBedtime && prevDayBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforePrevBedtime', { dayNumber: dayNumber - 1, time: formatTime(prevDayBedtime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isBeforeWakeTime && wakeTime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforeWakeUp', { time: formatTime(wakeTime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterWakeTime && wakeTime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterWakeUp', { time: formatTime(wakeTime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterBedtime && currentBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterBedtime', { time: formatTime(currentBedtime.timestampIso, locale, timeZone) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    savedRef.current = true;
    const data = {
      timestampIso: time,
      trigger,
      urgencyBeforeLeak,
      amount,
      notes: notes || undefined,
    };
    if (isEditing && editEntry) {
      updateLeak(editEntry.id, data);
    } else {
      addLeak(data);
    }
    onSave();
  }, [trigger, urgencyBeforeLeak, amount, time, notes, isEditing, editEntry, addLeak, updateLeak, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber, isBeforeWakeTime, isAfterWakeTime, wakeTime, isAfterBedtime, currentBedtime, tv]);

  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[60vh]">
      {/* Step dots — terracotta theme */}
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => goToStep(s)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              s === step
                ? 'bg-leak scale-125'
                : s < step
                  ? 'bg-leak/50'
                  : 'bg-leak/20'
            }`}
            aria-label={`Step ${s}`}
          />
        ))}
      </div>

      {/* Step content area */}
      <div className="relative">
        {/* Side arrows — terracotta theme */}
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="absolute left-0 top-4 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              bg-leak/10 border border-leak/20 text-leak shadow-sm
              active:scale-[0.85] active:bg-leak/20 transition-all"
            aria-label="Previous step"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        )}
        {step < TOTAL_STEPS && (
          <button
            type="button"
            onClick={() => goToStep(step + 1)}
            className={`absolute right-0 top-4 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              bg-leak/10 border border-leak/20 text-leak shadow-sm
              active:scale-[0.85] active:bg-leak/20 transition-all
              ${arrowFlash ? 'arrow-pulse-leak' : ''}`}
            aria-label="Next step"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        )}

        {/* Active step */}
        <div key={step} className={`px-2 ${slideClass}`}>
          {/* ── Step 1: What caused the leak? ── */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center min-h-[45vh]">
              <h3 className="text-xl font-bold text-center mb-2 text-ipc-950 px-10 text-balance">
                {t('whatCaused')}
              </h3>

              <LeakTriggerPicker value={trigger} onChange={handleTriggerChange} />

              {/* Note toggle — only for "other" trigger */}
              {trigger === 'other' && (
                <div className="flex justify-center mt-2.5 mb-1">
                  <button
                    type="button"
                    onClick={handleNoteToggle}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
                      transition-all active:scale-[0.95] ${
                        noteOpen || notes
                          ? 'bg-leak/15 text-leak ring-1 ring-leak/30'
                          : 'bg-leak/5 text-leak/70 border border-leak/20'
                      }`}
                  >
                    <MessageSquarePlus size={15} />
                    {notes && !noteOpen ? tc('noteAdded') : tc('addNote')}
                  </button>
                </div>
              )}

              {noteOpen && (
                <div ref={noteAreaRef} className="note-expand mt-1 pb-1">
                  <div className="relative">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      autoFocus
                      rows={2}
                      maxLength={120}
                      className="w-full px-3 py-2.5 pr-11 rounded-xl border-2 border-leak/30
                        focus:border-leak/60 focus:ring-2 focus:ring-leak/20
                        outline-none transition-all bg-white/50 backdrop-blur-sm text-leak text-sm
                        resize-none placeholder:text-leak/40"
                    />
                    <button
                      type="button"
                      onClick={handleNoteToggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                        rounded-lg bg-leak text-white active:scale-[0.9] transition-all"
                      aria-label={tc('done')}
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: How much + Urgency ── */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center min-h-[45vh]">
              {/* How much? */}
              <h3 className="text-lg font-bold text-center mb-3 text-ipc-950 px-10 text-balance">
                {t('howMuch')}
              </h3>
              <p className="text-xs text-ipc-400 text-center mb-2">
                {t('optionalTapHint')}
              </p>
              <div className="flex justify-center gap-2 mb-6">
                {LEAK_AMOUNT_OPTIONS.map((a) => {
                  const selected = amount === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => handleAmountChange(a.value)}
                      className={`px-5 py-2.5 rounded-xl text-base font-semibold transition-all active:scale-[0.95] min-h-[44px] ${
                        selected
                          ? 'bg-leak text-white ring-2 ring-leak/30'
                          : 'bg-white/40 text-ipc-600 border border-ipc-200/40'
                      }`}
                    >
                      {tla(a.value)}
                    </button>
                  );
                })}
              </div>

              {/* Separator */}
              <div className="border-t border-leak/15 mt-1 mb-3 w-full" />

              {/* Urgency before leak */}
              <h3 className="text-lg font-bold text-center mb-3 text-ipc-950 text-balance">
                {t('urgencyBefore')}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUrgencyBeforeLeak(true)}
                  className={`px-6 py-2.5 rounded-xl text-base font-semibold transition-all active:scale-[0.95] min-h-[44px] ${
                    urgencyBeforeLeak === true
                      ? 'bg-leak text-white ring-2 ring-leak/30'
                      : 'bg-white/40 text-ipc-600 border border-ipc-200/40'
                  }`}
                >
                  {tc('yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyBeforeLeak(false)}
                  className={`px-6 py-2.5 rounded-xl text-base font-semibold transition-all active:scale-[0.95] min-h-[44px] ${
                    urgencyBeforeLeak === false
                      ? 'bg-leak text-white ring-2 ring-leak/30'
                      : 'bg-white/40 text-ipc-600 border border-ipc-200/40'
                  }`}
                >
                  {tc('no')}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Time + Save ── */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center min-h-[45vh]">
              <h3 className="text-lg font-bold text-center mb-3 text-ipc-950 text-balance">
                {t('whenWasThis')}
              </h3>

              <TimePicker value={time} onChange={handleTimeChange} variant="leak" />

              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">
                    {timeWarning}
                  </p>
                </div>
              )}

              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="md" variant="leak" disabled={!trigger || urgencyBeforeLeak === null}>
                  {isEditing ? tc('updateCheck') : tc('saveCheck')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
