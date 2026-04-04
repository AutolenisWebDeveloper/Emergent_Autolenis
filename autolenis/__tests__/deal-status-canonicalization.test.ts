import { describe, it, expect, vi } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"

// Mock server-only DB import and payment service (same pattern as deal-status.test.ts)
vi.mock("@/lib/db", () => ({
  prisma: {
    selectedDeal: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}))
vi.mock("@/lib/services/payment.service", () => ({
  PaymentService: {},
}))

import { DealStatus, normalizeDealStatus, VALID_TRANSITIONS } from "@/lib/services/deal/types"

describe("Deal status canonicalization", () => {
  it("should have status as the only lifecycle field in Prisma schema", () => {
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma")
    const schema = fs.readFileSync(schemaPath, "utf-8")

    // Extract the SelectedDeal model block
    const modelMatch = schema.match(/model SelectedDeal \{[\s\S]*?\n\}/)
    expect(modelMatch).toBeTruthy()

    const modelBlock = modelMatch![0]

    // Ensure 'status' field exists
    expect(modelBlock).toContain("status")
    expect(modelBlock).toContain("DealStatus")

    // Ensure 'deal_status' field does NOT exist
    expect(modelBlock).not.toContain("deal_status")
  })

  it("should not reference deal_status as a field in any service file", () => {
    const serviceFiles = [
      "lib/services/deal/creation.ts",
      "lib/services/deal/financing.ts",
      "lib/services/deal/insurance.ts",
      "lib/services/deal/status.ts",
      "lib/services/deal/retrieval.ts",
      "lib/services/deal/types.ts",
      "lib/services/deal/index.ts",
    ]

    for (const file of serviceFiles) {
      const filePath = path.join(process.cwd(), file)
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, "utf-8")

      // Allow deal_status_history (table name) but not deal_status as a field
      const lines = content.split("\n")
      for (const line of lines) {
        if (line.includes("deal_status") && !line.includes("deal_status_history") && !line.includes("dealStatusHistory")) {
          throw new Error(
            `File ${file} still references deal_status field: ${line.trim()}`
          )
        }
      }
    }
  })

  it("should not reference deal_status in route handlers", () => {
    const routeFiles = [
      "app/api/admin/deals/[dealId]/status/route.ts",
      "app/api/buyer/auctions/[auctionId]/deals/select/route.ts",
      "app/api/buyer/deal/complete/route.ts",
    ]

    for (const file of routeFiles) {
      const filePath = path.join(process.cwd(), file)
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, "utf-8")

      const lines = content.split("\n")
      for (const line of lines) {
        if (line.includes("deal_status") && !line.includes("deal_status_history") && !line.includes("dealStatusHistory")) {
          throw new Error(
            `Route ${file} still references deal_status: ${line.trim()}`
          )
        }
      }
    }
  })

  it("should not reference deal_status in contract-shield service files", () => {
    const csFiles = [
      "lib/services/contract-shield.service.ts",
      "lib/services/contract-shield/scanner.ts",
      "lib/services/contract-shield/overrides.ts",
      "lib/services/contract-shield/reconciliation.ts",
    ]

    for (const file of csFiles) {
      const filePath = path.join(process.cwd(), file)
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, "utf-8")

      const lines = content.split("\n")
      for (const line of lines) {
        if (line.includes("deal_status") && !line.includes("deal_status_history") && !line.includes("dealStatusHistory")) {
          throw new Error(
            `File ${file} still references deal_status: ${line.trim()}`
          )
        }
      }
    }
  })

  it("should not reference deal_status in payment/pickup/esign services", () => {
    const files = [
      "lib/services/payment.service.ts",
      "lib/services/pickup.service.ts",
      "lib/services/esign.service.ts",
    ]

    for (const file of files) {
      const filePath = path.join(process.cwd(), file)
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, "utf-8")

      const lines = content.split("\n")
      for (const line of lines) {
        if (line.includes("deal_status") && !line.includes("deal_status_history") && !line.includes("dealStatusHistory")) {
          throw new Error(
            `File ${file} still references deal_status: ${line.trim()}`
          )
        }
      }
    }
  })

  it("should have all 18 DealStatus values in the canonical enum", () => {
    const expected = [
      "SELECTED",
      "FINANCING_PENDING",
      "FINANCING_APPROVED",
      "FEE_PENDING",
      "FEE_PAID",
      "INSURANCE_PENDING",
      "INSURANCE_COMPLETE",
      "CONTRACT_PENDING",
      "CONTRACT_REVIEW",
      "CONTRACT_MANUAL_REVIEW_REQUIRED",
      "CONTRACT_INTERNAL_FIX_IN_PROGRESS",
      "CONTRACT_ADMIN_OVERRIDE_APPROVED",
      "CONTRACT_APPROVED",
      "SIGNING_PENDING",
      "SIGNED",
      "PICKUP_SCHEDULED",
      "COMPLETED",
      "CANCELLED",
    ]

    const values = Object.values(DealStatus)
    expect(values).toEqual(expected)
  })

  it("should normalize legacy deal_status values to canonical status values", () => {
    expect(normalizeDealStatus("PENDING_FINANCING")).toBe("FINANCING_PENDING")
    expect(normalizeDealStatus("FINANCING_CHOSEN")).toBe("FINANCING_APPROVED")
    expect(normalizeDealStatus("INSURANCE_READY")).toBe("INSURANCE_PENDING")
    expect(normalizeDealStatus("CONTRACT_PASSED")).toBe("CONTRACT_APPROVED")
  })

  it("should have valid transitions defined for all non-terminal states", () => {
    const terminalStates: (typeof DealStatus)[keyof typeof DealStatus][] = ["COMPLETED", "CANCELLED"]

    for (const status of Object.values(DealStatus)) {
      if (terminalStates.includes(status)) {
        // Terminal states should have empty or no transitions
        const transitions = VALID_TRANSITIONS[status] || []
        expect(transitions).toEqual([])
      } else {
        // Non-terminal states should have at least one transition
        const transitions = VALID_TRANSITIONS[status]
        expect(transitions).toBeDefined()
        expect(transitions!.length).toBeGreaterThan(0)
      }
    }
  })

  it("migration M001 exists and contains backfill + drop logic", () => {
    const migrationPath = path.join(process.cwd(), "migrations", "M001-deal-status-canonicalization.sql")
    expect(fs.existsSync(migrationPath)).toBe(true)

    const content = fs.readFileSync(migrationPath, "utf-8")
    expect(content).toContain("DROP COLUMN")
    expect(content).toContain("deal_status")
    expect(content).toContain("PENDING_FINANCING")
    expect(content).toContain("FINANCING_PENDING")
    expect(content).toContain("CONTRACT_PASSED")
    expect(content).toContain("CONTRACT_APPROVED")
  })
})
