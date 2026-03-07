'use client';

import { useMemo } from 'react';
import TimelineEvent from './TimelineEvent';
import { useDiaryStore } from '@/lib/store';
import { getDayDate, formatDate } from '@/lib/utils';
import type { VoidEntry, DrinkEntry, BedtimeEntry } from '@/lib/types';

interface TimelineViewProps {
  dayNumber: 1 | 2 | 3;
}

type TimelineItem =
  | { kind: 'void'; entry: VoidEntry }
  | { kind: 'drink'; entry: DrinkEntry }
  | { kind: 'bedtime'; entry: BedtimeEntry };

export default function TimelineView({ dayNumber }: TimelineViewProps) {
  const {
    startDate,
    getVoidsForDay,
    getDrinksForDay,
    getBedtimeForDay,
    removeVoid,
    removeDrink,
    removeBedtime,
  } = useDiaryStore();

  const voids = getVoidsForDay(dayNumber);
  const drinks = getDrinksForDay(dayNumber);
  const bedtime = getBedtimeForDay(dayNumber);

  const dayDateStr = getDayDate(startDate, dayNumber);
  const dayLabel = formatDate(dayDateStr + 'T12:00:00');

  // Merge and sort all events chronologically
  const items = useMemo<TimelineItem[]>(() => {
    const all: TimelineItem[] = [
      ...voids.map((entry) => ({ kind: 'void' as const, entry })),
      ...drinks.map((entry) => ({ kind: 'drink' as const, entry })),
      ...(bedtime ? [{ kind: 'bedtime' as const, entry: bedtime }] : []),
    ];
    return all.sort((a, b) =>
      a.entry.timestampIso.localeCompare(b.entry.timestampIso),
    );
  }, [voids, drinks, bedtime]);

  // Compute day totals
  const totalFluids = drinks.reduce((sum, d) => sum + d.volumeMl, 0);
  const totalVoidVolume = voids.reduce((sum, v) => sum + v.volumeMl, 0);

  return (
    <div className="flex flex-col">
      {/* Day header */}
      <div className="px-1 mb-4">
        <h2 className="text-xl font-bold text-ipc-950">
          Day {dayNumber}
          <span className="text-ipc-500 font-medium text-base ml-2">
            {dayLabel}
          </span>
        </h2>
      </div>

      {/* Timeline events */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-lg font-semibold text-ipc-800 mb-1">No entries yet</p>
          <p className="text-base text-ipc-500">
            Tap the + button to log a void, drink, or bedtime
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            if (item.kind === 'void') {
              return (
                <TimelineEvent
                  key={item.entry.id}
                  type="void"
                  entry={item.entry}
                  onDelete={removeVoid}
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
                />
              );
            }
            return (
              <TimelineEvent
                key={item.entry.id}
                type="bedtime"
                entry={item.entry}
                onDelete={(dn) => removeBedtime(dn as 1 | 2 | 3)}
              />
            );
          })}
        </div>
      )}

      {/* Day totals */}
      {items.length > 0 && (
        <div className="mt-6 px-4 py-4 rounded-2xl bg-ipc-50 border border-ipc-100">
          <p className="text-sm font-semibold text-ipc-700 mb-2 uppercase tracking-wide">
            Day {dayNumber} Totals
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-drink">{totalFluids.toLocaleString()} mL</p>
              <p className="text-sm text-ipc-500">Fluid intake</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-void">{totalVoidVolume.toLocaleString()} mL</p>
              <p className="text-sm text-ipc-500">Voided ({voids.length} times)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
