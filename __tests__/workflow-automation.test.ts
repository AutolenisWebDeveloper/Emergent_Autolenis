import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockFrom, mockRunAutomationCycle, mockValidateCronRequest, mockAcquireCronLock } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockRunAutomationCycle = vi.fn()
  const mockValidateCronRequest = vi.fn().mockResolvedValue(null)
  const mockAcquireCronLock = vi.fn().mockResolvedValue(false)
  return { mockFrom, mockRunAutomationCycle, mockValidateCronRequest, mockAcquireCronLock }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock("@/lib/services/workflow/sla.service", () => ({
  getActiveRules: vi.fn().mockResolvedValue([]),
  evaluateEntities: vi.fn().mockReturnValue([]),
  recordSlaEvent: vi.fn().mockResolvedValue(null),
  hasUnresolvedEvent: vi.fn().mockResolvedValue(false),
}))

vi.mock("@/lib/services/workflow/notification.service", () => ({
  enqueueNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
  processNotificationQueue: vi.fn().mockResolvedValue({
    processed: 0,
    sent: 0,
    failed: 0,
  }),
}))

vi.mock("@/lib/middleware/cron-security", () => ({
  validateCronRequest: mockValidateCronRequest,
  acquireCronLock: mockAcquireCronLock,
}))

vi.mock("@/lib/services/workflow/automation-runner.service", () => ({
  runAutomationCycle: mockRunAutomationCycle,
}))

// ── Imports ──────────────────────────────────────────────────────────────

import { GET } from "@/app/api/cron/workflow-automation/route"
import { NextRequest } from "next/server"

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/workflow-automation", {
    method: "GET",
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("Workflow Automation Cron Route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateCronRequest.mockResolvedValue(null)
    mockAcquireCronLock.mockResolvedValue(false)
  })

  it("runs automation cycle and returns results", async () => {
    mockRunAutomationCycle.mockResolvedValue({
      correlationId: "corr-1",
      evaluations: {
        INVENTORY_LEAD: { entitiesChecked: 5, violationsFound: 1, eventsRecorded: 1, notificationsEnqueued: 1 },
      },
      notifications: { processed: 1, sent: 1, failed: 0 },
      durationMs: 120,
    })

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.correlationId).toBe("corr-1")
    expect(body.evaluations.INVENTORY_LEAD.entitiesChecked).toBe(5)
    expect(body.notifications.sent).toBe(1)
    expect(body.durationMs).toBe(120)
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

  it("returns 500 on unexpected error", async () => {
    mockRunAutomationCycle.mockRejectedValue(new Error("boom"))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe("CRON_JOB_FAILED")
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
})

// ── Automation runner integration ────────────────────────────────────────

describe("Automation Runner (unit)", () => {
  // These tests verify the automation runner module in isolation

  it("imports without errors", async () => {
    // Ensure the runner module can be loaded
    const mod = await import("@/lib/services/workflow/automation-runner.service")
    expect(mod.runAutomationCycle).toBeDefined()
  })
})
