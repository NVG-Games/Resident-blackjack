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

> The game has **no backend** and **no database**. P2P multiplayer uses WebRTC via the public [PeerJS cloud](https://peerjs.com/) — no account or API key needed.

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
