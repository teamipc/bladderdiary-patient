'use client';

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
  const selectedTrigger = value ? LEAK_TRIGGERS.find((t) => t.value === value) : null;

  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5">
        {LEAK_TRIGGERS.map((t) => {
          const selected = value === t.value;
          const Icon = ICON_MAP[t.icon];
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(selected ? null : t.value)}
              className={`flex flex-col items-center gap-1 py-2 px-1.5 rounded-xl
                transition-all active:scale-[0.95] ${
                  selected
                    ? 'bg-leak text-white ring-2 ring-leak/30 shadow-sm'
                    : 'bg-white/50 text-ipc-950 hover:bg-white/70 border border-ipc-200/40'
                }`}
            >
              <Icon
                size={20}
                className={selected ? 'text-white' : 'text-leak'}
              />
              <span className="text-[11px] font-bold leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Description shown when a trigger is selected */}
      {selectedTrigger && (
        <p className="text-sm text-leak font-medium text-center mt-2.5 animate-fade-slide-up">
          {selectedTrigger.description}
        </p>
      )}
    </div>
  );
}
