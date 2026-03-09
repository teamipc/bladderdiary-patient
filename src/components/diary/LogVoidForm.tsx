'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CopyPlus, ChevronLeft, ChevronRight, Droplets, MessageSquarePlus, Check } from 'lucide-react';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import Button from '@/components/ui/Button';
import { SENSATION_LABELS } from '@/lib/constants';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay } from '@/lib/utils';
import type { BladderSensation, VoidEntry } from '@/lib/types';

interface LogVoidFormProps {
  onSave: () => void;
  dayNumber: number;
  editEntry?: VoidEntry;
  markAsMorningVoid?: boolean;
  initialTime?: string;
}

export default function LogVoidForm({ onSave, dayNumber, editEntry, markAsMorningVoid, initialTime }: LogVoidFormProps) {
  const { addVoid, updateVoid, getVoidsForDay, getWakeTimeForDay, getBedtimeForDay, startDate } = useDiaryStore();
  const isEditing = !!editEntry;

  // Previous day's bedtime — events on this day must be after it
  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const wakeTimeEntry = getWakeTimeForDay(dayNumber);

  // Smart default: anchor to the diary day's date, after wake-up or prev bedtime
  const smartDefault = () => {
    if (editEntry) return editEntry.timestampIso;
    if (initialTime) return initialTime;
    const after = wakeTimeEntry?.timestampIso ?? prevDayBedtime?.timestampIso;
    return getDefaultTimeForDay(startDate, dayNumber as 1 | 2 | 3, after);
  };

  // Form state — initialize from editEntry if editing, or initialTime if inserting between events
  const [volume, setVolume] = useState(editEntry?.volumeMl ?? 250);
  const [sensation, setSensation] = useState<BladderSensation>(editEntry?.sensation ?? 2);
  const [time, setTime] = useState(smartDefault);
  const [note, setNote] = useState(editEntry?.note ?? '');
  const [leak, setLeak] = useState(editEntry?.leak ?? false);

  const existingVoids = getVoidsForDay(dayNumber);
  const wakeTime = wakeTimeEntry;
  const hasMorningVoid = existingVoids.some((v) => v.isFirstMorningVoid);

  // Auto-tag as morning void: if wake time is set and no morning void exists yet,
  // the next pee logged is automatically the first morning pee
  const shouldAutoTagMorning = !isEditing && !!wakeTime && !hasMorningVoid;
  const isFirstVoid = isEditing
    ? editEntry.isFirstMorningVoid
    : (markAsMorningVoid ?? shouldAutoTagMorning ?? existingVoids.length === 0);
  const [firstMorning] = useState(isFirstVoid);
  const [doubleVoid, setDoubleVoid] = useState(!!editEntry?.doubleVoidMl);
  const [doubleVoidVolume, setDoubleVoidVolume] = useState(editEntry?.doubleVoidMl ?? 75);

  // Wizard state
  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [noteOpen, setNoteOpen] = useState(false);
  const [arrowFlash, setArrowFlash] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteAreaRef = useRef<HTMLDivElement>(null);

  // Auto-save refs: track latest form values + whether Save button was used
  const savedRef = useRef(false);
  const formRef = useRef({ volume, sensation, time, note, leak, firstMorning, doubleVoid, doubleVoidVolume });
  useEffect(() => {
    formRef.current = { volume, sensation, time, note, leak, firstMorning, doubleVoid, doubleVoidVolume };
  });

  // Auto-save on unmount when editing (dismiss without tapping Save)
  useEffect(() => {
    if (!isEditing || !editEntry) return;
    return () => {
      if (savedRef.current) return;
      const d = formRef.current;
      if (d.volume <= 0) return;
      updateVoid(editEntry.id, {
        timestampIso: d.time,
        volumeMl: d.volume,
        doubleVoidMl: d.doubleVoid ? d.doubleVoidVolume : undefined,
        sensation: d.sensation,
        leak: d.leak,
        note: d.note,
        isFirstMorningVoid: d.firstMorning,
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
    const clamped = Math.max(1, Math.min(3, target));
    setSlideDir(clamped > step ? 'left' : 'right');
    setStep(clamped);
  }, [cancelAutoAdvance, step]);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
  }, []);

  const handleSliderRelease = useCallback(() => {
    if (step !== 1) return;
    if (!doubleVoid) {
      scheduleAutoAdvance(2, 2500);
    }
  }, [step, doubleVoid, scheduleAutoAdvance]);

  const handleLeakToggle = useCallback(() => {
    setLeak(prev => !prev);
  }, []);

  const handleNoteToggle = useCallback(() => {
    if (!noteOpen) {
      cancelAutoAdvance();
      // Scroll note area into view after it renders
      setTimeout(() => {
        noteAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
    setNoteOpen(prev => !prev);
  }, [noteOpen, cancelAutoAdvance]);

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
      doubleVoidMl: doubleVoid ? doubleVoidVolume : undefined,
      sensation,
      leak,
      note,
      isFirstMorningVoid: firstMorning,
    };
    if (isEditing && editEntry) {
      updateVoid(editEntry.id, data);
    } else {
      addVoid(data);
    }
    onSave();
  }, [volume, sensation, leak, time, note, firstMorning, doubleVoid, doubleVoidVolume, isEditing, editEntry, addVoid, updateVoid, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber]);

  // Animation class based on slide direction
  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[52vh]">
      {/* Step dots */}
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => goToStep(s)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              s === step
                ? 'bg-ipc-500 scale-125'
                : s < step
                  ? 'bg-ipc-300'
                  : 'bg-ipc-200/60'
            }`}
            aria-label={`Step ${s}`}
          />
        ))}
      </div>

      {/* Step content area */}
      <div className="relative">
        {/* Side arrows */}
        {step > 1 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              bg-ipc-100 border border-ipc-200 text-ipc-600 shadow-sm
              active:scale-[0.85] active:bg-ipc-200 transition-all"
            aria-label="Previous step"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            onClick={() => goToStep(step + 1)}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10
              w-9 h-9 flex items-center justify-center rounded-full
              bg-ipc-100 border border-ipc-200 text-ipc-600 shadow-sm
              active:scale-[0.85] active:bg-ipc-200 transition-all
              ${arrowFlash ? 'arrow-pulse' : ''}`}
            aria-label="Next step"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        )}

        {/* Active step — only one rendered at a time */}
        <div key={step} className={`px-10 ${slideClass}`}>
          {step === 1 && (
            <>
              <h3 className="text-xl font-bold text-ipc-800 text-center mb-3">
                About how much?
              </h3>

              <div
                onPointerUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
              >
                <VolumeInput
                  value={volume}
                  onChange={handleVolumeChange}
                />
              </div>

              {/* Separator */}
              <div className="border-t border-ipc-100/60 mt-5 mb-4" />

              {/* Second pee toggle */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setDoubleVoid(!doubleVoid);
                    cancelAutoAdvance();
                  }}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-base font-semibold
                    transition-all active:scale-[0.95] ${
                      doubleVoid
                        ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30'
                        : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                    }`}
                >
                  <CopyPlus size={16} />
                  <span className="flex flex-col items-start leading-tight">
                    <span>Went twice</span>
                    <span className={`text-[10px] font-normal ${doubleVoid ? 'text-ipc-500' : 'text-ipc-300'}`}>
                      Peed, then went again right away
                    </span>
                  </span>
                </button>
              </div>

              {doubleVoid && (
                <div
                  className="mt-3 animate-fade-slide-up"
                  onPointerUp={() => {
                    if (step === 1 && doubleVoid) scheduleAutoAdvance(2, 2500);
                  }}
                  onTouchEnd={() => {
                    if (step === 1 && doubleVoid) scheduleAutoAdvance(2, 2500);
                  }}
                >
                  <label className="block text-sm font-medium text-ipc-500 mb-1 text-center">
                    How much was the second pee?
                  </label>
                  <VolumeInput
                    value={doubleVoidVolume}
                    onChange={setDoubleVoidVolume}
                    max={500}
                    step={25}
                  />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-xl font-bold text-ipc-800 text-center mb-3">
                Anything else to note?
              </h3>

              <p className="text-base font-semibold text-ipc-700 mb-2">
                How strong was the urge?
              </p>

              {/* Big sensation label */}
              <div className="text-center mb-1">
                <span className="text-2xl font-bold text-ipc-900">
                  {SENSATION_LABELS[sensation].short}
                </span>
              </div>
              <div className="text-center mb-2">
                <span className="text-sm text-ipc-800">
                  {SENSATION_LABELS[sensation].description}
                </span>
              </div>

              {/* Sensation slider */}
              <div
                className="px-2 mb-5"
                onPointerUp={() => {
                  if (step === 2 && !noteOpen) scheduleAutoAdvance(3, 2500);
                }}
                onTouchEnd={() => {
                  if (step === 2 && !noteOpen) scheduleAutoAdvance(3, 2500);
                }}
              >
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={sensation}
                  onChange={(e) => {
                    cancelAutoAdvance();
                    const v = parseInt(e.target.value) as BladderSensation;
                    setSensation(v);
                  }}
                  className="sensation-slider w-full"
                  aria-label="How strong was the urge"
                  style={{
                    '--sensation-color': `var(--color-ipc-${[200, 300, 400, 600, 800][sensation]})`,
                  } as React.CSSProperties}
                />
                <div className="flex justify-between text-[10px] text-ipc-800 mt-1 px-0.5">
                  <span>Not at all</span>
                  <span>Couldn&apos;t wait</span>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-ipc-100/60 my-4" />

              <p className="text-base font-semibold text-ipc-700 mb-2">
                Did anything else happen?
              </p>

              <div className="flex justify-center gap-2 mb-2.5">
                <button
                  type="button"
                  onClick={handleLeakToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold
                    transition-all active:scale-[0.95] ${
                      leak
                        ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30'
                        : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                    }`}
                >
                  <Droplets size={15} />
                  Leak
                </button>

                <button
                  type="button"
                  onClick={handleNoteToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold
                    transition-all active:scale-[0.95] ${
                      noteOpen || note
                        ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30'
                        : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                    }`}
                >
                  <MessageSquarePlus size={15} />
                  {note && !noteOpen ? 'Note ✓' : 'Add a note'}
                </button>
              </div>

              {noteOpen && (
                <div ref={noteAreaRef} className="note-expand mt-2 pb-2">
                  <div className="relative">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g., Had coffee 30 min ago"
                      autoFocus
                      rows={2}
                      maxLength={120}
                      className="w-full px-3 py-2.5 pr-11 rounded-xl border-2 border-ipc-200/50
                        focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30
                        outline-none transition-all bg-white/50 backdrop-blur-sm text-ipc-950 text-sm
                        resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleNoteToggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                        rounded-lg bg-ipc-500 text-white active:scale-[0.9] transition-all"
                      aria-label="Done"
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <h3 className="text-xl font-bold text-ipc-800 text-center mb-5">
                When was this?
              </h3>

              <TimePicker value={time} onChange={setTime} />

              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">
                    {timeWarning}
                  </p>
                </div>
              )}

              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="md" disabled={volume <= 0}>
                  {isEditing ? 'Update ✓' : 'Save ✓'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
