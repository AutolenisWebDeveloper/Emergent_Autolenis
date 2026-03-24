/**
 * Phase 12 — System Operations Service
 *
 * Production hardening service for health checks, job runs,
 * incidents, rate limits, and config validation.
 *
 * Uses Supabase service-role client for trusted server-side access.
 * Falls back to in-memory storage when DB is unavailable (tests).
 */

import type {
  HealthCheckInput,
  HealthCheckStatus,
  SystemHealthCheck,
  StartJobRunInput,
  SystemJobRun,
  JobRunStatus,
  OpenIncidentInput,
  SystemIncident,
  IncidentStatus,
  SystemRateLimit,
  SystemConfigEntry,
  ConfigValidationResult,
} from "./types"

// ---------------------------------------------------------------------------
// Supabase Client Access
// ---------------------------------------------------------------------------

function getSupabaseClient(): any | null {
  try {
    const { getSupabase } = require("@/lib/db")
    return getSupabase()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// In-Memory Stores (fallback for tests / when DB is unavailable)
// ---------------------------------------------------------------------------

let healthCheckStore: SystemHealthCheck[] = []
let jobRunStore: SystemJobRun[] = []
let incidentStore: SystemIncident[] = []
let rateLimitStore: SystemRateLimit[] = []
let configStore: SystemConfigEntry[] = []

export function resetSystemStores(): void {
  healthCheckStore = []
  jobRunStore = []
  incidentStore = []
  rateLimitStore = []
  configStore = []
}

export function getHealthCheckStore(): ReadonlyArray<SystemHealthCheck> {
  return healthCheckStore
}

export function getJobRunStore(): ReadonlyArray<SystemJobRun> {
  return jobRunStore
}

export function getIncidentStore(): ReadonlyArray<SystemIncident> {
  return incidentStore
}

// ---------------------------------------------------------------------------
// Health Checks
// ---------------------------------------------------------------------------

export function recordHealthCheck(input: HealthCheckInput): SystemHealthCheck {
  if (!input.checkKey) throw new Error("checkKey is required")
  if (!input.status) throw new Error("status is required")

  const validStatuses: HealthCheckStatus[] = ["PASS", "WARN", "FAIL"]
  if (!validStatuses.includes(input.status)) {
    throw new Error(`Invalid status: ${input.status}`)
  }

  const now = new Date().toISOString()
  const check: SystemHealthCheck = {
    id: crypto.randomUUID(),
    checkKey: input.checkKey,
    status: input.status,
    message: input.message ?? null,
    payload: input.payload ?? {},
    checkedAt: now,
    createdAt: now,
  }

  healthCheckStore.push(check)
  return check
}

export async function recordHealthCheckAsync(
  input: HealthCheckInput
): Promise<SystemHealthCheck> {
  if (!input.checkKey) throw new Error("checkKey is required")
  if (!input.status) throw new Error("status is required")

  const validStatuses: HealthCheckStatus[] = ["PASS", "WARN", "FAIL"]
  if (!validStatuses.includes(input.status)) {
    throw new Error(`Invalid status: ${input.status}`)
  }

  const db = getSupabaseClient()
  if (!db) return recordHealthCheck(input)

  const { data, error } = await db
    .from("system_health_checks")
    .insert({
      check_key: input.checkKey,
      status: input.status,
      message: input.message ?? null,
      payload: input.payload ?? {},
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to record health check: ${error.message}`)
  return mapHealthCheck(data)
}

export async function getLatestHealthChecks(): Promise<SystemHealthCheck[]> {
  const db = getSupabaseClient()
  if (!db) {
    // Walk in reverse so the last-inserted check per key wins
    const latest = new Map<string, SystemHealthCheck>()
    for (let i = healthCheckStore.length - 1; i >= 0; i--) {
      const check = healthCheckStore[i]!
      if (!latest.has(check.checkKey)) {
        latest.set(check.checkKey, check)
      }
    }
    return Array.from(latest.values())
  }

  const { data, error } = await db
    .from("system_health_checks")
    .select("*")
    .order("checked_at", { ascending: false })
    .limit(100)

  if (error) throw new Error(`Failed to get health checks: ${error.message}`)

  const latest = new Map<string, SystemHealthCheck>()
  for (const row of data ?? []) {
    const check = mapHealthCheck(row)
    if (!latest.has(check.checkKey)) {
      latest.set(check.checkKey, check)
    }
  }
  return Array.from(latest.values())
}

// ---------------------------------------------------------------------------
// Job Runs
// ---------------------------------------------------------------------------

export function startJobRun(input: StartJobRunInput): SystemJobRun {
  if (!input.jobKey) throw new Error("jobKey is required")

  const now = new Date().toISOString()
  const run: SystemJobRun = {
    id: crypto.randomUUID(),
    jobKey: input.jobKey,
    runType: input.runType ?? "CRON",
    status: "RUNNING",
    startedAt: now,
    finishedAt: null,
    durationMs: null,
    payload: input.payload ?? {},
    errorMessage: null,
    createdAt: now,
  }

  jobRunStore.push(run)
  return run
}

export async function startJobRunAsync(
  input: StartJobRunInput
): Promise<SystemJobRun> {
  if (!input.jobKey) throw new Error("jobKey is required")

  const db = getSupabaseClient()
  if (!db) return startJobRun(input)

  const { data, error } = await db
    .from("system_job_runs")
    .insert({
      job_key: input.jobKey,
      run_type: input.runType ?? "CRON",
      status: "RUNNING",
      payload: input.payload ?? {},
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to start job run: ${error.message}`)
  return mapJobRun(data)
}

export function completeJobRun(
  runId: string,
  status: JobRunStatus,
  errorMessage?: string
): SystemJobRun | null {
  const run = jobRunStore.find((r) => r.id === runId)
  if (!run) return null

  const now = new Date().toISOString()
  run.status = status
  run.finishedAt = now
  run.durationMs = new Date(now).getTime() - new Date(run.startedAt).getTime()
  run.errorMessage = errorMessage ?? null

  return run
}

export async function completeJobRunAsync(
  runId: string,
  status: JobRunStatus,
  errorMessage?: string
): Promise<SystemJobRun | null> {
  const db = getSupabaseClient()
  if (!db) return completeJobRun(runId, status, errorMessage)

  const now = new Date().toISOString()
  const { data: existing } = await db
    .from("system_job_runs")
    .select("started_at")
    .eq("id", runId)
    .single()

  if (!existing) return null

  const durationMs =
    new Date(now).getTime() - new Date(existing.started_at).getTime()

  const { data, error } = await db
    .from("system_job_runs")
    .update({
      status,
      finished_at: now,
      duration_ms: durationMs,
      error_message: errorMessage ?? null,
    })
    .eq("id", runId)
    .select()
    .single()

  if (error) throw new Error(`Failed to complete job run: ${error.message}`)
  return mapJobRun(data)
}

export async function getRecentJobRuns(
  jobKey?: string,
  limit = 20
): Promise<SystemJobRun[]> {
  const db = getSupabaseClient()
  if (!db) {
    let runs = [...jobRunStore]
    if (jobKey) runs = runs.filter((r) => r.jobKey === jobKey)
    // Reverse to get most-recently-inserted first (tiebreaker for same timestamps)
    runs.reverse()
    return runs.slice(0, limit)
  }

  let query = db
    .from("system_job_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit)

  if (jobKey) query = query.eq("job_key", jobKey)

  const { data, error } = await query

  if (error) throw new Error(`Failed to get job runs: ${error.message}`)
  return (data ?? []).map(mapJobRun)
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export function openIncident(input: OpenIncidentInput): SystemIncident {
  if (!input.incidentKey) throw new Error("incidentKey is required")
  if (!input.severity) throw new Error("severity is required")
  if (!input.title) throw new Error("title is required")

  const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
  if (!validSeverities.includes(input.severity)) {
    throw new Error(`Invalid severity: ${input.severity}`)
  }

  const now = new Date().toISOString()
  const incident: SystemIncident = {
    id: crypto.randomUUID(),
    incidentKey: input.incidentKey,
    severity: input.severity,
    status: "OPEN",
    title: input.title,
    description: input.description ?? null,
    payload: input.payload ?? {},
    openedAt: now,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  incidentStore.push(incident)
  return incident
}

export async function openIncidentAsync(
  input: OpenIncidentInput
): Promise<SystemIncident> {
  if (!input.incidentKey) throw new Error("incidentKey is required")
  if (!input.severity) throw new Error("severity is required")
  if (!input.title) throw new Error("title is required")

  const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
  if (!validSeverities.includes(input.severity)) {
    throw new Error(`Invalid severity: ${input.severity}`)
  }

  const db = getSupabaseClient()
  if (!db) return openIncident(input)

  const { data, error } = await db
    .from("system_incidents")
    .insert({
      incident_key: input.incidentKey,
      severity: input.severity,
      status: "OPEN",
      title: input.title,
      description: input.description ?? null,
      payload: input.payload ?? {},
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to open incident: ${error.message}`)
  return mapIncident(data)
}

export function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus
): SystemIncident | null {
  const incident = incidentStore.find((i) => i.id === incidentId)
  if (!incident) return null

  const now = new Date().toISOString()
  incident.status = status
  incident.updatedAt = now

  if (status === "ACKNOWLEDGED") incident.acknowledgedAt = now
  if (status === "RESOLVED") incident.resolvedAt = now

  return incident
}

export async function updateIncidentStatusAsync(
  incidentId: string,
  status: IncidentStatus
): Promise<SystemIncident | null> {
  const db = getSupabaseClient()
  if (!db) return updateIncidentStatus(incidentId, status)

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    status,
    updated_at: now,
  }

  if (status === "ACKNOWLEDGED") updates.acknowledged_at = now
  if (status === "RESOLVED") updates.resolved_at = now

  const { data, error } = await db
    .from("system_incidents")
    .update(updates)
    .eq("id", incidentId)
    .select()
    .single()

  if (error)
    throw new Error(`Failed to update incident status: ${error.message}`)
  return data ? mapIncident(data) : null
}

export async function getOpenIncidents(): Promise<SystemIncident[]> {
  const db = getSupabaseClient()
  if (!db) {
    return incidentStore
      .filter((i) => i.status !== "RESOLVED")
      .sort(
        (a, b) =>
          new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
      )
  }

  const { data, error } = await db
    .from("system_incidents")
    .select("*")
    .neq("status", "RESOLVED")
    .order("opened_at", { ascending: false })

  if (error) throw new Error(`Failed to get open incidents: ${error.message}`)
  return (data ?? []).map(mapIncident)
}

// ---------------------------------------------------------------------------
// Rate Limits
// ---------------------------------------------------------------------------

export async function getRateLimits(): Promise<SystemRateLimit[]> {
  const db = getSupabaseClient()
  if (!db) return [...rateLimitStore]

  const { data, error } = await db
    .from("system_rate_limits")
    .select("*")
    .order("limit_key", { ascending: true })

  if (error) throw new Error(`Failed to get rate limits: ${error.message}`)
  return (data ?? []).map(mapRateLimit)
}

export async function getRateLimit(
  limitKey: string
): Promise<SystemRateLimit | null> {
  const db = getSupabaseClient()
  if (!db) {
    return rateLimitStore.find((r) => r.limitKey === limitKey) ?? null
  }

  const { data, error } = await db
    .from("system_rate_limits")
    .select("*")
    .eq("limit_key", limitKey)
    .single()

  if (error) return null
  return data ? mapRateLimit(data) : null
}

// ---------------------------------------------------------------------------
// Config Validation
// ---------------------------------------------------------------------------

export async function validateConfig(): Promise<ConfigValidationResult[]> {
  const db = getSupabaseClient()

  let entries: SystemConfigEntry[]
  if (db) {
    const { data, error } = await db
      .from("system_config_registry")
      .select("*")
      .order("category", { ascending: true })

    if (error)
      throw new Error(`Failed to get config registry: ${error.message}`)
    entries = (data ?? []).map(mapConfigEntry)
  } else {
    entries = [...configStore]
  }

  return entries.map((entry) => ({
    configKey: entry.configKey,
    isRequired: entry.isRequired,
    isPresent: !!process.env[entry.configKey],
    category: entry.category,
  }))
}

// ---------------------------------------------------------------------------
// Database Row Types (snake_case from Supabase)
// ---------------------------------------------------------------------------

interface HealthCheckRow {
  id: string
  check_key: string
  status: string
  message: string | null
  payload: Record<string, unknown> | null
  checked_at: string
  created_at: string
}

interface JobRunRow {
  id: string
  job_key: string
  run_type: string
  status: string
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  payload: Record<string, unknown> | null
  error_message: string | null
  created_at: string
}

interface IncidentRow {
  id: string
  incident_key: string
  severity: string
  status: string
  title: string
  description: string | null
  payload: Record<string, unknown> | null
  opened_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

interface RateLimitRow {
  id: string
  limit_key: string
  is_active: boolean
  max_per_hour: number | null
  max_per_day: number | null
  max_concurrent: number | null
  payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

interface ConfigEntryRow {
  id: string
  config_key: string
  environment: string
  is_required: boolean
  category: string
  description: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Row Mappers (snake_case DB → camelCase TS)
// ---------------------------------------------------------------------------

function mapHealthCheck(row: HealthCheckRow): SystemHealthCheck {
  return {
    id: row.id,
    checkKey: row.check_key,
    status: row.status as SystemHealthCheck["status"],
    message: row.message,
    payload: row.payload ?? {},
    checkedAt: row.checked_at,
    createdAt: row.created_at,
  }
}

function mapJobRun(row: JobRunRow): SystemJobRun {
  return {
    id: row.id,
    jobKey: row.job_key,
    runType: row.run_type as SystemJobRun["runType"],
    status: row.status as SystemJobRun["status"],
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    payload: row.payload ?? {},
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}

function mapIncident(row: IncidentRow): SystemIncident {
  return {
    id: row.id,
    incidentKey: row.incident_key,
    severity: row.severity as SystemIncident["severity"],
    status: row.status as SystemIncident["status"],
    title: row.title,
    description: row.description,
    payload: row.payload ?? {},
    openedAt: row.opened_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRateLimit(row: RateLimitRow): SystemRateLimit {
  return {
    id: row.id,
    limitKey: row.limit_key,
    isActive: row.is_active,
    maxPerHour: row.max_per_hour,
    maxPerDay: row.max_per_day,
    maxConcurrent: row.max_concurrent,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapConfigEntry(row: ConfigEntryRow): SystemConfigEntry {
  return {
    id: row.id,
    configKey: row.config_key,
    environment: row.environment,
    isRequired: row.is_required,
    category: row.category,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
