/**
 * Buyer copilot orchestrator.
 *
 * Pipeline:
 * 1. Authenticate buyer role
 * 2. Greeting detection
 * 3. Frustration detection
 * 4. Score intents
 * 5. If tool requires confirmation → return confirmation render state
 * 6. If confirmed tool → execute
 * 7. LLM fallback for unrecognized queries
 * 8. Compliance scrub all text
 */

import { topIntent } from "../shared/intent-scorer"
import { runComplianceScrub, buildFallbackResponse, validateToolAccess, detectFrustration, detectGreeting, getBuyerStageActions } from "../shared/base-orchestrator"
import type { CopilotContext, CopilotResponse, CopilotRequest } from "../shared/types"
import { BUYER_INTENT_PATTERNS } from "./intents"
import { BUYER_TOOLS, INTENT_TO_TOOL } from "./tools"
import { isLLMAvailable } from "@/lib/ai/llm-provider"
import { hybridChat } from "@/lib/ai/hybrid-chat"

const BUYER_QUICK_ACTIONS = [
  { label: "Check deal status", message: "What is my deal status?", autoSubmit: true },
  { label: "View my offers", message: "Show my vehicle offers", autoSubmit: true },
  { label: "Pay concierge fee", message: "How do I pay my concierge fee?", autoSubmit: true },
]

export async function runBuyerOrchestrator(
  req: CopilotRequest,
  sessionToken: string,
): Promise<CopilotResponse> {
  const { message, context, confirmedTool, history } = req

  // Handle confirmed tool execution
  if (confirmedTool) {
    const tool = BUYER_TOOLS[confirmedTool.toolName]
    if (!tool) {
      return buildFallbackResponse("buyer", "That action is not available. Please try again.", BUYER_QUICK_ACTIONS)
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
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again."
      return { renderState: "error", errorMessage: runComplianceScrub(msg), intent: confirmedTool.toolName }
    }
  }

  // Greeting detection — respond with stage-aware context
  const greetingReply = detectGreeting(message, "buyer")
  if (greetingReply) {
    const stageActions = getBuyerStageActions(context.dealStage)
    return {
      renderState: "quick_actions",
      text: greetingReply,
      quickActions: stageActions.slice(0, 3),
      intent: "GREETING",
    }
  }

  // Check for frustration → route to support
  if (detectFrustration(message, history)) {
    return {
      renderState: "text_response",
      text: "I'm sorry you're having trouble. Our support team can help resolve this quickly. Would you like me to connect you with support?",
      quickActions: [
        { label: "Contact support", message: "Contact support", autoSubmit: true },
        { label: "Try again", message: "Let me try again", autoSubmit: true },
      ],
      intent: "FRUSTRATION",
    }
  }

  // Score intents
  const matched = topIntent(message, context, BUYER_INTENT_PATTERNS)

  if (!matched) {
    // Try LLM fallback for unrecognized queries
    if (isLLMAvailable()) {
      try {
        const llmResult = await hybridChat({
          message,
          variant: "buyer",
          context,
          history,
          route: context.route,
        })
        return {
          renderState: "text_response",
          text: llmResult.reply,
          intent: llmResult.intent ?? "FALLBACK",
        }
      } catch (err) {
        // LLM errors — log and degrade to deterministic fallback
        console.error("[buyerOrchestrator] LLM fallback error:", err)
      }
    }
    return buildFallbackResponse("buyer", undefined, BUYER_QUICK_ACTIONS)
  }

  // Find associated tool
  const toolName = INTENT_TO_TOOL[matched.name]
  if (!toolName) {
    // Information-only intent — provide contextual response
    const stageActions = getBuyerStageActions(context.dealStage)
    return {
      renderState: "quick_actions",
      text: runComplianceScrub(`I can help you with that. Here are some related actions:`),
      quickActions: stageActions.slice(0, 3),
      intent: matched.name,
    }
  }

  const tool = BUYER_TOOLS[toolName]
  if (!tool) {
    return buildFallbackResponse("buyer", undefined, BUYER_QUICK_ACTIONS)
  }

  // Validate access
  const accessError = validateToolAccess(tool, context)
  if (accessError) {
    return { renderState: "text_response", text: runComplianceScrub(accessError), intent: matched.name }
  }

  // Return confirmation if required
  if (tool.requiresConfirmation) {
    const confirmationMessages: Record<string, { title: string; description: string }> = {
      pay_deposit: {
        title: "Pay $99 Refundable Deposit",
        description: "This will start your Stripe checkout for the $99 refundable deposit. Continue?",
      },
      pay_concierge_fee: {
        title: "Pay $499 Concierge Fee",
        description: "This will start your Stripe checkout for the $499 concierge fee. Continue?",
      },
      include_fee_in_loan: {
        title: "Include Fee in Financing",
        description: "This will take you to the page to roll the $499 concierge fee into your financing. Continue?",
      },
    }
    const confirmInfo = confirmationMessages[toolName] ?? {
      title: `Confirm: ${tool.description}`,
      description: "Are you sure you want to proceed?",
    }
    return {
      renderState: "confirmation",
      intent: matched.name,
      confirmation: {
        title: confirmInfo.title,
        description: confirmInfo.description,
        confirmLabel: "Yes, proceed",
        cancelLabel: "Cancel",
        toolName,
        toolArgs: {},
      },
    }
  }

  // Execute non-confirmation tools inline
  try {
    const result = await tool.execute({}, context, sessionToken)
    return {
      renderState: "action_result",
      actionResult: { ...result, summary: runComplianceScrub(result.summary) },
      intent: matched.name,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong. Please try again."
    return { renderState: "error", errorMessage: runComplianceScrub(msg), intent: matched.name }
  }
}
