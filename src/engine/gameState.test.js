import { describe, it, expect } from 'vitest';
import { gameReducer, ACTIONS, ROUND_STATE, createInitialState } from './gameState.js';
import { PHASES, TRUMP_TYPES } from './constants.js';
import { createTrump } from './trumpEngine.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTrump(type, owner = 'player') {
  return createTrump(type, owner);
}

/** Build a state suitable for PLAYER_TURN or BOT_TURN tests */
function inRoundState(overrides = {}) {
  return {
    ...createInitialState(),
    phase: PHASES.FINGER,
    roundState: ROUND_STATE.PLAYER_TURN,
    deck: [
      { value: 3, id: 'card-3' },
      { value: 5, id: 'card-5' },
      { value: 8, id: 'card-8' },
      { value: 2, id: 'card-2' },
    ],
    playerHand: [{ value: 4, id: 'card-4' }, { value: 6, id: 'card-6' }],
    botHand: [{ value: 1, id: 'card-1' }, { value: 7, id: 'card-7' }],
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
    overlay: null,
    roundNumber: 1,
    ...overrides,
  };
}

// ─── START_GAME ───────────────────────────────────────────────────────────────

describe('START_GAME', () => {
  it('sets phase overlay and resets state', () => {
    const state = gameReducer(createInitialState(), { type: ACTIONS.START_GAME });
    expect(state.overlay).not.toBeNull();
    expect(state.overlay.type).toBe('phase');
    expect(state.phase).toBe(PHASES.FINGER);
  });
});

// ─── START_ROUND ──────────────────────────────────────────────────────────────

describe('START_ROUND', () => {
  it('deals one card to each player and advances to PLAYER_TURN', () => {
    const initial = createInitialState();
    const state = gameReducer(initial, { type: ACTIONS.START_ROUND });
    expect(state.playerHand).toHaveLength(1);
    expect(state.botHand).toHaveLength(1);
    expect(state.roundState).toBe(ROUND_STATE.PLAYER_TURN);
  });

  it('uses seeded shuffle when seed is provided', () => {
    const initial = createInitialState();
    const a = gameReducer(initial, { type: ACTIONS.START_ROUND, seed: 1234 });
    const b = gameReducer(initial, { type: ACTIONS.START_ROUND, seed: 1234 });
    expect(a.playerHand[0].value).toBe(b.playerHand[0].value);
    expect(a.botHand[0].value).toBe(b.botHand[0].value);
  });

  it('increments roundNumber', () => {
    const initial = createInitialState();
    const state = gameReducer(initial, { type: ACTIONS.START_ROUND });
    expect(state.roundNumber).toBe(1);
  });
});

// ─── PLAYER_HIT ───────────────────────────────────────────────────────────────

describe('PLAYER_HIT', () => {
  it('adds a card to playerHand and moves to BOT_TURN', () => {
    const state = inRoundState();
    const next = gameReducer(state, { type: ACTIONS.PLAYER_HIT });
    expect(next.playerHand).toHaveLength(3);
    expect(next.roundState).toBe(ROUND_STATE.BOT_TURN);
  });

  it('auto-stands and moves to BOT_TURN when total reaches target', () => {
    // playerHand = [4, 6] total=10; next card = 3 → total=13; still below 21
    // Set hand so next card busts (≥21)
    const state = inRoundState({
      playerHand: [{ value: 4, id: 'c4' }, { value: 10, id: 'c10' }],
      deck: [{ value: 11, id: 'c11' }],
    });
    // total = 14 + 11 = 25 → >= target(21) → auto-stand
    const next = gameReducer(state, { type: ACTIONS.PLAYER_HIT });
    expect(next.playerStood).toBe(true);
    expect(next.roundState).toBe(ROUND_STATE.BOT_TURN);
  });

  it('is a no-op when not in PLAYER_TURN', () => {
    const state = inRoundState({ roundState: ROUND_STATE.BOT_TURN });
    const next = gameReducer(state, { type: ACTIONS.PLAYER_HIT });
    expect(next).toBe(state);
  });

  it('is blocked by Dead Silence on bot table', () => {
    const deadSilence = makeTrump(TRUMP_TYPES.DEAD_SILENCE, 'bot');
    const state = inRoundState({ botTableTrumps: [deadSilence] });
    const next = gameReducer(state, { type: ACTIONS.PLAYER_HIT });
    expect(next.playerHand).toHaveLength(2); // no card drawn
    expect(next.log.some(l => l.msg.includes('Dead Silence'))).toBe(true);
  });
});

