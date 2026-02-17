
import React, { useState, useEffect } from 'react';

export const IntroOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        console.log('IntroOverlay mounted!');

        // Stage 0: White screen with centered logo (1.5 seconds)
        const timer1 = setTimeout(() => {
            console.log('Moving to Stage 1');
            setStage(1); // Stage 1: Line appears, logo fades
        }, 500);

        // Stage 1 -> Stage 2: Panels slide away (1.5 seconds after stage 1)
        const timer2 = setTimeout(() => {
            console.log('Moving to Stage 2');
            setStage(2); // Stage 2: Curtain opens
        }, 2500);

        // Complete animation and notify parent (after panels slide away)
        const timer3 = setTimeout(() => {
            console.log('Animation complete!');
            onComplete();
        }, 3500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, [onComplete]);

    console.log('Current stage:', stage);

    if (stage === 2) {
        // Stage 2: Horizontal curtain - panels slide up and down
        return (
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
                {/* Top panel */}
                <div
                    className="absolute top-0 left-0 w-full h-1/2 bg-white transition-transform duration-[2000ms] ease-in-out"
                    style={{ transform: 'translateY(-100%)' }}
                />
                {/* Bottom panel */}
                <div
                    className="absolute bottom-0 left-0 w-full h-1/2 bg-white transition-transform duration-[2000ms] ease-in-out"
                    style={{ transform: 'translateY(100%)' }}
                />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-white flex items-center justify-center" style={{ zIndex: 9999 }}>
            {/* Logo */}
            <div
                className={`flex flex-col items-center transition-opacity duration-1000 ${stage === 1 ? 'opacity-0' : 'opacity-100'
                    }`}
            >
                <div className="text-6xl md:text-8xl font-serif font-bold text-black tracking-tight mb-4">
                    SHAGUN
                </div>
                <div className="text-xl md:text-2xl font-light tracking-[0.3em] text-gray-700">
                    GENERAL STORE
                </div>
            </div>

            {/* Line appears in Stage 1 */}
            {stage >= 1 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className="h-[2px] bg-black animate-line-expand"
                    />
                </div>
            )}
        </div>
    );
};
