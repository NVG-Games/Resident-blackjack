import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ROUND_STATE } from '../../engine/gameState.js';
import { TRUMP_TYPES } from '../../engine/constants.js';

export default function ActionButtons({
  state,
  onHit,
  onStand,
  disabled,
  isHotSeat = false,
  showBotControls = false,
  activePlayerName = 'Clancy',
  isBotTurnActive = false,
}) {
  const { roundState, playerStood, botStood, botTableTrumps, playerTableTrumps, deck } = state;

  // In hot-seat bot-controls mode: check bot-specific constraints
  const deadSilencedForBot = playerTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE);
  const deadSilencedForPlayer = botTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE);
  const deadSilenced = showBotControls ? deadSilencedForBot : deadSilencedForPlayer;

  const deckEmpty = deck.length === 0;
  const isStood = showBotControls ? botStood : playerStood;

  // canAct: in hot-seat bot-controls it's always active (caller sets disabled=false)
  const canAct = !disabled && !isStood;

  const hitRef = useRef(null);
  const standRef = useRef(null);

  useEffect(() => {
    if (canAct && hitRef.current && standRef.current) {
      gsap.fromTo([hitRef.current, standRef.current],
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, stagger: 0.08, ease: 'back.out(1.5)' }
      );
    }
  }, [canAct, showBotControls]);

  const buttonBase = `
    font-cinzel font-bold uppercase tracking-widest
    text-sm sm:text-sm
    px-6 sm:px-8 py-4 sm:py-3
    min-w-[5rem] sm:min-w-0
    rounded border transition-all duration-200
    disabled:opacity-30 disabled:cursor-not-allowed
    active:scale-95
  `;

  // Status message when no action is available
  let statusMsg = null;
  if (!canAct && !disabled) {
    if (isHotSeat) {
      if (isBotTurnActive && !showBotControls) {
        statusMsg = `${activePlayerName} is thinking...`;
      } else if (roundState === ROUND_STATE.BOT_TURN && !showBotControls) {
        statusMsg = 'Waiting for handoff...';
      } else if (isStood) {
        statusMsg = `${activePlayerName} has stood.`;
      }
    } else {
      if (roundState === ROUND_STATE.BOT_TURN) {
        statusMsg = 'Waiting for Hoffman...';
      } else if (playerStood) {
        statusMsg = 'You stood. Hoffman plays...';
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Active player indicator (hot-seat only) */}
      {isHotSeat && canAct && (
        <div
          className="font-cinzel text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase px-3 sm:px-4 py-1 rounded"
          style={{
            background: showBotControls ? 'rgba(90,58,0,0.3)' : 'rgba(139,0,0,0.2)',
            border: `1px solid ${showBotControls ? '#5a3a00' : '#8b0000'}`,
            color: showBotControls ? '#f5c842' : '#f0e2c0',
          }}
        >
          {activePlayerName}'s turn
        </div>
      )}

      <div className="flex items-center gap-3 sm:gap-4 justify-center">
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
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className="text-xs font-fell italic text-stone-600">
          {statusMsg}
        </div>
      )}
    </div>
  );
}
