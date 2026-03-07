'use client';

import { VOLUME_PRESETS } from '@/lib/constants';

interface VolumeInputProps {
  value: number;
  onChange: (value: number) => void;
  unit?: 'mL' | 'oz';
}

export default function VolumeInput({ value, onChange, unit = 'mL' }: VolumeInputProps) {
  return (
    <div className="space-y-3">
      <label className="block text-base font-medium text-ipc-800">
        Volume ({unit})
      </label>

      {/* Number input */}
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          value={value || ''}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          placeholder="Enter amount"
          className="w-full px-4 py-3.5 text-xl font-semibold text-center rounded-2xl
            border-2 border-ipc-200 focus:border-ipc-500 focus:ring-2 focus:ring-ipc-200
            outline-none transition-all bg-white text-ipc-950"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ipc-500 font-medium">
          {unit}
        </span>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {VOLUME_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`flex-1 py-3 rounded-xl text-base font-semibold transition-all
              active:scale-[0.95] min-h-[48px] ${
                value === preset
                  ? 'bg-ipc-500 text-white'
                  : 'bg-ipc-50 text-ipc-700 hover:bg-ipc-100 border border-ipc-100'
              }`}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