// ─── PLAYER_STAND ─────────────────────────────────────────────────────────────

describe('PLAYER_STAND', () => {
  it('sets playerStood=true and moves to BOT_TURN', () => {
    const state = inRoundState();
    const next = gameReducer(state, { type: ACTIONS.PLAYER_STAND });
    expect(next.playerStood).toBe(true);
    expect(next.roundState).toBe(ROUND_STATE.BOT_TURN);
  });

  it('is a no-op if player already stood', () => {
    const state = inRoundState({ playerStood: true });
    const next = gameReducer(state, { type: ACTIONS.PLAYER_STAND });
    expect(next).toBe(state);
  });
});

// ─── BOT_ACTION: hit ──────────────────────────────────────────────────────────

describe('BOT_ACTION hit', () => {
  it('adds a card to botHand', () => {
    const state = inRoundState({ roundState: ROUND_STATE.BOT_TURN });
    const next = gameReducer(state, { type: ACTIONS.BOT_ACTION, payload: { type: 'hit' } });
    expect(next.botHand).toHaveLength(3);
  });

  it('stays in BOT_TURN when player has already stood', () => {
    const state = inRoundState({ roundState: ROUND_STATE.BOT_TURN, playerStood: true });
    const next = gameReducer(state, { type: ACTIONS.BOT_ACTION, payload: { type: 'hit' } });
    expect(next.roundState).toBe(ROUND_STATE.BOT_TURN);
  });

  it('goes to PLAYER_TURN when player has not stood', () => {
    const state = inRoundState({ roundState: ROUND_STATE.BOT_TURN, playerStood: false });
    const next = gameReducer(state, { type: ACTIONS.BOT_ACTION, payload: { type: 'hit' } });
    expect(next.roundState).toBe(ROUND_STATE.PLAYER_TURN);
  });

  it('auto-stands bot when total reaches target', () => {
    const state = inRoundState({
      roundState: ROUND_STATE.BOT_TURN,
      botHand: [{ value: 1, id: 'c1' }, { value: 15, id: 'c15' }],
      deck: [{ value: 11, id: 'c11' }],
    });
    // total = 16 + 11 = 27 >= 21 → botStood = true
    const next = gameReducer(state, { type: ACTIONS.BOT_ACTION, payload: { type: 'hit' } });
    expect(next.botStood).toBe(true);
  });

  it('bot blocked by Dead Silence stands instead of drawing', () => {
    const deadSilence = makeTrump(TRUMP_TYPES.DEAD_SILENCE, 'player');
    const state = inRoundState({ roundState: ROUND_STATE.BOT_TURN, playerTableTrumps: [deadSilence] });
    const next = gameReducer(state, { type: ACTIONS.BOT_ACTION, payload: { type: 'hit' } });
    expect(next.botStood).toBe(true);
    expect(next.log.some(l => l.msg.includes('Dead Silence'))).toBe(true);
  });
});

// ─── BOT_ACTION: stand ────────────────────────────────────────────────────────

describe('BOT_ACTION stand', () => {
  it('sets botStood=true and always goes to PLAYER_TURN', () => {
    const state = inRoundState({ roundState: ROUND_STATE.BOT_TURN, playerStood: true });
    const next = gameReducer(state, { type: ACTIONS.BOT_ACTION, payload: { type: 'stand' } });
    expect(next.botStood).toBe(true);
    expect(next.roundState).toBe(ROUND_STATE.PLAYER_TURN);
  });
});

// ─── RESOLVE_ROUND ────────────────────────────────────────────────────────────

