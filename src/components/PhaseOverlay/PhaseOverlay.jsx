import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { PHASES } from '../../engine/constants.js';

const PHASE_VISUALS = {
  FINGER: {
    icon: '✂',
    color: '#8b0000',
    glow: 'rgba(139,0,0,0.6)',
    borderColor: '#6b0000',
    subtitle: 'Fingers on the table, Clancy.',
  },
  SHOCK: {
    icon: '⚡',
    color: '#1a3a8b',
    glow: 'rgba(26,58,139,0.6)',
    borderColor: '#1a3a8b',
    subtitle: 'Lucas introduces new rules.',
  },
  SAW: {
    icon: '⚙',
    color: '#4a2200',
    glow: 'rgba(139,60,0,0.6)',
    borderColor: '#6b3300',
    subtitle: 'One of you won\'t leave this room.',
  },
  victory: {
    icon: '☉',
    color: '#1a4a00',
    glow: 'rgba(20,100,0,0.5)',
    borderColor: '#2a6b00',
    subtitle: '',
  },
  defeat: {
    icon: '☠',
    color: '#4a0000',
    glow: 'rgba(100,0,0,0.7)',
    borderColor: '#6b0000',
    subtitle: '',
  },
  oblivion: {
    icon: '∅',
    color: '#1a1a2e',
    glow: 'rgba(20,20,80,0.5)',
    borderColor: '#2a2a5e',
    subtitle: '',
  },
};

export default function PhaseOverlay({ overlay, onDismiss }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const tl = gsap.timeline();
    tl.fromTo(containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4 }
    )
    .fromTo(contentRef.current,
      { scale: 0.7, opacity: 0, y: 40 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.5)' },
      '-=0.2'
    );

    // Screen shake for dramatic phases
    if (overlay.type === 'SAW' || overlay.type === 'defeat') {
      gsap.to(contentRef.current, {
        x: '+=4', duration: 0.05, repeat: 8, yoyo: true, ease: 'power1.inOut', delay: 0.5,
      });
    }
  }, [overlay]);

  const visual = PHASE_VISUALS[overlay.type] || PHASE_VISUALS[overlay.phase] || PHASE_VISUALS.FINGER;

  const isEndScreen = overlay.type === 'victory' || overlay.type === 'defeat';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}
      onClick={!isEndScreen ? onDismiss : undefined}
    >
      <div
        ref={contentRef}
        className="relative flex flex-col items-center gap-6 p-12 rounded-lg max-w-lg w-full mx-4"
        style={{
          background: `radial-gradient(ellipse at center, ${visual.color}22, #000000dd)`,
          border: `2px solid ${visual.borderColor}`,
          boxShadow: `0 0 60px ${visual.glow}, 0 0 120px ${visual.glow}44, inset 0 0 40px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Corner ornaments */}
        <div className="absolute top-3 left-3 text-stone-700 text-xs">✦</div>
        <div className="absolute top-3 right-3 text-stone-700 text-xs">✦</div>
        <div className="absolute bottom-3 left-3 text-stone-700 text-xs">✦</div>
        <div className="absolute bottom-3 right-3 text-stone-700 text-xs">✦</div>

        {/* Phase icon */}
        <div className="text-6xl animate-flicker" style={{ color: visual.color, filter: `drop-shadow(0 0 20px ${visual.glow})` }}>
          {visual.icon}
        </div>

        {/* Main title */}
        <div className="text-center">
          <h1 className="font-cinzel text-4xl font-black tracking-widest"
            style={{
              color: '#f0e2c0',
              textShadow: `0 0 30px ${visual.glow}, 2px 2px 4px rgba(0,0,0,0.9)`,
              letterSpacing: '0.3em',
            }}>
            {overlay.message}
          </h1>

          {visual.subtitle && (
            <p className="font-fell italic text-stone-400 text-sm mt-2">
              {visual.subtitle}
            </p>
          )}
        </div>

        {/* Sub message */}
        {overlay.subMessage && (
          <p className="font-fell italic text-stone-300 text-center text-base leading-relaxed max-w-sm">
            "{overlay.subMessage}"
          </p>
        )}

        {/* Divider */}
        <div className="w-48 h-px" style={{ background: `linear-gradient(90deg, transparent, ${visual.borderColor}, transparent)` }} />

        {isEndScreen ? (
          <button
            onClick={onDismiss}
            className="font-cinzel text-sm tracking-widest uppercase px-8 py-3 rounded
              border border-stone-700 text-stone-300 hover:text-amber-300
              hover:border-amber-700 transition-all duration-300"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            Play Again
          </button>
        ) : (
          <p className="text-stone-600 text-xs font-fell italic animate-pulse">
            Click anywhere to continue...
          </p>
        )}
      </div>
    </div>
  );
}
