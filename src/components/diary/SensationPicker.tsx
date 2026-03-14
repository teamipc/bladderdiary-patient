'use client';

import { useTranslations } from 'next-intl';
import type { BladderSensation } from '@/lib/types';

interface SensationPickerProps {
  value: BladderSensation | null;
  onChange: (value: BladderSensation | null) => void;
}

const sensations: BladderSensation[] = [0, 1, 2, 3, 4];

export default function SensationPicker({ value, onChange }: SensationPickerProps) {
  const t = useTranslations('sensations');
  return (
    <div className="space-y-2">
      <label className="block text-base font-medium text-ipc-800 px-10 text-center">
        {t('label')}
      </label>

      {/* Pill buttons */}
      <div className="flex gap-2 mt-2">
        {sensations.map((s) => {
          const selected = value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(selected ? null : s)}
              className={`flex-1 py-3.5 rounded-xl text-center transition-all
                active:scale-[0.95] min-h-[52px] ${
                  selected
                    ? 'bg-ipc-500/90 text-white font-bold'
                    : 'bg-white/40 text-ipc-600 font-medium border border-ipc-100/50'
                }`}
            >
              <span className="text-base leading-tight block font-semibold">{s}</span>
              <span className="text-xs leading-tight block mt-1">
                {t(`${s}.short`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
