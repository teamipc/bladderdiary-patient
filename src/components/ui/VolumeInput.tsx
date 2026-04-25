'use client';

import { useState, useRef, useEffect } from 'react';

interface VolumeInputProps {
  value: number;
  onChange: (value: number) => void;
  onEditingChange?: (editing: boolean) => void;
  unit?: 'mL' | 'oz';
  min?: number;
  max?: number;
  step?: number;
  variant?: 'default' | 'drink' | 'night';
}

export default function VolumeInput({
  value,
  onChange,
  onEditingChange,
  unit = 'mL',
  min = 0,
  max = 1500,
  step = 25,
  variant = 'default',
}: VolumeInputProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTapNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(String(value));
    setIsEditing(true);
    onEditingChange?.(true);
  };

  const commitEdit = () => {
    const parsed = parseInt(editValue);
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setIsEditing(false);
      onEditingChange?.(false);
    }
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Large tappable value display */}
      <div className="text-center py-1">
        {isEditing ? (
          <div
            className="inline-flex items-baseline gap-1.5"
            onPointerUp={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              className={`w-32 text-4xl font-bold text-ipc-950 tabular-nums text-center
                bg-white/50 backdrop-blur-sm border-2 rounded-xl py-1
                outline-none transition-all text-[16px] sm:text-4xl ${
                  variant === 'night'
                    ? 'border-indigo-400/40 focus:border-indigo-500'
                    : variant === 'drink'
                    ? 'border-drink/40 focus:border-drink'
                    : 'border-ipc-300 focus:border-ipc-500'
                }`}
              style={{ fontSize: '2.25rem' }}
            />
            <span className={`text-lg font-medium ${variant === 'night' ? 'text-indigo-500' : variant === 'drink' ? 'text-drink' : 'text-ipc-400'}`}>{unit}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleTapNumber}
            className="inline-flex items-baseline gap-1 active:scale-[0.97] transition-transform"
          >
            <span className="text-4xl font-bold text-ipc-950 tabular-nums">
              {value}
            </span>
            <span className={`text-lg font-medium ${variant === 'night' ? 'text-indigo-500' : variant === 'drink' ? 'text-drink' : 'text-ipc-400'}`}>{unit}</span>
          </button>
        )}
      </div>

      {/* Slider */}
      <div className="px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className={`${variant === 'night' ? 'volume-slider-night' : variant === 'drink' ? 'volume-slider-drink' : 'volume-slider'} w-full`}
          aria-label={`Volume in ${unit}`}
          style={{
            '--slider-progress': `${percentage}%`,
          } as React.CSSProperties}
        />
      </div>

    </div>
  );
}
