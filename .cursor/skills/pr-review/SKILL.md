---
name: pr-review
description: Review the current git branch diff vs main branch. Performs code review of all changed files: logic correctness, React/engine conventions, potential bugs, and style consistency. Use when the user asks to review a PR, review changes, review the current branch, or "сделай ревью".
---

# PR Review vs main

## Steps

1. **Get the diff**

```bash
git diff main...HEAD --stat
git diff main...HEAD
```

If `main` doesn't exist locally, try `origin/main`:
```bash
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

2. **Read changed files** — for each file in the diff, read it in full if the diff alone is insufficient to judge context.

3. **Categorise each finding** using the format below.

4. **Post the report** as a structured markdown review.

---

## Review checklist (project-specific)

### Game engine (`src/engine/`)
- [ ] Reducer cases always return new objects (no mutation)
- [ ] `BOT_ACTION` hit/trump branches: `roundState` stays `BOT_TURN` when `state.playerStood === true`
- [ ] `BOT_ACTION` stand branch always sets `roundState: PLAYER_TURN`
- [ ] Every `TRUMP_TYPES` used in pools has a matching case in `applyTrump`
- [ ] Seeded shuffle (`shuffleDeckWithSeed`) used only in online mode dispatches

### React components (`src/components/`)
- [ ] No state mutations; no direct `state.x = ...`
- [ ] GSAP `onComplete` is NOT used for React state transitions (call setState directly)
- [ ] Tailwind classes; inline styles only for dynamic values
- [ ] Fonts: `font-cinzel` for headings/labels, `font-fell` for flavour text
- [ ] No hardcoded pixel colours that conflict with the dark gothic palette (`#0d0805` bg, `#8b0000` red, `#f0e2c0` parchment)

### Online / P2P (`src/hooks/`, `src/contexts/`)
- [ ] Only one of `dispatch` or `syncedDispatch` is used per action path (no double-dispatch)
- [ ] `onData` listener is unsubscribed on unmount (returns cleanup fn)
- [ ] `initPeer()` is not called more than once (guarded by `if (peerRef.current) return`)

### Routing (`src/App.jsx`)
- [ ] All screens listed in the `screen` state union type are rendered
- [ ] `onReturnToMenu` prop always resets `onlineState` before navigating

### General
- [ ] No `console.log` left in production paths
- [ ] No hardcoded secrets or API keys
- [ ] `npm run build` passes (mention if you ran it)

---

## Report format

```
## PR Review — <branch> vs main

### Summary
<1–3 sentence overview of what the PR does>

### 🔴 Critical (must fix)
- **File:Line** — description + suggested fix

### 🟡 Suggestion (consider fixing)
- **File:Line** — description

### 🟢 Looks good
- What was done well

### Checklist
[paste filled checklist]
```

Keep the report tight. Skip sections that have no findings. Quote relevant code snippets for critical issues.
