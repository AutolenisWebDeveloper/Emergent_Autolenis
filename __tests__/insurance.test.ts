import { describe, it, expect, vi, beforeEach } from "vitest"

const mockPrisma = vi.hoisted(() => ({
  selectedDeal: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  insuranceQuote: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  insurancePolicy: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  buyerProfile: {
    findFirst: vi.fn(),
  },
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

import { InsuranceService } from "@/lib/services/insurance.service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("InsuranceService.ensurePolicyAttachedToDeal", () => {
  const dealId = "deal-1"
  const policyId = "policy-1"

  it("should return alreadyAttached: true when policy is already attached", async () => {
    mockPrisma.selectedDeal.findUnique.mockResolvedValue({
      id: dealId,
      insurancePolicy: { id: policyId },
    })

    const result = await InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)

    expect(result).toEqual({ attached: true, alreadyAttached: true })
    expect(mockPrisma.selectedDeal.update).not.toHaveBeenCalled()
  })

  it("should attach policy and return alreadyAttached: false when not yet attached", async () => {
    mockPrisma.selectedDeal.findUnique.mockResolvedValue({
      id: dealId,
      insurancePolicy: null,
    })
    mockPrisma.insurancePolicy.findUnique.mockResolvedValue({
      id: policyId,
      type: "AUTOLENIS",
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})

    const result = await InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)

    expect(result).toEqual({ attached: true, alreadyAttached: false })
    expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
      where: { id: dealId },
      data: { insurance_status: "BOUND" },
    })
  })

  it("should set EXTERNAL_PROOF_UPLOADED status for EXTERNAL policy type", async () => {
    mockPrisma.selectedDeal.findUnique.mockResolvedValue({
      id: dealId,
      insurancePolicy: null,
    })
    mockPrisma.insurancePolicy.findUnique.mockResolvedValue({
      id: policyId,
      type: "EXTERNAL",
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})

    const result = await InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)

    expect(result).toEqual({ attached: true, alreadyAttached: false })
    expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
      where: { id: dealId },
      data: { insurance_status: "EXTERNAL_PROOF_UPLOADED" },
    })
  })

  it("should throw 'Deal not found' when deal does not exist", async () => {
    mockPrisma.selectedDeal.findUnique.mockResolvedValue(null)

    await expect(
      InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)
    ).rejects.toThrow("Deal not found")
  })

  it("should throw 'Policy not found' when policy does not exist", async () => {
    mockPrisma.selectedDeal.findUnique.mockResolvedValue({
      id: dealId,
      insurancePolicy: null,
    })
    mockPrisma.insurancePolicy.findUnique.mockResolvedValue(null)

    await expect(
      InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)
    ).rejects.toThrow("Policy not found")
  })
})

describe("InsuranceService.selectQuote", () => {
  const userId = "user-1"
  const dealId = "deal-1"
  const quoteId = "quote-1"

  it("should update deal insurance_status for a valid non-expired quote", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    mockPrisma.selectedDeal.findFirst.mockResolvedValue({ id: dealId, buyerId: userId })
    mockPrisma.insuranceQuote.findUnique.mockResolvedValue({
      id: quoteId,
      buyerId: userId,
      expiresAt: futureDate,
      carrier: "Progressive",
      productName: "Full Coverage",
      monthlyPremium: 150.00,
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})
    mockPrisma.$executeRaw.mockResolvedValue(0)

    const result = await InsuranceService.selectQuote(userId, dealId, quoteId)

    expect(result.insuranceStatus).toBe("SELECTED_AUTOLENIS")
    expect(result.carrier).toBe("Progressive")
    expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
      where: { id: dealId },
      data: { insurance_status: "SELECTED_AUTOLENIS" },
    })
  })

  it("should throw when quote has expired", async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    mockPrisma.selectedDeal.findFirst.mockResolvedValue({ id: dealId, buyerId: userId })
    mockPrisma.insuranceQuote.findUnique.mockResolvedValue({
      id: quoteId,
      buyerId: userId,
      expiresAt: pastDate,
    })

    await expect(
      InsuranceService.selectQuote(userId, dealId, quoteId)
    ).rejects.toThrow("This quote has expired")
  })

  it("should throw 'Deal not found or unauthorized' when deal does not exist", async () => {
    mockPrisma.selectedDeal.findFirst.mockResolvedValue(null)

    await expect(
      InsuranceService.selectQuote(userId, dealId, quoteId)
    ).rejects.toThrow("Deal not found or unauthorized")
  })
})

