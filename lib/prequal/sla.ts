// SLA rule definitions and escalation logic for the prequal queue

import { SLA_THRESHOLDS } from "./constants"

/**
 * Returns true if an application's iPredict step is past the SLA timeout.
 */
export function isIpredictSlaBreached(ipredictStartedAt: Date): boolean {
  const cutoff = new Date(Date.now() - SLA_THRESHOLDS.IPREDICT_TIMEOUT_HOURS * 60 * 60 * 1000)
  return ipredictStartedAt < cutoff
}

/**
 * Returns true if a manual review application has been waiting too long.
 */
export function isManualReviewSlaBreached(manualReviewStartedAt: Date): boolean {
  const cutoff = new Date(Date.now() - SLA_THRESHOLDS.MANUAL_REVIEW_ESCALATION_HOURS * 60 * 60 * 1000)
  return manualReviewStartedAt < cutoff
}

/**
 * Returns true if an in-progress application should be marked stale.
 */
export function isApplicationStale(lastActivityAt: Date): boolean {
  const cutoff = new Date(Date.now() - SLA_THRESHOLDS.STALE_APPLICATION_HOURS * 60 * 60 * 1000)
  return lastActivityAt < cutoff
}

/**
 * Returns the expiry date for a new prequal application.
 */
export function getApplicationExpiryDate(): Date {
  const expiryMs = SLA_THRESHOLDS.EXPIRY_DAYS * 24 * 60 * 60 * 1000
  return new Date(Date.now() + expiryMs)
}
