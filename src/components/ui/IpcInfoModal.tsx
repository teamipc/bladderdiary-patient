'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import BottomSheet from './BottomSheet';

interface IpcInfoModalProps {
  children: React.ReactNode;
}

/**
 * Wraps any "Powered by IPC" element to make it clickable
 * and show a small info modal about IPC.
 *
 * Uses a portal so the BottomSheet escapes any parent
 * containing blocks (e.g. header with backdrop-blur).
 */
export default function IpcInfoModal({ children }: IpcInfoModalProps) {
  const t = useTranslations('ipcModal');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const modal = (
    <BottomSheet open={open} onClose={() => setOpen(false)}>
      <div className="flex flex-col items-center text-center pt-1 pb-2">
        <div className="w-14 h-14 rounded-2xl bg-ipc-50 flex items-center justify-center mb-4">
          <Image src="/ipc-logo.png" alt="IPC" width={32} height={32} />
        </div>

        <h3 className="text-lg font-bold text-ipc-950 mb-1">
          {t('title')}
        </h3>

        <p className="text-sm text-ipc-500 leading-relaxed mb-4 max-w-xs">
          {t('description')}
        </p>

        <a
          href="https://ipc.health"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm
            font-semibold bg-ipc-600 text-white active:scale-[0.97] transition-all"
        >
          {t('learnMore')}
        </a>

        <p className="text-[11px] text-ipc-400 mt-3">
          {t('coursesNote')}
        </p>
      </div>
    </BottomSheet>
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center active:opacity-70 transition-opacity"
      >
        {children}
      </button>

      {mounted && createPortal(modal, document.body)}
    </>
  );
}
