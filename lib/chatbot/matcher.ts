/**
 * Chatbot intent matcher — deterministic keyword/phrase matching with
 * route-aware scoring for the Lenis Concierge widget.
 *
 * Scoring algorithm:
 *  1. Exact keyword phrase match → highest score (1.0)
 *  2. Token overlap ratio         → proportional score
 *  3. Route-category boost        → +0.2 when the current route matches the intent category
 *
 * Returns the top-scoring intent or null when no intent exceeds the threshold.
 */

import {
  INTENTS,
  FALLBACK_RESPONSE,
  FALLBACK_CHIPS,
  type ChatbotIntent,
  type IntentCategory,
  type SuggestedChip,
} from "./intents"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchResult {
  intent: ChatbotIntent
  score: number
}

export interface ChatbotResponse {
  reply: string
  intentId: string | null
  suggestedTopics: readonly SuggestedChip[]
}

// ---------------------------------------------------------------------------
// Route → Category mapping
// ---------------------------------------------------------------------------

const ROUTE_CATEGORY_MAP: Record<string, IntentCategory> = {
  "/pricing": "pricing",
  "/fees": "pricing",
  "/how-it-works": "process",
  "/about": "process",
  "/buyer": "prequal",
  "/prequal": "prequal",
  "/dealer": "dealer",
  "/dealers": "dealer",
  "/affiliate": "affiliate",
  "/affiliates": "affiliate",
  "/contact": "support",
  "/support": "support",
  "/help": "support",
}

/**
 * Resolve the primary intent category for a given route.
 * Uses prefix matching to handle sub-routes (e.g. /buyer/dashboard → "prequal").
 */
export function categoryForRoute(pathname: string): IntentCategory | null {
  // Exact match first
  if (ROUTE_CATEGORY_MAP[pathname]) {
    return ROUTE_CATEGORY_MAP[pathname]
  }
  // Prefix match
  for (const [prefix, category] of Object.entries(ROUTE_CATEGORY_MAP)) {
    if (pathname.startsWith(prefix)) {
      return category
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been",
  "am", "do", "does", "did", "have", "has", "had", "will",
  "would", "could", "should", "can", "may", "might", "shall",
  "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "up", "about", "into", "through", "during", "before", "after",
  "and", "but", "or", "nor", "not", "so", "yet", "both",
  "i", "me", "my", "we", "our", "you", "your", "it", "its",
  "this", "that", "these", "those", "what", "which", "who",
  "how", "if", "then", "than", "when", "where", "why",
  "tell", "know", "want", "need", "like", "just", "get",
  "please", "thanks", "thank", "hi", "hello", "hey",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Minimum score to consider a match valid. */
const MATCH_THRESHOLD = 0.25

/** Bonus applied when the intent category matches the current route. */
const ROUTE_BOOST = 0.2

/**
 * Score a single intent against a user message.
 * Returns a value between 0 and 1 (before route boost).
 */
function scoreIntent(intent: ChatbotIntent, messageLower: string, messageTokens: string[]): number {
  // 1. Exact keyword phrase match — prefer longer (more specific) matches
  let bestExactLength = 0
  for (const kw of intent.keywords) {
    if (messageLower.includes(kw.toLowerCase())) {
      bestExactLength = Math.max(bestExactLength, kw.length)
    }
  }
  if (bestExactLength > 0) {
    // Normalize: longer keyword matches score higher (min 0.8, max 1.0)
    return Math.min(0.8 + (bestExactLength / 50) * 0.2, 1.0)
  }

  // 2. Token overlap: how many intent keyword tokens appear in the message?
  const intentTokens = new Set(intent.keywords.flatMap((kw) => tokenize(kw)))
  if (intentTokens.size === 0) return 0

  let hits = 0
  for (const token of messageTokens) {
    if (intentTokens.has(token)) {
      hits++
    }
  }

  // Return ratio of matched message tokens vs total intent tokens, capped at 1
  return Math.min(hits / Math.max(intentTokens.size * 0.3, 1), 1.0)
}

/**
 * Match a user message against all intents. Returns the best match
 * or null if no intent exceeds the threshold.
 *
 * @param message  Raw user message
 * @param route    Current page route (optional) — used for category boosting
 */
export function matchIntent(message: string, route?: string): MatchResult | null {
  const messageLower = message.toLowerCase()
  const tokens = tokenize(message)
  const routeCategory = route ? categoryForRoute(route) : null

  let best: MatchResult | null = null

  for (const intent of INTENTS) {
    let score = scoreIntent(intent, messageLower, tokens)

    // Route-category boost
    if (routeCategory && intent.category === routeCategory) {
      score = Math.min(score + ROUTE_BOOST, 1.0)
    }

    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { intent, score }
    }
  }

  return best
}

/**
 * Return the top-N matching intents (sorted by score descending).
 */
export function matchIntentTopN(message: string, n: number, route?: string): MatchResult[] {
  const messageLower = message.toLowerCase()
  const tokens = tokenize(message)
  const routeCategory = route ? categoryForRoute(route) : null

  const scored: MatchResult[] = []

  for (const intent of INTENTS) {
    let score = scoreIntent(intent, messageLower, tokens)
    if (routeCategory && intent.category === routeCategory) {
      score = Math.min(score + ROUTE_BOOST, 1.0)
    }
    if (score >= MATCH_THRESHOLD) {
      scored.push({ intent, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, n)
}

// ---------------------------------------------------------------------------
// Public handler
// ---------------------------------------------------------------------------

/**
 * Process a user message and return a deterministic response.
 * This is the main entry point used by the chat widget.
 */
export function processMessage(message: string, route?: string): ChatbotResponse {
  const result = matchIntent(message, route)

  if (result) {
    return {
      reply: result.intent.answer,
      intentId: result.intent.id,
      suggestedTopics: result.intent.chips,
    }
  }

  return {
    reply: FALLBACK_RESPONSE,
    intentId: null,
    suggestedTopics: FALLBACK_CHIPS,
  }
}
