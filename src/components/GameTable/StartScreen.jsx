import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function StartScreen({ onStart }) {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const btnRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(cardsRef.current,
      { y: 60, opacity: 0, rotateX: 20 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1, ease: 'power3.out' }
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
    .fromTo(btnRef.current,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      '-=0.2'
    );

    // Pulse blood glow on title
    gsap.to(titleRef.current, {
      textShadow: '0 0 40px rgba(139,0,0,0.9), 0 0 80px rgba(80,0,0,0.5)',
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
      delay: 1.5,
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #120e09 0%, #080604 60%, #040302 100%)' }}
    >
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,209,82,0.04) 60px, rgba(255,209,82,0.04) 61px)' }}
      />
      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.85) 100%)' }}
      />

      {/* Decorative cards */}
      <div ref={cardsRef} className="absolute flex gap-4 opacity-15" style={{ top: '6%' }}>
        {[1, 5, 9, 3, 11, 7].map((val, i) => (
          <StartCard key={i} value={val} rotation={-15 + i * 6} />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">

        <div ref={titleRef}>
          <h1 className="font-cinzel font-black tracking-[0.2em] uppercase"
            style={{ fontSize: 'clamp(72px,12vw,100px)', lineHeight: 1, color: '#e8d5b0', textShadow: '0 0 40px rgba(255,209,82,0.15), 0 4px 12px rgba(0,0,0,0.95)' }}>
            21
          </h1>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#5a5040', letterSpacing: '0.4em', textTransform: 'uppercase', marginTop: 10 }}>
            Card Game
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,209,82,0.2), transparent)' }} />
          <span style={{ color: 'rgba(255,209,82,0.4)', fontSize: 12 }}>✦</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,209,82,0.2), transparent)' }} />
        </div>

        {/* Description */}
        <div ref={subtitleRef} style={{ maxWidth: 400 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#7a6a50', lineHeight: 1.7, fontStyle: 'italic' }}>
            One deck. Eleven cards. No duplicates. You and your opponent share the same deck.
          </p>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#5a4a38', marginTop: 10, fontStyle: 'italic' }}>
            Survive all three phases — Finger, Shock, Saw.
          </p>
        </div>

        {/* Phase grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 360, width: '100%' }}>
          {[
            { icon: '✂', phase: 'Finger', desc: 'No trumps' },
            { icon: '⚡', phase: 'Shock', desc: 'Trumps active' },
            { icon: '⚙', phase: 'Saw', desc: 'High stakes' },
          ].map(({ icon, phase, desc }) => (
            <div key={phase} style={{ padding: '12px 8px', borderRadius: 4, border: '1px solid rgba(255,209,82,0.08)', background: 'rgba(0,0,0,0.3)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#e8d5b0', fontWeight: 700, letterSpacing: '0.1em' }}>{phase}</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#5a4a38', marginTop: 4, fontStyle: 'italic' }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Start button */}
        <button
          ref={btnRef}
          onClick={onStart}
          className="font-cinzel font-bold uppercase hover:scale-105 active:scale-95 transition-all duration-200"
          style={{
            fontSize: 24, letterSpacing: '0.08em', padding: '17px 52px', borderRadius: 4,
            color: '#ffd152', background: 'rgba(255,209,82,0.06)', border: '1px solid rgba(255,209,82,0.4)',
          }}
          onMouseEnter={e => gsap.to(e.currentTarget, { background: 'rgba(255,209,82,0.12)', borderColor: 'rgba(255,209,82,0.7)', duration: 0.2 })}
          onMouseLeave={e => gsap.to(e.currentTarget, { background: 'rgba(255,209,82,0.06)', borderColor: 'rgba(255,209,82,0.4)', duration: 0.2 })}
        >
          Begin the Game
        </button>

        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#4a3a28', fontStyle: 'italic' }}>
          You play first. Your opponent goes second.
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
        width: 60,
        height: 84,
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
          fontSize: 28,
          fontWeight: 700,
          color: isRed ? '#8b0000' : '#1a1008',
        }}
      >
        {value}
      </span>
    </div>
  );
}
