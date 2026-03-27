/**
 * RE7 21 — MCP LLM Bot Server
 *
 * Exposes a single HTTP endpoint:
 *   POST /decide  { state: <serialized game state> }
 *   → { action: "hit" | "stand" | "trump", trumpType?: string }
 *
 * The server calls Anthropic with tool_use so the response is always
 * structured and parseable — no regex hacking needed.
 *
 * Start:
 *   cd mcp-server && npm install && npm start
 *
 * Requires:
 *   ANTHROPIC_API_KEY in environment (or ../.env)
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, buildStateMessage } from './prompt.js'

const PORT = process.env.MCP_PORT ?? 3333
const MODEL = process.env.LLM_MODEL ?? 'claude-3-5-haiku-20241022'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const app = express()
app.use(cors())
app.use(express.json({ limit: '256kb' }))

// ── Tool definition ──────────────────────────────────────────────────────────

const DECIDE_TOOL = {
  name: 'decide',
  description: 'Make your game decision for this turn.',
  input_schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['hit', 'stand', 'trump'],
        description: '"hit" to draw a card, "stand" to end your turn, "trump" to play a trump card from your hand.',
      },
      trumpType: {
        type: 'string',
        description: 'Required when action is "trump". The TRUMP_TYPE constant of the card to play (e.g. "CARD_5", "SHIELD", "RETURN").',
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of your reasoning (1-2 sentences). Shown to the player as flavor text.',
      },
    },
    required: ['action'],
  },
}

// ── Endpoint ─────────────────────────────────────────────────────────────────

app.post('/decide', async (req, res) => {
  const { state } = req.body

  if (!state) {
    return res.status(400).json({ error: 'Missing state in request body' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Add it to mcp-server/.env',
    })
  }

  try {
    const userMessage = buildStateMessage(state)

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      tools: [DECIDE_TOOL],
      tool_choice: { type: 'any' }, // force tool use
      messages: [{ role: 'user', content: userMessage }],
    })

    // Extract the tool_use block
    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse) {
      console.error('[mcp] LLM did not call decide tool. Response:', JSON.stringify(response.content))
      // Fall back to stand if LLM misbehaves
      return res.json({ action: 'stand', reasoning: '…' })
    }

    const { action, trumpType, reasoning } = toolUse.input

    // Validate trump action has a trumpType that exists in the bot's hand
    if (action === 'trump') {
      const validTypes = (state.botTrumpHand ?? []).map(t => t.type)
      if (!trumpType || !validTypes.includes(trumpType)) {
        console.warn(`[mcp] LLM chose trump "${trumpType}" but bot hand: ${validTypes.join(', ')}. Falling back to hit.`)
        return res.json({ action: 'hit', reasoning: reasoning ?? '…' })
      }
      return res.json({
        action: 'trump',
        trump: state.botTrumpHand.find(t => t.type === trumpType),
        reasoning: reasoning ?? '…',
      })
    }

    return res.json({ action, reasoning: reasoning ?? '…' })
  } catch (err) {
    console.error('[mcp] Anthropic API error:', err.message ?? err)
    // Graceful degradation — stand rather than crash the game
    return res.status(200).json({ action: 'stand', reasoning: 'Error reaching LLM — standing.' })
  }
})

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, model: MODEL }))

app.listen(PORT, () => {
  console.log(`\n🎴 RE7 21 MCP Bot Server`)
  console.log(`   Model : ${MODEL}`)
  console.log(`   Port  : ${PORT}`)
  console.log(`   Key   : ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ MISSING — set ANTHROPIC_API_KEY'}`)
  console.log(`\n   POST http://localhost:${PORT}/decide\n`)
})
