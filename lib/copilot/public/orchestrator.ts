/**
 * Public copilot orchestrator.
 *
 * Pipeline: detect intent → select knowledge → compose response → chips → compliance scrub → fallback
 *
 * Public copilot:
 * - Makes NO API calls
 * - No action tools / confirmation dialogs
 * - All responses are informational only
 */

import { scoreIntents, ACTION_THRESHOLD } from "../shared/intent-scorer"
import { runComplianceScrub } from "../shared/base-orchestrator"
import type { CopilotContext, CopilotResponse, QuickAction } from "../shared/types"
import { PUBLIC_INTENT_PATTERNS } from "./intents"
import { PUBLIC_KNOWLEDGE } from "./knowledge"

const PUBLIC_FALLBACK_THRESHOLD = 0.4

export function runPublicOrchestrator(
  message: string,
  context: CopilotContext,
): CopilotResponse {
  // Score all intents
  const scored = scoreIntents(message, context, PUBLIC_INTENT_PATTERNS)
  const top = scored[0]

  // Select knowledge module
  const intentName =
    top && top.score >= PUBLIC_FALLBACK_THRESHOLD ? top.name : "FALLBACK"

  const knowledge = PUBLIC_KNOWLEDGE.find((k) => k.intent === intentName)
    ?? PUBLIC_KNOWLEDGE.find((k) => k.intent === "FALLBACK")!

  // Build quick actions from chips (max 3)
  const quickActions: QuickAction[] = (knowledge.chips ?? [])
    .slice(0, 3)
    .map((chip) => ({ label: chip, message: chip, autoSubmit: true }))

  // Compose and scrub
  const scrubbedText = runComplianceScrub(knowledge.text)

  return {
    renderState: quickActions.length > 0 ? "quick_actions" : "text_response",
    text: scrubbedText,
    quickActions,
    intent: intentName,
  }
}
