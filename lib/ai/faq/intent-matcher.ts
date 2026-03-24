/**
 * Intent Matcher – maps user input to FAQ intents with confidence scoring.
 *
 * Uses hybrid matching:
 *  1. Exact / near-exact question match (highest confidence)
 *  2. Keyword trigger matching (medium confidence)
 *  3. Tag / category affinity (tie-breaker)
 *
 * Returns: { intentId, confidence, category, intent }
 */

import type { FAQIntent, FAQIntentPack, FAQCategory, IntentMatchResult } from "./types"

// ---------------------------------------------------------------------------
// Corpus loading
// ---------------------------------------------------------------------------

const faqPack = require("../../../canon/concierge/buyer_faq_intents.v1.json") as FAQIntentPack
const allIntents: FAQIntent[] = faqPack.intents

// ---------------------------------------------------------------------------
// Stop words (reuse pattern from knowledge/retrieval.ts)
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "is", "at", "which", "on", "in", "to", "of", "and", "or",
  "it", "an", "as", "be", "by", "for", "from", "has", "he", "if",
  "its", "my", "not", "was", "are", "but", "can", "do", "had",
  "her", "his", "how", "me", "no", "our", "out", "she", "so",
  "up", "we", "what", "who", "will", "with", "you", "your", "this",
  "that", "they", "them", "have", "been", "does", "did", "would",
  "could", "should", "about", "just", "than", "very", "a", "i",
])

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

function meaningfulTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOP_WORDS.has(t))
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a single intent against user input.
 * Returns a confidence between 0 and 1.
 */
function scoreIntent(intent: FAQIntent, input: string): number {
  const inputLower = input.toLowerCase().trim()
  const inputTokens = meaningfulTokens(input)

  if (inputTokens.length === 0) return 0

  let score = 0

  // 1. Exact question match (highest signal)
  for (const question of intent.user_questions) {
    const questionLower = question.toLowerCase().trim()
    if (inputLower === questionLower) return 1.0 // perfect match
    // Near-exact: input contains the full question or vice-versa
    if (inputLower.includes(questionLower) || questionLower.includes(inputLower)) {
      score = Math.max(score, 0.9)
    }
  }

  // 2. Question token overlap
  for (const question of intent.user_questions) {
    const questionTokens = meaningfulTokens(question)
    if (questionTokens.length === 0) continue
    const overlap = inputTokens.filter((t) => questionTokens.includes(t)).length
    const overlapRatio = overlap / Math.max(questionTokens.length, inputTokens.length)
    score = Math.max(score, overlapRatio * 0.85)
  }

  // 3. Tag matching
  for (const tag of intent.tags) {
    if (inputLower.includes(tag)) {
      score = Math.max(score, Math.min(score + 0.15, 0.8))
    }
  }

  // 4. Title keyword match
  const titleTokens = meaningfulTokens(intent.title)
  const titleOverlap = inputTokens.filter((t) => titleTokens.includes(t)).length
  if (titleTokens.length > 0) {
    const titleRatio = titleOverlap / titleTokens.length
    score = Math.max(score, titleRatio * 0.7)
  }

  // 5. Answer keyword match (low-weight tiebreaker)
  const answerTokens = meaningfulTokens(intent.answer_markdown)
  const answerOverlap = inputTokens.filter((t) => answerTokens.includes(t)).length
  if (answerTokens.length > 0) {
    const answerRatio = answerOverlap / Math.max(answerTokens.length, 1)
    score = Math.max(score, answerRatio * 0.4)
  }

  return Math.min(score, 1.0)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Minimum confidence to return a match. */
const MIN_CONFIDENCE = 0.25

/**
 * Match user input to the best FAQ intent.
 *
 * @param input - The user's question or message
 * @param categoryHint - Optional category to prefer in tie-breaking
 * @returns The best matching intent, or null if confidence is below threshold
 */
export function matchIntent(
  input: string,
  categoryHint?: FAQCategory,
): IntentMatchResult | null {
  if (!input.trim()) return null

  let bestMatch: { intent: FAQIntent; confidence: number } | null = null

  for (const intent of allIntents) {
    const confidence = scoreIntent(intent, input)
    if (confidence < MIN_CONFIDENCE) continue

    // Apply category hint bonus (small tie-breaker)
    const adjustedConfidence =
      categoryHint && intent.category === categoryHint
        ? Math.min(confidence + 0.05, 1.0)
        : confidence

    if (!bestMatch || adjustedConfidence > bestMatch.confidence) {
      bestMatch = { intent, confidence: adjustedConfidence }
    }
  }

  if (!bestMatch) return null

  return {
    intentId: bestMatch.intent.id,
    confidence: Math.round(bestMatch.confidence * 100) / 100,
    category: bestMatch.intent.category,
    intent: bestMatch.intent,
  }
}

/**
 * Match user input and return top N results sorted by confidence.
 * Useful for debugging and analytics.
 */
export function matchIntentTopN(
  input: string,
  n = 5,
): IntentMatchResult[] {
  if (!input.trim()) return []

  return allIntents
    .map((intent) => ({
      intentId: intent.id,
      confidence: Math.round(scoreIntent(intent, input) * 100) / 100,
      category: intent.category,
      intent,
    }))
    .filter((r) => r.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, n)
}

/**
 * Get an intent by its ID.
 */
export function getIntentById(id: string): FAQIntent | undefined {
  return allIntents.find((i) => i.id === id)
}

/**
 * Get all intents in a category.
 */
export function getIntentsByCategory(category: FAQCategory): FAQIntent[] {
  return allIntents.filter((i) => i.category === category)
}

/** Expose the loaded pack version for traceability. */
export const FAQ_PACK_VERSION = faqPack.version
