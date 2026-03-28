import { TRUMP_TYPES, TRUMP_DEFINITIONS, PERMANENT_TRUMPS, MAX_TABLE_TRUMPS, PLAYER_TRUMP_POOL, BOT_TRUMP_POOL } from './constants.js';
import { drawBestCard, drawSpecificCard, drawWorstCard, getHandTotal } from './deck.js';

let trumpIdCounter = 0;
export function createTrump(type, owner = 'player') {
  return {
    id: `trump-${trumpIdCounter++}`,
    type,
    owner,
    ...TRUMP_DEFINITIONS[type],
  };
}

export function drawRandomTrump(pool = PLAYER_TRUMP_POOL, owner = 'player') {
  const type = pool[Math.floor(Math.random() * pool.length)];
  return createTrump(type, owner);
}

export function drawNTrumps(n, pool, owner) {
  return Array.from({ length: n }, () => drawRandomTrump(pool, owner));
}

// Compute effective target based on table trumps
export function getEffectiveTarget(tableCards) {
  let target = 21;
  for (const trump of tableCards) {
    if (trump.type === TRUMP_TYPES.GO_FOR_17) target = 17;
    else if (trump.type === TRUMP_TYPES.GO_FOR_24) target = 24;
    else if (trump.type === TRUMP_TYPES.GO_FOR_27) target = 27;
  }
  return target;
}

// Compute bet modifiers from table trumps
export function computeBetModifiers(tablePlayerTrumps, tableBotTrumps, playerHand, botHand, playerHeld, botHeld, target) {
  let playerBetMod = 0;
  let botBetMod = 0;
  const playerTotal = getHandTotal(playerHand);
  const botTotal = getHandTotal(botHand);

  for (const trump of tableBotTrumps) {
    switch (trump.type) {
      case TRUMP_TYPES.ONE_UP: playerBetMod += 1; break;
      case TRUMP_TYPES.TWO_UP: playerBetMod += 2; break;
      case TRUMP_TYPES.TWO_UP_PLUS: playerBetMod += 2; break;
      case TRUMP_TYPES.DESIRE: playerBetMod += Math.floor(playerHeld.length / 2); break;
      case TRUMP_TYPES.DESIRE_PLUS: playerBetMod += playerHeld.length; break;
      case TRUMP_TYPES.CONJURE: botBetMod += 1; break;
      case TRUMP_TYPES.PERFECT_DRAW_PLUS: playerBetMod += 5; break;
      case TRUMP_TYPES.TWENTY_ONE_UP: if (botTotal === target) playerBetMod += 21; break;
      case TRUMP_TYPES.DESPERATION: playerBetMod += 100; botBetMod += 100; break;
      case TRUMP_TYPES.BLACK_MAGIC: playerBetMod += 10; break;
      default: break;
    }
  }

  for (const trump of tablePlayerTrumps) {
    switch (trump.type) {
      case TRUMP_TYPES.ONE_UP: botBetMod += 1; break;
      case TRUMP_TYPES.TWO_UP: botBetMod += 2; break;
      case TRUMP_TYPES.TWO_UP_PLUS: botBetMod += 2; break;
      case TRUMP_TYPES.SHIELD: playerBetMod -= 1; break;
      case TRUMP_TYPES.SHIELD_PLUS: playerBetMod -= 2; break;
      case TRUMP_TYPES.DESIRE: botBetMod += Math.floor(botHeld.length / 2); break;
      case TRUMP_TYPES.DESIRE_PLUS: botBetMod += botHeld.length; break;
      case TRUMP_TYPES.TWENTY_ONE_UP: if (playerTotal === target) botBetMod += 21; break;
      case TRUMP_TYPES.DESPERATION: break; // already counted above
      case TRUMP_TYPES.CONJURE: playerBetMod += 1; break;
      default: break;
    }
  }

  return { playerBetMod, botBetMod };
}

