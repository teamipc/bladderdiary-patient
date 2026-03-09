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
        How strong was the urge?
      </label>

      {/* Pill buttons */}
      <div className="flex gap-1.5">
        {sensations.map((s) => {
          const selected = value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={`flex-1 py-2.5 rounded-xl text-center transition-all
                active:scale-[0.95] min-h-[44px] ${
                  selected
                    ? 'bg-ipc-500/90 text-white font-bold'
                    : 'bg-white/40 text-ipc-600 font-medium border border-ipc-100/50'
                }`}
            >
              <span className="text-xs leading-tight block">
                {SENSATION_LABELS[s].short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
