# CLAUDE.md — AI Agent Context for Resident-blackjack

This file gives AI coding assistants full context about the project so they can work effectively without re-reading everything from scratch.

## Project Identity

**Name:** Resident Blackjack Card Game  
**Repo:** Resident-blackjack  
**Stack:** React 19.2.4 · Vite 6 · GSAP 3.12 · Tailwind CSS 3.4  
**Language:** JavaScript ESM (no TypeScript)  
**Package manager:** npm

## Commands

```bash
npm run dev      # Dev server at localhost:5173 (auto-reloads)
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

**Never run `npm run dev` yourself** — the dev server is always already running in watch mode.

## Architecture Overview

### State Management

All game state lives in a single `useReducer` in `GameTable.jsx`. The reducer (`src/engine/gameState.js`) is a pure function — no side effects. UI-level effects (bot AI timer, round auto-resolve, screen shake) are managed with `useEffect` hooks in `GameTable.jsx`.

```
App.jsx
  └─ MainMenu / RoleSelect / GameTable   (screen routing via useState)

GameTable.jsx
  ├─ useReducer(gameReducer)             (all game state)
  ├─ useEffect → BOT AI timer            (ai mode only)
  ├─ useEffect → auto-resolve            (both stood → RESOLVE_ROUND)
  ├─ useEffect → HOT_SEAT handoff        (hotseat mode only)
  └─ renders all child components
```

### Game State Shape (createInitialState)

```js
{
  // Cards
  deck: Card[],           // remaining shared deck (11 cards, no duplicates)
  playerHand: Card[],     // playerHand[0] is the face-down card
  botHand: Card[],        // botHand[0] is the face-down card

  // Status
  roundState: ROUND_STATE,  // DEALING | PLAYER_TURN | BOT_TURN | RESOLVING | ROUND_OVER
  playerStood: boolean,
  botStood: boolean,
  gameOver: boolean,
  roundResult: { winner, playerTotal, botTotal, damage } | null,

  // Phases
  phase: 'FINGER' | 'SHOCK' | 'SAW',
  round: number,           // round within phase (1-3)
  overlay: { type, phase, message, subMessage } | null,

  // Health
  playerHealth: number,    // starts at 10
  botHealth: number,       // starts at 10

  // Trumps
  playerTrumpHand: Trump[],
  botTrumpHand: Trump[],
  playerTableTrumps: Trump[],   // permanent trumps on table (max 5)
  botTableTrumps: Trump[],
  playerTrumpsUsedThisTurn: number,
  botTrumpsUsedThisTurn: number,

  log: { msg: string, time: number }[],
}
```

### ROUND_STATE Flow

```
DEALING → (250ms delay) → START_ROUND
  → PLAYER_TURN
      → PLAYER_HIT / PLAYER_STAND / PLAYER_USE_TRUMP
      → after stand: BOT_TURN
          → [AI] BOT_ACTION { type: 'hit' | 'stand' | 'trump' }
          → [hot-seat] HandoffScreen → user dispatches BOT_ACTION
      → when both stood: auto-resolve (700ms delay) → RESOLVE_ROUND
  → ROUND_OVER
      → NEXT_ROUND → DEALING (loop)
