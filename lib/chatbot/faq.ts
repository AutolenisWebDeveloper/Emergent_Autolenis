/**
 * Chatbot FAQ — public API for the local Lenis Concierge chatbot.
 *
 * Re-exports the core types, handler, and matcher so consumers
 * only need to import from `@/lib/chatbot/faq`.
 */

export { processMessage, matchIntent, matchIntentTopN, categoryForRoute } from "./matcher"
export type { ChatbotResponse, MatchResult } from "./matcher"
export {
  INTENTS,
  FALLBACK_RESPONSE,
  FALLBACK_CHIPS,
} from "./intents"
export type {
  ChatbotIntent,
  SuggestedChip,
  IntentCategory,
} from "./intents"
