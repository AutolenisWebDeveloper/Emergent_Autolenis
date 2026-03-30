/**
 * Compliance scrub engine for AutoLenis copilot responses.
 *
 * - Strips prohibited financial / legal promise language
 * - Blocks raw DealStage enum values from user-facing text
 * - Maps HTTP error codes to user-safe messages
 */

// ---------------------------------------------------------------------------
// Prohibited patterns
// ---------------------------------------------------------------------------

interface ProhibitedPattern {
  pattern: RegExp
  replacement: string
}

/**
 * Loan / approval promise language and raw DealStage enum values that
 * must never appear in any copilot response.
 */
const PROHIBITED_PATTERNS: ProhibitedPattern[] = [
  // Loan approval language — more specific patterns first, then general
  { pattern: /\byou('re| are) (pre-?)?approved for (a |the )?(loan|financing|credit)\b/gi, replacement: "you may qualify for financing review" },
  { pattern: /\byou('re| are) (pre-?)?approved\b/gi, replacement: "you may qualify" },
  { pattern: /\bguaranteed (approval|financing|loan)\b/gi, replacement: "potential financing options" },
  { pattern: /\bapproved for (a |the )?(loan|financing|credit)\b/gi, replacement: "qualified for financing review" },
  { pattern: /\bwe('ll| will) approve\b/gi, replacement: "we will review" },
  { pattern: /\bcredit (is |will be )?approved\b/gi, replacement: "credit review is in progress" },
  { pattern: /\byour (loan|financing) is approved\b/gi, replacement: "your financing review is in progress" },
  { pattern: /\binstant (approval|credit|loan)\b/gi, replacement: "financing review" },
  { pattern: /\bno credit check\b/gi, replacement: "our financing process" },
  { pattern: /\b100% approval\b/gi, replacement: "financing options" },
  // Income guarantee language — specific first, then catch-all "guaranteed"
  { pattern: /\byou('ll| will) (earn|make|receive) \$[\d,]+\b/gi, replacement: "commissions vary" },
  { pattern: /\bearnings (are )?guaranteed\b/gi, replacement: "commissions are activity-based" },
  { pattern: /\bguaranteed (income|earnings|commissions?|payout)\b/gi, replacement: "activity-based commissions" },
  // Catch-all "guaranteed" in financial contexts — require only whitespace between dollar amount and "guaranteed"
  { pattern: /\$[\d,.]+\s+guaranteed\b/gi, replacement: "activity-based commissions" },
  { pattern: /\bguaranteed\b/gi, replacement: "activity-based" },
  // Raw DealStage enum values — block uppercase_underscore stage codes
  {
    pattern: /\b(SELECTED|FINANCING_PENDING|FINANCING_APPROVED|FEE_PENDING|FEE_PAID|INSURANCE_PENDING|INSURANCE_COMPLETE|CONTRACT_PENDING|CONTRACT_REVIEW|CONTRACT_MANUAL_REVIEW_REQUIRED|CONTRACT_INTERNAL_FIX_IN_PROGRESS|CONTRACT_ADMIN_OVERRIDE_APPROVED|CONTRACT_APPROVED|SIGNING_PENDING|SIGNED|PICKUP_SCHEDULED|COMPLETED|CANCELLED)\b/g,
    replacement: "[deal status]",
  },
]

// ---------------------------------------------------------------------------
// Safe replacements map (for explicit substitution in orchestrators)
// ---------------------------------------------------------------------------

export const SAFE_REPLACEMENTS: Record<string, string> = {
  "approved for a loan": "qualified for financing review",
  "guaranteed approval": "potential financing options",
  "you're pre-approved": "you may qualify",
  "instant approval": "financing review",
  "no credit check": "our financing process",
  "100% approval": "financing options",
  "earnings guaranteed": "commissions are activity-based",
  "guaranteed income": "activity-based commissions",
}

// ---------------------------------------------------------------------------
// HTTP error messages
// ---------------------------------------------------------------------------

export const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: "That request wasn't quite right. Please check your details and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you're looking for.",
  409: "There's a conflict with your current status. Please refresh and try again.",
  422: "Some details couldn't be processed. Please review and resubmit.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again in a few moments.",
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply all prohibited pattern scrubs to a response string.
 * Returns the scrubbed string.
 */
export function scrubResponse(text: string): string {
  let result = text
  for (const { pattern, replacement } of PROHIBITED_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * Map an HTTP status code to a user-safe error message.
 * Falls back to a generic message for unmapped codes.
 */
export function mapHttpError(status: number, context?: string): string {
  const base = HTTP_ERROR_MESSAGES[status] ?? "Something went wrong. Please try again."
  return context ? `${base} (${context})` : base
}
