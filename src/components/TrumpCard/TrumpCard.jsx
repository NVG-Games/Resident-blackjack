import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { TRUMP_DEFINITIONS, PERMANENT_TRUMPS, TRUMP_TYPES } from '../../engine/constants.js';

// Visual theme for each trump category
const TRUMP_THEMES = {
  // Bet-raising (red/crimson)
  [TRUMP_TYPES.ONE_UP]: { gradient: ['#7b0000', '#3d0000'], border: '#cc2200', symbol: '↑' },
  [TRUMP_TYPES.TWO_UP]: { gradient: ['#8b0000', '#4a0000'], border: '#cc2200', symbol: '↑↑' },
  [TRUMP_TYPES.TWO_UP_PLUS]: { gradient: ['#9b0000', '#5a0000'], border: '#ff2200', symbol: '↑+' },
  // Shield (blue)
  [TRUMP_TYPES.SHIELD]: { gradient: ['#0d2a5c', '#061520'], border: '#2255aa', symbol: '⬡' },
  [TRUMP_TYPES.SHIELD_PLUS]: { gradient: ['#0d1a4c', '#040e20'], border: '#1144aa', symbol: '⬡+' },
  // Destroy (orange)
  [TRUMP_TYPES.DESTROY]: { gradient: ['#5c2a00', '#2a1000'], border: '#cc5500', symbol: '✕' },
  [TRUMP_TYPES.DESTROY_PLUS]: { gradient: ['#6c3a00', '#3a1500'], border: '#dd6600', symbol: '✕+' },
  [TRUMP_TYPES.DESTROY_PLUS_PLUS]: { gradient: ['#7c4a00', '#4a2000'], border: '#ee7700', symbol: '✕++' },
  // Go For (gold)
  [TRUMP_TYPES.GO_FOR_17]: { gradient: ['#4a3800', '#241c00'], border: '#aa8800', symbol: '17' },
  [TRUMP_TYPES.GO_FOR_24]: { gradient: ['#4a3800', '#241c00'], border: '#cc9900', symbol: '24' },
  [TRUMP_TYPES.GO_FOR_27]: { gradient: ['#5a4800', '#2a2000'], border: '#ddaa00', symbol: '27' },
  // Draw (green)
  [TRUMP_TYPES.PERFECT_DRAW]: { gradient: ['#003822', '#001510'], border: '#007744', symbol: '★' },
  [TRUMP_TYPES.PERFECT_DRAW_PLUS]: { gradient: ['#003822', '#001510'], border: '#008855', symbol: '★+' },
  [TRUMP_TYPES.ULTIMATE_DRAW]: { gradient: ['#004822', '#001f10'], border: '#009966', symbol: '★★' },
  // Number cards (dark blue)
  [TRUMP_TYPES.CARD_2]: { gradient: ['#0a1a3c', '#050e20'], border: '#224488', symbol: '2' },
  [TRUMP_TYPES.CARD_3]: { gradient: ['#0a1a3c', '#050e20'], border: '#224488', symbol: '3' },
  [TRUMP_TYPES.CARD_4]: { gradient: ['#0a1a3c', '#050e20'], border: '#224488', symbol: '4' },
  [TRUMP_TYPES.CARD_5]: { gradient: ['#0a1a3c', '#050e20'], border: '#224488', symbol: '5' },
  [TRUMP_TYPES.CARD_6]: { gradient: ['#0a1a3c', '#050e20'], border: '#224488', symbol: '6' },
  [TRUMP_TYPES.CARD_7]: { gradient: ['#0a1a3c', '#050e20'], border: '#224488', symbol: '7' },
  // Misc
  [TRUMP_TYPES.REMOVE]: { gradient: ['#5c0000', '#2a0000'], border: '#cc0000', symbol: '✗' },
  [TRUMP_TYPES.RETURN]: { gradient: ['#003c1c', '#001a0d'], border: '#006633', symbol: '↩' },
  [TRUMP_TYPES.EXCHANGE]: { gradient: ['#3c0048', '#1c0024'], border: '#880099', symbol: '⇄' },
  [TRUMP_TYPES.TRUMP_SWITCH]: { gradient: ['#3c2000', '#1c0e00'], border: '#884400', symbol: '⟳' },
  [TRUMP_TYPES.TRUMP_SWITCH_PLUS]: { gradient: ['#4c2800', '#221200'], border: '#995500', symbol: '⟳+' },
  [TRUMP_TYPES.HARVEST]: { gradient: ['#1a3c00', '#0d1e00'], border: '#448800', symbol: '✿' },
  [TRUMP_TYPES.DESIRE]: { gradient: ['#3c0048', '#1a0020'], border: '#880088', symbol: '♥' },
  [TRUMP_TYPES.DESIRE_PLUS]: { gradient: ['#4c0058', '#220028'], border: '#990099', symbol: '♥+' },
  [TRUMP_TYPES.MIND_SHIFT]: { gradient: ['#002244', '#001020'], border: '#004488', symbol: '◎' },
  [TRUMP_TYPES.MIND_SHIFT_PLUS]: { gradient: ['#003254', '#001828'], border: '#005599', symbol: '◎+' },
  [TRUMP_TYPES.CONJURE]: { gradient: ['#200048', '#0e0020'], border: '#5500aa', symbol: '✦' },
  [TRUMP_TYPES.BLACK_MAGIC]: { gradient: ['#0a0a0a', '#050505'], border: '#444444', symbol: '⬟' },
  [TRUMP_TYPES.ESCAPE]: { gradient: ['#003820', '#001a0e'], border: '#007740', symbol: '➜' },
  [TRUMP_TYPES.TWENTY_ONE_UP]: { gradient: ['#6c0000', '#3a0000'], border: '#cc0000', symbol: '21↑' },
  [TRUMP_TYPES.OBLIVION]: { gradient: ['#0a0a20', '#050510'], border: '#333366', symbol: '∅' },
  [TRUMP_TYPES.DEAD_SILENCE]: { gradient: ['#0a0a0a', '#050505'], border: '#333333', symbol: '◇' },
  [TRUMP_TYPES.DESPERATION]: { gradient: ['#3c0000', '#1a0000'], border: '#880000', symbol: '☠' },
  [TRUMP_TYPES.HAPPINESS]: { gradient: ['#3c3800', '#1e1c00'], border: '#887700', symbol: '☺' },
  [TRUMP_TYPES.CURSE]: { gradient: ['#380048', '#1c0024'], border: '#770099', symbol: '†' },
  [TRUMP_TYPES.LOVE_YOUR_ENEMY]: { gradient: ['#4c0000', '#220000'], border: '#880000', symbol: '❤' },
  [TRUMP_TYPES.SHIELD_ASSAULT]: { gradient: ['#3c1400', '#1c0800'], border: '#884400', symbol: '🛡✕' },
  [TRUMP_TYPES.SHIELD_ASSAULT_PLUS]: { gradient: ['#4c1c00', '#220a00'], border: '#995500', symbol: '🛡✕+' },
  [TRUMP_TYPES.EXCHANGE]: { gradient: ['#300040', '#180020'], border: '#770088', symbol: '⇄' },
};

