# Resident Blackjack Card Game

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
- **Telegram Mini App** — runs natively inside Telegram, invite friends from contacts
- **Real Game Assistant** — card tracker + hit/stand advisor for physical card games
- Authentic trump card PNGs from the Resident Evil Fandom Wiki
- Gothic atmosphere: dark felt table, GSAP animations, 3D card flips, screen shake
- Fully responsive — desktop and mobile

---

## Setup

> **Full setup guide** (local dev, Docker, GitHub Pages, Telegram Mini App, troubleshooting): **[SETUP.md](SETUP.md)**

### TL;DR — Local Dev

```bash
git clone https://github.com/NVG-Games/Resident-blackjack.git
cd Resident-blackjack
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). No `.env`, no accounts needed for AI / hot-seat modes.

Online multiplayer lobby requires [Supabase](#supabase-lobby). Telegram features require [a bot](#telegram-mini-app-setup).

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

## Supabase Lobby

The online multiplayer room list is powered by **Supabase Realtime** (free tier is plenty).  
Without it, the lobby list stays empty — players can still connect by pasting a Peer ID manually.

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com/) → **New project**
2. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public** key → `VITE_SUPABASE_ANON_KEY`
3. Open **SQL Editor** and paste + run `supabase/migrations/001_rooms.sql`

### 2. Add env vars

```bash
cp .env.example .env
```

Fill in `.env`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Telegram Mini App Setup

Run the game inside Telegram so players can open it from the bot menu and invite friends directly from their contact list.

### Step 1 — Create a bot via @BotFather

1. Open Telegram → search **@BotFather** (blue verified checkmark)
2. Send `/start`
3. Send `/newbot`
4. Enter a **display name** (e.g. `RE7 21 Card Game`)
5. Enter a **username** — must end in `bot` (e.g. `re7_21_bot`)
6. BotFather replies with your **bot token** — save it (not needed in the frontend, but useful later)

### Step 2 — Set the Mini App button

Still in @BotFather:

```
/setmenubutton
```

1. Select your bot
2. Paste your **deployed app URL**, e.g.:
   ```
   https://your-username.github.io/Resident-blackjack/
   ```
3. Enter a button label, e.g. `Play`

Users will now see a **Play** button at the bottom of the bot chat that opens the game as a Mini App.

### Step 3 — Add bot username to env

```env
VITE_TG_BOT_USERNAME=re7_21_bot
```

This is used to generate invite deep-links:  
`https://t.me/re7_21_bot?startapp=WOLF-42`

When a friend opens this link in Telegram, the game launches and auto-joins room `WOLF-42`.

### Step 4 — GitHub Actions secrets (for auto-deploy)

Add these three secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `VITE_TG_BOT_USERNAME` | bot username without `@` |

Every push to `main` will rebuild and redeploy with these values baked in.

### How invite links work

When the host is in the waiting room:

- **Inside Telegram** → **Invite Friend via Telegram** opens the native share sheet to pick a contact
- **In a browser** → **Copy Invite Link** copies `https://t.me/<bot>?startapp=<ROOM-CODE>` to clipboard

The guest opens the link in Telegram → game launches → auto-joins the room.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.4 |
| Build tool | Vite 6 |
| Animations | GSAP 3.12 |
| Styling | Tailwind CSS 3.4 |
| P2P networking | PeerJS 1.5 (WebRTC) |
| Lobby / Realtime | Supabase JS 2 |
| Telegram integration | Telegram Web App SDK |
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
├── lib/
│   └── supabase.js                  # Supabase client (lobby realtime)
│
├── hooks/
│   ├── usePeer.js                   # Low-level PeerJS hook
│   ├── useLobby.js                  # Room discovery via Supabase Realtime
│   └── useTelegram.js               # Telegram Mini App SDK wrapper
│
├── assets/
│   └── trumps/                      # 33 PNG trump card images from RE Fandom Wiki
│
└── components/
    ├── GameTable/
│   ├── MainMenu.jsx             # Main menu (vs AI / Hot-seat / Online / Assistant)
│   ├── RoleSelect.jsx           # Hot-seat role picker
│   ├── LobbyScreen.jsx          # Online lobby: host / join / room list (Supabase + TG)
│   ├── WaitingRoom.jsx          # Pre-game waiting room (online + invite link)
│   ├── AssistantMode.jsx        # Real-life card tracker / advisor
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
Play over the internet — no server required (WebRTC via PeerJS). Room discovery uses Supabase Realtime.

1. One player clicks **Multiplayer (P2P)** → **Host a Game**
2. Share the room code (e.g. `WOLF-42`) — or in Telegram tap **Invite Friend**
3. The opponent joins from the room list, via deep-link, or by entering the code
4. Host clicks **Begin the Ordeal**

Game state is synchronised via action mirroring. Deck shuffles use a shared seed so both clients produce identical decks.

### Real Game Assistant
Physical card game tracker — no AI opponent, no virtual cards. Enter the cards you draw in real life and the assistant shows the score, bust probability, and a hit/stand recommendation for each player. Trump card effects on the target score are also tracked.

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
