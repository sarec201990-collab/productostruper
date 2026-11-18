import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface SplashStep {
  progress: number;
  status: string;
}

const SPLASH_STEPS: SplashStep[] = [
  { progress: 20, status: 'Iniciando catálogo digital...' },
  { progress: 55, status: 'Indexando 16,043 productos y precios oficiales...' },
  { progress: 88, status: 'Sincronizando con Flexivor Chat...' },
  { progress: 100, status: '¡Catálogo listo!' }
];

interface StartupSplashProps {
  onDone?: () => void;
}

export const StartupSplash: React.FC<StartupSplashProps> = ({ onDone }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide initial static HTML fallback once component mounts
    const fallback = document.getElementById('startupSplashFallback');
    if (fallback) {
      fallback.remove();
    }

    const timers: (ReturnType<typeof setTimeout>)[] = [];

    timers.push(setTimeout(() => setStepIndex(1), 320));
    timers.push(setTimeout(() => setStepIndex(2), 750));
    timers.push(setTimeout(() => setStepIndex(3), 1150));
    timers.push(
      setTimeout(() => {
        setFadingOut(true);
      }, 1450)
    );
    timers.push(
      setTimeout(() => {
        setVisible(false);
        if (onDone) onDone();
      }, 1850)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [onDone]);

  const handleSkip = () => {
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      if (onDone) onDone();
    }, 250);
  };

  if (!visible) return null;

  const current = SPLASH_STEPS[stepIndex] || SPLASH_STEPS[0];

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#061733] via-[#0b2f68] to-[#1456b8] text-white transition-all duration-500 ease-out select-none ${
        fadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* Background Ambient Glow & Grid */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#38bdf8]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-[#f07d00]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center px-4">
        
        {/* Brand Logos */}
        <div className="mb-6 relative flex flex-col items-center">
          <div className="relative">
            <img
              src="/icons/logo-flexivor-web.png"
              alt="Flexivor"
              className="h-14 sm:h-16 w-auto object-contain filter drop-shadow-2xl animate-pulse"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icons/flexivor-icon.svg';
              }}
            />
            {/* Sparkle badge */}
            <span className="absolute -top-1 -right-2 p-1 bg-[#f07d00] rounded-full text-white shadow-lg animate-bounce">
              <Sparkles className="w-3 h-3" />
            </span>
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow">
              TRUPER<span className="text-[#f07d00]">.</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[#f07d00] text-white uppercase tracking-wider shadow">
              Catálogo Oficial
            </span>
          </div>

          <p className="mt-1 text-xs text-sky-200/90 font-medium flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Precios con IVA · Ecosistema Flexivor</span>
          </p>
        </div>

        {/* Progress bar container */}
        <div className="w-full max-w-[280px] h-2.5 rounded-full bg-white/15 overflow-hidden p-0.5 backdrop-blur-sm border border-white/20 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f07d00] via-[#38bdf8] to-white shadow-sm transition-all duration-300 ease-out"
            style={{ width: `${current.progress}%` }}
          />
        </div>

        {/* Status text */}
        <div className="mt-4 min-h-[24px] flex items-center justify-center">
          <p className="text-xs sm:text-sm font-semibold text-white/90 drop-shadow tracking-wide transition-all">
            {current.status}
          </p>
        </div>

        {/* Counter and skip option */}
        <div className="mt-5 flex items-center justify-between w-full max-w-[280px] text-[11px] text-white/60">
          <span className="font-mono font-bold text-sky-300">
            {current.progress}%
          </span>
          <button
            onClick={handleSkip}
            className="text-white/70 hover:text-white hover:underline transition-colors cursor-pointer py-1 px-2 rounded hover:bg-white/10"
          >
            Entrar directo →
          </button>
        </div>

      </div>

      {/* Footer copyright note */}
      <div className="absolute bottom-6 text-[10px] text-white/40 font-medium tracking-wider uppercase text-center">
        Herramientas y Accesorios Oficiales · Sincronizado en Tiempo Real
      </div>
    </div>
  );
};
