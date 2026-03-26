import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ROUND_STATE } from '../../engine/gameState.js';
import { TRUMP_TYPES } from '../../engine/constants.js';

export default function ActionButtons({ state, onHit, onStand, disabled }) {
  const { roundState, playerStood, botTableTrumps, deck } = state;
  const canAct = roundState === ROUND_STATE.PLAYER_TURN && !playerStood && !disabled;
  const deadSilenced = botTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE);
  const deckEmpty = deck.length === 0;

  const hitRef = useRef(null);
  const standRef = useRef(null);

  useEffect(() => {
    if (canAct && hitRef.current && standRef.current) {
      gsap.fromTo([hitRef.current, standRef.current],
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: 'back.out(1.5)' }
      );
    }
  }, [canAct]);

  const buttonBase = `
    font-cinzel text-sm font-bold uppercase tracking-widest
    px-8 py-3 rounded border transition-all duration-200
    disabled:opacity-30 disabled:cursor-not-allowed
  `;

  return (
    <div className="flex items-center gap-4 justify-center">
      {/* HIT */}
      <button
        ref={hitRef}
        onClick={onHit}
        disabled={!canAct || deadSilenced || deckEmpty}
        title={deadSilenced ? 'Dead Silence — you cannot draw' : ''}
        className={`${buttonBase}
          border-amber-700 text-amber-300 bg-amber-900/20
          hover:bg-amber-900/40 hover:border-amber-500 hover:scale-105
          active:scale-95
          ${deadSilenced ? 'opacity-30 cursor-not-allowed' : ''}
        `}
      >
        HIT
      </button>

      {/* STAND */}
      <button
        ref={standRef}
        onClick={onStand}
        disabled={!canAct}
        className={`${buttonBase}
          border-stone-600 text-stone-300 bg-stone-900/40
          hover:bg-stone-800/60 hover:border-stone-400 hover:scale-105
          active:scale-95
        `}
      >
        STAND
      </button>

      {!canAct && !disabled && (
        <div className="text-xs font-fell italic text-stone-600">
          {roundState === ROUND_STATE.BOT_TURN
            ? 'Waiting for Hoffman...'
            : playerStood
              ? 'You stood. Hoffman plays...'
              : ''}
        </div>
      )}
    </div>
  );
}
