'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-danger text-white active:scale-[0.97]'
      : 'bg-ipc-500 text-white active:scale-[0.97]';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 backdrop-dim" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl mx-6 p-6 max-w-sm w-full animate-scale-in">
        <div className="text-center">
          <AlertTriangle
            size={36}
            className={variant === 'danger' ? 'text-danger mx-auto mb-3' : 'text-ipc-500 mx-auto mb-3'}
          />
          <h3 className="text-lg font-bold text-ipc-950 mb-1 text-balance">{title}</h3>
          {message && <p className="text-sm text-ipc-600 mb-5 text-balance">{message}</p>}
          {!message && <div className="mb-5" />}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 min-h-[48px] px-4 rounded-xl font-semibold text-base bg-ipc-50 text-ipc-800 border border-ipc-200 active:scale-[0.97] transition-all"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={onConfirm}
              className={`flex-1 min-h-[48px] px-4 rounded-xl font-semibold text-base transition-all ${confirmClass}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
