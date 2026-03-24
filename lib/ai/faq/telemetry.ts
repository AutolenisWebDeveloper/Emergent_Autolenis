/**
 * FAQ Telemetry – tracks intent hits, CTA interactions, and conversions.
 *
 * In-memory event store with optional database persistence.
 * Provides aggregation helpers for intent usage, CTA click-through,
 * deflection, and escalation rates.
 */

import type { FAQTelemetryEvent, FAQCategory } from "./types"

// ---------------------------------------------------------------------------
// Event store (in-memory — mirrors orchestrator audit log pattern)
// ---------------------------------------------------------------------------

const eventLog: FAQTelemetryEvent[] = []

/**
 * Record a telemetry event.
 */
export function trackFAQEvent(event: FAQTelemetryEvent): void {
  eventLog.push(event)
}

/**
 * Get all recorded telemetry events.
 */
export function getFAQEvents(): readonly FAQTelemetryEvent[] {
  return eventLog
}

/**
 * Clear all telemetry events (for testing).
 */
export function clearFAQEvents(): void {
  eventLog.length = 0
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Track an intent recognition event.
 */
export function trackIntentRecognized(
  intentId: string,
  category: FAQCategory,
  confidence: number,
  userId: string | null,
  workspaceId: string | null,
): void {
  trackFAQEvent({
    type: "intent_recognized",
    intentId,
    category,
    confidence,
    ctaLabel: null,
    timestamp: Date.now(),
    userId,
    workspaceId,
  })
}

/**
 * Track a CTA shown event.
 */
export function trackCTAShown(
  intentId: string,
  category: FAQCategory,
  confidence: number,
  ctaLabel: string,
  userId: string | null,
  workspaceId: string | null,
): void {
  trackFAQEvent({
    type: "cta_shown",
    intentId,
    category,
    confidence,
    ctaLabel,
    timestamp: Date.now(),
    userId,
    workspaceId,
  })
}

/**
 * Track a CTA click event.
 */
export function trackCTAClicked(
  intentId: string,
  category: FAQCategory,
  confidence: number,
  ctaLabel: string,
  userId: string | null,
  workspaceId: string | null,
): void {
  trackFAQEvent({
    type: "cta_clicked",
    intentId,
    category,
    confidence,
    ctaLabel,
    timestamp: Date.now(),
    userId,
    workspaceId,
  })
}

// ---------------------------------------------------------------------------
// Aggregation for dashboards
// ---------------------------------------------------------------------------

export interface FAQMetrics {
  totalIntentHits: number
  totalCTAShown: number
  totalCTAClicked: number
  ctaClickThroughRate: number
  totalEscalations: number
  escalationRate: number
  hitsByCategory: Record<string, number>
  hitsByIntent: Record<string, number>
}

/**
 * Compute aggregate FAQ metrics from the event log.
 */
export function computeFAQMetrics(): FAQMetrics {
  const hits = eventLog.filter((e) => e.type === "intent_recognized")
  const shown = eventLog.filter((e) => e.type === "cta_shown")
  const clicked = eventLog.filter((e) => e.type === "cta_clicked")
  const escalations = eventLog.filter((e) => e.type === "escalation")

  const hitsByCategory: Record<string, number> = {}
  const hitsByIntent: Record<string, number> = {}

  for (const event of hits) {
    hitsByCategory[event.category] = (hitsByCategory[event.category] ?? 0) + 1
    hitsByIntent[event.intentId] = (hitsByIntent[event.intentId] ?? 0) + 1
  }

  return {
    totalIntentHits: hits.length,
    totalCTAShown: shown.length,
    totalCTAClicked: clicked.length,
    ctaClickThroughRate: shown.length > 0 ? clicked.length / shown.length : 0,
    totalEscalations: escalations.length,
    escalationRate: hits.length > 0 ? escalations.length / hits.length : 0,
    hitsByCategory,
    hitsByIntent,
  }
}
