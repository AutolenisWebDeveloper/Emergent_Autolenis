/**
 * Public copilot orchestrator.
 *
 * Pipeline: detect intent → select knowledge → compose response → chips → compliance scrub → fallback
 *
 * Hybrid path: deterministic intent scoring first; when score < threshold AND LLM is
 * available, falls back to hybridChat() for intelligent open-ended responses.
 *
 * Public copilot:
 * - No action tools / confirmation dialogs
 * - All responses are informational only
 * - LLM fallback is compliance-scrubbed before returning
 */

import { scoreIntents, ACTION_THRESHOLD } from "../shared/intent-scorer"
import { runComplianceScrub } from "../shared/base-orchestrator"
import type { CopilotContext, CopilotResponse, QuickAction } from "../shared/types"
import { PUBLIC_INTENT_PATTERNS } from "./intents"
import { PUBLIC_KNOWLEDGE } from "./knowledge"
import { isLLMAvailable } from "@/lib/ai/llm-provider"
import { hybridChat } from "@/lib/ai/hybrid-chat"

const PUBLIC_FALLBACK_THRESHOLD = 0.4

export async function runPublicOrchestrator(
  message: string,
  context: CopilotContext,
): Promise<CopilotResponse> {
  // Score all intents
  const scored = scoreIntents(message, context, PUBLIC_INTENT_PATTERNS)
  const top = scored[0]

  // Select knowledge module
  const intentName =
    top && top.score >= PUBLIC_FALLBACK_THRESHOLD ? top.name : "FALLBACK"

  const knowledge = PUBLIC_KNOWLEDGE.find((k) => k.intent === intentName)
    ?? PUBLIC_KNOWLEDGE.find((k) => k.intent === "FALLBACK")!

  // If we have a genuine intent match (not just FALLBACK), return the deterministic response
  if (intentName !== "FALLBACK") {
    const quickActions: QuickAction[] = (knowledge.chips ?? [])
      .slice(0, 3)
      .map((chip) => ({ label: chip, message: chip, autoSubmit: true }))

    const scrubbedText = runComplianceScrub(knowledge.text)

    return {
      renderState: quickActions.length > 0 ? "quick_actions" : "text_response",
      text: scrubbedText,
      quickActions,
      intent: intentName,
    }
  }

  // FALLBACK path: try LLM when available for open-ended / unrecognized queries
  if (isLLMAvailable()) {
    try {
      const llmResult = await hybridChat({
        message,
        variant: "public",
        context,
        route: context.route,
      })
      // hybridChat already applies compliance scrub to LLM output
      return {
        renderState: "text_response",
        text: llmResult.reply,
        intent: llmResult.intent ?? "FALLBACK",
      }
    } catch {
      // LLM errors are already logged inside hybridChat — degrade to deterministic fallback
    }
  }

  // Ultimate deterministic fallback
  const quickActions: QuickAction[] = (knowledge.chips ?? [])
    .slice(0, 3)
    .map((chip) => ({ label: chip, message: chip, autoSubmit: true }))

  const scrubbedText = runComplianceScrub(knowledge.text)

  return {
    renderState: quickActions.length > 0 ? "quick_actions" : "text_response",
    text: scrubbedText,
    quickActions,
    intent: "FALLBACK",
  }
}

// ---------------------------------------------------------------------------
// Re-export unused import for existing consumers that reference ACTION_THRESHOLD
// ---------------------------------------------------------------------------
export { ACTION_THRESHOLD }
