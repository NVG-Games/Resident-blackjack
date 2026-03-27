# AGENTS.md

Agent instructions for the **RE7 21 Card Game** — a web-based recreation of the "21" card game from Resident Evil 7: Biohazard.

## Project overview

Single-page React app (no backend). All game logic is pure JS in `src/engine/`. State lives in one `useReducer`. Two game modes: vs AI bot and hot-seat multiplayer.

Stack: React 19.2.4 · Vite 6 · GSAP 3.12 · Tailwind CSS 3.4 · nginx (Docker)

## Setup commands

```bash
npm install          # install dependencies
npm run dev          # dev server at http://localhost:5173 (auto-reload)
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

**Do NOT run `npm run dev`** — it is always already running in watch mode in a terminal.

## Docker

```bash
docker compose up --build        # build image and start on http://localhost:8080
docker compose up --build -d     # same, detached
docker compose down              # stop
```

## Project structure

```
src/engine/          ← pure game logic, no React imports
  constants.js       — TRUMP_TYPES, TRUMP_DEFINITIONS, PHASES, pools
  deck.js            — card creation, shuffle, draw, hand total
  gameState.js       — gameReducer, ACTIONS, ROUND_STATE
  trumpEngine.js     — applyTrump(), getEffectiveTarget(), computeBetModifiers()
  aiBot.js           — getBotDecision(state) → { type, trump? }
  trumpImages.js     — maps TRUMP_TYPES → imported PNG assets

src/components/      ← React UI only, no game logic
  GameTable/         — MainMenu, RoleSelect, GameTable (orchestrator), ActionButtons,
                       HandoffScreen, RoundResult
  BotArea/           — Hoffman's hand + health bar
  PlayerArea/        — Clancy's hand + health bar
  Card/              — single playing card with GSAP 3D flip
  TrumpCard/         — trump card with wiki PNG image + tooltip
  BetPanel/          — target score + table trumps
  PhaseOverlay/      — full-screen phase/victory/defeat overlays
  GameLog/           — scrolling game event log

src/assets/trumps/   ← 33 PNG trump card images (from RE Fandom Wiki)
```

## Critical invariants — never break these

### 1. Bot turn continuity

In `src/engine/gameState.js`, the `BOT_ACTION` reducer case **must** keep `roundState` as `BOT_TURN` when the player has already stood and the bot hits or plays a trump:

```js
const nextTurn = state.playerStood ? ROUND_STATE.BOT_TURN : ROUND_STATE.PLAYER_TURN;
```

Breaking this causes the game to freeze after the player stands.

### 2. Face-down card convention

`hand[0]` is always the hidden face-down card. `hand.slice(1)` are visible. `getHandTotal(hand)` counts all cards including index 0.

### 3. GSAP and React state

Never use GSAP `onComplete` to trigger React state changes — it silently fails when a component unmounts during animation. Call state setters directly.

### 4. Immutable reducer

Never mutate `state` in the reducer. Always spread:
```js
return { ...state, playerHand: [...state.playerHand, newCard] };
```

## Code style

- JavaScript ESM, no TypeScript
- No semicolons rule — the codebase uses them, keep consistency
- Tailwind for layout/spacing/sizing; inline `style={}` for precise colors and gradients (RE7 dark palette doesn't map to Tailwind tokens)
- Fonts: `font-cinzel` (Cinzel, headings), `font-fell` (IM Fell English, flavor text)
- GSAP for all animations — do not introduce Framer Motion or CSS `@keyframes` for new animations

## Adding a trump card (checklist)

1. Add to `TRUMP_TYPES` in `constants.js`
2. Add to `TRUMP_DEFINITIONS` (name, description, icon, color)
3. If permanent: add to `PERMANENT_TRUMPS` set
4. Add to `PLAYER_TRUMP_POOL` and/or `BOT_TRUMP_POOL`
5. Add case to `applyTrump()` in `trumpEngine.js` — return a partial state object
6. Place PNG in `src/assets/trumps/` and map in `trumpImages.js`
7. Run `npm run build` to confirm no errors

## Hot-seat mode

In `GameTable.jsx`, when `mode === 'hotseat'`:
- The bot AI `useEffect` is skipped entirely (`if (isHotSeat) return`)
- `BOT_TURN` shows `HandoffScreen` — the second player confirms before acting
- Bot slot actions dispatch `BOT_ACTION` (not `PLAYER_*`)
- `playerRole` only changes name labels; reducer logic is unchanged

## Game state shape (key fields)

```js
{
  deck: Card[],              // shared deck, hand[0] always face-down
  playerHand: Card[],
  botHand: Card[],
  roundState: ROUND_STATE,   // DEALING | PLAYER_TURN | BOT_TURN | RESOLVING | ROUND_OVER
  playerStood: boolean,
  botStood: boolean,
  phase: 'FINGER' | 'SHOCK' | 'SAW',
  round: number,
  playerHealth: number,      // 0–10
  botHealth: number,
  playerTrumpHand: Trump[],
  botTrumpHand: Trump[],
  playerTableTrumps: Trump[], // permanent trumps (max 5 per side)
  botTableTrumps: Trump[],
  overlay: { type, phase, message, subMessage } | null,
  log: { msg: string, time: number }[],
}
```

## Security

This is a fully static SPA — no backend, no user data, no authentication. The nginx config in `nginx.conf` sets standard security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy).

## Full AI context

See `CLAUDE.md` in the project root for an exhaustive reference including the full ROUND_STATE flow diagram, documented bugs and their fixes, and engine module descriptions.
