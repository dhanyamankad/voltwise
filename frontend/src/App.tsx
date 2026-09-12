import React, { useState, useCallback, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { DriverView } from './views/DriverView';
import { OperatorView } from './views/OperatorView';
import DigitalSerenity from './components/ui/digital-serenity-animated-landing-page';
import { useLiveUpdates } from './hooks/useLiveUpdates';
import { PlanChangedToast } from './components/PlanChangedToast';
import { PlanChangedEvent } from './types';
import BackgroundSnippets from './components/ui/background-snippets';
import { fetchSchedule } from './api/client';
import { calculateRenewableBreakdown } from './lib/utils';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'landing' | 'driver' | 'operator'>('landing');

  const showPlanChangedToast = useCallback((event: PlanChangedEvent) => {
    toast.custom(
      (t) => <PlanChangedToast event={event} onDismiss={() => toast.dismiss(t)} />,
      { duration: 6000 }
    );
  }, []);

  const { isConnected } = useLiveUpdates(showPlanChangedToast);

  const handleTriggerSimDrop = () => {
    window.dispatchEvent(
      new CustomEvent('voltwise:ripple', {
        detail: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 }
      })
    );
  };

  const [energyMix, setEnergyMix] = useState<{ solarPct: number; windPct: number }>({ solarPct: 52, windPct: 32 });

  useEffect(() => {
    const updateMix = async () => {
      try {
        const sched = await fetchSchedule();
        if (sched?.current_signal) {
          const breakdown = calculateRenewableBreakdown(sched.current_signal.renewable_score, sched.current_signal);
          setEnergyMix({ solarPct: breakdown.solarScore, windPct: breakdown.windScore });
        }
      } catch (err) {
        console.warn('[App] Could not fetch live header mix:', err);
      }
    };
    updateMix();
    window.addEventListener('voltwise:state_update', updateMix);
    return () => window.removeEventListener('voltwise:state_update', updateMix);
  }, []);

  return (
    <div className="min-h-screen font-sans antialiased bg-[#0D1117] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-400">
      <Toaster position="bottom-right" theme="dark" expand={true} />
      
      {activeView !== 'landing' && (
        <Header activeView={activeView} setActiveView={setActiveView} solarPct={energyMix.solarPct} windPct={energyMix.windPct} />
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
