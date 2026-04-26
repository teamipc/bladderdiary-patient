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
  const tlt = useTranslations('leakTriggers');
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
      setTime(correctAfterMidnight(newTime, dayNumber as 1 | 2 | 3, startDate, timeZone, wakeTime?.timestampIso));
    }
  }, [isNightView, prevDayBedtime, dayNumber, startDate, timeZone, wakeTime]);

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

  const goToStep = useCallback((target: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_STEPS, target));
    setSlideDir(clamped > step ? 'left' : 'right');
    setStep(clamped);
  }, [step]);

  const handleTriggerChange = useCallback((t: LeakTrigger | null) => {
    setTrigger(t);
  }, []);

  const handleAmountChange = useCallback((a: LeakAmount) => {
    setAmount(prev => prev === a ? null : a);
  }, []);

  const handleNoteToggle = useCallback(() => {
    if (!noteOpen) {
      setTimeout(() => {
        noteAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
    setNoteOpen(prev => !prev);
  }, [noteOpen]);

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
    const data = {
      timestampIso: time,
      trigger,
      urgencyBeforeLeak,
      amount,
      notes: notes || undefined,
    };
    if (isEditing && editEntry) {
      savedRef.current = true;
      updateLeak(editEntry.id, data);
      onSave();
      return;
    }
    const ok = addLeak(data);
    if (!ok) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('duplicateMinute'));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    savedRef.current = true;
    onSave();
  }, [trigger, urgencyBeforeLeak, amount, time, notes, isEditing, editEntry, addLeak, updateLeak, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber, isBeforeWakeTime, isAfterWakeTime, wakeTime, isAfterBedtime, currentBedtime, tv]);

  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[60vh]">
      {/* Step dots — terracotta theme */}
      <div className="flex flex-col items-center gap-1 mb-3">
        <div className="flex justify-center gap-2">
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
        <span className="text-[11px] font-semibold tracking-wide text-leak/70 uppercase">
          {tc('stepOf', { current: step, total: TOTAL_STEPS })}
        </span>
      </div>

      {step > 1 && (
        <div className="px-2 mb-2">
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="inline-flex items-center gap-1 pl-2 pr-3 h-8 rounded-full
              bg-leak/10 border border-leak/20 text-leak
              active:scale-[0.95] active:bg-leak/20 transition-all"
            aria-label={tc('previousStep')}
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
            <span className="text-sm font-semibold">{tc('back')}</span>
          </button>
        </div>
      )}

      {/* Step content area */}
      <div className="relative">
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
              <p className="text-xs text-ipc-600 text-center mb-2">
                {t('optionalTapHint')}
              </p>
              <div className="grid grid-cols-4 gap-1.5 mb-6 w-full px-1">
                {LEAK_AMOUNT_OPTIONS.map((a) => {
                  const selected = amount === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => handleAmountChange(a.value)}
                      aria-pressed={selected}
                      className={`px-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.95] min-h-[44px] ${
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
            <div className="flex flex-col items-center min-h-[45vh] pt-4">
              {/* Recap so the user confirms choices from earlier steps before saving */}
              <div className="w-full mb-5 px-4 py-3 rounded-2xl bg-leak/5 border border-leak/15">
                <p className="text-[11px] font-semibold tracking-wide text-leak/60 uppercase mb-1">
                  {tc('review')}
                </p>
                <p className="text-sm font-medium text-leak leading-snug">
                  {[
                    trigger ? tlt(`${trigger}.label`) : null,
                    amount ? tla(amount) : null,
                    urgencyBeforeLeak === true ? t('urgencyYesRecap') : urgencyBeforeLeak === false ? t('urgencyNoRecap') : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>

              <h3 className="text-lg font-bold text-center mb-3 text-ipc-950 text-balance">
                {t('whenWasThis')}
              </h3>

              <TimePicker value={time} onChange={handleTimeChange} variant="leak" timeZone={timeZone} />

              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">
                    {timeWarning}
                  </p>
                </div>
              )}

              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="lg" variant={isNightView ? 'night' : 'leak'} disabled={!trigger || urgencyBeforeLeak === null}>
                  {isEditing ? tc('updateCheck') : tc('saveCheck')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Next on non-final steps — always visible at the bottom */}
      {step < TOTAL_STEPS && (
        <div className="sticky bottom-0 -mx-5 mt-6 px-5 pt-5 pb-2 bg-gradient-to-t from-white via-white/95 to-white/0">
          <Button
            onClick={() => goToStep(step + 1)}
            fullWidth
            size="lg"
            variant={isNightView ? 'night' : 'leak'}
            disabled={step === 1 ? !trigger : urgencyBeforeLeak === null}
          >
            {tc('next')}
            <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
