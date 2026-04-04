/**
 * FAQ module — public API.
 *
 * Re-exports the intent matcher, CTA resolver, telemetry, and types
 * for use by the orchestrator, UI components, and API routes.
 */

export { matchIntent, matchIntentTopN, getIntentById, getIntentsByCategory, FAQ_PACK_VERSION } from "./intent-matcher"
export { resolvePrimaryCTA, buildFAQCard, DEFAULT_BUYER_CONTEXT } from "./cta-resolver"
export {
  trackFAQEvent,
  getFAQEvents,
  clearFAQEvents,
  trackIntentRecognized,
  trackCTAShown,
  trackCTAClicked,
  computeFAQMetrics,
} from "./telemetry"
export type {
  FAQCategory,
  FAQIntent,
  FAQIntentPack,
  IntentMatchResult,
  BuyerContext,
  ResolvedCTA,
  FAQCardData,
  FAQTelemetryEvent,
  StepStatus,
} from "./types"
export type { FAQMetrics } from "./telemetry"
