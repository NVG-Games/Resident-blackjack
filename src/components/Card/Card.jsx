import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// CSS keyframe for card deal-in — safe, never leaves transform artifacts
const DEAL_STYLE = document.createElement('style');
DEAL_STYLE.textContent = `
@keyframes cardDealIn {
  0%   { transform: translateY(-30px) scale(0.88); opacity: 0.6; }
  100% { transform: translateY(0)     scale(1);    opacity: 1; }
}
.card-deal-in {
  animation: cardDealIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
`;
if (!document.head.querySelector('#card-anim-style')) {
  DEAL_STYLE.id = 'card-anim-style';
  document.head.appendChild(DEAL_STYLE);
}

const SUIT_CONFIG = {
  spades:   { symbol: '♠', color: '#1a1510',  accent: '#2a2a3a', bg: '#f0eee8' },
  hearts:   { symbol: '♥', color: '#8b1a1a',  accent: '#6b1212', bg: '#fdf0f0' },
  diamonds: { symbol: '♦', color: '#7a4a00',  accent: '#5a3500', bg: '#fdf6e8' },
  clubs:    { symbol: '♣', color: '#1a3a1a',  accent: '#142814', bg: '#eef5ee' },
};

// SVG face for a number card — noir ivory style
function CardFace({ value, suit = 'spades' }) {
  const cfg = SUIT_CONFIG[suit] || SUIT_CONFIG.spades;
  const { symbol, color, accent, bg } = cfg;
  const filterId = `shadow-${value}-${suit}`;

  return (
    <svg viewBox="0 0 100 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId}>
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor={color} floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Card background */}
      <rect width="100" height="140" rx="5" ry="5" fill={bg} />

      {/* Outer border */}
      <rect x="2.5" y="2.5" width="95" height="135" rx="4" ry="4"
        fill="none" stroke={color} strokeWidth="1.2" />
      {/* Inner border */}
      <rect x="5" y="5" width="90" height="130" rx="3" ry="3"
        fill="none" stroke={color} strokeWidth="0.4" opacity="0.25" />

      {/* Corner value + suit — top left */}
      <text x="12" y="20" fontFamily="Cinzel, serif" fontSize="13" fontWeight="700"
        fill={color} textAnchor="middle">{value}</text>
      <text x="12" y="31" fontFamily="serif" fontSize="10"
        fill={color} textAnchor="middle">{symbol}</text>

      {/* Corner value + suit — bottom right (rotated) */}
      <g transform="rotate(180 50 70)">
        <text x="12" y="20" fontFamily="Cinzel, serif" fontSize="13" fontWeight="700"
          fill={color} textAnchor="middle">{value}</text>
        <text x="12" y="31" fontFamily="serif" fontSize="10"
          fill={color} textAnchor="middle">{symbol}</text>
      </g>

      {/* Center suit symbol — large decorative */}
      <text x="50" y="66" fontFamily="serif"
        fontSize="34" fontWeight="400"
        fill={accent}
        textAnchor="middle"
        dominantBaseline="middle"
        opacity="0.18"
      >{symbol}</text>

      {/* Center value - large */}
      <text x="50" y="84" fontFamily="Cinzel, serif"
        fontSize="52" fontWeight="900"
        fill={color}
        textAnchor="middle"
        dominantBaseline="middle"
        filter={`url(#${filterId})`}
      >{value}</text>

      {/* Thin decorative lines */}
      <line x1="14" y1="38" x2="86" y2="38" stroke={color} strokeWidth="0.4" opacity="0.15" />
      <line x1="14" y1="110" x2="86" y2="110" stroke={color} strokeWidth="0.4" opacity="0.15" />
    </svg>
  );
}

