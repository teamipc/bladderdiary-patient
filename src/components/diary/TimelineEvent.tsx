'use client';

import { Droplets, Moon, Trash2, Pencil, Sun } from 'lucide-react';
import { formatTime, mlToDisplayVolume } from '@/lib/utils';
import { getDrinkLabel, getDrinkIconName, SENSATION_LABELS } from '@/lib/constants';
import { useDiaryStore } from '@/lib/store';
import DrinkIcon from '@/components/ui/DrinkIcon';
import type { VoidEntry, DrinkEntry, BedtimeEntry, WakeTimeEntry } from '@/lib/types';

type TimelineEventBase = { nightMode?: boolean };
type TimelineEventProps =
  | (TimelineEventBase & { type: 'void'; entry: VoidEntry; onDelete: (id: string) => void; onEdit?: (entry: VoidEntry) => void })
  | (TimelineEventBase & { type: 'drink'; entry: DrinkEntry; onDelete: (id: string) => void; onEdit?: (entry: DrinkEntry) => void })
  | (TimelineEventBase & { type: 'bedtime'; entry: BedtimeEntry; onDelete: (dayNumber: number) => void; onEdit?: (entry: BedtimeEntry) => void })
  | (TimelineEventBase & { type: 'wakeup'; entry: WakeTimeEntry; onDelete: (dayNumber: number) => void });

export default function TimelineEvent(props: TimelineEventProps) {
  const { type, nightMode } = props;
  const { volumeUnit } = useDiaryStore();
  const fmt = (ml: number) => mlToDisplayVolume(ml, volumeUnit);

  if (type === 'void') {
    const { entry, onDelete, onEdit } = props;
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-ipc-100
        hover:border-ipc-200 transition-colors group animate-fade-slide-up">
        {/* Icon — sun for morning pee, droplets otherwise; purple in night mode */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            entry.isFirstMorningVoid
              ? 'bg-warning/15 ring-1 ring-warning/30'
              : nightMode ? 'bg-indigo-500/20' : 'bg-void/10'
          }`}
        >
          {entry.isFirstMorningVoid ? (
            <Sun size={22} className="text-warning" />
          ) : (
            <Droplets size={22} className={nightMode ? 'text-indigo-400' : 'text-void'} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-ipc-950">
              {formatTime(entry.timestampIso)}
            </span>
            {entry.isFirstMorningVoid && (
              <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">
                Morning pee
              </span>
            )}
            {entry.doubleVoidMl && (
              <span className="text-xs bg-ipc-100 text-ipc-600 px-2 py-0.5 rounded-full font-medium">
                Double void
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-medium text-ipc-950 shrink-0">
              {entry.doubleVoidMl
                ? `${fmt(entry.volumeMl)} + ${fmt(entry.doubleVoidMl)} ${volumeUnit}`
                : `${fmt(entry.volumeMl)} ${volumeUnit}`}
            </span>
            <span className="text-sm text-ipc-400 shrink-0">
              {SENSATION_LABELS[entry.sensation].short}
            </span>
            {entry.leak && (
              <Droplets size={14} className="text-ipc-400 shrink-0" />
            )}
          </div>
          {entry.note && (
            <p className="text-xs text-ipc-500 mt-0.5 truncate">{entry.note}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="w-9 h-9 flex items-center justify-center rounded-full
                text-ipc-300 hover:text-ipc-600 hover:bg-ipc-50 transition-colors"
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="w-9 h-9 flex items-center justify-center rounded-full
              text-ipc-300 hover:text-danger hover:bg-danger-light transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  }

  if (type === 'drink') {
    const { entry, onDelete, onEdit } = props;
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-drink/20
        hover:border-drink/40 transition-colors group animate-fade-slide-up">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-drink/10">
          <DrinkIcon name={getDrinkIconName(entry.drinkType)} size={22} className="text-drink" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-ipc-950">
              {formatTime(entry.timestampIso)}
            </span>
            <span className="text-xs bg-drink/10 text-drink px-2 py-0.5 rounded-full font-medium">
              {getDrinkLabel(entry.drinkType)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-medium text-drink">{fmt(entry.volumeMl)} {volumeUnit}</span>
          </div>
          {entry.note && (
            <p className="text-xs text-ipc-500 mt-0.5 truncate">{entry.note}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="w-9 h-9 flex items-center justify-center rounded-full
                text-drink/40 hover:text-drink hover:bg-drink/10 transition-colors"
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            className="w-9 h-9 flex items-center justify-center rounded-full
              text-drink/40 hover:text-danger hover:bg-danger-light transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  }

  if (type === 'wakeup') {
    const { entry, onDelete } = props;
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-warning/5 border border-warning/20
        transition-colors group animate-fade-slide-up">
        <div className="w-11 h-11 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
          <Sun size={22} className="text-warning" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-base font-semibold text-ipc-950">Wake up</span>
          <div className="mt-0.5">
            <span className="text-sm text-ipc-600">{formatTime(entry.timestampIso)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(entry.dayNumber)}
          className="w-9 h-9 flex items-center justify-center rounded-full
            text-ipc-300 hover:text-danger hover:bg-danger-light transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    );
  }

  // Bedtime
  const { entry, onDelete, onEdit } = props;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-bedtime/20
      hover:border-bedtime/40 transition-colors group animate-fade-slide-up">
      <div className="w-11 h-11 rounded-xl bg-bedtime/10 flex items-center justify-center shrink-0">
        <Moon size={22} className="text-bedtime" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-base font-semibold text-bedtime">Bedtime</span>
        <div className="mt-0.5">
          <span className="text-sm font-medium text-bedtime">{formatTime(entry.timestampIso)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="w-9 h-9 flex items-center justify-center rounded-full
              text-bedtime/40 hover:text-bedtime hover:bg-bedtime/10 transition-colors"
          >
            <Pencil size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(entry.dayNumber)}
          className="w-9 h-9 flex items-center justify-center rounded-full
            text-bedtime/40 hover:text-danger hover:bg-danger-light transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
