'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'My Flow Check' }: HeaderProps) {
  const router = useRouter();

  const handleHomeClick = () => {
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-ipc-100">
      <div className="max-w-lg mx-auto flex items-center justify-start px-4 h-14">
        <button
          type="button"
          onClick={handleHomeClick}
          className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
        >
          <Image src="/app-logo.png" alt="My Flow Check" width={36} height={36} className="rounded" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-lg font-bold text-ipc-900 tracking-tight">
              {title}
            </span>
            <span className="flex items-center gap-1 -mt-0.5">
              <Image src="/ipc-logo.png" alt="IPC" width={10} height={10} />
              <span className="text-[10px] text-ipc-400">Powered by IPC</span>
            </span>
          </div>
        </button>
      </div>
    </header>
  );
}
