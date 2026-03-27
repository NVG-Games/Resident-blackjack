# 21 — Resident Evil 7 Card Game

A faithful web recreation of the card game "21" from **Resident Evil 7: Biohazard**, built with React 19, GSAP animations, and Tailwind CSS.

## About the Game

"21" is a modified blackjack game played by Clancy Jarvis and Hoffman in RE7's *Banned Footage Vol. 1* DLC. The rules differ significantly from standard blackjack:

- **Single shared deck** of 11 cards numbered 1–11 (no duplicates)
- **One hidden card** dealt face-down to each player at the start of a round
- **Target score of 21** (modifiable by trump cards)
- **Three escalating phases** with increasing stakes:
  - **Finger** — no trump cards, pure card counting
  - **Shock** — trump cards introduced, electric shock on loss
  - **Saw** — one loss ends the game

## Features

- Full implementation of all RE7 "21" rules including all 25+ trump cards
- AI opponent (Hoffman) with card counting, bust probability calculation, and strategic trump usage
- **Hot-seat multiplayer** — two human players on the same device with hand-off screen
- Authentic trump card artwork sourced directly from the Resident Evil Fandom Wiki
- Gothic atmosphere: dark felt table, blood drips, Cinzel/IM Fell English fonts, GSAP animations
- 3D card flip animations, screen shake on loss, phase transition overlays
- Game log with RE7-style atmospheric messages

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.4 |
| Build tool | Vite 6 |
| Animations | GSAP 3.12 |
| Styling | Tailwind CSS 3.4 |
| State | `useReducer` (no external store) |
| Language | JavaScript (ESM) |

## Project Structure

```
src/
├── App.jsx                          # Root: menu/roleselect/game routing
├── main.jsx
├── index.css
│
├── engine/                          # Pure game logic (no React)
│   ├── constants.js                 # TRUMP_TYPES, PHASES, PHASE_CONFIG
│   ├── deck.js                      # createDeck, shuffleDeck, drawCard, getHandTotal
│   ├── gameState.js                 # gameReducer, ACTIONS, ROUND_STATE
│   ├── trumpEngine.js               # applyTrump, getEffectiveTarget, computeBetModifiers
│   ├── aiBot.js                     # getBotDecision, bustProbability, chooseTrump
│   └── trumpImages.js               # PNG asset imports mapped to TRUMP_TYPES
│
├── assets/
│   └── trumps/                      # 33 PNG trump card images from RE Fandom Wiki
│
└── components/
    ├── GameTable/
    │   ├── MainMenu.jsx             # Start screen with Play vs AI / Play vs Yourself
    │   ├── RoleSelect.jsx           # Hot-seat role picker (Clancy / Hoffman)
    │   ├── GameTable.jsx            # Main game orchestrator
    │   ├── ActionButtons.jsx        # HIT / STAND buttons, hot-seat aware
    │   ├── HandoffScreen.jsx        # Hot-seat device handoff overlay
    │   ├── RoundResult.jsx          # Round outcome display
    │   └── StartScreen.jsx          # (legacy, superseded by MainMenu)
    ├── BotArea/BotArea.jsx          # Hoffman's hand + health bar
    ├── PlayerArea/PlayerArea.jsx    # Clancy's hand + health bar
    ├── Card/Card.jsx                # Single playing card with GSAP flip
    ├── TrumpCard/
    │   ├── TrumpCard.jsx            # Trump card with wiki PNG + tooltip
    │   └── TrumpHand.jsx            # Player's trump hand display
    ├── BetPanel/
    │   ├── BetPanel.jsx             # Current target + bet modifiers
    │   └── TableTrumps.jsx          # Permanent trumps on the table
    ├── PhaseOverlay/PhaseOverlay.jsx # Phase/victory/defeat full-screen overlays
    └── GameLog/GameLog.jsx          # Scrolling game event log
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

## Game Modes

### vs AI
Play against Hoffman, controlled by an AI that:
- Tracks bust probability based on remaining deck cards
- Evaluates when to use trump cards strategically
- Adjusts aggression per phase (conservative in Finger, aggressive in Saw)

### vs Yourself (Hot-Seat)
Two human players share one device. After each player's turn, a full-screen handoff screen appears — the current player looks away while the other takes their turn. Choose who plays as Clancy (acts first) and who plays as Hoffman.

## Trump Cards

All 25+ trump cards from the game are implemented, including:

| Category | Cards |
|---|---|
| Bet modifiers | One-Up, Two-Up, Two-Up+, Shield, Shield+, Shield Assault |
| Hand manipulation | 2-Card through 7-Card, Perfect Draw, Perfect Draw+, Harvest |
| Target changers | Go-for-17, Go-for-24, Go-for-27, Twenty-One-Up |
| Disruption | Remove, Return, Exchange, Trump Switch, Destroy, Destroy+, Destroy++ |
| Special | Dead Silence, Desperation, Oblivion, Conjure, Escape, Mind Shift, Happiness, Love Your Enemy |

## References

- [RE7 "21" rules — Fandom Wiki](https://residentevil.fandom.com/wiki/21)
- [Trump cards reference — Fandom Wiki](https://residentevil.fandom.com/wiki/Trump_cards)