function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="noirDiag" patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M0,0 L8,8 M0,8 L8,0" stroke="rgba(255,209,82,0.07)" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1c1610" />
          <stop offset="100%" stopColor="#0e0b07" />
        </linearGradient>
      </defs>

      <rect width="100" height="140" rx="5" ry="5" fill="url(#backGrad)" />
      <rect x="4" y="4" width="92" height="132" rx="4" ry="4" fill="url(#noirDiag)" />

      {/* Gold border */}
      <rect x="2.5" y="2.5" width="95" height="135" rx="4" ry="4"
        fill="none" stroke="rgba(255,209,82,0.3)" strokeWidth="1" />
      <rect x="5" y="5" width="90" height="130" rx="3" ry="3"
        fill="none" stroke="rgba(255,209,82,0.1)" strokeWidth="0.6" />

      {/* Center emblem */}
      <circle cx="50" cy="70" r="18" fill="none" stroke="rgba(255,209,82,0.25)" strokeWidth="1" />
      <circle cx="50" cy="70" r="12" fill="none" stroke="rgba(255,209,82,0.12)" strokeWidth="0.6" />
      <text x="50" y="76" fontFamily="serif" fontSize="16"
        fill="rgba(255,209,82,0.35)" textAnchor="middle">✦</text>

      {/* Corner marks */}
      <text x="12" y="18" fontFamily="Cinzel, serif" fontSize="9"
        fill="rgba(255,209,82,0.3)" textAnchor="middle">21</text>
      <g transform="rotate(180 50 70)">
        <text x="12" y="18" fontFamily="Cinzel, serif" fontSize="9"
          fill="rgba(255,209,82,0.3)" textAnchor="middle">21</text>
      </g>
    </svg>
  );
}

export default function Card({
  card,
  faceDown = false,
  isNew = false,
  dealIndex = 0,
  animateFrom = null,
  className = '',
  onClick,
  highlight = false,
  size = 'md',
  suit = 'spades',
}) {
  const cardRef = useRef(null);
  const innerRef = useRef(null);

  // Flip animation when faceDown → false (hole card reveal).
  // JSX conditionally renders CardFace/CardBack, so on the reveal transition
  // React mounts CardFace before GSAP starts. We hide it immediately via
  // visibility:hidden on the wrapper, then unhide + animate in one tick.
  const prevFaceDown = useRef(faceDown);
  const flipPendingRef = useRef(false);

  useEffect(() => {
    if (!innerRef.current) return;
    if (prevFaceDown.current === true && faceDown === false) {
      flipPendingRef.current = true;
      // Hide before the browser paints the newly-mounted CardFace
      innerRef.current.style.visibility = 'hidden';
      // rAF: run after the browser has painted the hidden frame, then animate
      requestAnimationFrame(() => {
        if (!innerRef.current) return;
        innerRef.current.style.visibility = '';
        gsap.fromTo(innerRef.current,
          { rotateY: 90 },
          { rotateY: 0, duration: 0.4, ease: 'power2.out', clearProps: 'rotateY' }
        );
        flipPendingRef.current = false;
      });
    }
    prevFaceDown.current = faceDown;
  }, [faceDown]);

  // Highlight pulse — killed on unmount via cleanup
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (highlight) {
      gsap.to(el, {
        boxShadow: '0 0 25px rgba(255, 215, 0, 0.8)',
        scale: 1.06,
        duration: 0.6,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        overwrite: true,
      });
    } else {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'scale,boxShadow' });
    }
    return () => {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'scale,boxShadow' });
    };
  }, [highlight]);

  const cardW = size === 'sm' ? 'clamp(56px, 15vw, 72px)' : 'clamp(80px, 22vw, 110px)';
  const cardH = size === 'sm' ? 'clamp(78px, 21vw, 101px)' : 'clamp(112px, 31vw, 154px)';

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`relative cursor-pointer select-none ${isNew ? 'card-deal-in' : ''} ${className}`}
      style={{
        width: cardW,
        height: cardH,
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
          borderRadius: '6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        {faceDown ? <CardBack /> : <CardFace value={card?.value} suit={suit} />}
      </div>
    </div>
  );
}
