// AutoLenis Prequalification — Constants and Configuration

export const PREQUAL_SESSION_COOKIE = "al_prequal_session"
export const PREQUAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Shopping pass validity
export const SHOPPING_PASS_VALIDITY_DAYS = 30

// SLA thresholds (hours)
export const SLA_THRESHOLDS = {
  IPREDICT_TIMEOUT_HOURS: 1,
  MANUAL_REVIEW_ESCALATION_HOURS: 24,
  STALE_APPLICATION_HOURS: 72,
  EXPIRY_DAYS: 30,
} as const

// IBV
export const IBV_SESSION_TIMEOUT_HOURS = 48
export const IBV_REMINDER_DELAY_HOURS = 24

// Loan parameters for shopping range calculator
export const LOAN_DEFAULTS = {
  TERM_MONTHS: 72,
  BASE_RATE_PASS: 0.0799,        // 7.99% APR for PASS band
  BASE_RATE_BORDERLINE: 0.1299,  // 12.99% APR for BORDERLINE band
  DEBT_TO_INCOME_MAX: 0.45,      // 45% DTI cap
  MONTHLY_PAYMENT_FLOOR_CENTS: 20000, // $200/month minimum
  SHOPPING_RANGE_ROUNDING_INCREMENT_CENTS: 50000, // Round to nearest $500
} as const

// Hard-fail reasons for iPredict scoring
export const HARD_FAIL_REASONS = {
  BANKRUPTCY: "BANKRUPTCY",
  OFAC_HIT: "OFAC_HIT",
  FRAUD_ALERT: "FRAUD_ALERT",
  DECEASED_SSN: "DECEASED_SSN",
  EXCESSIVE_BAD_LOANS: "EXCESSIVE_BAD_LOANS",
  DDA_FRAUD: "DDA_FRAUD",
  VENDOR_DECLINE: "VENDOR_DECLINE",
} as const

// iPredict score thresholds
export const IPREDICT_THRESHOLDS = {
  PASS_MIN: 600,
  BORDERLINE_MIN: 500,
  // Below BORDERLINE_MIN = FAIL
} as const

// Cron job secrets
export const CRON_ROUTES = {
  SLA_ESCALATION: "/api/cron/prequal/sla-escalation",
  STALE_CLEANUP: "/api/cron/prequal/stale-cleanup",
  IBV_REMINDERS: "/api/cron/prequal/ibv-reminders",
} as const
