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
  const player1Name = playerRole === 'clancy' ? 'Player 1' : 'Player 2';
  const player2Name = playerRole === 'clancy' ? 'Player 2' : 'Player 1';

  const [state, dispatch] = useReducer(gameReducer, null, () => ({
    ...createInitialState(),
    overlay: {
      type: 'phase',
      phase: 'FINGER',
      message: 'FINGER PHASE',
      subMessage: 'No trump cards. Count carefully. One wrong move costs you everything.',
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

  // hot-seat pass-and-play: whose turn is confirmed (null = need handoff)
  // 'p1' = P1 confirmed Ready, 'p2' = P2 confirmed Ready, null = nobody yet
  const [confirmedPlayer, setConfirmedPlayer] = useState(null);
  // keep for online mode compat
  const [hotSeatBotActive, setHotSeatBotActive] = useState(false);

  const tableRef = useRef(null);
  const stateRef = useRef(state);

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

  // Hot-seat: reset confirmation on every turn change → triggers handoff screen.
  // Exception: when round just started (PLAYER_TURN after DEALING), P1 already has the device,
  // so auto-confirm P1 — no handoff needed at the very start of a round.
  // Online guest: activate bot controls directly.
  const prevRoundStateRef = useRef(state.roundState);
  useEffect(() => {
    if (!isHotSeat && !isOnline) return;
    if (isOnline) {
      if (isHost) return;
      if (state.roundState === ROUND_STATE.BOT_TURN) setHotSeatBotActive(true);
      else setHotSeatBotActive(false);
      return;
    }
    const prev = prevRoundStateRef.current;
    prevRoundStateRef.current = state.roundState;

    if (state.roundState === ROUND_STATE.BOT_TURN) {
      // P1 just acted → handoff to P2
      setConfirmedPlayer(null);
    } else if (state.roundState === ROUND_STATE.PLAYER_TURN && prev === ROUND_STATE.BOT_TURN) {
      // P2 just acted → handoff to P1
      setConfirmedPlayer(null);
    } else {
      // Round just started — P1 already has device
      setConfirmedPlayer('p1');
    }
  }, [state.roundState, isHotSeat, isOnline, isHost]);


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
  }, [state.roundState, state.botStood, state.gameOver, isHotSeat, isOnline, isLlm]);

  stateRef.current = state;

  const guardedDispatch = useCallback((a) => {
    if (isOnline) syncedDispatch(a); else dispatch(a);
  }, [isOnline, syncedDispatch]);

  // Turn timer — 60s countdown, auto-stand on expiry. Active in AI, LLM and Online modes (not hotseat).
  const TURN_TIMER_SEC = 60;
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(null);

  useEffect(() => {
    if (isHotSeat) return;
    if (state.gameOver) return;
    const isMyTurn = isOnline
      ? (isHost ? isPlayerTurn : isBotTurn && hotSeatBotActive)
      : isPlayerTurn;
    if (!isMyTurn) { setTurnSecondsLeft(null); return; }

    setTurnSecondsLeft(TURN_TIMER_SEC);
    const interval = setInterval(() => {
      setTurnSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-stand
          if (isOnline) {
            if (isHost) syncedDispatch({ type: ACTIONS.PLAYER_STAND });
            else syncedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' } });
          } else {
            dispatch({ type: ACTIONS.PLAYER_STAND });
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundState, state.gameOver, isHotSeat, isOnline, isHost, hotSeatBotActive]);

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

  const handleHandoffReady = useCallback((who) => {
    if (isHotSeat) setConfirmedPlayer(who);
    else setHotSeatBotActive(true);
  }, [isHotSeat]);

  const { roundState, overlay, roundResult, gameOver } = state;
  const showRoundResult = roundState === ROUND_STATE.ROUND_OVER && !overlay && !gameOver;

  // Determine whose turn it is and what actions to expose
  const isBotTurn = roundState === ROUND_STATE.BOT_TURN;
  const isPlayerTurn = roundState === ROUND_STATE.PLAYER_TURN;

  // Hot-seat pass-and-play:
  // After every roundState change, confirmedPlayer resets to null.
  // HandoffScreen shows until the right player confirms.
  const activeIsP1 = isPlayerTurn; // engine: PLAYER_TURN = P1's turn, BOT_TURN = P2's turn
  const needsHandoff = isHotSeat && (isPlayerTurn || isBotTurn) && confirmedPlayer === null
    && !state.gameOver && roundState !== ROUND_STATE.ROUND_OVER
    && roundState !== ROUND_STATE.DEALING && roundState !== ROUND_STATE.RESOLVING
    && !(state.playerStood && state.botStood);

  const showHandoff = needsHandoff; // single HandoffScreen for both players
  const handoffTarget = activeIsP1 ? player1Name : player2Name; // who to pass to

  // Bot controls: P2's turn and P2 confirmed (regardless of botStood)
  const showBotControls = isOnline
    ? (isBotTurn && hotSeatBotActive)
    : isHotSeat
      ? (isBotTurn && confirmedPlayer === 'p2')
      : false;

  // P1 can act when: PLAYER_TURN + confirmed
  const isActionDisabled = isHotSeat
    ? !isPlayerTurn || confirmedPlayer !== 'p1'
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
    <div ref={tableRef} className="relative w-full h-full flex flex-col"
      style={{ fontFamily: 'IM Fell English, serif' }}>

      {/* Background: noir black */}
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #110d08 0%, #080604 60%, #040302 100%)',
        }}
      />

      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,209,82,0.015) 2px, rgba(255,209,82,0.015) 3px)`,
        }}
      />

      {/* Gold accent lines on sides */}
      <div className="absolute inset-y-0 left-0 w-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(255,209,82,0.15) 20%, rgba(255,209,82,0.15) 80%, transparent)' }}
      />
      <div className="absolute inset-y-0 right-0 w-px pointer-events-none z-10"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(255,209,82,0.15) 20%, rgba(255,209,82,0.15) 80%, transparent)' }}
      />

      {/* Main game layout — single column, fills viewport */}
      <div className="relative z-20 flex flex-col h-full px-3 sm:px-6 gap-2 sm:gap-3" style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))', paddingBottom: 'calc(90px + env(safe-area-inset-bottom))' }}>

        {/* TOP: Bet panel */}
        <section className="flex-none w-full">
          <BetPanel state={state} isGuestOnline={isOnline && !isHost} />
        </section>

        {/* Opponent area */}
        <section className="flex-none flex flex-col items-center gap-2" style={{ paddingTop: 16 }}>
          <BotArea
            state={state}
            isThinking={isThinking && !isHotSeat && !isOnline}
            playerName={(isHotSeat || isOnline) ? player2Name : 'Hoffman'}
            hideCards={isHotSeat && !showBotControls && !showRoundResult}
            hideHoleCard={!isHotSeat}
            flipForGuest={isOnline && !isHost}
            isActivePlayer={isHotSeat && showBotControls}
          />
          {isLlm && llmReasoning && !isThinking && (
            <div
              className="max-w-xs sm:max-w-sm px-3 py-2 rounded font-fell italic text-center"
              style={{ fontSize: 14, color: '#a8a29e', background: 'rgba(80,20,80,0.25)', border: '1px solid rgba(120,40,120,0.4)' }}
            >
              <span style={{ color: '#c084fc', fontFamily: 'Cinzel, serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontStyle: 'normal' }}>Claude: </span>
              {llmReasoning}
            </div>
          )}
          {isLlm && isThinking && (
            <div
              className="px-3 py-2 rounded font-fell italic text-center animate-pulse"
              style={{ fontSize: 14, color: '#c084fc', background: 'rgba(80,20,80,0.25)', border: '1px solid rgba(120,40,120,0.4)' }}
            >
              Claude is thinking…
            </div>
          )}
        </section>

        {/* CENTER: Deck (left, absolute) + Table Trumps (true center) */}
        <section className="flex-1 relative flex items-center justify-center w-full min-h-0" style={{ zIndex: 5 }}>
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <DeckPile count={state.deck.length} />
          </div>
          <TableTrumps
            playerTableTrumps={state.playerTableTrumps}
            botTableTrumps={state.botTableTrumps}
          />
        </section>

        {/* BOTTOM: Player area + Trump hand */}
        <section className="flex-none flex flex-col items-center mt-auto" style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom))', paddingTop: 12, gap: 20 }}>
          <PlayerArea
            state={state}
            playerName={(isHotSeat || isOnline) ? player1Name : 'Clancy'}
            hideCards={isHotSeat && showBotControls && !showRoundResult}
            flipForGuest={isOnline && !isHost}
            isOpponent={isHotSeat && showBotControls}
          />
          <div className="w-full max-w-lg">
            <TrumpHand
              trumps={activeTrumpHand}
              onPlay={activeTrumpHandler}
              disabled={activeTrumpDisabled}
              roundState={roundState}
              forceCanPlay={showBotControls}
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

      {/* HOT-SEAT: handoff screen — shows for whoever's turn is next */}
      {showHandoff && (
        <HandoffScreen
          toPlayerName={handoffTarget}
          onReady={() => handleHandoffReady(activeIsP1 ? 'p1' : 'p2')}
        />
      )}

      {/* ACTION BUTTONS — fixed to bottom, respects iOS home indicator */}
      <div className="absolute z-30" style={{ bottom: 0, left: 0, right: 0, background: 'rgba(8,6,4,0.97)', borderTop: '1px solid rgba(255,209,82,0.1)', padding: '10px 12px calc(12px + env(safe-area-inset-bottom))' }}>
        {/* Turn timer — radial */}
        {turnSecondsLeft !== null && (() => {
          const pct = turnSecondsLeft / TURN_TIMER_SEC;
          const r = 22;
          const circ = 2 * Math.PI * r;
          const danger = turnSecondsLeft <= 10;
          const color = danger ? '#ef4444' : '#ffd152';
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
              <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
                <circle
                  cx={28} cy={28} r={r} fill="none"
                  stroke={color} strokeWidth={3}
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                />
                <text
                  x={28} y={28}
                  textAnchor="middle" dominantBaseline="central"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '28px 28px', fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, fill: color }}
                >
                  {turnSecondsLeft}
                </text>
              </svg>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: danger ? '#ef4444' : '#7a6a50', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {danger ? '⚠ Auto-stand soon' : 'Your turn'}
              </span>
            </div>
          );
        })()}
        <ActionButtons
          state={state}
          onHit={showBotControls ? handleBotHit : handleHit}
          onStand={showBotControls ? handleBotStand : handleStand}
          disabled={showBotControls ? !isBotTurn : isActionDisabled}
          isHotSeat={isHotSeat || isOnline}
          showBotControls={showBotControls}
          activePlayerName={activePlayerLabel}
          isBotTurnActive={isBotTurn && !showHandoff}
          isGuestOnline={isOnline && !isHost}
        />
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-5"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.85) 100%)',
        }}
      />
    </div>
  );
}

function DeckPile({ count }) {
  const stackCount = Math.min(count, 3);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 72, height: 100 }}>
        {count > 0 ? (
          Array.from({ length: stackCount }, (_, i) => (
            <div
              key={i}
              className="absolute rounded"
              style={{
                width: 66,
                height: 94,
                top: (stackCount - 1 - i) * 2,
                left: (stackCount - 1 - i) * 1,
                background: i === stackCount - 1
                  ? 'linear-gradient(145deg, #1c1410, #0e0a06)'
                  : 'linear-gradient(145deg, #160f08, #0a0704)',
                zIndex: i,
                border: `1px solid rgba(255,209,82,${i === stackCount - 1 ? '0.2' : '0.08'})`,
                boxShadow: i === stackCount - 1 ? '0 2px 12px rgba(0,0,0,0.9)' : 'none',
              }}
            >
              {i === stackCount - 1 && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ border: '1px solid rgba(255,209,82,0.25)' }}>
                    <span style={{ fontSize: 18, color: 'rgba(255,209,82,0.4)' }}>✦</span>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="w-16 h-20 border border-dashed border-stone-700 rounded
            flex items-center justify-center">
            <span className="text-stone-600 text-sm font-fell">—</span>
          </div>
        )}
      </div>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#c4b9a8' }}>
        {count} {count === 1 ? 'card' : 'cards'} remain
      </span>
    </div>
  );
}

