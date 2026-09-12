import React from 'react';
import { PlanChangedEvent } from '../types';

interface ToastProps {
  event: PlanChangedEvent | null;
  onDismiss: () => void;
}

export const PlanChangedToast: React.FC<ToastProps> = ({ event, onDismiss }) => {
  if (!event) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-in">
      <div className="p-space-md rounded-xl bg-surface-container-high/95 backdrop-blur-xl border border-secondary/40 shadow-[0_0_32px_rgba(76,215,246,0.3)] flex flex-col gap-space-xs text-on-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-headline-sm animate-pulse">
              electric_bolt
            </span>
            <span className="font-label-md text-label-md text-secondary font-bold uppercase tracking-wider">
              ⚡ Schedule Plan Updated
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-body-md">close</span>
          </button>
        </div>

        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-label-sm text-label-sm text-outline">Previous Window:</span>
          <span className="font-label-sm text-label-sm text-on-surface line-through">{event.old_window.start} – {event.old_window.end}</span>
          <span className="material-symbols-outlined text-primary text-body-sm">arrow_forward</span>
          <span className="font-headline-sm text-headline-sm text-primary font-bold">{event.new_window.start} – {event.new_window.end}</span>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          {event.reason}
        </p>

        <div className="flex items-center justify-between text-[11px] text-outline pt-1 border-t border-surface-container-highest/60">
          <span>Session: {event.session_id}</span>
          <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
