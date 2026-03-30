/**
 * AI Kill-Switch — global and per-user AI disable flags.
 *
 * Moved out of gemini-client.ts so the orchestrator can use these
 * checks without depending on a specific AI provider.
 */

/** Global kill-switch — when truthy, AI responses are disabled. */
export function isAIDisabled(): boolean {
  const flag = process.env.AI_ACTIONS_DISABLED
  return flag === "true" || flag === "1"
}

/**
 * Check if AI has been disabled for a specific user.
 * Currently a stub implementation that always returns false.
 * Can be extended to check a database flag or admin configuration.
 *
 * @param _userId - The user ID to check (will be used in future implementation)
 */
export function isAIDisabledForUser(_userId: string | null): boolean {
  return false
}
