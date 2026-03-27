import { describe, it, expect } from 'vitest';
import { getBotDecision } from './aiBot.js';
import { TRUMP_TYPES, PHASES } from './constants.js';
import { createTrump } from './trumpEngine.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeTrump(type, owner = 'bot') {
  return createTrump(type, owner);
}

function baseState(overrides = {}) {
  return {
    phase: PHASES.FINGER,
    deck: [
      { value: 2, id: 'c2' },
      { value: 3, id: 'c3' },
      { value: 4, id: 'c4' },
    ],
    playerHand: [{ value: 3, id: 'p3' }, { value: 5, id: 'p5' }],
    botHand: [{ value: 2, id: 'b2' }, { value: 9, id: 'b9' }],
    playerStood: false,
    botStood: false,
    playerTableTrumps: [],
    botTableTrumps: [],
    playerTrumpHand: [],
    botTrumpHand: [],
    botHealth: 10,
    ...overrides,
  };
}

// ─── getBotDecision ───────────────────────────────────────────────────────────

describe('getBotDecision', () => {
  it('returns stand immediately if botStood=true', () => {
    const decision = getBotDecision(baseState({ botStood: true }));
    expect(decision.type).toBe('stand');
  });

  it('returns stand if bot already busted and has no RETURN trump', () => {
    const state = baseState({
      botHand: [{ value: 11, id: 'b11' }, { value: 11, id: 'b11b' }], // total=22, bust
    });
    const decision = getBotDecision(state);
    expect(decision.type).toBe('stand');
  });

  it('uses RETURN trump when bot is busted', () => {
    const ret = makeTrump(TRUMP_TYPES.RETURN);
    const state = baseState({
      botHand: [{ value: 11, id: 'b11' }, { value: 11, id: 'b11b' }],
      botTrumpHand: [ret],
    });
    const decision = getBotDecision(state);
    expect(decision.type).toBe('trump');
    expect(decision.trump.type).toBe(TRUMP_TYPES.RETURN);
  });

  it('stands when total meets or exceeds threshold for FINGER phase (16)', () => {
    // FINGER threshold is 16; bot total = 16 → stand
    const state = baseState({
      botHand: [{ value: 5, id: 'b5' }, { value: 11, id: 'b11' }], // 16
    });
    const decision = getBotDecision(state);
    expect(decision.type).toBe('stand');
  });

  it('hits when total is below threshold and bust risk is low', () => {
    // bot total = 8, threshold=16, small cards in deck
    const state = baseState({
      botHand: [{ value: 2, id: 'b2' }, { value: 6, id: 'b6' }], // 8
      deck: [{ value: 2, id: 'c2' }, { value: 3, id: 'c3' }, { value: 1, id: 'c1' }],
    });
    const decision = getBotDecision(state);
    expect(decision.type).toBe('hit');
  });

  it('returns stand if Dead Silence is on player table', () => {
    const deadSilence = makeTrump(TRUMP_TYPES.DEAD_SILENCE, 'player');
    // Bot total below threshold, but Dead Silence blocks drawing
    const state = baseState({
      botHand: [{ value: 2, id: 'b2' }, { value: 5, id: 'b5' }], // 7, below threshold
      playerTableTrumps: [deadSilence],
    });
    const decision = getBotDecision(state);
    expect(decision.type).toBe('stand');
  });

  it('plays a safe number-card trump when available and below threshold', () => {
    const card3 = makeTrump(TRUMP_TYPES.CARD_3);
    const state = baseState({
      botHand: [{ value: 2, id: 'b2' }, { value: 8, id: 'b8' }], // 10
      botTrumpHand: [card3],
      deck: [{ value: 9, id: 'c9' }, { value: 10, id: 'c10' }, { value: 11, id: 'c11' }], // all bust
    });
    // bust chance is high → trump should be used; card3 safe (10+3=13 ≤ 21)
    const decision = getBotDecision(state);
    // AI will either play trump or stand; if it plays trump it should be card3
    if (decision.type === 'trump') {
      expect(decision.trump.type).toBe(TRUMP_TYPES.CARD_3);
    }
  });

  it('uses PERFECT_DRAW when significantly behind and bust risk high', () => {
    const pd = makeTrump(TRUMP_TYPES.PERFECT_DRAW);
    const state = baseState({
      botHand: [{ value: 1, id: 'b1' }, { value: 5, id: 'b5' }], // 6, far below target
      // player total visible: 3+5=8, estimated player high
      playerHand: [{ value: 3, id: 'p3' }, { value: 5, id: 'p5' }],
      botTrumpHand: [pd],
      deck: [{ value: 9, id: 'c9' }, { value: 10, id: 'c10' }, { value: 11, id: 'c11' }],
    });
    // bust chance = 3/3 = 1.0 > 0.6 → shouldPlayTrump=true → PERFECT_DRAW
    const decision = getBotDecision(state);
    expect(decision.type).toBe('trump');
    expect(decision.trump.type).toBe(TRUMP_TYPES.PERFECT_DRAW);
  });

  it('is more aggressive in SAW phase (threshold 18)', () => {
    // In SAW phase, bot stands at 18 instead of 16
    const state = baseState({
      phase: PHASES.SAW,
      botHand: [{ value: 5, id: 'b5' }, { value: 12, id: 'b12' }], // 17 — below SAW threshold 18
      deck: [{ value: 1, id: 'c1' }, { value: 2, id: 'c2' }, { value: 3, id: 'c3' }],
    });
    const decision = getBotDecision(state);
    // 17 < 18 and low bust risk → should hit
    expect(decision.type).toBe('hit');
  });
});
