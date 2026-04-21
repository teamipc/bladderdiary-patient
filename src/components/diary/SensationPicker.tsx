'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BladderSensation } from '@/lib/types';

interface SensationPickerProps {
  value: BladderSensation | null;
  onChange: (value: BladderSensation | null) => void;
}

const sensations: BladderSensation[] = [0, 1, 2, 3, 4];

export default function SensationPicker({ value, onChange }: SensationPickerProps) {
  const t = useTranslations('sensations');
  const tc = useTranslations('common');
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1.5 px-10">
        <label className="text-base font-medium text-ipc-800 text-center">
          {t('label')}
        </label>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-label={tc('help')}
          className="text-ipc-400 hover:text-ipc-600 active:scale-[0.9] transition-all"
        >
          <HelpCircle size={15} />
        </button>
      </div>

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

      {/* Per-sensation description — shown when a sensation is selected */}
      {value !== null && !showHelp && (
        <p className="text-sm text-ipc-600 font-medium text-center mt-2.5 animate-fade-slide-up">
          {t(`${value}.description`)}
        </p>
      )}

      {/* Help panel — shows every description so users can understand the
          clinical scale before picking. */}
      {showHelp && (
        <div className="bg-ipc-50 rounded-2xl p-3 mt-2 space-y-1.5 animate-fade-slide-up">
          {sensations.map((s) => (
            <p key={s} className="text-xs text-ipc-700 leading-snug">
              <span className="font-semibold">{s} · {t(`${s}.short`)}</span>{' '}
              <span className="text-ipc-500">{t(`${s}.description`)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
