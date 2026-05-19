import type { Metadata } from 'next';

import PageTransitionWrapper from '@/components/layout/PageTransitionWrapper';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// Phase 17 MOT-03 — wrap /summary in the page-to-page transition
// wrapper so navigations into and out of the summary (e.g., Day 3 →
// /summary via the "Finish" CTA, or /summary → /diary/day/N via the
// back link) fade-slide with the same vocabulary as the day-to-day
// navigations. Same wrapper, same keyframe, consistent feel.
export default function SummaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransitionWrapper>{children}</PageTransitionWrapper>;
}
