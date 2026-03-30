/**
 * Shared pipeline utilities for all copilot orchestrators.
 */

import { scrubResponse } from "./policies"
import { DEAL_STAGE_LABELS } from "./types"
import type { CopilotVariant, CopilotContext, DealStage, CopilotTool, ConversationTurn, QuickAction, CopilotResponse } from "./types"

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

/** Apply compliance scrub to any text. */
export function runComplianceScrub(text: string): string {
  return scrubResponse(text)
}

// ---------------------------------------------------------------------------
// Deal stage translation
// ---------------------------------------------------------------------------

/** Translate a raw DealStage enum to a human-readable label. */
export function translateDealStage(stage: DealStage): string {
  return DEAL_STAGE_LABELS[stage] ?? "In Progress"
}

// ---------------------------------------------------------------------------
// Fallback response builder
// ---------------------------------------------------------------------------

const VARIANT_FALLBACKS: Record<CopilotVariant, string> = {
  public: "I'm here to help you learn about AutoLenis. Could you tell me a bit more about what you're looking for?",
  buyer: "I'm your buyer assistant. I can help you check your deal status, pay fees, or understand next steps. What can I help you with?",
  dealer: "I'm your dealer assistant. I can help with offers, inventory, and fix lists. What do you need?",
  affiliate: "I'm your affiliate assistant. I can help with commissions, referrals, and payouts. What can I help with?",
  admin: "I'm the admin assistant. I can help look up deals, buyers, or platform reports. What would you like to do?",
}

/**
 * Build a safe fallback CopilotResponse.
 */
export function buildFallbackResponse(
  variant: CopilotVariant,
  fallbackText?: string,
  chips?: QuickAction[],
): CopilotResponse {
  return {
    renderState: chips && chips.length > 0 ? "quick_actions" : "text_response",
    text: fallbackText ?? VARIANT_FALLBACKS[variant],
    quickActions: chips?.slice(0, 3),
    intent: "FALLBACK",
  }
}

// ---------------------------------------------------------------------------
// Tool access validation
// ---------------------------------------------------------------------------

/**
 * Validate whether a tool is accessible given the current context.
 * Returns null if valid, or an error string if access is denied.
 */
export function validateToolAccess(tool: CopilotTool, context: CopilotContext): string | null {
  if (tool.requiredRole && tool.requiredRole.length > 0 && !tool.requiredRole.includes(context.role)) {
    return `This action requires the ${tool.requiredRole.join(" or ")} role.`
  }
  if (tool.requiredDealStage && tool.requiredDealStage.length > 0) {
    if (!context.dealStage || !tool.requiredDealStage.includes(context.dealStage)) {
      const humanStages = tool.requiredDealStage.map((s) => translateDealStage(s))
      return `This action is only available when your deal is in: ${humanStages.join(", ")}.`
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Frustration detection
// ---------------------------------------------------------------------------

const FRUSTRATION_SIGNALS = [
  "not working",
  "doesn't work",
  "won't work",
  "cant",
  "can't",
  "broken",
  "frustrated",
  "terrible",
  "awful",
  "useless",
  "garbage",
  "ridiculous",
  "stupid",
  "horrible",
  "hate this",
  "hate it",
  "what the",
  "wtf",
  "why isn't",
  "why won't",
  "nothing works",
]

/**
 * Detect frustration in the user message and recent history.
 * Returns true if frustration signals are found.
 */
export function detectFrustration(message: string, history: ConversationTurn[]): boolean {
  const lowerMessage = message.toLowerCase()
  if (FRUSTRATION_SIGNALS.some((sig) => lowerMessage.includes(sig))) return true

  // Check last 3 turns for repeated similar questions (indicates frustration)
  // Normalize: lowercase, remove punctuation, collapse whitespace
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim()
  const recentUserTurns = history
    .filter((t) => t.role === "user")
    .slice(-3)
    .map((t) => normalize(t.content))

  if (recentUserTurns.length >= 2) {
    const lastTwo = recentUserTurns.slice(-2)
    if (lastTwo[0] && lastTwo[1] && lastTwo[0] === lastTwo[1]) return true
  }

  return false
}
