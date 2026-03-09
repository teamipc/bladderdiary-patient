import type { DrinkType, BladderSensation } from './types';

/** Toggle to enable paid-tier clinical metrics (24HV, NPi, AVV, MVV, etc.). */
export const PREMIUM_FEATURES_ENABLED = false;

export type DrinkIconName =
  | 'GlassWater'
  | 'Coffee'
  | 'Leaf'
  | 'Citrus'
  | 'CupSoda'
  | 'Wine'
  | 'Milk'
  | 'Droplets';

export const DRINK_TYPES: readonly { value: DrinkType; label: string; icon: DrinkIconName }[] = [
  { value: 'water', label: 'Water', icon: 'GlassWater' },
  { value: 'coffee', label: 'Coffee', icon: 'Coffee' },
  { value: 'tea', label: 'Tea', icon: 'Leaf' },
  { value: 'juice', label: 'Juice', icon: 'Citrus' },
  { value: 'carbonated', label: 'Soda', icon: 'CupSoda' },
  { value: 'alcohol', label: 'Alcohol', icon: 'Wine' },
  { value: 'milk', label: 'Milk', icon: 'Milk' },
  { value: 'other', label: 'Other', icon: 'Droplets' },
] as const;

export const SENSATION_LABELS: Record<BladderSensation, { short: string; description: string }> = {
  0: { short: 'Not at all', description: 'Went just in case' },
  1: { short: 'A little', description: 'Slight feeling, nothing urgent' },
  2: { short: 'Normal', description: 'Needed to go, no rush' },
  3: { short: 'Quite a bit', description: 'Hard to hold much longer' },
  4: { short: "Couldn't wait", description: 'Almost didn\'t make it' },
};

export const VOLUME_PRESETS_ML = [150, 250, 350, 500] as const;
export const VOLUME_PRESETS_OZ = [5, 8, 12, 17] as const;

/** Slider/input config per unit. */
export const VOLUME_CONFIG = {
  mL: { presets: VOLUME_PRESETS_ML, default: 250, max: 1000, step: 25 },
  oz: { presets: VOLUME_PRESETS_OZ, default: 8, max: 34, step: 1 },
} as const;

/** @deprecated Use VOLUME_PRESETS_ML instead. */
export const VOLUME_PRESETS = VOLUME_PRESETS_ML;

export function getDrinkLabel(type: DrinkType): string {
  return DRINK_TYPES.find((d) => d.value === type)?.label ?? 'Other';
}

export function getDrinkIconName(type: DrinkType): DrinkIconName {
  return DRINK_TYPES.find((d) => d.value === type)?.icon ?? 'Droplets';
}
