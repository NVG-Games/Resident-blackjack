# 21 — Resident Evil 7 Card Game

A faithful web recreation of the card game "21" from **Resident Evil 7: Biohazard**, built with React 19, GSAP animations, and Tailwind CSS.

**Live demo:** [nvg-games.github.io/Resident-blackjack](https://nvg-games.github.io/Resident-blackjack/)

---

## About the Game

"21" is a modified blackjack game played by Clancy Jarvis and Hoffman in RE7's *Banned Footage Vol. 1* DLC:

- **Single shared deck** of 11 cards numbered 1–11 (no duplicates)
- **One hidden card** dealt face-down to each player at the start of a round
- **Target score of 21** (modifiable by trump cards)
- **Three escalating phases** with increasing stakes:
  - **Finger** — no trump cards, pure card counting
  - **Shock** — trump cards introduced
  - **Saw** — one loss ends the game

---

## Features

- Full implementation of all RE7 "21" rules with 25+ trump cards
- AI opponent with card counting, bust probability, and strategic trump usage
- **Hot-seat multiplayer** — two humans on one device
- **P2P online multiplayer** — play over the internet via WebRTC (PeerJS)
- Authentic trump card PNGs from the Resident Evil Fandom Wiki
- Gothic atmosphere: dark felt table, GSAP animations, 3D card flips, screen shake
- Fully responsive — desktop and mobile

---

## Setup

> **Full setup guide** (local dev, Docker, GitHub Pages, troubleshooting): **[SETUP.md](SETUP.md)**

### TL;DR — Local Dev

```bash
git clone https://github.com/NVG-Games/Resident-blackjack.git
cd Resident-blackjack
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). No `.env`, no accounts, no config needed.

---

## Docker

```bash
# Build and run (serves on :8080)
docker compose up --build

# Or build manually
docker build -t resident-blackjack .
docker run -p 8080:80 resident-blackjack
```

The app will be available at [http://localhost:8080](http://localhost:8080).

### Self-hosted PeerJS signalling server

By default the P2P multiplayer uses the **public PeerJS cloud** — no config needed.

To run your own signalling server (included in `compose.yaml` as an optional sidecar):

```bash
# compose.yaml already includes the peerjs service
docker compose up

# PeerJS server runs on :9000, the app on :8080
```

Then create a `.env` file (use `.env.example` as template):

```bash
cp .env.example .env
# Set VITE_PEER_HOST=localhost (or your server domain)
```

Rebuild the app image after changing `.env`:

```bash
docker compose up --build
```

---

## GitHub Pages Deployment

The game is automatically deployed to GitHub Pages on every push to `main` via GitHub Actions.

### How to enable (one-time setup)

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source** select **GitHub Actions**
4. Click **Save**

That's it. The next push to `main` will trigger the workflow and deploy to:

```
https://<your-username>.github.io/Resident-blackjack/
```

### Manual trigger

You can also trigger a deploy manually:

1. Go to **Actions** tab in your repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

### How it works

The workflow (`.github/workflows/deploy.yml`):

1. Checks out the code
2. Installs dependencies with `npm ci`
3. Runs `npm run build` with `GITHUB_PAGES=true` — this sets the Vite `base` path to `/Resident-blackjack/` so all assets resolve correctly under the GitHub Pages subdirectory
4. Uploads the `dist/` folder as a Pages artifact
5. Deploys it

> **Note:** P2P multiplayer uses the public PeerJS cloud on GitHub Pages — no extra configuration needed.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.4 |
| Build tool | Vite 6 |
| Animations | GSAP 3.12 |
| Styling | Tailwind CSS 3.4 |
| P2P networking | PeerJS 1.5 (WebRTC) |
| State management | `useReducer` (no external store) |
| Language | JavaScript (ESM) |

---

## Project Structure

```
src/
├── App.jsx                          # Root: menu / roleselect / lobby / game routing
├── main.jsx                         # PeerProvider wraps the whole app
├── index.css
│
├── engine/                          # Pure game logic (no React)
│   ├── constants.js                 # TRUMP_TYPES, PHASES, PHASE_CONFIG
│   ├── deck.js                      # createDeck, shuffleDeck, shuffleDeckWithSeed
│   ├── gameState.js                 # gameReducer, ACTIONS, ROUND_STATE
│   ├── trumpEngine.js               # applyTrump, getEffectiveTarget
│   ├── aiBot.js                     # getBotDecision, bustProbability
│   └── trumpImages.js               # PNG asset imports mapped to TRUMP_TYPES
│
├── contexts/
│   └── PeerContext.jsx              # Singleton PeerJS peer — survives screen transitions
│
├── hooks/
│   ├── usePeer.js                   # Low-level PeerJS hook
│   └── useLobby.js                  # Room discovery via broker peer pattern
│
├── assets/
│   └── trumps/                      # 33 PNG trump card images from RE Fandom Wiki
│
└── components/
    ├── GameTable/
    │   ├── MainMenu.jsx             # Main menu (vs AI / Hot-seat / Online)
    │   ├── RoleSelect.jsx           # Hot-seat role picker
    │   ├── LobbyScreen.jsx          # Online lobby: host / join / room list
    │   ├── WaitingRoom.jsx          # Pre-game waiting room (online)
    │   ├── GameTable.jsx            # Game orchestrator (all modes)
    │   ├── ActionButtons.jsx        # HIT / STAND
    │   ├── HandoffScreen.jsx        # Hot-seat device handoff overlay
    │   └── RoundResult.jsx          # Round outcome display
    ├── BotArea/BotArea.jsx
    ├── PlayerArea/PlayerArea.jsx
    ├── Card/Card.jsx
    ├── TrumpCard/
    │   ├── TrumpCard.jsx
    │   └── TrumpHand.jsx
    ├── BetPanel/
    │   ├── BetPanel.jsx
    │   └── TableTrumps.jsx
    ├── PhaseOverlay/PhaseOverlay.jsx
    └── GameLog/GameLog.jsx
```

---

## Game Modes

### vs AI
Play against Hoffman, controlled by an AI that tracks bust probability and chooses trump cards strategically.

### vs Yourself (Hot-Seat)
Two human players share one device. A full-screen handoff overlay appears between turns.

### Online Multiplayer (P2P)
Play over the internet — no server required (WebRTC via PeerJS).

1. One player clicks **Multiplayer (P2P)** → **Host a Game**
2. Share the 4-character room code (e.g. `WOLF-42`) with your opponent
3. The opponent joins from the room list or by entering the code
4. Host clicks **Begin the Ordeal**

The game state is synchronised via action mirroring: every action is dispatched locally and sent to the remote peer, who replays it in their deterministic reducer. Deck shuffles use a shared seed so both clients produce identical decks.

---

## Trump Cards

All 25+ trump cards implemented:

| Category | Cards |
|---|---|
| Bet modifiers | One-Up, Two-Up, Two-Up+, Shield, Shield+, Shield Assault |
| Hand manipulation | 2–7 Card, Perfect Draw, Perfect Draw+, Harvest |
| Target changers | Go-for-17, Go-for-24, Go-for-27, Twenty-One-Up |
| Disruption | Remove, Return, Exchange, Trump Switch, Destroy, Destroy+, Destroy++ |
| Special | Dead Silence, Desperation, Oblivion, Conjure, Escape, Mind Shift, Happiness, Love Your Enemy |

---

## References

- [RE7 "21" rules — Fandom Wiki](https://residentevil.fandom.com/wiki/21)
- [Trump cards reference — Fandom Wiki](https://residentevil.fandom.com/wiki/Trump_cards)
