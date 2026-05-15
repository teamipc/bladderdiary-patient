import type { Metadata } from 'next';

import Container from '@/components/layout/Container';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Container variant="default" as="div" className="pt-4">
      {children}
    </Container>
  );
}