describe('RESOLVE_ROUND', () => {
  it('player wins when closer to target', () => {
    const state = inRoundState({
      roundState: ROUND_STATE.RESOLVING,
      playerStood: true,
      botStood: true,
      // player total=20, bot total=15 → player closer to 21
      playerHand: [{ value: 9, id: 'c9' }, { value: 11, id: 'c11' }],
      botHand: [{ value: 5, id: 'c5' }, { value: 10, id: 'c10' }],
    });
    const next = gameReducer(state, { type: ACTIONS.RESOLVE_ROUND });
    expect(next.roundResult.winner).toBe('player');
    expect(next.botHealth).toBeLessThan(10);
    expect(next.playerHealth).toBe(10);
  });

  it('bot wins when player busts', () => {
    const state = inRoundState({
      playerHand: [{ value: 11, id: 'c11' }, { value: 11, id: 'c11b' }], // 22, bust
      botHand: [{ value: 5, id: 'c5' }, { value: 8, id: 'c8' }],        // 13
    });
    const next = gameReducer(state, { type: ACTIONS.RESOLVE_ROUND });
    expect(next.roundResult.winner).toBe('bot');
    expect(next.playerHealth).toBeLessThan(10);
  });

  it('draw reduces both health', () => {
    const state = inRoundState({
      playerHand: [{ value: 5, id: 'c5' }, { value: 8, id: 'c8' }],
      botHand: [{ value: 3, id: 'c3' }, { value: 10, id: 'c10' }],
    });
    const next = gameReducer(state, { type: ACTIONS.RESOLVE_ROUND });
    expect(next.roundResult.winner).toBe('draw');
    expect(next.playerHealth).toBeLessThan(10);
    expect(next.botHealth).toBeLessThan(10);
  });

  it('sets gameOver and winner when health drops to 0', () => {
    const state = inRoundState({
      playerHealth: 1,
      playerBet: 1,
      botBet: 1,
      playerHand: [{ value: 11, id: 'c11' }, { value: 11, id: 'c11b' }], // bust
      botHand: [{ value: 5, id: 'c5' }, { value: 8, id: 'c8' }],
    });
    const next = gameReducer(state, { type: ACTIONS.RESOLVE_ROUND });
    expect(next.gameOver).toBe(true);
    expect(next.winner).toBe('bot');
    expect(next.overlay).not.toBeNull();
  });

  it('Escape trump grants auto-win', () => {
    const escape = makeTrump(TRUMP_TYPES.ESCAPE, 'player');
    const state = inRoundState({
      playerTableTrumps: [escape],
      // player hand worse than bot for normal rules
      playerHand: [{ value: 1, id: 'c1' }, { value: 2, id: 'c2' }],
      botHand: [{ value: 5, id: 'c5' }, { value: 10, id: 'c10' }],
    });
    const next = gameReducer(state, { type: ACTIONS.RESOLVE_ROUND });
    expect(next.roundResult.winner).toBe('player');
  });
});

// ─── NEXT_ROUND ───────────────────────────────────────────────────────────────

describe('NEXT_ROUND', () => {
  it('stays in same phase when phase rounds not exhausted', () => {
    // FINGER has 3 rounds; after round 2 → still FINGER
    const state = inRoundState({ phase: PHASES.FINGER, roundNumber: 2 });
    const next = gameReducer(state, { type: ACTIONS.NEXT_ROUND });
    expect(next.phase).toBe(PHASES.FINGER);
    expect(next.roundState).toBe(ROUND_STATE.DEALING);
  });

  it('transitions FINGER → SHOCK when phase rounds exhausted', () => {
    const state = inRoundState({ phase: PHASES.FINGER, roundNumber: 3 }); // 3 = FINGER.rounds
    const next = gameReducer(state, { type: ACTIONS.NEXT_ROUND });
    expect(next.phase).toBe(PHASES.SHOCK);
    expect(next.overlay?.type).toBe('phase');
  });

  it('transitions SHOCK → SAW', () => {
    const state = inRoundState({ phase: PHASES.SHOCK, roundNumber: 4 }); // SHOCK.rounds = 4
    const next = gameReducer(state, { type: ACTIONS.NEXT_ROUND });
    expect(next.phase).toBe(PHASES.SAW);
  });
});

// ─── DISMISS_OVERLAY ──────────────────────────────────────────────────────────

