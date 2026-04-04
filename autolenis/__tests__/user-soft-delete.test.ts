/**
 * Tests for UserService.softDeleteUser — FIX 13 behavioral tests
 *
 * Validates:
 * 1. Rejects soft delete when active deals exist
 * 2. Succeeds soft delete when only terminal deals exist
 * 3. Logs AdminAuditLog on success
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

import { prisma } from "@/lib/db"
import { userService } from "@/lib/services/user.service"

vi.mock("@/lib/db", () => ({
  prisma: {
    buyerProfile: {
      findMany: vi.fn(),
    },
    selectedDeal: {
      count: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
  },
}))

describe("UserService.softDeleteUser", () => {
  const adminId = "admin-001"
  const userId = "user-001"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects soft delete when active deals exist", async () => {
    vi.mocked(prisma.buyerProfile.findMany).mockResolvedValue([
      { id: "bp-1" },
    ] as any)

    vi.mocked(prisma.selectedDeal.count).mockResolvedValue(2)

    await expect(userService.softDeleteUser(userId, adminId)).rejects.toThrow(
      /active deal/i,
    )

    // Should NOT have updated user or created audit log
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled()
  })

  it("succeeds soft delete when only terminal deals exist (COMPLETED/CANCELLED)", async () => {
    vi.mocked(prisma.buyerProfile.findMany).mockResolvedValue([
      { id: "bp-1" },
    ] as any)

    // No active deals
    vi.mocked(prisma.selectedDeal.count).mockResolvedValue(0)

    vi.mocked(prisma.user.update).mockResolvedValue({ id: userId } as any)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)

    await userService.softDeleteUser(userId, adminId)

    // Should have set deletedAt on user
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it("succeeds soft delete when user has no buyer profiles", async () => {
    vi.mocked(prisma.buyerProfile.findMany).mockResolvedValue([])

    vi.mocked(prisma.user.update).mockResolvedValue({ id: userId } as any)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)

    await userService.softDeleteUser(userId, adminId)

    // Should skip deal check and proceed to soft delete
    expect(prisma.selectedDeal.count).not.toHaveBeenCalled()
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it("logs AdminAuditLog on success", async () => {
    vi.mocked(prisma.buyerProfile.findMany).mockResolvedValue([
      { id: "bp-1" },
    ] as any)

    vi.mocked(prisma.selectedDeal.count).mockResolvedValue(0)
    vi.mocked(prisma.user.update).mockResolvedValue({ id: userId } as any)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)

    await userService.softDeleteUser(userId, adminId)

    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: adminId,
        action: "USER_SOFT_DELETED",
        details: { targetUserId: userId },
      },
    })
  })
})
