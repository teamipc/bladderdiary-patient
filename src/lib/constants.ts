import type { DrinkType, BladderSensation } from './types';

export const DRINK_TYPES: readonly { value: DrinkType; label: string; emoji: string }[] = [
  { value: 'water', label: 'Water', emoji: '💧' },
  { value: 'coffee', label: 'Coffee', emoji: '☕' },
  { value: 'tea', label: 'Tea', emoji: '🍵' },
  { value: 'juice', label: 'Juice', emoji: '🧃' },
  { value: 'carbonated', label: 'Soda', emoji: '🥤' },
  { value: 'alcohol', label: 'Alcohol', emoji: '🍷' },
  { value: 'milk', label: 'Milk', emoji: '🥛' },
  { value: 'other', label: 'Other', emoji: '🫗' },
] as const;

export const SENSATION_LABELS: Record<BladderSensation, { short: string; description: string }> = {
  0: { short: 'None', description: 'No sensation' },
  1: { short: 'First', description: 'First awareness' },
  2: { short: 'Normal', description: 'Normal desire' },
  3: { short: 'Strong', description: 'Strong desire' },
  4: { short: 'Urgent', description: 'Urgency / leak' },
};

export const VOLUME_PRESETS = [150, 250, 350, 500] as const;

export function getDrinkLabel(type: DrinkType): string {
  return DRINK_TYPES.find((d) => d.value === type)?.label ?? 'Other';
}

export function getDrinkEmoji(type: DrinkType): string {
  return DRINK_TYPES.find((d) => d.value === type)?.emoji ?? '🫗';
}
