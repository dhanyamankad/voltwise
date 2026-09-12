import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EVRequest, Session, VehicleClass, Preference } from '../types';
import { submitEVRequest, fetchSchedule } from '../api/client';

// Arc Gauge Component for Battery SOC (Round Cell Energy Gauge with Inter Font)
const ArcGauge: React.FC<{
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  label: string;
  color: string;
}> = ({ value, min = 0, max = 100, onChange, label, color }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / max) * circumference * 0.75; // 270 deg arc

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 shadow-sm group hover:border-white/20 transition-all font-sans">
      <span className="font-sans text-xs font-semibold text-slate-300">{label}</span>
      
      <div className="relative w-36 h-36 flex items-center justify-center font-sans">
        <svg className="w-full h-full transform -rotate-[135deg]" viewBox="0 0 100 100">
          {/* Background Track Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
          {/* Active Value Arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>

        {/* Center Battery Icon & Percentage */}
        <div className="absolute flex flex-col items-center justify-center text-center font-sans">
          <span className="material-symbols-outlined text-lg opacity-70 mb-0.5" style={{ color }}>
            {value < 30 ? 'battery_low' : value < 70 ? 'battery_4_bar' : 'battery_full'}
          </span>
          <span className="font-sans text-2xl font-extrabold tracking-tight text-white" style={{ color }}>
            {value}%
          </span>
          <span className="font-sans text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            {value < 50 ? 'Depleted' : 'Target'}
          </span>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full bg-white/10 appearance-none cursor-pointer accent-amber-500 hover:accent-cyan-400 transition-colors font-sans"
      />
    </div>
  );
};

function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('T') || timeStr.includes('Z')) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  }
  return timeStr;
}

