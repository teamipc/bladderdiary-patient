'use client';

import { useTranslations } from 'next-intl';
import { DRINK_TYPES } from '@/lib/constants';
import DrinkIcon from '@/components/ui/DrinkIcon';
import type { DrinkType } from '@/lib/types';

interface DrinkTypePickerProps {
  value: DrinkType;
  onChange: (value: DrinkType) => void;
}

export default function DrinkTypePicker({ value, onChange }: DrinkTypePickerProps) {
  const t = useTranslations('drinkTypes');
  return (
    <div className="grid grid-cols-4 [grid-auto-rows:1fr] gap-2 mt-8">
      {DRINK_TYPES.map((drink) => {
        const selected = value === drink.value;
        return (
          <button
            key={drink.value}
            type="button"
            onClick={() => onChange(drink.value)}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl
              transition-all active:scale-[0.95] ${
                selected
                  ? 'bg-drink text-white ring-2 ring-drink/30 shadow-sm'
                  : 'bg-white text-ipc-950 hover:bg-white border border-ipc-200/50 shadow-sm'
              }`}
          >
            <DrinkIcon
              name={drink.icon}
              size={20}
              className={selected ? 'text-white' : 'text-drink'}
            />
            <span className="text-xs font-bold leading-tight">{t(drink.value)}</span>
          </button>
        );
      })}
    </div>
  );
}
