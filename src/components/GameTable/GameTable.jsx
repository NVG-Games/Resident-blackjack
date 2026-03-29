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
import { GameLogSidebar, GameLogModal } from '../GameLog/GameLog.jsx';
import ActionButtons from './ActionButtons.jsx';
import RoundResult from './RoundResult.jsx';
import HandoffScreen from './HandoffScreen.jsx';
import TrumpPlayedBanner from './TrumpPlayedBanner.jsx';
import TrumpWarningToast from './TrumpWarningToast.jsx';
import GameOverScreen from './GameOverScreen.jsx';
import { useEmojiReaction, EmojiPicker, FloatingEmoji } from './EmojiReaction.jsx';

const BOT_THINK_DELAY_MS = 1200;
const BOT_FAST_DELAY_MS = 700;
// Extra pause after the bot plays a trump so the player can read the banner
const BOT_POST_TRUMP_DELAY_MS = 1800;
const BOT_SLOW_MIN_MS = 2000;
const BOT_SLOW_RANGE_MS = 5000;
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

// playerRole: 'clancy' = you are Clancy (player), Hoffman is bot
//             'hoffman' = you are Hoffman (bot slot), Clancy is opponent
// In hot-seat/online both are human — role only changes labels.
// seed: optional number for P2P online mode to synchronise deck shuffle.
export default function GameTable({ mode = 'ai', playerRole = 'clancy', seed: seedProp, slowBot = false, onReturnToMenu, myName, opponentName, onRecordGame }) {
  const isHotSeat = mode === 'hotseat';
  const isOnline = mode === 'online';
  const isLlm = mode === 'llm';
  // In online mode: host = Clancy (player slot), guest = Hoffman (bot slot).
  const isHost = isOnline && playerRole === 'clancy';

  // playerRole affects name labels. Engine is unchanged: "player" = top of reducer, "bot" = bottom.
  // In online mode use real names if provided; fallback to Player 1/2.
  const player1Name = (isOnline && myName) ? myName : (playerRole === 'clancy' ? 'Player 1' : 'Player 2');
  const player2Name = (isOnline && opponentName) ? opponentName : (playerRole === 'clancy' ? 'Player 2' : 'Player 1');

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
      if (action.type === 'HOST_TIMEOUT') {
        // Legacy: older host clients send this on timeout instead of NEXT_ROUND — just ignore
        return;
      }
      if (action.type === 'SHOW_FINAL_OVERLAY') {
        // Host revealed the final overlay — guest should do the same
        setFinalRoundSeen(true);
        return;
      }
      dispatch(action);
    });
    return unsub;
  }, [isOnline, onData, onReturnToMenu]);

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
  // Prevents the bot AI effect from firing twice when botHand changes mid-turn
  // (e.g. bot plays a trump that modifies botHand, triggering the effect again before
  // the current async action completes).
  const botProcessingRef = useRef(false);

  // LLM bot — always call the hook (hooks can't be conditional), decide is a stable ref
  const { decide: llmDecide } = useLlmBot();
  const llmDecideRef = useRef(llmDecide);
  llmDecideRef.current = llmDecide;

  // Track the last LLM reasoning string for display
  const [llmReasoning, setLlmReasoning] = useState(null);

  // Exit to menu confirmation
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Game log modal (mobile)
  const [showLogModal, setShowLogModal] = useState(false);

  // Emoji reactions
  const { myEmoji, oppEmoji, pickerOpen, sendEmoji, togglePicker, closePicker } = useEmojiReaction({
    isOnline,
    peerSend,
    onData,
    isHost,
  });


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
          ? { type: ACTIONS.START_ROUND, seed: generateSeed() }
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

  // Record completed game to history
  const gameRecordedRef = useRef(false);
  useEffect(() => { if (!state.gameOver) gameRecordedRef.current = false; }, [state.gameOver]);
  useEffect(() => {
    if (!state.gameOver || gameRecordedRef.current) return;
    gameRecordedRef.current = true;
    if (!onRecordGame) return;
    const isGuestOnline = isOnline && !isHost;
    const myHP = isGuestOnline ? state.botHealth : state.playerHealth;
    const oppHP = isGuestOnline ? state.playerHealth : state.botHealth;
    let outcome = 'draw';
    if (myHP > 0 && oppHP <= 0) outcome = 'win';
    else if (oppHP > 0 && myHP <= 0) outcome = 'loss';
    else if (myHP > oppHP) outcome = 'win';
    else if (oppHP > myHP) outcome = 'loss';
    onRecordGame({
      mode,
      myName: myName || player1Name,
      opponentName: opponentName || player2Name,
      outcome,
      myFinalHP: myHP,
      opponentFinalHP: oppHP,
      totalRounds: state.roundNumber ?? state.round,
      finalPhase: state.phase,
    });
  // Only re-run when gameOver toggles. Other deps (onRecordGame, myName, etc.) are
  // stable across a game session; gameRecordedRef prevents any double-recording.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameOver]);

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
    // Guard against re-entry: if an async bot action is already in flight, skip.
    // This prevents trump cards that modify botHand from triggering a second action.
    if (botProcessingRef.current) return;

    botProcessingRef.current = true;
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
        const justPlayedTrump = state.botTrumpsUsedThisTurn > 0;
        const delay = slowBot
          ? BOT_SLOW_MIN_MS + Math.random() * BOT_SLOW_RANGE_MS
          : (justPlayedTrump ? BOT_POST_TRUMP_DELAY_MS : BOT_FAST_DELAY_MS) + Math.random() * BOT_THINK_DELAY_MS;
        await wait(delay);
        if (cancelled) return;
        setIsThinking(false);
        dispatch({ type: ACTIONS.BOT_ACTION, payload: getBotDecision(stateRef.current) });
      }
    }

    takeBotTurn().finally(() => {
      botProcessingRef.current = false;
    });
    return () => {
      cancelled = true;
      setIsThinking(false);
      botProcessingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundState, state.botHand, state.botTrumpsUsedThisTurn, state.botStood, state.gameOver, isHotSeat, isOnline, isLlm, slowBot]);

  stateRef.current = state;

  const guardedDispatch = useCallback((a) => {
    if (isOnline) syncedDispatch(a); else dispatch(a);
  }, [isOnline, syncedDispatch]);

  // Turn timer — 60s countdown, auto-stand on expiry. Active in AI, LLM and Online modes (not hotseat).
  const TURN_TIMER_SEC = 60;
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(null);
  const [opponentSecondsLeft, setOpponentSecondsLeft] = useState(null);
  const [aiWaitSecondsLeft, setAiWaitSecondsLeft] = useState(null);

  // Derived turn state — declared here so all useEffects below can reference them
  const isBotTurn = state.roundState === ROUND_STATE.BOT_TURN;
  const isPlayerTurn = state.roundState === ROUND_STATE.PLAYER_TURN;

  // Opponent wait timer — shows countdown while waiting for opponent's move (online only)
  useEffect(() => {
    if (!isOnline || isHotSeat || state.gameOver) { setOpponentSecondsLeft(null); return; }
    const isMyTurn = isHost ? isPlayerTurn : isBotTurn;
    const isOpponentTurn = isHost ? isBotTurn : isPlayerTurn;
    if (!isOpponentTurn || isMyTurn) { setOpponentSecondsLeft(null); return; }

    setOpponentSecondsLeft(TURN_TIMER_SEC);
    const interval = setInterval(() => {
      setOpponentSecondsLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(interval); return null; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundState, state.gameOver, isOnline, isHost, isPlayerTurn, isBotTurn]);

  // AI waiting timer — counts up while bot is thinking (not online, not hotseat)
  useEffect(() => {
    if (isHotSeat || isOnline || state.gameOver) { setAiWaitSecondsLeft(null); return; }
    if (!isBotTurn) { setAiWaitSecondsLeft(null); return; }
    setAiWaitSecondsLeft(TURN_TIMER_SEC);
    const interval = setInterval(() => {
      setAiWaitSecondsLeft(prev => (prev === null || prev <= 1) ? null : prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.roundState, state.gameOver, isHotSeat, isOnline]);

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
            if (isHost) syncedDispatch({ type: ACTIONS.PLAYER_STAND, playerName: player1Name });
            else syncedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' }, botName: player2Name, revealCard: true });
          } else {
            dispatch({ type: ACTIONS.PLAYER_STAND, playerName: player1Name });
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
    guardedDispatch({ type: ACTIONS.PLAYER_HIT, playerName: player1Name });
  }, [guardedDispatch, player1Name]);
  const handleStand = useCallback(() => {
    guardedDispatch({ type: ACTIONS.PLAYER_STAND, playerName: player1Name });
  }, [guardedDispatch, player1Name]);
  const handlePlayTrump = useCallback((trump) => {
    guardedDispatch({ type: ACTIONS.PLAYER_USE_TRUMP, trump });
  }, [guardedDispatch]);

  // Player 2 actions (hot-seat / online guest)
  const handleBotHit = useCallback(() => {
    guardedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'hit' }, botName: player2Name, revealCard: true });
  }, [guardedDispatch, player2Name]);
  const handleBotStand = useCallback(() => {
    guardedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'stand' }, botName: player2Name, revealCard: true });
  }, [guardedDispatch, player2Name]);
  const handleBotPlayTrump = useCallback((trump) => {
    guardedDispatch({ type: ACTIONS.BOT_ACTION, payload: { type: 'trump', trump }, botName: player2Name, revealCard: true });
  }, [guardedDispatch, player2Name]);

  const { roundState, overlay, roundResult, gameOver } = state;
  // Show RoundResult for the final round too — don't skip it when gameOver
  const [finalRoundSeen, setFinalRoundSeen] = useState(false);
  // Reset when a new game starts (roundNumber resets to 0 via START_GAME)
  useEffect(() => { if (!gameOver) setFinalRoundSeen(false); }, [gameOver]);
  const showRoundResult = roundState === ROUND_STATE.ROUND_OVER && !overlay && (!gameOver || !finalRoundSeen);

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
    if (gameOver) {
      // Final round — hide RoundResult and reveal victory/defeat overlay
      setFinalRoundSeen(true);
      const overlayAction = { type: ACTIONS.SHOW_GAME_OVER_OVERLAY };
      if (isOnline) {
        syncedDispatch(overlayAction);
        // Signal the guest to also reveal the overlay (legacy support)
        if (isHost) peerSend({ type: 'SHOW_FINAL_OVERLAY' });
      } else {
        dispatch(overlayAction);
      }
      return;
    }
    const a = { type: ACTIONS.NEXT_ROUND };
    if (isOnline) syncedDispatch(a); else dispatch(a);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, isOnline, isHost, peerSend, syncedDispatch]);

  // Online host timeout: if host doesn't click Next Round in time, auto-advance
  const handleHostRoundTimeout = useCallback(() => {
    if (isOnline && isHost) {
      if (gameOver) {
        // Final round — reveal overlay for both
        setFinalRoundSeen(true);
        syncedDispatch({ type: ACTIONS.SHOW_GAME_OVER_OVERLAY });
        peerSend({ type: 'SHOW_FINAL_OVERLAY' });
        return;
      }
      // Auto-advance to next round for both players (don't kick anyone out)
      syncedDispatch({ type: ACTIONS.NEXT_ROUND });
    }
  }, [isOnline, isHost, gameOver, peerSend, syncedDispatch]);

  const handleHandoffReady = useCallback((who) => {
    if (isHotSeat) setConfirmedPlayer(who);
    else setHotSeatBotActive(true);
  }, [isHotSeat]);

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
  // Trumps can be played anytime it's your turn (even after standing) — only block on opponent's turn.
  // Online guest plays from the "bot" slot, so their turn is isBotTurn (not hotSeatBotActive, which is
  // a hot-seat-only flag and is always false in online mode).
  const isTrumpDisabled = isHotSeat
    ? (!isPlayerTurn && !showBotControls) || (isPlayerTurn && confirmedPlayer !== 'p1') || (showBotControls && confirmedPlayer !== 'p2')
    : isOnline
      ? (isHost ? !isPlayerTurn : !isBotTurn)
      : isThinking || !isPlayerTurn;
  const activeTrumpDisabled = showBotControls ? false : isTrumpDisabled;

  return (
    <div ref={tableRef} className="relative w-full h-full flex flex-col"
      style={{ fontFamily: 'Cinzel, serif' }}>

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

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            style={{
              background: 'linear-gradient(160deg, #141008 0%, #0e0b06 100%)',
              border: '1px solid rgba(255,209,82,0.25)',
              borderRadius: 10,
              padding: '40px 32px',
              maxWidth: 420,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 0 80px rgba(0,0,0,0.95)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: '#e8d5b0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Leave Game?
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 17, color: '#7a6a50', marginBottom: 36 }}>
              Your progress will be lost.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={onReturnToMenu}
                style={{
                  fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#e57373', background: 'rgba(229,115,115,0.08)',
                  border: '1px solid rgba(229,115,115,0.4)', borderRadius: 5,
                  padding: '18px 24px', cursor: 'pointer', width: '100%',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(229,115,115,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(229,115,115,0.08)'; }}
              >
                Leave
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  fontFamily: 'Cinzel, serif', fontSize: 17,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#5a5040', background: 'none',
                  border: '1px solid rgba(255,209,82,0.12)', borderRadius: 5,
                  padding: '16px 24px', cursor: 'pointer', width: '100%',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#7a6a50'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#5a5040'; }}
              >
                Continue Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main game layout — flex row: game column + desktop log sidebar */}
      <div className="relative z-20 flex h-full" style={{ paddingTop: 12 }}>

        {/* Game column — scrollable on mobile so action buttons are always reachable */}
        <div className="flex flex-col flex-1 min-w-0 h-full" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>

        {/* TOP: Bet panel */}
        <section className="flex-none w-full px-3 sm:px-6">
          <BetPanel state={state} isGuestOnline={isOnline && !isHost} onMenuClick={() => setShowExitConfirm(true)} />
        </section>

        {/* Opponent area */}
        <section className="flex-none flex flex-col items-center gap-2 px-3 sm:px-6" style={{ paddingTop: 16 }}>
          <BotArea
            state={state}
            isThinking={isThinking && !isHotSeat && !isOnline}
            playerName={(isHotSeat || isOnline) ? player2Name : 'Hoffman'}
            hideCards={isHotSeat && !showBotControls && !showRoundResult}
            hideHoleCard={!isHotSeat}
            flipForGuest={isOnline && !isHost}
            isActivePlayer={isHotSeat && showBotControls}
            activeEmoji={oppEmoji}
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
        <section className="flex-1 relative flex items-center justify-center w-full min-h-0 px-3 sm:px-6" style={{ zIndex: 5 }}>
          <div className="absolute top-2" style={{ left: 12 }}>
            <DeckPile count={state.deck.length} />
          </div>
          <TableTrumps
            playerTableTrumps={state.playerTableTrumps}
            botTableTrumps={state.botTableTrumps}
            lastInstantTrump={state.lastInstantTrump}
            isGuestOnline={isOnline && !isHost}
          />
        </section>

        {/* BOTTOM: Player area + Trump hand */}
        <section className="flex-none flex flex-col items-center px-3 sm:px-6" style={{ paddingTop: 8, gap: 8 }}>
          <PlayerArea
            state={state}
            playerName={(isHotSeat || isOnline) ? player1Name : 'Clancy'}
            hideCards={isHotSeat && showBotControls && !showRoundResult}
            flipForGuest={isOnline && !isHost}
            isOpponent={isHotSeat && showBotControls}
            onLogOpen={() => setShowLogModal(true)}
            activeEmoji={myEmoji}
            pickerOpen={pickerOpen}
            onEmojiToggle={togglePicker}
            onEmojiSelect={sendEmoji}
            onPickerClose={closePicker}
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

        {/* ACTION BUTTONS — sticky to bottom so they're always visible on mobile */}
        <div className="flex-none z-30" style={{ position: 'sticky', bottom: 0, background: 'rgba(8,6,4,0.97)', borderTop: '1px solid rgba(255,209,82,0.1)', padding: `0 12px max(12px, env(safe-area-inset-bottom))`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Top info row — fixed height 64px, always occupies space */}
        {(() => {
          if (turnSecondsLeft !== null) {
            const pct = turnSecondsLeft / TURN_TIMER_SEC;
            const r = 22;
            const circ = 2 * Math.PI * r;
            const danger = turnSecondsLeft <= 10;
            const color = danger ? '#ef4444' : '#ffd152';
            return (
              <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg width={56} height={56} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
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
          }
          // AI wait timer — show while bot is thinking
          if (aiWaitSecondsLeft !== null) {
            const pct = aiWaitSecondsLeft / TURN_TIMER_SEC;
            const r = 22;
            const circ = 2 * Math.PI * r;
            const danger = aiWaitSecondsLeft <= 10;
            const color = danger ? '#ef4444' : '#7a6a50';
            return (
              <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg width={56} height={56} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
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
                    {aiWaitSecondsLeft}
                  </text>
                </svg>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Waiting for Hoffman…
                </span>
              </div>
            );
          }

          // No timer — show status text at same fixed height
          const isGuestOnline = isOnline && !isHost;
          const canAct = isGuestOnline ? isBotTurn : !isActionDisabled;
          let msg = null;
          if (!canAct) {
            if (isGuestOnline) {
              msg = !isBotTurn ? 'Waiting for opponent…' : state.botStood ? 'You stood. Waiting…' : null;
            } else if (isHotSeat) {
              msg = null; // hot-seat has handoff screen
            } else {
              msg = isBotTurn ? 'Waiting for Hoffman…' : state.playerStood ? 'You stood. Hoffman plays…' : null;
            }
          }
          const oppSecs = opponentSecondsLeft;
          const oppDanger = oppSecs !== null && oppSecs <= 10;
          const oppColor = oppDanger ? '#ef4444' : '#ffd152';
          const oppCirc = 2 * Math.PI * 22;
          return (
            <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {msg && oppSecs !== null ? (
                <>
                  <svg width={56} height={56} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                    <circle cx={28} cy={28} r={22} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
                    <circle
                      cx={28} cy={28} r={22} fill="none"
                      stroke={oppColor} strokeWidth={3}
                      strokeDasharray={oppCirc}
                      strokeDashoffset={oppCirc * (1 - oppSecs / TURN_TIMER_SEC)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                    />
                    <text
                      x={28} y={28}
                      textAnchor="middle" dominantBaseline="central"
                      style={{ transform: 'rotate(90deg)', transformOrigin: '28px 28px', fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, fill: oppColor }}
                    >
                      {oppSecs}
                    </text>
                  </svg>
                  <span style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: oppDanger ? '#ef4444' : '#7a6a50', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {msg}
                  </span>
                </>
              ) : msg ? (
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#5a5040', letterSpacing: '0.06em' }}>{msg}</span>
              ) : null}
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

        </div>{/* end game column */}

        {/* Desktop log sidebar — hidden on mobile */}
        <aside
          className="hidden md:flex flex-col flex-none"
          style={{
            width: 220,
            borderLeft: '1px solid rgba(255,209,82,0.08)',
            background: 'rgba(8,6,4,0.6)',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <GameLogSidebar log={state.log} />
        </aside>

      </div>

      {/* ROUND RESULT */}
      {showRoundResult && (
        <RoundResult
          result={roundResult}
          onNext={handleNextRound}
          state={state}
          isGuestOnline={isOnline && !isHost}
          isOnline={isOnline}
          isHost={isHost}
          onHostTimeout={handleHostRoundTimeout}
          isFinalRound={gameOver}
        />
      )}

      {/* PHASE OVERLAY (phase transitions, oblivion) */}
      {overlay && overlay.type !== 'victory' && overlay.type !== 'defeat' && (
        <PhaseOverlay overlay={overlay} onDismiss={handleDismissOverlay} />
      )}

      {/* GAME OVER SCREEN (victory / defeat with full round summary) */}
      {overlay && (overlay.type === 'victory' || overlay.type === 'defeat') && (
        <GameOverScreen
          overlay={overlay}
          onDismiss={handleDismissOverlay}
          isGuestOnline={isOnline && !isHost}
        />
      )}

      {/* HOT-SEAT: handoff screen */}
      {showHandoff && (
        <HandoffScreen
          toPlayerName={handoffTarget}
          onReady={() => handleHandoffReady(activeIsP1 ? 'p1' : 'p2')}
        />
      )}

      {/* Mobile log modal */}
      {showLogModal && (
        <GameLogModal log={state.log} onClose={() => setShowLogModal(false)} />
      )}

      {/* Trump played banner */}
      <TrumpPlayedBanner
        lastPlayedTrump={state.lastPlayedTrump}
        isGuestOnline={isOnline && !isHost}
      />

      {/* Warning toast when a trump card effect partially failed (e.g. specific card not in deck) */}
      <TrumpWarningToast warning={state.trumpWarning} />

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
  const W = 38;
  const H = 54;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: W + 4, height: H + 4 }}>
        {count > 0 ? (
          Array.from({ length: stackCount }, (_, i) => (
            <div
              key={i}
              className="absolute rounded"
              style={{
                width: W,
                height: H,
                top: (stackCount - 1 - i) * 2,
                left: (stackCount - 1 - i) * 1,
                background: i === stackCount - 1
                  ? 'linear-gradient(145deg, #1c1410, #0e0a06)'
                  : 'linear-gradient(145deg, #160f08, #0a0704)',
                zIndex: i,
                border: `1px solid rgba(255,209,82,${i === stackCount - 1 ? '0.2' : '0.08'})`,
                boxShadow: i === stackCount - 1 ? '0 2px 8px rgba(0,0,0,0.9)' : 'none',
              }}
            >
              {i === stackCount - 1 && (
                <div className="w-full h-full flex items-center justify-center">
                  <span style={{ fontSize: 11, color: 'rgba(255,209,82,0.35)' }}>✦</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ width: W, height: H, border: '1px dashed #3a3020', borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#3a3020' }}>—</span>
          </div>
        )}
      </div>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: '#5a5040', letterSpacing: '0.04em' }}>
        {count} {count === 1 ? 'card' : 'cards'}
      </span>
    </div>
  );
}

