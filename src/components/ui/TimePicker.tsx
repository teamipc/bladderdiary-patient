'use client';

import { format, parseISO } from 'date-fns';

interface TimePickerProps {
  value: string; // ISO string
  onChange: (isoString: string) => void;
  label?: string;
}

export default function TimePicker({ value, onChange, label = 'Time' }: TimePickerProps) {
  const date = parseISO(value);
  const timeValue = format(date, 'HH:mm');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(':').map(Number);
    const updated = new Date(date);
    updated.setHours(hours, minutes, 0, 0);
    onChange(updated.toISOString());
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-base font-medium text-ipc-800">{label}</label>
      <input
        type="time"
        value={timeValue}
        onChange={handleChange}
        className="w-full px-4 py-3.5 text-lg font-semibold rounded-2xl
          border-2 border-ipc-200 focus:border-ipc-500 focus:ring-2 focus:ring-ipc-200
          outline-none transition-all bg-white text-ipc-950 text-center"
      />
    </div>
  );
}
