import { getHandTotal, isBust } from './deck.js';
import { TRUMP_TYPES, PHASES } from './constants.js';
import { getEffectiveTarget } from './trumpEngine.js';

// Probability of busting given current hand total and remaining deck
function bustProbability(currentTotal, deck, target) {
  if (deck.length === 0) return 1;
  const safeDraw = deck.filter(c => currentTotal + c.value <= target);
  return 1 - safeDraw.length / deck.length;
}

// Score: how good is current hand relative to target
function handScore(total, target) {
  if (total > target) return -1 * (total - target); // busted
  return total / target;
}

// Estimate player's hidden card based on what's visible
function estimatePlayerTotal(state) {
  const target = getEffectiveTarget([...state.playerTableTrumps, ...state.botTableTrumps]);
  const playerFaceUp = state.playerHand.slice(1);
  const faceUpTotal = getHandTotal(playerFaceUp);
  const visibleCards = [
    ...state.playerHand.slice(1),
    ...state.botHand,
  ].map(c => c.value);

  // Unknown cards (potential hidden card)
  const allValues = Array.from({ length: 11 }, (_, i) => i + 1);
  const unknownValues = allValues.filter(v => !visibleCards.includes(v));

  if (unknownValues.length === 0) return faceUpTotal;

  // Assume player's hidden card is the average of unknown cards (conservative estimate)
  const avgHidden = unknownValues.reduce((a, b) => a + b, 0) / unknownValues.length;
  return faceUpTotal + avgHidden;
}

// Choose best trump to play given current state
function chooseTrump(state) {
  const target = getEffectiveTarget([...state.playerTableTrumps, ...state.botTableTrumps]);
  const botTotal = getHandTotal(state.botHand);
  const bustChance = bustProbability(botTotal, state.deck, target);
  const estimatedPlayerTotal = estimatePlayerTotal(state);

  // Check if blocked
  if (state.playerTableTrumps.some(t => t.type === TRUMP_TYPES.DESTROY_PLUS_PLUS)) return null;

  const held = state.botTrumpHand;
  if (held.length === 0) return null;

  const priority = [];

  for (const trump of held) {
    switch (trump.type) {
      // High priority: draw cards safely
      case TRUMP_TYPES.PERFECT_DRAW:
      case TRUMP_TYPES.PERFECT_DRAW_PLUS:
      case TRUMP_TYPES.ULTIMATE_DRAW:
        if (botTotal < target - 3) priority.push({ trump, score: 90 });
        break;

      // Number cards — good if we need a specific value
      case TRUMP_TYPES.CARD_2:
        if (botTotal + 2 <= target) priority.push({ trump, score: 85 });
        break;
      case TRUMP_TYPES.CARD_3:
        if (botTotal + 3 <= target) priority.push({ trump, score: 85 });
        break;
      case TRUMP_TYPES.CARD_4:
        if (botTotal + 4 <= target) priority.push({ trump, score: 80 });
        break;
      case TRUMP_TYPES.CARD_5:
        if (botTotal + 5 <= target) priority.push({ trump, score: 80 });
        break;
      case TRUMP_TYPES.CARD_6:
        if (botTotal + 6 <= target) priority.push({ trump, score: 75 });
        break;
      case TRUMP_TYPES.CARD_7:
        if (botTotal + 7 <= target) priority.push({ trump, score: 70 });
        break;

      // Aggressive bet-raising when winning
      case TRUMP_TYPES.TWO_UP:
        if (botTotal > estimatedPlayerTotal) priority.push({ trump, score: 60 });
        break;
      case TRUMP_TYPES.ONE_UP:
        if (botTotal > estimatedPlayerTotal) priority.push({ trump, score: 50 });
        break;

      // Defensive
      case TRUMP_TYPES.SHIELD:
      case TRUMP_TYPES.SHIELD_PLUS:
        if (bustChance > 0.5) priority.push({ trump, score: 65 });
        break;

      // Disruption — remove player's cards
      case TRUMP_TYPES.REMOVE:
        if (state.playerHand.slice(1).length > 0 && estimatedPlayerTotal > botTotal) {
          priority.push({ trump, score: 70 });
        }
        break;

      // Return own card if busting
      case TRUMP_TYPES.RETURN:
        if (botTotal > target) priority.push({ trump, score: 95 });
        break;

      // Desperation in SAW phase when losing badly
      case TRUMP_TYPES.DESPERATION:
        if (state.phase === PHASES.SAW && estimatedPlayerTotal > botTotal + 3) {
          priority.push({ trump, score: 55 });
        }
        break;

      // Target change
      case TRUMP_TYPES.GO_FOR_24:
        if (botTotal > 17 && botTotal <= 24) priority.push({ trump, score: 72 });
        break;
      case TRUMP_TYPES.GO_FOR_17:
        if (botTotal >= 15 && botTotal <= 17) priority.push({ trump, score: 80 });
        break;

      // Mind shift — early in round
      case TRUMP_TYPES.MIND_SHIFT:
      case TRUMP_TYPES.MIND_SHIFT_PLUS:
        if (state.playerTrumpHand.length > 2) priority.push({ trump, score: 55 });
        break;

      // Curse — force highest card on player
      case TRUMP_TYPES.CURSE:
        if (estimatedPlayerTotal > 15) priority.push({ trump, score: 60 });
        break;

      // Happiness — both draw (ok if we have harvest)
      case TRUMP_TYPES.HAPPINESS:
        if (state.botTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
          priority.push({ trump, score: 40 });
        }
        break;

      default:
        break;
    }
  }

  if (priority.length === 0) return null;
  priority.sort((a, b) => b.score - a.score);
  return priority[0].trump;
}

