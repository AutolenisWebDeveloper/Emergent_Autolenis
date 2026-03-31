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
// Context-aware next-step suggestions
// ---------------------------------------------------------------------------

/** Return stage-aware quick actions for the buyer variant. */
export function getBuyerStageActions(stage: DealStage | undefined): QuickAction[] {
  if (!stage) {
    return [
      { label: "Start prequalification", message: "How do I prequalify?", autoSubmit: true },
      { label: "View my deals", message: "Show my deals", autoSubmit: true },
    ]
  }

  const stageActions: Partial<Record<DealStage, QuickAction[]>> = {
    SELECTED: [
      { label: "Pay deposit", message: "I want to pay my deposit", autoSubmit: true },
      { label: "View deal details", message: "What is my deal status?", autoSubmit: true },
    ],
    FINANCING_PENDING: [
      { label: "Check financing", message: "What are my financing options?", autoSubmit: true },
      { label: "View deal status", message: "What is my deal status?", autoSubmit: true },
    ],
    FINANCING_APPROVED: [
      { label: "View approved terms", message: "Show my financing details", autoSubmit: true },
      { label: "Next step", message: "What's my next step?", autoSubmit: true },
    ],
    FEE_PENDING: [
      { label: "Pay concierge fee", message: "How do I pay my concierge fee?", autoSubmit: true },
      { label: "Include in financing", message: "Can I include the fee in my loan?", autoSubmit: true },
    ],
    FEE_PAID: [
      { label: "Next step", message: "What happens next?", autoSubmit: true },
      { label: "View deal status", message: "What is my deal status?", autoSubmit: true },
    ],
    INSURANCE_PENDING: [
      { label: "Get insurance", message: "How do I get insurance?", autoSubmit: true },
      { label: "View deal status", message: "What is my deal status?", autoSubmit: true },
    ],
    CONTRACT_REVIEW: [
      { label: "Review contract", message: "Show my contract", autoSubmit: true },
      { label: "Contract Shield scan", message: "Run Contract Shield on my contract", autoSubmit: true },
    ],
    CONTRACT_APPROVED: [
      { label: "Sign contract", message: "How do I sign?", autoSubmit: true },
      { label: "View contract", message: "Review my contract", autoSubmit: true },
    ],
    SIGNING_PENDING: [
      { label: "Sign now", message: "I'm ready to sign", autoSubmit: true },
      { label: "View contract", message: "Review my contract", autoSubmit: true },
    ],
    SIGNED: [
      { label: "Schedule pickup", message: "Schedule my vehicle pickup", autoSubmit: true },
      { label: "View deal details", message: "What is my deal status?", autoSubmit: true },
    ],
    PICKUP_SCHEDULED: [
      { label: "View pickup details", message: "When is my pickup?", autoSubmit: true },
      { label: "Contact support", message: "I need help with my pickup", autoSubmit: true },
    ],
  }

  return stageActions[stage] ?? [
    { label: "Check deal status", message: "What is my deal status?", autoSubmit: true },
    { label: "Contact support", message: "I need help", autoSubmit: true },
  ]
}

// ---------------------------------------------------------------------------
// Fallback response builder
// ---------------------------------------------------------------------------

const VARIANT_FALLBACKS: Record<CopilotVariant, string> = {
  public: "I'm here to help you learn about AutoLenis — your concierge car-buying platform. Could you tell me a bit more about what you're looking for?",
  buyer: "I'm your buyer assistant. I can help you check your deal status, pay fees, review your contract, or understand your next steps. What can I help you with?",
  dealer: "I'm your dealer assistant. I can help with viewing auctions, submitting offers, managing inventory, and understanding fix lists. What do you need?",
  affiliate: "I'm your affiliate assistant. I can help with commissions, referral links, team management, and payouts. What can I help with?",
  admin: "I'm the admin assistant. I can help look up deals, review compliance events, manage users, or check platform health. What would you like to do?",
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
  "this sucks",
  "waste of time",
  "give up",
  "scam",
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

// ---------------------------------------------------------------------------
// Greeting detection
// ---------------------------------------------------------------------------

const GREETING_PATTERNS = [
  "hello",
  "hi",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "howdy",
  "sup",
  "what's up",
  "greetings",
  "yo",
]

/**
 * Detect if a message is a greeting and return an appropriate response.
 * Returns null if the message is not a greeting.
 */
export function detectGreeting(message: string, variant: CopilotVariant): string | null {
  const lower = message.toLowerCase().trim()

  // Only match if the message is short (likely just a greeting)
  if (lower.split(/\s+/).length > 5) return null

  // Use word-boundary matching to avoid false positives (e.g. "shield" matching "hi")
  const isGreeting = GREETING_PATTERNS.some((g) => {
    const regex = new RegExp(`\\b${g}\\b`, "i")
    return regex.test(lower)
  })
  if (!isGreeting) return null

  const greetings: Record<CopilotVariant, string> = {
    public: "Hello! Welcome to AutoLenis. I'm your AI copilot — I can help you learn about our concierge car-buying platform, pricing, prequalification, and more. What would you like to know?",
    buyer: "Hello! I'm your buyer assistant. I can help you check your deal status, navigate next steps, pay fees, review your contract, or answer any questions about the process. How can I help?",
    dealer: "Hello! I'm your dealer assistant. I can help you view active auctions, manage your inventory, submit offers, and track your deals. What would you like to do?",
    affiliate: "Hello! I'm your affiliate assistant. I can help with your referral links, commissions, team management, and payout history. What can I help with?",
    admin: "Hello! I'm the admin assistant. I can help you look up deals, manage users, review compliance events, and check platform health. What would you like to do?",
  }

  return greetings[variant]
}
