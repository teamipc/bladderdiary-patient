'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Droplets, CheckCircle2, ChevronLeft, ChevronRight, Plus, RotateCcw, Check } from 'lucide-react';
import TimelineEvent from './TimelineEvent';
import DrinkIcon from '@/components/ui/DrinkIcon';
import { useDiaryStore } from '@/lib/store';
import { getDayDate, formatDate, formatTime } from '@/lib/utils';
import type { VoidEntry, DrinkEntry, BedtimeEntry, WakeTimeEntry } from '@/lib/types';

interface TimelineViewProps {
  dayNumber: 1 | 2 | 3;
  onLogVoid?: (initialTime?: string) => void;
  onLogDrink?: (initialTime?: string) => void;
  onLogBedtime?: () => void;
  onLogWakeUp?: () => void;
  onEditVoid?: (entry: VoidEntry) => void;
  onEditDrink?: (entry: DrinkEntry) => void;
  onEditBedtime?: (entry: BedtimeEntry) => void;
}

type TimelineItem =
  | { kind: 'void'; entry: VoidEntry }
  | { kind: 'drink'; entry: DrinkEntry }
  | { kind: 'bedtime'; entry: BedtimeEntry }
  | { kind: 'wakeup'; entry: WakeTimeEntry };

/** Calculate the midpoint ISO timestamp between two ISO timestamps */
function midpointTime(a: string, b: string): string {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return new Date(Math.round((ta + tb) / 2)).toISOString();
}

