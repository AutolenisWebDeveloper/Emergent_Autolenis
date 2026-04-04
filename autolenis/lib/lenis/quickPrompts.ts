/**
 * Quick Prompts — context-aware pre-selected questions for Lenis Concierge™.
 *
 * Provides role + route + state driven prompt sets so users never stare at
 * a blank input box.  Each context shows 6–10 prompts and always includes
 * at least one fees question, one "start/next step" action, one "how it
 * works" explainer, and one calculator-related question (where relevant).
 */

import type { AIRole } from "../ai/context-builder"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuickPrompt {
  emoji: string
  label: string
}

export interface QuickPromptState {
  /** Buyer has an active vehicle request */
  hasActiveRequest?: boolean
  /** Buyer has completed pre-qualification */
  hasPrequal?: boolean
  /** Dealer has open buyer requests to review */
  hasOpenRequests?: boolean
}

export interface QuickPromptInput {
  role: AIRole
  pathname: string
  state?: QuickPromptState
}

// ---------------------------------------------------------------------------
// Prompt sets keyed by context
// ---------------------------------------------------------------------------

const PUBLIC_PROMPTS: QuickPrompt[] = [
  { emoji: "💰", label: "How do your fees work?" },
  { emoji: "🧾", label: "What's included in AutoLenis?" },
  { emoji: "🏦", label: "How does pre-qualification work?" },
  { emoji: "🚗", label: "Start my vehicle request" },
  { emoji: "🔁", label: "Can you help me refinance?" },
  { emoji: "🧠", label: "How do dealers compete for my deal?" },
]

const BUYER_DEFAULT_PROMPTS: QuickPrompt[] = [
  { emoji: "🏦", label: "Run my affordability check" },
  { emoji: "🚗", label: "Create a new vehicle request" },
  { emoji: "📄", label: "What documents do you need from me?" },
  { emoji: "🧾", label: "Explain the fees for my deal" },
  { emoji: "🛡️", label: "Review my contract for red flags" },
  { emoji: "🏦", label: "How does pre-qualification work?" },
]

const BUYER_ACTIVE_REQUEST_PROMPTS: QuickPrompt[] = [
  { emoji: "📍", label: "What step am I on?" },
  { emoji: "🏦", label: "Run my affordability check" },
  { emoji: "📄", label: "What documents do you need from me?" },
  { emoji: "🧾", label: "Explain the fees for my deal" },
  { emoji: "🛡️", label: "Review my contract for red flags" },
  { emoji: "🔄", label: "Update my vehicle request" },
]

const DEALER_PROMPTS: QuickPrompt[] = [
  { emoji: "🔎", label: "Show open buyer requests" },
  { emoji: "💵", label: "How do I submit my best offer?" },
  { emoji: "📄", label: "What docs are required to close?" },
  { emoji: "⏱️", label: "What's the timeline to funding?" },
  { emoji: "🧾", label: "What fees does the buyer pay?" },
  { emoji: "🧠", label: "How does ranking work?" },
]

const AFFILIATE_PROMPTS: QuickPrompt[] = [
  { emoji: "🔗", label: "Generate my referral link" },
  { emoji: "📊", label: "Show my referrals and conversions" },
  { emoji: "💸", label: "When is my next payout?" },
  { emoji: "🧾", label: "How is attribution tracked?" },
  { emoji: "🚫", label: "Why wasn't a signup attributed?" },
  { emoji: "📣", label: "Give me a short promo script" },
]

const ADMIN_PROMPTS: QuickPrompt[] = [
  { emoji: "🔎", label: "Search a user" },
  { emoji: "📈", label: "Generate a weekly activity report" },
  { emoji: "💸", label: "Reconcile payouts" },
  { emoji: "🧾", label: "Show fee revenue" },
  { emoji: "⚠", label: "Review flagged activity" },
  { emoji: "🧠", label: "Summarize platform health" },
]

// ---------------------------------------------------------------------------
// Route-pattern helpers
// ---------------------------------------------------------------------------

function matchesRoute(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

// ---------------------------------------------------------------------------
// Selector
// ---------------------------------------------------------------------------

/**
 * Return the correct set of quick prompts for the current user context.
 *
 * Resolution order:
 *   1. Route-specific override (e.g. /buyer, /dealer, /affiliate, /admin)
 *   2. Role fallback
 *   3. Public default
 */
export function getQuickPrompts({ role, pathname, state }: QuickPromptInput): QuickPrompt[] {
  // Route-based matching takes priority so a public user on /buyer still
  // sees buyer prompts (shouldn't happen, but keeps logic deterministic).
  if (matchesRoute(pathname, "/admin")) return ADMIN_PROMPTS
  if (matchesRoute(pathname, "/affiliate")) return AFFILIATE_PROMPTS
  if (matchesRoute(pathname, "/dealer")) return DEALER_PROMPTS
  if (matchesRoute(pathname, "/buyer")) {
    if (state?.hasActiveRequest) return BUYER_ACTIVE_REQUEST_PROMPTS
    return BUYER_DEFAULT_PROMPTS
  }

  // Role-based fallback when the pathname doesn't match a known dashboard
  switch (role) {
    case "admin":
      return ADMIN_PROMPTS
    case "affiliate":
      return AFFILIATE_PROMPTS
    case "dealer":
      return DEALER_PROMPTS
    case "buyer":
      if (state?.hasActiveRequest) return BUYER_ACTIVE_REQUEST_PROMPTS
      return BUYER_DEFAULT_PROMPTS
    case "public":
    default:
      return PUBLIC_PROMPTS
  }
}

/** The follow-up message sent when the user clicks "More details". */
export const MORE_DETAILS_PROMPT = "Expand your last answer with details, examples, and edge cases."

/** Format a quick prompt into the message text sent to the assistant. */
export function formatPromptMessage(prompt: QuickPrompt): string {
  return `${prompt.emoji} ${prompt.label}`
}