// Apply an instant or permanent trump card effect, returning state mutations
export function applyTrump(trump, state, owner) {
  const {
    deck,
    playerHand,
    botHand,
    playerTableTrumps,
    botTableTrumps,
    playerTrumpHand,
    botTrumpHand,
    log,
  } = state;

  const isPlayer = owner === 'player';
  const myHand = isPlayer ? playerHand : botHand;
  const oppHand = isPlayer ? botHand : playerHand;
  const myTableTrumps = isPlayer ? playerTableTrumps : botTableTrumps;
  const oppTableTrumps = isPlayer ? botTableTrumps : playerTableTrumps;
  const myHeld = isPlayer ? playerTrumpHand : botTrumpHand;
  const oppHeld = isPlayer ? botTrumpHand : playerTrumpHand;
  const pool = isPlayer ? PLAYER_TRUMP_POOL : BOT_TRUMP_POOL;

  const target = getEffectiveTarget([...playerTableTrumps, ...botTableTrumps]);
  const myTotal = getHandTotal(myHand);
  const oppTotal = getHandTotal(oppHand);

  let newDeck = [...deck];
  let newMyHand = [...myHand];
  let newOppHand = [...oppHand];
  let newMyTableTrumps = [...myTableTrumps];
  let newOppTableTrumps = [...oppTableTrumps];
  let newMyHeld = myHeld.filter(t => t.id !== trump.id);
  let newOppHeld = [...oppHeld];
  let newLog = [...log];
  let cancelRound = false;
  let escapeTrigger = false;
  let trumpWarning = null; // set when trump effect partially failed (e.g. card not in deck)
  let deadSilenceActive = false;
  let oppBetDelta = 0; // immediate one-time bet modifier applied to opponent's current bet

  const addLog = (msg) => newLog.push({ msg, time: Date.now() });

  // Check if the current user is blocked by opponent's Destroy++
  const isBlocked = oppTableTrumps.some(t => t.type === TRUMP_TYPES.DESTROY_PLUS_PLUS);
  if (isBlocked) {
    // Return state unchanged — trump use was blocked
    return {
      deck: newDeck,
      playerHand: isPlayer ? newMyHand : newOppHand,
      botHand: isPlayer ? newOppHand : newMyHand,
      playerTableTrumps: isPlayer ? newMyTableTrumps : newOppTableTrumps,
      botTableTrumps: isPlayer ? newOppTableTrumps : newMyTableTrumps,
      playerTrumpHand: isPlayer ? myHeld : newOppHeld,
      botTrumpHand: isPlayer ? newOppHeld : myHeld,
      log: [...newLog, { msg: `${isPlayer ? 'You' : 'Hoffman'} cannot use trumps — Destroy++ blocks it!`, time: Date.now() }],
      cancelRound: false,
      escapeTrigger: false,
    };
  }

  // Check dead silence on opponent
  const myDeadSilenced = myTableTrumps.some(t => t.type === TRUMP_TYPES.DEAD_SILENCE) && !isPlayer;

  const isPermanent = PERMANENT_TRUMPS.has(trump.type);

  if (isPermanent) {
    // Handle replacing Go-For cards
    if ([TRUMP_TYPES.GO_FOR_17, TRUMP_TYPES.GO_FOR_24, TRUMP_TYPES.GO_FOR_27].includes(trump.type)) {
      newMyTableTrumps = newMyTableTrumps.filter(
        t => ![TRUMP_TYPES.GO_FOR_17, TRUMP_TYPES.GO_FOR_24, TRUMP_TYPES.GO_FOR_27].includes(t.type)
      );
    }
    if (newMyTableTrumps.length < MAX_TABLE_TRUMPS) {
      newMyTableTrumps.push({ ...trump, owner });
    }
  }

  switch (trump.type) {
    // --- Permanent effects that also trigger immediate actions ---
    case TRUMP_TYPES.ONE_UP:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} One-Up — the stakes rise!`);
      newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      break;
    case TRUMP_TYPES.TWO_UP:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Two-Up — bet surges!`);
      newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      break;
    case TRUMP_TYPES.TWO_UP_PLUS: {
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Two-Up+ — a card is torn away!`);
      newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      // Return opponent's last face-up card to deck
      const faceUpCards = newOppHand.slice(1);
      if (faceUpCards.length > 0) {
        const returnedCard = faceUpCards[faceUpCards.length - 1];
        newOppHand = [newOppHand[0], ...faceUpCards.slice(0, -1)];
        newDeck = [...newDeck, returnedCard];
        addLog(`Opponent's ${returnedCard.value} returned to deck.`);
      }
      break;
    }
    case TRUMP_TYPES.SHIELD:
      addLog(`${isPlayer ? 'You raise' : 'Hoffman raises'} a Shield — protection!`);
      break;
    case TRUMP_TYPES.SHIELD_PLUS:
      addLog(`${isPlayer ? 'You raise' : 'Hoffman raises'} Shield+ — heavy protection!`);
      break;
    case TRUMP_TYPES.DESTROY: {
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Destroy!`);
      if (newOppTableTrumps.length > 0) {
        const removed = newOppTableTrumps[newOppTableTrumps.length - 1];
        newOppTableTrumps = newOppTableTrumps.slice(0, -1);
        addLog(`${removed.name} was destroyed!`);
      }
      break;
    }
    case TRUMP_TYPES.DESTROY_PLUS: {
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Destroy+ — everything burns!`);
      newOppTableTrumps = [];
      break;
    }
    case TRUMP_TYPES.DESTROY_PLUS_PLUS: {
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Destroy++ — total annihilation!`);
      newOppTableTrumps = [];
      // opponent blocked flag is derived from table state
      break;
    }
    case TRUMP_TYPES.GO_FOR_17:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Go for 17 — the target shifts!`);
      break;
    case TRUMP_TYPES.GO_FOR_24:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Go for 24 — aim higher!`);
      break;
    case TRUMP_TYPES.GO_FOR_27:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Go for 27 — the stakes are insane!`);
      break;
    case TRUMP_TYPES.HARVEST:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Harvest — cards keep coming!`);
      break;
    case TRUMP_TYPES.DESIRE:
    case TRUMP_TYPES.DESIRE_PLUS:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} ${trump.name} — the pressure mounts!`);
      break;
    case TRUMP_TYPES.MIND_SHIFT:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Mind Shift — a mental trap!`);
      break;
    case TRUMP_TYPES.MIND_SHIFT_PLUS:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Mind Shift+ — the mind shatters!`);
      break;
    case TRUMP_TYPES.CONJURE: {
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Conjure — three new cards!`);
      const drawn = drawNTrumps(3, pool, owner);
      newMyHeld = [...newMyHeld, ...drawn];
      break;
    }
    case TRUMP_TYPES.BLACK_MAGIC: {
      addLog(`${isPlayer ? 'You unleash' : 'Hoffman unleashes'} Black Magic!`);
      const discardCount = Math.floor(newMyHeld.length / 2);
      newMyHeld = newMyHeld.slice(discardCount);
      const { card, remaining } = drawBestCard(newDeck, myTotal, target);
      if (card) {
        newMyHand = [...newMyHand, card];
        newDeck = remaining;
        addLog(`Drew ${card.value} — the best possible card.`);
      }
      break;
    }
    case TRUMP_TYPES.ESCAPE:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Escape — a desperate gamble!`);
      break;
    case TRUMP_TYPES.TWENTY_ONE_UP:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Twenty-One-Up!`);
      break;
    case TRUMP_TYPES.OBLIVION:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Oblivion — the round resets!`);
      cancelRound = true;
      break;
    case TRUMP_TYPES.DEAD_SILENCE:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Dead Silence — no more cards!`);
      break;
    case TRUMP_TYPES.DESPERATION:
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} DESPERATION — the room goes silent.`);
      deadSilenceActive = true;
      break;
    case TRUMP_TYPES.HAPPINESS: {
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Happiness — everyone draws!`);
      newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      newOppHeld = [...newOppHeld, drawRandomTrump(isPlayer ? BOT_TRUMP_POOL : PLAYER_TRUMP_POOL, isPlayer ? 'bot' : 'player')];
      break;
    }

    // --- Instant effect cards ---
    case TRUMP_TYPES.CARD_2:
    case TRUMP_TYPES.CARD_3:
    case TRUMP_TYPES.CARD_4:
    case TRUMP_TYPES.CARD_5:
    case TRUMP_TYPES.CARD_6:
    case TRUMP_TYPES.CARD_7: {
      const cardValue = { CARD_2: 2, CARD_3: 3, CARD_4: 4, CARD_5: 5, CARD_6: 6, CARD_7: 7 }[trump.type];
      const { card, remaining } = drawSpecificCard(newDeck, cardValue);
      if (card) {
        newMyHand = [...newMyHand, card];
        newDeck = remaining;
        addLog(`${isPlayer ? 'You draw' : 'Hoffman draws'} the ${cardValue}!`);
      } else {
        addLog(`The ${cardValue} is no longer in the deck... it must be the hidden card.`);
        trumpWarning = `The ${cardValue} card isn't in the deck — it's probably the hidden card!`;
      }
      // Harvest effect
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
        addLog('Harvest — another trump drawn!');
      }
      break;
    }
    case TRUMP_TYPES.REMOVE: {
      const faceUp = newOppHand.slice(1);
      if (faceUp.length > 0) {
        const removed = faceUp[faceUp.length - 1];
        newOppHand = [newOppHand[0], ...faceUp.slice(0, -1)];
        newDeck = [...newDeck, removed];
        addLog(`${isPlayer ? 'You remove' : 'Hoffman removes'} opponent's ${removed.value}!`);
      } else {
        addLog('No face-up card to remove.');
      }
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.RETURN: {
      const myFaceUp = newMyHand.slice(1);
      if (myFaceUp.length > 0) {
        const returned = myFaceUp[myFaceUp.length - 1];
        newMyHand = [newMyHand[0], ...myFaceUp.slice(0, -1)];
        newDeck = [...newDeck, returned];
        addLog(`${isPlayer ? 'You return' : 'Hoffman returns'} the ${returned.value} to the deck.`);
      }
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.EXCHANGE: {
      const myFaceUp = newMyHand.slice(1);
      const oppFaceUp = newOppHand.slice(1);
      if (myFaceUp.length > 0 && oppFaceUp.length > 0) {
        const myLast = myFaceUp[myFaceUp.length - 1];
        const oppLast = oppFaceUp[oppFaceUp.length - 1];
        newMyHand = [newMyHand[0], ...myFaceUp.slice(0, -1), oppLast];
        newOppHand = [newOppHand[0], ...oppFaceUp.slice(0, -1), myLast];
        addLog(`Cards exchanged! ${myLast.value} ↔ ${oppLast.value}`);
      }
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.TRUMP_SWITCH: {
      const discardCount = Math.min(2, newMyHeld.length);
      const shuffled = [...newMyHeld].sort(() => Math.random() - 0.5);
      newMyHeld = shuffled.slice(discardCount);
      const drawn = drawNTrumps(3, pool, owner);
      newMyHeld = [...newMyHeld, ...drawn];
      addLog(`${isPlayer ? 'You switch' : 'Hoffman switches'} trumps!`);
      break;
    }
    case TRUMP_TYPES.TRUMP_SWITCH_PLUS: {
      const discardCount = Math.min(1, newMyHeld.length);
      const shuffled = [...newMyHeld].sort(() => Math.random() - 0.5);
      newMyHeld = shuffled.slice(discardCount);
      const drawn = drawNTrumps(4, pool, owner);
      newMyHeld = [...newMyHeld, ...drawn];
      addLog(`${isPlayer ? 'You play' : 'Hoffman plays'} Trump Switch+!`);
      break;
    }
    case TRUMP_TYPES.PERFECT_DRAW: {
      const { card, remaining } = drawBestCard(newDeck, myTotal, target);
      if (card) {
        newMyHand = [...newMyHand, card];
        newDeck = remaining;
        addLog(`${isPlayer ? 'Perfect Draw!' : 'Hoffman draws perfectly!'} Drew ${card.value}.`);
      }
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.PERFECT_DRAW_PLUS: {
      const { card, remaining } = drawBestCard(newDeck, myTotal, target);
      if (card) {
        newMyHand = [...newMyHand, card];
        newDeck = remaining;
        addLog(`${isPlayer ? 'Perfect Draw+!' : 'Hoffman\'s Perfect Draw+!'} Drew ${card.value}. Stakes raised!`);
      }
      // Note: already placed on table by the permanent-trump block above — no double-push needed
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.ULTIMATE_DRAW: {
      const { card, remaining } = drawBestCard(newDeck, myTotal, target);
      if (card) {
        newMyHand = [...newMyHand, card];
        newDeck = remaining;
        addLog(`ULTIMATE DRAW! ${isPlayer ? 'You' : 'Hoffman'} drew ${card.value}!`);
      }
      const extraTrumps = drawNTrumps(2, pool, owner);
      newMyHeld = [...newMyHeld, ...extraTrumps];
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.CURSE: {
      // Discard one random trump from self, force opponent to draw highest card
      if (newMyHeld.length > 0) {
        const idx = Math.floor(Math.random() * newMyHeld.length);
        newMyHeld = newMyHeld.filter((_, i) => i !== idx);
      }
      const highest = newDeck.reduce((a, b) => (b.value > a.value ? b : a), newDeck[0]);
      if (highest) {
        const { card, remaining } = drawSpecificCard(newDeck, highest.value);
        newOppHand = [...newOppHand, card];
        newDeck = remaining;
        addLog(`Curse! ${isPlayer ? 'Hoffman' : 'You'} ${isPlayer ? 'is' : 'are'} forced to take the ${card.value}!`);
      }
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.LOVE_YOUR_ENEMY: {
      addLog(`Love Your Enemy — Lucas smiles darkly...`);
      const { card, remaining } = drawBestCard(newDeck, oppTotal, target);
      if (card) {
        newOppHand = [...newOppHand, card];
        newDeck = remaining;
        addLog(`Opponent drew ${card.value} — the best card for them.`);
      }
      if (myTableTrumps.some(t => t.type === TRUMP_TYPES.HARVEST)) {
        newMyHeld = [...newMyHeld, drawRandomTrump(pool, owner)];
      }
      break;
    }
    case TRUMP_TYPES.SHIELD_ASSAULT: {
      const shields = newMyTableTrumps.filter(t => [TRUMP_TYPES.SHIELD, TRUMP_TYPES.SHIELD_PLUS].includes(t.type));
      const toRemove = shields.slice(0, 3).map(s => s.id);
      newMyTableTrumps = newMyTableTrumps.filter(t => !toRemove.includes(t.id));
      oppBetDelta += 3;
      addLog(`Shield Assault! ${toRemove.length} shield(s) destroyed. Opponent's bet +3!`);
      break;
    }
    case TRUMP_TYPES.SHIELD_ASSAULT_PLUS: {
      const shields = newMyTableTrumps.filter(t => [TRUMP_TYPES.SHIELD, TRUMP_TYPES.SHIELD_PLUS].includes(t.type));
      const toRemove = shields.slice(0, 2).map(s => s.id);
      newMyTableTrumps = newMyTableTrumps.filter(t => !toRemove.includes(t.id));
      oppBetDelta += 5;
      addLog(`Shield Assault+! ${toRemove.length} shield(s) obliterated. Opponent's bet +5!`);
      break;
    }
    default:
      break;
  }

  return {
    deck: newDeck,
    playerHand: isPlayer ? newMyHand : newOppHand,
    botHand: isPlayer ? newOppHand : newMyHand,
    playerTableTrumps: isPlayer ? newMyTableTrumps : newOppTableTrumps,
    botTableTrumps: isPlayer ? newOppTableTrumps : newMyTableTrumps,
    playerTrumpHand: isPlayer ? newMyHeld : newOppHeld,
    botTrumpHand: isPlayer ? newOppHeld : newMyHeld,
    log: newLog,
    cancelRound,
    escapeTrigger,
    trumpWarning,
    // oppBetDelta: immediate one-time raise on opponent's current bet (e.g. Shield Assault)
    playerBetDelta: isPlayer ? 0 : oppBetDelta,
    botBetDelta: isPlayer ? oppBetDelta : 0,
  };
}

// Apply Mind Shift at end of round
export function applyMindShiftEnd(state) {
  let newPlayerHeld = [...state.playerTrumpHand];
  let newBotHeld = [...state.botTrumpHand];

  const botHasMindShift = state.botTableTrumps.some(t => t.type === TRUMP_TYPES.MIND_SHIFT);
  const botHasMindShiftPlus = state.botTableTrumps.some(t => t.type === TRUMP_TYPES.MIND_SHIFT_PLUS);
  const playerHasMindShift = state.playerTableTrumps.some(t => t.type === TRUMP_TYPES.MIND_SHIFT);
  const playerHasMindShiftPlus = state.playerTableTrumps.some(t => t.type === TRUMP_TYPES.MIND_SHIFT_PLUS);

  if (botHasMindShiftPlus) {
    newPlayerHeld = [];
  } else if (botHasMindShift) {
    newPlayerHeld = newPlayerHeld.slice(Math.floor(newPlayerHeld.length / 2));
  }

  if (playerHasMindShiftPlus) {
    newBotHeld = [];
  } else if (playerHasMindShift) {
    newBotHeld = newBotHeld.slice(Math.floor(newBotHeld.length / 2));
  }

  return { ...state, playerTrumpHand: newPlayerHeld, botTrumpHand: newBotHeld };
}
