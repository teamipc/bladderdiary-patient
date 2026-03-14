'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CopyPlus, ChevronLeft, ChevronRight, Droplets, MessageSquarePlus, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import Button from '@/components/ui/Button';
import { VOLUME_CONFIG } from '@/lib/constants';
import SensationPicker from '@/components/diary/SensationPicker';
import { useDiaryStore } from '@/lib/store';
import { formatTime, getDefaultTimeForDay, correctNightDate, correctAfterMidnight, mlToDisplayVolume, displayVolumeToMl } from '@/lib/utils';
import type { BladderSensation, VoidEntry } from '@/lib/types';

interface LogVoidFormProps {
  onSave: () => void;
  dayNumber: number;
  editEntry?: VoidEntry;
  initialTime?: string;
  isNightView?: boolean;
}

export default function LogVoidForm({ onSave, dayNumber, editEntry, initialTime, isNightView }: LogVoidFormProps) {
  const { addVoid, updateVoid, getWakeTimeForDay, getBedtimeForDay, startDate, volumeUnit } = useDiaryStore();
  const t = useTranslations('logVoid');
  const tc = useTranslations('common');
  const tv = useTranslations('validation');
  const locale = useLocale();
  const vc = VOLUME_CONFIG[volumeUnit];
  const isEditing = !!editEntry;

  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const wakeTimeEntry = getWakeTimeForDay(dayNumber);
  const currentBedtime = getBedtimeForDay(dayNumber as 1 | 2 | 3);

  const smartDefault = () => {
    if (editEntry) return editEntry.timestampIso;
    if (initialTime) return initialTime;
    if (isNightView && prevDayBedtime) {
      return new Date(new Date(prevDayBedtime.timestampIso).getTime() + 5 * 60 * 1000).toISOString();
    }
    const after = wakeTimeEntry?.timestampIso ?? prevDayBedtime?.timestampIso;
    return getDefaultTimeForDay(startDate, dayNumber as 1 | 2 | 3, after);
  };

  const handleTimeChange = useCallback((newTime: string) => {
    if (isNightView && prevDayBedtime) {
      setTime(correctNightDate(newTime, prevDayBedtime.timestampIso));
    } else {
      setTime(correctAfterMidnight(newTime, dayNumber as 1 | 2 | 3, startDate));
    }
  }, [isNightView, prevDayBedtime, dayNumber, startDate]);

  const [volume, setVolume] = useState(editEntry ? mlToDisplayVolume(editEntry.volumeMl, volumeUnit) : vc.default);
  const [sensation, setSensation] = useState<BladderSensation | null>(editEntry?.sensation ?? null);
  const [time, setTime] = useState(smartDefault);
  const [note, setNote] = useState(editEntry?.note ?? '');
  const [leak, setLeak] = useState(editEntry?.leak ?? false);

  const [doubleVoid, setDoubleVoid] = useState(!!editEntry?.doubleVoidMl);
  const [doubleVoidVolume, setDoubleVoidVolume] = useState(
    editEntry?.doubleVoidMl ? mlToDisplayVolume(editEntry.doubleVoidMl, volumeUnit) : (volumeUnit === 'oz' ? 3 : 75),
  );

  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [noteOpen, setNoteOpen] = useState(false);
  const [arrowFlash, setArrowFlash] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteAreaRef = useRef<HTMLDivElement>(null);

  const savedRef = useRef(false);
  const formRef = useRef({ volume, sensation, time, note, leak, doubleVoid, doubleVoidVolume });
  useEffect(() => {
    formRef.current = { volume, sensation, time, note, leak, doubleVoid, doubleVoidVolume };
  });

  useEffect(() => {
    if (!isEditing || !editEntry) return;
    return () => {
      if (savedRef.current) return;
      const d = formRef.current;
      if (d.volume <= 0) return;
      updateVoid(editEntry.id, {
        timestampIso: d.time,
        volumeMl: displayVolumeToMl(d.volume, volumeUnit),
        doubleVoidMl: d.doubleVoid ? displayVolumeToMl(d.doubleVoidVolume, volumeUnit) : undefined,
        sensation: d.sensation,
        leak: d.leak,
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
      setTimeout(() => {
        noteAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
    setNoteOpen(prev => !prev);
  }, [noteOpen, cancelAutoAdvance]);

  const isBeforePrevBedtime = prevDayBedtime ? time <= prevDayBedtime.timestampIso : false;
  const isBeforeWakeTime = !isNightView && wakeTimeEntry ? time < wakeTimeEntry.timestampIso : false;
  const isAfterWakeTime = isNightView && wakeTimeEntry ? time >= wakeTimeEntry.timestampIso : false;
  const isAfterBedtime = !isNightView && currentBedtime ? time >= currentBedtime.timestampIso : false;

  const [timeWarning, setTimeWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(() => {
    if (volume <= 0) return;
    if (isBeforePrevBedtime && prevDayBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforePrevBedtime', { dayNumber: dayNumber - 1, time: formatTime(prevDayBedtime.timestampIso, locale) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isBeforeWakeTime && wakeTimeEntry) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('beforeWakeUp', { time: formatTime(wakeTimeEntry.timestampIso, locale) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterWakeTime && wakeTimeEntry) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterWakeUp', { time: formatTime(wakeTimeEntry.timestampIso, locale) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    if (isAfterBedtime && currentBedtime) {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      setTimeWarning(tv('afterBedtime', { time: formatTime(currentBedtime.timestampIso, locale) }));
      warningTimerRef.current = setTimeout(() => setTimeWarning(null), 4000);
      return;
    }
    savedRef.current = true;
    const data = {
      timestampIso: time,
      volumeMl: displayVolumeToMl(volume, volumeUnit),
      doubleVoidMl: doubleVoid ? displayVolumeToMl(doubleVoidVolume, volumeUnit) : undefined,
      sensation,
      leak,
      note,
      isFirstMorningVoid: false,
    };
    if (isEditing && editEntry) {
      updateVoid(editEntry.id, data);
    } else {
      addVoid(data);
    }
    onSave();
  }, [volume, sensation, leak, time, note, doubleVoid, doubleVoidVolume, isEditing, editEntry, addVoid, updateVoid, onSave, isBeforePrevBedtime, prevDayBedtime, dayNumber, volumeUnit, isBeforeWakeTime, isAfterWakeTime, wakeTimeEntry, isAfterBedtime, currentBedtime, tv]);

  const slideClass = slideDir === 'left' ? 'animate-step-in-left' : 'animate-step-in-right';

  return (
    <div className="select-none min-h-[60vh]">
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3].map((s) => (
          <button key={s} type="button" onClick={() => goToStep(s)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              s === step ? 'bg-ipc-500 scale-125' : s < step ? 'bg-ipc-300' : 'bg-ipc-200/60'
            }`}
            aria-label={`Step ${s}`} />
        ))}
      </div>

      <div className="relative">
        {step > 1 && (
          <button type="button" onClick={() => goToStep(step - 1)}
            className="absolute left-0 top-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-ipc-100 border border-ipc-200 text-ipc-600 shadow-sm active:scale-[0.85] active:bg-ipc-200 transition-all"
            aria-label="Previous step">
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
        )}
        {step < 3 && (
          <button type="button" onClick={() => goToStep(step + 1)}
            className={`absolute right-0 top-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-ipc-100 border border-ipc-200 text-ipc-600 shadow-sm active:scale-[0.85] active:bg-ipc-200 transition-all ${arrowFlash ? 'arrow-pulse' : ''}`}
            aria-label="Next step">
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
        )}

        <div key={step} className={`px-2 ${slideClass}`}>
          {step === 1 && (
            <>
              <h3 className="text-xl font-bold text-center mb-3 text-ipc-800 px-10 text-balance">
                {t('howMuch')}
              </h3>
              <div onPointerUp={handleSliderRelease} onTouchEnd={handleSliderRelease}>
                <VolumeInput value={volume} onChange={handleVolumeChange}
                  onEditingChange={(editing) => { if (editing) cancelAutoAdvance(); }}
                  unit={volumeUnit} max={vc.max} step={vc.step} />
              </div>
              <div className="border-t border-ipc-100/60 mt-5 mb-4" />
              <div className="flex justify-center">
                <button type="button" onClick={() => { setDoubleVoid(!doubleVoid); cancelAutoAdvance(); }}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-base font-semibold transition-all active:scale-[0.95] ${
                    doubleVoid ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30' : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                  }`}>
                  <CopyPlus size={16} />
                  <span className="flex flex-col items-start leading-tight">
                    <span>{t('doubleVoid')}</span>
                    <span className={`text-[10px] font-normal ${doubleVoid ? 'text-ipc-600' : 'text-ipc-500'}`}>
                      {t('doubleVoidDescription')}
                    </span>
                  </span>
                </button>
              </div>
              {doubleVoid && (
                <div className="mt-3 animate-fade-slide-up"
                  onPointerUp={() => { if (step === 1 && doubleVoid) scheduleAutoAdvance(2, 2500); }}
                  onTouchEnd={() => { if (step === 1 && doubleVoid) scheduleAutoAdvance(2, 2500); }}>
                  <label className="block text-sm font-medium text-ipc-500 mb-1 text-center">
                    {t('secondPeeAmount')}
                  </label>
                  <VolumeInput value={doubleVoidVolume} onChange={setDoubleVoidVolume}
                    onEditingChange={(editing) => { if (editing) cancelAutoAdvance(); }}
                    unit={volumeUnit} max={volumeUnit === 'oz' ? 25 : 750} step={vc.step} />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-xl font-bold text-center mb-3 text-ipc-800 px-10 text-balance">
                {t('anythingElse')}
              </h3>
              <div className="mb-4">
                <SensationPicker value={sensation} onChange={(v) => {
                  cancelAutoAdvance();
                  setSensation(v);
                  if (v !== null && !noteOpen) scheduleAutoAdvance(3, 2500);
                }} />
                {sensation !== null ? (
                  <p className="text-sm text-ipc-600 text-center mt-2">
                    {/* Sensation description from translations handled by SensationPicker */}
                  </p>
                ) : (
                  <p className="text-xs text-ipc-400 text-center mt-2">
                    {t('optionalTapHint')}
                  </p>
                )}
              </div>
              <div className="border-t border-ipc-100/60 my-4" />
              <p className="text-base font-semibold text-ipc-700 mb-2">
                {t('didAnythingElseHappen')}
              </p>
              <div className="flex justify-center gap-2 mb-2.5">
                <button type="button" onClick={handleLeakToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.95] ${
                    leak ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30' : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                  }`}>
                  <Droplets size={15} />
                  {tc('log')}
                </button>
                <button type="button" onClick={handleNoteToggle}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-[0.95] ${
                    noteOpen || note ? 'bg-ipc-500/15 text-ipc-700 ring-1 ring-ipc-500/30' : 'bg-white/40 text-ipc-400 border border-ipc-100/50'
                  }`}>
                  <MessageSquarePlus size={15} />
                  {note && !noteOpen ? tc('noteAdded') : tc('addNote')}
                </button>
              </div>
              {noteOpen && (
                <div ref={noteAreaRef} className="note-expand mt-2 pb-2">
                  <div className="relative">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)}
                      placeholder={t('notePlaceholder')}
                      autoFocus rows={2} maxLength={120}
                      className="w-full px-3 py-2.5 pr-11 rounded-xl border-2 border-ipc-200/50 focus:border-ipc-500/60 focus:ring-2 focus:ring-ipc-200/30 outline-none transition-all bg-white/50 backdrop-blur-sm text-ipc-950 text-sm resize-none" />
                    <button type="button" onClick={handleNoteToggle}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-ipc-500 text-white active:scale-[0.9] transition-all"
                      aria-label={tc('done')}>
                      <Check size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center min-h-[45vh]">
              <h3 className="text-xl font-bold text-center mb-5 text-ipc-800 text-balance">
                {t('whenWasThis')}
              </h3>
              <TimePicker value={time} onChange={handleTimeChange} />
              {timeWarning && (
                <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
                  <p className="text-sm font-medium text-danger text-center">{timeWarning}</p>
                </div>
              )}
              <div className="flex justify-center mt-6">
                <Button onClick={handleSave} size="md" disabled={volume <= 0}>
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
