import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-xl mx-auto w-full px-4 pt-4">
      {children}
    </div>
  );
}
