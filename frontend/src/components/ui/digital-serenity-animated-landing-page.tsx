import React, { useState, useEffect, useRef } from 'react';

interface DigitalSerenityProps {
  onNavigateDriver?: () => void;
  onNavigateOperator?: () => void;
}

const DigitalSerenity: React.FC<DigitalSerenityProps> = ({
  onNavigateDriver,
  onNavigateOperator,
}) => {
  const [mouseGradientStyle, setMouseGradientStyle] = useState({
    left: '0px',
    top: '0px',
    opacity: 0,
  });
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [scrolled, setScrolled] = useState(false);
  const floatingElementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const animateWords = () => {
      const wordElements = document.querySelectorAll('.word-animate');
      wordElements.forEach((word) => {
        const delay = parseInt(word.getAttribute('data-delay') || '0') || 0;
        setTimeout(() => {
          if (word) (word as HTMLElement).style.animation = 'word-appear 0.8s ease-out forwards';
        }, delay);
      });
    };
    const timeoutId = setTimeout(animateWords, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseGradientStyle({
        left: `${e.clientX}px`,
        top: `${e.clientY}px`,
        opacity: 1,
      });
    };
    const handleMouseLeave = () => {
      setMouseGradientStyle((prev) => ({ ...prev, opacity: 0 }));
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const newRipple = { id: Date.now(), x: e.clientX, y: e.clientY };
      setRipples((prev) => [...prev, newRipple]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== newRipple.id)), 1000);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  useEffect(() => {
    const wordElements = document.querySelectorAll('.word-animate');
    const handleMouseEnter = (e: Event) => {
      if (e.target) (e.target as HTMLElement).style.textShadow = '0 0 20px rgba(79, 193, 201, 0.7)';
    };
    const handleMouseLeave = (e: Event) => {
      if (e.target) (e.target as HTMLElement).style.textShadow = 'none';
    };
    wordElements.forEach((word) => {
      word.addEventListener('mouseenter', handleMouseEnter);
      word.addEventListener('mouseleave', handleMouseLeave);
    });
    return () => {
      wordElements.forEach((word) => {
        if (word) {
          word.removeEventListener('mouseenter', handleMouseEnter);
          word.removeEventListener('mouseleave', handleMouseLeave);
        }
      });
    };
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll('.floating-element-animate');
    floatingElementsRef.current = Array.from(elements) as HTMLElement[];
    const handleScroll = () => {
      if (!scrolled) {
        setScrolled(true);
        floatingElementsRef.current.forEach((el, index) => {
          setTimeout(() => {
            if (el) {
              el.style.animationPlayState = 'running';
              el.style.opacity = ''; 
            }
          }, (parseFloat(el.style.animationDelay || "0") * 1000) + index * 100);
        });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  const pageStyles = `
    #mouse-gradient-react {
      position: fixed;
      pointer-events: none;
      border-radius: 9999px;
      background-image: radial-gradient(circle, rgba(79, 193, 201, 0.14), rgba(242, 169, 59, 0.1), transparent 70%);
      transform: translate(-50%, -50%);
      will-change: left, top, opacity;
      transition: left 70ms linear, top 70ms linear, opacity 300ms ease-out;
    }
    @keyframes word-appear { 0% { opacity: 0; transform: translateY(30px) scale(0.8); filter: blur(10px); } 50% { opacity: 0.8; transform: translateY(10px) scale(0.95); filter: blur(2px); } 100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @keyframes grid-draw { 0% { stroke-dashoffset: 1000; opacity: 0; } 50% { opacity: 0.3; } 100% { stroke-dashoffset: 0; opacity: 0.15; } }
    @keyframes pulse-glow { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.1); } }
    .word-animate { display: inline-block; opacity: 0; margin: 0 0.1em; transition: color 0.3s ease, transform 0.3s ease; }
    .word-animate:hover { color: #4FC1C9; transform: translateY(-2px); }
    .grid-line { stroke: #4FC1C9; stroke-width: 0.5; opacity: 0; stroke-dasharray: 5 5; stroke-dashoffset: 1000; animation: grid-draw 2s ease-out forwards; }
    .detail-dot { fill: #F2A93B; opacity: 0; animation: pulse-glow 3s ease-in-out infinite; }
    .text-decoration-animate { position: relative; }
    .floating-element-animate { position: absolute; width: 3px; height: 3px; background: #4FC1C9; border-radius: 50%; opacity: 0; animation: float 4s ease-in-out infinite; animation-play-state: paused; }
    @keyframes float { 0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; } 25% { transform: translateY(-10px) translateX(5px); opacity: 0.6; } 50% { transform: translateY(-5px) translateX(-3px); opacity: 0.4; } 75% { transform: translateY(-15px) translateX(7px); opacity: 0.8; } }
    .ripple-effect { position: fixed; width: 4px; height: 4px; background: rgba(79, 193, 201, 0.6); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: pulse-glow 1s ease-out forwards; z-index: 9999; }
  `;

  return (
    <>
      <style>{pageStyles}</style>
      <div className="min-h-screen bg-gradient-to-br from-[#0D1117] via-[#121721] to-[#0A0D12] text-slate-100 font-['Inter',sans-serif] overflow-hidden relative flex flex-col justify-between">
        
        {/* SERENE BACKGROUND SVG GRID */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern id="gridReactDarkResponsive" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(79, 193, 201, 0.08)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gridReactDarkResponsive)" />
          <line x1="0" y1="20%" x2="100%" y2="20%" className="grid-line" style={{ animationDelay: '0.5s' }} />
          <line x1="0" y1="80%" x2="100%" y2="80%" className="grid-line" style={{ animationDelay: '1s' }} />
          <line x1="20%" y1="0" x2="20%" y2="100%" className="grid-line" style={{ animationDelay: '1.5s' }} />
          <line x1="80%" y1="0" x2="80%" y2="100%" className="grid-line" style={{ animationDelay: '2s' }} />
          <line x1="50%" y1="0" x2="50%" y2="100%" className="grid-line" style={{ animationDelay: '2.5s', opacity: '0.05' }} />
          <line x1="0" y1="50%" x2="100%" y2="50%" className="grid-line" style={{ animationDelay: '3s', opacity: '0.05' }} />
          <circle cx="20%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: '3s' }} />
          <circle cx="80%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: '3.2s' }} />
          <circle cx="20%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: '3.4s' }} />
          <circle cx="80%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: '3.6s' }} />
          <circle cx="50%" cy="50%" r="1.5" className="detail-dot" style={{ animationDelay: '4s' }} />
        </svg>

        <div className="floating-element-animate" style={{ top: '25%', left: '15%', animationDelay: '0.5s' }}></div>
        <div className="floating-element-animate" style={{ top: '60%', left: '85%', animationDelay: '1s' }}></div>
        <div className="floating-element-animate" style={{ top: '40%', left: '10%', animationDelay: '1.5s' }}></div>
        <div className="floating-element-animate" style={{ top: '75%', left: '90%', animationDelay: '2s' }}></div>

        {/* Main Content Container */}
        <div className="relative z-10 min-h-screen flex flex-col justify-between items-center px-6 py-10 sm:px-8 sm:py-12 md:px-16 md:py-20">
          
          {/* Top Subtitle with Brand Logo */}
          <div className="text-center flex flex-col items-center">
            <img
              src="/logo.png?v=6"
              alt="Voltwise Logo"
              className="h-14 sm:h-20 w-auto object-contain mb-4 hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_25px_rgba(79,193,201,0.3)]"
            />
            <h2 className="text-xs sm:text-sm font-['Inter',sans-serif] font-medium text-slate-300 uppercase tracking-[0.25em] opacity-90 flex items-center justify-center gap-2">
              <span className="word-animate text-[#4FC1C9] font-semibold" data-delay="300">Adaptive</span>
              <span className="word-animate text-[#F2A93B] font-semibold" data-delay="450">EV</span>
              <span className="word-animate" data-delay="600">Dispatch</span>
            </h2>
            <div className="mt-4 w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-[#4FC1C9] to-transparent opacity-50 mx-auto"></div>
          </div>

          {/* Clean Main Headline & Navigation Buttons */}
          <div className="text-center max-w-5xl mx-auto relative flex flex-col items-center">
            <h1 className="flex flex-col items-center justify-center gap-3 sm:gap-4 font-sans tracking-tight text-decoration-animate">
              {/* Line 1 - Primary Headline */}
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight text-slate-50">
                <span className="word-animate" data-delay="700">Find </span>
                <span className="word-animate" data-delay="850">your </span>
                <span className="word-animate text-[#4FC1C9] font-semibold" data-delay="1000">optimal </span>
                <span className="word-animate text-[#F2A93B] font-semibold" data-delay="1150">clean </span>
                <span className="word-animate" data-delay="1300">window,</span>
              </div>

              {/* Line 2 - Secondary Subtitle */}
              <div className="text-lg sm:text-xl md:text-2xl font-light text-slate-300 leading-tight tracking-wide">
                <span className="word-animate" data-delay="1450">where </span>
                <span className="word-animate text-[#F2A93B] font-medium" data-delay="1600">solar </span>
                <span className="word-animate" data-delay="1750">& </span>
                <span className="word-animate text-[#4FC1C9] font-medium" data-delay="1900">wind </span>
                <span className="word-animate" data-delay="2050">energy </span>
                <span className="word-animate" data-delay="2200">power</span>
              </div>

              {/* Line 3 - Tertiary Subtitle (Lower Size for Perfect Hierarchy) */}
              <div className="text-base sm:text-lg md:text-xl font-light text-slate-400 leading-tight tracking-wide">
                <span className="word-animate" data-delay="2350">your </span>
                <span className="word-animate" data-delay="2500">fleet </span>
                <span className="word-animate" data-delay="2650">in </span>
                <span className="word-animate" data-delay="2800">perfect </span>
                <span className="word-animate text-slate-200 font-medium" data-delay="2950">harmony.</span>
              </div>
            </h1>

            {/* WIDE VIBRANT SOLAR YELLOW ACCENT LINE EXTENDING WELL PAST TEXT */}
            <div 
              className="mt-10 sm:mt-12 mb-5 sm:mb-6 w-full max-w-4xl sm:max-w-5xl md:max-w-6xl h-[2.5px] bg-gradient-to-r from-transparent via-[#F2A93B] via-amber-400 to-transparent opacity-0 mx-auto drop-shadow-[0_0_15px_rgba(242,169,59,0.85)]"
              style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '3.0s' }}
            />

            {/* TWO CLEAN CTA BUTTONS */}
            <div 
              className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-5 opacity-0"
              style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '3.2s' }}
            >
              {/* DRIVER VIEW BUTTON */}
              <button
                onClick={onNavigateDriver}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#F2A93B] to-amber-500 text-[#0D1117] font-['Inter',sans-serif] text-sm font-bold shadow-[0_0_25px_rgba(242,169,59,0.35)] flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(242,169,59,0.5)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">directions_car</span>
                <span>Driver View — Request Charging</span>
              </button>

              {/* OPERATOR VIEW BUTTON */}
              <button
                onClick={onNavigateOperator}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.08] backdrop-blur-xl border border-[#4FC1C9]/50 text-[#4FC1C9] font-['Inter',sans-serif] text-sm font-bold shadow-[0_0_25px_rgba(79,193,201,0.25)] flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 hover:bg-[#4FC1C9]/15 hover:shadow-[0_0_35px_rgba(79,193,201,0.4)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">dashboard</span>
                <span>Operator Console — Station Dispatch</span>
              </button>
            </div>

            {/* Detail Line Offsets */}
            <div className="absolute -left-6 sm:-left-8 top-1/2 transform -translate-y-1/2 w-3 sm:w-4 h-px bg-[#4FC1C9] opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '3.4s' }}></div>
            <div className="absolute -right-6 sm:-right-8 top-1/2 transform -translate-y-1/2 w-3 sm:w-4 h-px bg-[#F2A93B] opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '3.6s' }}></div>
          </div>

          {/* Bottom Subtitle */}
          <div className="text-center">
            <div className="mb-4 w-12 sm:w-16 h-px bg-gradient-to-r from-transparent via-[#4FC1C9] to-transparent opacity-40 mx-auto"></div>
            <h2 className="text-xs sm:text-sm font-mono font-light text-slate-300 uppercase tracking-[0.2em] opacity-80">
              <span className="word-animate" data-delay="3800">Forecast,</span>
              <span className="word-animate text-[#F2A93B]" data-delay="4000">Optimize,</span>
              <span className="word-animate text-[#4FC1C9]" data-delay="4200">Dispatch.</span>
            </h2>
            <div className="mt-6 flex justify-center space-x-4 opacity-0" style={{ animation: 'word-appear 1s ease-out forwards', animationDelay: '4.5s' }}>
              <div className="w-1.5 h-1.5 bg-[#F2A93B] rounded-full opacity-60"></div>
              <div className="w-1.5 h-1.5 bg-[#4FC1C9] rounded-full opacity-80"></div>
              <div className="w-1.5 h-1.5 bg-[#F2A93B] rounded-full opacity-60"></div>
            </div>
          </div>
        </div>

        {/* Mouse Radial Glow */}
        <div 
          id="mouse-gradient-react"
          className="w-60 h-60 blur-xl sm:w-80 sm:h-80 sm:blur-2xl md:w-96 md:h-96 md:blur-3xl"
          style={{
            left: mouseGradientStyle.left,
            top: mouseGradientStyle.top,
            opacity: mouseGradientStyle.opacity,
          }}
        ></div>

        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="ripple-effect"
            style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
          ></div>
        ))}
      </div>
    </>
  );
};

export default DigitalSerenity;
