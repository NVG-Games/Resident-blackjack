import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import TrumpCard from './TrumpCard.jsx';
import { ROUND_STATE } from '../../engine/gameState.js';

export default function TrumpHand({ trumps, onPlay, disabled, roundState, forceCanPlay = false }) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const canPlay = forceCanPlay || (!disabled && roundState === ROUND_STATE.PLAYER_TURN);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.25 }
      );
    }
  }, []);

  if (trumps.length === 0) return null;

  return (
    <div ref={containerRef}>
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(o => !o)}
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
        <span style={{ marginLeft: 'auto', fontFamily: 'Cinzel, serif', fontSize: 18, color: '#7a6a50' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Cards — visible only when open */}
      {open && (
        <div className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {trumps.map((trump) => (
            <TrumpCard
              key={trump.id}
              trump={trump}
              onClick={onPlay}
              disabled={!canPlay}
              isNew={false}
              size="hand"
            />
          ))}
        </div>
      )}
    </div>
  );
}
