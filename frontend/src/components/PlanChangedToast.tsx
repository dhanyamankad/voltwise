import React from 'react';
import { PlanChangedEvent } from '../types';
import { formatDisplayTime } from '../lib/utils';

interface ToastProps {
  event: PlanChangedEvent | null;
  onDismiss: () => void;
}

export const PlanChangedToast: React.FC<ToastProps> = ({ event, onDismiss }) => {
  if (!event) return null;

  return (
    <div className="w-full max-w-md p-4 rounded-2xl bg-[#121721]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.3)] text-slate-100 flex flex-col gap-2 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400 text-xl animate-pulse">electric_bolt</span>
          <span className="font-sans text-xs font-bold text-cyan-400 uppercase tracking-wider">
            ⚡ Schedule Plan Updated
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <div className="flex items-baseline gap-2 pt-1">
        <span className="font-sans text-xs text-slate-400 font-medium">Window:</span>
        <span className="font-sans text-xs text-slate-400 line-through">
          {formatDisplayTime(event.old_window.start)} – {formatDisplayTime(event.old_window.end)}
        </span>
        <span className="material-symbols-outlined text-amber-400 text-xs">arrow_forward</span>
        <span className="font-sans text-sm text-amber-400 font-bold">
          {formatDisplayTime(event.new_window.start)} – {formatDisplayTime(event.new_window.end)}
        </span>
      </div>

      <p className="font-sans text-xs text-slate-300 leading-relaxed">
        {event.reason}
      </p>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/10">
        <span className="font-mono text-slate-400">Session: {event.session_id}</span>
        <span>{formatDisplayTime(event.timestamp)}</span>
      </div>
    </div>
  );
};
