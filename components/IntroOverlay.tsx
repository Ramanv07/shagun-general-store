
import React, { useState, useEffect } from 'react';

export const IntroOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 600);   // show line
    const t2 = setTimeout(() => setStage(2), 2200);  // curtain opens
    const t3 = setTimeout(() => onComplete(), 3600);  // done
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  // Stage 2: Curtain wipe
  if (stage === 2) {
    return (
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
        <div
          className="absolute top-0 left-0 w-full h-1/2 transition-transform duration-[1800ms] ease-in-out"
          style={{ backgroundColor: '#FBF3E7', transform: 'translateY(-100%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-full h-1/2 transition-transform duration-[1800ms] ease-in-out"
          style={{ backgroundColor: '#FBF3E7', transform: 'translateY(100%)' }}
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, backgroundColor: '#FBF3E7' }}
    >
      {/* Decorative gold circles */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #C9A24B, transparent)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-20 h-20 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #7A1F2E, transparent)' }} />

      {/* Logo */}
      <div
        className={`flex flex-col items-center transition-opacity duration-700 relative z-10 ${stage === 1 ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* Emblem */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #7A1F2E, #5C1622)' }}
        >
          <span className="text-3xl font-serif font-bold" style={{ color: '#C9A24B' }}>S</span>
        </div>

        <div
          className="text-6xl md:text-8xl font-serif font-bold tracking-tight"
          style={{ color: '#7A1F2E' }}
        >
          SHAGUN
        </div>
        <div
          className="text-base md:text-lg font-light mt-2"
          style={{ color: '#7A6650', letterSpacing: '0.3em' }}
        >
          GENERAL STORE
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div style={{ width: '30px', height: '1px', background: '#C9A24B' }} />
          <span style={{ color: '#C9A24B', fontSize: '0.65rem', letterSpacing: '0.2em' }}>EST. 2020</span>
          <div style={{ width: '30px', height: '1px', background: '#C9A24B' }} />
        </div>
      </div>

      {/* Expanding line in stage 1 */}
      {stage >= 1 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="animate-line-expand rounded-full"
            style={{ height: '2px', background: 'linear-gradient(to right, transparent, #7A1F2E, #C9A24B, #7A1F2E, transparent)' }}
          />
        </div>
      )}
    </div>
  );
};
