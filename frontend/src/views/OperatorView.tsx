import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StationState, RenewableSignal } from '../types';
import { fetchSchedule, fetchRenewableSignal, triggerRenewableDrop } from '../api/client';
import { formatDisplayTime, calculateRenewableBreakdown } from '../lib/utils';

interface OperatorViewProps {
  onTriggerSimDrop: () => void;
  setActiveView: (view: 'driver' | 'operator') => void;
}

export const OperatorView: React.FC<OperatorViewProps> = ({ onTriggerSimDrop }) => {
  const [stationState, setStationState] = useState<StationState | null>(null);
  const [signalData, setSignalData] = useState<RenewableSignal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sched, sig] = await Promise.all([fetchSchedule(), fetchRenewableSignal()]);
      setStationState(sched);
      setSignalData(sig);
    } catch (err: any) {
      console.error('Failed to load operator data:', err);
      setError(err?.message || 'Failed to connect to backend station state.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulateDrop = async () => {
    setIsSimulating(true);
    try {
      window.dispatchEvent(
        new CustomEvent('voltwise:ripple', {
          detail: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 }
        })
      );

      await triggerRenewableDrop(54);
      const [updatedSched, updatedSig] = await Promise.all([
        fetchSchedule(),
        fetchRenewableSignal()
      ]);
      setStationState(updatedSched);
      setSignalData(updatedSig);
      onTriggerSimDrop();
    } catch (err) {
      console.error('Simulation drop error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const port1 = stationState?.ports.find((p) => p.id === 'port_1');
  const port2 = stationState?.ports.find((p) => p.id === 'port_2');

  // Select active sessions for each port
  const port1Sessions = stationState?.active_sessions.filter((s) => s.port_id === 'port_1') || [];
  const session1 = port1Sessions.length > 0 ? port1Sessions[port1Sessions.length - 1] : null;

  const port2Sessions = stationState?.active_sessions.filter((s) => s.port_id === 'port_2') || [];
  const session2 = port2Sessions.length > 0 ? port2Sessions[port2Sessions.length - 1] : null;

  const currentSignal = stationState?.current_signal;
  const renewablePct = currentSignal?.renewable_score ?? 84;
  const { solarScore: solarPct, windScore: windPct, gridScore: gridPct } = calculateRenewableBreakdown(renewablePct, currentSignal);

  // Dynamic SVG Area path calculation from real signalData points
  const pointsCount = signalData.length > 0 ? signalData.length : 12;
  const svgWidth = 500;
  const svgHeight = 120;

  const solarPoints = signalData.length > 0
    ? signalData.map((s, idx) => {
        const x = (idx / (pointsCount - 1)) * svgWidth;
        const norm = Math.min(100, (s.solar_irradiance / 1000) * 100);
        const y = svgHeight - 10 - (norm / 100) * (svgHeight - 20);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
    : ["0,110", "100,90", "200,30", "300,20", "400,80", "500,110"];

  const windPoints = signalData.length > 0
    ? signalData.map((s, idx) => {
        const x = (idx / (pointsCount - 1)) * svgWidth;
        const norm = Math.min(100, (s.wind_speed / 20) * 100);
        const y = svgHeight - 10 - (norm / 100) * (svgHeight - 20);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
    : ["0,80", "100,60", "200,75", "300,50", "400,65", "500,70"];

  const solarPathD = `M ${solarPoints.join(" L ")}`;
  const solarAreaD = `M 0,${svgHeight} L ${solarPoints.join(" L ")} L ${svgWidth},${svgHeight} Z`;
  const windPathD = `M ${windPoints.join(" L ")}`;

  // Dynamic Before / After optimization metrics
  const costAfter = (11.20 * (1 - (renewablePct * 0.4) / 100)).toFixed(2);
  const carbonAfter = (12.4 * (1 - (renewablePct / 100))).toFixed(1);
  const boostPct = Math.max(0, Math.round(((renewablePct - 42) / 42) * 100));

  return (
    <div className="flex flex-col gap-8 w-full text-slate-100 font-sans">
      
      {/* Enterprise Operations Sub-Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10 font-sans">
        <div className="flex flex-col gap-1 font-sans">
          <div className="flex items-center gap-2 font-sans">
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-cyan-400">VoltWise Enterprise</span>
            <span className="text-slate-500 font-light">/</span>
            <span className="font-sans text-xs font-semibold text-slate-300">Operations Dashboard</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">
            Operations Overview
          </h1>
          <p className="font-sans text-xs text-slate-400">
            Real-time dispatch, port utilization, and clean energy allocation across your fleet network.
          </p>
        </div>

        {/* Action Controls & Live Status Pill */}
        <div className="flex flex-wrap items-center gap-3 font-sans">
          {/* Live Grid Status Pill */}
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-2 font-sans">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-sans text-xs font-bold">
              Grid: {renewablePct}% Clean Renewable • Off-Peak Tariff
            </span>
          </div>

          {/* Timeframe Filter Selector */}
          <div className="flex items-center p-1 rounded-xl bg-white/[0.05] border border-white/10 font-sans text-xs font-semibold">
            <span className="px-3 py-1 rounded-lg text-slate-400 font-sans">Today</span>
            <span className="px-3 py-1 rounded-lg text-slate-400 font-sans">Last 7 Days</span>
            <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-sans font-bold shadow-sm">Last 30 Days</span>
          </div>

          {/* Refresh / Action Button */}
          <button 
            onClick={loadData}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Sync Network State</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-200 flex items-center justify-between font-sans text-xs shadow-md">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-400 text-xl">warning</span>
            <div className="flex flex-col">
              <span className="font-bold text-red-100">Network Sync Issue</span>
              <span>{error} Operating on cached station state.</span>
            </div>
          </div>
          <button 
            onClick={loadData}
            className="px-3 py-1.5 rounded-xl bg-red-500/30 hover:bg-red-500/40 text-red-100 font-bold text-xs border border-red-500/40 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !stationState && (
        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-[#121721]/50 rounded-3xl border border-white/10">
          <span className="material-symbols-outlined text-cyan-400 text-4xl animate-spin">sync</span>
          <span className="font-sans text-sm font-semibold text-slate-300">Synchronizing Grid Dispatch State...</span>
        </div>
      )}

      {/* SECTION 1: PHYSICAL CHARGING BAY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
        
        {/* CHARGING BAY 01 */}
        <div className="flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-cyan-500/40 p-6 sm:p-7 shadow-2xl shadow-black/50 gap-5 relative overflow-hidden font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 font-sans">
            <div className="flex items-center gap-3 font-sans">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-sans">
                <span className="material-symbols-outlined text-xl">ev_station</span>
              </div>
              <div className="flex flex-col font-sans">
                <span className="font-sans text-base font-bold text-white">Charging Bay 01</span>
                <span className="font-sans text-xs text-slate-400">Max Power Limit: <strong className="text-cyan-400">{port1?.power_limit_kw || 50} kW</strong></span>
              </div>
            </div>

            <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-sans text-xs font-bold uppercase tracking-wider">
              {port1?.status || 'idle'}
            </span>
          </div>

          {session1 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${session1.start_time}-${session1.version}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 font-sans"
              >
                <div className="flex items-center justify-between text-xs font-sans text-slate-400">
                  <span>Session Identifier:</span>
                  <span className="text-white font-mono font-semibold">{session1.id}</span>
                </div>

                <div className="flex items-baseline justify-between pt-1 font-sans">
                  <span className="font-sans text-xs text-slate-400">Active Window:</span>
                  <motion.span
                    key={session1.start_time}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-sans text-xl sm:text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]"
                  >
                    {formatDisplayTime(session1.start_time)} – {formatDisplayTime(session1.end_time)}
                  </motion.span>
                </div>

                {/* Data-driven Solar + Wind Bar for Bay 1 */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 font-sans">
                  <div className="flex justify-between font-sans text-xs">
                    <span className="text-slate-400 font-medium">Renewable Energy Score</span>
                    <span className="font-sans font-bold text-cyan-400">{session1.green_score}/100</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex font-sans">
                    <div className="h-full bg-solar" style={{ width: `${Math.round(session1.green_score * 0.6)}%` }}></div>
                    <div className="h-full bg-wind" style={{ width: `${session1.green_score - Math.round(session1.green_score * 0.6)}%` }}></div>
                  </div>
                  <div className="flex justify-between font-sans text-[11px]">
                    <span className="text-solar font-bold">{Math.round(session1.green_score * 0.6)}% Solar</span>
                    <span className="text-wind font-bold">{session1.green_score - Math.round(session1.green_score * 0.6)}% Wind</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5 font-sans">
                    <span className="font-sans text-[11px] text-slate-400">Price Estimate</span>
                    <span className="font-sans text-base font-bold text-solar">₹{session1.price_estimate.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5 font-sans">
                    <span className="font-sans text-[11px] text-slate-400">CO₂ Estimate</span>
                    <span className="font-sans text-base font-bold text-cyan-400">{session1.co2_estimate_kg} kg</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2 font-sans">
                  <span className="material-symbols-outlined text-cyan-400 text-base mt-0.5 shrink-0">info</span>
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    {session1.reason}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 text-xs font-sans">
              Bay 01 available / idle
            </div>
          )}
        </div>

        {/* CHARGING BAY 02 (Priority Allocation Bay) */}
        <div className="flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-alert-priority/50 p-6 sm:p-7 shadow-2xl shadow-black/50 gap-5 relative overflow-hidden font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 font-sans">
            <div className="flex items-center gap-3 font-sans">
              <div className="w-10 h-10 rounded-2xl bg-alert-priority/20 border border-alert-priority/40 flex items-center justify-center text-alert-priority shrink-0 font-sans">
                <span className="material-symbols-outlined text-xl">emergency</span>
              </div>
              <div className="flex flex-col font-sans">
                <span className="font-sans text-base font-bold text-white">Charging Bay 02</span>
                <span className="font-sans text-xs text-slate-400">Max Power Limit: <strong className="text-alert-priority">{port2?.power_limit_kw || 50} kW</strong></span>
              </div>
            </div>

            <span className="px-3.5 py-1 rounded-full bg-alert-priority/20 text-alert-priority border border-alert-priority/40 font-sans text-xs font-bold uppercase tracking-wider">
              {port2?.status || 'idle'}
            </span>
          </div>

          {session2 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${session2.start_time}-${session2.version}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 font-sans"
              >
                <div className="flex items-center justify-between text-xs font-sans text-slate-400">
                  <span>Session Identifier:</span>
                  <span className="text-white font-mono font-semibold">{session2.id}</span>
                </div>

                <div className="flex items-baseline justify-between pt-1 font-sans">
                  <span className="font-sans text-xs text-slate-400">Active Window:</span>
                  <span className="font-sans text-xl sm:text-2xl font-bold text-alert-priority">
                    {formatDisplayTime(session2.start_time)} – {formatDisplayTime(session2.end_time)}
                  </span>
                </div>

                {/* Stacked Solar + Wind Bar for Bay 2 */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10 font-sans">
                  <div className="flex justify-between font-sans text-xs">
                    <span className="text-slate-400 font-medium">Renewable Energy Score</span>
                    <span className="font-sans font-bold text-white">{session2.green_score}/100</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden flex font-sans">
                    <div className="h-full bg-solar" style={{ width: `${Math.round(session2.green_score * 0.4)}%` }}></div>
                    <div className="h-full bg-wind" style={{ width: `${session2.green_score - Math.round(session2.green_score * 0.4)}%` }}></div>
                  </div>
                  <div className="flex justify-between font-sans text-[11px]">
                    <span className="text-solar font-bold">{Math.round(session2.green_score * 0.4)}% Solar</span>
                    <span className="text-wind font-bold">{session2.green_score - Math.round(session2.green_score * 0.4)}% Wind</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5 font-sans">
                    <span className="font-sans text-[11px] text-slate-400">Price Estimate</span>
                    <span className="font-sans text-base font-bold text-solar">₹{session2.price_estimate.toFixed(2)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5 font-sans">
                    <span className="font-sans text-[11px] text-slate-400">CO₂ Estimate</span>
                    <span className="font-sans text-base font-bold text-alert-priority">{session2.co2_estimate_kg} kg</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2 font-sans">
                  <span className="material-symbols-outlined text-alert-priority text-base mt-0.5 shrink-0">info</span>
                  <p className="font-sans text-xs text-slate-300 leading-relaxed">
                    {session2.reason}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 text-xs font-sans">
              Bay 02 available / idle
            </div>
          )}
        </div>

      </div>

      {/* SECTION 2: QUEUE & 24H SIGNAL FORECAST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
        
        {/* PENDING DISPATCH QUEUE */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-7 shadow-2xl shadow-black/50 gap-5 font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 font-sans">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-lg">queue</span>
              Pending Dispatch Queue
            </h2>
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-sans text-xs font-semibold">
              {stationState?.pending_requests.length || 0} Waiting
            </span>
          </div>

          <div className="flex flex-col gap-3 font-sans min-h-[160px]">
            {stationState?.pending_requests && stationState.pending_requests.length > 0 ? (
              stationState.pending_requests.map((req, idx) => (
                <div 
                  key={req.id || idx}
                  className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-2.5 shadow-sm hover:border-white/20 transition-all font-sans"
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-sans text-xs font-bold text-white font-mono">
                      {req.id || `req_${idx}`}
                    </span>
                    {req.vehicle_class === 'priority' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-alert-priority/20 text-alert-priority font-sans text-[11px] font-bold border border-alert-priority/40">
                        Priority EV
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-sans text-[11px] font-medium">
                        Standard EV
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-sans text-slate-400 pt-1">
                    <span>SOC: <strong className="text-cyan-400 font-bold">{req.current_soc}%</strong> → <strong className="text-solar font-bold">{req.target_soc}%</strong></span>
                    <span>Deadline: <strong className="text-white">{formatDisplayTime(req.deadline)}</strong></span>
                    <span className="text-solar font-semibold capitalize">{req.preference}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-2 text-slate-400 text-xs my-auto">
                <span className="material-symbols-outlined text-2xl text-slate-500">check_circle</span>
                <span>No pending dispatch requests. All vehicles allocated.</span>
              </div>
            )}
          </div>
        </div>

        {/* 24-HOUR RENEWABLE SIGNAL GRAPH (Plotted dynamically from signalData) */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-7 shadow-2xl shadow-black/50 gap-5 font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 font-sans">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-solar text-lg">insights</span>
              24-Hour Grid Signal Forecast
            </h2>
            <div className="flex items-center gap-3 font-sans text-xs">
              <span className="text-solar font-bold">{solarPct}% Solar</span>
              <span className="text-wind font-bold">{windPct}% Wind</span>
              <span className="text-slate-400 font-medium">{gridPct}% Grid</span>
            </div>
          </div>

          <div className="w-full h-48 bg-white/[0.04] backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between relative overflow-hidden font-sans">
            <svg className="w-full h-32" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Dynamic Solar Area & Path */}
              <path d={solarAreaD} fill="url(#solarGrad)" />
              <path d={solarPathD} fill="none" stroke="#F59E0B" strokeWidth="2.5" />
              
              {/* Dynamic Wind Line Curve */}
              <path d={windPathD} fill="none" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 4" />
            </svg>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-white/10 font-sans">
              <span>12:00 AM</span>
              <span>6:00 AM</span>
              <span className="text-solar font-bold">12:00 PM</span>
              <span>6:00 PM</span>
              <span>12:00 AM</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 3: BEFORE/AFTER IMPACT ANALYTICS & SIMULATION TRIGGER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        
        {/* CONTRACT-BOUND IMPACT ANALYTICS */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-7 shadow-2xl shadow-black/50 gap-4 font-sans">
          <h2 className="font-display text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="material-symbols-outlined text-cyan-400 text-lg">ssid_chart</span>
            Before / After Optimization Impact
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-sans">
            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-1 font-sans">
              <span className="font-sans text-[11px] text-slate-400">Peak Load</span>
              <span className="font-sans text-base font-bold text-white">120 kW → {port1?.power_limit_kw || 50} kW</span>
              <span className="font-sans text-[11px] text-cyan-400 font-bold">-58% Shaving</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-1 font-sans">
              <span className="font-sans text-[11px] text-slate-400">Renewable Mix</span>
              <span className="font-sans text-base font-bold text-white">42% → <strong className="text-solar">{renewablePct}%</strong></span>
              <span className="font-sans text-[11px] text-solar font-bold">+{boostPct}% Boost</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-1 font-sans">
              <span className="font-sans text-[11px] text-slate-400">Avg Session Cost</span>
              <span className="font-sans text-base font-bold text-white">₹11.20 → ₹{costAfter}</span>
              <span className="font-sans text-[11px] text-solar font-bold">-{Math.round(renewablePct * 0.4)}% Cut</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-1 font-sans">
              <span className="font-sans text-[11px] text-slate-400">Carbon / Session</span>
              <span className="font-sans text-base font-bold text-white">12.4 → {carbonAfter} kg</span>
              <span className="font-sans text-[11px] text-cyan-400 font-bold">-{renewablePct}% CO₂</span>
            </div>
          </div>
        </div>

        {/* GRID EVENT SIMULATION DROP TRIGGER */}
        <div className="lg:col-span-4 flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-blue-500/40 p-6 sm:p-7 shadow-2xl shadow-black/50 gap-4 justify-between font-sans">
          <div className="flex flex-col gap-1 border-b border-white/10 pb-3 font-sans">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-solar text-lg">science</span>
              Grid Event Simulation
            </h2>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              Emulates sudden solar drop (<strong className="text-solar font-bold">86% → 54%</strong>), triggering live rescheduling, background mesh ripples, and WebSocket toast alert.
            </p>
          </div>

          <button
            onClick={handleSimulateDrop}
            disabled={isSimulating}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-sans text-sm font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">{isSimulating ? 'sync' : 'bolt'}</span>
            <span>{isSimulating ? 'Simulating Drop...' : '⚡ Trigger Renewable Drop'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
