import { createDeck, shuffleDeck, shuffleDeckWithSeed, drawCard, getHandTotal, isBust, drawBestCard } from './deck.js';
import { PHASES, PHASE_CONFIG, TRUMP_TYPES, PERMANENT_TRUMPS, MAX_TABLE_TRUMPS } from './constants.js';
import { drawNTrumps, getEffectiveTarget, computeBetModifiers, applyTrump, applyMindShiftEnd, createTrump, drawRandomTrump } from './trumpEngine.js';
import { PLAYER_TRUMP_POOL, BOT_TRUMP_POOL } from './constants.js';

export const ACTIONS = {
  START_GAME: 'START_GAME',
  START_ROUND: 'START_ROUND',
  PLAYER_HIT: 'PLAYER_HIT',
  PLAYER_STAND: 'PLAYER_STAND',
  BOT_ACTION: 'BOT_ACTION',
  TRIGGER_BOT_TURN: 'TRIGGER_BOT_TURN',
  PLAYER_USE_TRUMP: 'PLAYER_USE_TRUMP',
  RESOLVE_ROUND: 'RESOLVE_ROUND',
  NEXT_ROUND: 'NEXT_ROUND',
  NEXT_PHASE: 'NEXT_PHASE',
  DISMISS_OVERLAY: 'DISMISS_OVERLAY',
  SHOW_GAME_OVER_OVERLAY: 'SHOW_GAME_OVER_OVERLAY',
  ADD_LOG: 'ADD_LOG',
};

export const TURN = { PLAYER: 'player', BOT: 'bot' };
export const ROUND_STATE = {
  DEALING: 'DEALING',
  PLAYER_TURN: 'PLAYER_TURN',
  BOT_TURN: 'BOT_TURN',
  RESOLVING: 'RESOLVING',
  ROUND_OVER: 'ROUND_OVER',
};

const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

export function createInitialState() {
  return {
    phase: PHASES.FINGER,
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
    roundNumber: 0,
    roundState: ROUND_STATE.DEALING,
    deck: [],
    playerHand: [],
    botHand: [],       // botHand[0] is face-down, rest are face-up
    playerStood: false,
    botStood: false,
    playerTableTrumps: [],
    botTableTrumps: [],
    playerTrumpHand: [],
    botTrumpHand: [],
    playerBet: 1,
    botBet: 1,
    playerHealth: 10,
    botHealth: 10,
    log: [],
    overlay: null,     // { type, message, subMessage }
    winner: null,      // 'player' | 'bot' | null
    roundResult: null, // { winner, playerTotal, botTotal, target }
    trumpsUsedThisTurn: 0,  // for Mind Shift tracking
    botTrumpsUsedThisTurn: 0,
    playerTrumpsUsedTotal: 0,
    botKilledPlayerTrumpsTotal: 0,
    gameOver: false,
    lastInstantTrump: null,  // { trump, owner: 'player'|'bot' } — shown briefly after instant trump use
    lastPlayedTrump: null,   // { trump, owner: 'player'|'bot' } — any trump played, for banner display
  };
}

