/**
 * Phase 12 — System Operations Types
 *
 * Canonical type definitions for production hardening:
 * health checks, job runs, incidents, rate limits, and config registry.
 */

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

export type HealthCheckStatus = "PASS" | "WARN" | "FAIL"

export interface SystemHealthCheck {
  id: string
  checkKey: string
  status: HealthCheckStatus
  message: string | null
  payload: Record<string, unknown>
  checkedAt: string
  createdAt: string
}

export interface HealthCheckInput {
  checkKey: string
  status: HealthCheckStatus
  message?: string
  payload?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Job Run
// ---------------------------------------------------------------------------

export type JobRunType = "CRON" | "MAINTENANCE" | "ANALYTICS" | "SCRAPER" | "MANUAL"

export type JobRunStatus = "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED"

export interface SystemJobRun {
  id: string
  jobKey: string
  runType: JobRunType
  status: JobRunStatus
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  payload: Record<string, unknown>
  errorMessage: string | null
  createdAt: string
}

export interface StartJobRunInput {
  jobKey: string
  runType?: JobRunType
  payload?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Incident
// ---------------------------------------------------------------------------

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED"

export interface SystemIncident {
  id: string
  incidentKey: string
  severity: IncidentSeverity
  status: IncidentStatus
  title: string
  description: string | null
  payload: Record<string, unknown>
  openedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OpenIncidentInput {
  incidentKey: string
  severity: IncidentSeverity
  title: string
  description?: string
  payload?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Rate Limit
// ---------------------------------------------------------------------------

export interface SystemRateLimit {
  id: string
  limitKey: string
  isActive: boolean
  maxPerHour: number | null
  maxPerDay: number | null
  maxConcurrent: number | null
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Config Registry
// ---------------------------------------------------------------------------

export interface SystemConfigEntry {
  id: string
  configKey: string
  environment: string
  isRequired: boolean
  category: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ConfigValidationResult {
  configKey: string
  isRequired: boolean
  isPresent: boolean
  category: string
}
