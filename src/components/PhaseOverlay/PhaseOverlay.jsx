import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { PHASES } from '../../engine/constants.js';

const PHASE_VISUALS = {
  FINGER: {
    icon: '✂',
    color: '#1c1410',
    glow: 'rgba(232,213,176,0.04)',
    borderColor: 'rgba(255,209,82,0.18)',
    subtitle: 'No trump cards. Count carefully.',
  },
  SHOCK: {
    icon: '⚡',
    color: '#0c1018',
    glow: 'rgba(100,180,255,0.04)',
    borderColor: 'rgba(100,180,255,0.15)',
    subtitle: 'Trump cards are now in play.',
  },
  SAW: {
    icon: '⚙',
    color: '#180c06',
    glow: 'rgba(255,120,60,0.04)',
    borderColor: 'rgba(255,120,60,0.15)',
    subtitle: 'One of you won\'t leave this room.',
  },
  victory: {
    icon: '✦',
    color: '#0e0c08',
    glow: 'rgba(255,209,82,0.06)',
    borderColor: 'rgba(255,209,82,0.25)',
    subtitle: '',
  },
  defeat: {
    icon: '✕',
    color: '#120808',
    glow: 'rgba(229,115,115,0.05)',
    borderColor: 'rgba(229,115,115,0.2)',
    subtitle: '',
  },
  oblivion: {
    icon: '∅',
    color: '#0c0c10',
    glow: 'rgba(0,0,0,0)',
    borderColor: 'rgba(255,209,82,0.1)',
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
        className="relative flex flex-col items-center mx-4"
        style={{
          gap: 20,
          padding: '40px 32px 32px',
          borderRadius: 8,
          maxWidth: 360,
          width: '100%',
          background: `linear-gradient(160deg, ${visual.color}, #080604)`,
          border: `1px solid ${visual.borderColor}`,
          boxShadow: `0 0 80px rgba(0,0,0,0.98), inset 0 0 40px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Corner ornaments */}
        <div className="absolute top-3 left-3" style={{ color: 'rgba(255,209,82,0.2)', fontSize: 10 }}>✦</div>
        <div className="absolute top-3 right-3" style={{ color: 'rgba(255,209,82,0.2)', fontSize: 10 }}>✦</div>
        <div className="absolute bottom-3 left-3" style={{ color: 'rgba(255,209,82,0.2)', fontSize: 10 }}>✦</div>
        <div className="absolute bottom-3 right-3" style={{ color: 'rgba(255,209,82,0.2)', fontSize: 10 }}>✦</div>

        {/* Phase icon */}
        <div style={{ fontSize: 48, color: '#e8d5b0', opacity: 0.5, lineHeight: 1 }}>
          {visual.icon}
        </div>

        {/* Main title */}
        <h1 className="font-cinzel font-black text-center"
          style={{
            fontSize: 36,
            color: '#e8d5b0',
            letterSpacing: '0.25em',
            textShadow: '0 2px 8px rgba(0,0,0,0.9)',
            lineHeight: 1.2,
          }}>
          {overlay.message}
        </h1>

        {/* Subtitle — one line only, no subMessage duplication */}
        {visual.subtitle && (
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#7a6a50', textAlign: 'center', lineHeight: 1.5 }}>
            {visual.subtitle}
          </p>
        )}

        {/* Divider */}
        <div style={{ width: 80, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,209,82,0.2), transparent)' }} />

        {isEndScreen ? (
          <button
            onClick={onDismiss}
            className="font-cinzel uppercase rounded border transition-all duration-300"
            style={{ fontSize: 20, padding: '14px 40px', letterSpacing: '0.12em', background: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,209,82,0.3)', color: '#e8d5b0' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,209,82,0.7)'; e.currentTarget.style.color = '#ffd152'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,209,82,0.3)'; e.currentTarget.style.color = '#e8d5b0'; }}
          >
            Play Again
          </button>
        ) : (
          <p className="animate-pulse" style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#5a5040', letterSpacing: '0.05em' }}>
            Tap to continue
          </p>
        )}
      </div>
    </div>
  );
}
