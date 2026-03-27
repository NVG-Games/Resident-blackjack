---
name: debug-game-loop
description: Debug game loop freezes, stuck turns, or round resolution issues in the RE7 21 card game. Use when the game stops responding after a player action.
---

# Debug Game Loop Skill

Diagnoses and fixes issues where the game freezes, buttons stay disabled, or round resolution never fires.

## Common freeze patterns

### 1. Game stuck after player STANDS (most common)

**Symptom**: HIT/STAND disabled, no `Next Round` button, bot does nothing.

**Root cause**: When the bot hits/plays trump after the player has stood, `roundState` was set back to `PLAYER_TURN` instead of staying on `BOT_TURN`.

**Check** `src/engine/gameState.js`, `BOT_ACTION` case:
```js
// This line MUST exist for hit and trump branches:
const nextTurn = state.playerStood ? ROUND_STATE.BOT_TURN : ROUND_STATE.PLAYER_TURN;
```

**Fix**: Ensure `roundState: nextTurn` is used in both the `hit` and `trump` branches of `BOT_ACTION`. Only the `stand` branch should always go to `PLAYER_TURN`.

### 2. Bot AI fires twice (StrictMode / hot reload)

**Symptom**: Bot makes two moves per turn in dev mode.

**Root cause**: `useEffect` double-invocation in React StrictMode or hot-reload resetting refs.

**Check** `GameTable.jsx` — `botProcessingRef.current` guard:
```js
if (botProcessingRef.current) return;
botProcessingRef.current = true;
```
This ref must be set **before** the setTimeout call.

### 3. Round never resolves after both players stand

**Symptom**: Both players stood but `RESOLVE_ROUND` never dispatches.

**Root cause**: The auto-resolve `useEffect` condition fails.

**Check** `GameTable.jsx`:
```js
useEffect(() => {
  if (
    state.roundState === ROUND_STATE.PLAYER_TURN &&  // must be PLAYER_TURN, not BOT_TURN
    state.playerStood && state.botStood
  ) { ... }
}, [state.playerStood, state.botStood, state.roundState]);
```
The resolve only fires when `roundState === PLAYER_TURN`. The bot's `stand` action must always set `roundState` to `PLAYER_TURN` (not `BOT_TURN`).

### 4. Hot-seat HandoffScreen won't dismiss

**Symptom**: Pressing "I'm Ready" has no effect.

**Root cause**: GSAP `onComplete` callback fails silently if the component unmounts. Do not use GSAP `onComplete` for React state transitions.

**Fix**: Call `onReady()` directly in the button handler, without a GSAP wrapper.

## Diagnostic steps

1. Add a `console.log` to the `BOT_ACTION` case in `gameState.js` to log `botAction`, `state.playerStood`, and `nextTurn`
2. Add a log to the auto-resolve `useEffect` to confirm it fires
3. Check `roundState` value — `BOT_TURN` means bot should be acting, `PLAYER_TURN` with both stood means auto-resolve should fire
4. Run `npm run build` to rule out import/syntax errors

## Reference files

- `src/engine/gameState.js` — BOT_ACTION case, ROUND_STATE enum
- `src/components/GameTable/GameTable.jsx` — all useEffect hooks, bot AI effect
- `CLAUDE.md` — full state flow diagram and documented gotchas