export default function TimelineView({ dayNumber, onLogVoid, onLogDrink, onLogBedtime, onLogWakeUp, onEditVoid, onEditDrink, onEditBedtime }: TimelineViewProps) {
  const {
    startDate,
    getVoidsForDay,
    getDrinksForDay,
    getBedtimeForDay,
    getWakeTimeForDay,
    removeVoid,
    removeDrink,
    removeBedtime,
    removeWakeTime,
    markMorningVoid,
    resetDiary,
  } = useDiaryStore();
  const router = useRouter();

  const voids = getVoidsForDay(dayNumber);
  const drinks = getDrinksForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);
  const wakeTime = getWakeTimeForDay(dayNumber);

  const dayDateStr = getDayDate(startDate, dayNumber);
  const dayLabel = formatDate(dayDateStr + 'T12:00:00');

  const hasMorningVoid = voids.some((v) => v.isFirstMorningVoid);
  const hasBedtime = !!bedtime;
  const hasWakeTime = !!wakeTime;

  // Day navigation
  const prevDayBedtime = dayNumber > 1 ? getBedtimeForDay((dayNumber - 1) as 1 | 2 | 3) : undefined;
  const nextDayAccessible = dayNumber < 3 && hasBedtime;

  // Day completion status for progress indicator
  const day1Bedtime = !!getBedtimeForDay(1);
  const day2Bedtime = !!getBedtimeForDay(2);
  const day3Bedtime = !!getBedtimeForDay(3);
  const dayStatus = [
    { num: 1, complete: day1Bedtime, accessible: true },
    { num: 2, complete: day2Bedtime, accessible: day1Bedtime },
    { num: 3, complete: day3Bedtime, accessible: day2Bedtime },
  ];

  // Nighttime mode: Day 2/3, previous bedtime set, NO wake time yet
  const isNighttime = dayNumber > 1 && !hasWakeTime && !!prevDayBedtime;

  // Day is complete:
  // Day 1: first void logged + bedtime set (no wake-up needed, diary starts with first void)
  // Day 2/3: morning void tagged + bedtime set
  const isDayComplete = dayNumber === 1
    ? voids.length > 0 && hasBedtime
    : hasMorningVoid && hasBedtime;

  // Track which "+" gap is expanded
  const [openInsertIdx, setOpenInsertIdx] = useState<number | null>(null);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Morning void warning
  const [morningWarning, setMorningWarning] = useState<string | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMarkMorning = useCallback((id: string) => {
    if (wakeTime) {
      const entry = voids.find((v) => v.id === id);
      if (entry && entry.timestampIso < wakeTime.timestampIso) {
        if (warningTimer.current) clearTimeout(warningTimer.current);
        setMorningWarning(
          `This pee was before your wake-up at ${formatTime(wakeTime.timestampIso)}`,
        );
        warningTimer.current = setTimeout(() => setMorningWarning(null), 3500);
        return;
      }
    }
    setMorningWarning(null);
    markMorningVoid(id, dayNumber);
  }, [wakeTime, voids, markMorningVoid, dayNumber]);

  // Handle "Wake up" button — opens wake-up time form
  const handleWakeUp = useCallback(() => {
    onLogWakeUp?.();
  }, [onLogWakeUp]);

  // Merge and sort all events chronologically
  const items = useMemo<TimelineItem[]>(() => {
    const all: TimelineItem[] = [
      ...voids.map((entry) => ({ kind: 'void' as const, entry })),
      ...drinks.map((entry) => ({ kind: 'drink' as const, entry })),
      ...(bedtime ? [{ kind: 'bedtime' as const, entry: bedtime }] : []),
      ...(wakeTime ? [{ kind: 'wakeup' as const, entry: wakeTime }] : []),
    ];
    return all.sort((a, b) =>
      a.entry.timestampIso.localeCompare(b.entry.timestampIso),
    );
  }, [voids, drinks, bedtime, wakeTime]);

  const handleInsertVoid = (gapIdx: number) => {
    if (gapIdx < items.length - 1) {
      const timeBefore = items[gapIdx].entry.timestampIso;
      const timeAfter = items[gapIdx + 1].entry.timestampIso;
      const mid = midpointTime(timeBefore, timeAfter);
      setOpenInsertIdx(null);
      onLogVoid?.(mid);
    } else {
      // After last event — no pre-set time
      setOpenInsertIdx(null);
      onLogVoid?.();
    }
  };

  const handleInsertDrink = (gapIdx: number) => {
    if (gapIdx < items.length - 1) {
      const timeBefore = items[gapIdx].entry.timestampIso;
      const timeAfter = items[gapIdx + 1].entry.timestampIso;
      const mid = midpointTime(timeBefore, timeAfter);
      setOpenInsertIdx(null);
      onLogDrink?.(mid);
    } else {
      setOpenInsertIdx(null);
      onLogDrink?.();
    }
  };

  const renderTimelineItem = (item: TimelineItem) => {
    if (item.kind === 'void') {
      return (
        <TimelineEvent
          key={item.entry.id}
          type="void"
          entry={item.entry}
          onDelete={removeVoid}
          onEdit={onEditVoid}
          onMarkMorning={handleMarkMorning}
        />
      );
    }
    if (item.kind === 'drink') {
      return (
        <TimelineEvent
          key={item.entry.id}
          type="drink"
          entry={item.entry}
          onDelete={removeDrink}
          onEdit={onEditDrink}
        />
      );
    }
    if (item.kind === 'wakeup') {
      return (
        <TimelineEvent
          key={item.entry.id}
          type="wakeup"
          entry={item.entry}
          onDelete={(dn) => removeWakeTime(dn as 1 | 2 | 3)}
        />
      );
    }
    return (
      <TimelineEvent
        key={item.entry.id}
        type="bedtime"
        entry={item.entry}
        onDelete={(dn) => removeBedtime(dn as 1 | 2 | 3)}
        onEdit={onEditBedtime}
      />
    );
  };

  return (
    <div className={`flex flex-col transition-colors duration-700 rounded-2xl ${
      isNighttime ? 'nighttime-tint -mx-3 px-3 py-3' : ''
    }`}>
      {/* 3-day journey progress — subtle indicator */}
      <div className="flex items-center justify-center mb-3 px-8">
        {dayStatus.map((day, idx) => {
          const isCurrent = day.num === dayNumber;
          const isComplete = day.complete;
          const isAccessible = day.accessible;

          // Circle colors — subtle palette
          let circleClass: string;
          let labelClass: string;
          if (isNighttime) {
            if (isCurrent) {
              circleClass = 'bg-indigo-400/80 text-white ring-1 ring-indigo-300/30';
              labelClass = 'text-indigo-300/70';
            } else if (isComplete) {
              circleClass = 'bg-indigo-400/40 text-white/80';
              labelClass = 'text-indigo-400/40';
            } else {
              circleClass = 'bg-indigo-500/15 text-indigo-400/30';
              labelClass = 'text-indigo-500/20';
            }
          } else {
            if (isCurrent) {
              circleClass = 'bg-ipc-400 text-white ring-1 ring-ipc-300/30';
              labelClass = 'text-ipc-500';
            } else if (isComplete) {
              circleClass = 'bg-ipc-300 text-white';
              labelClass = 'text-ipc-300';
            } else {
              circleClass = 'bg-ipc-100 text-ipc-300';
              labelClass = 'text-ipc-200';
            }
          }

          // Line between dots
          const showLine = idx < 2;
          const lineComplete = dayStatus[idx].complete;

          const circleContent = (
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold
                transition-all ${circleClass}`}>
                {isComplete && !isCurrent ? <Check size={11} strokeWidth={2.5} /> : day.num}
              </div>
              <span className={`text-[9px] font-medium ${labelClass}`}>
                Day {day.num}
              </span>
            </div>
          );

          return (
            <div key={day.num} className="flex items-center">
              {isAccessible ? (
                <Link
                  href={`/diary/day/${day.num}`}
                  className="active:scale-[0.9] transition-all"
                  aria-label={`Day ${day.num}${isComplete ? ' (complete)' : isCurrent ? ' (current)' : ''}`}
                >
                  {circleContent}
                </Link>
              ) : (
                <div aria-label={`Day ${day.num} (locked)`}>
                  {circleContent}
                </div>
              )}
              {/* Connecting line */}
              {showLine && (
                <div className={`flex-1 w-8 h-px mt-[-10px] mx-1.5 transition-colors ${
                  isNighttime
                    ? lineComplete ? 'bg-indigo-400/40' : 'bg-indigo-500/10'
                    : lineComplete ? 'bg-ipc-300' : 'bg-ipc-100'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Day header with navigation arrows */}
      <div className="flex items-center justify-between px-1 mb-3">
        {dayNumber > 1 ? (
          <Link
            href={`/diary/day/${dayNumber - 1}`}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all
              active:scale-[0.9] ${
                isNighttime ? 'text-indigo-200 hover:bg-indigo-500/20' : 'text-ipc-600 hover:bg-ipc-100'
              }`}
            aria-label={`Go to Day ${dayNumber - 1}`}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full
              text-ipc-400 hover:text-danger hover:bg-danger-light transition-all active:scale-[0.9]"
            aria-label="Start over"
          >
            <RotateCcw size={20} strokeWidth={2} />
          </button>
        )}

        <div className="text-center">
          <h2 className={`text-xl font-bold ${isNighttime ? 'text-indigo-100' : 'text-ipc-950'}`}>
            Day {dayNumber}
          </h2>
          <span className={`font-medium text-sm ${isNighttime ? 'text-indigo-300/80' : 'text-ipc-500'}`}>
            {dayLabel}
          </span>
        </div>

        {dayNumber < 3 ? (
          nextDayAccessible ? (
            <Link
              href={`/diary/day/${dayNumber + 1}`}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all
                active:scale-[0.9] ${
                  isNighttime ? 'text-indigo-200 hover:bg-indigo-500/20' : 'text-ipc-600 hover:bg-ipc-100'
                }`}
              aria-label={`Go to Day ${dayNumber + 1}`}
            >
              <ChevronRight size={24} strokeWidth={2.5} />
            </Link>
          ) : (
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full ${
                isNighttime ? 'text-indigo-500/30' : 'text-ipc-200'
              }`}
            >
              <ChevronRight size={24} strokeWidth={2.5} />
            </div>
          )
        ) : isDayComplete ? (
          <Link
            href="/summary"
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all
              active:scale-[0.9] text-ipc-600 hover:bg-ipc-100"
            aria-label="View Results"
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </Link>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* Day/Night indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {isNighttime ? (
          <>
            <Moon size={14} className="text-indigo-300" />
            <span className="text-xs font-medium text-indigo-300/80">
              Nighttime
            </span>
          </>
        ) : (
          <>
            <Sun size={14} className="text-ipc-400" />
            <span className="text-xs font-medium text-ipc-400">
              Daytime
            </span>
          </>
        )}
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          {isNighttime ? (
            <Moon size={48} className="text-indigo-300/60 mx-auto mb-4" />
          ) : (
            <Sun size={48} className="text-ipc-300 mx-auto mb-4" />
          )}
          <p className={`text-lg font-semibold mb-1 ${isNighttime ? 'text-indigo-100' : 'text-ipc-800'}`}>
            {isNighttime ? 'Good evening!' : dayNumber === 1 ? 'Hello!' : 'Good morning!'}
          </p>
          <p className={`text-base mb-5 ${isNighttime ? 'text-indigo-300/80' : 'text-ipc-500'}`}>
            {isNighttime
              ? 'Add any overnight trips or drinks'
              : dayNumber === 1 && !hasWakeTime
                ? 'Start by adding your wake-up time'
                : `Add your first pee to start Day ${dayNumber}`}
          </p>
          {isNighttime ? (
            <div className="space-y-4">
              <div className="flex justify-center gap-3">
                {onLogVoid && (
                  <button
                    type="button"
                    onClick={() => onLogVoid()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-indigo-500 text-white"
                  >
                    <Droplets size={16} />
                    Pee
                  </button>
                )}
                {onLogDrink && (
                  <button
                    type="button"
                    onClick={() => onLogDrink()}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-indigo-400/30 text-indigo-100 border border-indigo-400/30"
                  >
                    <DrinkIcon name="GlassWater" size={16} className="text-indigo-200" />
                    Drink
                  </button>
                )}
              </div>
              {onLogWakeUp && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <div className="w-12 h-px bg-indigo-400/20 mx-auto mb-1" />
                  <p className="text-sm text-amber-300/80 text-center">
                    Add any overnight pees or drinks first
                  </p>
                  <button
                    type="button"
                    onClick={handleWakeUp}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-amber-400/20 text-amber-200 border border-amber-400/30"
                  >
                    <Sun size={18} />
                    I&apos;m awake
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day 1: prompt wake-up first, then first pee */}
              {dayNumber === 1 && !hasWakeTime && onLogWakeUp ? (
                <button
                  type="button"
                  onClick={handleWakeUp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                    font-semibold text-base active:scale-[0.97] transition-all
                    bg-warning/15 text-warning border border-warning/30"
                >
                  <Sun size={18} />
                  Add wake-up time
                </button>
              ) : (
                onLogVoid && (
                  <button
                    type="button"
                    onClick={() => onLogVoid()}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl
                      font-semibold text-base active:scale-[0.97] transition-all
                      bg-ipc-500 text-white"
                  >
                    Add First Pee
                    <ChevronRight size={18} />
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-0">
          {items.map((item, idx) => (
            <div key={item.entry.id} className="relative pb-4">
              {renderTimelineItem(item)}

              {/* "+" insertion button at bottom border of event — hidden once day is complete */}
              {!isDayComplete && (
                <div className="absolute -bottom-0 left-0 right-0 flex justify-center z-10">
                  {openInsertIdx === idx ? (
                    <div className="flex items-center gap-2 animate-scale-in bg-white/80 dark:bg-transparent backdrop-blur-sm rounded-full px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleInsertVoid(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                          transition-all active:scale-[0.95] ${
                            isNighttime
                              ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30'
                              : 'bg-void/10 text-void border border-void/20'
                          }`}
                      >
                        <Droplets size={12} />
                        Pee
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertDrink(idx)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                          transition-all active:scale-[0.95] ${
                            isNighttime
                              ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30'
                              : 'bg-drink/10 text-drink border border-drink/20'
                          }`}
                      >
                        <DrinkIcon name="GlassWater" size={12} className={isNighttime ? 'text-indigo-200' : 'text-drink'} />
                        Drink
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenInsertIdx(null)}
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs
                          transition-all active:scale-[0.9] ${
                            isNighttime ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-ipc-300 hover:bg-ipc-100'
                          }`}
                        aria-label="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenInsertIdx(idx)}
                      className={`w-6 h-6 flex items-center justify-center rounded-full
                        transition-all active:scale-[0.85] shadow-sm ${
                          isNighttime
                            ? 'bg-indigo-900/80 text-indigo-400/60 hover:text-indigo-300 hover:bg-indigo-500/30 border border-indigo-400/20'
                            : 'bg-white text-ipc-300 hover:text-ipc-500 hover:bg-ipc-50 border border-ipc-100'
                        }`}
                      aria-label="Insert event here"
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Morning void warning */}
      {morningWarning && (
        <div className="mt-3 px-4 py-2.5 rounded-2xl bg-danger-light border border-danger/20 animate-fade-slide-up">
          <p className="text-sm font-medium text-danger text-center">
            {morningWarning}
          </p>
        </div>
      )}

      {/* Wake-up reminder — show below night events so user taps it when they wake up */}
      {isNighttime && items.length > 0 && (
        <div className="mt-4 px-4 py-3 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 animate-fade-slide-up">
          <div className="flex items-center gap-3">
            <Sun size={20} className="text-amber-300 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-100">
                Mark your wake-up time
              </p>
              <p className="text-xs text-indigo-300/70 mt-0.5">
                This switches to daytime
              </p>
            </div>
            <button
              type="button"
              onClick={handleWakeUp}
              className="text-sm font-semibold text-amber-300 hover:text-amber-200
                active:scale-[0.95] transition-all"
            >
              Wake up
            </button>
          </div>
        </div>
      )}

      {/* Bedtime reminder */}
      {items.length > 0 && !hasBedtime && !isNighttime && (
        <div className="mt-4 px-4 py-3 rounded-2xl bg-bedtime/5 border border-bedtime/15">
          <div className="flex items-center gap-3">
            <Moon size={20} className="shrink-0 text-bedtime/70" />
            <div className="flex-1">
              <p className="text-sm font-medium text-bedtime">
                Mark your bedtime
              </p>
              <p className="text-xs mt-0.5 text-bedtime/70">
                This wraps up Day {dayNumber}
              </p>
            </div>
            {onLogBedtime && (
              <button
                type="button"
                onClick={onLogBedtime}
                className="px-4 py-2 rounded-full text-sm font-semibold
                  bg-bedtime text-white
                  active:scale-[0.95] transition-all"
              >
                Go to bed
              </button>
            )}
          </div>
        </div>
      )}

      {/* Day complete indicator */}
      {isDayComplete && (
        <div className="mt-4 space-y-2.5">
          <div className="px-4 py-2.5 rounded-2xl bg-ipc-100/30 border border-ipc-200/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-ipc-400" />
              <p className="text-sm font-medium text-ipc-500">
                Day {dayNumber} complete
              </p>
            </div>
          </div>
          {dayNumber < 3 && nextDayAccessible && (
            <Link
              href={`/diary/day/${dayNumber + 1}`}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
                bg-ipc-500 text-white font-semibold text-base
                active:scale-[0.97] transition-all animate-start-day"
            >
              Start Day {dayNumber + 1}
              <ChevronRight size={18} />
            </Link>
          )}
          {dayNumber === 3 && (
            <Link
              href="/summary"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
                bg-ipc-500 text-white font-semibold text-base
                active:scale-[0.97] transition-all animate-start-day"
            >
              View Results
              <ChevronRight size={18} />
            </Link>
          )}
        </div>
      )}

      {/* Reset confirmation overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 backdrop-dim" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl mx-6 p-6 max-w-sm w-full animate-scale-in">
            <div className="text-center">
              <RotateCcw size={36} className="text-danger mx-auto mb-3" />
              <h3 className="text-lg font-bold text-ipc-950 mb-1">Start over?</h3>
              <p className="text-sm text-ipc-600 mb-5">
                This will clear all data from Day 1, Day 2, and Day 3. This can&apos;t be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-base
                    bg-ipc-50 text-ipc-800 border border-ipc-200
                    active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetDiary();
                    setShowResetConfirm(false);
                    router.replace('/');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-base
                    bg-danger text-white
                    active:scale-[0.97] transition-all"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
