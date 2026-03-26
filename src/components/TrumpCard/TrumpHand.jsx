import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import TrumpCard from './TrumpCard.jsx';
import { ROUND_STATE } from '../../engine/gameState.js';

export default function TrumpHand({ trumps, onPlay, disabled, roundState }) {
  const containerRef = useRef(null);
  const canPlay = !disabled && roundState === ROUND_STATE.PLAYER_TURN;

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.3 }
      );
    }
  }, []);

  if (trumps.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-stone-600 font-fell italic text-sm">
        No trump cards in hand
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="text-xs font-cinzel text-stone-500 uppercase tracking-widest text-center">
        Your Trump Cards
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {trumps.map((trump, idx) => (
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
      {!canPlay && (
        <div className="text-xs text-stone-600 font-fell italic text-center">
          {roundState === ROUND_STATE.BOT_TURN ? "Waiting for Hoffman..." : "Not your turn"}
        </div>
      )}
    </div>
  );
}