describe('DISMISS_OVERLAY', () => {
  it('clears phase overlay and sets DEALING state', () => {
    const state = inRoundState({
      overlay: { type: 'phase', message: 'FINGER PHASE', subMessage: '' },
    });
    const next = gameReducer(state, { type: ACTIONS.DISMISS_OVERLAY });
    expect(next.overlay).toBeNull();
    expect(next.roundState).toBe(ROUND_STATE.DEALING);
  });

  it('decrements roundNumber for oblivion overlay', () => {
    const state = inRoundState({
      roundNumber: 3,
      overlay: { type: 'oblivion', message: 'OBLIVION', subMessage: '' },
    });
    const next = gameReducer(state, { type: ACTIONS.DISMISS_OVERLAY });
    expect(next.roundNumber).toBe(2);
    expect(next.roundState).toBe(ROUND_STATE.DEALING);
  });

  it('just clears other overlay types', () => {
    const state = inRoundState({ overlay: { type: 'victory', message: 'WIN' } });
    const next = gameReducer(state, { type: ACTIONS.DISMISS_OVERLAY });
    expect(next.overlay).toBeNull();
  });
});

// ─── PLAYER_USE_TRUMP ─────────────────────────────────────────────────────────

describe('PLAYER_USE_TRUMP', () => {
  it('applies trump effect and moves to BOT_TURN', () => {
    const shield = makeTrump(TRUMP_TYPES.SHIELD, 'player');
    const state = inRoundState({ playerTrumpHand: [shield] });
    const next = gameReducer(state, { type: ACTIONS.PLAYER_USE_TRUMP, trump: shield });
    expect(next.roundState).toBe(ROUND_STATE.BOT_TURN);
    expect(next.playerTableTrumps.some(t => t.type === TRUMP_TYPES.SHIELD)).toBe(true);
  });

  it('is blocked by DESTROY_PLUS_PLUS on bot table', () => {
    const dpp = makeTrump(TRUMP_TYPES.DESTROY_PLUS_PLUS, 'bot');
    const shield = makeTrump(TRUMP_TYPES.SHIELD, 'player');
    const state = inRoundState({
      playerTrumpHand: [shield],
      botTableTrumps: [dpp],
    });
    const next = gameReducer(state, { type: ACTIONS.PLAYER_USE_TRUMP, trump: shield });
    expect(next.playerTableTrumps).toHaveLength(0);
    expect(next.log.some(l => l.msg.includes("Destroy++"))).toBe(true);
  });

  it('increments trumpsUsedThisTurn', () => {
    const shield = makeTrump(TRUMP_TYPES.SHIELD, 'player');
    const state = inRoundState({ playerTrumpHand: [shield], trumpsUsedThisTurn: 0 });
    const next = gameReducer(state, { type: ACTIONS.PLAYER_USE_TRUMP, trump: shield });
    expect(next.trumpsUsedThisTurn).toBe(1);
  });

  it('removes MIND_SHIFT from bot table when player uses 2 trumps', () => {
    const mindShift = makeTrump(TRUMP_TYPES.MIND_SHIFT, 'bot');
    const shield1 = makeTrump(TRUMP_TYPES.SHIELD, 'player');
    const shield2 = makeTrump(TRUMP_TYPES.SHIELD_PLUS, 'player');
    // First trump use
    const state1 = inRoundState({
      playerTrumpHand: [shield1, shield2],
      botTableTrumps: [mindShift],
      trumpsUsedThisTurn: 0,
    });
    const after1 = gameReducer(state1, { type: ACTIONS.PLAYER_USE_TRUMP, trump: shield1 });
    // Restore PLAYER_TURN for second use
    const state2 = { ...after1, roundState: ROUND_STATE.PLAYER_TURN };
    const after2 = gameReducer(state2, { type: ACTIONS.PLAYER_USE_TRUMP, trump: shield2 });
    expect(after2.botTableTrumps.some(t => t.type === TRUMP_TYPES.MIND_SHIFT)).toBe(false);
  });
});

// ─── ADD_LOG ──────────────────────────────────────────────────────────────────

describe('ADD_LOG', () => {
  it('appends a message to the log', () => {
    const state = inRoundState({ log: [] });
    const next = gameReducer(state, { type: ACTIONS.ADD_LOG, message: 'test message' });
    expect(next.log).toHaveLength(1);
    expect(next.log[0].msg).toBe('test message');
  });
});
