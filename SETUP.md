# Setup Guide

Step-by-step instructions for running **21 — RE7 Card Game** locally, in Docker, and deploying to GitHub Pages.

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| [Node.js](https://nodejs.org/) | 20 LTS or newer | `node -v` |
| npm | 10+ (ships with Node 20) | `npm -v` |
| [Git](https://git-scm.com/) | any recent | `git --version` |
| [Docker](https://docs.docker.com/get-docker/) *(optional)* | 25+ | `docker -v` |
| [Docker Compose](https://docs.docker.com/compose/) *(optional)* | v2 (built-in) | `docker compose version` |

> The game is a **static SPA** — no backend is required for basic play. P2P multiplayer uses WebRTC via the public [PeerJS cloud](https://peerjs.com/). The **online lobby** (room list) optionally uses [Supabase](https://supabase.com/) — see [Option 5](#option-5--telegram-mini-app) for setup.

---

## Option 1 — Local Development

### 1. Clone the repository

```bash
git clone https://github.com/NVG-Games/Resident-blackjack.git
cd Resident-blackjack
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The server hot-reloads on every file save.

### 4. (Optional) Build for production locally

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ at http://localhost:4173
```

That's all — no `.env` file, no config, no accounts needed for local play (including P2P multiplayer).

---

## Option 2 — Docker

### 2.1 Simple single container

Builds the React app and serves it via Nginx on port 8080.

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

To stop:

```bash
docker compose down
```

### 2.2 With self-hosted PeerJS signalling server

`compose.yaml` includes a `peerjs` sidecar service. To use it instead of the public cloud:

**Step 1** — Copy the env template:

```bash
cp .env.example .env
```

**Step 2** — Edit `.env`:

```env
VITE_PEER_HOST=localhost
VITE_PEER_PORT=9000
VITE_PEER_PATH=/
```

**Step 3** — Build and start both services:

```bash
docker compose up --build
```

- Game → [http://localhost:8080](http://localhost:8080)
- PeerJS server → [http://localhost:9000](http://localhost:9000)

> The PeerJS server only handles WebRTC signalling (hole-punching). No game data passes through it — everything goes directly peer-to-peer after connection.

### 2.3 Useful Docker commands

```bash
# Run in background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop and remove containers
docker compose down

# Rebuild only the app (after code changes)
docker compose up --build app

# Remove images too
docker compose down --rmi all
```

---

## Option 3 — GitHub Pages (Automatic CI/CD)

Every push to `main` automatically builds and deploys the game via GitHub Actions.

### One-time setup (5 minutes)

**Step 1** — Fork or push the repository to your GitHub account.

**Step 2** — Enable GitHub Pages:
1. Open your repository on GitHub
2. Go to **Settings** → **Pages** (left sidebar, under *Code and automation*)
3. Set **Source** to **GitHub Actions**
4. Click **Save**

**Step 3** — Push to `main`:

```bash
git add .
git commit -m "initial commit"
git push origin main
```

**Step 4** — Watch the deploy:
1. Go to the **Actions** tab in your repository
2. Click the running **Deploy to GitHub Pages** workflow
3. Wait ~60 seconds for it to finish

Your game will be live at:

```
https://<your-github-username>.github.io/Resident-blackjack/
```

### Manual deploy (without a new push)

1. Go to **Actions** tab
2. Select **Deploy to GitHub Pages** in the left list
3. Click **Run workflow** (top right) → **Run workflow**

### How the base path works

GitHub Pages serves sites under a subdirectory (`/Resident-blackjack/`), not the root (`/`). Vite needs to know this at build time.

The workflow sets `GITHUB_PAGES=true` before building:

```yaml
- name: Build
  env:
    GITHUB_PAGES: 'true'
  run: npm run build
```

`vite.config.js` reads this:

```js
base: process.env.GITHUB_PAGES === 'true' ? '/Resident-blackjack/' : '/'
```

This means:
- Local dev → `base: '/'` (default) — works normally
- Docker → `base: '/'` — works normally
- GitHub Pages → `base: '/Resident-blackjack/'` — all asset URLs are prefixed correctly

---

## Forking and Renaming

If you fork this repository under a different name, update the `base` path in `vite.config.js`:

```js
// Replace 'Resident-blackjack' with your actual repository name
base: process.env.GITHUB_PAGES === 'true' ? '/your-repo-name/' : '/',
```

---

## Environment Variables Reference

All variables are optional. Without them the game works fully using the public PeerJS cloud.

| Variable | Default | Description |
|---|---|---|
| `VITE_PEER_HOST` | *(empty)* | Hostname of a self-hosted PeerJS server. Leave empty to use public cloud. |
| `VITE_PEER_PORT` | `9000` | Port of the PeerJS server. |
| `VITE_PEER_PATH` | `/` | URL path of the PeerJS server. |
| `GITHUB_PAGES` | *(empty)* | Set to `true` in CI to apply the `/Resident-blackjack/` base path for Vite. |

Variables prefixed with `VITE_` are embedded into the browser bundle at build time. Do not put secrets in them.

---

## Troubleshooting

### `npm install` fails

- Make sure Node.js ≥ 20 is installed: `node -v`
- Delete `node_modules` and `package-lock.json`, then retry:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

### Dev server starts but the page is blank

- Open browser DevTools (F12) → Console — look for import errors
- Make sure you're on `http://localhost:5173` (not `5174` or another port)

### Docker build fails

- Make sure Docker Desktop is running
- Try clearing the build cache:
  ```bash
  docker compose build --no-cache
  ```

### GitHub Actions workflow fails

- Go to **Actions** → click the failed run → expand the failing step to see the error
- Common causes:
  - Pages not enabled: make sure **Source** is set to **GitHub Actions** in Settings → Pages
  - Missing permissions: the workflow file already sets `permissions: pages: write` — check it wasn't accidentally removed

### P2P multiplayer not connecting

- Both players must be on the same version of the game (same deploy)
- The public PeerJS cloud may occasionally be slow — try refreshing and re-joining
- If you're behind a strict corporate firewall, WebRTC may be blocked — use a self-hosted PeerJS server with a TURN relay instead

### Game freezes after standing

- This is a known engine invariant: `BOT_ACTION` hit/trump must preserve `BOT_TURN` state when the player has already stood. If you've modified `gameState.js`, verify this condition is intact.

---

## Option 5 — Telegram Mini App

Run the game as a [Telegram Mini App](https://core.telegram.org/bots/webapps) so players can open it directly inside Telegram and invite friends from their contact list.

### Step 1 — Create a Telegram Bot

1. Open Telegram and search for **@BotFather**.
2. Send `/newbot`, choose a name and a username (must end in `bot`, e.g. `re7_21_bot`).
3. Save the **bot token** (you won't need it in the frontend, but you will if you ever add a bot backend).

### Step 2 — Set the Mini App menu button

In the chat with @BotFather:

```
/setmenubutton
```

Select your bot, then paste the URL of your deployed app (e.g. `https://your-github-user.github.io/Resident-blackjack/`).

Users will now see a **"Play"** button at the bottom of your bot's chat that opens the game.

### Step 3 — Create a Supabase project (for the lobby)

The online multiplayer lobby uses Supabase Realtime to share open rooms across players. Without it, the room list will be empty (players can still connect manually by Peer ID).

1. Go to [supabase.com](https://supabase.com/) → **New project** → choose a region close to your players.
2. Once created, go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. Go to **SQL Editor** and paste + run the contents of [`supabase/migrations/001_rooms.sql`](supabase/migrations/001_rooms.sql).

### Step 4 — Configure environment variables

#### Local development

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TG_BOT_USERNAME=re7_21_bot
```

#### GitHub Actions (GitHub Pages deploy)

Add the three values as **Repository Secrets** in **Settings → Secrets and variables → Actions**:

| Secret name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
| `VITE_TG_BOT_USERNAME` | your bot username (no `@`) |

The deploy workflow reads these automatically — see [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

#### Docker Compose

Pass the variables in your shell or a `.env` file:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co \
VITE_SUPABASE_ANON_KEY=eyJ... \
VITE_TG_BOT_USERNAME=re7_21_bot \
docker compose up --build
```

### Step 5 — Test inside Telegram

1. Open your bot in Telegram.
2. Press the **menu button** (bottom left of the chat) — the game opens as a Mini App.
3. To test deep-link invites locally, use the Telegram test environment or share the link `https://t.me/<YOUR_BOT>?startapp=<ROOM-CODE>`.

### How invite links work

When a host is in the WaitingRoom:

- **Inside Telegram**: tapping **Invite Friend via Telegram** opens a Telegram share dialog where they can pick a contact. The contact receives a link that opens the game and auto-joins the room.
- **Outside Telegram**: tapping **Copy Invite Link** copies the deep-link URL to the clipboard. The guest opens it in Telegram (or pastes the room code manually).

The link format is: `https://t.me/<BOT_USERNAME>?startapp=<ROOM-CODE>`

---

## Option 6 — LLM Bot Mode (Play vs Claude AI)

Play the game against Claude (Anthropic) instead of the built-in rule-based AI bot. The game sends the full board state to a local MCP server, which calls the Anthropic API and returns Claude's decision.

The MCP server runs **locally alongside the dev server** — it is not deployed to GitHub Pages or Telegram (the LLM API key must never be in the browser bundle).

### Step 1 — Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account and generate an API key
3. Note: `claude-3-5-haiku-20241022` is the default model — fast and inexpensive (~$0.001 per turn)

### Step 2 — Configure the MCP server

```bash
cd mcp-server
cp .env.example .env
```

Edit `mcp-server/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-3-5-haiku-20241022
MCP_PORT=3333
```

### Step 3 — Install and start the MCP server

```bash
cd mcp-server
npm install    # already done if you ran this before
npm start
```

You should see:

```
🎴 RE7 21 MCP Bot Server
   Model : claude-3-5-haiku-20241022
   Port  : 3333
   Key   : ✓ set
```

### Step 4 — Start the game dev server (separate terminal)

```bash
# in the project root
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) → **Play vs Claude AI**.

### Step 5 — Optional: also set VITE_MCP_URL in project .env

If you want to run the MCP server on a different port or host, add to your project root `.env`:

```env
VITE_MCP_URL=http://localhost:3333
```

The default is `http://localhost:3333` — no change needed for local development.

### Docker Compose with MCP server

To run everything together (game + PeerJS + MCP server):

```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build
```

Or add `ANTHROPIC_API_KEY` to your root `.env` and run:

```bash
docker compose up --build
```

The game will be at [http://localhost:8080](http://localhost:8080), the MCP server at [http://localhost:3333](http://localhost:3333).

### How it works

1. You click **Play vs Claude AI** in the main menu
2. Every time it's Hoffman's (the bot's) turn, the game serializes the board state — both hands, remaining deck, trump cards, health, phase — and sends it to `POST http://localhost:3333/decide`
3. The MCP server builds a detailed prompt (with RE7 21 rules) and calls Anthropic with `tool_use` forcing Claude to return a structured `{ action, trumpType?, reasoning }` response
4. The browser receives the decision and dispatches it into the game reducer, same as the rule-based AI would
5. Claude's one-line reasoning is shown as a speech bubble above Hoffman's area

### Game freezes after standing

- This is a known engine invariant: `BOT_ACTION` hit/trump must preserve `BOT_TURN` state when the player has already stood. If you've modified `gameState.js`, verify this condition is intact.
