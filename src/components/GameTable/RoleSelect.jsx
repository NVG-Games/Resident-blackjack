import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const CLANCY_PORTRAIT = (
  <svg viewBox="0 0 80 100" className="w-full h-full">
    {/* Body */}
    <rect x="20" y="60" width="40" height="40" rx="4" fill="#2a1a0a"/>
    {/* Head */}
    <ellipse cx="40" cy="38" rx="18" ry="20" fill="#c8956a"/>
    {/* Hair */}
    <ellipse cx="40" cy="20" rx="18" ry="10" fill="#3a2010"/>
    {/* Eyes */}
    <ellipse cx="33" cy="37" rx="3" ry="3.5" fill="#fff"/>
    <ellipse cx="47" cy="37" rx="3" ry="3.5" fill="#fff"/>
    <circle cx="33.5" cy="37.5" r="2" fill="#2a1a0a"/>
    <circle cx="47.5" cy="37.5" r="2" fill="#2a1a0a"/>
    {/* Mouth */}
    <path d="M34 47 Q40 51 46 47" stroke="#7a4030" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    {/* Camera */}
    <rect x="52" y="48" width="18" height="12" rx="2" fill="#1a1a1a"/>
    <circle cx="58" cy="54" r="3" fill="#333"/>
    <circle cx="58" cy="54" r="1.5" fill="#111"/>
    {/* Collar */}
    <path d="M28 60 L40 55 L52 60" fill="#1a1008" stroke="#333" strokeWidth="0.5"/>
    {/* Caption BG */}
    <rect x="0" y="88" width="80" height="12" rx="0" fill="rgba(0,0,0,0.6)"/>
  </svg>
);

const HOFFMAN_PORTRAIT = (
  <svg viewBox="0 0 80 100" className="w-full h-full">
    {/* Body — darker, meaner */}
    <rect x="20" y="60" width="40" height="40" rx="4" fill="#1a0a14"/>
    {/* Head */}
    <ellipse cx="40" cy="38" rx="18" ry="20" fill="#b07850"/>
    {/* Hair — receding */}
    <ellipse cx="40" cy="19" rx="15" ry="8" fill="#1a0a04"/>
    {/* Beard shadow */}
    <ellipse cx="40" cy="52" rx="12" ry="6" fill="#7a5030" opacity="0.5"/>
    {/* Eyes — narrower */}
    <ellipse cx="33" cy="36" rx="3" ry="2.5" fill="#fff"/>
    <ellipse cx="47" cy="36" rx="3" ry="2.5" fill="#fff"/>
    <circle cx="34" cy="36" r="2" fill="#1a0a0a"/>
    <circle cx="48" cy="36" r="2" fill="#1a0a0a"/>
    {/* Scar */}
    <path d="M36 28 L38 34" stroke="#8a3020" strokeWidth="1.5" strokeLinecap="round"/>
    {/* Stern mouth */}
    <path d="M34 47 Q40 46 46 47" stroke="#5a2a18" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    {/* Collar */}
    <path d="M28 60 L40 56 L52 60" fill="#0a0814" stroke="#333" strokeWidth="0.5"/>
    {/* Caption BG */}
    <rect x="0" y="88" width="80" height="12" rx="0" fill="rgba(0,0,0,0.6)"/>
  </svg>
);

export default function RoleSelect({ onConfirm, onBack }) {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRowRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(titleRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    )
    .fromTo(cardsRowRef.current.children,
      { y: 40, opacity: 0, scale: 0.85 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.15, ease: 'back.out(1.5)' },
      '-=0.2'
    );
  }, []);

  const handleChoose = (role) => {
    onConfirm({ mode: 'hotseat', playerRole: role });
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #120e09 0%, #080604 60%, #040302 100%)',
      }}
    >
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)' }}
      />

      <div className="relative z-10 flex flex-col items-center w-full text-center" style={{ padding: '24px 16px', gap: 28, maxWidth: 600, margin: '0 auto' }}>

        {/* Title */}
        <div ref={titleRef}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#5a5040', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
            Local Duel
          </div>
          <h2
            className="font-cinzel font-bold uppercase"
            style={{ fontSize: 28, color: '#e8d5b0', letterSpacing: '0.12em' }}
          >
            Who are you?
          </h2>
        </div>

        {/* Character cards — horizontal on wide, vertical on narrow */}
        <div
          ref={cardsRowRef}
          className="flex sm:flex-row flex-col items-stretch gap-3 w-full"
        >
          <RoleCard
            name="Clancy"
            subtitle="Goes First"
            accentColor="#7a6530"
            accentGlow="rgba(255,209,82,0.25)"
            portrait={CLANCY_PORTRAIT}
            onChoose={() => handleChoose('clancy')}
          />
          <RoleCard
            name="Hoffman"
            subtitle="Goes Second"
            accentColor="#4a4030"
            accentGlow="rgba(200,180,120,0.2)"
            portrait={HOFFMAN_PORTRAIT}
            onChoose={() => handleChoose('hoffman')}
          />
        </div>

        {/* Back */}
        <button
          onClick={onBack}
          style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#5a5040', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#e8d5b0'}
          onMouseLeave={e => e.currentTarget.style.color = '#5a5040'}
        >
          ← Back to menu
        </button>
      </div>
    </div>
  );
}

function RoleCard({ name, subtitle, accentColor, accentGlow, portrait, onChoose }) {
  const cardRef = useRef(null);

  const handleHover = (entering) => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: entering ? -4 : 0,
      boxShadow: entering
        ? `0 12px 40px ${accentGlow}, 0 0 0 1px rgba(255,209,82,0.2)`
        : `0 4px 20px rgba(0,0,0,0.8)`,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  return (
    <div
      ref={cardRef}
      className="flex-1 cursor-pointer select-none rounded-lg"
      style={{
        background: 'linear-gradient(160deg, #0e0c09, #080604)',
        border: `1px solid rgba(255,209,82,0.1)`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
        overflow: 'hidden',
      }}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      onClick={onChoose}
    >
      {/* Mobile: row layout (portrait left, info right) */}
      <div className="flex sm:flex-col items-center sm:items-center" style={{ gap: 0 }}>

        {/* Portrait */}
        <div
          className="flex-shrink-0 rounded-none sm:rounded-none overflow-hidden"
          style={{
            width: 80,
            height: 100,
            borderRight: `2px solid ${accentColor}`,
            borderBottom: 'none',
          }}
        >
          <div style={{ width: '100%', height: '100%' }}>{portrait}</div>
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 sm:items-center sm:text-center" style={{ padding: '14px 16px', gap: 10, alignItems: 'flex-start', textAlign: 'left' }}>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#e8d5b0' }}>
              {name}
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#7a6a50', marginTop: 3 }}>
              {subtitle}
            </div>
          </div>

          <button
            className="font-cinzel font-bold uppercase rounded border"
            style={{
              fontSize: 14, padding: '10px 16px', letterSpacing: '0.06em',
              borderColor: accentColor,
              color: '#f0e2c0',
              background: `linear-gradient(135deg, ${accentColor}33, rgba(0,0,0,0.8))`,
              whiteSpace: 'nowrap',
            }}
            onClick={(e) => { e.stopPropagation(); onChoose(); }}
          >
            I am {name}
          </button>
        </div>
      </div>
    </div>
  );
}
