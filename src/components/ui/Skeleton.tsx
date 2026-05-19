'use client';

import { useTranslations } from 'next-intl';

interface SkeletonProps {
  /** Visual variant. Default 'text'. */
  variant?: 'text' | 'card' | 'metric';
  /** Additional Tailwind classes merged with the variant base. */
  className?: string;
  /** Custom screen-reader label. Default: localized 'Loading'. */
  'aria-label'?: string;
}

/**
 * Generic skeleton placeholder for loading states.
 *
 * Renders a div with a subtle linear-gradient shimmer animation
 * (.animate-skeleton-shimmer; see src/app/globals.css). Three size
 * variants:
 *   - `text` (default): h-4 w-32. Single short line for label/value
 *     placeholders.
 *   - `card`: h-32 w-full. Full-width block for article hero or large
 *     cards.
 *   - `metric`: h-16 w-full. Sized to match an IpcMetricsBlock tile.
 *
 * Accessibility:
 *   - role='status' + aria-busy='true' announce the loading state to
 *     screen readers.
 *   - A visually-hidden span with localized 'Loading' text (or the
 *     consumer's custom aria-label) is the SR-readable label.
 *
 * Reduced-motion handling:
 *   - The .animate-skeleton-shimmer utility includes an explicit
 *     prefers-reduced-motion override that replaces the gradient with
 *     solid --color-ipc-100 and disables the animation. Reduced-motion
 *     users see a static placeholder rectangle.
 *
 * Phase 17 MOT-05.
 */
export default function Skeleton({
  variant = 'text',
  className = '',
  'aria-label': ariaLabel,
}: SkeletonProps) {
  const t = useTranslations('common');
  const label = ariaLabel ?? t('loading');

  const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
    text: 'h-4 w-32 rounded',
    card: 'h-32 w-full rounded-2xl',
    metric: 'h-16 w-full rounded-2xl',
  };

  const baseClass = `${variantClasses[variant]} animate-skeleton-shimmer`;
  const mergedClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div role="status" aria-busy="true" className={mergedClass}>
      <span className="sr-only">{label}</span>
    </div>
  );
}