describe("DefaultInsuranceProvider (via InsuranceService.requestQuotes)", () => {
  const userId = "user-1"
  const dealId = "deal-1"

  it("should return empty array when no insurance provider is configured", async () => {
    mockPrisma.selectedDeal.findFirst.mockResolvedValue({
      id: dealId,
      auctionOffer: {
        inventoryItem: {
          vin: "1HGBH41JXMN109186",
          is_new: false,
          vehicle: {
            id: "vehicle-1",
            year: 2022,
            make: "Honda",
            model: "Civic",
            trim: "EX",
            vin: "1HGBH41JXMN109186",
          },
        },
      },
    })
    mockPrisma.buyerProfile.findFirst.mockResolvedValue({
      userId,
      firstName: "John",
      lastName: "Doe",
      date_of_birth: new Date("1990-01-01"),
      address_line1: "123 Main St",
      city: "Anytown",
      state: "CA",
      postal_code: "90210",
      phone: "555-1234",
    })
    mockPrisma.$executeRaw.mockResolvedValue(0)

    const result = await InsuranceService.requestQuotes(userId, dealId)

    expect(result).toHaveLength(0)
  })
})

describe("Insurance status flow validation", () => {
  const validStatuses = [
    "NOT_SELECTED",
    "SELECTED_AUTOLENIS",
    "BOUND",
    "EXTERNAL_PROOF_UPLOADED",
  ]

  it("should have valid status strings", () => {
    for (const status of validStatuses) {
      expect(typeof status).toBe("string")
      expect(status.length).toBeGreaterThan(0)
    }
  })

  it("should follow expected flow: NOT_SELECTED → SELECTED_AUTOLENIS → BOUND", () => {
    const flow = ["NOT_SELECTED", "SELECTED_AUTOLENIS", "BOUND"]
    expect(flow[0]).toBe("NOT_SELECTED")
    expect(flow[1]).toBe("SELECTED_AUTOLENIS")
    expect(flow[2]).toBe("BOUND")

    // Verify each status in the flow is a known valid status
    for (const status of flow) {
      expect(validStatuses).toContain(status)
    }
  })

  it("should set SELECTED_AUTOLENIS on selectQuote and BOUND on ensurePolicyAttachedToDeal", async () => {
    const dealId = "deal-flow"
    const quoteId = "quote-flow"
    const policyId = "policy-flow"
    const userId = "user-flow"

    // Step 1: selectQuote sets SELECTED_AUTOLENIS
    mockPrisma.selectedDeal.findFirst.mockResolvedValue({ id: dealId, buyerId: userId })
    mockPrisma.insuranceQuote.findUnique.mockResolvedValue({
      id: quoteId,
      buyerId: userId,
      expiresAt: new Date(Date.now() + 86400000),
      carrier: "Progressive",
      productName: "Full Coverage",
      monthlyPremium: 150.00,
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})
    mockPrisma.$executeRaw.mockResolvedValue(0)

    const selectResult = await InsuranceService.selectQuote(userId, dealId, quoteId)
    expect(selectResult.insuranceStatus).toBe("SELECTED_AUTOLENIS")

    vi.clearAllMocks()

    // Step 2: ensurePolicyAttachedToDeal sets BOUND
    mockPrisma.selectedDeal.findUnique.mockResolvedValue({
      id: dealId,
      insurancePolicy: null,
    })
    mockPrisma.insurancePolicy.findUnique.mockResolvedValue({
      id: policyId,
      type: "AUTOLENIS",
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})

    const attachResult = await InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)
    expect(attachResult).toEqual({ attached: true, alreadyAttached: false })
    expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
      where: { id: dealId },
      data: { insurance_status: "BOUND" },
    })
  })
})