function getTheme(type) {
  return TRUMP_THEMES[type] || { gradient: ['#1a1008', '#0a0804'], border: '#4a3a2a', symbol: '?' };
}

export default function TrumpCard({
  trump,
  onClick,
  disabled = false,
  isOnTable = false,
  isNew = false,
  size = 'hand',
  className = '',
}) {
  const cardRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const def = TRUMP_DEFINITIONS[trump.type] || {};
  const isPermanent = PERMANENT_TRUMPS.has(trump.type);
  const theme = getTheme(trump.type);

  useEffect(() => {
    if (isNew && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { scale: 0, opacity: 0, rotateZ: -20 },
        { scale: 1, opacity: 1, rotateZ: 0, duration: 0.45, ease: 'back.out(1.8)' }
      );
    }
  }, [isNew]);

  const handleClick = () => {
    if (disabled || isOnTable) return;
    if (cardRef.current) {
      gsap.timeline()
        .to(cardRef.current, { scale: 0.92, duration: 0.08 })
        .to(cardRef.current, { scale: 1.08, duration: 0.1 })
        .to(cardRef.current, { scale: 1, duration: 0.12 });
    }
    onClick?.(trump);
  };

  const dims = {
    hand: { w: 68, h: 96, nameSz: '8px', symSz: '20px' },
    table: { w: 54, h: 76, nameSz: '7px', symSz: '15px' },
    mini: { w: 38, h: 52, nameSz: '6px', symSz: '10px' },
  }[size] || { w: 68, h: 96, nameSz: '8px', symSz: '20px' };

  const uniqueId = `trump-${trump.id}`.replace(/[^a-zA-Z0-9-]/g, '-');

  return (
    <div className={`relative select-none ${className}`} style={{ display: 'inline-block' }}>
      <div
        ref={cardRef}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative transition-all duration-150 ${
          disabled ? 'opacity-40 cursor-not-allowed' :
          isOnTable ? 'cursor-default' :
          'cursor-pointer hover:scale-105 hover:-translate-y-1'
        }`}
        style={{ width: dims.w, height: dims.h }}
      >
        <svg
          viewBox="0 0 68 96"
          width={dims.w}
          height={dims.h}
          xmlns="http://www.w3.org/2000/svg"
          style={{ borderRadius: '5px', display: 'block' }}
        >
          <defs>
            <linearGradient id={`bg-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.gradient[0]} />
              <stop offset="100%" stopColor={theme.gradient[1]} />
            </linearGradient>
            <filter id={`glow-${uniqueId}`}>
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id={`hatch-${uniqueId}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width="68" height="96" rx="5" ry="5" fill={`url(#bg-${uniqueId})`} />
          <rect width="68" height="96" rx="5" ry="5" fill={`url(#hatch-${uniqueId})`} />

          {/* Outer border */}
          <rect x="1" y="1" width="66" height="94" rx="4" ry="4"
            fill="none" stroke={theme.border} strokeWidth="1.5" opacity="0.8" />

          {/* Inner border */}
          <rect x="3" y="3" width="62" height="90" rx="3" ry="3"
            fill="none" stroke={theme.border} strokeWidth="0.5" opacity="0.3" />

          {/* Corner ornaments */}
          <circle cx="6" cy="6" r="1.5" fill={theme.border} opacity="0.5" />
          <circle cx="62" cy="6" r="1.5" fill={theme.border} opacity="0.5" />
          <circle cx="6" cy="90" r="1.5" fill={theme.border} opacity="0.5" />
          <circle cx="62" cy="90" r="1.5" fill={theme.border} opacity="0.5" />

          {/* Permanent badge */}
          {isPermanent && size !== 'mini' && (
            <>
              <rect x="4" y="4" width="20" height="10" rx="2" fill={theme.border} opacity="0.3" />
              <text x="14" y="12" fontFamily="Cinzel, serif" fontSize="6" fontWeight="600"
                fill={theme.border} textAnchor="middle">PERM</text>
            </>
          )}

          {/* On-table indicator */}
          {isOnTable && (
            <circle cx="62" cy="6" r="4" fill="#f59e0b" opacity="0.9"
              filter={`url(#glow-${uniqueId})`} />
          )}

          {/* Center symbol */}
          <text
            x="34" y="58"
            fontFamily="Cinzel, serif"
            fontSize={size === 'mini' ? '12' : '22'}
            fontWeight="700"
            fill={theme.border}
            textAnchor="middle"
            dominantBaseline="middle"
            filter={`url(#glow-${uniqueId})`}
            opacity="0.9"
          >
            {def.icon || '?'}
          </text>

          {/* Decorative line */}
          <line x1="10" y1="68" x2="58" y2="68" stroke={theme.border} strokeWidth="0.5" opacity="0.4" />

          {/* Card name */}
          <text
            x="34" y="82"
            fontFamily="Cinzel, serif"
            fontSize={size === 'mini' ? '6' : '7.5'}
            fontWeight="600"
            fill="rgba(240,226,192,0.9)"
            textAnchor="middle"
          >
            {def.name?.substring(0, 12) || trump.type}
          </text>

          {/* Top label */}
          <text x="34" y="20"
            fontFamily="Cinzel, serif"
            fontSize="6"
            fill={theme.border}
            textAnchor="middle"
            opacity="0.7"
          >
            TRUMP
          </text>
        </svg>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
          style={{ width: '200px' }}>
          <div className="bg-stone-950 border border-red-900/50 rounded-md p-3 shadow-2xl"
            style={{ boxShadow: `0 0 20px rgba(0,0,0,0.9), 0 0 10px ${theme.border}44` }}>
            <div className="font-cinzel text-xs font-bold mb-1" style={{ color: theme.border }}>
              {def.name}
            </div>
            <div className="font-fell text-xs text-stone-300 italic leading-relaxed">
              {def.description}
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-stone-600 font-fell">
              <span>{isPermanent ? '📌' : '⚡'}</span>
              <span>{isPermanent ? 'Stays on table' : 'Instant effect'}</span>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2
            w-2.5 h-2.5 bg-stone-950 border-r border-b border-red-900/50 rotate-45" />
        </div>
      )}
    </div>
  );
}
