import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn()
  const mockLte = vi.fn()
  const mockOrder = vi.fn()
  const mockLimit = vi.fn()
  const mockSingle = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()

  // Default insert chain: workflow_notification_queue
  mockInsert.mockReturnValue({
    select: mockSelect.mockReturnValue({
      single: mockSingle.mockResolvedValue({
        data: {
          id: "notif-1",
          channel: "IN_APP",
          recipient_type: "ADMIN",
          recipient_id: null,
          recipient_email: null,
          template_key: "sla_new_lead_untouched",
          subject: "Test",
          payload: {},
          status: "PENDING",
          send_after: "2026-01-01T00:00:00.000Z",
          sent_at: null,
          error_message: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        error: null,
      }),
    }),
  })

  mockUpdate.mockReturnValue({
    eq: mockEq.mockResolvedValue({ error: null }),
  })

  const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  })

  return {
    mockFrom,
    mockInsert,
    mockSelect,
    mockSingle,
    mockUpdate,
    mockEq,
    mockLte,
    mockOrder,
    mockLimit,
  }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// ── Import under test ────────────────────────────────────────────────────

import {
  enqueueNotification,
  fetchPendingNotifications,
  markNotificationSent,
  markNotificationFailed,
  processNotificationQueue,
} from "@/lib/services/workflow/notification.service"

// ── Tests ────────────────────────────────────────────────────────────────

describe("Workflow Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mockFrom to default behavior
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "notif-1",
              channel: "IN_APP",
              recipient_type: "ADMIN",
              template_key: "sla_new_lead_untouched",
              status: "PENDING",
              payload: {},
              created_at: "2026-01-01T00:00:00.000Z",
            },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    })
  })

  // ── enqueueNotification ───────────────────────────────────────────────

  describe("enqueueNotification", () => {
    it("enqueues a valid notification", async () => {
      const result = await enqueueNotification({
        channel: "IN_APP",
        recipientType: "ADMIN",
        templateKey: "sla_new_lead_untouched",
        subject: "SLA Reminder",
        payload: { entityId: "lead-1" },
      })

      expect(result).not.toBeNull()
      expect(result?.id).toBe("notif-1")
      expect(result?.status).toBe("PENDING")
      expect(mockFrom).toHaveBeenCalledWith("workflow_notification_queue")
    })

    it("returns null when templateKey is empty", async () => {
      const result = await enqueueNotification({
        channel: "IN_APP",
        recipientType: "ADMIN",
        templateKey: "",
      })

      expect(result).toBeNull()
    })

    it("returns null on Supabase insert error", async () => {
      mockFrom.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "insert error" },
            }),
          }),
        }),
      })

      const result = await enqueueNotification({
        channel: "EMAIL",
        recipientType: "DEALER",
        templateKey: "sla_invite_expire",
      })

      expect(result).toBeNull()
    })

    it("handles unexpected errors gracefully", async () => {
      mockFrom.mockImplementationOnce(() => {
        throw new Error("unexpected failure")
      })

      const result = await enqueueNotification({
        channel: "IN_APP",
        recipientType: "ADMIN",
        templateKey: "sla_test",
      })

      expect(result).toBeNull()
    })
  })

  // ── fetchPendingNotifications ─────────────────────────────────────────

  describe("fetchPendingNotifications", () => {
    it("returns pending notifications", async () => {
      const pending = [
        { id: "n-1", status: "PENDING", channel: "IN_APP", template_key: "t1" },
        { id: "n-2", status: "PENDING", channel: "EMAIL", template_key: "t2" },
      ]

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: pending, error: null }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchPendingNotifications()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe("n-1")
    })

    it("returns empty array on error", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "select error" },
                }),
              }),
            }),
          }),
        }),
      })

      const result = await fetchPendingNotifications()
      expect(result).toEqual([])
    })
  })

  // ── markNotificationSent ──────────────────────────────────────────────

  describe("markNotificationSent", () => {
    it("marks notification as sent", async () => {
      const result = await markNotificationSent("notif-1")
      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith("workflow_notification_queue")
    })

    it("returns false on error", async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "update error" } }),
        }),
      })

      const result = await markNotificationSent("notif-1")
      expect(result).toBe(false)
    })
  })

  // ── markNotificationFailed ────────────────────────────────────────────

  describe("markNotificationFailed", () => {
    it("marks notification as failed with error message", async () => {
      const result = await markNotificationFailed("notif-1", "Delivery timeout")
      expect(result).toBe(true)
    })

    it("returns false on error", async () => {
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "update error" } }),
        }),
      })

      const result = await markNotificationFailed("notif-1", "err")
      expect(result).toBe(false)
    })
  })

  // ── processNotificationQueue ──────────────────────────────────────────

  describe("processNotificationQueue", () => {
    it("processes IN_APP notifications", async () => {
      // First call: fetchPendingNotifications select
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      { id: "n-1", channel: "IN_APP", status: "PENDING", template_key: "t1", send_after: "2026-01-01T00:00:00.000Z" },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })
        // Second call: markNotificationSent update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })

      const result = await processNotificationQueue()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
    })

    it("handles EMAIL notifications", async () => {
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      { id: "n-2", channel: "EMAIL", status: "PENDING", template_key: "sla_invite", recipient_email: "d@test.com", send_after: "2026-01-01T00:00:00.000Z" },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })

      const result = await processNotificationQueue()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
    })

    it("returns zeros when queue is empty", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      })

      const result = await processNotificationQueue()

      expect(result.processed).toBe(0)
      expect(result.sent).toBe(0)
      expect(result.failed).toBe(0)
    })
  })
})
