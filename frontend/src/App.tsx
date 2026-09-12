import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { DriverView } from './views/DriverView';
import { OperatorView } from './views/OperatorView';
import DigitalSerenity from './components/ui/digital-serenity-animated-landing-page';
import { useLiveUpdates } from './hooks/useLiveUpdates';
import { PlanChangedToast } from './components/PlanChangedToast';
import { PlanChangedEvent } from './types';
import BackgroundSnippets from './components/ui/background-snippets';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'landing' | 'driver' | 'operator'>('landing');

  const showPlanChangedToast = (event: PlanChangedEvent) => {
    toast.custom(
      (t) => <PlanChangedToast event={event} onDismiss={() => toast.dismiss(t)} />,
      { duration: 6000 }
    );
  };

  const { isConnected, emitMockPlanChange } = useLiveUpdates((event) => {
    showPlanChangedToast(event);
  });

  const handleTriggerSimDrop = () => {
    window.dispatchEvent(
      new CustomEvent('voltwise:ripple', {
        detail: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 }
      })
    );

    // Guaranteed fallback: If WebSocket is offline or hasn't pushed an event within 600ms, fire mock toast
    setTimeout(() => {
      if (!isConnected) {
        emitMockPlanChange();
      }
    }, 600);
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
