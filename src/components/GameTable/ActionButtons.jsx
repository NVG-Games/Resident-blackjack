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
  isGuestOnline = false,
}) {
  const { roundState, playerStood, botStood, botTableTrumps, playerTableTrumps, deck } = state;

  // In hot-seat bot-controls mode: check bot-specific constraints
  const deadSilencedForBot = playerTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE);
  const deadSilencedForPlayer = botTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE);
  const deadSilenced = showBotControls ? deadSilencedForBot : deadSilencedForPlayer;

  const deckEmpty = deck.length === 0;
  // isStood must reflect the LOCAL player's stood status:
  // - host (Clancy) owns playerStood; guest (Hoffman) owns botStood
  // - showBotControls path is only reached by guest in their BOT_TURN
  const isStood = isGuestOnline ? botStood : (showBotControls ? false : playerStood);

  // canAct: in hot-seat bot-controls it's always active (caller sets disabled=false)
  const canAct = !disabled && !isStood;

  const hitRef = useRef(null);
  const standRef = useRef(null);

  useEffect(() => {
    if (canAct && hitRef.current && standRef.current) {
      // Animate in — no opacity manipulation, buttons are always visible via CSS
      gsap.fromTo([hitRef.current, standRef.current],
        { y: 8, scale: 0.96 },
        { y: 0, scale: 1, duration: 0.25, stagger: 0.06, ease: 'back.out(1.5)', clearProps: 'y,scale' }
      );
    }
  }, [canAct, showBotControls]);

  const buttonBase = `
    font-cinzel font-bold uppercase
    disabled:cursor-not-allowed
  `;

  // Status message when no action is available
  let statusMsg = null;
  if (!canAct) {
    if (isGuestOnline) {
      // Guest (Hoffman): waiting when it's PLAYER_TURN (host's turn)
      if (roundState !== ROUND_STATE.BOT_TURN) {
        statusMsg = 'Waiting for Clancy...';
      } else if (isStood) {
        statusMsg = 'You stood. Waiting...';
      }
    } else if (isHotSeat) {
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
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Active player indicator (hot-seat only) */}
      {isHotSeat && canAct && (
        <div className="font-cinzel uppercase text-center" style={{ fontSize: 13, letterSpacing: '0.2em', color: 'rgba(255,209,82,0.5)', marginBottom: 4 }}>
          {activePlayerName}'s turn
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#c4b9a8', textAlign: 'center', marginBottom: 8 }}>
          {statusMsg}
        </div>
      )}

      {/* Buttons — full width row, easy thumb targets */}
      <div style={{ display: 'flex', gap: 10 }}>
        {/* HIT */}
        <button
          ref={hitRef}
          onClick={onHit}
          disabled={!canAct || deadSilenced || deckEmpty}
          title={deadSilenced ? 'Dead Silence — you cannot draw' : ''}
          className={`${buttonBase} active:scale-95 ${deadSilenced ? 'opacity-30 cursor-not-allowed' : ''}`}
          style={{
            flex: 1,
            fontSize: 24,
            padding: '18px 12px',
            color: canAct && !deadSilenced && !deckEmpty ? '#ffd152' : '#5a4a28',
            letterSpacing: '0.15em',
            border: '1px solid',
            borderColor: canAct && !deadSilenced && !deckEmpty ? 'rgba(255,209,82,0.5)' : 'rgba(255,209,82,0.1)',
            background: canAct && !deadSilenced && !deckEmpty ? 'rgba(255,209,82,0.04)' : 'transparent',
            borderRadius: 4,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { if (canAct) { e.currentTarget.style.background = 'rgba(255,209,82,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,209,82,0.8)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = canAct ? 'rgba(255,209,82,0.04)' : 'transparent'; e.currentTarget.style.borderColor = canAct ? 'rgba(255,209,82,0.5)' : 'rgba(255,209,82,0.1)'; }}
        >
          HIT
        </button>

        {/* STAND */}
        <button
          ref={standRef}
          onClick={onStand}
          disabled={!canAct}
          className={`${buttonBase} active:scale-95`}
          style={{
            flex: 1,
            fontSize: 24,
            padding: '18px 12px',
            color: canAct ? '#e8d5b0' : '#3a3020',
            letterSpacing: '0.15em',
            border: '1px solid',
            borderColor: canAct ? 'rgba(232,213,176,0.3)' : 'rgba(232,213,176,0.06)',
            background: 'transparent',
            borderRadius: 4,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { if (canAct) { e.currentTarget.style.background = 'rgba(232,213,176,0.06)'; e.currentTarget.style.borderColor = 'rgba(232,213,176,0.5)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = canAct ? 'rgba(232,213,176,0.3)' : 'rgba(232,213,176,0.06)'; }}
        >
          STAND
        </button>
      </div>
    </div>
  );
}
