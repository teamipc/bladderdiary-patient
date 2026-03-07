'use client';

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'Bladder Diary' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-ipc-100">
      <div className="max-w-lg mx-auto flex items-center justify-center px-4 h-14">
        <h1 className="text-lg font-bold text-ipc-900 tracking-tight">
          {title}
        </h1>
      </div>
    </header>
  );
}
