/**
 * Dealer copilot orchestrator.
 */

import { topIntent } from "../shared/intent-scorer"
import { runComplianceScrub, buildFallbackResponse, validateToolAccess } from "../shared/base-orchestrator"
import type { CopilotContext, CopilotResponse, CopilotRequest } from "../shared/types"
import { DEALER_INTENT_PATTERNS } from "./intents"
import { DEALER_TOOLS, DEALER_INTENT_TO_TOOL } from "./tools"

const DEALER_QUICK_ACTIONS = [
  { label: "View active auctions", message: "Show active auctions", autoSubmit: true },
  { label: "View my inventory", message: "View my inventory", autoSubmit: true },
  { label: "Submit an offer", message: "I want to submit an offer", autoSubmit: true },
]

export async function runDealerOrchestrator(
  req: CopilotRequest,
  sessionToken: string,
): Promise<CopilotResponse> {
  const { message, context, confirmedTool } = req

  // Handle confirmed tool execution
  if (confirmedTool) {
    const tool = DEALER_TOOLS[confirmedTool.toolName]
    if (!tool) {
      return buildFallbackResponse("dealer", "That action is not available.", DEALER_QUICK_ACTIONS)
    }
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

  const matched = topIntent(message, context, DEALER_INTENT_PATTERNS)
  if (!matched) {
    return buildFallbackResponse("dealer", undefined, DEALER_QUICK_ACTIONS)
  }

  const toolName = DEALER_INTENT_TO_TOOL[matched.name]
  if (!toolName) {
    return {
      renderState: "quick_actions",
      text: "I can help with that. Here are some things I can do for you:",
      quickActions: DEALER_QUICK_ACTIONS,
      intent: matched.name,
    }
  }

  const tool = DEALER_TOOLS[toolName]
  if (!tool) {
    return buildFallbackResponse("dealer", undefined, DEALER_QUICK_ACTIONS)
  }

  const accessError = validateToolAccess(tool, context)
  if (accessError) {
    return { renderState: "text_response", text: runComplianceScrub(accessError), intent: matched.name }
  }

  if (tool.requiresConfirmation) {
    return {
      renderState: "confirmation",
      intent: matched.name,
      confirmation: {
        title: `Confirm: ${tool.description}`,
        description: "Are you sure you want to proceed?",
        confirmLabel: "Yes, proceed",
        cancelLabel: "Cancel",
        toolName,
        toolArgs: {},
      },
    }
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
