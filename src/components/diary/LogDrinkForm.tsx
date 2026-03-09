'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Check } from 'lucide-react';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import DrinkTypePicker from '@/components/diary/DrinkTypePicker';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay } from '@/lib/utils';
import type { DrinkType, DrinkEntry } from '@/lib/types';

interface LogDrinkFormProps {
  onSave: () => void;
  dayNumber: number;
  editEntry?: DrinkEntry;
  initialTime?: string;
}

const TOTAL_STEPS = 2;

export default function LogDrinkForm({ onSave, dayNumber, editEntry, initialTime }: LogDrinkFormProps) {
  const { addDrink, updateDrink, getBedtimeForDay, getWakeTimeForDay, startDate } = useDiaryStore();
  const isEditing = !!editEntry;

  // Previous day's bedtime — events on this day must be after it
  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const wakeTime = getWakeTimeForDay(dayNumber as 1 | 2 | 3);

  // Smart default: anchor to the diary day's date, after wake-up or prev bedtime
  const smartDefault = () => {
    if (editEntry) return editEntry.timestampIso;
    if (initialTime) return initialTime;
    const after = wakeTime?.timestampIso ?? prevDayBedtime?.timestampIso;
    return getDefaultTimeForDay(startDate, dayNumber as 1 | 2 | 3, after);
  };

  // Form state
  const [drinkType, setDrinkType] = useState<DrinkType>(editEntry?.drinkType ?? 'water');
  const [volume, setVolume] = useState(editEntry?.volumeMl ?? 250);
  const [time, setTime] = useState(smartDefault);
  const [note, setNote] = useState(editEntry?.note ?? '');

  // Wizard state
  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [noteOpen, setNoteOpen] = useState(false);
  const [arrowFlash, setArrowFlash] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteAreaRef = useRef<HTMLDivElement>(null);

  // Auto-save refs: track latest form values + whether Save button was used
  const savedRef = useRef(false);
  const formRef = useRef({ drinkType, volume, time, note });
  useEffect(() => {
    formRef.current = { drinkType, volume, time, note };
  });

  // Auto-save on unmount when editing (dismiss without tapping Save)
  useEffect(() => {
    if (!isEditing || !editEntry) return;
    return () => {
      if (savedRef.current) return;
      const d = formRef.current;
      if (d.volume <= 0) return;
      updateDrink(editEntry.id, {
        timestampIso: d.time,
        volumeMl: d.volume,
        drinkType: d.drinkType,
        note: d.note,
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

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
  }, []);

  const handleSliderRelease = useCallback(() => {
    if (step !== 1) return;
    if (!noteOpen) {
      scheduleAutoAdvance(2, 2500);
    }
  }, [step, noteOpen, scheduleAutoAdvance]);

  const handleNoteToggle = useCallback(() => {
    if (!noteOpen) {
      cancelAutoAdvance();
      setTimeout(() => {
        noteAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
    setNoteOpen(prev => !prev);
  }, [noteOpen, cancelAutoAdvance]);

  const handleDrinkTypeChange = useCallback((type: DrinkType) => {
    setDrinkType(type);
    cancelAutoAdvance();
  }, [cancelAutoAdvance]);

  // Check if time is before previous day's bedtime
  const isBeforePrevBedtime = prevDayBedtime ? time <= prevDayBedtime.timestampIso : false;

  // Temporary warning state
  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(() => {
    if (volume <= 0) return;
    // Block saving if time is before previous day's bedtime
    if (isBeforePrevBedtime && prevDayBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(
        `This time is before Day ${dayNumber - 1}'s bedtime (${formatTime(prevDayBedtime.timestampIso)}). Pick a later time.`
      );
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    savedRef.current = true;
    const data = {
      timestampIso: time,
      volumeMl: volume,
      drinkType,
      note,
    };
    if (isEditing && editEntry) {
      updateDrink(editEntry.id, data);
    } else {
      addDrink(data);
    }
    onSave();
  }, [volume, drinkType, time, note, isEditing, editEntry, addDrink, updateDrink, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber]);

  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[52vh]">
      {/* Step dots — blue theme */}
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => goToStep(s)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              s === step
                ? 'bg-drink scale-125'
                : s < step
                  ? 'bg-drink/50'
                  : 'bg-drink/20'
            }`}
            aria-label={`Step ${s}`}
          />
        ))}
      </div>

      {/* Step content area */}
      <div className="relative">
        {/* Side arrows — blue theme */}
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              bg-drink/10 border border-drink/20 text-drink shadow-sm
              active:scale-[0.85] active:bg-drink/20 transition-all"
            aria-label="Previous step"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        )}
        {step < TOTAL_STEPS && (
          <button
            type="button"
            onClick={() => goToStep(step + 1)}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              bg-drink/10 border border-drink/20 text-drink shadow-sm
              active:scale-[0.85] active:bg-drink/20 transition-all
              ${arrowFlash ? 'arrow-pulse' : ''}`}
            aria-label="Next step"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        )}

        {/* Active step */}
        <div key={step} className={`px-10 ${slideClass}`}>
          {step === 1 && (
            <>
              <h3 className="text-xl font-bold text-ipc-950 text-center mb-2">
                What did you drink?
              </h3>

              <DrinkTypePicker value={drinkType} onChange={handleDrinkTypeChange} />

              {/* Note toggle — right after drink selection */}
              <div className="flex justify-center mt-2.5 mb-1">
                <button
                  type="button"
                  onClick={handleNoteToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
                    transition-all active:scale-[0.95] ${
                      noteOpen || note
                        ? 'bg-drink/15 text-drink ring-1 ring-drink/30'
                        : 'bg-drink/5 text-drink/70 border border-drink/20'
                    }`}
                >
                  <MessageSquarePlus size={15} />
                  {note && !noteOpen ? 'Note \u2713' : 'Add a note'}
                </button>
              </div>

              {noteOpen && (
                <div ref={noteAreaRef} className="note-expand mt-1 pb-1">
                  <div className="relative">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., With lunch"
                      autoFocus
                      rows={2}
                      maxLength={120}
                      className="w-full px-3 py-2.5 pr-11 rounded-xl border-2 border-drink/30
                        focus:border-drink/60 focus:ring-2 focus:ring-drink/20
                        outline-none transition-all bg-white/50 backdrop-blur-sm text-drink text-sm
                        resize-none placeholder:text-drink/40"
                    />
                    <button
                      type="button"
                      onClick={handleNoteToggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                        rounded-lg bg-drink text-white active:scale-[0.9] transition-all"
                      aria-label="Done"
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Separator */}
              <div className="border-t border-drink/15 mt-2 mb-2" />

              <h3 className="text-lg font-bold text-ipc-950 text-center mb-1">
                About how much?
              </h3>

              <div
                onPointerUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
              >
                <VolumeInput
                  value={volume}
                  onChange={handleVolumeChange}
                  variant="drink"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <h3 className="text-xl font-bold text-ipc-950 text-center mb-5">
                When was this?
              </h3>

              <TimePicker value={time} onChange={setTime} variant="drink" />

              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">
                    {timeWarning}
                  </p>
                </div>
              )}

              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="md" variant="drink" disabled={volume <= 0}>
                  {isEditing ? 'Update \u2713' : 'Save \u2713'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
