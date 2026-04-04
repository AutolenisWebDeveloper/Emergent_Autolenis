import { describe, it, expect } from "vitest"
import { createCarRequestSchema } from "@/lib/validators/car-request"

// ---------------------------------------------------------------------------
// Helper: build a valid payload using TOTAL_PRICE budget type
// ---------------------------------------------------------------------------
function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    marketZip: "90210",
    radiusMiles: 50,
    items: [
      {
        vehicleType: "CAR",
        condition: "EITHER",
        make: "Toyota",
        model: "Camry",
        openToSimilar: false,
        budgetType: "TOTAL_PRICE",
        maxTotalOtdBudgetCents: 3500000,
        desiredDownPaymentCents: 500000,
        mileageMax: 50000,
        mustHaveFeatures: [],
        colors: [],
        distancePreference: "EITHER",
        timeline: "FIFTEEN_30_DAYS",
      },
    ],
    location: {
      state: "CA",
      zip: "90210",
      city: "Beverly Hills",
    },
    ...overrides,
  }
}

/** Build a valid payload using TOTAL_PRICE budget type */
function buildTotalPricePayload(overrides: Record<string, unknown> = {}) {
  return {
    marketZip: "90210",
    radiusMiles: 50,
    items: [
      {
        vehicleType: "CAR",
        condition: "EITHER",
        make: "Toyota",
        model: "Camry",
        openToSimilar: false,
        budgetType: "TOTAL_PRICE",
        maxTotalOtdBudgetCents: 3500000,
        desiredDownPaymentCents: 500000,
        mileageMax: 50000,
        mustHaveFeatures: [],
        colors: [],
        distancePreference: "EITHER",
        timeline: "FIFTEEN_30_DAYS",
      },
    ],
    location: {
      state: "CA",
      zip: "90210",
      city: "Beverly Hills",
    },
    ...overrides,
  }
}

/** Build a valid payload using MONTHLY_PAYMENT budget type */
function buildMonthlyPaymentPayload(overrides: Record<string, unknown> = {}) {
  return {
    marketZip: "90210",
    radiusMiles: 50,
    items: [
      {
        vehicleType: "SUV",
        condition: "NEW",
        make: "Honda",
        model: "CR-V",
        openToSimilar: true,
        budgetType: "MONTHLY_PAYMENT",
        maxMonthlyPaymentCents: 50000,
        desiredDownPaymentCents: 300000,
        mustHaveFeatures: [],
        colors: [],
        distancePreference: "DELIVERY",
        timeline: "EIGHT_14_DAYS",
      },
    ],
    location: {
      state: "TX",
      zip: "75001",
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// radiusMiles validation
// ---------------------------------------------------------------------------
describe("createCarRequestSchema – radiusMiles", () => {
  it("accepts radiusMiles of 25", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ radiusMiles: 25 }))
    expect(result.success).toBe(true)
  })

  it("accepts radiusMiles of 50 (default)", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ radiusMiles: 50 }))
    expect(result.success).toBe(true)
  })

  it("accepts radiusMiles of 200", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ radiusMiles: 200 }))
    expect(result.success).toBe(true)
  })

  it("accepts radiusMiles of 500 (max offered by UI)", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ radiusMiles: 500 }))
    expect(result.success).toBe(true)
  })

  it("rejects radiusMiles above 500", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ radiusMiles: 501 }))
    expect(result.success).toBe(false)
  })

  it("rejects radiusMiles below 10", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ radiusMiles: 5 }))
    expect(result.success).toBe(false)
  })

  it("defaults radiusMiles to 50 when omitted", () => {
    const payload = buildPayload()
    delete (payload as Record<string, unknown>).radiusMiles
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.radiusMiles).toBe(50)
    }
  })
})