function dealInitialCards(deck) {
  // Each player draws 1 face-down card + may draw more (starts with just 1)
  const { card: playerDown, remaining: r1 } = drawCard(deck);
  const { card: botDown, remaining: r2 } = drawCard(r1);
  return {
    playerHand: [playerDown],
    botHand: [botDown],
    deck: r2,
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START_GAME: {
      const fresh = createInitialState();
      return {
        ...fresh,
        overlay: {
          type: 'phase',
          phase: PHASES.FINGER,
          message: 'FINGER PHASE',
          subMessage: 'No trump cards. Card count carefully. Lose... and Lucas takes your fingers.',
        },
      };
    }

    case ACTIONS.START_ROUND: {
      const hasTrumps = PHASE_CONFIG[state.phase].hasTrumps;
      // Support seeded shuffle for P2P online mode (ensures identical decks on both clients)
      const shuffled = action.seed != null
        ? shuffleDeckWithSeed(createDeck(), action.seed)
        : shuffleDeck(createDeck());
      const { playerHand, botHand, deck } = dealInitialCards(shuffled);

      // Give starting trumps
      let playerTrumpHand = [...state.playerTrumpHand];
      let botTrumpHand = [...state.botTrumpHand];

      if (hasTrumps && state.roundNumber === 0) {
        // First shock phase round — give initial trumps
        playerTrumpHand = drawNTrumps(2, PLAYER_TRUMP_POOL, 'player');
        botTrumpHand = drawNTrumps(2, BOT_TRUMP_POOL, 'bot');
      } else if (hasTrumps) {
        // Give 1 trump at start of each round
        playerTrumpHand = [...playerTrumpHand, drawRandomTrump(PLAYER_TRUMP_POOL, 'player')];
        botTrumpHand = [...botTrumpHand, drawRandomTrump(BOT_TRUMP_POOL, 'bot')];
      }

      const phaseConfig = PHASE_CONFIG[state.phase];
      const sawExtended = state.phase === PHASES.SAW && state.roundNumber >= phaseConfig.rounds;
      const baseBet = sawExtended
        ? phaseConfig.baseBet + Math.floor(phaseConfig.rounds / 2) + (state.roundNumber - phaseConfig.rounds + 1)
        : phaseConfig.baseBet + Math.floor(state.roundNumber / 2);

      return {
        ...state,
        deck,
        playerHand,
        botHand,
        playerStood: false,
        botStood: false,
        playerTableTrumps: [],
        botTableTrumps: [],
        playerTrumpHand,
        botTrumpHand,
        playerBet: baseBet,
        botBet: baseBet,
        roundState: ROUND_STATE.PLAYER_TURN,
        roundResult: null,
        winner: null,
        overlay: null,
        log: [
          ...state.log,
          { msg: `Round ${state.roundNumber + 1} begins.`, time: Date.now() },
          { msg: `Each player receives 1 hidden card face-down.`, time: Date.now() + 1 },
        ],
        roundNumber: state.roundNumber + 1,
        trumpsUsedThisTurn: 0,
        botTrumpsUsedThisTurn: 0,
        lastInstantTrump: null,
        lastPlayedTrump: null,
      };
    }

    case ACTIONS.PLAYER_HIT: {
      if (state.roundState !== ROUND_STATE.PLAYER_TURN || state.playerStood) return state;
      // Check Dead Silence
      if (state.botTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE)) {
        return {
          ...state,
          log: [...state.log, { msg: 'Dead Silence — you cannot draw!', time: Date.now() }],
        };
      }
      if (state.deck.length === 0) return state;

      const { card, remaining } = drawCard(state.deck);
      const newHand = [...state.playerHand, card];
      const total = getHandTotal(newHand);
      const log = [...state.log, { msg: `You draw ${card.value}. Total: ${total}.`, time: Date.now() }];

      return {
        ...state,
        playerHand: newHand,
        deck: remaining,
        roundState: ROUND_STATE.BOT_TURN,
        botStood: false, // P1 hit resets P2's stand — P2 must decide again
        log,
      };
    }

    case ACTIONS.PLAYER_STAND: {
      if (state.roundState !== ROUND_STATE.PLAYER_TURN || state.playerStood) return state;
      return {
        ...state,
        playerStood: true,
        roundState: state.botStood ? ROUND_STATE.PLAYER_TURN : ROUND_STATE.BOT_TURN,
        log: [...state.log, { msg: 'You stand.', time: Date.now() }],
      };
    }

    case ACTIONS.PLAYER_USE_TRUMP: {
      // Only allow trump use during PLAYER_TURN. After PLAYER_STAND the round state
      // transitions to BOT_TURN, so this guard effectively blocks post-stand trump use.
      if (state.roundState !== ROUND_STATE.PLAYER_TURN) return state;
      const { trump } = action;

      // Check if blocked by Destroy++
      if (state.botTableTrumps.some(t => t.type === TRUMP_TYPES.DESTROY_PLUS_PLUS)) {
        return {
          ...state,
          log: [...state.log, { msg: "You can't use trumps — Destroy++ blocks you!", time: Date.now() }],
        };
      }

      const result = applyTrump(trump, state, 'player');

      const newUsedCount = state.trumpsUsedThisTurn + 1;
      const isInstant = !PERMANENT_TRUMPS.has(trump.type);
      let newState = {
        ...state,
        ...result,
        trumpsUsedThisTurn: newUsedCount,
        playerTrumpsUsedTotal: state.playerTrumpsUsedTotal + 1,
        // Trump use does NOT pass the turn — player keeps acting (mirrors bot trump behaviour)
        roundState: state.roundState,
        playerBet: state.playerBet + (result.playerBetDelta ?? 0),
        botBet: state.botBet + (result.botBetDelta ?? 0),
        lastInstantTrump: isInstant ? { trump, owner: 'player' } : state.lastInstantTrump,
        lastPlayedTrump: { trump, owner: 'player' },
      };

      // Mind Shift removal check
      if (result.botTableTrumps.some(t => t.type === TRUMP_TYPES.MIND_SHIFT) && newUsedCount >= 2) {
        newState.botTableTrumps = newState.botTableTrumps.filter(t => t.type !== TRUMP_TYPES.MIND_SHIFT);
        newState.log = [...newState.log, { msg: 'Mind Shift broken — used 2 trumps!', time: Date.now() }];
      }
      if (result.botTableTrumps.some(t => t.type === TRUMP_TYPES.MIND_SHIFT_PLUS) && newUsedCount >= 3) {
        newState.botTableTrumps = newState.botTableTrumps.filter(t => t.type !== TRUMP_TYPES.MIND_SHIFT_PLUS);
        newState.log = [...newState.log, { msg: 'Mind Shift+ broken — used 3 trumps!', time: Date.now() }];
      }

      if (result.cancelRound) {
        return { ...newState, overlay: { type: 'oblivion', message: 'OBLIVION', subMessage: 'The round is cancelled. Starting fresh...' } };
      }

      return newState;
    }

    case ACTIONS.BOT_ACTION: {
      const { type: botAction, trump } = action.payload;
      // If player already stood, bot keeps BOT_TURN after hit/trump so it can chain actions.
      // Only revert to PLAYER_TURN once bot stands (auto-resolve then fires).
      // In hot-seat mode playerStood is reset on bot hit (see below), so nextTurn ends up PLAYER_TURN anyway.
      const nextTurn = state.playerStood ? ROUND_STATE.BOT_TURN : ROUND_STATE.PLAYER_TURN;

      if (botAction === 'stand') {
        return {
          ...state,
          botStood: true,
          roundState: ROUND_STATE.PLAYER_TURN, // always go to PLAYER_TURN on stand (auto-resolve will handle it)
          log: [...state.log, { msg: 'Hoffman stands.', time: Date.now() }],
        };
      }

      if (botAction === 'hit') {
        if (state.playerTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE)) {
          return {
            ...state,
            botStood: true,
            roundState: ROUND_STATE.PLAYER_TURN,
            log: [...state.log, { msg: 'Dead Silence — Hoffman cannot draw!', time: Date.now() }],
          };
        }
        if (state.deck.length === 0) {
          return { ...state, botStood: true, roundState: ROUND_STATE.PLAYER_TURN };
        }
        const { card, remaining } = drawCard(state.deck);
        const newHand = [...state.botHand, card];
        const total = getHandTotal(newHand);
        const log = [...state.log, { msg: `Hoffman draws. His total approaches...`, time: Date.now() }];

        // Only reset playerStood if player hasn't stood yet (hot-seat: P2 hit means P1 decides again).
        // When player already stood (AI mode), keep playerStood=true so auto-resolve can fire.
        return {
          ...state,
          botHand: newHand,
          deck: remaining,
          roundState: nextTurn,
          playerStood: state.playerStood ? true : false,
          log,
        };
      }

      if (botAction === 'trump' && trump) {
        const result = applyTrump(trump, state, 'bot');
        const newBotUsed = state.botTrumpsUsedThisTurn + 1;
        const isInstant = !PERMANENT_TRUMPS.has(trump.type);
        return {
          ...state,
          ...result,
          botTrumpsUsedThisTurn: newBotUsed,
          // Trump use does NOT pass the turn — bot keeps acting
          roundState: state.roundState,
          playerBet: state.playerBet + (result.playerBetDelta ?? 0),
          botBet: state.botBet + (result.botBetDelta ?? 0),
          lastInstantTrump: isInstant ? { trump, owner: 'bot' } : state.lastInstantTrump,
          lastPlayedTrump: { trump, owner: 'bot' },
        };
      }

      return state;
    }

    case ACTIONS.RESOLVE_ROUND: {
      const target = getEffectiveTarget([...state.playerTableTrumps, ...state.botTableTrumps]);
      const playerTotal = getHandTotal(state.playerHand);
      const botTotal = getHandTotal(state.botHand);

      const playerBust = playerTotal > target;
      const botBust = botTotal > target;

      // Check Escape trump
      const playerEscape = state.playerTableTrumps.some(t => t.type === TRUMP_TYPES.ESCAPE);
      const botEscape = state.botTableTrumps.some(t => t.type === TRUMP_TYPES.ESCAPE);

      let roundWinner;
      if (playerEscape && !botEscape) {
        roundWinner = 'player';
      } else if (botEscape && !playerEscape) {
        roundWinner = 'bot';
      } else if (playerBust && botBust) {
        roundWinner = Math.abs(target - playerTotal) < Math.abs(target - botTotal) ? 'player' :
          Math.abs(target - playerTotal) > Math.abs(target - botTotal) ? 'bot' : 'draw';
      } else if (playerBust) {
        roundWinner = 'bot';
      } else if (botBust) {
        roundWinner = 'player';
      } else if (playerTotal === botTotal) {
        roundWinner = 'draw';
      } else {
        roundWinner = Math.abs(target - playerTotal) <= Math.abs(target - botTotal) ? 'player' : 'bot';
      }

      const { playerBetMod, botBetMod } = computeBetModifiers(
        state.playerTableTrumps, state.botTableTrumps,
        state.playerHand, state.botHand,
        state.playerTrumpHand, state.botTrumpHand,
        target
      );

      const effectivePlayerBet = Math.max(0, state.playerBet + playerBetMod);
      const effectiveBotBet = Math.max(0, state.botBet + botBetMod);

      let newPlayerHealth = state.playerHealth;
      let newBotHealth = state.botHealth;

      if (roundWinner === 'bot') {
        newPlayerHealth -= effectivePlayerBet;
      } else if (roundWinner === 'player') {
        newBotHealth -= effectiveBotBet;
      } else {
        // Draw — both lose
        newPlayerHealth -= effectivePlayerBet;
        newBotHealth -= effectiveBotBet;
      }

      // Apply Mind Shift at end of round
      const mindShiftedState = applyMindShiftEnd({
        ...state,
        playerHealth: newPlayerHealth,
        botHealth: newBotHealth,
      });

      const gameOver = mindShiftedState.playerHealth <= 0 || mindShiftedState.botHealth <= 0;
      const gameWinner = mindShiftedState.playerHealth <= 0 && mindShiftedState.botHealth <= 0 ? 'draw' :
        mindShiftedState.playerHealth <= 0 ? 'bot' : mindShiftedState.botHealth <= 0 ? 'player' : null;

      const resultMsg = roundWinner === 'player'
        ? `You win the round! Hoffman loses ${effectiveBotBet} health.`
        : roundWinner === 'bot'
          ? `Hoffman wins the round. You lose ${effectivePlayerBet} health.`
          : `Draw — both suffer!`;

      return {
        ...mindShiftedState,
        roundState: ROUND_STATE.ROUND_OVER,
        roundResult: { winner: roundWinner, playerTotal, botTotal, target, effectivePlayerBet, effectiveBotBet },
        gameOver,
        winner: gameWinner,
        lastInstantTrump: null,
        lastPlayedTrump: null,
        log: [...mindShiftedState.log, { msg: resultMsg, time: Date.now() }],
        // No overlay here — GameTable shows RoundResult first ("See Final Result →"),
        // then reveals victory/defeat overlay via finalRoundSeen / SHOW_FINAL_OVERLAY.
        overlay: null,
      };
    }

    case ACTIONS.NEXT_ROUND: {
      // Check phase transition
      const phaseRounds = PHASE_CONFIG[state.phase].rounds;
      const phaseOver = state.roundNumber >= phaseRounds;

      if (phaseOver && state.phase !== PHASES.SAW) {
        const nextPhase = state.phase === PHASES.FINGER ? PHASES.SHOCK : PHASES.SAW;
        return {
          ...state,
          phase: nextPhase,
          roundNumber: 0,
          playerStood: false,
          botStood: false,
          overlay: {
            type: 'phase',
            phase: nextPhase,
            message: nextPhase === PHASES.SHOCK ? 'SHOCK PHASE' : 'SAW PHASE',
            subMessage: PHASE_CONFIG[nextPhase].description,
          },
        };
      }

      // SAW phase extended — keep going, saw closes in
      if (phaseOver && state.phase === PHASES.SAW) {
        const extraRound = state.roundNumber - phaseRounds + 1;
        const sawMessages = [
          { message: 'THE SAW CREEPS CLOSER', subMessage: 'The blades spin faster. Lucas laughs.' },
          { message: 'NO ESCAPE', subMessage: 'Flesh meets metal. One more round.' },
          { message: 'STILL BREATHING?', subMessage: 'The machine grows impatient.' },
          { message: 'LAST CHANCE', subMessage: 'One of you dies tonight.' },
        ];
        const msgIdx = Math.min(extraRound - 1, sawMessages.length - 1);
        return {
          ...state,
          playerStood: false,
          botStood: false,
          overlay: {
            type: 'phase',
            phase: PHASES.SAW,
            ...sawMessages[msgIdx],
          },
        };
      }

      return {
        ...state,
        overlay: null,
        roundState: ROUND_STATE.DEALING,
        playerStood: false,
        botStood: false,
      };
    }

    case ACTIONS.DISMISS_OVERLAY: {
      if (state.overlay?.type === 'phase') {
        return { ...state, overlay: null, roundState: ROUND_STATE.DEALING };
      }
      if (state.overlay?.type === 'oblivion') {
        // Reset round
        return { ...state, overlay: null, roundState: ROUND_STATE.DEALING, roundNumber: state.roundNumber - 1 };
      }
      return { ...state, overlay: null };
    }

    case ACTIONS.SHOW_GAME_OVER_OVERLAY: {
      const w = state.winner;
      return {
        ...state,
        overlay: {
          type: w === 'player' ? 'victory' : 'defeat',
          message: w === 'player' ? 'YOU SURVIVE' : 'YOU FALL',
          subMessage: w === 'player'
            ? 'Hoffman\'s saw blade stops. Lucas sneers. The game is over.'
            : 'The saw inches forward. Darkness takes you.',
        },
      };
    }

    case ACTIONS.TRIGGER_BOT_TURN: {
      if (state.roundState !== ROUND_STATE.PLAYER_TURN) return state;
      return { ...state, roundState: ROUND_STATE.BOT_TURN };
    }

    case ACTIONS.ADD_LOG: {
      return {
        ...state,
        log: [...state.log, { msg: action.message, time: Date.now() }],
      };
    }

    default:
      return state;
  }
}

