'use client';

import { DRINK_TYPES } from '@/lib/constants';
import type { DrinkType } from '@/lib/types';

interface DrinkTypePickerProps {
  value: DrinkType;
  onChange: (value: DrinkType) => void;
}

export default function DrinkTypePicker({ value, onChange }: DrinkTypePickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-base font-medium text-ipc-800">
        What did you drink?
      </label>
      <div className="grid grid-cols-4 gap-2">
        {DRINK_TYPES.map((drink) => {
          const selected = value === drink.value;
          return (
            <button
              key={drink.value}
              type="button"
              onClick={() => onChange(drink.value)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl
                transition-all active:scale-[0.95] min-h-[68px] ${
                  selected
                    ? 'bg-drink text-white ring-2 ring-drink/30'
                    : 'bg-ipc-50 text-ipc-700 hover:bg-ipc-100 border border-ipc-100'
                }`}
            >
              <span className="text-2xl">{drink.emoji}</span>
              <span className="text-xs font-semibold leading-tight">{drink.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
