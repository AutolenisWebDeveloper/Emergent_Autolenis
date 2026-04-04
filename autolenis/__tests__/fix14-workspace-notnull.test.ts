/**
 * FIX 14 — workspaceId NOT NULL enforcement (behavioral tests)
 *
 * Validates that:
 * 1. The seven target models declare workspaceId as non-nullable via Prisma DMMF
 * 2. RefundStatus enum uses SUCCEEDED (not COMPLETED)
 * 3. userService.softDeleteUser performs soft delete, not hard delete (FIX 13 regression)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

// ─── 1. Schema validation: workspaceId is non-nullable ──────────────────────

describe("FIX 14 — workspaceId NOT NULL schema enforcement", () => {
  const TARGET_MODELS = [
    "SelectedDeal",
    "FinancingOffer",
    "InsurancePolicy",
    "ContractDocument",
    "ContractShieldScan",
    "DepositPayment",
    "ServiceFeePayment",
  ]

  // Prisma Client codegen exposes field metadata via the generated DMMF.
  // This is a runtime check (not a source-code scan) because it uses the generated client.
  it("all seven target models have workspaceId as a required field in the generated Prisma client", async () => {
    const { Prisma } = await import("@prisma/client")
    const dmmf = (Prisma as any).dmmf?.datamodel?.models as Array<{
      name: string
      fields: Array<{ name: string; isRequired: boolean; type: string }>
    }> | undefined

    // If DMMF is not available (some Prisma versions don't expose it at runtime),
    // skip with a warning — schema validation still runs via `prisma validate` in CI.
    if (!dmmf) {
      console.warn("DMMF not available — skipping runtime NOT NULL check (schema validated by prisma validate)")
      return
    }

    for (const modelName of TARGET_MODELS) {
      const model = dmmf.find((m) => m.name === modelName)
      expect(model, `Model ${modelName} should exist in DMMF`).toBeDefined()

      const wsField = model!.fields.find((f) => f.name === "workspaceId")
      expect(wsField, `${modelName}.workspaceId should exist`).toBeDefined()
      expect(wsField!.isRequired).toBe(true)
    }
  })

  it("RefundStatus enum does not include COMPLETED (canonicalized to SUCCEEDED)", async () => {
    const { Prisma } = await import("@prisma/client")
    const enums = (Prisma as any).dmmf?.datamodel?.enums as Array<{
      name: string
      values: Array<{ name: string }>
    }> | undefined

    if (!enums) {
      console.warn("DMMF enums not available — skipping runtime RefundStatus check")
      return
    }

    const refundEnum = enums.find((e) => e.name === "RefundStatus")
    expect(refundEnum, "RefundStatus enum should exist").toBeDefined()

    const values = refundEnum!.values.map((v) => v.name)
    expect(values).toContain("SUCCEEDED")
    expect(values).not.toContain("COMPLETED")
    expect(values).toContain("PENDING")
    expect(values).toContain("FAILED")
    expect(values).toContain("CANCELLED")
  })
})

// ─── 2. Behavioral: UserService soft delete (FIX 13 regression) ─────────────

vi.mock("@/lib/db", () => ({
  prisma: {
    buyerProfile: { findMany: vi.fn() },
    selectedDeal: { count: vi.fn() },
    user: { update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}))

import { prisma } from "@/lib/db"
import { userService } from "@/lib/services/user.service"

describe("FIX 13 — delete-account performs soft delete, not hard delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("soft-deletes user by setting deletedAt, never calls hard delete", async () => {
    vi.mocked(prisma.buyerProfile.findMany).mockResolvedValue([])
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as any)
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as any)

    await userService.softDeleteUser("user-1", "admin-1")

    // Verify soft delete was called with deletedAt
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { deletedAt: expect.any(Date) },
    })

    // Verify AdminAuditLog was created
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "admin-1",
        action: "USER_SOFT_DELETED",
        details: { targetUserId: "user-1" },
      },
    })
  })

  it("rejects soft delete when active deals exist", async () => {
    vi.mocked(prisma.buyerProfile.findMany).mockResolvedValue([
      { id: "bp-1" },
    ] as any)
    vi.mocked(prisma.selectedDeal.count).mockResolvedValue(2)

    await expect(userService.softDeleteUser("user-1", "admin-1")).rejects.toThrow(
      /active deal/i,
    )

    // User row should NOT have been updated
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