export const DriverView: React.FC = () => {
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>('normal');
  const [currentSoc, setCurrentSoc] = useState<number>(25);
  const [targetSoc, setTargetSoc] = useState<number>(80);
  const [deadline, setDeadline] = useState<string>('5:30 PM');
  const [chargingRateKw, setChargingRateKw] = useState<number>(50);
  const [preference, setPreference] = useState<Preference>('greenest');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [recommendation, setRecommendation] = useState<Session | null>(null);

  useEffect(() => {
    // Initial load: keep recommendation null so driver sees empty standby guidance state
    setRecommendation(null);
  }, []);

  const isInvalidSoc = currentSoc > targetSoc;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalidSoc) return;

    setIsLoading(true);
    try {
      // Calculate a valid future deadline ISO timestamp (default 6 hours ahead) for the backend scheduler
      const futureDeadline = new Date(Date.now() + 6 * 3600 * 1000).toISOString();

      const requestData: EVRequest = {
        vehicle_class: vehicleClass,
        current_soc: currentSoc,
        target_soc: targetSoc,
        deadline: futureDeadline,
        charging_rate_kw: chargingRateKw,
        preference
      };
      const result = await submitEVRequest(requestData);
      setRecommendation(result);
    } catch (err) {
      console.error('Error submitting EV request:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Solar vs Wind breakdown split for Green Score
  const solarScore = recommendation ? Math.round(recommendation.green_score * 0.6) : 52;
  const windScore = recommendation ? recommendation.green_score - solarScore : 32;
  const gridScore = recommendation ? 100 - recommendation.green_score : 16;

  return (
    <div className="flex flex-col gap-8 w-full text-slate-100 font-sans">
      
      {/* Top Banner / Sub-Header (Inspired by Reference Layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10 font-sans">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#38bdf8]"></span>
            <span className="font-sans text-xs font-bold uppercase tracking-widest text-cyan-400">
              Driver Dispatch Portal
            </span>
          </div>
          <h1 className="font-sans text-2xl md:text-3xl font-bold tracking-tight text-white">
            EV Charging Request & <span className="text-cyan-400">Clean Dispatch</span>
          </h1>
        </div>

        {/* Live Grid Mix Status Badge */}
        <div className="px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/10 flex items-center gap-3 self-start sm:self-auto font-sans">
          <span className="font-sans text-xs text-slate-300 font-medium">Live Grid Mix:</span>
          <div className="flex items-center gap-2 font-sans text-xs font-bold">
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              {solarScore}% Solar
            </span>
            <span className="text-slate-400 font-normal">+</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
              {windScore}% Wind
            </span>
          </div>
        </div>
      </div>

      {/* VISUAL ENERGY PIPELINE (Source ──▶ Port ──▶ Vehicle Goal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        
        {/* Step 1: Energy Source */}
        <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center gap-4 shadow-sm hover:border-amber-500/40 transition-all font-sans">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <span className="material-symbols-outlined text-2xl">wb_sunny</span>
          </div>
          <div className="flex flex-col font-sans">
            <span className="font-sans text-xs text-slate-400">1. Clean Energy Source</span>
            <span className="font-sans text-sm font-bold text-white">
              <strong className="text-amber-400">{solarScore}% Solar</strong> + <strong className="text-cyan-400">{windScore}% Wind</strong>
            </span>
            <span className="font-sans text-[11px] text-slate-400">Off-peak zero marginal CO₂</span>
          </div>
        </div>

        {/* Step 2: Station Bay */}
        <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center gap-4 shadow-sm hover:border-cyan-400/40 transition-all font-sans">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <span className="material-symbols-outlined text-2xl">ev_station</span>
          </div>
          <div className="flex flex-col font-sans">
            <span className="font-sans text-xs text-slate-400">2. Station Charging Bay</span>
            <span className="font-sans text-sm font-bold text-cyan-400">
              {recommendation ? `Port ${recommendation.port_id === 'port_2' ? '2' : '1'} (${chargingRateKw} kW)` : 'Port 1 (50 kW)'}
            </span>
            <span className="font-sans text-[11px] text-slate-400">Smart load balancing active</span>
          </div>
        </div>

        {/* Step 3: Vehicle Target */}
        <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 flex items-center gap-4 shadow-sm hover:border-amber-500/40 transition-all font-sans">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <span className="material-symbols-outlined text-2xl">directions_car</span>
          </div>
          <div className="flex flex-col font-sans">
            <span className="font-sans text-xs text-slate-400">3. Vehicle Battery Goal</span>
            <span className="font-sans text-sm font-bold text-amber-400">
              {targetSoc}% Target SOC by {deadline}
            </span>
            <span className="font-sans text-[11px] text-slate-400">{vehicleClass === 'priority' ? 'Priority dispatch queue' : 'Standard dispatch queue'}</span>
          </div>
        </div>

      </div>

      {/* MAIN 2-COLUMN FORM & RECOMMENDATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-sans">
        
        {/* LEFT REQUEST FORM */}
        <form 
          onSubmit={handleSubmit}
          className="lg:col-span-6 flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl shadow-black/50 gap-6 font-sans"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4 font-sans">
            <div className="flex items-center gap-2 font-sans">
              <span className="material-symbols-outlined text-amber-400 text-xl">tune</span>
              <h2 className="font-sans text-lg font-bold text-white">Request Charging Schedule</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-300 font-sans text-[11px] font-medium">
              Contract Bound
            </span>
          </div>

          {/* Vehicle Class Selection */}
          <div className="flex flex-col gap-2 font-sans">
            <label className="font-sans text-xs font-medium text-slate-400">Vehicle Class</label>
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 gap-2 font-sans">
              <button
                type="button"
                onClick={() => setVehicleClass('normal')}
                className={`py-2.5 px-4 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  vehicleClass === 'normal'
                    ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">directions_car</span>
                <span>Standard EV</span>
              </button>

              <button
                type="button"
                onClick={() => setVehicleClass('priority')}
                className={`py-2.5 px-4 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  vehicleClass === 'priority'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">emergency</span>
                <span>Priority Vehicle</span>
              </button>
            </div>
          </div>

          {/* Validation Alert Banner */}
          {isInvalidSoc && (
            <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/50 text-red-200 flex items-start gap-3 font-sans text-xs shadow-md animate-shake">
              <span className="material-symbols-outlined text-red-400 text-xl shrink-0 mt-0.5">error</span>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-red-100 text-xs">Invalid Battery Goal</span>
                <p className="leading-relaxed">
                  Current battery charge (<strong className="text-white">{currentSoc}%</strong>) cannot be greater than target battery charge (<strong className="text-white">{targetSoc}%</strong>). Please adjust your target charge to be higher.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Arc Battery Gauges */}
          <div className="grid grid-cols-2 gap-4 font-sans">
            <ArcGauge
              label="Current SOC"
              value={currentSoc}
              min={0}
              max={100}
              onChange={setCurrentSoc}
              color="#38bdf8"
            />
            <ArcGauge
              label="Target SOC"
              value={targetSoc}
              min={0}
              max={100}
              onChange={setTargetSoc}
              color={isInvalidSoc ? '#f87171' : '#fbbf24'}
            />
          </div>

          {/* Deadline & Charging Rate Inputs */}
          <div className="grid grid-cols-2 gap-4 font-sans">
            <div className="flex flex-col gap-1.5 font-sans">
              <label className="font-sans text-xs font-medium text-slate-400">Ready-by Deadline</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-white hover:border-white/20 transition-all font-sans">
                <span className="material-symbols-outlined text-amber-400 text-xl">schedule</span>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-transparent font-sans text-sm font-bold w-full focus:outline-none text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 font-sans">
              <label className="font-sans text-xs font-medium text-slate-400">Max Rate (kW)</label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-white hover:border-white/20 transition-all font-sans">
                <span className="material-symbols-outlined text-cyan-400 text-xl">bolt</span>
                <input
                  type="number"
                  value={chargingRateKw}
                  onChange={(e) => setChargingRateKw(Number(e.target.value))}
                  className="bg-transparent font-sans text-sm font-bold w-full focus:outline-none text-white"
                />
              </div>
            </div>
          </div>

          {/* Optimization Preference Options */}
          <div className="flex flex-col gap-2 font-sans">
            <label className="font-sans text-xs font-medium text-slate-400">Optimization Preference</label>
            <div className="grid grid-cols-3 gap-3 font-sans">
              <div
                onClick={() => setPreference('greenest')}
                className={`cursor-pointer p-3.5 rounded-2xl transition-all flex flex-col gap-2 border backdrop-blur-md font-sans ${
                  preference === 'greenest'
                    ? 'bg-cyan-500/15 border-cyan-400/60 shadow-md shadow-cyan-500/10'
                    : 'bg-white/[0.04] border-white/10 hover:border-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-cyan-400 text-xl">eco</span>
                <div className="flex flex-col font-sans">
                  <span className="font-sans text-xs font-bold text-white">Greenest</span>
                  <span className="font-sans text-[11px] text-cyan-400 font-semibold">Max clean %</span>
                </div>
              </div>

              <div
                onClick={() => setPreference('cheapest')}
                className={`cursor-pointer p-3.5 rounded-2xl transition-all flex flex-col gap-2 border backdrop-blur-md font-sans ${
                  preference === 'cheapest'
                    ? 'bg-amber-500/15 border-amber-400/60 shadow-md shadow-amber-500/10'
                    : 'bg-white/[0.04] border-white/10 hover:border-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-amber-400 text-xl">payments</span>
                <div className="flex flex-col font-sans">
                  <span className="font-sans text-xs font-bold text-white">Cheapest</span>
                  <span className="font-sans text-[11px] text-amber-400 font-semibold">Lowest tariff</span>
                </div>
              </div>

              <div
                onClick={() => setPreference('balanced')}
                className={`cursor-pointer p-3.5 rounded-2xl transition-all flex flex-col gap-2 border backdrop-blur-md font-sans ${
                  preference === 'balanced'
                    ? 'bg-white/15 border-white/40 shadow-md'
                    : 'bg-white/[0.04] border-white/10 hover:border-slate-400'
                }`}
              >
                <span className="material-symbols-outlined text-white text-xl">balance</span>
                <div className="flex flex-col font-sans">
                  <span className="font-sans text-xs font-bold text-white">Balanced</span>
                  <span className="font-sans text-[11px] text-slate-400">Optimal blend</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action (Disabled when isInvalidSoc is true) */}
          <button
            type="submit"
            disabled={isLoading || isInvalidSoc}
            className={`w-full py-4 px-6 rounded-2xl font-sans text-sm font-bold flex items-center justify-center gap-2 transition-all mt-2 ${
              isInvalidSoc
                ? 'bg-slate-800/80 text-slate-500 border border-red-500/30 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {isLoading ? 'sync' : isInvalidSoc ? 'block' : 'bolt'}
            </span>
            <span>
              {isLoading
                ? 'Calculating Optimal Schedule...'
                : isInvalidSoc
                ? 'Invalid Battery Goal (Current > Target)'
                : 'Request Clean Schedule'}
            </span>
          </button>
        </form>

        {/* RIGHT RECOMMENDATION HERO CARD */}
        <div className="lg:col-span-6 flex flex-col rounded-3xl bg-[#121721]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl shadow-black/50 gap-6 font-sans">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 font-sans">
            <div className="flex items-center gap-2 font-sans">
              <span className="material-symbols-outlined text-amber-400 text-xl">auto_awesome</span>
              <h2 className="font-sans text-lg font-bold text-white">Recommended Schedule</h2>
            </div>
            {recommendation && (
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-sans text-xs font-bold">
                Port {recommendation.port_id === 'port_2' ? '2' : '1'} Allocated
              </span>
            )}
          </div>

          {recommendation ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${recommendation.start_time}-${recommendation.version}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-6 font-sans"
              >
                {/* Hero Assigned Window Box */}
                <div className="relative group p-0.5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-400 to-amber-400 shadow-[0_0_40px_rgba(37,99,235,0.3)] transition-all duration-300 font-sans">
                  <div className="p-6 sm:p-7 rounded-[14px] bg-[#0D1117]/90 backdrop-blur-2xl flex flex-col gap-3 relative overflow-hidden font-sans">
                    
                    {/* Ambient Glow Effects */}
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex items-center justify-between relative z-10 font-sans">
                      <span className="font-sans text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        Assigned Clean Window
                      </span>
                      <span className="px-3 py-1 rounded-full bg-blue-600/30 text-blue-300 border border-blue-400/40 font-sans text-[11px] font-bold">
                        Hero Recommendation
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3 pt-1 relative z-10 font-sans">
                      <span className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_15px_rgba(37,99,235,0.4)]">
                        {formatDisplayTime(recommendation.start_time)} – {formatDisplayTime(recommendation.end_time)}
                      </span>
                    </div>

                    <span className="font-sans text-xs text-slate-300 relative z-10 pt-1 leading-relaxed">
                      Synced with peak <strong className="text-amber-400">{solarScore}% Solar</strong> & <strong className="text-cyan-400">{windScore}% Wind</strong> clean generation before your {deadline} deadline.
                    </span>
                  </div>
                </div>

                {/* Renewable Score Breakdown */}
                <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-3 font-sans">
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-sans text-xs text-slate-300 font-semibold">Renewable Energy Score</span>
                    <span className="font-sans text-lg font-bold text-cyan-400">
                      {recommendation.green_score}/100
                    </span>
                  </div>

                  {/* Stacked Solar Amber + Wind Teal Bar */}
                  <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden flex">
                    <div className="h-full bg-amber-400" style={{ width: `${solarScore}%` }} title={`Solar: ${solarScore}%`}></div>
                    <div className="h-full bg-cyan-400" style={{ width: `${windScore}%` }} title={`Wind: ${windScore}%`}></div>
                  </div>

                  <div className="flex items-center justify-between font-sans text-xs pt-1">
                    <span className="text-amber-400 font-bold">{solarScore}% Solar contribution</span>
                    <span className="text-cyan-400 font-bold">{windScore}% Wind contribution</span>
                    <span className="text-slate-400 font-medium">{gridScore}% Grid draw</span>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 gap-4 font-sans">
                  <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-1 font-sans">
                    <span className="font-sans text-xs text-slate-400">Price Estimate</span>
                    <span className="font-sans text-xl font-bold text-amber-400">
                      ₹{recommendation.price_estimate.toFixed(2)}
                    </span>
                    <span className="font-sans text-[11px] text-slate-400">Off-peak tariff tier</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex flex-col gap-1 font-sans">
                    <span className="font-sans text-xs text-slate-400">CO₂ Saved Estimate</span>
                    <span className="font-sans text-xl font-bold text-cyan-400">
                      {recommendation.co2_estimate_kg} kg
                    </span>
                    <span className="font-sans text-[11px] text-slate-400">-66% vs baseline grid</span>
                  </div>
                </div>

                {/* Plain-English Reason */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex items-start gap-3 font-sans">
                  <span className="material-symbols-outlined text-amber-400 text-xl mt-0.5 shrink-0">info</span>
                  <div className="flex flex-col gap-1 font-sans">
                    <span className="font-sans text-xs font-bold text-white">Allocation Reason</span>
                    <p className="font-sans text-xs text-slate-300 leading-relaxed">
                      {recommendation.reason}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="py-16 px-6 sm:px-10 rounded-2xl bg-white/[0.02] border border-dashed border-white/15 flex flex-col items-center justify-center text-center gap-5 font-sans my-auto min-h-[320px]">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                <span className="material-symbols-outlined text-3xl animate-pulse">electric_bolt</span>
              </div>
              <div className="flex flex-col gap-2 max-w-sm font-sans">
                <h3 className="font-sans text-base font-bold text-white">Ready to Calculate Your Clean Schedule</h3>
                <p className="font-sans text-xs text-slate-400 leading-relaxed">
                  Select your vehicle battery target and preference on the left, then click <strong className="text-cyan-400 font-semibold">Request Clean Schedule</strong> to assign your optimal green window.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
