import React, { useEffect, useState } from 'react';

interface BackgroundSnippetsProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'grid' | 'dots' | 'radial-glow' | 'mesh';
}

export const BackgroundSnippets: React.FC<BackgroundSnippetsProps> = ({
  children,
  className = '',
  variant = 'grid',
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={`relative min-h-screen w-full bg-[#0D1117] text-slate-100 overflow-x-hidden ${className}`}>
      
      {/* IBELICK BACKGROUND PATTERNS */}
      {/* Variant 1: Signature Ibelick Radial Masked Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Primary Radial Glow Mesh */}
        <div 
          className="absolute top-0 z-[-2] h-screen w-screen bg-[#0D1117] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,193,201,0.18),rgba(255,255,255,0))]" 
        />

        {/* Ambient Secondary Warm Glow */}
        <div className="absolute top-[20%] left-[10%] w-[35rem] h-[35rem] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] right-[10%] w-[40rem] h-[40rem] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[10%] left-[30%] w-[30rem] h-[30rem] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Subtle CSS Grid Lines (ibelick style) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Dot Matrix Layer */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]" />

        {/* Interactive Mouse Glow Spot */}
        <div 
          className="absolute w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-300 ease-out"
          style={{
            left: `${mousePos.x - 250}px`,
            top: `${mousePos.y - 250}px`,
            background: 'radial-gradient(circle, rgba(79,193,201,0.08) 0%, rgba(242,169,59,0.04) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* Main Content Render */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
};

export default BackgroundSnippets;
