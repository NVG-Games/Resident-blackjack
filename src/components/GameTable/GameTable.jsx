import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { gsap } from 'gsap';

import { gameReducer, ACTIONS, ROUND_STATE, createInitialState } from '../../engine/gameState.js';
import { getBotDecision } from '../../engine/aiBot.js';
import { useLlmBot } from '../../hooks/useLlmBot.js';
import { usePeerContext } from '../../contexts/PeerContext.jsx';
import { generateSeed } from '../../engine/deck.js';

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
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// playerRole: 'clancy' = you are Clancy (player), Hoffman is bot
//             'hoffman' = you are Hoffman (bot slot), Clancy is opponent
// In hot-seat/online both are human — role only changes labels.
// seed: optional number for P2P online mode to synchronise deck shuffle.
export default function GameTable({ mode = 'ai', playerRole = 'clancy', seed: seedProp, onReturnToMenu }) {
  const isHotSeat = mode === 'hotseat';
  const isOnline = mode === 'online';
  const isLlm = mode === 'llm';
  // In online mode: host = Clancy (player slot), guest = Hoffman (bot slot).
  const isHost = isOnline && playerRole === 'clancy';

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

  // ── P2P Online: shared PeerJS connection from PeerContext ────────────────
  // PeerContext holds the singleton Peer+conn that was established in LobbyScreen.
  // GameTable subscribes to incoming actions and sends local actions via context.
  const { send: peerSend, onData } = usePeerContext();

  // Subscribe to remote actions for the lifetime of the game
  useEffect(() => {
    if (!isOnline) return;
    const unsub = onData((action) => {
      if (!action?.type) return;
      dispatch(action);
    });
    return unsub;
  }, [isOnline, onData]);

  // Synced dispatch: local action dispatched AND mirrored to remote peer
  const syncedDispatch = useCallback((action) => {
    dispatch(action);
    if (isOnline) peerSend(action);
  }, [isOnline, peerSend]);

  const [isThinking, setIsThinking] = useState(false);

  // hot-seat: show handoff screen before BOT_TURN actions
  const [showHandoff, setShowHandoff] = useState(false);
  // hot-seat: player 2 has confirmed handoff and is now acting
  const [hotSeatBotActive, setHotSeatBotActive] = useState(false);

  const tableRef = useRef(null);
  const stateRef = useRef(state);
  // Prevents double-dispatch from rapid clicks — reset on every render
  const actionPendingRef = useRef(false);

  // LLM bot — always call the hook (hooks can't be conditional), decide is a stable ref
  const { decide: llmDecide } = useLlmBot();
  const llmDecideRef = useRef(llmDecide);
  llmDecideRef.current = llmDecide;

  // Track the last LLM reasoning string for display
  const [llmReasoning, setLlmReasoning] = useState(null);

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
  // In online mode only the host fires START_ROUND (it includes the seed so both stay in sync)
  useEffect(() => {
    if (state.roundState === ROUND_STATE.DEALING && !state.overlay) {
      if (isOnline && !isHost) return; // guest waits for host's START_ROUND via data channel
      const t = setTimeout(() => {
        const action = isOnline
          ? { type: ACTIONS.START_ROUND, seed: seedProp ?? generateSeed() }
          : { type: ACTIONS.START_ROUND };
        if (isOnline) {
          syncedDispatch(action);
        } else {
          dispatch(action);
        }
      }, 250);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundState, state.overlay, isOnline, isHost]);

  // Auto-resolve when both players have stood OR when player busts and bot finishes.
  // Trigger on roundState change — catches the case where playerStood was already true
  // (bust auto-stand) before botStood flips, so playerStood dep alone wouldn't re-fire.
  useEffect(() => {
    if (state.roundState !== ROUND_STATE.PLAYER_TURN) return;
    if (!state.playerStood || !state.botStood) return;
    if (isOnline && !isHost) return;
    const t = setTimeout(() => {
      const action = { type: ACTIONS.RESOLVE_ROUND };
      if (isOnline) syncedDispatch(action);
      else dispatch(action);
    }, 700);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundState, state.playerStood, state.botStood, isOnline, isHost]);

  // Shake on round loss
  useEffect(() => {
    if (state.roundResult?.winner === 'bot') shakeTable();
  }, [state.roundResult, shakeTable]);

  // Hot-seat: when BOT_TURN starts, show handoff screen (unless bot already stood)
  // Online guest (Hoffman): no handoff needed — they ARE the bot slot already
  // Online host (Clancy): never needs bot controls — AI handles bot slot, guest controls it
  useEffect(() => {
    if (!isHotSeat && !isOnline) return;
    if (isOnline) {
      if (isHost) return; // host never gets bot controls — guest manages bot slot
      // Guest only: BOT_TURN is the guest's turn — activate bot controls directly
      if (state.roundState === ROUND_STATE.BOT_TURN && !state.botStood) {
        setHotSeatBotActive(true);
      }
      if (state.roundState !== ROUND_STATE.BOT_TURN) {
        setHotSeatBotActive(false);
      }
      return;
    }
    // Hot-seat path
    if (state.roundState === ROUND_STATE.BOT_TURN && !state.botStood && !hotSeatBotActive) {
      setShowHandoff(true);
    }
    if (state.roundState !== ROUND_STATE.BOT_TURN) {
      setShowHandoff(false);
      setHotSeatBotActive(false);
    }
  }, [state.roundState, state.botStood, isHotSeat, isOnline, hotSeatBotActive]);

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

  // AI Bot / LLM Bot logic — disabled in hot-seat and online modes
  //
  // Design: ONE action per effect run. The effect fires when roundState===BOT_TURN.
  // After dispatch, the reducer either keeps BOT_TURN (bot hit, wants another card) or
  // switches to PLAYER_TURN (bot stood/bust). When roundState changes, the effect re-runs
  // for the next decision. This avoids any stale-state race conditions from async loops.
  useEffect(() => {
    if (isHotSeat || isOnline) return;
    if (state.roundState !== ROUND_STATE.BOT_TURN) return;
    if (state.gameOver) return;

    let cancelled = false;

    async function takeBotTurn() {
      if (state.botStood) {
        await wait(150);
        if (cancelled) return;
        dispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' } });
        return;
      }

      setIsThinking(true);

      if (isLlm) {
        const decision = await llmDecideRef.current(stateRef.current);
        if (cancelled) return;
        setIsThinking(false);
        if (!decision) return;
        if (decision.reasoning) setLlmReasoning(decision.reasoning);
        dispatch({ type: ACTIONS.BOT_ACTION, payload: decision });
      } else {
        const delay = BOT_FAST_DELAY_MS + Math.random() * BOT_THINK_DELAY_MS;
        await wait(delay);
        if (cancelled) return;
        setIsThinking(false);
        dispatch({ type: ACTIONS.BOT_ACTION, payload: getBotDecision(stateRef.current) });
      }
    }

    takeBotTurn();
    return () => { cancelled = true; setIsThinking(false); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundState, state.botHand.length, state.botStood, state.gameOver, isHotSeat, isOnline, isLlm]);

  stateRef.current = state;
  actionPendingRef.current = false; // reset after each render — state has been applied

  // Dispatch helper with double-click guard
  const guardedDispatch = useCallback((a) => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    if (isOnline) syncedDispatch(a); else dispatch(a);
  }, [isOnline, syncedDispatch]);

  // Player 1 actions (PLAYER_TURN) — mirrored to peer in online mode
  const handleHit = useCallback(() => {
    guardedDispatch({ type: ACTIONS.PLAYER_HIT });
  }, [guardedDispatch]);
  const handleStand = useCallback(() => {
    guardedDispatch({ type: ACTIONS.PLAYER_STAND });
  }, [guardedDispatch]);
  const handlePlayTrump = useCallback((trump) => {
    guardedDispatch({ type: ACTIONS.PLAYER_USE_TRUMP, trump });
  }, [guardedDispatch]);

  // Player 2 actions (hot-seat / online guest)
  const handleBotHit = useCallback(() => {
    guardedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'hit' } });
  }, [guardedDispatch]);
  const handleBotStand = useCallback(() => {
    guardedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' } });
  }, [guardedDispatch]);
  const handleBotPlayTrump = useCallback((trump) => {
    guardedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'trump', trump } });
  }, [guardedDispatch]);

  const handleDismissOverlay = useCallback(() => {
    if (state.gameOver) {
      if (isOnline) syncedDispatch({ type: ACTIONS.START_GAME });
      else dispatch({ type: ACTIONS.START_GAME });
    } else {
      if (isOnline) syncedDispatch({ type: ACTIONS.DISMISS_OVERLAY });
      else dispatch({ type: ACTIONS.DISMISS_OVERLAY });
    }
  }, [state.gameOver, isOnline, syncedDispatch]);

  const handleNextRound = useCallback(() => {
    const a = { type: ACTIONS.NEXT_ROUND };
    if (isOnline) syncedDispatch(a); else dispatch(a);
  }, [isOnline, syncedDispatch]);

  const handleHandoffReady = useCallback(() => {
    setShowHandoff(false);
    setHotSeatBotActive(true);
  }, []);

  const { roundState, overlay, roundResult, gameOver } = state;
  const showRoundResult = roundState === ROUND_STATE.ROUND_OVER && !overlay && !gameOver;

  // Determine whose turn it is and what actions to expose
  const isBotTurn = roundState === ROUND_STATE.BOT_TURN;
  const isPlayerTurn = roundState === ROUND_STATE.PLAYER_TURN;

  // In hot-seat/online mode during BOT_TURN (after handoff/directly) — show bot controls
  // Online guest (Hoffman): hotSeatBotActive is set when BOT_TURN fires
  const showBotControls = (isHotSeat || isOnline) && isBotTurn && hotSeatBotActive && !showHandoff;

  // In AI mode: disable when thinking or not player turn
  // In hot-seat player turn: always active when it's PLAYER_TURN
  // Online host (Clancy): disabled unless PLAYER_TURN; guest (Hoffman): disabled unless BOT_TURN
  const isActionDisabled = isHotSeat
    ? !isPlayerTurn
    : isOnline
      ? (isHost ? !isPlayerTurn : !isBotTurn || !hotSeatBotActive)
      : isThinking || !isPlayerTurn;

  // Active player name for display
  const activePlayerLabel = (isHotSeat || isOnline)
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

      {/* Main game layout — single column, fills viewport */}
      <div className="relative z-20 flex flex-col h-full px-2 sm:px-6 py-2 sm:py-4 gap-1 sm:gap-2 overflow-hidden">

        {/* TOP: Opponent area */}
        {/* In online mode: guest (Hoffman) sees playerHand (host/Clancy) as opponent — swap areas */}
        <section className="flex-none flex flex-col items-center gap-1">
          <BotArea
            state={state}
            isThinking={isThinking && !isHotSeat && !isOnline}
            playerName={(isHotSeat || isOnline) ? player2Name : 'Hoffman'}
            hideCards={isHotSeat && !showBotControls && !showRoundResult}
            hideHoleCard={!isHotSeat}
            flipForGuest={isOnline && !isHost}
          />
          {/* LLM reasoning bubble — shown when Claude explains its move */}
          {isLlm && llmReasoning && !isThinking && (
            <div
              className="max-w-xs sm:max-w-sm px-3 py-2 rounded text-xs font-fell italic text-stone-400 text-center"
              style={{ background: 'rgba(80,20,80,0.25)', border: '1px solid rgba(120,40,120,0.4)' }}
            >
              <span className="text-purple-400 not-italic font-cinzel text-xs uppercase tracking-widest">Claude: </span>
              {llmReasoning}
            </div>
          )}
          {isLlm && isThinking && (
            <div
              className="max-w-xs px-3 py-2 rounded text-xs font-fell italic text-purple-400 text-center animate-pulse"
              style={{ background: 'rgba(80,20,80,0.25)', border: '1px solid rgba(120,40,120,0.4)' }}
            >
              Claude is thinking…
            </div>
          )}
        </section>

        {/* MIDDLE: Bet panel + table trumps (compact row) */}
        <section className="flex-none flex flex-col items-center gap-1">
          <BetPanel state={state} isGuestOnline={isOnline && !isHost} />
          <TableTrumps
            playerTableTrumps={state.playerTableTrumps}
            botTableTrumps={state.botTableTrumps}
          />
        </section>

        {/* CENTER: Deck + Log side by side on desktop, deck only on mobile */}
        <section className="flex-1 flex gap-2 sm:gap-4 items-center justify-center min-h-0">
          <div className="flex items-center justify-center">
            <DeckPile count={state.deck.length} />
          </div>
          {/* Log: hidden on small screens, visible on sm+ */}
          <div className="hidden sm:flex w-px bg-stone-900 self-stretch" />
          <div className="hidden sm:flex w-60 md:w-72 flex-col min-h-0"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(139,0,0,0.2)',
              borderRadius: '6px',
              padding: '8px',
              maxHeight: '160px',
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
            isHotSeat={isHotSeat || isOnline}
            showBotControls={showBotControls}
            activePlayerName={activePlayerLabel}
            isBotTurnActive={isBotTurn && !showHandoff}
            isGuestOnline={isOnline && !isHost}
          />
        </section>

        {/* BOTTOM: Player area + Trump hand */}
        <section className="flex-none flex flex-col items-center gap-1 sm:gap-3 pb-1">
          <PlayerArea
            state={state}
            playerName={(isHotSeat || isOnline) ? player1Name : 'Clancy'}
            hideCards={isHotSeat && showBotControls && !showRoundResult}
            flipForGuest={isOnline && !isHost}
          />

          {/* Trump hand */}
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
        <RoundResult result={roundResult} onNext={handleNextRound} state={state} isGuestOnline={isOnline && !isHost} />
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
