/**
 * Admin copilot orchestrator.
 *
 * - Uses lib/admin-auth.ts session (NOT lib/auth.ts JWT)
 * - MFA required — sessions without mfaVerified = true are rejected
 * - All actions logged to compliance event ledger
 */

import { topIntent } from "../shared/intent-scorer"
import { runComplianceScrub, buildFallbackResponse, validateToolAccess } from "../shared/base-orchestrator"
import type { CopilotContext, CopilotResponse, CopilotRequest } from "../shared/types"
import { ADMIN_INTENT_PATTERNS } from "./intents"
import { ADMIN_TOOLS, ADMIN_INTENT_TO_TOOL, logAdminCopilotAction } from "./tools"

const ADMIN_QUICK_ACTIONS = [
  { label: "Look up a deal", message: "Look up a deal by ID", autoSubmit: false },
  { label: "Find stuck deals", message: "Show me stuck deals", autoSubmit: true },
  { label: "Finance report", message: "Show finance report", autoSubmit: true },
]

export async function runAdminOrchestrator(
  req: CopilotRequest,
  actorId: string,
  sessionToken: string,
): Promise<CopilotResponse> {
  const { message, context, confirmedTool } = req

  if (confirmedTool) {
    const tool = ADMIN_TOOLS[confirmedTool.toolName]
    if (!tool) return buildFallbackResponse("admin", "That action is not available.", ADMIN_QUICK_ACTIONS)
    const accessError = validateToolAccess(tool, context)
    if (accessError) {
      return { renderState: "text_response", text: runComplianceScrub(accessError), intent: confirmedTool.toolName }
    }
    logAdminCopilotAction(actorId, confirmedTool.toolName, context.route)
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

  const matched = topIntent(message, context, ADMIN_INTENT_PATTERNS)
  if (!matched) return buildFallbackResponse("admin", undefined, ADMIN_QUICK_ACTIONS)

  const toolName = ADMIN_INTENT_TO_TOOL[matched.name]
  if (!toolName) {
    return {
      renderState: "quick_actions",
      text: "I can help with that. Here are some admin tools:",
      quickActions: ADMIN_QUICK_ACTIONS,
      intent: matched.name,
    }
  }

  const tool = ADMIN_TOOLS[toolName]
  if (!tool) return buildFallbackResponse("admin", undefined, ADMIN_QUICK_ACTIONS)

  const accessError = validateToolAccess(tool, context)
  if (accessError) {
    return { renderState: "text_response", text: runComplianceScrub(accessError), intent: matched.name }
  }

  logAdminCopilotAction(actorId, matched.name, context.route)

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
