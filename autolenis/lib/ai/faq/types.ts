/**
 * Buyer FAQ Intent Pack – shared types.
 *
 * Used by the intent matcher, CTA resolver, telemetry, and UI components.
 */

// ---------------------------------------------------------------------------
// Intent taxonomy categories
// ---------------------------------------------------------------------------

export type FAQCategory =
  | "VALUE"
  | "FEES"
  | "FLOW"
  | "OFFERS"
  | "CONTRACT_SHIELD"
  | "CLOSE"

// ---------------------------------------------------------------------------
// Intent definition (mirrors buyer_faq_intents.v1.json schema)
// ---------------------------------------------------------------------------

export interface FAQIntent {
  id: string
  category: FAQCategory
  title: string
  user_questions: string[]
  answer_markdown: string
  cta: {
    type: "PRIMARY_NEXT_STEP"
    label: string
  }
  disclosure: string | null
  tags: string[]
  version: string
}

export interface FAQIntentPack {
  pack: string
  version: string
  intents: FAQIntent[]
}

// ---------------------------------------------------------------------------
// Intent match result
// ---------------------------------------------------------------------------

export interface IntentMatchResult {
  intentId: string
  confidence: number
  category: FAQCategory
  intent: FAQIntent
}

// ---------------------------------------------------------------------------
// Buyer context for CTA resolution
// ---------------------------------------------------------------------------

export type StepStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "APPROVED"
  | "READY"
  | "ACTIVE"
  | "NONE"
  | "NOT_UPLOADED"
  | "REJECT"
  | "MANUAL_REVIEW"
  | "PASS"
  | "SIGNED"
  | "SCHEDULED"
  | "COMPLETED"

export interface BuyerContext {
  prequal: { status: StepStatus }
  shortlist: { count: number }
  auction: { status: StepStatus }
  offers: { status: StepStatus }
  selectedDeal: { status: StepStatus }
  contractShield: { status: StepStatus }
  esign: { status: StepStatus }
  pickup: { status: StepStatus }
}

// ---------------------------------------------------------------------------
// Resolved CTA
// ---------------------------------------------------------------------------

export interface ResolvedCTA {
  label: string
  actionType: string
  payload: Record<string, unknown>
  isEnabled: boolean
  disabledReason: string | null
}

// ---------------------------------------------------------------------------
// FAQ card data (passed to UI)
// ---------------------------------------------------------------------------

export interface FAQCardData {
  intentId: string
  category: FAQCategory
  title: string
  answerMarkdown: string
  cta: ResolvedCTA
  disclosure: string | null
  confidence: number
}

// ---------------------------------------------------------------------------
// Telemetry event
// ---------------------------------------------------------------------------

export interface FAQTelemetryEvent {
  type:
    | "intent_recognized"
    | "cta_shown"
    | "cta_clicked"
    | "action_success"
    | "action_failure"
    | "escalation"
  intentId: string
  category: FAQCategory
  confidence: number
  ctaLabel: string | null
  timestamp: number
  userId: string | null
  workspaceId: string | null
}
