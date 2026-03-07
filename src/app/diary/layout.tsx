import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-36">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
