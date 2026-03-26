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
        background: 'radial-gradient(ellipse at center, #1a0a04 0%, #0d0500 50%, #000000 100%)',
      }}
    >
      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)' }}
      />

      {/* Blood drips */}
      {[12, 35, 57, 80].map((left, i) => (
        <div key={i} className="absolute top-0 pointer-events-none" style={{ left: `${left}%` }}>
          <div style={{
            width: 2 + (i % 2),
            height: 30 + i * 15,
            background: 'linear-gradient(180deg, #8b0000cc, transparent)',
            borderRadius: '0 0 50% 50%',
            opacity: 0.5,
          }} />
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center gap-10 px-8 text-center">

        {/* Title */}
        <div ref={titleRef}>
          <div className="font-fell italic text-stone-500 text-sm tracking-[0.4em] uppercase mb-2">
            Hot-Seat Mode
          </div>
          <h2
            className="font-cinzel font-bold text-3xl tracking-[0.15em] uppercase"
            style={{ color: '#f0e2c0', textShadow: '0 0 20px rgba(139,0,0,0.5)' }}
          >
            Who are you?
          </h2>
          <p className="font-fell italic text-stone-500 text-sm mt-3">
            Choose your role. The other player will take turns on the same device.
          </p>
        </div>

        {/* Character cards */}
        <div ref={cardsRowRef} className="flex gap-8 items-stretch">

          {/* Clancy */}
          <RoleCard
            name="Clancy Jarvis"
            subtitle="The Cameraman"
            description="Deals first. You'll go first each round as Clancy."
            accentColor="#8b0000"
            accentGlow="rgba(139,0,0,0.6)"
            portrait={CLANCY_PORTRAIT}
            onChoose={() => handleChoose('clancy')}
          />

          {/* Divider */}
          <div className="flex flex-col items-center justify-center gap-3 px-2">
            <div className="w-px flex-1" style={{ background: 'linear-gradient(180deg, transparent, #4a1a1a, transparent)' }} />
            <span className="font-fell italic text-stone-600 text-sm">or</span>
            <div className="w-px flex-1" style={{ background: 'linear-gradient(180deg, transparent, #4a1a1a, transparent)' }} />
          </div>

          {/* Hoffman */}
          <RoleCard
            name="Hoffman"
            subtitle="The Survivor"
            description="Deals second. You'll go first each round as Hoffman."
            accentColor="#5a3a00"
            accentGlow="rgba(90,58,0,0.6)"
            portrait={HOFFMAN_PORTRAIT}
            onChoose={() => handleChoose('hoffman')}
          />
        </div>

        {/* Back */}
        <button
          onClick={onBack}
          className="font-fell italic text-stone-600 text-sm hover:text-stone-400 transition-colors"
        >
          ← Back to menu
        </button>
      </div>
    </div>
  );
}

function RoleCard({ name, subtitle, description, accentColor, accentGlow, portrait, onChoose }) {
  const cardRef = useRef(null);

  const handleHover = (entering) => {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, {
      y: entering ? -6 : 0,
      boxShadow: entering
        ? `0 12px 40px ${accentGlow}, 0 0 0 1px ${accentColor}`
        : `0 4px 20px rgba(0,0,0,0.8), 0 0 0 1px rgba(80,40,0,0.3)`,
      duration: 0.3,
      ease: 'power2.out',
    });
  };

  return (
    <div
      ref={cardRef}
      className="flex flex-col items-center gap-4 p-6 rounded-lg cursor-pointer select-none"
      style={{
        width: 180,
        background: 'linear-gradient(160deg, #120a04, #0a0502)',
        border: `1px solid rgba(80,40,0,0.3)`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 0 1px rgba(80,40,0,0.3)',
      }}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      onClick={onChoose}
    >
      {/* Portrait */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          width: 80,
          height: 100,
          border: `2px solid ${accentColor}`,
          boxShadow: `0 0 12px ${accentGlow}`,
        }}
      >
        {portrait}
      </div>

      {/* Name */}
      <div className="text-center">
        <div className="font-cinzel text-sm font-bold" style={{ color: '#f0e2c0' }}>
          {name}
        </div>
        <div className="font-fell italic text-xs text-stone-500 mt-0.5">
          {subtitle}
        </div>
      </div>

      {/* Description */}
      <p className="font-fell italic text-xs text-stone-500 text-center leading-relaxed">
        {description}
      </p>

      {/* Choose button */}
      <button
        className="font-cinzel text-xs font-bold tracking-widest uppercase px-4 py-2 rounded border transition-all duration-200 hover:scale-105 w-full"
        style={{
          borderColor: accentColor,
          color: '#f0e2c0',
          background: `linear-gradient(135deg, ${accentColor}33, rgba(0,0,0,0.8))`,
        }}
        onClick={(e) => { e.stopPropagation(); onChoose(); }}
      >
        I am {name.split(' ')[0]}
      </button>
    </div>
  );
}
