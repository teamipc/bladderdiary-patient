'use client';

import { useState, useCallback } from 'react';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import DrinkTypePicker from '@/components/diary/DrinkTypePicker';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { nowRounded } from '@/lib/utils';
import type { DrinkType } from '@/lib/types';

interface LogDrinkFormProps {
  onSave: () => void;
}

export default function LogDrinkForm({ onSave }: LogDrinkFormProps) {
  const { addDrink } = useDiaryStore();
  const [drinkType, setDrinkType] = useState<DrinkType>('water');
  const [volume, setVolume] = useState(250);
  const [time, setTime] = useState(nowRounded());
  const [note, setNote] = useState('');

  const handleSave = useCallback(() => {
    if (volume <= 0) return;

    addDrink({
      timestampIso: time,
      volumeMl: volume,
      drinkType,
      note,
    });
    onSave();
  }, [volume, drinkType, time, note, addDrink, onSave]);

  return (
    <div className="space-y-5">
      <DrinkTypePicker value={drinkType} onChange={setDrinkType} />

      <VolumeInput value={volume} onChange={setVolume} />

      <TimePicker value={time} onChange={setTime} />

      {/* Note */}
      <div className="space-y-1.5">
        <label className="block text-base font-medium text-ipc-800">
          Note <span className="text-ipc-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., With lunch"
          className="w-full px-4 py-3 rounded-2xl border-2 border-ipc-200
            focus:border-ipc-500 focus:ring-2 focus:ring-ipc-200
            outline-none transition-all bg-white text-ipc-950"
        />
      </div>

      <Button onClick={handleSave} fullWidth disabled={volume <= 0}>
        Save Drink
      </Button>
    </div>
  );
}
