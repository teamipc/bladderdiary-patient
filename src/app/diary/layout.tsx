export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto w-full px-4 pt-4">
      {children}
    </div>
  );
}