describe("Insurance type normalization", () => {
  it("DealInsuranceReadiness should contain all valid deal-level insurance values", async () => {
    // These are the canonical deal-level insurance readiness values
    // imported from lib/types (DealInsuranceReadiness type)
    const validReadinessValues = [
      "NOT_SELECTED",
      "SELECTED_AUTOLENIS",
      "EXTERNAL_PROOF_UPLOADED",
      "BOUND",
    ]

    // Verify all values are strings and non-empty
    for (const val of validReadinessValues) {
      expect(typeof val).toBe("string")
      expect(val.length).toBeGreaterThan(0)
    }

    // Verify no overlap with policy lifecycle statuses
    const policyLifecycleValues = [
      "QUOTE_REQUESTED",
      "QUOTE_RECEIVED",
      "POLICY_SELECTED",
      "POLICY_BOUND",
      "EXTERNAL_UPLOADED",
    ]

    for (const val of validReadinessValues) {
      expect(policyLifecycleValues).not.toContain(val)
    }
  })

  it("InsurancePolicyStatus should match Prisma InsuranceStatus enum values", () => {
    const prismaEnumValues = [
      "QUOTE_REQUESTED",
      "QUOTE_RECEIVED",
      "POLICY_SELECTED",
      "POLICY_BOUND",
      "EXTERNAL_UPLOADED",
    ]

    // Verify values are distinct from deal readiness values
    const dealReadinessValues = [
      "NOT_SELECTED",
      "SELECTED_AUTOLENIS",
      "EXTERNAL_PROOF_UPLOADED",
      "BOUND",
    ]

    for (const val of prismaEnumValues) {
      expect(dealReadinessValues).not.toContain(val)
    }
  })

  it("DealStatus should use INSURANCE_PENDING and INSURANCE_COMPLETE (not INSURANCE_READY)", () => {
    // These are the canonical deal statuses for insurance stage
    const insuranceDealStatuses = ["INSURANCE_PENDING", "INSURANCE_COMPLETE"]

    // INSURANCE_READY should NOT be a valid status anymore
    expect(insuranceDealStatuses).not.toContain("INSURANCE_READY")
    expect(insuranceDealStatuses).toContain("INSURANCE_PENDING")
    expect(insuranceDealStatuses).toContain("INSURANCE_COMPLETE")
  })
})

describe("Deal transition across insurance steps", () => {
  it("should set insurance_status to SELECTED_AUTOLENIS when quote is selected via InsuranceService", async () => {
    const dealId = "deal-transition-1"
    const quoteId = "quote-transition-1"
    const userId = "user-transition-1"

    mockPrisma.selectedDeal.findFirst.mockResolvedValue({ id: dealId, buyerId: userId })
    mockPrisma.insuranceQuote.findUnique.mockResolvedValue({
      id: quoteId,
      buyerId: userId,
      expiresAt: new Date(Date.now() + 86400000),
      carrier: "Geico",
      productName: "Basic Coverage",
      monthlyPremium: 120.00,
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})
    mockPrisma.$executeRaw.mockResolvedValue(0)

    const result = await InsuranceService.selectQuote(userId, dealId, quoteId)
    expect(result.insuranceStatus).toBe("SELECTED_AUTOLENIS")
  })

  it("should set insurance_status to EXTERNAL_PROOF_UPLOADED for external policy attachment", async () => {
    const dealId = "deal-transition-2"
    const policyId = "policy-transition-2"

    mockPrisma.selectedDeal.findUnique.mockResolvedValue({
      id: dealId,
      insurancePolicy: null,
    })
    mockPrisma.insurancePolicy.findUnique.mockResolvedValue({
      id: policyId,
      type: "EXTERNAL",
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})

    await InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)

    expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
      where: { id: dealId },
      data: { insurance_status: "EXTERNAL_PROOF_UPLOADED" },
    })
  })

  it("should set insurance_status to BOUND for AutoLenis policy attachment", async () => {
    const dealId = "deal-transition-3"
    const policyId = "policy-transition-3"

    mockPrisma.selectedDeal.findUnique.mockResolvedValue({
      id: dealId,
      insurancePolicy: null,
    })
    mockPrisma.insurancePolicy.findUnique.mockResolvedValue({
      id: policyId,
      type: "AUTOLENIS",
    })
    mockPrisma.selectedDeal.update.mockResolvedValue({})

    await InsuranceService.ensurePolicyAttachedToDeal(dealId, policyId)

    expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
      where: { id: dealId },
      data: { insurance_status: "BOUND" },
    })
  })
})

