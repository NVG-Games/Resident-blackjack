// RE7 "21" uses a single 11-card deck: cards numbered 1-11, no duplicates
export const DECK_SIZE = 11;

export function createDeck() {
  return Array.from({ length: DECK_SIZE }, (_, i) => ({
    value: i + 1,
    id: `card-${i + 1}`,
  }));
}

export function shuffleDeck(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Mulberry32 — fast seeded PRNG, no external deps.
// Used for P2P multiplayer so both peers produce identical shuffle from the same seed.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeckWithSeed(deck, seed) {
  const rand = mulberry32(seed);
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateSeed() {
  return (Math.random() * 0xffffffff) | 0;
}

export function drawCard(deck) {
  if (deck.length === 0) return { card: null, remaining: [] };
  const [card, ...remaining] = deck;
  return { card, remaining };
}

export function drawSpecificCard(deck, value) {
  const idx = deck.findIndex(c => c.value === value);
  if (idx === -1) return { card: null, remaining: deck };
  const card = deck[idx];
  const remaining = deck.filter((_, i) => i !== idx);
  return { card, remaining };
}

// Draw best card for the given hand (closest to target without busting)
export function drawBestCard(deck, handTotal, target) {
  const need = target - handTotal;
  const candidates = deck.filter(c => c.value <= need);
  if (candidates.length === 0) {
    // All cards will bust — pick smallest
    const sorted = [...deck].sort((a, b) => a.value - b.value);
    return drawSpecificCard(deck, sorted[0].value);
  }
  // Pick the highest card that won't bust
  const best = candidates.reduce((a, b) => (b.value > a.value ? b : a));
  return drawSpecificCard(deck, best.value);
}

// Draw worst card for the opponent (worst for their strategy)
export function drawWorstCard(deck, handTotal, target) {
  const need = target - handTotal;
  // Cards that will bust opponent
  const busting = deck.filter(c => c.value > need);
  if (busting.length > 0) {
    const worst = busting.reduce((a, b) => (b.value > a.value ? b : a));
    return drawSpecificCard(deck, worst.value);
  }
  // No busting cards — pick smallest
  const sorted = [...deck].sort((a, b) => a.value - b.value);
  return drawSpecificCard(deck, sorted[0].value);
}

export function getHandTotal(hand) {
  return hand.reduce((sum, card) => sum + card.value, 0);
}

export function isBust(total, target) {
  return total > target;
}
