import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  shuffleDeckWithSeed,
  drawCard,
  drawSpecificCard,
  drawBestCard,
  drawWorstCard,
  getHandTotal,
  isBust,
  DECK_SIZE,
} from './deck.js';

describe('createDeck', () => {
  it('creates 11 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(DECK_SIZE);
  });

  it('cards are numbered 1-11 with no duplicates', () => {
    const deck = createDeck();
    const values = deck.map(c => c.value).sort((a, b) => a - b);
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('each card has a unique id', () => {
    const deck = createDeck();
    const ids = new Set(deck.map(c => c.id));
    expect(ids.size).toBe(DECK_SIZE);
  });
});

describe('shuffleDeck', () => {
  it('returns same number of cards', () => {
    const deck = createDeck();
    expect(shuffleDeck(deck)).toHaveLength(DECK_SIZE);
  });

  it('does not mutate the original deck', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(original);
  });

  it('contains all original cards after shuffle', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const originalValues = new Set(deck.map(c => c.value));
    const shuffledValues = new Set(shuffled.map(c => c.value));
    expect(shuffledValues).toEqual(originalValues);
  });
});

describe('shuffleDeckWithSeed', () => {
  it('produces identical results for same seed', () => {
    const deck = createDeck();
    const a = shuffleDeckWithSeed(deck, 42);
    const b = shuffleDeckWithSeed(deck, 42);
    expect(a.map(c => c.value)).toEqual(b.map(c => c.value));
  });

  it('produces different results for different seeds', () => {
    const deck = createDeck();
    const a = shuffleDeckWithSeed(deck, 1);
    const b = shuffleDeckWithSeed(deck, 9999);
    // Extremely unlikely to be identical
    expect(a.map(c => c.value)).not.toEqual(b.map(c => c.value));
  });
});

describe('drawCard', () => {
  it('draws the first card and returns the rest', () => {
    const deck = createDeck();
    const { card, remaining } = drawCard(deck);
    expect(card).toEqual(deck[0]);
    expect(remaining).toHaveLength(DECK_SIZE - 1);
    expect(remaining).not.toContainEqual(card);
  });

  it('returns null card and empty array for empty deck', () => {
    const { card, remaining } = drawCard([]);
    expect(card).toBeNull();
    expect(remaining).toEqual([]);
  });
});

describe('drawSpecificCard', () => {
  it('draws card with matching value', () => {
    const deck = createDeck();
    const { card, remaining } = drawSpecificCard(deck, 7);
    expect(card.value).toBe(7);
    expect(remaining).toHaveLength(DECK_SIZE - 1);
    expect(remaining.every(c => c.value !== 7)).toBe(true);
  });

  it('returns null and unmodified deck when value not found', () => {
    const deck = createDeck().filter(c => c.value !== 5);
    const { card, remaining } = drawSpecificCard(deck, 5);
    expect(card).toBeNull();
    expect(remaining).toHaveLength(deck.length);
  });
});

describe('drawBestCard', () => {
  it('draws the highest card that does not bust', () => {
    const deck = [
      { value: 3, id: 'card-3' },
      { value: 5, id: 'card-5' },
      { value: 8, id: 'card-8' },
    ];
    // hand total=15, target=21 → need ≤6 → best is 5
    const { card } = drawBestCard(deck, 15, 21);
    expect(card.value).toBe(5);
  });

  it('picks smallest card when all cards would bust', () => {
    const deck = [
      { value: 8, id: 'card-8' },
      { value: 10, id: 'card-10' },
    ];
    // hand total=18, target=21 → need ≤3 → none safe → pick smallest (8)
    const { card } = drawBestCard(deck, 18, 21);
    expect(card.value).toBe(8);
  });
});

describe('drawWorstCard', () => {
  it('draws a card that busts the opponent if possible', () => {
    const deck = [
      { value: 2, id: 'card-2' },
      { value: 9, id: 'card-9' },
      { value: 11, id: 'card-11' },
    ];
    // hand total=15, target=21 → need ≤6 → busting cards: 9, 11 → worst is 11
    const { card } = drawWorstCard(deck, 15, 21);
    expect(card.value).toBe(11);
  });

  it('picks smallest card when no busting card exists', () => {
    const deck = [
      { value: 1, id: 'card-1' },
      { value: 3, id: 'card-3' },
    ];
    // hand total=5, target=21 → need ≤16 → all safe → smallest is 1
    const { card } = drawWorstCard(deck, 5, 21);
    expect(card.value).toBe(1);
  });
});

describe('getHandTotal', () => {
  it('sums all card values', () => {
    const hand = [{ value: 3 }, { value: 7 }, { value: 5 }];
    expect(getHandTotal(hand)).toBe(15);
  });

  it('returns 0 for empty hand', () => {
    expect(getHandTotal([])).toBe(0);
  });
});

describe('isBust', () => {
  it('returns true when total exceeds target', () => {
    expect(isBust(22, 21)).toBe(true);
  });

  it('returns false when total equals target', () => {
    expect(isBust(21, 21)).toBe(false);
  });

  it('returns false when total is below target', () => {
    expect(isBust(18, 21)).toBe(false);
  });
});
