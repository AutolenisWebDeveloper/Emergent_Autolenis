/**
 * Affiliate copilot orchestrator.
 * No earnings guarantee language in any response.
 */

import { topIntent } from "../shared/intent-scorer"
import { runComplianceScrub, buildFallbackResponse, validateToolAccess } from "../shared/base-orchestrator"
import type { CopilotContext, CopilotResponse, CopilotRequest } from "../shared/types"
import { AFFILIATE_INTENT_PATTERNS } from "./intents"
import { AFFILIATE_TOOLS, AFFILIATE_INTENT_TO_TOOL } from "./tools"

const AFFILIATE_QUICK_ACTIONS = [
  { label: "Commission structure", message: "How do commissions work?", autoSubmit: true },
  { label: "View my referrals", message: "Show my referrals", autoSubmit: true },
  { label: "Payout history", message: "View my payout history", autoSubmit: true },
]

export async function runAffiliateOrchestrator(
  req: CopilotRequest,
  sessionToken: string,
): Promise<CopilotResponse> {
  const { message, context, confirmedTool } = req

  if (confirmedTool) {
    const tool = AFFILIATE_TOOLS[confirmedTool.toolName]
    if (!tool) return buildFallbackResponse("affiliate", undefined, AFFILIATE_QUICK_ACTIONS)
    const accessError = validateToolAccess(tool, context)
    if (accessError) {
      return { renderState: "text_response", text: runComplianceScrub(accessError), intent: confirmedTool.toolName }
    }
    try {
      const result = await tool.execute(confirmedTool.toolArgs, context, sessionToken)
      return {
        renderState: "action_result",
        actionResult: { ...result, summary: runComplianceScrub(result.summary) },
        intent: confirmedTool.toolName,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong."
      return { renderState: "error", errorMessage: runComplianceScrub(msg), intent: confirmedTool.toolName }
    }
  }

  const matched = topIntent(message, context, AFFILIATE_INTENT_PATTERNS)
  if (!matched) return buildFallbackResponse("affiliate", undefined, AFFILIATE_QUICK_ACTIONS)

  const toolName = AFFILIATE_INTENT_TO_TOOL[matched.name]
  if (!toolName) {
    return {
      renderState: "quick_actions",
      text: "I can help with that. Here are some affiliate tools:",
      quickActions: AFFILIATE_QUICK_ACTIONS,
      intent: matched.name,
    }
  }

  const tool = AFFILIATE_TOOLS[toolName]
  if (!tool) return buildFallbackResponse("affiliate", undefined, AFFILIATE_QUICK_ACTIONS)

  const accessError = validateToolAccess(tool, context)
  if (accessError) {
    return { renderState: "text_response", text: runComplianceScrub(accessError), intent: matched.name }
  }

  try {
    const result = await tool.execute({}, context, sessionToken)
    return {
      renderState: "action_result",
      actionResult: { ...result, summary: runComplianceScrub(result.summary) },
      intent: matched.name,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong."
    return { renderState: "error", errorMessage: runComplianceScrub(msg), intent: matched.name }
  }
}
