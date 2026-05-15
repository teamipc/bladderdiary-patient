import type { ElementType, ReactNode } from 'react';

/**
 * Container — server-component-safe layout primitive.
 *
 * Owns geometry only: max-width, horizontal padding, horizontal centering.
 * Vertical rhythm (pt-* / pb-*) is the caller's responsibility, layered via
 * the `className` prop which is APPENDED to the variant class string.
 *
 * No client directive. No hooks. No runtime React import. Works in both server
 * and client component trees so downstream phases (6 and 7) can adopt it for
 * form sheets and summary surfaces alike.
 *
 * Variants (from UI-SPEC §"Class strings per variant"):
 * - narrow  (max-w-2xl, ~672px) single-column form/onboarding/footer content
 * - default (max-w-3xl, ~768px) day timeline content, button grids, summary cards
 * - wide    (max-w-5xl, ~1024px) summary metric grids, /learn hub, Header chrome inner
 * - full    (no max-w)         chrome bands that span viewport width (Header/Footer/TopNav band)
 *
 * Direction-neutral: every property used (mx-auto, max-w-*, horizontal px-*)
 * works identically in LTR and RTL — no logical-property substitution needed.
 *
 * Padding override pattern (Open Questions Q1/Q2):
 *   <Container variant="narrow" noPadding className="px-6 sm:px-6">
 *
 * `noPadding` STRIPS the variant's `px-*` classes entirely so the caller's
 * padding wins deterministically. Tailwind 4's utility ordering is internal
 * canonical (NOT class-string order), so appending `px-6 sm:px-6` after a
 * variant's `px-4 sm:px-6` does NOT reliably override — `noPadding` removes
 * the variant padding so the override is unambiguous.
 */

export type ContainerVariant = 'narrow' | 'default' | 'wide' | 'full';
export type ContainerAs = 'div' | 'section' | 'main' | 'article' | 'header' | 'footer' | 'nav';

interface ContainerProps {
  variant?: ContainerVariant;
  as?: ContainerAs;
  noPadding?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ContainerVariant, string> = {
  narrow: 'mx-auto w-full max-w-2xl px-4 sm:px-6',
  default: 'mx-auto w-full max-w-3xl px-4 sm:px-6',
  wide: 'mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8',
  full: 'w-full px-4 sm:px-6 lg:px-8 xl:px-10',
};

const VARIANT_CLASSES_NO_PADDING: Record<ContainerVariant, string> = {
  narrow: 'mx-auto w-full max-w-2xl',
  default: 'mx-auto w-full max-w-3xl',
  wide: 'mx-auto w-full max-w-5xl',
  full: 'w-full',
};

export default function Container({
  variant = 'default',
  as = 'div',
  noPadding = false,
  className = '',
  children,
}: ContainerProps) {
  const variantClasses = noPadding ? VARIANT_CLASSES_NO_PADDING[variant] : VARIANT_CLASSES[variant];
  const classes = `${variantClasses} ${className}`.trim();
  const Tag = as as ElementType;
  return <Tag className={classes}>{children}</Tag>;
}
