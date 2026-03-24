/**
 * Phase 12 — System Operations Service Tests
 *
 * Tests for health checks, job runs, incidents, rate limits,
 * and config validation using in-memory storage.
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  recordHealthCheck,
  startJobRun,
  completeJobRun,
  openIncident,
  updateIncidentStatus,
  getLatestHealthChecks,
  getRecentJobRuns,
  getOpenIncidents,
  resetSystemStores,
  getHealthCheckStore,
  getJobRunStore,
  getIncidentStore,
} from "@/lib/services/system"

// ---------------------------------------------------------------------------
// Reset state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetSystemStores()
})

// ============================================================================
// Health Checks
// ============================================================================

describe("recordHealthCheck", () => {
  it("should record a PASS health check with all fields", () => {
    const check = recordHealthCheck({
      checkKey: "DB_CONNECTION",
      status: "PASS",
      message: "Database is reachable",
      payload: { latencyMs: 12 },
    })

    expect(check.id).toBeDefined()
    expect(check.checkKey).toBe("DB_CONNECTION")
    expect(check.status).toBe("PASS")
    expect(check.message).toBe("Database is reachable")
    expect(check.payload).toEqual({ latencyMs: 12 })
    expect(check.checkedAt).toBeDefined()
    expect(check.createdAt).toBeDefined()
  })

  it("should record a FAIL health check without optional fields", () => {
    const check = recordHealthCheck({
      checkKey: "STRIPE_API",
      status: "FAIL",
    })

    expect(check.checkKey).toBe("STRIPE_API")
    expect(check.status).toBe("FAIL")
    expect(check.message).toBeNull()
    expect(check.payload).toEqual({})
  })

  it("should record a WARN health check", () => {
    const check = recordHealthCheck({
      checkKey: "CRON_STALE",
      status: "WARN",
      message: "Last cron run was 30 minutes ago",
    })

    expect(check.status).toBe("WARN")
  })

  it("should reject missing checkKey", () => {
    expect(() =>
      recordHealthCheck({ checkKey: "", status: "PASS" })
    ).toThrow("checkKey is required")
  })

  it("should reject missing status", () => {
    expect(() =>
      recordHealthCheck({ checkKey: "TEST", status: "" as any })
    ).toThrow("status is required")
  })

  it("should reject invalid status", () => {
    expect(() =>
      recordHealthCheck({ checkKey: "TEST", status: "UNKNOWN" as any })
    ).toThrow("Invalid status: UNKNOWN")
  })

  it("should store checks in the in-memory store", () => {
    recordHealthCheck({ checkKey: "A", status: "PASS" })
    recordHealthCheck({ checkKey: "B", status: "FAIL" })

    expect(getHealthCheckStore()).toHaveLength(2)
  })
})

describe("getLatestHealthChecks", () => {
  it("should return latest check per key", async () => {
    recordHealthCheck({ checkKey: "DB", status: "FAIL", message: "old" })
    recordHealthCheck({ checkKey: "DB", status: "PASS", message: "new" })
    recordHealthCheck({ checkKey: "API", status: "PASS" })

    const latest = await getLatestHealthChecks()
    expect(latest).toHaveLength(2)

    const dbCheck = latest.find((c) => c.checkKey === "DB")
    expect(dbCheck?.message).toBe("new")
  })
})

// ============================================================================
// Job Runs
// ============================================================================

describe("startJobRun", () => {
  it("should create a RUNNING job run with defaults", () => {
    const run = startJobRun({ jobKey: "DAILY_ANALYTICS" })

    expect(run.id).toBeDefined()
    expect(run.jobKey).toBe("DAILY_ANALYTICS")
    expect(run.runType).toBe("CRON")
    expect(run.status).toBe("RUNNING")
    expect(run.startedAt).toBeDefined()
    expect(run.finishedAt).toBeNull()
    expect(run.durationMs).toBeNull()
    expect(run.errorMessage).toBeNull()
  })

  it("should create a job run with custom runType and payload", () => {
    const run = startJobRun({
      jobKey: "INVENTORY_SCRAPE",
      runType: "SCRAPER",
      payload: { sourceId: "autotrader" },
    })

    expect(run.runType).toBe("SCRAPER")
    expect(run.payload).toEqual({ sourceId: "autotrader" })
  })

  it("should reject missing jobKey", () => {
    expect(() => startJobRun({ jobKey: "" })).toThrow("jobKey is required")
  })

  it("should store runs in the in-memory store", () => {
    startJobRun({ jobKey: "A" })
    startJobRun({ jobKey: "B" })
    expect(getJobRunStore()).toHaveLength(2)
  })
})

describe("completeJobRun", () => {
  it("should complete a running job as COMPLETED", () => {
    const run = startJobRun({ jobKey: "CRON_CLEANUP" })
    const completed = completeJobRun(run.id, "COMPLETED")

    expect(completed).not.toBeNull()
    expect(completed!.status).toBe("COMPLETED")
    expect(completed!.finishedAt).toBeDefined()
    expect(completed!.durationMs).toBeGreaterThanOrEqual(0)
    expect(completed!.errorMessage).toBeNull()
  })

  it("should complete a running job as FAILED with error message", () => {
    const run = startJobRun({ jobKey: "CRON_EMAILS" })
    const failed = completeJobRun(run.id, "FAILED", "Timeout after 30s")

    expect(failed!.status).toBe("FAILED")
    expect(failed!.errorMessage).toBe("Timeout after 30s")
  })

  it("should return null for unknown run ID", () => {
    const result = completeJobRun("unknown-id", "COMPLETED")
    expect(result).toBeNull()
  })
})

describe("getRecentJobRuns", () => {
  it("should return runs sorted by startedAt descending", async () => {
    startJobRun({ jobKey: "A" })
    startJobRun({ jobKey: "B" })
    startJobRun({ jobKey: "C" })

    const runs = await getRecentJobRuns()
    expect(runs).toHaveLength(3)
    expect(runs[0]!.jobKey).toBe("C")
  })

  it("should filter by jobKey", async () => {
    startJobRun({ jobKey: "SCRAPE" })
    startJobRun({ jobKey: "ANALYTICS" })
    startJobRun({ jobKey: "SCRAPE" })

    const runs = await getRecentJobRuns("SCRAPE")
    expect(runs).toHaveLength(2)
    expect(runs.every((r) => r.jobKey === "SCRAPE")).toBe(true)
  })

  it("should respect limit", async () => {
    for (let i = 0; i < 10; i++) {
      startJobRun({ jobKey: `JOB_${i}` })
    }

    const runs = await getRecentJobRuns(undefined, 3)
    expect(runs).toHaveLength(3)
  })
})

// ============================================================================
// Incidents
// ============================================================================

describe("openIncident", () => {
  it("should create an OPEN incident with all fields", () => {
    const incident = openIncident({
      incidentKey: "SCRAPER_OUTAGE",
      severity: "HIGH",
      title: "AutoTrader scraper down",
      description: "Scraper returning 503 for 15 minutes",
      payload: { source: "autotrader", errorCount: 42 },
    })

    expect(incident.id).toBeDefined()
    expect(incident.incidentKey).toBe("SCRAPER_OUTAGE")
    expect(incident.severity).toBe("HIGH")
    expect(incident.status).toBe("OPEN")
    expect(incident.title).toBe("AutoTrader scraper down")
    expect(incident.description).toBe(
      "Scraper returning 503 for 15 minutes"
    )
    expect(incident.payload).toEqual({
      source: "autotrader",
      errorCount: 42,
    })
    expect(incident.openedAt).toBeDefined()
    expect(incident.acknowledgedAt).toBeNull()
    expect(incident.resolvedAt).toBeNull()
  })

  it("should create a CRITICAL incident without optional fields", () => {
    const incident = openIncident({
      incidentKey: "DB_DOWN",
      severity: "CRITICAL",
      title: "Database unreachable",
    })

    expect(incident.severity).toBe("CRITICAL")
    expect(incident.description).toBeNull()
    expect(incident.payload).toEqual({})
  })

  it("should reject missing incidentKey", () => {
    expect(() =>
      openIncident({
        incidentKey: "",
        severity: "LOW",
        title: "Test",
      })
    ).toThrow("incidentKey is required")
  })

  it("should reject missing severity", () => {
    expect(() =>
      openIncident({
        incidentKey: "TEST",
        severity: "" as any,
        title: "Test",
      })
    ).toThrow("severity is required")
  })

  it("should reject missing title", () => {
    expect(() =>
      openIncident({
        incidentKey: "TEST",
        severity: "LOW",
        title: "",
      })
    ).toThrow("title is required")
  })

  it("should reject invalid severity", () => {
    expect(() =>
      openIncident({
        incidentKey: "TEST",
        severity: "EXTREME" as any,
        title: "Test",
      })
    ).toThrow("Invalid severity: EXTREME")
  })

  it("should store incidents in the in-memory store", () => {
    openIncident({
      incidentKey: "A",
      severity: "LOW",
      title: "Test A",
    })
    openIncident({
      incidentKey: "B",
      severity: "MEDIUM",
      title: "Test B",
    })

    expect(getIncidentStore()).toHaveLength(2)
  })
})

describe("updateIncidentStatus", () => {
  it("should acknowledge an open incident", () => {
    const incident = openIncident({
      incidentKey: "TEST",
      severity: "MEDIUM",
      title: "Test incident",
    })

    const updated = updateIncidentStatus(incident.id, "ACKNOWLEDGED")
    expect(updated).not.toBeNull()
    expect(updated!.status).toBe("ACKNOWLEDGED")
    expect(updated!.acknowledgedAt).toBeDefined()
    expect(updated!.resolvedAt).toBeNull()
  })

  it("should resolve an incident", () => {
    const incident = openIncident({
      incidentKey: "TEST",
      severity: "HIGH",
      title: "Test incident",
    })

    const resolved = updateIncidentStatus(incident.id, "RESOLVED")
    expect(resolved!.status).toBe("RESOLVED")
    expect(resolved!.resolvedAt).toBeDefined()
  })

  it("should return null for unknown incident ID", () => {
    const result = updateIncidentStatus("unknown-id", "RESOLVED")
    expect(result).toBeNull()
  })
})

describe("getOpenIncidents", () => {
  it("should return only non-resolved incidents", async () => {
    const i1 = openIncident({
      incidentKey: "OPEN_1",
      severity: "LOW",
      title: "Open",
    })
    openIncident({
      incidentKey: "OPEN_2",
      severity: "MEDIUM",
      title: "Also open",
    })
    updateIncidentStatus(i1.id, "RESOLVED")

    const open = await getOpenIncidents()
    expect(open).toHaveLength(1)
    expect(open[0]!.incidentKey).toBe("OPEN_2")
  })

  it("should include acknowledged but not resolved incidents", async () => {
    const incident = openIncident({
      incidentKey: "ACK",
      severity: "HIGH",
      title: "Acknowledged incident",
    })
    updateIncidentStatus(incident.id, "ACKNOWLEDGED")

    const open = await getOpenIncidents()
    expect(open).toHaveLength(1)
    expect(open[0]!.status).toBe("ACKNOWLEDGED")
  })
})

// ============================================================================
// End-to-end flow: Job run with incident
// ============================================================================

describe("Job run + incident lifecycle", () => {
  it("should track a failed job and open an incident", () => {
    // Start a job run
    const run = startJobRun({
      jobKey: "NIGHTLY_SCRAPE",
      runType: "SCRAPER",
    })
    expect(run.status).toBe("RUNNING")

    // Job fails
    const failed = completeJobRun(run.id, "FAILED", "Source returned 503")
    expect(failed!.status).toBe("FAILED")
    expect(failed!.errorMessage).toBe("Source returned 503")

    // Open an incident for the failure
    const incident = openIncident({
      incidentKey: "SCRAPE_FAILURE",
      severity: "HIGH",
      title: "Nightly scrape failed",
      description: "Source returned 503",
      payload: { jobRunId: run.id },
    })
    expect(incident.status).toBe("OPEN")

    // Acknowledge the incident
    const acked = updateIncidentStatus(incident.id, "ACKNOWLEDGED")
    expect(acked!.status).toBe("ACKNOWLEDGED")
    expect(acked!.acknowledgedAt).toBeDefined()

    // Resolve the incident
    const resolved = updateIncidentStatus(incident.id, "RESOLVED")
    expect(resolved!.status).toBe("RESOLVED")
    expect(resolved!.resolvedAt).toBeDefined()
  })

  it("should track health check degradation and recovery", () => {
    // Initial healthy check
    const pass = recordHealthCheck({
      checkKey: "DB_CONN",
      status: "PASS",
      message: "Connected",
    })
    expect(pass.status).toBe("PASS")

    // Check degrades
    const warn = recordHealthCheck({
      checkKey: "DB_CONN",
      status: "WARN",
      message: "High latency (>500ms)",
    })
    expect(warn.status).toBe("WARN")

    // Check fails
    const fail = recordHealthCheck({
      checkKey: "DB_CONN",
      status: "FAIL",
      message: "Connection refused",
    })
    expect(fail.status).toBe("FAIL")

    // Recovery
    const recovered = recordHealthCheck({
      checkKey: "DB_CONN",
      status: "PASS",
      message: "Connected again",
    })
    expect(recovered.status).toBe("PASS")

    // All 4 checks should be in the store
    expect(getHealthCheckStore()).toHaveLength(4)
  })
})
