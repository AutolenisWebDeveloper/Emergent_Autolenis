/**
 * Intent scoring engine for the AutoLenis copilot system.
 *
 * Scoring rules:
 *  - Exact phrase match  → 1.0
 *  - Two keyword match   → 0.7
 *  - One keyword match   → 0.4
 *  - Route bonus         → +0.3
 *  - Stage bonus         → +0.4
 *  - Role mismatch       → 0.0 (floor)
 *
 * Minimum threshold for triggering an action intent: 0.6
 */

import type { CopilotContext, DealStage, UserRole } from "./types"

export const ACTION_THRESHOLD = 0.6

export interface IntentPattern {
  /** The intent name (e.g. "PAY_DEPOSIT") */
  name: string
  /** Exact phrases that trigger score 1.0 */
  phrases: string[]
  /** Keywords where 1 = 0.4, 2+ = 0.7 */
  keywords: string[]
  /** Routes where the intent is particularly relevant (+0.3) */
  routeBonus?: string[]
  /** Deal stages where the intent is particularly relevant (+0.4) */
  stageBonus?: DealStage[]
  /** Required role — if set and role doesn't match, score is floored to 0.0 */
  roleRequired?: UserRole[]
}

export interface ScoredIntent {
  name: string
  score: number
}

/**
 * Score all intents for a given message and context.
 * Returns array sorted by score descending.
 */
export function scoreIntents(
  message: string,
  context: CopilotContext,
  patterns: IntentPattern[],
): ScoredIntent[] {
  const lower = message.toLowerCase().trim()
  const scores: ScoredIntent[] = []

  for (const pattern of patterns) {
    // Role gate — floor to 0.0 on mismatch
    if (pattern.roleRequired && pattern.roleRequired.length > 0) {
      if (!pattern.roleRequired.includes(context.role)) {
        scores.push({ name: pattern.name, score: 0.0 })
        continue
      }
    }

    let score = 0.0

    // 1. Exact phrase match → 1.0
    const phraseMatch = pattern.phrases.some((phrase) =>
      lower.includes(phrase.toLowerCase()),
    )
    if (phraseMatch) {
      score = 1.0
    } else {
      // 2. Keyword match
      const matchedKeywords = pattern.keywords.filter((kw) =>
        lower.includes(kw.toLowerCase()),
      )
      if (matchedKeywords.length >= 2) {
        score = 0.7
      } else if (matchedKeywords.length === 1) {
        score = 0.4
      }
    }

    // 3. Route bonus
    if (score > 0 && pattern.routeBonus) {
      const routeMatches = pattern.routeBonus.some((route) =>
        context.route.startsWith(route),
      )
      if (routeMatches) {
        score = Math.min(1.0, score + 0.3)
      }
    }

    // 4. Stage bonus
    if (score > 0 && pattern.stageBonus && context.dealStage) {
      if (pattern.stageBonus.includes(context.dealStage)) {
        score = Math.min(1.0, score + 0.4)
      }
    }

    scores.push({ name: pattern.name, score })
  }

  return scores.sort((a, b) => b.score - a.score)
}

/**
 * Return the top-scoring intent if it meets the action threshold.
 * Returns null if no intent meets the threshold.
 */
export function topIntent(
  message: string,
  context: CopilotContext,
  patterns: IntentPattern[],
  threshold = ACTION_THRESHOLD,
): ScoredIntent | null {
  const scored = scoreIntents(message, context, patterns)
  const top = scored[0]
  if (!top || top.score < threshold) return null
  return top
}
