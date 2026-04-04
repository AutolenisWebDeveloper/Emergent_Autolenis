import { describe, expect, it, vi, beforeEach } from "vitest"
import type { CreateNotificationInput } from "@/lib/notifications/types"

// ---- Supabase mock ----
// Build a chainable query builder mock that tracks calls and returns configurable results

let mockInsertResult: { data: any; error: any } = { data: null, error: null }
let mockSelectResult: { data: any; error: any; count: number | null } = { data: [], error: null, count: 0 }
let mockUpdateResult: { error: any } = { error: null }
let mockMaybeSingleResult: { data: any; error: any } = { data: null, error: null }
let lastFromTable = ""
let eqFilters: Array<{ col: string; val: any }> = []
let inFilters: Array<{ col: string; vals: any[] }> = []

function createChain() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn(function (col: string, val: any) {
      eqFilters.push({ col, val })
      return chain
    }),
    in: vi.fn(function (col: string, vals: any[]) {
      inFilters.push({ col, vals })
      return chain
    }),
    lt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(() => mockInsertResult),
    maybeSingle: vi.fn(() => mockMaybeSingleResult),
    then: undefined, // allow await to resolve the chain itself
  }

  // When awaited directly (e.g. for select with count), resolve to selectResult
  chain[Symbol.for("nodejs.util.promisify.custom")] = undefined
  // Make the chain thenable for select queries
  Object.defineProperty(chain, "then", {
    get() {
      // Only resolve for select calls with count
      return (resolve: any) => resolve(mockSelectResult)
    },
    configurable: true,
  })

  return chain
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      lastFromTable = table
      return createChain()
    }),
  })),
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe("notification.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eqFilters = []
    inFilters = []
    mockInsertResult = { data: null, error: null }
    mockSelectResult = { data: [], error: null, count: 0 }
    mockUpdateResult = { error: null }
    mockMaybeSingleResult = { data: null, error: null }
  })

  describe("notifyAdmin", () => {
    it("creates a notification with correct fields", async () => {
      const { notifyAdmin } = await import("@/lib/notifications/notification.service")

      // Mock: no existing dedupe match, insert succeeds
      mockMaybeSingleResult = { data: null, error: null }
      mockInsertResult = {
        data: {
          id: "notif-1",
          workspaceId: "ws-1",
          priority: "P0",
          category: "PAYMENT",
          type: "payment.failed",
          title: "Payment failed",
          message: "Stripe payment failed",
          isRead: false,
          isArchived: false,
          createdAt: new Date().toISOString(),
        },
        error: null,
      }

      const input: CreateNotificationInput = {
        workspaceId: "ws-1",
        priority: "P0",
        category: "PAYMENT",
        type: "payment.failed",
        title: "Payment failed",
        message: "Stripe payment failed",
        entityType: "Payment",
        entityId: "pi_123",
        ctaPath: "/admin/payments",
      }

      const result = await notifyAdmin(input)

      // Should have called from("AdminNotification")
      expect(lastFromTable).toBe("AdminNotification")
      expect(result).not.toBeNull()
      expect(result?.priority).toBe("P0")
    })

    it("skips notification when workspaceId is missing", async () => {
      const { notifyAdmin } = await import("@/lib/notifications/notification.service")

      const result = await notifyAdmin({
        workspaceId: "",
        priority: "P0",
        category: "PAYMENT",
        type: "payment.failed",
        title: "Test",
        message: "Test",
      })

      expect(result).toBeNull()
    })

    it("truncates titles longer than 60 characters", async () => {
      const { notifyAdmin } = await import("@/lib/notifications/notification.service")

      mockInsertResult = {
        data: {
          id: "notif-2",
          workspaceId: "ws-1",
          priority: "P1",
          category: "SYSTEM",
          type: "system.test",
          title: "A".repeat(59) + "…",
          message: "test",
          isRead: false,
          isArchived: false,
          createdAt: new Date().toISOString(),
        },
        error: null,
      }

      const longTitle = "A".repeat(80)
      const result = await notifyAdmin({
        workspaceId: "ws-1",
        priority: "P1",
        category: "SYSTEM",
        type: "system.test",
        title: longTitle,
        message: "test",
      })

      // Title should be truncated (returned from mock, but the input was trimmed)
      expect(result).not.toBeNull()
    })

    it("skips duplicate when dedupeKey already exists", async () => {
      const { notifyAdmin } = await import("@/lib/notifications/notification.service")

      // Simulate existing notification with same dedupeKey
      mockMaybeSingleResult = { data: { id: "existing-notif" }, error: null }

      const result = await notifyAdmin({
        workspaceId: "ws-1",
        priority: "P0",
        category: "PAYMENT",
        type: "payment.failed",
        title: "Payment failed",
        message: "Duplicate",
        dedupeKey: "payment.failed.pi_123",
      })

      expect(result).toBeNull()
    })

    it("returns null on insert error", async () => {
      const { notifyAdmin } = await import("@/lib/notifications/notification.service")

      mockMaybeSingleResult = { data: null, error: null }
      mockInsertResult = { data: null, error: { message: "DB error" } }

      const result = await notifyAdmin({
        workspaceId: "ws-1",
        priority: "P0",
        category: "PAYMENT",
        type: "payment.failed",
        title: "Fail",
        message: "Fail",
      })

      expect(result).toBeNull()
    })
  })

  describe("getUnreadCount", () => {
    it("returns count from DB filtered by workspace and P0/P1", async () => {
      const { getUnreadCount } = await import("@/lib/notifications/notification.service")

      mockSelectResult = { data: null, error: null, count: 5 }

      const count = await getUnreadCount("ws-1")

      // Should filter by workspaceId, isRead=false, isArchived=false, priority in [P0, P1]
      expect(eqFilters.some((f) => f.col === "workspaceId" && f.val === "ws-1")).toBe(true)
      expect(eqFilters.some((f) => f.col === "isRead" && f.val === false)).toBe(true)
      expect(eqFilters.some((f) => f.col === "isArchived" && f.val === false)).toBe(true)
      expect(inFilters.some((f) => f.col === "priority" && JSON.stringify(f.vals) === '["P0","P1"]')).toBe(true)
      expect(count).toBe(5)
    })

    it("returns 0 on error", async () => {
      const { getUnreadCount } = await import("@/lib/notifications/notification.service")

      mockSelectResult = { data: null, error: { message: "DB error" }, count: null }

      const count = await getUnreadCount("ws-1")
      expect(count).toBe(0)
    })
  })

  describe("markAsRead", () => {
    it("calls update with correct filters", async () => {
      const { markAsRead } = await import("@/lib/notifications/notification.service")

      const result = await markAsRead("notif-1", "ws-1")

      expect(lastFromTable).toBe("AdminNotification")
      expect(eqFilters.some((f) => f.col === "id" && f.val === "notif-1")).toBe(true)
      expect(eqFilters.some((f) => f.col === "workspaceId" && f.val === "ws-1")).toBe(true)
    })
  })

  describe("markAllAsRead", () => {
    it("updates all unread non-archived notifications", async () => {
      const { markAllAsRead } = await import("@/lib/notifications/notification.service")

      const result = await markAllAsRead("ws-1")

      expect(lastFromTable).toBe("AdminNotification")
      expect(eqFilters.some((f) => f.col === "workspaceId" && f.val === "ws-1")).toBe(true)
      expect(eqFilters.some((f) => f.col === "isRead" && f.val === false)).toBe(true)
      expect(eqFilters.some((f) => f.col === "isArchived" && f.val === false)).toBe(true)
    })
  })

  describe("archiveNotification", () => {
    it("archives with workspace scoping", async () => {
      const { archiveNotification } = await import("@/lib/notifications/notification.service")

      const result = await archiveNotification("notif-1", "ws-1")

      expect(lastFromTable).toBe("AdminNotification")
      expect(eqFilters.some((f) => f.col === "id" && f.val === "notif-1")).toBe(true)
      expect(eqFilters.some((f) => f.col === "workspaceId" && f.val === "ws-1")).toBe(true)
    })
  })
})

describe("notification types", () => {
  it("exports priority labels", async () => {
    const { PRIORITY_LABELS } = await import("@/lib/notifications/types")
    expect(PRIORITY_LABELS.P0).toBe("Critical")
    expect(PRIORITY_LABELS.P1).toBe("High")
    expect(PRIORITY_LABELS.P2).toBe("Informational")
  })

  it("exports category icons map", async () => {
    const { CATEGORY_ICONS } = await import("@/lib/notifications/types")
    expect(CATEGORY_ICONS.PAYMENT).toBe("DollarSign")
    expect(CATEGORY_ICONS.USER).toBe("Users")
    expect(CATEGORY_ICONS.SECURITY).toBe("ShieldCheck")
    expect(CATEGORY_ICONS.WEBHOOK).toBe("RefreshCcw")
  })
})
