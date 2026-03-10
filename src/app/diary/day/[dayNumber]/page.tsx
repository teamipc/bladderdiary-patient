import { Suspense } from 'react';
import DayPageClient from './DayPageClient';

// Required for static export with output: 'export'
export function generateStaticParams() {
  return [
    { dayNumber: '1' },
    { dayNumber: '2' },
    { dayNumber: '3' },
  ];
}

export default function DayPage() {
  return (
    <Suspense>
      <DayPageClient />
    </Suspense>
  );
}
