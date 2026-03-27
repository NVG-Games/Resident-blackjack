import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function MainMenu({ onStart }) {
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const btnsRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(cardsRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
    )
    .fromTo(titleRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' },
      '-=0.4'
    )
    .fromTo(subtitleRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      '-=0.3'
    )
    .fromTo(btnsRef.current,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      '-=0.2'
    );

    gsap.to(titleRef.current, {
      textShadow: '0 0 40px rgba(139,0,0,0.9), 0 0 80px rgba(80,0,0,0.5)',
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
      delay: 1.5,
    });
  }, []);

  const hoverIn = (e) => gsap.to(e.currentTarget, {
    borderColor: 'rgba(255,209,82,0.55)',
    color: '#ffd152',
    duration: 0.25,
  });
  const hoverOut = (e) => gsap.to(e.currentTarget, {
    borderColor: 'rgba(255,209,82,0.25)',
    color: '#e8d5b0',
    duration: 0.25,
  });

  const btnStyle = {
    borderColor: 'rgba(255,209,82,0.25)',
    color: '#e8d5b0',
    background: 'linear-gradient(135deg, rgba(255,209,82,0.04), rgba(0,0,0,0.7))',
    boxShadow: 'none',
  };

  const btnBase = `font-cinzel font-bold uppercase
    rounded border-2 transition-all duration-200
    hover:scale-105 active:scale-95 w-full`;

  return (
    <div
      className="w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        flex: 1,
        minHeight: 0,
        background: 'radial-gradient(ellipse at 50% 40%, #120e08 0%, #080604 60%, #030201 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Subtle horizontal texture */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,209,82,0.04) 60px, rgba(255,209,82,0.04) 61px)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.85) 100%)' }}
      />

      {/* Decorative cards above content */}
      <div ref={cardsRef} className="relative z-10" style={{ display: 'flex', gap: 12, opacity: 0.15, marginBottom: 24, maxWidth: '100vw', padding: '8px 8px' }}>
        {[1, 5, 9, 3, 11, 7].map((val, i) => (
          <StartCard key={i} value={val} rotation={-15 + i * 6} />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center px-6 sm:px-8 text-center max-w-lg w-full" style={{ gap: 20 }}>

        {/* Title */}
        <div ref={titleRef} style={{ textAlign: 'center' }}>
          <h1
            className="font-cinzel font-black text-6xl sm:text-7xl md:text-8xl tracking-[0.2em] uppercase"
            style={{
              color: '#e8d5b0',
              textShadow: '0 0 40px rgba(255,209,82,0.15), 0 4px 12px rgba(0,0,0,0.95)',
            }}
          >
            21
          </h1>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#7a6a50', letterSpacing: '0.4em', textTransform: 'uppercase', marginTop: 10 }}>
            Card Game
          </div>
        </div>

        {/* Ornamental divider */}
        <div ref={subtitleRef} className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,209,82,0.2), transparent)' }} />
          <span style={{ color: 'rgba(255,209,82,0.4)', fontSize: 12 }}>✦</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,209,82,0.2), transparent)' }} />
        </div>

        {/* Buttons */}
        <div ref={btnsRef} className="flex flex-col w-full max-w-xs" style={{ gap: 0 }}>

          {/* PRIMARY: Multiplayer */}
          <button
            className={btnBase}
            style={{
              fontSize: 20,
              padding: '16px 32px',
              letterSpacing: '0.04em',
              color: '#ffd152',
              background: 'rgba(255,209,82,0.06)',
              border: '1px solid rgba(255,209,82,0.45)',
              borderRadius: 4,
              width: '100%',
            }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { background: 'rgba(255,209,82,0.13)', borderColor: 'rgba(255,209,82,0.8)', color: '#ffe680', duration: 0.2 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { background: 'rgba(255,209,82,0.06)', borderColor: 'rgba(255,209,82,0.45)', color: '#ffd152', duration: 0.2 })}
            onClick={() => onStart({ mode: 'online' })}
          >
            Multiplayer
          </button>

          {/* Divider between primary and secondary */}
          <div style={{ height: 1, background: 'rgba(255,209,82,0.12)', margin: '16px 0' }} />

          {/* SECONDARY: VS AI */}
          <button
            className={btnBase}
            style={{
              fontSize: 18,
              padding: '13px 32px',
              letterSpacing: '0.04em',
              width: '100%',
              marginBottom: 8,
              color: '#e8d5b0',
              background: 'transparent',
              border: '1px solid rgba(232,213,176,0.2)',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { borderColor: 'rgba(232,213,176,0.5)', color: '#f5ead4', duration: 0.2 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { borderColor: 'rgba(232,213,176,0.2)', color: '#e8d5b0', duration: 0.2 })}
            onClick={() => onStart({ mode: 'ai' })}
          >
            Play vs AI
          </button>

          {/* SECONDARY: Hot-seat */}
          <button
            className={btnBase}
            style={{
              fontSize: 18,
              padding: '13px 32px',
              letterSpacing: '0.04em',
              width: '100%',
              color: '#e8d5b0',
              background: 'transparent',
              border: '1px solid rgba(232,213,176,0.2)',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, { borderColor: 'rgba(232,213,176,0.5)', color: '#f5ead4', duration: 0.2 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { borderColor: 'rgba(232,213,176,0.2)', color: '#e8d5b0', duration: 0.2 })}
            onClick={() => onStart({ mode: 'hotseat' })}
          >
            Local Duel
          </button>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,209,82,0.06)', margin: '14px 0' }} />

          {/* TERTIARY: small utility buttons */}
          <button
            className={btnBase}
            style={{ ...btnStyle, fontSize: 16, padding: '11px 24px', letterSpacing: '0.02em', width: '100%', opacity: 0.7, marginBottom: 6 }}
            onMouseEnter={hoverIn}
            onMouseLeave={hoverOut}
            onClick={() => onStart({ mode: 'assistant' })}
          >
            🃏 Real Game Assistant
          </button>

          {import.meta.env.VITE_MCP_URL && <button
            className={btnBase}
            style={{ ...btnStyle, fontSize: 16, padding: '11px 24px', letterSpacing: '0.02em', width: '100%', opacity: 0.7 }}
            onMouseEnter={hoverIn}
            onMouseLeave={hoverOut}
            onClick={() => onStart({ mode: 'llm' })}
          >
            ✦ Play vs Claude AI
          </button>}
        </div>

      </div>
    </div>
  );
}

function StartCard({ value, rotation }) {
  const isRed = value % 3 === 0 || value === 7 || value === 11;
  return (
    <div
      className="flex-shrink-0 rounded border border-stone-600/30"
      style={{
        width: 52,
        height: 72,
        transform: `rotate(${rotation}deg)`,
        background: '#f0e2c0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: 24,
          fontWeight: 700,
          color: isRed ? '#8b0000' : '#1a1008',
        }}
      >
        {value}
      </span>
    </div>
  );
}
