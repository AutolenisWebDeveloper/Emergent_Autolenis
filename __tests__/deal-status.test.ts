import { describe, it, expect, vi } from "vitest"

// Mock server-only DB import and payment service (same pattern as insurance.test.ts)
vi.mock("@/lib/db", () => ({
  prisma: {
    selectedDeal: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}))
vi.mock("@/lib/services/payment.service", () => ({
  PaymentService: {},
}))

import { normalizeDealStatus, DealStatus } from "@/lib/services/deal.service"

describe("normalizeDealStatus", () => {
  it("should pass through valid Prisma DealStatus values unchanged", () => {
    const prismaValues: DealStatus[] = [
      "SELECTED",
      "FINANCING_PENDING",
      "FINANCING_APPROVED",
      "FEE_PENDING",
      "FEE_PAID",
      "INSURANCE_PENDING",
      "INSURANCE_COMPLETE",
      "CONTRACT_PENDING",
      "CONTRACT_REVIEW",
      "CONTRACT_APPROVED",
      "SIGNING_PENDING",
      "SIGNED",
      "PICKUP_SCHEDULED",
      "COMPLETED",
      "CANCELLED",
    ]

    for (const status of prismaValues) {
      expect(normalizeDealStatus(status)).toBe(status)
    }
  })

  it("should map legacy PENDING_FINANCING to FINANCING_PENDING", () => {
    expect(normalizeDealStatus("PENDING_FINANCING")).toBe("FINANCING_PENDING")
  })

  it("should map legacy FINANCING_CHOSEN to FINANCING_APPROVED", () => {
    expect(normalizeDealStatus("FINANCING_CHOSEN")).toBe("FINANCING_APPROVED")
  })

  it("should map legacy INSURANCE_READY to INSURANCE_PENDING", () => {
    expect(normalizeDealStatus("INSURANCE_READY")).toBe("INSURANCE_PENDING")
  })

  it("should map legacy CONTRACT_PASSED to CONTRACT_APPROVED", () => {
    expect(normalizeDealStatus("CONTRACT_PASSED")).toBe("CONTRACT_APPROVED")
  })

  it("should return null for unknown strings", () => {
    expect(normalizeDealStatus("TOTALLY_INVALID")).toBeNull()
    expect(normalizeDealStatus("")).toBeNull()
  })

  it("should return null for non-string values", () => {
    expect(normalizeDealStatus(null)).toBeNull()
    expect(normalizeDealStatus(undefined)).toBeNull()
    expect(normalizeDealStatus(42)).toBeNull()
  })
})

describe("DealStatus alignment with Prisma", () => {
  it("should NOT have INSURANCE_READY, FINANCING_CHOSEN, PENDING_FINANCING, or CONTRACT_PASSED in Prisma enum", () => {
    const prismaValues = Object.values(DealStatus)

    expect(prismaValues).not.toContain("INSURANCE_READY")
    expect(prismaValues).not.toContain("FINANCING_CHOSEN")
    expect(prismaValues).not.toContain("PENDING_FINANCING")
    expect(prismaValues).not.toContain("CONTRACT_PASSED")
  })

  it("should have all expected Prisma DealStatus values", () => {
    const prismaValues = Object.values(DealStatus)

    expect(prismaValues).toContain("SELECTED")
    expect(prismaValues).toContain("FINANCING_PENDING")
    expect(prismaValues).toContain("FINANCING_APPROVED")
    expect(prismaValues).toContain("FEE_PENDING")
    expect(prismaValues).toContain("FEE_PAID")
    expect(prismaValues).toContain("INSURANCE_PENDING")
    expect(prismaValues).toContain("INSURANCE_COMPLETE")
    expect(prismaValues).toContain("CONTRACT_PENDING")
    expect(prismaValues).toContain("CONTRACT_REVIEW")
    expect(prismaValues).toContain("CONTRACT_APPROVED")
    expect(prismaValues).toContain("SIGNING_PENDING")
    expect(prismaValues).toContain("SIGNED")
    expect(prismaValues).toContain("PICKUP_SCHEDULED")
    expect(prismaValues).toContain("COMPLETED")
    expect(prismaValues).toContain("CANCELLED")
  })
})
