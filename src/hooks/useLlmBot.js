/**
 * useLlmBot — hook for the "Play vs LLM" mode.
 *
 * Sends a serialized game state snapshot to the local MCP server and
 * returns the LLM's decision: { action: "hit"|"stand"|"trump", trump?, reasoning? }
 *
 * The MCP server must be running at MCP_URL (default: http://localhost:3333).
 * Start it with: cd mcp-server && npm start
 */
import { useCallback, useRef } from 'react'
import { getHandTotal } from '../engine/deck.js'
import { getEffectiveTarget } from '../engine/trumpEngine.js'

const MCP_URL = import.meta.env.VITE_MCP_URL ?? 'http://localhost:3333'

/**
 * Serialize only the fields the LLM needs — avoid sending the full reducer
 * state (which contains internal flags irrelevant to decision-making).
 */
function serializeState(state) {
  const allTableTrumps = [...(state.playerTableTrumps ?? []), ...(state.botTableTrumps ?? [])]
  const target = getEffectiveTarget(allTableTrumps)

  const botTotal = getHandTotal(state.botHand ?? [])
  const playerTotal = getHandTotal(
    (state.playerHand ?? []).filter(c => !c.hidden),
  )

  // Compute current bet (base + modifiers from table trumps)
  const baseBet = state.currentBet ?? 1

  return {
    phase: state.phase,
    roundNumber: state.roundNumber,
    target,
    bet: baseBet,

    // Bot (Hoffman)
    botHand: (state.botHand ?? []).map(c => ({ value: c.value, hidden: Boolean(c.hidden) })),
    botTotal,
    botHealth: state.botHealth,
    botTableTrumps: (state.botTableTrumps ?? []).map(t => ({ type: t.type })),
    botTrumpHand: (state.botTrumpHand ?? []).map(t => ({ type: t.type, id: t.id })),

    // Player (Clancy)
    playerHand: (state.playerHand ?? []).map(c => ({ value: c.value, hidden: Boolean(c.hidden) })),
    playerTotal,
    playerHealth: state.playerHealth,
    playerTableTrumps: (state.playerTableTrumps ?? []).map(t => ({ type: t.type })),
    playerStood: Boolean(state.playerStood),

    // Remaining deck (LLM uses this for card counting)
    deck: (state.deck ?? []).map(c => ({ value: c.value })),
  }
}

export function useLlmBot() {
  const abortRef = useRef(null)

  const decide = useCallback(async (state) => {
    // Cancel any in-flight request from the previous turn
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${MCP_URL}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: serializeState(state) }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('[useLlmBot] MCP error:', res.status, text)
        return { action: 'stand' }
      }

      const data = await res.json()
      return data // { action, trump?, reasoning? }
    } catch (err) {
      if (err.name === 'AbortError') return null // cancelled, ignore
      console.error('[useLlmBot] fetch failed:', err.message)
      // Graceful degradation — stand rather than freeze the game
      return { action: 'stand' }
    }
  }, [])

  return { decide }
}
