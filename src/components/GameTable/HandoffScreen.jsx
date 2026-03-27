import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function HandoffScreen({ toPlayerName, onReady }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!overlayRef.current || !contentRef.current) return;
    gsap.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
    gsap.fromTo(contentRef.current,
      { scale: 0.9, y: 20, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.5)', delay: 0.15 }
    );
    // Pulse glow on name text
    gsap.to(contentRef.current.querySelector('.player-name'), {
      textShadow: '0 0 30px rgba(245,158,11,0.9)',
      duration: 1.2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
      delay: 0.5,
    });
  }, []);

  const handleReady = () => {
    onReady();
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={contentRef}
        className="flex flex-col items-center gap-8 text-center px-8"
        style={{ maxWidth: 420 }}
      >
        {/* Icon */}
        <div
          className="rounded-full border-2 flex items-center justify-center"
          style={{
            width: 80,
            height: 80,
            borderColor: '#b8880a',
            boxShadow: '0 0 30px rgba(184,136,10,0.4)',
          }}
        >
          <span style={{ fontSize: 36 }}>🤝</span>
        </div>

        {/* Message */}
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#c4b9a8', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
            Local Duel
          </div>
          <h2 className="font-cinzel font-bold tracking-wide" style={{ fontSize: 32, color: '#f0e2c0' }}>
            Pass the device to
          </h2>
          <div
            className="player-name font-cinzel font-black mt-2 tracking-wider"
            style={{
              fontSize: 52,
              color: '#f5c842',
              textShadow: '0 0 15px rgba(245,158,11,0.6)',
            }}
          >
            {toPlayerName}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #5a3a00, transparent)' }} />
          <span className="text-amber-900/60 text-xs">✦</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #5a3a00, transparent)' }} />
        </div>

        {/* Hint */}
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#c4b9a8', lineHeight: 1.6 }}>
          Look away while your opponent takes their turn.
          <br />
          Press the button when you are ready.
        </p>

        {/* Ready button */}
        <button
          ref={btnRef}
          onClick={handleReady}
          className="font-cinzel font-bold tracking-[0.2em] uppercase
            px-12 py-5 rounded border-2 transition-all duration-200
            hover:scale-105 active:scale-95"
          style={{
            fontSize: 24,
            borderColor: '#b8880a',
            color: '#f0e2c0',
            background: 'linear-gradient(135deg, rgba(184,136,10,0.2), rgba(0,0,0,0.8))',
            boxShadow: '0 0 20px rgba(184,136,10,0.3)',
          }}
          onMouseEnter={(e) => gsap.to(e.currentTarget, {
            boxShadow: '0 0 40px rgba(184,136,10,0.6)',
            duration: 0.3,
          })}
          onMouseLeave={(e) => gsap.to(e.currentTarget, {
            boxShadow: '0 0 20px rgba(184,136,10,0.3)',
            duration: 0.3,
          })}
        >
          I'm Ready
        </button>
      </div>
    </div>
  );
}
