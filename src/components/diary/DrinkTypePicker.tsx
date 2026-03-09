'use client';

import { DRINK_TYPES } from '@/lib/constants';
import DrinkIcon from '@/components/ui/DrinkIcon';
import type { DrinkType } from '@/lib/types';

interface DrinkTypePickerProps {
  value: DrinkType;
  onChange: (value: DrinkType) => void;
}

export default function DrinkTypePicker({ value, onChange }: DrinkTypePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {DRINK_TYPES.map((drink) => {
        const selected = value === drink.value;
        return (
          <button
            key={drink.value}
            type="button"
            onClick={() => onChange(drink.value)}
            className={`flex flex-col items-center gap-1 py-2 px-1.5 rounded-xl
              transition-all active:scale-[0.95] ${
                selected
                  ? 'bg-drink text-white ring-2 ring-drink/30 shadow-sm'
                  : 'bg-white/50 text-ipc-950 hover:bg-white/70 border border-ipc-200/40'
              }`}
          >
            <DrinkIcon
              name={drink.icon}
              size={20}
              className={selected ? 'text-white' : 'text-drink'}
            />
            <span className="text-[11px] font-bold leading-tight">{drink.label}</span>
          </button>
        );
      })}
    </div>
  );
}
