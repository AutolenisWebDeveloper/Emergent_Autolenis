import { describe, it, expect } from "vitest"
import {
  financingChoiceSchema,
  depositPaymentSchema,
  uuidSchema,
} from "@/lib/validators/api"
import {
  buyerProfileSchema,
  softPullConsentSchema,
  preQualStartSchema,
} from "@/lib/validators/prequal"

// ---------------------------------------------------------------------------
// Helper: valid UUID for reuse
// ---------------------------------------------------------------------------
const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// ═══════════════════════════════════════════════════════════════════════════
// 1. financingChoiceSchema
// ═══════════════════════════════════════════════════════════════════════════
describe("financingChoiceSchema", () => {
  it("accepts a valid CASH payment", () => {
    const result = financingChoiceSchema.safeParse({ payment_type: "CASH" })
    expect(result.success).toBe(true)
  })

  it("accepts a valid FINANCED payment with offer ID", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "FINANCED",
      primary_financing_offer_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it("accepts EXTERNAL_PREAPPROVAL with external preapproval", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000,
        apr: 5.5,
        term_months: 60,
        document_url: "https://example.com/doc.pdf",
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing payment_type", () => {
    const result = financingChoiceSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes("payment_type"))).toBe(true)
    }
  })

  it("rejects invalid payment_type value", () => {
    const result = financingChoiceSchema.safeParse({ payment_type: "BARTER" })
    expect(result.success).toBe(false)
  })

  it("rejects non-UUID primary_financing_offer_id", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "FINANCED",
      primary_financing_offer_id: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("rejects external_preapproval with empty lender_name", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "",
        approved_amount_cents: 2500000,
        apr: 5.5,
        term_months: 60,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative approved_amount_cents", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: -100,
        apr: 5.5,
        term_months: 60,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects zero approved_amount_cents", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 0,
        apr: 5.5,
        term_months: 60,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects APR above 100", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000,
        apr: 101,
        term_months: 60,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects negative APR", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000,
        apr: -1,
        term_months: 60,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects term_months of 0", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000,
        apr: 5.5,
        term_months: 0,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects term_months exceeding 360", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000,
        apr: 5.5,
        term_months: 361,
      },
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid document_url", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000,
        apr: 5.5,
        term_months: 60,
        document_url: "not-a-url",
      },
    })
    expect(result.success).toBe(false)
  })

  it("accepts external_preapproval without document_url (optional)", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000,
        apr: 5.5,
        term_months: 60,
      },
    })
    expect(result.success).toBe(true)
  })

  it("accepts APR of exactly 0 (zero-interest)", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Promo",
        approved_amount_cents: 1000000,
        apr: 0,
        term_months: 36,
      },
    })
    expect(result.success).toBe(true)
  })

  it("rejects fractional approved_amount_cents", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "Chase",
        approved_amount_cents: 2500000.5,
        apr: 5.5,
        term_months: 60,
      },
    })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. depositPaymentSchema
