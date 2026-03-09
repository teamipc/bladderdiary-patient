'use client';

import {
  GlassWater,
  Coffee,
  Leaf,
  Citrus,
  CupSoda,
  Wine,
  Milk,
  Droplets,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { DrinkIconName } from '@/lib/constants';

const ICON_MAP: Record<DrinkIconName, React.ComponentType<LucideProps>> = {
  GlassWater,
  Coffee,
  Leaf,
  Citrus,
  CupSoda,
  Wine,
  Milk,
  Droplets,
};

interface DrinkIconProps extends LucideProps {
  name: DrinkIconName;
}

export default function DrinkIcon({ name, ...props }: DrinkIconProps) {
  const Icon = ICON_MAP[name];
  return <Icon {...props} />;
}
