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
