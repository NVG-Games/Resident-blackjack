import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { TRUMP_DEFINITIONS, PERMANENT_TRUMPS } from '../../engine/constants.js';
import { TRUMP_IMAGES } from '../../engine/trumpImages.js';

export default function TrumpCard({
  trump,
  onClick,
  disabled = false,
  isOnTable = false,
  isNew = false,
  size = 'hand', // 'hand' | 'table' | 'mini'
  className = '',
}) {
  const cardRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const def = TRUMP_DEFINITIONS[trump.type] || {};
  const isPermanent = PERMANENT_TRUMPS.has(trump.type);
  const imgSrc = TRUMP_IMAGES[trump.type];

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
        .to(cardRef.current, { scale: 1.1, duration: 0.1 })
        .to(cardRef.current, { scale: 1, duration: 0.12 });
    }
    onClick?.(trump);
  };

  const dims = {
    hand:  { w: 72,  h: 100, nameSz: '8px'  },
    table: { w: 56,  h: 78,  nameSz: '7px'  },
    mini:  { w: 38,  h: 52,  nameSz: '6px'  },
  }[size] || { w: 72, h: 100, nameSz: '8px' };

  return (
    <div className={`relative select-none ${className}`} style={{ display: 'inline-block' }}>
      <div
        ref={cardRef}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative transition-all duration-150 rounded ${
          disabled
            ? 'opacity-40 cursor-not-allowed'
            : isOnTable
              ? 'cursor-default'
              : 'cursor-pointer hover:scale-105 hover:-translate-y-1'
        }`}
        style={{
          width: dims.w,
          height: dims.h,
          boxShadow: isOnTable
            ? '0 0 12px rgba(245,158,11,0.5), 0 2px 8px rgba(0,0,0,0.7)'
            : '0 3px 12px rgba(0,0,0,0.8)',
        }}
      >
        {/* Wiki PNG image — fills the card */}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={def.name || trump.type}
            className="w-full h-full object-contain rounded"
            style={{
              imageRendering: 'auto',
              background: 'linear-gradient(135deg, #1a0a04, #0a0502)',
            }}
            draggable={false}
          />
        ) : (
          /* Fallback SVG if no image */
          <div
            className="w-full h-full rounded flex flex-col items-center justify-center gap-1"
            style={{ background: 'linear-gradient(135deg, #1a0a04, #0a0502)', border: '1px solid rgba(139,0,0,0.4)' }}
          >
            <span className="text-xl">{def.icon || '?'}</span>
            <span className="font-cinzel text-center text-stone-300 leading-tight px-1"
              style={{ fontSize: dims.nameSz }}>
              {def.name || trump.type}
            </span>
          </div>
        )}

        {/* On-table active indicator dot */}
        {isOnTable && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full
            shadow-[0_0_6px_rgba(245,158,11,0.9)] animate-pulse" />
        )}

        {/* Permanent badge */}
        {isPermanent && !isOnTable && size === 'hand' && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-0.5">
            <span className="bg-black/70 text-amber-400/80 rounded px-1"
              style={{ fontSize: '6px', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
              PERM
            </span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
          style={{ width: '200px' }}>
          <div className="bg-stone-950 border border-red-900/50 rounded-md p-3 shadow-2xl"
            style={{ boxShadow: '0 0 20px rgba(0,0,0,0.95)' }}>
            <div className="font-cinzel text-xs font-bold text-amber-300 mb-1">
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
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2
            w-2.5 h-2.5 bg-stone-950 border-r border-b border-red-900/50 rotate-45" />
        </div>
      )}
    </div>
  );
}
