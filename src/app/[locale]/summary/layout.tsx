import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function SummaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
