import { describe, it, expect } from 'vitest';
import { TRUMP_TYPES } from './constants.js';
import {
  getEffectiveTarget,
  computeBetModifiers,
  applyTrump,
  applyMindShiftEnd,
  createTrump,
} from './trumpEngine.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTrump(type, owner = 'player') {
  return createTrump(type, owner);
}

function baseState(overrides = {}) {
  return {
    deck: [{ value: 5, id: 'card-5' }, { value: 3, id: 'card-3' }, { value: 8, id: 'card-8' }],
    playerHand: [{ value: 4, id: 'card-4' }, { value: 6, id: 'card-6' }],
    botHand: [{ value: 2, id: 'card-2' }, { value: 7, id: 'card-7' }],
    playerTableTrumps: [],
    botTableTrumps: [],
    playerTrumpHand: [],
    botTrumpHand: [],
    log: [],
    ...overrides,
  };
}

// ─── getEffectiveTarget ───────────────────────────────────────────────────────

describe('getEffectiveTarget', () => {
  it('returns 21 with no Go-For cards', () => {
    expect(getEffectiveTarget([])).toBe(21);
  });

  it('returns 17 with GO_FOR_17', () => {
    expect(getEffectiveTarget([makeTrump(TRUMP_TYPES.GO_FOR_17)])).toBe(17);
  });

  it('returns 24 with GO_FOR_24', () => {
    expect(getEffectiveTarget([makeTrump(TRUMP_TYPES.GO_FOR_24)])).toBe(24);
  });

  it('returns 27 with GO_FOR_27', () => {
    expect(getEffectiveTarget([makeTrump(TRUMP_TYPES.GO_FOR_27)])).toBe(27);
  });

  it('last Go-For card wins when multiple present', () => {
    // GO_FOR_24 processed after GO_FOR_17 → target = 24
    const result = getEffectiveTarget([
      makeTrump(TRUMP_TYPES.GO_FOR_17),
      makeTrump(TRUMP_TYPES.GO_FOR_24),
    ]);
    expect(result).toBe(24);
  });
});

// ─── computeBetModifiers ─────────────────────────────────────────────────────

describe('computeBetModifiers', () => {
  it('returns zero modifiers with no trumps', () => {
    const { playerBetMod, botBetMod } = computeBetModifiers([], [], [], [], [], [], 21);
    expect(playerBetMod).toBe(0);
    expect(botBetMod).toBe(0);
  });

  it('ONE_UP on bot table increases playerBetMod by 1', () => {
    const botTable = [makeTrump(TRUMP_TYPES.ONE_UP, 'bot')];
    const { playerBetMod } = computeBetModifiers([], botTable, [], [], [], [], 21);
    expect(playerBetMod).toBe(1);
  });

  it('TWO_UP on bot table increases playerBetMod by 2', () => {
    const botTable = [makeTrump(TRUMP_TYPES.TWO_UP, 'bot')];
    const { playerBetMod } = computeBetModifiers([], botTable, [], [], [], [], 21);
    expect(playerBetMod).toBe(2);
  });

  it('SHIELD on player table decreases playerBetMod by 1', () => {
    const playerTable = [makeTrump(TRUMP_TYPES.SHIELD, 'player')];
    const { playerBetMod } = computeBetModifiers(playerTable, [], [], [], [], [], 21);
    expect(playerBetMod).toBe(-1);
  });

  it('SHIELD_PLUS on player table decreases playerBetMod by 2', () => {
    const playerTable = [makeTrump(TRUMP_TYPES.SHIELD_PLUS, 'player')];
    const { playerBetMod } = computeBetModifiers(playerTable, [], [], [], [], [], 21);
    expect(playerBetMod).toBe(-2);
  });

  it('TWENTY_ONE_UP on bot table raises playerBetMod by 21 when bot has exact target', () => {
    const botTable = [makeTrump(TRUMP_TYPES.TWENTY_ONE_UP, 'bot')];
    // botHand total = 21 (the target)
    const botHand = [{ value: 10 }, { value: 11 }];
    const { playerBetMod } = computeBetModifiers([], botTable, [], botHand, [], [], 21);
    expect(playerBetMod).toBe(21);
  });

  it('DESPERATION raises both mods by 100', () => {
    const botTable = [makeTrump(TRUMP_TYPES.DESPERATION, 'bot')];
    const { playerBetMod, botBetMod } = computeBetModifiers([], botTable, [], [], [], [], 21);
    expect(playerBetMod).toBe(100);
    expect(botBetMod).toBe(100);
  });

  it('DESIRE on bot table raises playerBetMod by floor(playerHeld / 2)', () => {
    const botTable = [makeTrump(TRUMP_TYPES.DESIRE, 'bot')];
    const playerHeld = [makeTrump(TRUMP_TYPES.CARD_2), makeTrump(TRUMP_TYPES.CARD_3), makeTrump(TRUMP_TYPES.CARD_4)];
    const { playerBetMod } = computeBetModifiers([], botTable, [], [], playerHeld, [], 21);
    expect(playerBetMod).toBe(1); // floor(3/2) = 1
  });
});

