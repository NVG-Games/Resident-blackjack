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
    boxShadow: '0 0 40px rgba(139,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.5)',
    duration: 0.3,
  });
  const hoverOut = (e) => gsap.to(e.currentTarget, {
    boxShadow: '0 0 20px rgba(139,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
    duration: 0.3,
  });

  const btnStyle = {
    borderColor: '#8b0000',
    color: '#f0e2c0',
    background: 'linear-gradient(135deg, rgba(139,0,0,0.2), rgba(0,0,0,0.8))',
    boxShadow: '0 0 20px rgba(139,0,0,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
  };

  const btnBase = `font-cinzel text-sm font-bold tracking-[0.3em] uppercase
    px-10 py-4 rounded border-2 transition-all duration-200
    hover:scale-105 active:scale-95 w-full`;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1a0a04 0%, #0d0500 50%, #000000 100%)',
      }}
    >
      {/* Background horizontal lines texture */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(139,0,0,0.08) 40px, rgba(139,0,0,0.08) 41px)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }}
      />

      {/* Blood drips */}
      {[5, 15, 28, 42, 58, 71, 84, 93].map((left, i) => (
        <div key={i} className="absolute top-0 pointer-events-none"
          style={{ left: `${left}%` }}>
          <div
            style={{
              width: `${2 + (i % 3)}px`,
              height: `${20 + (i * 11) % 70}px`,
              background: 'linear-gradient(180deg, #8b0000, #4a0000cc, transparent)',
              borderRadius: '0 0 50% 50%',
              opacity: 0.5 + (i % 3) * 0.15,
            }}
          />
        </div>
      ))}

      {/* Decorative cards in background */}
      <div ref={cardsRef} className="absolute flex gap-4 opacity-15" style={{ top: '8%' }}>
        {[1, 5, 9, 3, 11, 7].map((val, i) => (
          <StartCard key={i} value={val} rotation={-15 + i * 6} />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center max-w-lg w-full">

        {/* Title */}
        <div ref={titleRef}>
          <div className="font-fell italic text-stone-500 text-sm tracking-[0.5em] uppercase mb-2">
            Lucas Baker presents
          </div>
          <h1
            className="font-cinzel font-black text-7xl md:text-8xl tracking-[0.2em] uppercase"
            style={{
              color: '#f0e2c0',
              textShadow: '0 0 20px rgba(139,0,0,0.7), 0 4px 8px rgba(0,0,0,0.9)',
            }}
          >
            21
          </h1>
          <div className="font-cinzel text-xs tracking-[0.8em] uppercase text-stone-500 mt-2">
            Resident Evil VII — Card Game
          </div>
        </div>

        {/* Ornamental divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #8b0000, transparent)' }} />
          <span className="text-red-900 text-xs">✦</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #8b0000, transparent)' }} />
        </div>

        {/* Subtitle */}
        <div ref={subtitleRef}>
          <p className="font-fell italic text-stone-400 text-base leading-relaxed">
            "A modified game of Blackjack. One deck, eleven cards numbered 1 through 11.
            No duplicates. You and your opponent share the same deck."
          </p>
          <p className="font-fell italic text-stone-600 text-sm mt-3">
            — Survive all three phases. Finger. Shock. Saw.
          </p>
        </div>

        {/* Phase grid */}
        <div className="grid grid-cols-3 gap-4 w-full text-center">
          {[
            { icon: '✂', phase: 'Finger', desc: 'No trump cards' },
            { icon: '⚡', phase: 'Shock', desc: 'Trumps introduced' },
            { icon: '⚙', phase: 'Saw', desc: 'One mistake ends it' },
          ].map(({ icon, phase, desc }) => (
            <div key={phase}
              className="p-3 rounded border border-stone-800 bg-black/30">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="font-cinzel text-xs text-stone-300 font-bold">{phase}</div>
              <div className="font-fell text-xs text-stone-600 italic">{desc}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div ref={btnsRef} className="flex flex-col gap-3 w-full max-w-xs">
          <button
            className={btnBase}
            style={btnStyle}
            onMouseEnter={hoverIn}
            onMouseLeave={hoverOut}
            onClick={() => onStart({ mode: 'ai' })}
          >
            Play vs AI
          </button>
          <button
            className={btnBase}
            style={{
              ...btnStyle,
              borderColor: '#5a3a00',
              background: 'linear-gradient(135deg, rgba(90,58,0,0.2), rgba(0,0,0,0.8))',
              boxShadow: '0 0 20px rgba(90,58,0,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
            }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, {
              boxShadow: '0 0 40px rgba(90,58,0,0.7), inset 0 0 20px rgba(0,0,0,0.5)',
              duration: 0.3,
            })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, {
              boxShadow: '0 0 20px rgba(90,58,0,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
              duration: 0.3,
            })}
            onClick={() => onStart({ mode: 'hotseat' })}
          >
            Play vs Yourself
          </button>
          <button
            className={btnBase}
            style={{
              ...btnStyle,
              borderColor: '#003a5a',
              background: 'linear-gradient(135deg, rgba(0,58,90,0.2), rgba(0,0,0,0.8))',
              boxShadow: '0 0 20px rgba(0,58,90,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
            }}
            onMouseEnter={(e) => gsap.to(e.currentTarget, {
              boxShadow: '0 0 40px rgba(0,80,140,0.7), inset 0 0 20px rgba(0,0,0,0.5)',
              duration: 0.3,
            })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, {
              boxShadow: '0 0 20px rgba(0,58,90,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
              duration: 0.3,
            })}
            onClick={() => onStart({ mode: 'online' })}
          >
            Multiplayer (P2P)
          </button>
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
