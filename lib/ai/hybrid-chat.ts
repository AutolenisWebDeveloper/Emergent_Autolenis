/**
 * Hybrid chat engine — FAQ fast-path + Groq LLM fallback.
 *
 * Pipeline:
 *  1. FAQ fast-path via processMessage() — 0ms, $0 cost. If matched, return immediately.
 *  2. Intent scorer fast-path — if top score >= 0.6, use the copilot knowledge module.
 *  3. Groq LLM fallback — generateText() with variant system prompt + conversation history.
 *  4. Compliance scrub — applied to ALL LLM output.
 *  5. Ultimate fallback — buildFallbackResponse() when LLM is unavailable or errors.
 *
 * Graceful degradation: works with NO GROQ_API_KEY set (FAQ-only mode).
 */

import { generateText } from "ai"
import { processMessage } from "@/lib/chatbot/faq"
import { scoreIntents } from "@/lib/copilot/shared/intent-scorer"
import { runComplianceScrub } from "@/lib/copilot/shared/base-orchestrator"
import { PUBLIC_INTENT_PATTERNS } from "@/lib/copilot/public/intents"
import { PUBLIC_KNOWLEDGE } from "@/lib/copilot/public/knowledge"
import { isLLMAvailable, getLLM } from "./llm-provider"
import { buildSystemPrompt } from "./system-prompts"
import type { CopilotVariant, CopilotContext, ConversationTurn } from "@/lib/copilot/shared/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LLM_INTENT_THRESHOLD = 0.6
const MAX_HISTORY_TURNS = 10
const LLM_MAX_TOKENS = 500
const LLM_TEMPERATURE = 0.3

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface HybridChatResult {
  reply: string
  source: "faq" | "llm"
  intent?: string
}

// ---------------------------------------------------------------------------
// Fallback text per variant
// ---------------------------------------------------------------------------

const VARIANT_FALLBACKS: Record<CopilotVariant, string> = {
  public:
    "I'm here to help you learn about AutoLenis. Could you tell me more about what you're looking for?",
  buyer:
    "I'm your buyer assistant. I can help you check your deal status, pay fees, or understand next steps. What can I help you with?",
  dealer:
    "I'm your dealer assistant. I can help with offers, inventory, and fix lists. What do you need?",
  affiliate:
    "I'm your affiliate assistant. I can help with commissions, referrals, and payouts. What can I help with?",
  admin:
    "I'm the admin assistant. I can help look up deals, buyers, or platform reports. What would you like to do?",
}

// ---------------------------------------------------------------------------
// Main hybrid chat function
// ---------------------------------------------------------------------------

/**
 * Process a user message through the hybrid FAQ + LLM pipeline.
 *
 * @param params.message   - Raw user message text.
 * @param params.variant   - Which copilot variant is active.
 * @param params.context   - Full CopilotContext (role, route, dealStage, etc.).
 * @param params.history   - Conversation history (last N turns used).
 * @param params.route     - Current pathname for route-aware FAQ scoring.
 */
export async function hybridChat(params: {
  message: string
  variant: CopilotVariant
  context: CopilotContext
  history?: ConversationTurn[]
  route?: string
}): Promise<HybridChatResult> {
  const { message, variant, context, history = [], route } = params
  const trimmed = message.trim()

  // ------------------------------------------------------------------
  // Step 1 — FAQ fast-path (deterministic, 0ms, $0)
  // ------------------------------------------------------------------
  const faqResult = processMessage(trimmed, route ?? context.route)
  if (faqResult.intentId != null) {
    return {
      reply: faqResult.reply,
      source: "faq",
      intent: faqResult.intentId,
    }
  }

  // ------------------------------------------------------------------
  // Step 2 — Copilot intent scorer fast-path
  // Only applied for the public variant (the only variant with PUBLIC_KNOWLEDGE)
  // ------------------------------------------------------------------
  if (variant === "public") {
    const scored = scoreIntents(trimmed, context, PUBLIC_INTENT_PATTERNS)
    const top = scored[0]
    if (top && top.score >= LLM_INTENT_THRESHOLD) {
      const knowledge =
        PUBLIC_KNOWLEDGE.find((k) => k.intent === top.name) ??
        PUBLIC_KNOWLEDGE.find((k) => k.intent === "FALLBACK")
      if (knowledge && knowledge.intent !== "FALLBACK") {
        const scrubbedText = runComplianceScrub(knowledge.text)
        return {
          reply: scrubbedText,
          source: "faq",
          intent: top.name,
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Step 3 — LLM fallback (Groq via Vercel AI SDK)
  // ------------------------------------------------------------------
  if (isLLMAvailable()) {
    try {
      const model = getLLM()
      if (model) {
        // Build conversation history (last MAX_HISTORY_TURNS turns)
        const recentHistory = history.slice(-MAX_HISTORY_TURNS)
        const systemPrompt = buildSystemPrompt(variant, context)

        const { text } = await generateText({
          model,
          system: systemPrompt,
          messages: [
            ...recentHistory.map((turn) => ({
              role: turn.role as "user" | "assistant",
              content: turn.content,
            })),
            { role: "user" as const, content: trimmed },
          ],
          maxTokens: LLM_MAX_TOKENS,
          temperature: LLM_TEMPERATURE,
        })

        // Step 4 — compliance scrub on ALL LLM output
        const scrubbedText = runComplianceScrub(text)
        return {
          reply: scrubbedText,
          source: "llm",
        }
      }
    } catch (err) {
      // Log but do not surface LLM errors to the user — degrade gracefully
      console.error("[hybridChat] LLM error — falling back to deterministic response:", err)
    }
  }

  // ------------------------------------------------------------------
  // Step 5 — Ultimate fallback (deterministic, never fails)
  // ------------------------------------------------------------------
  return {
    reply: VARIANT_FALLBACKS[variant],
    source: "faq",
    intent: "FALLBACK",
  }
}
