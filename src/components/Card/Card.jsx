import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// SVG face for a number card
function CardFace({ value }) {
  const isRed = value % 3 === 0 || value === 7 || value === 11;
  const color = isRed ? '#8b0000' : '#1a1008';
  const accentColor = isRed ? '#cc2200' : '#2d1f0d';

  return (
    <svg viewBox="0 0 100 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={`shadow-${value}`}>
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
        </filter>
        <pattern id={`grain-${value}`} patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M0,0 L4,4 M0,4 L4,0" stroke="#00000010" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Card background */}
      <rect width="100" height="140" rx="6" ry="6" fill="#f0e2c0" />
      <rect width="100" height="140" rx="6" ry="6" fill={`url(#grain-${value})`} />

      {/* Border */}
      <rect x="2" y="2" width="96" height="136" rx="5" ry="5"
        fill="none" stroke={accentColor} strokeWidth="1.5" />
      <rect x="4" y="4" width="92" height="132" rx="4" ry="4"
        fill="none" stroke={accentColor} strokeWidth="0.5" opacity="0.5" />

      {/* Corner decorations */}
      <circle cx="8" cy="8" r="2" fill={accentColor} opacity="0.4" />
      <circle cx="92" cy="8" r="2" fill={accentColor} opacity="0.4" />
      <circle cx="8" cy="132" r="2" fill={accentColor} opacity="0.4" />
      <circle cx="92" cy="132" r="2" fill={accentColor} opacity="0.4" />

      {/* Corner value - top left */}
      <text x="10" y="22" fontFamily="Cinzel, serif" fontSize="14" fontWeight="700"
        fill={color} textAnchor="middle">{value}</text>

      {/* Corner value - bottom right (rotated) */}
      <g transform="rotate(180 50 70)">
        <text x="10" y="22" fontFamily="Cinzel, serif" fontSize="14" fontWeight="700"
          fill={color} textAnchor="middle">{value}</text>
      </g>

      {/* Center value - large */}
      <text x="50" y="82" fontFamily="Cinzel Decorative, Cinzel, serif"
        fontSize="44" fontWeight="700"
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
        filter={`url(#shadow-${value})`}
      >{value}</text>

      {/* Decorative lines */}
      <line x1="15" y1="30" x2="85" y2="30" stroke={accentColor} strokeWidth="0.5" opacity="0.3" />
      <line x1="15" y1="110" x2="85" y2="110" stroke={accentColor} strokeWidth="0.5" opacity="0.3" />

      {/* Suit symbols (using card suit patterns) */}
      <text x="50" y="115" fontFamily="serif" fontSize="8"
        fill={accentColor} textAnchor="middle" opacity="0.6">✦  ✦  ✦</text>
    </svg>
  );
}

function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="10" height="10">
          <path d="M0,0 L10,10 M0,10 L10,0" stroke="#3d0000" strokeWidth="0.8" />
        </pattern>
        <radialGradient id="backGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a0000" />
          <stop offset="100%" stopColor="#0d0000" />
        </radialGradient>
      </defs>

      <rect width="100" height="140" rx="6" ry="6" fill="url(#backGrad)" />
      <rect x="5" y="5" width="90" height="130" rx="4" ry="4" fill="url(#crosshatch)" opacity="0.4" />

      {/* Ornate border */}
      <rect x="3" y="3" width="94" height="134" rx="5" ry="5"
        fill="none" stroke="#6b0000" strokeWidth="1.5" />
      <rect x="6" y="6" width="88" height="128" rx="4" ry="4"
        fill="none" stroke="#8b0000" strokeWidth="0.8" opacity="0.6" />

      {/* Center emblem */}
      <circle cx="50" cy="70" r="20" fill="none" stroke="#8b0000" strokeWidth="1.5" />
      <circle cx="50" cy="70" r="15" fill="none" stroke="#6b0000" strokeWidth="0.8" opacity="0.6" />

      {/* Biohazard-ish symbol */}
      <text x="50" y="78" fontFamily="serif" fontSize="22"
        fill="#8b0000" textAnchor="middle">☣</text>

      {/* Corner marks */}
      <text x="12" y="18" fontFamily="Cinzel, serif" fontSize="9"
        fill="#8b0000" textAnchor="middle">21</text>
      <g transform="rotate(180 50 70)">
        <text x="12" y="18" fontFamily="Cinzel, serif" fontSize="9"
          fill="#8b0000" textAnchor="middle">21</text>
      </g>
    </svg>
  );
}

export default function Card({
  card,
  faceDown = false,
  isNew = false,
  dealIndex = 0, // used to re-trigger enter animation when a new card at this slot appears
  animateFrom = null, // { x, y } for deal animation
  className = '',
  onClick,
  highlight = false,
}) {
  const cardRef = useRef(null);
  const innerRef = useRef(null);

  // Run enter animation on mount (card is new to the DOM) or when dealIndex changes
  // We use card.id as a stable dep — when a new card replaces a slot, card.id changes → re-runs
  useEffect(() => {
    if (!cardRef.current || !isNew) return;

    if (animateFrom) {
      gsap.fromTo(cardRef.current,
        { x: animateFrom.x, y: animateFrom.y, opacity: 0, scale: 0.6 },
        { x: 0, y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
      );
    } else {
      gsap.fromTo(cardRef.current,
        { y: -60, opacity: 0, scale: 0.7, rotation: -5 },
        { y: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.2)' }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, isNew, animateFrom]);

  // Flip animation when faceDown changes to false
  const prevFaceDown = useRef(faceDown);
  useEffect(() => {
    if (prevFaceDown.current === true && faceDown === false && innerRef.current) {
      gsap.fromTo(innerRef.current,
        { rotateY: 180 },
        { rotateY: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
    prevFaceDown.current = faceDown;
  }, [faceDown]);

  // Highlight pulse
  useEffect(() => {
    if (highlight && cardRef.current) {
      gsap.to(cardRef.current, {
        boxShadow: '0 0 25px rgba(255, 215, 0, 0.8)',
        scale: 1.06,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    } else if (cardRef.current) {
      gsap.killTweensOf(cardRef.current);
      gsap.to(cardRef.current, { boxShadow: '0 4px 20px rgba(0,0,0,0.8)', scale: 1, duration: 0.2 });
    }
  }, [highlight]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`relative cursor-pointer select-none ${className}`}
      style={{
        width: 'clamp(52px, 12vw, 80px)',
        height: 'clamp(73px, 17vw, 112px)',
        perspective: '600px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          borderRadius: '6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        {faceDown ? <CardBack /> : <CardFace value={card?.value} />}
      </div>
    </div>
  );
}
