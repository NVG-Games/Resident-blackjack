---
name: add-trump-card
description: Add a new trump card to the RE7 21 game. Use when the user wants to implement a new trump card type with its effect, icon, and image.
---

# Add Trump Card Skill

Adds a complete new trump card to the game: constant, definition, pool assignment, effect logic, and image mapping.

## Steps

1. **Add the constant** to `TRUMP_TYPES` in `src/engine/constants.js`:
   ```js
   MY_CARD: 'MY_CARD',
   ```

2. **Add the definition** to `TRUMP_DEFINITIONS` in the same file:
   ```js
   [TRUMP_TYPES.MY_CARD]: {
     name: 'My Card',
     description: 'What it does — one sentence.',
     icon: '🃏',
     color: '#8b0000',
   },
   ```

3. **If permanent** (stays on table): add to `PERMANENT_TRUMPS`:
   ```js
   PERMANENT_TRUMPS.add(TRUMP_TYPES.MY_CARD);
   ```

4. **Add to pools** in `PLAYER_TRUMP_POOL` and/or `BOT_TRUMP_POOL` (with repeat count if needed):
   ```js
   { type: TRUMP_TYPES.MY_CARD },
   ```

5. **Implement the effect** in `src/engine/trumpEngine.js` inside `applyTrump()`:
   ```js
   case TRUMP_TYPES.MY_CARD: {
     // return partial state object
     return { log: [...state.log, { msg: 'My Card activated!', time: Date.now() }] };
   }
   ```
   The return value is spread into the reducer state. For permanent cards it is placed on the table automatically by the calling code.

6. **Add PNG image**: place the file in `src/assets/trumps/my-card.png`, then map it in `src/engine/trumpImages.js`:
   ```js
   import myCard from '../assets/trumps/my-card.png';
   // ...
   [TRUMP_TYPES.MY_CARD]: myCard,
   ```
   If no dedicated image exists, map it to a visually similar existing asset as a fallback.

7. **Build check**: run `npm run build` to verify no import errors.

## Reference files

- `src/engine/constants.js` — TRUMP_TYPES, TRUMP_DEFINITIONS, PERMANENT_TRUMPS, pools
- `src/engine/trumpEngine.js` — applyTrump(), getEffectiveTarget(), computeBetModifiers()
- `src/engine/trumpImages.js` — asset map
- `src/assets/trumps/` — PNG files
