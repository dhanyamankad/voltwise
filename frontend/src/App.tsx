import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { DriverView } from './views/DriverView';
import { OperatorView } from './views/OperatorView';
import DigitalSerenity from './components/ui/digital-serenity-animated-landing-page';
import { useLiveUpdates } from './hooks/useLiveUpdates';
import { PlanChangedEvent } from './types';
import BackgroundSnippets from './components/ui/background-snippets';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'landing' | 'driver' | 'operator'>('landing');

  const showPlanChangedToast = (event: PlanChangedEvent) => {
    toast.custom(
      (t) => (
        <div className="w-full max-w-md p-4 rounded-2xl bg-[#121721]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_30px_rgba(79,193,201,0.3)] text-slate-100 flex flex-col gap-2 font-sans">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-xl animate-pulse">electric_bolt</span>
              <span className="font-sans text-xs font-bold text-cyan-400 uppercase tracking-wider">
                ⚡ Schedule Plan Updated
              </span>
            </div>
            <button
              onClick={() => toast.dismiss(t)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-sans text-xs text-slate-400 font-medium">Window:</span>
            <span className="font-sans text-xs text-slate-400 line-through">
              {event.old_window.start} – {event.old_window.end}
            </span>
            <span className="material-symbols-outlined text-amber-400 text-xs">arrow_forward</span>
            <span className="font-sans text-sm text-amber-400 font-bold">
              {event.new_window.start} – {event.new_window.end}
            </span>
          </div>

          <p className="font-sans text-xs text-slate-300 leading-relaxed">
            {event.reason}
          </p>
        </div>
      ),
      { duration: 5000 }
    );
  };

  const { emitMockPlanChange } = useLiveUpdates((event) => {
    showPlanChangedToast(event);
  });

  const handleTriggerSimDrop = () => {
    window.dispatchEvent(
      new CustomEvent('voltwise:ripple', {
        detail: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 }
      })
    );

    emitMockPlanChange(
      'session_101',
      'AUTO-RESCHEDULED: Sudden 30% solar drop detected. Session moved to 3:15 PM peak clean window.'
    );
  };

  return (
    <div className="min-h-screen font-sans antialiased bg-[#0D1117] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-400">
      <Toaster position="bottom-right" theme="dark" expand={true} />
      
      {activeView !== 'landing' && (
        <Header activeView={activeView} setActiveView={setActiveView} />
      )}

      {activeView === 'landing' ? (
        <DigitalSerenity
          onNavigateDriver={() => setActiveView('driver')}
          onNavigateOperator={() => setActiveView('operator')}
        />
      ) : (
        <BackgroundSnippets className="min-h-[calc(100vh-4rem)]">
          <main className="max-w-7xl mx-auto px-6 py-8">
            {activeView === 'driver' ? (
              <DriverView />
            ) : (
              <OperatorView onTriggerSimDrop={handleTriggerSimDrop} setActiveView={setActiveView} />
            )}
          </main>
        </BackgroundSnippets>
      )}
    </div>
  );
};

export default App;
