'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquarePlus, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import DrinkTypePicker from '@/components/diary/DrinkTypePicker';
import Button from '@/components/ui/Button';
import { VOLUME_CONFIG } from '@/lib/constants';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay, correctNightDate, correctAfterMidnight, mlToDisplayVolume, displayVolumeToMl } from '@/lib/utils';
import type { DrinkType, DrinkEntry } from '@/lib/types';

interface LogDrinkFormProps {
  onSave: () => void;
  dayNumber: number;
  editEntry?: DrinkEntry;
  initialTime?: string;
  isNightView?: boolean;
}

const TOTAL_STEPS = 2;

export default function LogDrinkForm({ onSave, dayNumber, editEntry, initialTime, isNightView }: LogDrinkFormProps) {
  const { addDrink, updateDrink, getBedtimeForDay, getWakeTimeForDay, startDate, volumeUnit } = useDiaryStore();
  const t = useTranslations('logDrink');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const vc = VOLUME_CONFIG[volumeUnit];
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
    return getDefaultTimeForDay(startDate, dayNumber as 1 | 2 | 3, after);
  };

  const handleTimeChange = useCallback((newTime: string) => {
    if (isNightView && prevDayBedtime) {
      setTime(correctNightDate(newTime, prevDayBedtime.timestampIso));
    } else {
      setTime(correctAfterMidnight(newTime, dayNumber as 1 | 2 | 3, startDate));
    }
  }, [isNightView, prevDayBedtime, dayNumber, startDate]);

  const [drinkType, setDrinkType] = useState<DrinkType>(editEntry?.drinkType ?? 'water');
  const [volume, setVolume] = useState(editEntry ? mlToDisplayVolume(editEntry.volumeMl, volumeUnit) : vc.default);
  const [time, setTime] = useState(smartDefault);
  const [note, setNote] = useState(editEntry?.note ?? '');

  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [noteOpen, setNoteOpen] = useState(false);
  const [arrowFlash, setArrowFlash] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteAreaRef = useRef<HTMLDivElement>(null);

  const savedRef = useRef(false);
  const formRef = useRef({ drinkType, volume, time, note });
  useEffect(() => {
    formRef.current = { drinkType, volume, time, note };
  });

  useEffect(() => {
    if (!isEditing || !editEntry) return;
    return () => {
      if (savedRef.current) return;
      const d = formRef.current;
      if (d.volume <= 0) return;
      updateDrink(editEntry.id, {
        timestampIso: d.time,
        volumeMl: displayVolumeToMl(d.volume, volumeUnit),
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

  const isBeforePrevBedtime = prevDayBedtime ? time <= prevDayBedtime.timestampIso : false;
  const isBeforeWakeTime = !isNightView && wakeTime ? time < wakeTime.timestampIso : false;
  const isAfterWakeTime = isNightView && wakeTime ? time >= wakeTime.timestampIso : false;
  const isAfterBedtime = !isNightView && currentBedtime ? time >= currentBedtime.timestampIso : false;

  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(() => {
    if (volume <= 0) return;
    if (isBeforePrevBedtime && prevDayBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforePrevBedtime', { dayNumber: dayNumber - 1, time: formatTime(prevDayBedtime.timestampIso) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isBeforeWakeTime && wakeTime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforeWakeUp', { time: formatTime(wakeTime.timestampIso) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterWakeTime && wakeTime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterWakeUp', { time: formatTime(wakeTime.timestampIso) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterBedtime && currentBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterBedtime', { time: formatTime(currentBedtime.timestampIso) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    savedRef.current = true;
    const data = {
      timestampIso: time,
      volumeMl: displayVolumeToMl(volume, volumeUnit),
      drinkType,
      note,
    };
    if (isEditing && editEntry) {
      updateDrink(editEntry.id, data);
    } else {
      addDrink(data);
    }
    onSave();
  }, [volume, drinkType, time, note, isEditing, editEntry, addDrink, updateDrink, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber, volumeUnit, isBeforeWakeTime, isAfterWakeTime, wakeTime, isAfterBedtime, currentBedtime, tv]);

  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[70vh]">
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2].map((s) => (
          <button key={s} type="button" onClick={() => goToStep(s)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              s === step ? 'bg-drink scale-125' : s < step ? 'bg-drink/50' : 'bg-drink/20'
            }`}
            aria-label={`Step ${s}`} />
        ))}
      </div>

      <div className="relative">
        {step > 1 && (
          <button type="button" onClick={() => goToStep(step - 1)}
            className="absolute left-0 top-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-drink/10 border border-drink/20 text-drink shadow-sm active:scale-[0.85] active:bg-drink/20 transition-all"
            aria-label="Previous step">
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        )}
        {step < TOTAL_STEPS && (
          <button type="button" onClick={() => goToStep(step + 1)}
            className={`absolute right-0 top-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-drink/10 border border-drink/20 text-drink shadow-sm active:scale-[0.85] active:bg-drink/20 transition-all ${arrowFlash ? 'arrow-pulse-drink' : ''}`}
            aria-label="Next step">
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        )}

        <div key={step} className={`px-2 ${slideClass}`}>
          {step === 1 && (
            <>
              <h3 className="text-xl font-bold text-center mb-2 text-ipc-950 px-10 text-balance">
                {t('whatDrink')}
              </h3>
              <DrinkTypePicker value={drinkType} onChange={handleDrinkTypeChange} />
              <div className="flex justify-center mt-2.5 mb-1">
                <button type="button" onClick={handleNoteToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.95] ${
                    noteOpen || note ? 'bg-drink/15 text-drink ring-1 ring-drink/30' : 'bg-drink/5 text-drink/70 border border-drink/20'
                  }`}>
                  <MessageSquarePlus size={15} />
                  {note && !noteOpen ? tc('noteAdded') : tc('addNote')}
                </button>
              </div>
              {noteOpen && (
                <div ref={noteAreaRef} className="note-expand mt-1 pb-1">
                  <div className="relative">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      autoFocus rows={2} maxLength={120}
                      className="w-full px-3 py-2.5 pr-11 rounded-xl border-2 border-drink/30 focus:border-drink/60 focus:ring-2 focus:ring-drink/20 outline-none transition-all bg-white/50 backdrop-blur-sm text-drink text-sm resize-none placeholder:text-drink/40" />
                    <button type="button" onClick={handleNoteToggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-drink text-white active:scale-[0.9] transition-all"
                      aria-label={tc('done')}>
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
              <div className="border-t border-drink/15 mt-2 mb-2" />
              <h3 className="text-lg font-bold text-center mb-1 text-ipc-950 text-balance">
                {t('howMuch')}
              </h3>
              <div onPointerUp={handleSliderRelease} onTouchEnd={handleSliderRelease}>
                <VolumeInput value={volume} onChange={handleVolumeChange}
                  onEditingChange={(editing) => { if (editing) cancelAutoAdvance(); }}
                  unit={volumeUnit} max={vc.max} step={vc.step} variant="drink" />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center min-h-[45vh]">
              <h3 className="text-xl font-bold text-center mb-5 text-ipc-950 text-balance">
                {t('whenWasThis')}
              </h3>
              <TimePicker value={time} onChange={handleTimeChange} variant="drink" />
              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">{timeWarning}</p>
                </div>
              )}
              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="md" variant="drink" disabled={volume <= 0}>
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
