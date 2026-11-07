import React, { useState, useEffect } from 'react';

export const IntroOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Respect user motion preferences
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    // Keep splash under 300ms total
    const tFade = setTimeout(() => setFading(true), 150);
    const tDone = setTimeout(() => onComplete(), 280);

    return () => {
      clearTimeout(tFade);
      clearTimeout(tDone);
    };
  }, [onComplete]);

  return (
    <div
      onClick={onComplete}
      className={`fixed inset-0 flex items-center justify-center transition-opacity duration-150 pointer-events-none z-[9999] ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: '#FBF3E7' }}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center">
        <img
          src="/app-icon.png"
          alt="Shagun Mart Logo"
          className="w-16 h-16 rounded-2xl mb-3 shadow-md object-cover border border-amber-200/50"
        />
        <div
          className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-maroon-900"
          style={{ color: '#7A1F2E' }}
        >
          SHAGUN
        </div>
        <div
          className="text-xs md:text-sm font-light mt-1 tracking-widest"
          style={{ color: '#7A6650', letterSpacing: '0.25em' }}
        >
          GENERAL STORE
        </div>
      </div>
    </div>
  );
};