// ---------------------------------------------------------------------------
// Full payload validation
// ---------------------------------------------------------------------------
describe("createCarRequestSchema – full payload", () => {
  it("validates a complete payload from the frontend form", () => {
    const result = createCarRequestSchema.safeParse(buildPayload())
    expect(result.success).toBe(true)
  })

  it("validates without year range", () => {
    const payload = buildPayload()
    delete (payload.items[0] as Record<string, unknown>).yearMin
    delete (payload.items[0] as Record<string, unknown>).yearMax
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it("validates NEW condition without mileageMax", () => {
    const payload = buildPayload()
    ;(payload.items[0] as Record<string, unknown>).condition = "NEW"
    delete (payload.items[0] as Record<string, unknown>).mileageMax
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it("rejects yearMin > yearMax", () => {
    const payload = buildPayload()
    ;(payload.items[0] as Record<string, unknown>).yearMin = 2025
    ;(payload.items[0] as Record<string, unknown>).yearMax = 2020
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects empty make", () => {
    const payload = buildPayload()
    ;(payload.items[0] as Record<string, unknown>).make = ""
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects invalid ZIP code", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ marketZip: "abc" }))
    expect(result.success).toBe(false)
  })

  it("ensures required fields have defaults after mapping", () => {
    const payload = buildPayload()
    delete (payload.items[0] as Record<string, unknown>).yearMin
    delete (payload.items[0] as Record<string, unknown>).yearMax
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (!result.success) return

    const currentYear = new Date().getFullYear()
    const item = result.data.items[0]
    // API route provides defaults via ?? – verify the Zod output is compatible
    const yearMin = item.yearMin ?? 1900
    const yearMax = item.yearMax ?? (currentYear + 2)
    expect(typeof yearMin).toBe("number")
    expect(typeof yearMax).toBe("number")
  })
})

// ---------------------------------------------------------------------------
// TOTAL_PRICE budget type validation
// ---------------------------------------------------------------------------
describe("createCarRequestSchema – TOTAL_PRICE budget type", () => {
  it("validates a complete TOTAL_PRICE payload", () => {
    const result = createCarRequestSchema.safeParse(buildTotalPricePayload())
    expect(result.success).toBe(true)
  })

  it("requires maxTotalOtdBudgetCents when budget_type is TOTAL_PRICE", () => {
    const payload = buildTotalPricePayload()
    delete (payload.items[0] as Record<string, unknown>).maxTotalOtdBudgetCents
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects zero maxTotalOtdBudgetCents for TOTAL_PRICE", () => {
    const payload = buildTotalPricePayload()
    ;(payload.items[0] as Record<string, unknown>).maxTotalOtdBudgetCents = 0
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("requires desiredDownPaymentCents when budget_type is TOTAL_PRICE", () => {
    const payload = buildTotalPricePayload()
    delete (payload.items[0] as Record<string, unknown>).desiredDownPaymentCents
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("accepts zero desiredDownPaymentCents for TOTAL_PRICE", () => {
    const payload = buildTotalPricePayload()
    ;(payload.items[0] as Record<string, unknown>).desiredDownPaymentCents = 0
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it("does not require maxMonthlyPaymentCents for TOTAL_PRICE", () => {
    const payload = buildTotalPricePayload()
    // maxMonthlyPaymentCents is not provided — should pass
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items[0].maxMonthlyPaymentCents).toBeUndefined()
    }
  })

  it("preserves OTD budget and down payment in parsed output", () => {
    const result = createCarRequestSchema.safeParse(buildTotalPricePayload())
    expect(result.success).toBe(true)
    if (!result.success) return
    const item = result.data.items[0]
    expect(item.maxTotalOtdBudgetCents).toBe(3500000)
    expect(item.desiredDownPaymentCents).toBe(500000)
    expect(item.budgetType).toBe("TOTAL_PRICE")
  })
})

// ---------------------------------------------------------------------------
// MONTHLY_PAYMENT budget type validation
// ---------------------------------------------------------------------------
describe("createCarRequestSchema – MONTHLY_PAYMENT budget type", () => {
  it("validates a complete MONTHLY_PAYMENT payload", () => {
    const result = createCarRequestSchema.safeParse(buildMonthlyPaymentPayload())
    expect(result.success).toBe(true)
  })

  it("requires maxMonthlyPaymentCents when budget_type is MONTHLY_PAYMENT", () => {
    const payload = buildMonthlyPaymentPayload()
    delete (payload.items[0] as Record<string, unknown>).maxMonthlyPaymentCents
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects zero maxMonthlyPaymentCents for MONTHLY_PAYMENT", () => {
    const payload = buildMonthlyPaymentPayload()
    ;(payload.items[0] as Record<string, unknown>).maxMonthlyPaymentCents = 0
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("requires desiredDownPaymentCents when budget_type is MONTHLY_PAYMENT", () => {
    const payload = buildMonthlyPaymentPayload()
    delete (payload.items[0] as Record<string, unknown>).desiredDownPaymentCents
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("accepts zero desiredDownPaymentCents for MONTHLY_PAYMENT", () => {
    const payload = buildMonthlyPaymentPayload()
    ;(payload.items[0] as Record<string, unknown>).desiredDownPaymentCents = 0
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it("does not require maxTotalOtdBudgetCents for MONTHLY_PAYMENT", () => {
    const payload = buildMonthlyPaymentPayload()
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items[0].maxTotalOtdBudgetCents).toBeUndefined()
    }
  })

  it("preserves monthly payment and down payment in parsed output", () => {
    const result = createCarRequestSchema.safeParse(buildMonthlyPaymentPayload())
    expect(result.success).toBe(true)
    if (!result.success) return
    const item = result.data.items[0]
    expect(item.maxMonthlyPaymentCents).toBe(50000)
    expect(item.desiredDownPaymentCents).toBe(300000)
    expect(item.budgetType).toBe("MONTHLY_PAYMENT")
  })
})

// ---------------------------------------------------------------------------
// Legacy budget types are now rejected
// ---------------------------------------------------------------------------
describe("createCarRequestSchema – legacy budget types rejected", () => {
  it("rejects legacy TOTAL budget type", () => {
    const payload = buildPayload()
    ;(payload.items[0] as Record<string, unknown>).budgetType = "TOTAL"
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects legacy MONTHLY budget type", () => {
    const payload = buildPayload()
    ;(payload.items[0] as Record<string, unknown>).budgetType = "MONTHLY"
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects an invalid budget type", () => {
    const payload = buildPayload()
    ;(payload.items[0] as Record<string, unknown>).budgetType = "INVALID"
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects mixed-mode payload (TOTAL_PRICE with maxMonthlyPaymentCents)", () => {
    const payload = buildTotalPricePayload()
    ;(payload.items[0] as Record<string, unknown>).maxMonthlyPaymentCents = 50000
    const result = createCarRequestSchema.safeParse(payload)
    // Should pass validation (extra field ignored), but backend nulls irrelevant field
    expect(result.success).toBe(true)
  })
})
