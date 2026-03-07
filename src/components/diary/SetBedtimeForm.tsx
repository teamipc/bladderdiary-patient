'use client';

import { useState, useCallback } from 'react';
import TimePicker from '@/components/ui/TimePicker';
import Button from '@/components/ui/Button';
import { useDiaryStore } from '@/lib/store';
import { nowRounded } from '@/lib/utils';

interface SetBedtimeFormProps {
  dayNumber: 1 | 2 | 3;
  onSave: () => void;
}

export default function SetBedtimeForm({ dayNumber, onSave }: SetBedtimeFormProps) {
  const { setBedtime, getBedtimeForDay } = useDiaryStore();
  const existing = getBedtimeForDay(dayNumber);
  const [time, setTime] = useState(existing?.timestampIso ?? nowRounded());

  const handleSave = useCallback(() => {
    setBedtime(dayNumber, time);
    onSave();
  }, [dayNumber, time, setBedtime, onSave]);

  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <span className="text-5xl">🌙</span>
        <p className="text-lg font-semibold text-ipc-950 mt-3">
          {existing ? 'Update bedtime' : 'When did you go to bed?'}
        </p>
        <p className="text-base text-ipc-600 mt-1">
          This helps your clinician understand your sleep pattern
        </p>
      </div>

      <TimePicker value={time} onChange={setTime} label="Bedtime" />

      <Button onClick={handleSave} fullWidth>
        {existing ? 'Update Bedtime' : 'Save Bedtime'}
      </Button>
    </div>
  );
}
