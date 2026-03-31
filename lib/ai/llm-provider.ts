/**
 * LLM Provider — centralized Groq client for the AutoLenis hybrid copilot.
 *
 * Uses the Vercel AI SDK with the Groq provider.
 * Respects the global AI kill-switch from lib/ai/kill-switch.ts.
 *
 * Graceful degradation: returns null / false when GROQ_API_KEY is absent
 * or the kill switch is active — callers fall back to the FAQ engine.
 */

import { createGroq } from "@ai-sdk/groq"
import { isAIDisabled } from "./kill-switch"

// ---------------------------------------------------------------------------
// Type alias
// ---------------------------------------------------------------------------

/** A resolved Groq model instance returned by the provider. */
export type GroqModel = ReturnType<ReturnType<typeof createGroq>>

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
export const FALLBACK_GROQ_MODEL = "mixtral-8x7b-32768"

// ---------------------------------------------------------------------------
// Provider singleton (lazy — only created when key is present)
// ---------------------------------------------------------------------------

let _groqProvider: ReturnType<typeof createGroq> | null = null

function getGroqProvider(): ReturnType<typeof createGroq> | null {
  const apiKey = process.env["GROQ_API_KEY"]
  if (!apiKey) return null
  if (!_groqProvider) {
    _groqProvider = createGroq({ apiKey })
  }
  return _groqProvider
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the LLM is available for use:
 * - GROQ_API_KEY is set
 * - Kill switch is NOT active
 */
export function isLLMAvailable(): boolean {
  if (isAIDisabled()) return false
  const apiKey = process.env["GROQ_API_KEY"]
  return typeof apiKey === "string" && apiKey.trim().length > 0
}

/**
 * Returns the configured Groq model instance.
 * Returns null when the LLM is unavailable.
 *
 * @param model - Override the default model ID.
 */
export function getLLM(model?: string): GroqModel | null {
  if (!isLLMAvailable()) return null
  const provider = getGroqProvider()
  if (!provider) return null
  return provider(model ?? DEFAULT_GROQ_MODEL)
}
