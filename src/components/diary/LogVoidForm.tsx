'use client';

import { useState, useCallback } from 'react';
import VolumeInput from '@/components/ui/VolumeInput';
import TimePicker from '@/components/ui/TimePicker';
import SensationPicker from '@/components/diary/SensationPicker';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { nowRounded, getDayNumber } from '@/lib/utils';
import type { BladderSensation } from '@/lib/types';

interface LogVoidFormProps {
  onSave: () => void;
  dayNumber: number;
}

export default function LogVoidForm({ onSave, dayNumber }: LogVoidFormProps) {
  const { addVoid, startDate, getVoidsForDay } = useDiaryStore();
  const [volume, setVolume] = useState(250);
  const [sensation, setSensation] = useState<BladderSensation>(2);
  const [time, setTime] = useState(nowRounded());
  const [note, setNote] = useState('');

  const existingVoids = getVoidsForDay(dayNumber);
  const isFirstVoid = existingVoids.length === 0;

  const handleSave = useCallback(() => {
    if (volume <= 0) return;

    addVoid({
      timestampIso: time,
      volumeMl: volume,
      sensation,
      note,
      isFirstMorningVoid: isFirstVoid,
    });
    onSave();
  }, [volume, sensation, time, note, isFirstVoid, addVoid, onSave]);

  return (
    <div className="space-y-5">
      <VolumeInput value={volume} onChange={setVolume} />

      <SensationPicker value={sensation} onChange={setSensation} />

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
          placeholder="e.g., Leaked a little"
          className="w-full px-4 py-3 rounded-2xl border-2 border-ipc-200
            focus:border-ipc-500 focus:ring-2 focus:ring-ipc-200
            outline-none transition-all bg-white text-ipc-950"
        />
      </div>

      {/* First morning void hint */}
      {isFirstVoid && (
        <p className="text-sm text-ipc-600 bg-ipc-50 px-3 py-2 rounded-xl">
          ✨ This will be marked as your first morning void
        </p>
      )}

      <Button onClick={handleSave} fullWidth disabled={volume <= 0}>
        Save Void
      </Button>
    </div>
  );
}
