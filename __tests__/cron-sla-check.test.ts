/**
 * Cron Route: /api/cron/sla-check — unit tests
 *
 * Tests security validation, lock acquisition, SLA automation cycle
 * execution, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockValidateCronRequest,
  mockAcquireCronLock,
  mockRunAutomationCycle,
} = vi.hoisted(() => {
  const mockValidateCronRequest = vi.fn().mockResolvedValue(null)
  const mockAcquireCronLock = vi.fn().mockResolvedValue(false)
  const mockRunAutomationCycle = vi.fn()
  return {
    mockValidateCronRequest,
    mockAcquireCronLock,
    mockRunAutomationCycle,
  }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/middleware/cron-security", () => ({
  validateCronRequest: mockValidateCronRequest,
  acquireCronLock: mockAcquireCronLock,
}))

vi.mock("@/lib/services/workflow/automation-runner.service", () => ({
  runAutomationCycle: mockRunAutomationCycle,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: vi.fn() }),
}))

vi.mock("@/lib/services/workflow/sla.service", () => ({
  getActiveRules: vi.fn().mockResolvedValue([]),
  evaluateEntities: vi.fn().mockReturnValue([]),
  recordSlaEvent: vi.fn().mockResolvedValue(null),
  hasUnresolvedEvent: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/services/workflow/notification.service", () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
  processNotificationQueue: vi.fn().mockResolvedValue({ processed: 0, sent: 0, failed: 0 }),
}))

// ── Imports ──────────────────────────────────────────────────────────────

import { GET } from "@/app/api/cron/sla-check/route"
import { NextRequest } from "next/server"

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/sla-check", {
    method: "GET",
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("SLA Check Cron Route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateCronRequest.mockResolvedValue(null)
    mockAcquireCronLock.mockResolvedValue(false)
  })

  it("runs SLA automation cycle and returns results", async () => {
    mockRunAutomationCycle.mockResolvedValue({
      correlationId: "sla-corr-1",
      evaluations: {
        INVENTORY_LEAD: { entitiesChecked: 3, violationsFound: 0, eventsRecorded: 0, notificationsEnqueued: 0 },
        SOURCING_CASE: { entitiesChecked: 2, violationsFound: 1, eventsRecorded: 1, notificationsEnqueued: 1 },
      },
      notifications: { processed: 1, sent: 1, failed: 0 },
      durationMs: 85,
    })

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.correlationId).toBe("sla-corr-1")
    expect(body.evaluations.INVENTORY_LEAD.entitiesChecked).toBe(3)
    expect(body.evaluations.SOURCING_CASE.violationsFound).toBe(1)
    expect(body.notifications.sent).toBe(1)
    expect(body.durationMs).toBe(85)
  })

  it("skips when already ran in window", async () => {
    mockAcquireCronLock.mockResolvedValue(true)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("already ran in this window")
    expect(mockRunAutomationCycle).not.toHaveBeenCalled()
  })

  it("returns security check response when auth fails", async () => {
    const { NextResponse } = await import("next/server")
    mockValidateCronRequest.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    )

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
    expect(mockRunAutomationCycle).not.toHaveBeenCalled()
  })

  it("returns 500 on unexpected error", async () => {
    mockRunAutomationCycle.mockRejectedValue(new Error("SLA engine crashed"))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe("CRON_JOB_FAILED")
    expect(body.correlationId).toBeDefined()
  })

  it("uses 10-minute lock window for SLA checks", async () => {
    mockRunAutomationCycle.mockResolvedValue({
      correlationId: "c-1",
      evaluations: {},
      notifications: { processed: 0, sent: 0, failed: 0 },
      durationMs: 10,
    })

    await GET(makeRequest())

    expect(mockAcquireCronLock).toHaveBeenCalledWith("sla-check", 10)
  })
})
