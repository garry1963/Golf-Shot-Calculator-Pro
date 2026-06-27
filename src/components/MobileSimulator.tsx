import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Sun, Moon, Volume2, VolumeX, Smartphone, Tablet as TabletIcon, Monitor } from 'lucide-react';
import { playHapticFeedback } from '../utils/haptics';

interface SimulatorProps {
  children: React.ReactNode;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  soundEnabled: boolean;
  setSoundEnabled: (s: boolean) => void;
}

export default function MobileSimulator({
  children,
  theme,
  setTheme,
  soundEnabled,
  setSoundEnabled
}: SimulatorProps) {
  const [time, setTime] = useState('08:33 AM');
  const [deviceMode, setDeviceMode] = useState<'phone' | 'tablet' | 'full'>('tablet');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      setTime(`${hrs.toString().padStart(2, '0')}:${mins} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    playHapticFeedback('click');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      setTimeout(() => playHapticFeedback('success'), 100);
    }
  };

  // Dimension mapping for simulated modes
  const deviceClasses = {
    phone: "max-w-[420px] h-[850px] rounded-[50px] border-[12px]",
    tablet: "max-w-[820px] h-[1024px] rounded-[36px] border-[12px]",
    full: "max-w-7xl w-full h-[94vh] rounded-[24px] border-[4px]"
  };

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center py-4 px-4 transition-colors duration-500 ${
      theme === 'dark' 
        ? 'bg-[#050b14] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#050b14] to-black' 
        : 'bg-[#f0f4f8] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-[#f0f4f8] to-[#d9e2ec]'
    }`}>
      {/* Outer Layout Header - now visible on medium screens (tablets) as well as desktops */}
      <div className="hidden md:flex flex-wrap items-center justify-between w-full max-w-5xl mb-4 text-xs font-mono tracking-wider opacity-90 px-2 gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className={theme === 'dark' ? 'text-slate-300 font-extrabold' : 'text-slate-800 font-extrabold'}>
            GOLF SHOT CALCULATOR PRO • TABLET OPTIMIZED
          </span>
        </div>

        {/* Display Screen Emulator Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setDeviceMode('phone');
              if (soundEnabled) playHapticFeedback('click');
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
              deviceMode === 'phone'
                ? 'bg-green-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Phone</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDeviceMode('tablet');
              if (soundEnabled) playHapticFeedback('click');
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
              deviceMode === 'tablet'
                ? 'bg-green-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TabletIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDeviceMode('full');
              if (soundEnabled) playHapticFeedback('click');
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
              deviceMode === 'full'
                ? 'bg-green-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Wide/Full</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
              theme === 'dark' ? 'border-slate-800 text-amber-400 bg-slate-950/60' : 'border-slate-300 text-blue-600 bg-white'
            }`}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span className="text-[10px] font-bold uppercase">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
          </button>
          
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all hover:scale-105 cursor-pointer ${
              theme === 'dark' ? 'border-slate-800 text-slate-300 bg-slate-950/60' : 'border-slate-300 text-slate-700 bg-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-500" /> : <VolumeX className="h-3.5 w-3.5 text-rose-500" />}
            <span className="text-[10px] font-bold uppercase">{soundEnabled ? 'SOUND' : 'MUTED'}</span>
          </button>
        </div>
      </div>

      {/* Simulator Device Frame */}
      <div className={`relative w-full overflow-hidden transition-all duration-300 shadow-2xl flex flex-col ${
        deviceClasses[deviceMode]
      } ${
        theme === 'dark' 
          ? 'border-slate-900 bg-[#0d1527] shadow-emerald-950/20' 
          : 'border-slate-300 bg-white shadow-slate-400/30'
      }`}>
        {/* Device Notch Speaker - Only shown in Phone mode */}
        {deviceMode === 'phone' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-black rounded-b-2xl z-50 flex items-center justify-center">
            <div className="w-12 h-1 bg-neutral-800 rounded-full mb-2"></div>
            <div className="absolute right-6 top-1.5 w-2.5 h-2.5 rounded-full bg-neutral-900"></div>
          </div>
        )}

        {/* Minimal Tablet Camera dot - Only shown in Tablet mode */}
        {deviceMode === 'tablet' && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-black/40 border border-slate-800/10 z-50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-900"></div>
          </div>
        )}

        {/* Side physical buttons simulator for decorative look - only on Phone/Tablet */}
        {deviceMode !== 'full' && (
          <>
            <div className="absolute -left-3 top-32 w-1 h-12 bg-neutral-800 rounded-r z-10"></div>
            <div className="absolute -left-3 top-48 w-1 h-16 bg-neutral-800 rounded-r z-10"></div>
            <div className="absolute -left-3 top-68 w-1 h-16 bg-neutral-800 rounded-r z-10"></div>
            <div className="absolute -right-3 top-44 w-1 h-20 bg-neutral-800 rounded-l z-10"></div>
          </>
        )}

        {/* Status Bar */}
        <div className={`h-11 px-6 pt-2.5 flex items-center justify-between text-xs font-semibold select-none z-40 ${
          theme === 'dark' ? 'text-slate-300 bg-[#0d1527]' : 'text-slate-800 bg-slate-50'
        }`}>
          <span>{time}</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <Wifi className="h-3.5 w-3.5" />
            <span className="text-[9px] font-bold">5G</span>
            <Battery className="h-4 w-4" />
          </div>
        </div>

        {/* Screen Area */}
        <div id="simulator-screen" className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>

        {/* Home Indicator bar */}
        <div className={`h-6 flex items-center justify-center pb-2 z-40 ${
          theme === 'dark' ? 'bg-slate-950/80' : 'bg-slate-100/90'
        }`}>
          <div className={`w-32 h-1.5 rounded-full ${
            theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'
          }`}></div>
        </div>
      </div>
      
      {/* Footer Branding Info */}
      <div className="mt-4 text-[10px] font-mono opacity-40 text-center uppercase tracking-widest">
        Golf Shot Calculator Pro • Tablet & Desktop Adaptive View
      </div>
    </div>
  );
}