```

Key invariant: when the player has already stood and the bot hits/plays trump, `nextTurn` stays `BOT_TURN` (not `PLAYER_TURN`) so the bot can chain multiple actions.

### Engine Modules (`src/engine/`)

| File | Purpose |
|---|---|
| `constants.js` | `TRUMP_TYPES` enum, `PHASES`, `PHASE_CONFIG`, `TRUMP_DEFINITIONS` (name/description/icon/color), `PERMANENT_TRUMPS` set, `PLAYER_TRUMP_POOL`, `BOT_TRUMP_POOL` |
| `deck.js` | `createDeck()`, `shuffleDeck()`, `drawCard()`, `drawBestCard()`, `drawWorstCard()`, `getHandTotal()`, `isBust()` |
| `gameState.js` | `gameReducer`, `ACTIONS`, `ROUND_STATE`, `TURN`, `createInitialState` |
| `trumpEngine.js` | `applyTrump(trump, state, owner)` → new state slice; `getEffectiveTarget(tableTrumps)`; `computeBetModifiers(state)` |
| `aiBot.js` | `getBotDecision(state)` → `{ type: 'hit' | 'stand' | 'trump', trump? }` |
| `trumpImages.js` | Maps `TRUMP_TYPES.*` → imported PNG asset paths |

### Components

**GameTable/MainMenu.jsx** — entry screen, two buttons: "Play vs AI" and "Play vs Yourself"

**GameTable/RoleSelect.jsx** — hot-seat role picker with Clancy/Hoffman character cards. Calls `onConfirm({ mode: 'hotseat', playerRole: 'clancy' | 'hoffman' })`.

**GameTable/GameTable.jsx** — main orchestrator. Props: `mode` (`'ai' | 'hotseat'`), `playerRole` (`'clancy' | 'hoffman'`), `onReturnToMenu`. In hot-seat mode the bot AI `useEffect` is skipped entirely; instead `BOT_TURN` shows `HandoffScreen` then enables bot controls.

**GameTable/HandoffScreen.jsx** — full-screen dark overlay shown when it's the other player's turn in hot-seat. Props: `toPlayerName`, `onReady`.

**GameTable/ActionButtons.jsx** — HIT/STAND buttons. In hot-seat bot-controls mode, `showBotControls=true` disables AI checks, shows player name label, dispatches `BOT_ACTION` instead of `PLAYER_*`.

**Card/Card.jsx** — single playing card with GSAP 3D flip. Props: `card`, `faceDown`, `isNew`, `highlight`.

**TrumpCard/TrumpCard.jsx** — shows wiki PNG image for the trump type. Tooltip on hover. Props: `trump`, `onClick`, `disabled`, `isOnTable`, `isNew`, `size` (`'hand' | 'table' | 'mini'`).

**BotArea/BotArea.jsx** — Hoffman's area. Props: `state`, `isThinking`, `playerName`, `hideCards` (blurs cards in hot-seat when it's the other player's turn).

**PlayerArea/PlayerArea.jsx** — Clancy's area. Same `hideCards` prop.

## Modes of Play

### AI Mode (`mode='ai'`)
- Bot AI runs in `useEffect` on `BOT_TURN`
- `getBotDecision(state)` called after `BOT_FAST_DELAY_MS + random * BOT_THINK_DELAY_MS`
- `botProcessingRef` prevents double-firing

### Hot-Seat Mode (`mode='hotseat'`)
- Bot AI `useEffect` is entirely skipped (`if (isHotSeat) return`)
- On `BOT_TURN`: `setShowHandoff(true)` → `HandoffScreen` displayed
- After "I'm Ready": `setHotSeatBotActive(true)`, `setShowHandoff(false)` → bot controls enabled
- Bot controls use `handleBotHit / handleBotStand / handleBotPlayTrump` → dispatch `BOT_ACTION`
- `playerRole` only affects name labels; the reducer always treats the "bot" slot as Hoffman

## Trump System

Trump cards have two types:
- **Instant** — effect applied immediately on use, card discarded
- **Permanent** (`PERMANENT_TRUMPS` set) — placed on table, effect active all round (max 5 per side)

`applyTrump(trump, state, owner)` in `trumpEngine.js` returns a partial state object merged into the reducer. It handles all card-specific logic.

`getEffectiveTarget([...playerTableTrumps, ...botTableTrumps])` returns the current win target (default 21, modified by Go-For cards, Twenty-One-Up, etc.).

## Assets

33 PNG trump card images in `src/assets/trumps/`, sourced from the [Resident Evil Fandom Wiki](https://residentevil.fandom.com/wiki/Trump_cards) via the MediaWiki API. Mapped in `src/engine/trumpImages.js`. Some trump types without dedicated wiki images use visually similar fallbacks.

## Styling Notes

- Fonts: `Cinzel` (gothic display), `IM Fell English` (body/flavor text) — loaded via Google Fonts in `index.html`
- Tailwind classes use custom tokens defined in `tailwind.config.js`: `font-cinzel`, `font-fell`, `font-gothic`
- Global atmospheric CSS in `src/index.css`: `.grain` (noise overlay), `.vignette`
- Game table background: dark green felt radial gradient
- All colors are hardcoded inline on atmospheric elements (blood reds, amber, stone) for precise control

## Common Gotchas

1. **Bot AI double-fire**: `botProcessingRef.current` guards against StrictMode double-invocation. Don't remove it.
2. **Hot-seat handoff loop**: `hotSeatBotActive` is in the `useEffect` dependency array — this prevents the handoff from re-showing after "I'm Ready" while still in `BOT_TURN`.
3. **Face-down card**: `hand[0]` is always the face-down card. It's revealed at `ROUND_OVER` by checking `isRoundOver`.
4. **Bot `nextTurn`**: When player has stood, bot hit/trump keeps `roundState = BOT_TURN`. When bot stands, `roundState` always goes to `PLAYER_TURN` (auto-resolve effect then fires).
5. **GSAP in callbacks**: Don't use `onComplete` for React state transitions — GSAP `onComplete` can silently fail if the component unmounts mid-animation. Call state setters directly, skip the animation or use a `setTimeout` alternative.
6. **🚨 STAND = SKIP THIS TURN, NOT PERMANENT.** STAND passes your turn. HIT resets BOTH `playerStood` and `botStood` to false — the round continues and the opponent decides again. The round ends only when BOTH players stand on the SAME exchange (both flags true simultaneously). `PLAYER_HIT` MUST set `playerStood: false, botStood: false`. `BOT_ACTION hit` MUST set `playerStood: false, botStood: false`. Any code that does NOT reset both flags on HIT is a bug that makes Stand behave like a permanent forfeit.