// ─── applyTrump ──────────────────────────────────────────────────────────────

describe('applyTrump — permanent cards', () => {
  it('SHIELD places trump on player table', () => {
    const trump = makeTrump(TRUMP_TYPES.SHIELD, 'player');
    const state = baseState({ playerTrumpHand: [trump] });
    const result = applyTrump(trump, state, 'player');
    expect(result.playerTableTrumps.some(t => t.type === TRUMP_TYPES.SHIELD)).toBe(true);
  });

  it('GO_FOR_17 replaces existing Go-For card on table', () => {
    const go24 = makeTrump(TRUMP_TYPES.GO_FOR_24, 'player');
    const go17 = makeTrump(TRUMP_TYPES.GO_FOR_17, 'player');
    const state = baseState({
      playerTrumpHand: [go17],
      playerTableTrumps: [go24],
    });
    const result = applyTrump(go17, state, 'player');
    expect(result.playerTableTrumps.some(t => t.type === TRUMP_TYPES.GO_FOR_24)).toBe(false);
    expect(result.playerTableTrumps.some(t => t.type === TRUMP_TYPES.GO_FOR_17)).toBe(true);
  });

  it('DESTROY removes last trump from opponent table', () => {
    const shield = makeTrump(TRUMP_TYPES.SHIELD, 'bot');
    const destroy = makeTrump(TRUMP_TYPES.DESTROY, 'player');
    const state = baseState({
      playerTrumpHand: [destroy],
      botTableTrumps: [shield],
    });
    const result = applyTrump(destroy, state, 'player');
    expect(result.botTableTrumps).toHaveLength(0);
  });

  it('DESTROY_PLUS clears all opponent table trumps', () => {
    const dp = makeTrump(TRUMP_TYPES.DESTROY_PLUS, 'player');
    const state = baseState({
      playerTrumpHand: [dp],
      botTableTrumps: [
        makeTrump(TRUMP_TYPES.SHIELD, 'bot'),
        makeTrump(TRUMP_TYPES.ONE_UP, 'bot'),
      ],
    });
    const result = applyTrump(dp, state, 'player');
    expect(result.botTableTrumps).toHaveLength(0);
  });

  it('ONE_UP draws an extra trump for the player', () => {
    const oneUp = makeTrump(TRUMP_TYPES.ONE_UP, 'player');
    const state = baseState({ playerTrumpHand: [oneUp] });
    const result = applyTrump(oneUp, state, 'player');
    // ONE_UP leaves hand (was consumed) but draws 1 new trump → net 0 held after placing
    // Actually: newMyHeld = myHeld.filter(not trump) + drawRandom = 0 + 1 = 1
    expect(result.playerTrumpHand).toHaveLength(1);
  });

  it('OBLIVION sets cancelRound=true', () => {
    const ob = makeTrump(TRUMP_TYPES.OBLIVION, 'player');
    const state = baseState({ playerTrumpHand: [ob] });
    const result = applyTrump(ob, state, 'player');
    expect(result.cancelRound).toBe(true);
  });
});

