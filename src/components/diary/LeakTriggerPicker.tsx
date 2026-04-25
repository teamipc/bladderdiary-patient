'use client';

import { useTranslations } from 'next-intl';
import { LEAK_TRIGGERS } from '@/lib/constants';
import {
  Wind, Sparkles, Smile, Dumbbell, Activity,
  Footprints, MoreHorizontal, HelpCircle,
} from 'lucide-react';
import type { LeakTrigger } from '@/lib/types';
import type { LeakIconName } from '@/lib/constants';

const ICON_MAP: Record<LeakIconName, React.ComponentType<{ size?: number; className?: string }>> = {
  Wind, Sparkles, Smile, Dumbbell, Activity,
  Footprints, MoreHorizontal, HelpCircle,
};

interface LeakTriggerPickerProps {
  value: LeakTrigger | null;
  onChange: (value: LeakTrigger | null) => void;
}

export default function LeakTriggerPicker({ value, onChange }: LeakTriggerPickerProps) {
  const t = useTranslations('leakTriggers');
  const selectedTrigger = value ? LEAK_TRIGGERS.find((lt) => lt.value === value) : null;

  return (
    <div>
      <div className="grid grid-cols-4 [grid-auto-rows:1fr] gap-2 mt-6">
        {LEAK_TRIGGERS.map((lt) => {
          const selected = value === lt.value;
          const Icon = ICON_MAP[lt.icon];
          return (
            <button
              key={lt.value}
              type="button"
              onClick={() => onChange(selected ? null : lt.value)}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl min-h-[76px]
                transition-all active:scale-[0.95] ${
                  selected
                    ? 'bg-leak text-white ring-2 ring-leak/30 shadow-sm'
                    : 'bg-white text-ipc-950 hover:bg-white border border-ipc-200/50 shadow-sm'
                }`}
            >
              <Icon
                size={22}
                className={selected ? 'text-white' : 'text-leak'}
              />
              <span className="text-xs font-bold leading-tight">{t(`${lt.value}.label`)}</span>
            </button>
          );
        })}
      </div>

      {/* Description shown when a trigger is selected */}
      {selectedTrigger && (
        <p className="text-sm text-leak font-medium text-center mt-2.5 animate-fade-slide-up">
          {t(`${selectedTrigger.value}.description`)}
        </p>
      )}
    </div>
  );
}
