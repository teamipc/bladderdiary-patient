'use client';

import { Droplets, Coffee, Moon, Trash2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { getDrinkLabel, getDrinkEmoji, SENSATION_LABELS } from '@/lib/constants';
import type { VoidEntry, DrinkEntry, BedtimeEntry } from '@/lib/types';

type TimelineEventProps =
  | { type: 'void'; entry: VoidEntry; onDelete: (id: string) => void }
  | { type: 'drink'; entry: DrinkEntry; onDelete: (id: string) => void }
  | { type: 'bedtime'; entry: BedtimeEntry; onDelete: (dayNumber: number) => void };

export default function TimelineEvent(props: TimelineEventProps) {
  const { type } = props;

  if (type === 'void') {
    const { entry, onDelete } = props;
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-ipc-100
        hover:border-ipc-200 transition-colors group animate-fade-slide-up">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl bg-void/10 flex items-center justify-center shrink-0">
          <Droplets size={22} className="text-void" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-ipc-950">
              {entry.volumeMl} mL
            </span>
            <span className="text-sm text-ipc-500">
              Sensation {entry.sensation} ({SENSATION_LABELS[entry.sensation].short})
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-ipc-600">{formatTime(entry.timestampIso)}</span>
            {entry.isFirstMorningVoid && (
              <span className="text-xs bg-ipc-100 text-ipc-700 px-2 py-0.5 rounded-full font-medium">
                First morning
              </span>
            )}
            {entry.sensation === 4 && (
              <span className="text-xs bg-danger-light text-danger px-2 py-0.5 rounded-full font-medium">
                Leak
              </span>
            )}
            {entry.note && (
              <span className="text-xs text-ipc-500 truncate">{entry.note}</span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="w-9 h-9 flex items-center justify-center rounded-full
            text-ipc-300 hover:text-danger hover:bg-danger-light transition-colors
            opacity-0 group-hover:opacity-100 sm:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  if (type === 'drink') {
    const { entry, onDelete } = props;
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-ipc-100
        hover:border-ipc-200 transition-colors group animate-fade-slide-up">
        <div className="w-11 h-11 rounded-xl bg-drink/10 flex items-center justify-center shrink-0
          text-2xl">
          {getDrinkEmoji(entry.drinkType)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-ipc-950">
              {getDrinkLabel(entry.drinkType)}
            </span>
            <span className="text-sm text-ipc-500">{entry.volumeMl} mL</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-ipc-600">{formatTime(entry.timestampIso)}</span>
            {entry.note && (
              <span className="text-xs text-ipc-500 truncate">{entry.note}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="w-9 h-9 flex items-center justify-center rounded-full
            text-ipc-300 hover:text-danger hover:bg-danger-light transition-colors
            opacity-0 group-hover:opacity-100 sm:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  // Bedtime
  const { entry, onDelete } = props;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-bedtime/20
      hover:border-bedtime/40 transition-colors group animate-fade-slide-up">
      <div className="w-11 h-11 rounded-xl bg-bedtime/10 flex items-center justify-center shrink-0">
        <Moon size={22} className="text-bedtime" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-base font-semibold text-ipc-950">Bedtime</span>
        <div className="mt-0.5">
          <span className="text-sm text-ipc-600">{formatTime(entry.timestampIso)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDelete(entry.dayNumber)}
        className="w-9 h-9 flex items-center justify-center rounded-full
          text-ipc-300 hover:text-danger hover:bg-danger-light transition-colors
          opacity-0 group-hover:opacity-100 sm:opacity-100"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
