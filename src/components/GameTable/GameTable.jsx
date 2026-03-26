import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { gsap } from 'gsap';

import { gameReducer, ACTIONS, ROUND_STATE, createInitialState } from '../../engine/gameState.js';
import { getBotDecision } from '../../engine/aiBot.js';

import BotArea from '../BotArea/BotArea.jsx';
import PlayerArea from '../PlayerArea/PlayerArea.jsx';
import TrumpHand from '../TrumpCard/TrumpHand.jsx';
import BetPanel from '../BetPanel/BetPanel.jsx';
import TableTrumps from '../BetPanel/TableTrumps.jsx';
import PhaseOverlay from '../PhaseOverlay/PhaseOverlay.jsx';
import GameLog from '../GameLog/GameLog.jsx';
import ActionButtons from './ActionButtons.jsx';
import RoundResult from './RoundResult.jsx';
import HandoffScreen from './HandoffScreen.jsx';

const BOT_THINK_DELAY_MS = 800;
const BOT_FAST_DELAY_MS = 350;

// playerRole: 'clancy' = you are Clancy (player), Hoffman is bot
//             'hoffman' = you are Hoffman (bot slot), Clancy is opponent
// In hot-seat both are human — role only changes labels.
export default function GameTable({ mode = 'ai', playerRole = 'clancy', onReturnToMenu }) {
  const isHotSeat = mode === 'hotseat';

  // playerRole affects name labels. Engine is unchanged: "player" = top of reducer, "bot" = bottom.
  // If you picked Hoffman: the "player" slot is labelled Hoffman, "bot" slot is labelled Clancy.
  const player1Name = playerRole === 'clancy' ? 'Clancy' : 'Hoffman';
  const player2Name = playerRole === 'clancy' ? 'Hoffman' : 'Clancy';

  const [state, dispatch] = useReducer(gameReducer, null, () => ({
    ...createInitialState(),
    overlay: {
      type: 'phase',
      phase: 'FINGER',
      message: 'FINGER PHASE',
      subMessage: 'No trump cards. Card count carefully. Lose... and Lucas takes your fingers.',
    },
  }));

  const [isThinking, setIsThinking] = useState(false);

  // hot-seat: show handoff screen before BOT_TURN actions
  const [showHandoff, setShowHandoff] = useState(false);
  // hot-seat: player 2 has confirmed handoff and is now acting
  const [hotSeatBotActive, setHotSeatBotActive] = useState(false);

  const botTimerRef = useRef(null);
  const tableRef = useRef(null);
  const botProcessingRef = useRef(false);
  const stateRef = useRef(state);

  const shakeTable = useCallback(() => {
    if (!tableRef.current) return;
    gsap.timeline()
      .to(tableRef.current, { x: -8, duration: 0.05 })
      .to(tableRef.current, { x: 8, duration: 0.05 })
      .to(tableRef.current, { x: -5, duration: 0.05 })
      .to(tableRef.current, { x: 5, duration: 0.05 })
      .to(tableRef.current, { x: 0, duration: 0.05 });
  }, []);

  // Auto-start round when in DEALING state (and no overlay blocking)
  useEffect(() => {
    if (state.roundState === ROUND_STATE.DEALING && !state.overlay) {
      const t = setTimeout(() => dispatch({ type: ACTIONS.START_ROUND }), 250);
      return () => clearTimeout(t);
    }
  }, [state.roundState, state.overlay]);

  // Auto-resolve when both players have stood
  useEffect(() => {
    if (
      state.roundState === ROUND_STATE.PLAYER_TURN &&
      state.playerStood && state.botStood
    ) {
      const t = setTimeout(() => dispatch({ type: ACTIONS.RESOLVE_ROUND }), 700);
      return () => clearTimeout(t);
    }
  }, [state.playerStood, state.botStood, state.roundState]);

  // Shake on round loss
  useEffect(() => {
    if (state.roundResult?.winner === 'bot') shakeTable();
  }, [state.roundResult, shakeTable]);

  // Hot-seat: when BOT_TURN starts, show handoff screen (unless bot already stood)
  useEffect(() => {
    if (!isHotSeat) return;
    if (state.roundState === ROUND_STATE.BOT_TURN && !state.botStood && !hotSeatBotActive) {
      setShowHandoff(true);
    }
    if (state.roundState !== ROUND_STATE.BOT_TURN) {
      setShowHandoff(false);
      setHotSeatBotActive(false);
    }
  }, [state.roundState, state.botStood, isHotSeat, hotSeatBotActive]);

  // Hot-seat: if bot already stood when BOT_TURN is triggered, dispatch stand immediately
  useEffect(() => {
    if (!isHotSeat) return;
    if (state.roundState === ROUND_STATE.BOT_TURN && state.botStood) {
      const t = setTimeout(() => {
        dispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' } });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [state.roundState, state.botStood, isHotSeat]);

  // AI Bot logic — only runs in AI mode
  useEffect(() => {
    if (isHotSeat) return;
    if (state.roundState !== ROUND_STATE.BOT_TURN) {
      botProcessingRef.current = false;
      return;
    }
    if (state.gameOver) return;
    if (botProcessingRef.current) return;

    botProcessingRef.current = true;
    clearTimeout(botTimerRef.current);

    if (state.botStood) {
      botTimerRef.current = setTimeout(() => {
        botProcessingRef.current = false;
        dispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' } });
      }, 150);
      return () => clearTimeout(botTimerRef.current);
    }

    setIsThinking(true);

    const delay = BOT_FAST_DELAY_MS + Math.random() * BOT_THINK_DELAY_MS;
    botTimerRef.current = setTimeout(() => {
      setIsThinking(false);
      botProcessingRef.current = false;
      const decision = getBotDecision(stateRef.current);
      dispatch({ type: ACTIONS.BOT_ACTION, payload: decision });
    }, delay);

    return () => clearTimeout(botTimerRef.current);
  }, [state.roundState, state.botHand.length, state.botTrumpHand.length, state.gameOver, isHotSeat]);

  stateRef.current = state;

  // Player 1 actions (PLAYER_TURN)
  const handleHit = useCallback(() => dispatch({ type: ACTIONS.PLAYER_HIT }), []);
  const handleStand = useCallback(() => dispatch({ type: ACTIONS.PLAYER_STAND }), []);
  const handlePlayTrump = useCallback((trump) =>
    dispatch({ type: ACTIONS.PLAYER_USE_TRUMP, trump }), []);

  // Player 2 (hot-seat bot slot) actions — dispatches as BOT_ACTION
  const handleBotHit = useCallback(() =>
    dispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'hit' } }), []);
  const handleBotStand = useCallback(() =>
    dispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' } }), []);
  const handleBotPlayTrump = useCallback((trump) =>
    dispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'trump', trump } }), []);

  const handleDismissOverlay = useCallback(() => {
    if (state.gameOver) {
      dispatch({ type: ACTIONS.START_GAME });
    } else {
      dispatch({ type: ACTIONS.DISMISS_OVERLAY });
    }
  }, [state.gameOver]);

  const handleNextRound = useCallback(() =>
    dispatch({ type: ACTIONS.NEXT_ROUND }), []);

  const handleHandoffReady = useCallback(() => {
    setShowHandoff(false);
    setHotSeatBotActive(true);
  }, []);

  const { roundState, overlay, roundResult, gameOver } = state;
  const showRoundResult = roundState === ROUND_STATE.ROUND_OVER && !overlay && !gameOver;

  // Determine whose turn it is and what actions to expose
  const isBotTurn = roundState === ROUND_STATE.BOT_TURN;
  const isPlayerTurn = roundState === ROUND_STATE.PLAYER_TURN;

  // In hot-seat mode during BOT_TURN (after handoff) — show bot controls
  const showBotControls = isHotSeat && isBotTurn && hotSeatBotActive && !showHandoff;

  // In AI mode: disable when thinking or not player turn
  // In hot-seat player turn: always active when it's PLAYER_TURN
  const isActionDisabled = isHotSeat
    ? !isPlayerTurn
    : isThinking || !isPlayerTurn;

  // Active player name for display
  const activePlayerLabel = isHotSeat
    ? (showBotControls ? player2Name : player1Name)
    : player1Name;

  // Trump hand to show: player 1's or player 2's (bot) based on who's acting
  const activeTrumpHand = showBotControls ? state.botTrumpHand : state.playerTrumpHand;
  const activeTrumpHandler = showBotControls ? handleBotPlayTrump : handlePlayTrump;
  const activeTrumpDisabled = showBotControls ? false : isActionDisabled;

  return (
    <div ref={tableRef} className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ fontFamily: 'IM Fell English, serif' }}>

      {/* Background: dark green felt */}
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #0a1f0a 0%, #061206 50%, #030803 100%)',
        }}
      />

      {/* Felt texture grain */}
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)
          `,
        }}
      />

      {/* Wood border frame */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{
          boxShadow: `
            inset 0 0 0 14px #1a1008,
            inset 0 0 0 16px #2d1f0d,
            inset 0 0 0 18px #1a1008,
            inset 0 0 80px rgba(0,0,0,0.8)
          `,
        }}
      />

      {/* Blood drips */}
      <BloodDrips />

      {/* Main game layout */}
      <div className="relative z-20 flex flex-col h-full px-6 py-4 gap-2">

        {/* TOP: Hoffman / player2 */}
        <section className="flex-none flex justify-center items-start pt-1">
          <BotArea
            state={state}
            isThinking={isThinking && !isHotSeat}
            playerName={isHotSeat ? player2Name : 'Hoffman'}
            hideCards={isHotSeat && !showBotControls && !showRoundResult}
          />
        </section>

        {/* MIDDLE: Bet panel */}
        <section className="flex-none flex justify-center">
          <BetPanel state={state} />
        </section>

        {/* TABLE TRUMPS */}
        <section className="flex-none flex justify-center">
          <TableTrumps
            playerTableTrumps={state.playerTableTrumps}
            botTableTrumps={state.botTableTrumps}
          />
        </section>

        {/* CENTER: Deck + Log */}
        <section className="flex-1 flex gap-4 items-stretch min-h-0">
          <div className="flex-1 flex items-center justify-center">
            <DeckPile count={state.deck.length} />
          </div>
          <div className="w-px bg-stone-900" />
          <div className="w-72 flex flex-col"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(139,0,0,0.2)',
              borderRadius: '6px',
              padding: '8px',
            }}>
            <GameLog log={state.log} />
          </div>
        </section>

        {/* ACTION BUTTONS */}
        <section className="flex-none flex justify-center py-1">
          <ActionButtons
            state={state}
            onHit={showBotControls ? handleBotHit : handleHit}
            onStand={showBotControls ? handleBotStand : handleStand}
            disabled={showBotControls ? false : isActionDisabled}
            isHotSeat={isHotSeat}
            showBotControls={showBotControls}
            activePlayerName={activePlayerLabel}
            isBotTurnActive={isBotTurn && !showHandoff}
          />
        </section>

        {/* BOTTOM: Clancy / player1 */}
        <section className="flex-none flex flex-col items-center gap-3 pb-1">
          <PlayerArea
            state={state}
            playerName={isHotSeat ? player1Name : 'Clancy'}
            hideCards={isHotSeat && showBotControls && !showRoundResult}
          />

          {/* Trump hand: switches between p1/p2 in hot-seat */}
          <div className="w-full max-w-lg">
            <TrumpHand
              trumps={activeTrumpHand}
              onPlay={activeTrumpHandler}
              disabled={activeTrumpDisabled}
              roundState={roundState}
            />
          </div>
        </section>
      </div>

      {/* ROUND RESULT */}
      {showRoundResult && (
        <RoundResult result={roundResult} onNext={handleNextRound} state={state} />
      )}

      {/* PHASE / VICTORY / DEFEAT OVERLAY */}
      {overlay && (
        <PhaseOverlay overlay={overlay} onDismiss={handleDismissOverlay} />
      )}

      {/* HOT-SEAT HANDOFF SCREEN */}
      {isHotSeat && showHandoff && (
        <HandoffScreen
          toPlayerName={player2Name}
          onReady={handleHandoffReady}
        />
      )}

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-5"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  );
}

function DeckPile({ count }) {
  const stackCount = Math.min(count, 3);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 56, height: 80 }}>
        {count > 0 ? (
          Array.from({ length: stackCount }, (_, i) => (
            <div
              key={i}
              className="absolute rounded border border-stone-800"
              style={{
                width: 52,
                height: 74,
                top: (stackCount - 1 - i) * 2,
                left: (stackCount - 1 - i) * 1,
                background: i === stackCount - 1
                  ? 'linear-gradient(145deg, #1a0000, #0d0000)'
                  : 'linear-gradient(145deg, #150000, #0a0000)',
                zIndex: i,
                boxShadow: i === stackCount - 1 ? '0 2px 8px rgba(0,0,0,0.8)' : 'none',
              }}
            >
              {i === stackCount - 1 && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full border border-red-900/40 flex items-center justify-center">
                    <span className="text-red-900/60" style={{ fontSize: 16 }}>☣</span>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="w-12 h-16 border border-dashed border-stone-800 rounded
            flex items-center justify-center">
            <span className="text-stone-800 text-xs font-fell">—</span>
          </div>
        )}
      </div>
      <span className="text-xs text-stone-600 font-fell italic">
        {count} {count === 1 ? 'card' : 'cards'} remain
      </span>
    </div>
  );
}

function BloodDrips() {
  const drips = [
    { left: '6%', h: 38 }, { left: '19%', h: 22 }, { left: '34%', h: 50 },
    { left: '51%', h: 16 }, { left: '63%', h: 44 }, { left: '78%', h: 28 },
    { left: '87%', h: 56 }, { left: '95%', h: 20 },
  ];

  return (
    <>
      {drips.map((d, i) => (
        <div key={i} className="absolute top-0 pointer-events-none z-10"
          style={{ left: d.left }}>
          <div
            style={{
              width: 2 + (i % 3),
              height: d.h,
              background: 'linear-gradient(180deg, #8b0000cc, #4a000066, transparent)',
              borderRadius: '0 0 50% 50%',
            }}
          />
        </div>
      ))}
    </>
  );
}