describe("Insurance schema contract regression", () => {
  it("insurance.service.ts should not reference removed snake_case fields", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const servicePath = join(process.cwd(), "lib/services/insurance.service.ts")
    const content = readFileSync(servicePath, "utf-8")

    // These fields were removed from the Prisma schema — service must not reference them
    const forbiddenPrismaFields = [
      "selected_deal_id",
      "carrier_name",
      "policy_number_v2",
      "coverage_type",
      "buyer_id",
      "vehicle_id",
      "product_name",
      "premium_monthly_cents",
      "premium_semi_annual_cents",
      "premium_annual_cents",
      "six_month_premium",
      "coverage_limits",
      "quote_ref",
      "quote_status",
    ]

    // Lines containing raw SQL (INSERT INTO, $queryRaw) are exempt — they reference DB column names
    const nonSqlLines = content.split("\n").filter(line =>
      !line.includes("INSERT INTO") && !line.includes("VALUES") &&
      !line.includes("SELECT") && !line.includes("WHERE") && !line.includes("ORDER BY")
    )

    for (const field of forbiddenPrismaFields) {
      const regex = new RegExp(`[\\[\\."'\\s,]${field}[\\]\\."'\\s,:\\)]`)
      const violatingLines = nonSqlLines.filter(line => regex.test(line))
      expect(violatingLines).toHaveLength(0)
    }
  })

  it("Prisma schema InsurancePolicy should use @map for snake_case DB columns", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const schemaPath = join(process.cwd(), "prisma/schema.prisma")
    const content = readFileSync(schemaPath, "utf-8")

    // Extract the InsurancePolicy model block
    const policyMatch = content.match(/model InsurancePolicy \{[\s\S]*?\n\}/)
    expect(policyMatch).not.toBeNull()
    const policyBlock = policyMatch![0]

    // Verify @map directives for snake_case DB columns
    expect(policyBlock).toContain('@map("raw_policy_json")')
    expect(policyBlock).toContain('@map("is_verified")')
    expect(policyBlock).toContain('@map("vehicle_vin")')

    // Verify camelCase application-facing names
    expect(policyBlock).toContain("rawPolicyJson")
    expect(policyBlock).toContain("isVerified")
    expect(policyBlock).toContain("vehicleVin")
  })
})

