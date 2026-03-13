import type { DrinkType, BladderSensation, LeakTrigger, LeakAmount } from './types';

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
  0: { short: 'No urge', description: 'Went just in case or social reasons' },
  1: { short: 'Mild', description: 'Normal desire, no urgency' },
  2: { short: 'Moderate', description: 'Urgency, but it passed' },
  3: { short: 'Strong', description: 'Urgency, barely made it' },
  4: { short: 'Leaked', description: 'Couldn\'t make it in time' },
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

/* ── Leak triggers ── */

export type LeakIconName =
  | 'Wind'
  | 'Sparkles'
  | 'Smile'
  | 'Dumbbell'
  | 'Activity'
  | 'Footprints'
  | 'MoreHorizontal'
  | 'HelpCircle';

export const LEAK_TRIGGERS: readonly { value: LeakTrigger; label: string; icon: LeakIconName }[] = [
  { value: 'cough', label: 'Coughing', icon: 'Wind' },
  { value: 'sneeze', label: 'Sneezing', icon: 'Sparkles' },
  { value: 'laugh', label: 'Laughing', icon: 'Smile' },
  { value: 'lifting', label: 'Lifting', icon: 'Dumbbell' },
  { value: 'exercise', label: 'Exercise', icon: 'Activity' },
  { value: 'toilet_way', label: 'On the way', icon: 'Footprints' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
  { value: 'not_sure', label: 'Not sure', icon: 'HelpCircle' },
] as const;

export const LEAK_AMOUNT_OPTIONS: readonly { value: LeakAmount; label: string }[] = [
  { value: 'drops', label: 'Drops' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const;

export function getLeakTriggerLabel(trigger: LeakTrigger): string {
  return LEAK_TRIGGERS.find((t) => t.value === trigger)?.label ?? 'Other';
}

export function getLeakTriggerIconName(trigger: LeakTrigger): LeakIconName {
  return LEAK_TRIGGERS.find((t) => t.value === trigger)?.icon ?? 'MoreHorizontal';
}

export function getLeakAmountLabel(amount: LeakAmount): string {
  return LEAK_AMOUNT_OPTIONS.find((a) => a.value === amount)?.label ?? '';
}