// ═══════════════════════════════════════════════════════════════════════════
describe("depositPaymentSchema", () => {
  it("accepts a valid UUID auctionId", () => {
    const result = depositPaymentSchema.safeParse({ auctionId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it("rejects missing auctionId", () => {
    const result = depositPaymentSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects non-UUID auctionId", () => {
    const result = depositPaymentSchema.safeParse({ auctionId: "12345" })
    expect(result.success).toBe(false)
  })

  it("rejects null auctionId", () => {
    const result = depositPaymentSchema.safeParse({ auctionId: null })
    expect(result.success).toBe(false)
  })

  it("rejects numeric auctionId", () => {
    const result = depositPaymentSchema.safeParse({ auctionId: 42 })
    expect(result.success).toBe(false)
  })

  it("rejects empty string auctionId", () => {
    const result = depositPaymentSchema.safeParse({ auctionId: "" })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. uuidSchema (standalone)
// ═══════════════════════════════════════════════════════════════════════════
describe("uuidSchema", () => {
  it("accepts valid UUID v4", () => {
    expect(uuidSchema.safeParse(VALID_UUID).success).toBe(true)
  })

  it("rejects empty string", () => {
    expect(uuidSchema.safeParse("").success).toBe(false)
  })

  it("rejects random text", () => {
    expect(uuidSchema.safeParse("hello-world").success).toBe(false)
  })

  it("rejects UUID with missing section", () => {
    expect(uuidSchema.safeParse("a1b2c3d4-e5f6-7890-abcd").success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. buyerProfileSchema boundary cases
// ═══════════════════════════════════════════════════════════════════════════
describe("buyerProfileSchema – boundary cases", () => {
  it("accepts an empty object (all fields optional)", () => {
    const result = buyerProfileSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts a valid full profile", () => {
    const result = buyerProfileSchema.safeParse({
      firstName: "Jane",
      lastName: "Doe",
      phone: "5551234567",
      dateOfBirth: "1990-01-15",
      addressLine1: "123 Main St",
      city: "Anytown",
      state: "CA",
      postalCode: "90210",
      employmentStatus: "employed",
      monthlyIncomeCents: 600000,
      monthlyHousingCents: 150000,
    })
    expect(result.success).toBe(true)
  })

  it("rejects phone with letters", () => {
    const result = buyerProfileSchema.safeParse({ phone: "555ABC1234" })
    expect(result.success).toBe(false)
  })

  it("rejects phone with wrong digit count", () => {
    const result = buyerProfileSchema.safeParse({ phone: "12345" })
    expect(result.success).toBe(false)
  })

  it("rejects malformed dateOfBirth", () => {
    const result = buyerProfileSchema.safeParse({ dateOfBirth: "01/15/1990" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid postalCode", () => {
    const result = buyerProfileSchema.safeParse({ postalCode: "ABCDE" })
    expect(result.success).toBe(false)
  })

  it("accepts 9-digit ZIP (ZIP+4)", () => {
    const result = buyerProfileSchema.safeParse({ postalCode: "90210-1234" })
    expect(result.success).toBe(true)
  })

  it("rejects negative monthlyIncomeCents", () => {
    const result = buyerProfileSchema.safeParse({ monthlyIncomeCents: -1 })
    expect(result.success).toBe(false)
  })

  it("accepts zero monthlyIncomeCents", () => {
    const result = buyerProfileSchema.safeParse({ monthlyIncomeCents: 0 })
    expect(result.success).toBe(true)
  })

  it("rejects negative monthlyHousingCents", () => {
    const result = buyerProfileSchema.safeParse({ monthlyHousingCents: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects invalid employmentStatus enum value", () => {
    const result = buyerProfileSchema.safeParse({ employmentStatus: "freelancer" })
    expect(result.success).toBe(false)
  })

  it("rejects fractional monthlyIncomeCents", () => {
    const result = buyerProfileSchema.safeParse({ monthlyIncomeCents: 100.5 })
    expect(result.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. softPullConsentSchema boundary cases
// ═══════════════════════════════════════════════════════════════════════════
describe("softPullConsentSchema – boundary cases", () => {
  it("accepts consent with consentGiven=true", () => {
    const result = softPullConsentSchema.safeParse({ consentGiven: true })
    expect(result.success).toBe(true)
  })

  it("rejects consentGiven=false", () => {
    const result = softPullConsentSchema.safeParse({ consentGiven: false })
    expect(result.success).toBe(false)
  })

  it("rejects missing consentGiven", () => {
    const result = softPullConsentSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects SSN with wrong digit count", () => {
    const result = softPullConsentSchema.safeParse({
      consentGiven: true,
      ssn: "12345",
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid 9-digit SSN", () => {
    const result = softPullConsentSchema.safeParse({
      consentGiven: true,
      ssn: "123456789",
    })
    expect(result.success).toBe(true)
  })

  it("rejects SSN with letters", () => {
    const result = softPullConsentSchema.safeParse({
      consentGiven: true,
      ssn: "12345678A",
    })
    expect(result.success).toBe(false)
  })

  it("rejects ssnLast4 with wrong digit count", () => {
    const result = softPullConsentSchema.safeParse({
      consentGiven: true,
      ssnLast4: "123",
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid 4-digit ssnLast4", () => {
    const result = softPullConsentSchema.safeParse({
      consentGiven: true,
      ssnLast4: "1234",
    })
    expect(result.success).toBe(true)
  })

  it("rejects malformed dob", () => {
    const result = softPullConsentSchema.safeParse({
      consentGiven: true,
      dob: "15-01-1990",
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid YYYY-MM-DD dob", () => {
    const result = softPullConsentSchema.safeParse({
      consentGiven: true,
      dob: "1990-01-15",
    })
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. preQualStartSchema boundary cases
// ═══════════════════════════════════════════════════════════════════════════
describe("preQualStartSchema – boundary cases", () => {
  it("accepts consentGiven=true only", () => {
    const result = preQualStartSchema.safeParse({ consentGiven: true })
    expect(result.success).toBe(true)
  })

  it("rejects consentGiven=false", () => {
    const result = preQualStartSchema.safeParse({ consentGiven: false })
    expect(result.success).toBe(false)
  })

  it("rejects missing consentGiven", () => {
    const result = preQualStartSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects ssnLast4 with 3 digits", () => {
    const result = preQualStartSchema.safeParse({ consentGiven: true, ssnLast4: "123" })
    expect(result.success).toBe(false)
  })

  it("rejects ssnLast4 with 5 digits", () => {
    const result = preQualStartSchema.safeParse({ consentGiven: true, ssnLast4: "12345" })
    expect(result.success).toBe(false)
  })

  it("accepts valid ssnLast4", () => {
    const result = preQualStartSchema.safeParse({ consentGiven: true, ssnLast4: "6789" })
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7. Structured validation error format
// ═══════════════════════════════════════════════════════════════════════════
describe("validation error structure", () => {
  it("financingChoiceSchema produces field-level errors", () => {
    const result = financingChoiceSchema.safeParse({
      payment_type: "EXTERNAL_PREAPPROVAL",
      external_preapproval: {
        lender_name: "",
        approved_amount_cents: -1,
        apr: 200,
        term_months: 0,
        document_url: "bad",
      },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join("."))
      expect(paths).toContain("external_preapproval.lender_name")
      expect(paths).toContain("external_preapproval.approved_amount_cents")
      expect(paths).toContain("external_preapproval.apr")
      expect(paths).toContain("external_preapproval.term_months")
      expect(paths).toContain("external_preapproval.document_url")
    }
  })

  it("depositPaymentSchema error includes the field path", () => {
    const result = depositPaymentSchema.safeParse({ auctionId: "bad" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.path).toContain("auctionId")
    }
  })

  it("buyerProfileSchema error includes the field path for phone", () => {
    const result = buyerProfileSchema.safeParse({ phone: "abc" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.path).toContain("phone")
      expect(result.error.errors[0]?.message).toBe("Phone must be 10 digits")
    }
  })
})
