'use client';

import { SENSATION_LABELS } from '@/lib/constants';
import type { BladderSensation } from '@/lib/types';

interface SensationPickerProps {
  value: BladderSensation;
  onChange: (value: BladderSensation) => void;
}

const sensations: BladderSensation[] = [0, 1, 2, 3, 4];

export default function SensationPicker({ value, onChange }: SensationPickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-medium text-ipc-800">
        Bladder sensation
      </label>
      <div className="flex gap-2">
        {sensations.map((s) => {
          const selected = value === s;
          const isUrgent = s === 4;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl
                transition-all active:scale-[0.95] min-h-[72px] ${
                  selected
                    ? isUrgent
                      ? 'bg-danger text-white ring-2 ring-danger/30'
                      : 'bg-ipc-500 text-white ring-2 ring-ipc-300'
                    : 'bg-ipc-50 text-ipc-700 hover:bg-ipc-100 border border-ipc-100'
                }`}
            >
              <span className="text-xl font-bold">{s}</span>
              <span className="text-[11px] font-medium leading-tight text-center">
                {SENSATION_LABELS[s].short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