describe('applyTrump — instant cards', () => {
  it('CARD_5 draws the 5 from the deck and adds to player hand', () => {
    const card5Trump = makeTrump(TRUMP_TYPES.CARD_5, 'player');
    const state = baseState({ playerTrumpHand: [card5Trump] });
    const result = applyTrump(card5Trump, state, 'player');
    expect(result.playerHand.some(c => c.value === 5)).toBe(true);
    expect(result.deck.every(c => c.value !== 5)).toBe(true);
  });

  it('CARD_5 logs a message when the card is not in deck', () => {
    const card5Trump = makeTrump(TRUMP_TYPES.CARD_5, 'player');
    const stateWithout5 = baseState({
      deck: [{ value: 3, id: 'card-3' }, { value: 8, id: 'card-8' }],
      playerTrumpHand: [card5Trump],
    });
    const result = applyTrump(card5Trump, stateWithout5, 'player');
    expect(result.log.some(l => l.msg.includes('hidden card'))).toBe(true);
  });

  it('REMOVE takes opponent last face-up card back to deck', () => {
    const remove = makeTrump(TRUMP_TYPES.REMOVE, 'player');
    // botHand[0] = face-down (value 2), botHand[1] = face-up (value 7)
    const state = baseState({ playerTrumpHand: [remove] });
    const result = applyTrump(remove, state, 'player');
    expect(result.botHand).toHaveLength(1); // only face-down remains
    expect(result.deck.some(c => c.value === 7)).toBe(true);
  });

  it('RETURN sends player last face-up card back to deck', () => {
    const ret = makeTrump(TRUMP_TYPES.RETURN, 'player');
    // playerHand[0] = face-down (4), playerHand[1] = face-up (6)
    const state = baseState({ playerTrumpHand: [ret] });
    const result = applyTrump(ret, state, 'player');
    expect(result.playerHand).toHaveLength(1);
    expect(result.deck.some(c => c.value === 6)).toBe(true);
  });

  it('EXCHANGE swaps last face-up cards between player and bot', () => {
    const exch = makeTrump(TRUMP_TYPES.EXCHANGE, 'player');
    const state = baseState({ playerTrumpHand: [exch] });
    const result = applyTrump(exch, state, 'player');
    // player had 6 as last face-up, bot had 7 → after swap: player gets 7, bot gets 6
    expect(result.playerHand[result.playerHand.length - 1].value).toBe(7);
    expect(result.botHand[result.botHand.length - 1].value).toBe(6);
  });

  it('PERFECT_DRAW draws the best card for the player', () => {
    const pd = makeTrump(TRUMP_TYPES.PERFECT_DRAW, 'player');
    // playerHand total = 4+6 = 10, target = 21 → need ≤11 → best in deck [5,3,8] is 8
    // Wait: need = 21-10 = 11, all ≤11 → best = 8
    const state = baseState({ playerTrumpHand: [pd] });
    const result = applyTrump(pd, state, 'player');
    expect(result.playerHand.some(c => c.value === 8)).toBe(true);
  });

  it('HARVEST draws an extra trump after using a number card', () => {
    const harvest = makeTrump(TRUMP_TYPES.HARVEST, 'player');
    const card3 = makeTrump(TRUMP_TYPES.CARD_3, 'player');
    const state = baseState({
      playerTrumpHand: [card3],
      playerTableTrumps: [harvest],
    });
    const before = state.playerTrumpHand.length;
    const result = applyTrump(card3, state, 'player');
    // card3 consumed, harvest triggers +1 → net: 0 + 1 = 1
    expect(result.playerTrumpHand.length).toBeGreaterThan(before - 1);
  });
});

// ─── applyMindShiftEnd ────────────────────────────────────────────────────────

describe('applyMindShiftEnd', () => {
  it('MIND_SHIFT on bot table halves player trump hand at round end', () => {
    const state = {
      playerTrumpHand: [makeTrump(TRUMP_TYPES.CARD_2), makeTrump(TRUMP_TYPES.CARD_3), makeTrump(TRUMP_TYPES.CARD_4), makeTrump(TRUMP_TYPES.CARD_5)],
      botTrumpHand: [makeTrump(TRUMP_TYPES.ONE_UP, 'bot')],
      playerTableTrumps: [],
      botTableTrumps: [makeTrump(TRUMP_TYPES.MIND_SHIFT, 'bot')],
    };
    const result = applyMindShiftEnd(state);
    // slice(floor(4/2)) = slice(2) → 2 remaining
    expect(result.playerTrumpHand).toHaveLength(2);
  });

  it('MIND_SHIFT_PLUS on bot table empties player trump hand', () => {
    const state = {
      playerTrumpHand: [makeTrump(TRUMP_TYPES.CARD_2), makeTrump(TRUMP_TYPES.CARD_3)],
      botTrumpHand: [],
      playerTableTrumps: [],
      botTableTrumps: [makeTrump(TRUMP_TYPES.MIND_SHIFT_PLUS, 'bot')],
    };
    const result = applyMindShiftEnd(state);
    expect(result.playerTrumpHand).toHaveLength(0);
  });

  it('MIND_SHIFT on player table halves bot trump hand', () => {
    const state = {
      playerTrumpHand: [],
      botTrumpHand: [makeTrump(TRUMP_TYPES.ONE_UP, 'bot'), makeTrump(TRUMP_TYPES.SHIELD, 'bot')],
      playerTableTrumps: [makeTrump(TRUMP_TYPES.MIND_SHIFT, 'player')],
      botTableTrumps: [],
    };
    const result = applyMindShiftEnd(state);
    expect(result.botTrumpHand).toHaveLength(1);
  });

  it('does nothing if no Mind Shift cards are present', () => {
    const state = {
      playerTrumpHand: [makeTrump(TRUMP_TYPES.CARD_2)],
      botTrumpHand: [makeTrump(TRUMP_TYPES.ONE_UP, 'bot')],
      playerTableTrumps: [],
      botTableTrumps: [],
    };
    const result = applyMindShiftEnd(state);
    expect(result.playerTrumpHand).toHaveLength(1);
    expect(result.botTrumpHand).toHaveLength(1);
  });
});
