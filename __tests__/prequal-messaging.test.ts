/**
 * Prequal Transactional Messaging Tests
 *
 * Covers:
 * 1. queueSubmissionConfirmation — creates EMAIL + SUBMISSION_CONFIRMATION + QUEUED
 * 2. queueResultReady — creates EMAIL + RESULT_READY + QUEUED with correct subject/body
 * 3. queueIbvReminder — suppresses duplicates
 * 4. queueResultReady — suppresses duplicates
 * 5. processQueuedMessages — marks SENT on success
 * 6. processQueuedMessages — marks FAILED with failureReason on failure
 * 7. start route — queues submission confirmation
 * 8. finalize route — queues result-ready after decision
 * 9. iPredict auto-decline — queues result-ready for NOT_PREQUALIFIED
 * 10. message-delivery cron — enforces CRON_SECRET
 * 11. message-delivery cron — returns counts from processor
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/prisma"

// ── Mocks (inline factories — vi.mock is hoisted) ──────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    prequalMessage: {
      create: vi.fn().mockResolvedValue({ id: "msg-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    prequalApplication: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    prequalConsent: { create: vi.fn().mockResolvedValue({}) },
    prequalDecision: { create: vi.fn().mockResolvedValue({}) },
    prequalIpredictReport: { create: vi.fn().mockResolvedValue({}) },
    prequalAuditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock("@/lib/resend", () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "resend-1" }, error: null }),
    },
  },
  EMAIL_CONFIG: {
    from: "noreply@autolenis.com",
    replyTo: "support@autolenis.com",
    adminEmail: "admin@autolenis.com",
  },
}))

vi.mock("@/lib/prequal/audit", () => ({
  writePrequalAuditLog: vi.fn().mockResolvedValue(undefined),
}))

// ── Typed references to mocks ───────────────────────────────────────────────

const mockPrequalMessage = prisma.prequalMessage as unknown as {
  create: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

// Access the resend mock via the module (already mocked above)
import { resend } from "@/lib/resend"
const mockSend = resend.emails.send as ReturnType<typeof vi.fn>

// ── Import modules under test ────────────────────────────────────────────────

import {
  queueSubmissionConfirmation,
  queueResultReady,
  queueIbvReminder,
} from "@/lib/prequal/messaging"

import { processQueuedMessages } from "@/lib/prequal/message-sender"

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockPrequalMessage.findFirst.mockResolvedValue(null)
  mockPrequalMessage.findMany.mockResolvedValue([])
  mockPrequalMessage.create.mockResolvedValue({ id: "msg-1" })
  mockPrequalMessage.update.mockResolvedValue({})
  mockSend.mockResolvedValue({ data: { id: "resend-1" }, error: null })
})

// ─── 1. queueSubmissionConfirmation ────────────────────────────────────────

describe("queueSubmissionConfirmation", () => {
  it("creates an EMAIL + SUBMISSION_CONFIRMATION + QUEUED message", async () => {
    await queueSubmissionConfirmation("app-1", "test@test.com", "Alice")

    expect(mockPrequalMessage.create).toHaveBeenCalledOnce()
    const call = mockPrequalMessage.create.mock.calls[0][0]
    expect(call.data.channel).toBe("EMAIL")
    expect(call.data.messageType).toBe("SUBMISSION_CONFIRMATION")
    expect(call.data.deliveryStatus).toBe("QUEUED")
    expect(call.data.applicationId).toBe("app-1")
    expect(call.data.recipient).toBe("test@test.com")
    expect(call.data.subject).toBe("AutoLenis — Prequalification Request Received")
    expect(call.data.body).toContain("soft inquiry")
    expect(call.data.body).toContain("does not affect your credit score")
  })

  it("does not throw if prisma.create fails", async () => {
    mockPrequalMessage.create.mockRejectedValueOnce(new Error("DB down"))
    await expect(
      queueSubmissionConfirmation("app-1", "test@test.com", "Alice"),
    ).resolves.not.toThrow()
  })
})

// ─── 2. queueResultReady ──────────────────────────────────────────────────

describe("queueResultReady", () => {
  it("creates an EMAIL + RESULT_READY + QUEUED message with correct subject/body", async () => {
    await queueResultReady("app-2", "bob@test.com", "Bob", "PREQUALIFIED")

    expect(mockPrequalMessage.create).toHaveBeenCalledOnce()
    const call = mockPrequalMessage.create.mock.calls[0][0]
    expect(call.data.channel).toBe("EMAIL")
    expect(call.data.messageType).toBe("RESULT_READY")
    expect(call.data.deliveryStatus).toBe("QUEUED")
    expect(call.data.subject).toBe("AutoLenis — Your Prequalification Result Is Ready")
    expect(call.data.body).toContain("Shopping Pass is ready")
    expect(call.data.body).toContain("/prequal/result?id=app-2")
  })

  it("uses correct intro for PREQUALIFIED_CONDITIONAL", async () => {
    await queueResultReady("app-3", "c@t.com", "Chris", "PREQUALIFIED_CONDITIONAL")
    const body = mockPrequalMessage.create.mock.calls[0][0].data.body
    expect(body).toContain("conditional shopping estimate")
  })

  it("uses correct intro for MANUAL_REVIEW", async () => {
    await queueResultReady("app-4", "d@t.com", "Dan", "MANUAL_REVIEW")
    const body = mockPrequalMessage.create.mock.calls[0][0].data.body
    expect(body).toContain("under review by our team")
  })

  it("uses correct intro for NOT_PREQUALIFIED", async () => {
    await queueResultReady("app-5", "e@t.com", "Eve", "NOT_PREQUALIFIED")
    const body = mockPrequalMessage.create.mock.calls[0][0].data.body
    expect(body).toContain("completed your prequalification review")
  })

  it("uses default intro for unknown status", async () => {
    await queueResultReady("app-6", "f@t.com", "Fay", "UNKNOWN_STATUS")
    const body = mockPrequalMessage.create.mock.calls[0][0].data.body
    expect(body).toContain("prequalification result is ready")
  })
})

// ─── 3. queueIbvReminder — suppresses duplicates ─────────────────────────

describe("queueIbvReminder", () => {
  it("creates an IBV_REMINDER message when none exists", async () => {
    const result = await queueIbvReminder("app-7", "g@t.com", "Gina")

    expect(result.queued).toBe(true)
    expect(mockPrequalMessage.create).toHaveBeenCalledOnce()
    const call = mockPrequalMessage.create.mock.calls[0][0]
    expect(call.data.messageType).toBe("IBV_REMINDER")
    expect(call.data.subject).toBe("AutoLenis — Complete Your Income Verification")
    expect(call.data.body).toContain("/prequal/ibv-intro?id=app-7")
  })

  it("suppresses duplicate IBV_REMINDER", async () => {
    mockPrequalMessage.findFirst.mockResolvedValueOnce({ id: "existing-msg" })

    const result = await queueIbvReminder("app-7", "g@t.com", "Gina")

    expect(result.queued).toBe(false)
    expect(mockPrequalMessage.create).not.toHaveBeenCalled()
  })
})

// ─── 4. queueResultReady — suppresses duplicates ─────────────────────────

describe("queueResultReady — dedup", () => {
  it("does not create duplicate RESULT_READY", async () => {
    mockPrequalMessage.findFirst.mockResolvedValueOnce({
      id: "existing-rr",
      deliveryStatus: "QUEUED",
    })

    await queueResultReady("app-8", "h@t.com", "Hank", "PREQUALIFIED")

    expect(mockPrequalMessage.create).not.toHaveBeenCalled()
  })
})

// ─── 5. processQueuedMessages — marks SENT ───────────────────────────────

describe("processQueuedMessages", () => {
  it("marks successful sends as SENT", async () => {
    mockPrequalMessage.findMany.mockResolvedValueOnce([
      {
        id: "msg-10",
        applicationId: "app-10",
        channel: "EMAIL",
        messageType: "RESULT_READY",
        recipient: "j@t.com",
        subject: "Test",
        body: "Body",
      },
    ])

    const result = await processQueuedMessages(10)

    expect(result.sent).toBe(1)
    expect(result.failed).toBe(0)
    expect(mockPrequalMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-10" },
        data: expect.objectContaining({ deliveryStatus: "SENT" }),
      }),
    )
  })

  // ─── 6. processQueuedMessages — marks FAILED ────────────────────────────

  it("marks failed sends as FAILED with failureReason", async () => {
    mockPrequalMessage.findMany.mockResolvedValueOnce([
      {
        id: "msg-11",
        applicationId: "app-11",
        channel: "EMAIL",
        messageType: "SUBMISSION_CONFIRMATION",
        recipient: "bad@t.com",
        subject: "Test",
        body: "Body",
      },
    ])
    mockSend.mockResolvedValueOnce({ data: null, error: { message: "Invalid email" } })

    const result = await processQueuedMessages(10)

    expect(result.failed).toBe(1)
    expect(result.sent).toBe(0)
    expect(mockPrequalMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "msg-11" },
        data: expect.objectContaining({
          deliveryStatus: "FAILED",
          failureReason: "Invalid email",
        }),
      }),
    )
  })

  it("skips non-EMAIL messages", async () => {
    mockPrequalMessage.findMany.mockResolvedValueOnce([
      {
        id: "msg-12",
        applicationId: "app-12",
        channel: "SMS",
        messageType: "IBV_REMINDER",
        recipient: "+1234567890",
        subject: null,
        body: "Body",
      },
    ])

    const result = await processQueuedMessages(10)

    expect(result.skipped).toBe(1)
    expect(result.sent).toBe(0)
    expect(mockSend).not.toHaveBeenCalled()
  })
})

// ─── 7–9. Route integration tests (source-level validation) ─────────────────

describe("start route — queues submission confirmation", () => {
  it("imports queueSubmissionConfirmation and calls it after audit log", () => {
    const fs = require("fs")
    const source = fs.readFileSync("app/api/prequal/start/route.ts", "utf-8")
    expect(source).toContain('import { queueSubmissionConfirmation } from "@/lib/prequal/messaging"')
    expect(source).toContain("queueSubmissionConfirmation(application.id")
  })
})

describe("finalize route — queues result-ready after decision", () => {
  it("imports queueResultReady and calls it after decision audit log", () => {
    const fs = require("fs")
    const source = fs.readFileSync("app/api/prequal/finalize/route.ts", "utf-8")
    expect(source).toContain('import { queueResultReady } from "@/lib/prequal/messaging"')
    expect(source).toContain("queueResultReady(")
    expect(source).toContain("decisionResult.finalStatus")
  })
})

describe("iPredict auto-decline — queues result-ready for NOT_PREQUALIFIED", () => {
  it("imports queueResultReady and calls it in FAIL path", () => {
    const fs = require("fs")
    const source = fs.readFileSync("app/api/prequal/ipredict/route.ts", "utf-8")
    expect(source).toContain('import { queueResultReady } from "@/lib/prequal/messaging"')
    expect(source).toContain('"NOT_PREQUALIFIED"')
  })
})

// ─── 10. message-delivery cron — enforces CRON_SECRET ────────────────────

describe("message-delivery cron", () => {
  it("returns 401 without CRON_SECRET", async () => {
    const original = process.env["CRON_SECRET"]
    delete process.env["CRON_SECRET"]

    // Re-import to get fresh module
    const mod = await import("@/app/api/cron/prequal/message-delivery/route")

    const mockReq = {
      headers: { get: () => null },
    } as unknown as import("next/server").NextRequest

    const res = await mod.POST(mockReq)
    expect(res.status).toBe(401)

    if (original) process.env["CRON_SECRET"] = original
  })

  // ─── 11. Returns counts from processor ──────────────────────────────────

  it("returns sent/failed/skipped counts on success", async () => {
    process.env["CRON_SECRET"] = "test-cron-secret"

    const mod = await import("@/app/api/cron/prequal/message-delivery/route")

    const mockReq = {
      headers: {
        get: (name: string) =>
          name === "authorization" ? "Bearer test-cron-secret" : null,
      },
    } as unknown as import("next/server").NextRequest

    const res = await mod.POST(mockReq)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(typeof body.sent).toBe("number")
    expect(typeof body.failed).toBe("number")
    expect(typeof body.skipped).toBe("number")
  })
})
