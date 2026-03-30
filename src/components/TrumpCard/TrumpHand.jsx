import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import TrumpCard from './TrumpCard.jsx';
import { ROUND_STATE } from '../../engine/gameState.js';

export default function TrumpHand({ trumps, onPlay, disabled, roundState, forceCanPlay = false, isGuestTurn = false }) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  // Trumps can be played anytime it's your turn, including after standing.
  // For online guest their turn is BOT_TURN, not PLAYER_TURN — isGuestTurn handles that.
  const isYourTurn = roundState === ROUND_STATE.PLAYER_TURN || isGuestTurn;
  const canPlay = forceCanPlay || (!disabled && isYourTurn);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.25 }
      );
    }
  }, []);

  const handlePlay = (trump) => {
    setOpen(false);
    onPlay?.(trump);
  };

  if (trumps.length === 0) return null;

  return (
    <div ref={containerRef}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          background: canPlay ? 'rgba(255,209,82,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid rgba(255,209,82,${canPlay ? '0.2' : '0.07'})`,
          borderRadius: 8,
          cursor: 'pointer',
          padding: '14px 16px',
        }}
      >
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700, color: canPlay ? '#ffd152' : '#7a6a50', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Trumps
        </span>
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: canPlay ? '#ffd152' : '#7a6a50' }}>
          ({trumps.length})
        </span>
        {/* Mini card previews */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
          {trumps.slice(0, 5).map((_, i) => (
            <div key={i} style={{
              width: 12, height: 18, borderRadius: 2,
              background: 'linear-gradient(145deg, #1c1410, #0e0a06)',
              border: `1px solid rgba(255,209,82,${canPlay ? '0.35' : '0.12'})`,
            }} />
          ))}
          {trumps.length > 5 && (
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#7a6a50', alignSelf: 'center' }}>+{trumps.length - 5}</span>
          )}
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'Cinzel, serif', fontSize: 18, color: '#7a6a50' }}>▼</span>
      </button>

      {/* Modal */}
      {open && createPortal(
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            touchAction: 'none',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 600,
              background: '#0e0c09',
              borderTop: '1px solid rgba(255,209,82,0.2)',
              borderRadius: '16px 16px 0 0',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.9)',
              touchAction: 'pan-y',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, color: '#ffd152', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Trump Cards
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#7a6a50', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e8d5b0'}
                onMouseLeave={e => e.currentTarget.style.color = '#7a6a50'}
              >
                ✕
              </button>
            </div>

            {/* Cards grid */}
            <div data-scroll style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', overflowY: 'auto', maxHeight: 'calc(var(--app-height, 60dvh) * 0.55)', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
              {trumps.map((trump) => (
                <TrumpCard
                  key={trump.id}
                  trump={trump}
                  onClick={handlePlay}
                  disabled={!canPlay}
                  isNew={false}
                  size="hand"
                />
              ))}
            </div>

            {!canPlay && (
              <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#5a5040', textAlign: 'center', marginTop: 16, fontStyle: 'italic' }}>
                {isYourTurn ? 'Waiting for confirmation…' : 'Not your turn'}
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
