'use client';

import { useState, useCallback } from 'react';
import { Plus, Droplets, Coffee, Moon, X } from 'lucide-react';

type LogAction = 'void' | 'drink' | 'bedtime';

interface QuickLogFABProps {
  onAction: (action: LogAction) => void;
}

export default function QuickLogFAB({ onAction }: QuickLogFABProps) {
  const [expanded, setExpanded] = useState(false);

  const handleAction = useCallback(
    (action: LogAction) => {
      setExpanded(false);
      onAction(action);
    },
    [onAction],
  );

  return (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 backdrop-dim"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* FAB container */}
      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">
        {/* Action buttons (shown when expanded) */}
        {expanded && (
          <div className="flex flex-col items-end gap-3 animate-fade-slide-up">
            <button
              type="button"
              onClick={() => handleAction('bedtime')}
              className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-bedtime
                text-white shadow-lg active:scale-[0.95] transition-transform"
            >
              <span className="text-base font-semibold">Bedtime</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Moon size={20} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('drink')}
              className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-drink
                text-white shadow-lg active:scale-[0.95] transition-transform"
            >
              <span className="text-base font-semibold">Drink</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Coffee size={20} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleAction('void')}
              className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-void
                text-white shadow-lg active:scale-[0.95] transition-transform"
            >
              <span className="text-base font-semibold">Void</span>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Droplets size={20} />
              </div>
            </button>
          </div>
        )}

        {/* Main FAB button */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center
            transition-all active:scale-[0.9] ${
              expanded
                ? 'bg-ipc-800 rotate-45'
                : 'bg-ipc-500 hover:bg-ipc-600'
            }`}
        >
          {expanded ? (
            <X size={28} className="text-white -rotate-45" />
          ) : (
            <Plus size={28} className="text-white" />
          )}
        </button>
      </div>
    </>
  );
}