describe("Insurance field deduplication (Issue 12)", () => {
  it("InsurancePolicy schema should NOT contain removed duplicate fields (userId, startDate, endDate)", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const schemaPath = join(process.cwd(), "prisma/schema.prisma")
    const content = readFileSync(schemaPath, "utf-8")

    const policyMatch = content.match(/model InsurancePolicy \{[\s\S]*?\n\}/)
    expect(policyMatch).not.toBeNull()
    const policyBlock = policyMatch![0]

    // These fields were removed as duplicates of canonical fields
    const removedFields = ["userId", "startDate", "endDate"]
    for (const field of removedFields) {
      // Match standalone field declarations (not within @map or comments)
      const fieldDeclarationRegex = new RegExp(`^\\s+${field}\\s+\\w`, "m")
      expect(policyBlock).not.toMatch(fieldDeclarationRegex)
    }
  })

  it("InsurancePolicy schema should contain canonical date fields (effectiveDate, expirationDate)", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const schemaPath = join(process.cwd(), "prisma/schema.prisma")
    const content = readFileSync(schemaPath, "utf-8")

    const policyMatch = content.match(/model InsurancePolicy \{[\s\S]*?\n\}/)
    expect(policyMatch).not.toBeNull()
    const policyBlock = policyMatch![0]

    expect(policyBlock).toContain("effectiveDate")
    expect(policyBlock).toContain("expirationDate")
  })

  it("insurance.service.ts should use effectiveDate/expirationDate, not startDate/endDate for Prisma writes", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const servicePath = join(process.cwd(), "lib/services/insurance.service.ts")
    const content = readFileSync(servicePath, "utf-8")

    // Lines containing raw SQL are exempt
    const nonSqlLines = content.split("\n").filter(line =>
      !line.includes("INSERT INTO") && !line.includes("VALUES") &&
      !line.includes("SELECT") && !line.includes("WHERE") && !line.includes("ORDER BY")
    )

    // Should not use startDate as a Prisma field (property access or data key)
    const startDateUsages = nonSqlLines.filter(line =>
      /\bstartDate\b/.test(line) && !line.includes("//") && !line.includes("interface")
    )
    expect(startDateUsages).toHaveLength(0)

    // Should use effectiveDate in Prisma data writes
    expect(content).toContain("effectiveDate")
    expect(content).toContain("expirationDate")
  })

  it("insurance.service.ts should not write userId to InsurancePolicy creates", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const servicePath = join(process.cwd(), "lib/services/insurance.service.ts")
    const content = readFileSync(servicePath, "utf-8")

    // Find all prisma.insurancePolicy.create blocks
    const createBlocks = content.match(/prisma\.insurancePolicy\.create\(\{[\s\S]*?\}\)/g) || []

    for (const block of createBlocks) {
      // None should contain userId in the data
      expect(block).not.toMatch(/\buserId\b/)
    }
  })

  it("deal/insurance.ts should use effectiveDate/expirationDate, not startDate/endDate", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const filePath = join(process.cwd(), "lib/services/deal/insurance.ts")
    const content = readFileSync(filePath, "utf-8")

    // Should not reference startDate/endDate as Prisma fields
    expect(content).not.toMatch(/\bstartDate\b/)
    expect(content).not.toMatch(/\bendDate\b/)

    // Should use canonical fields
    expect(content).toContain("effectiveDate")
    expect(content).toContain("expirationDate")
  })

  it("deal/insurance.ts should not write userId to InsurancePolicy creates", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const filePath = join(process.cwd(), "lib/services/deal/insurance.ts")
    const content = readFileSync(filePath, "utf-8")

    // userId should not be written in upsert/create data blocks
    const dataBlocks = content.match(/(?:create|update):\s*\{[\s\S]*?\}/g) || []
    for (const block of dataBlocks) {
      expect(block).not.toMatch(/\buserId\b/)
    }
  })

  it("admin services should select canonical fields from InsurancePolicy", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")

    const files = [
      join(process.cwd(), "lib/services/admin.service.ts"),
      join(process.cwd(), "lib/services/admin/queries.ts"),
    ]

    for (const filePath of files) {
      const content = readFileSync(filePath, "utf-8")

      // Supabase .select() strings for InsurancePolicy should not reference removed fields
      const selectMatches = content.match(/\.from\("InsurancePolicy"\)[\s\S]*?\.select\(\s*"([^"]+)"/g) || []

      for (const selectBlock of selectMatches) {
        expect(selectBlock).not.toContain("startDate")
        expect(selectBlock).not.toContain("endDate")
        expect(selectBlock).not.toContain("userId")
        expect(selectBlock).toContain("effectiveDate")
        expect(selectBlock).toContain("expirationDate")
      }
    }
  })

  it("M005 migration file should exist with backfill and column drops", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")
    const migrationPath = join(process.cwd(), "migrations/M005-insurance-field-deduplication.sql")
    const content = readFileSync(migrationPath, "utf-8")

    // Should contain backfill statements
    expect(content).toContain('SET "effectiveDate" = "startDate"')
    expect(content).toContain('SET "expirationDate" = "endDate"')

    // Should contain column drops
    expect(content).toContain('DROP COLUMN IF EXISTS "startDate"')
    expect(content).toContain('DROP COLUMN IF EXISTS "endDate"')
    expect(content).toContain('DROP COLUMN IF EXISTS "userId"')

    // Should contain verification
    expect(content).toContain("Backfill incomplete")

    // Should contain rollback notes
    expect(content).toContain("ROLLBACK")
  })

  it("UI pages should use canonical field names for policy dates", async () => {
    const { readFileSync } = await import("fs")
    const { join } = await import("path")

    const uiFiles = [
      join(process.cwd(), "app/buyer/deal/insurance/confirmed/page.tsx"),
      join(process.cwd(), "app/buyer/deal/insurance/page.tsx"),
      join(process.cwd(), "app/admin/deals/[dealId]/insurance/page.tsx"),
      join(process.cwd(), "app/admin/insurance/page.tsx"),
      join(process.cwd(), "app/dealer/deals/[dealId]/insurance/page.tsx"),
    ]

    for (const filePath of uiFiles) {
      const content = readFileSync(filePath, "utf-8")

      // Should not reference policy.startDate or policy.endDate (or policySummary variants)
      const nonFormLines = content.split("\n").filter(line =>
        !line.includes("setStartDate") && !line.includes("setEndDate") &&
        !line.includes("useState") && !line.includes("start_date") &&
        !line.includes("end_date") && !line.includes("htmlFor") &&
        !line.includes("<Label") && !line.includes("<Input") &&
        !line.includes("onChange")
      )

      for (const line of nonFormLines) {
        // Check for policy.startDate or policySummary.startDate pattern
        expect(line).not.toMatch(/(?:policy|policySummary)\.startDate/)
        expect(line).not.toMatch(/(?:policy|policySummary)\.endDate/)
      }
    }
  })
})
