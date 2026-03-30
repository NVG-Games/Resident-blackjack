import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
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

  // Close confirm if card becomes disabled (turn ended)
  useEffect(() => {
    if (disabled) setShowConfirm(false);
  }, [disabled]);


  const handleClick = () => {
    setShowTooltip(false);
    if (isOnTable || disabled) {
      setShowInfo(true);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmUse = (e) => {
    e.stopPropagation();
    setShowConfirm(false);
    if (cardRef.current) {
      gsap.timeline()
        .to(cardRef.current, { scale: 0.92, duration: 0.08 })
        .to(cardRef.current, { scale: 1.1, duration: 0.1 })
        .to(cardRef.current, { scale: 1, duration: 0.12 });
    }
    onClick?.(trump);
  };

  const handleCancelUse = (e) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  // Slightly larger on mobile via clamp — hand cards are tap targets
  const dims = {
    hand:  { w: 'clamp(88px,23vw,110px)',  h: 'clamp(122px,32vw,154px)', nameSz: '10px'  },
    table: { w: 'clamp(58px,15vw,76px)',   h: 'clamp(80px,21vw,106px)',  nameSz: '9px'   },
    mini:  { w: 48,                         h: 66,                         nameSz: '7px'   },
  }[size] || { w: 'clamp(88px,23vw,110px)', h: 'clamp(122px,32vw,154px)', nameSz: '10px' };

  return (
    <div className={`relative select-none ${className}`} style={{ display: 'inline-block' }}>
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onMouseEnter={() => {
          if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
          }
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={(e) => { e.stopPropagation(); setShowTooltip(true); }}
        onTouchEnd={(e) => { e.stopPropagation(); setTimeout(() => setShowTooltip(false), 1500); }}
        className={`relative transition-all duration-150 rounded ${
          disabled
            ? 'opacity-40 cursor-pointer'
            : isOnTable
              ? 'cursor-pointer hover:scale-105'
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
            background: 'linear-gradient(135deg, #0e0c09, #080604)',
          }}
            draggable={false}
          />
        ) : (
          /* Fallback SVG if no image */
          <div
            className="w-full h-full rounded flex flex-col items-center justify-center gap-1"
            style={{ background: 'linear-gradient(135deg, #0e0c09, #080604)', border: '1px solid rgba(255,209,82,0.12)' }}
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

      {/* Tooltip — desktop hover, rendered via portal so it's never clipped by overflow:hidden */}
      {showTooltip && !showConfirm && !isOnTable && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            width: 220,
          }}
        >
          <div style={{
            background: '#0e0c09',
            borderRadius: 8,
            padding: '12px 14px',
            boxShadow: '0 0 24px rgba(0,0,0,0.98)',
            border: '1px solid rgba(255,209,82,0.2)',
          }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
              {def.name}
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#c4b9a8', lineHeight: 1.55 }}>
              {def.description}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontFamily: 'Cinzel, serif', fontSize: 12, color: '#7a6a50' }}>
              <span>{isPermanent ? '📌' : '⚡'}</span>
              <span>{isPermanent ? 'Stays on table' : 'Instant effect'}</span>
            </div>
          </div>
          <div style={{
            position: 'absolute',
            bottom: -5,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 10, height: 10,
            background: '#0e0c09',
            borderRight: '1px solid rgba(255,209,82,0.2)',
            borderBottom: '1px solid rgba(255,209,82,0.2)',
          }} />
        </div>,
        document.body
      )}

      {/* Info modal — for table cards (read-only) */}
      {showInfo && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowInfo(false)}
        >
          <div
            style={{ width: 'min(90vw, 420px)', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: '#0e0c09',
              border: '1px solid rgba(255,209,82,0.25)',
              borderRadius: 12,
              boxShadow: '0 16px 64px rgba(0,0,0,0.98)',
              overflow: 'hidden',
            }}>
              {imgSrc && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24, paddingBottom: 4 }}>
                  <img src={imgSrc} alt={def.name} style={{ width: 90, height: 126, objectFit: 'contain', borderRadius: 6 }} />
                </div>
              )}
              <div style={{ padding: '20px 28px 28px' }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 26, fontWeight: 700, color: '#ffd152', marginBottom: 12 }}>
                  {def.name || trump.type}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#e8d5b0', lineHeight: 1.65 }}>
                  {def.description || '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18, fontFamily: 'Cinzel, serif', fontSize: 16, color: '#7a6a50' }}>
                  <span>{isPermanent ? '📌' : '⚡'}</span>
                  <span style={{ color: '#fbbf24' }}>{isPermanent ? 'Active this round' : 'Instant effect'}</span>
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,209,82,0.1)' }}>
                <button
                  onClick={() => setShowInfo(false)}
                  style={{
                    width: '100%', padding: '18px', fontFamily: 'Cinzel, serif', fontSize: 18,
                    fontWeight: 700, color: '#ffd152', background: 'rgba(255,209,82,0.06)',
                    border: 'none', cursor: 'pointer',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,209,82,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,209,82,0.06)'}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm modal */}
      {showConfirm && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleCancelUse}
        >
          <div
            style={{ width: 'min(90vw, 420px)', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: '#0e0c09',
              border: '1px solid rgba(255,209,82,0.25)',
              borderRadius: 12,
              boxShadow: '0 16px 64px rgba(0,0,0,0.98)',
              overflow: 'hidden',
            }}>
              {/* Card info */}
              <div style={{ padding: '28px 28px 20px' }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 32, fontWeight: 700, color: '#ffd152', marginBottom: 14 }}>
                  {def.name || trump.type}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#e8d5b0', lineHeight: 1.6 }}>
                  {def.description || '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18, fontFamily: 'Cinzel, serif', fontSize: 18, color: '#7a6a50' }}>
                  <span>{isPermanent ? '📌' : '⚡'}</span>
                  <span>{isPermanent ? 'Stays on table' : 'Instant effect'}</span>
                </div>
              </div>
              {/* Action buttons */}
              <div style={{ display: 'flex', borderTop: '1px solid rgba(255,209,82,0.1)' }}>
                <button
                  onClick={handleCancelUse}
                  style={{
                    flex: 1, padding: '18px', fontFamily: 'Cinzel, serif', fontSize: 18,
                    color: '#7a6a50', background: 'none', border: 'none',
                    borderRight: '1px solid rgba(255,209,82,0.1)', cursor: 'pointer',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#e8d5b0'}
                  onMouseLeave={e => e.currentTarget.style.color = '#7a6a50'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUse}
                  style={{
                    flex: 1, padding: '18px', fontFamily: 'Cinzel, serif', fontSize: 18,
                    fontWeight: 700, color: '#ffd152', background: 'rgba(255,209,82,0.08)',
                    border: 'none', cursor: 'pointer',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,209,82,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,209,82,0.08)'}
                >
                  Use it
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