// Main AI decision function
// Returns: { type: 'hit' | 'stand' | 'trump', trump? }
export function getBotDecision(state) {
  const target = getEffectiveTarget([...state.playerTableTrumps, ...state.botTableTrumps]);
  const botTotal = getHandTotal(state.botHand);
  const estimatedPlayerTotal = estimatePlayerTotal(state);
  const bustChance = bustProbability(botTotal, state.deck, target);
  const phase = state.phase;

  // Already at target — no need to draw more
  if (botTotal === target) return { type: 'stand' };

  // Return card if busted — use trump first
  if (botTotal > target && state.botTrumpHand.some(t => t.type === TRUMP_TYPES.RETURN)) {
    const returnCard = state.botTrumpHand.find(t => t.type === TRUMP_TYPES.RETURN);
    return { type: 'trump', trump: returnCard };
  }

  // If busted: stand — more cards only increase total further from target
  if (botTotal > target) return { type: 'stand' };

  // Consider playing a trump first
  const shouldPlayTrump = (
    state.botTrumpHand.length > 0 &&
    !state.playerTableTrumps.some(t => t.type === TRUMP_TYPES.DESTROY_PLUS_PLUS) &&
    (
      bustChance > 0.6 ||          // high bust risk — use defensive trump
      botTotal < estimatedPlayerTotal - 3 ||  // losing significantly
      (phase === PHASES.SAW && state.botHealth < 3) // desperate in saw phase
    )
  );

  if (shouldPlayTrump) {
    const trump = chooseTrump(state);
    if (trump) return { type: 'trump', trump };
  }

  // Core decision: compare our position vs estimated player position
  const weAreAhead = botTotal > estimatedPlayerTotal;
  const weAreBehind = botTotal < estimatedPlayerTotal - 2;

  // Aggressiveness thresholds by phase — higher in later phases
  const standThresholds = {
    [PHASES.FINGER]: 16,
    [PHASES.SHOCK]: 17,
    [PHASES.SAW]: 18,
  };
  const threshold = standThresholds[phase] || 17;

  // If we're ahead and bust risk is low — stand and protect the lead
  if (weAreAhead && bustChance > 0.45 && botTotal >= threshold) {
    const trump = chooseTrump(state);
    if (trump && [TRUMP_TYPES.ONE_UP, TRUMP_TYPES.TWO_UP, TRUMP_TYPES.MIND_SHIFT, TRUMP_TYPES.MIND_SHIFT_PLUS].includes(trump.type)) {
      return { type: 'trump', trump };
    }
    return { type: 'stand' };
  }

  // Dead Silence blocks drawing — must stand
  if (state.playerTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE)) {
    return { type: 'stand' };
  }

  // If we're behind and player seems safe — take risks, hit even with moderate bust chance
  if (weAreBehind && bustChance < 0.65) {
    return { type: 'hit' };
  }

  // If player is likely busted too — stand, we might win on proximity
  if (estimatedPlayerTotal > target && botTotal <= target) {
    return { type: 'stand' };
  }

  // Standard threshold logic
  if (botTotal >= threshold || bustChance > 0.7) {
    const trump = chooseTrump(state);
    if (trump && [
      TRUMP_TYPES.ONE_UP, TRUMP_TYPES.TWO_UP, TRUMP_TYPES.DESPERATION,
      TRUMP_TYPES.MIND_SHIFT, TRUMP_TYPES.MIND_SHIFT_PLUS,
    ].includes(trump.type)) {
      return { type: 'trump', trump };
    }
    return { type: 'stand' };
  }

  // Try to use a number card trump for safe draw
  if (state.botTrumpHand.length > 0) {
    const needed = target - botTotal;
    const numberCards = [
      TRUMP_TYPES.CARD_2, TRUMP_TYPES.CARD_3, TRUMP_TYPES.CARD_4,
      TRUMP_TYPES.CARD_5, TRUMP_TYPES.CARD_6, TRUMP_TYPES.CARD_7,
    ];
    const cardValues = { CARD_2: 2, CARD_3: 3, CARD_4: 4, CARD_5: 5, CARD_6: 6, CARD_7: 7 };
    const safeTrump = state.botTrumpHand.find(t => {
      const val = cardValues[t.type];
      return numberCards.includes(t.type) && val && val <= needed;
    });
    if (safeTrump) return { type: 'trump', trump: safeTrump };
  }

  return { type: 'hit' };
}
