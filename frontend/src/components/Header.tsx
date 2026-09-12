import React from 'react';
import { Car, LayoutDashboard } from 'lucide-react';
import { TubelightNavbar, NavItem } from './ui/tubelight-navbar';

interface HeaderProps {
  activeView: 'landing' | 'driver' | 'operator';
  setActiveView: (view: 'landing' | 'driver' | 'operator') => void;
  solarPct?: number;
  windPct?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  solarPct = 52,
  windPct = 32
}) => {
  const navItems: NavItem[] = [
    { name: 'Driver View', url: '#', icon: Car },
    { name: 'Operator Console', url: '#', icon: LayoutDashboard },
  ];

  const currentTabName =
    activeView === 'operator'
      ? 'Operator Console'
      : 'Driver View';

  const handleTabChange = (name: string) => {
    if (name === 'Driver View') setActiveView('driver');
    else if (name === 'Operator Console') setActiveView('operator');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0D1117]/85 backdrop-blur-xl border-b border-white/10 shadow-xl">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between gap-4">
        
        {/* Brand Identity */}
        <div 
          className="flex items-center cursor-pointer group"
          onClick={() => setActiveView('landing')}
        >
          <img
            src="/logo.png?v=6"
            alt="Voltwise"
            className="h-9 sm:h-11 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </div>

        {/* Tubelight Navbar Component (Driver View & Operator Console only) */}
        <TubelightNavbar
          items={navItems}
          activeTab={currentTabName}
          onTabChange={handleTabChange}
        />

        {/* Energy Source Breakdown */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-md border border-white/10">
          <span className="font-body text-xs text-paper-muted">Energy mix:</span>
          
          {/* Stacked Mini Bar */}
          <div className="w-20 h-2.5 rounded-full bg-white/10 overflow-hidden flex">
            <div className="h-full bg-solar" style={{ width: `${solarPct}%` }} title={`Solar: ${solarPct}%`}></div>
            <div className="h-full bg-wind" style={{ width: `${windPct}%` }} title={`Wind: ${windPct}%`}></div>
          </div>

          <div className="flex items-center gap-2 font-body text-xs font-bold">
            <span className="text-solar">{solarPct}% solar</span>
            <span className="text-paper-muted font-normal">+</span>
            <span className="text-wind">{windPct}% wind</span>
          </div>
        </div>

      </div>
    </header>
  );
};
