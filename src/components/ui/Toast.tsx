'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center animate-fade-slide-up">
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-ipc-950 text-white
        shadow-lg max-w-sm w-full">
        <CheckCircle2 size={20} className="text-success shrink-0" />
        <span className="text-base font-medium flex-1">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
