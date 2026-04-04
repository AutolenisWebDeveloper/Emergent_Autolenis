import { describe, it, expect } from "vitest"

import {
  InsuranceReadinessStatus,
  INSURANCE_VALID_TRANSITIONS,
  InsuranceDocumentTag,
  INSURANCE_ACCEPTED_FILE_TYPES,
  isInsuranceVerifiedForDelivery,
  INSURANCE_DASHBOARD_CONFIG,
} from "@/lib/constants/insurance"

import {
  resolveBuyerEligibility,
  type PrequalStatus,
} from "@/lib/constants/buyer-eligibility"

// ─── Insurance State Machine Tests ─────────────────────────────────────────

describe("Insurance State Machine", () => {
  describe("InsuranceReadinessStatus enum values", () => {
    it("should define all required states", () => {
      expect(InsuranceReadinessStatus.NOT_STARTED).toBe("NOT_STARTED")
      expect(InsuranceReadinessStatus.CURRENT_INSURANCE_UPLOADED).toBe("CURRENT_INSURANCE_UPLOADED")
      expect(InsuranceReadinessStatus.INSURANCE_PENDING).toBe("INSURANCE_PENDING")
      expect(InsuranceReadinessStatus.HELP_REQUESTED).toBe("HELP_REQUESTED")
      expect(InsuranceReadinessStatus.UNDER_REVIEW).toBe("UNDER_REVIEW")
      expect(InsuranceReadinessStatus.VERIFIED).toBe("VERIFIED")
      expect(InsuranceReadinessStatus.REQUIRED_BEFORE_DELIVERY).toBe("REQUIRED_BEFORE_DELIVERY")
    })

    it("should have exactly 7 states", () => {
      const states = Object.values(InsuranceReadinessStatus)
      expect(states).toHaveLength(7)
    })
  })

  describe("INSURANCE_VALID_TRANSITIONS", () => {
    it("NOT_STARTED can transition to upload, pending, or help", () => {
      const transitions = INSURANCE_VALID_TRANSITIONS.NOT_STARTED
      expect(transitions).toContain("CURRENT_INSURANCE_UPLOADED")
      expect(transitions).toContain("INSURANCE_PENDING")
      expect(transitions).toContain("HELP_REQUESTED")
    })

    it("VERIFIED is a terminal state with no transitions", () => {
      expect(INSURANCE_VALID_TRANSITIONS.VERIFIED).toEqual([])
    })

    it("REQUIRED_BEFORE_DELIVERY can transition to upload, help, or verified", () => {
      const transitions = INSURANCE_VALID_TRANSITIONS.REQUIRED_BEFORE_DELIVERY
      expect(transitions).toContain("CURRENT_INSURANCE_UPLOADED")
      expect(transitions).toContain("HELP_REQUESTED")
      expect(transitions).toContain("VERIFIED")
    })

    it("CURRENT_INSURANCE_UPLOADED can transition to review or verified", () => {
      const transitions = INSURANCE_VALID_TRANSITIONS.CURRENT_INSURANCE_UPLOADED
      expect(transitions).toContain("UNDER_REVIEW")
      expect(transitions).toContain("VERIFIED")
    })
  })

  describe("isInsuranceVerifiedForDelivery", () => {
    it("returns true only for VERIFIED status", () => {
      expect(isInsuranceVerifiedForDelivery("VERIFIED")).toBe(true)
    })

    it("returns false for NOT_STARTED", () => {
      expect(isInsuranceVerifiedForDelivery("NOT_STARTED")).toBe(false)
    })

    it("returns false for CURRENT_INSURANCE_UPLOADED", () => {
      expect(isInsuranceVerifiedForDelivery("CURRENT_INSURANCE_UPLOADED")).toBe(false)
    })

    it("returns false for INSURANCE_PENDING", () => {
      expect(isInsuranceVerifiedForDelivery("INSURANCE_PENDING")).toBe(false)
    })

    it("returns false for HELP_REQUESTED", () => {
      expect(isInsuranceVerifiedForDelivery("HELP_REQUESTED")).toBe(false)
    })

    it("returns false for UNDER_REVIEW", () => {
      expect(isInsuranceVerifiedForDelivery("UNDER_REVIEW")).toBe(false)
    })

    it("returns false for REQUIRED_BEFORE_DELIVERY", () => {
      expect(isInsuranceVerifiedForDelivery("REQUIRED_BEFORE_DELIVERY")).toBe(false)
    })

    it("returns false for null", () => {
      expect(isInsuranceVerifiedForDelivery(null)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(isInsuranceVerifiedForDelivery(undefined)).toBe(false)
    })

    it("returns false for empty string", () => {
      expect(isInsuranceVerifiedForDelivery("")).toBe(false)
    })
  })

  describe("Insurance Document Tags", () => {
    it("should define all required document tags", () => {
      expect(InsuranceDocumentTag.INSURANCE_CARD).toBe("insurance_card")
      expect(InsuranceDocumentTag.INSURANCE_DECLARATIONS).toBe("insurance_declarations")
      expect(InsuranceDocumentTag.INSURANCE_BINDER).toBe("insurance_binder")
      expect(InsuranceDocumentTag.INSURANCE_OTHER).toBe("insurance_other")
    })
  })

  describe("Accepted file types", () => {
    it("should include PDF, PNG, JPEG, and HEIC", () => {
      expect(INSURANCE_ACCEPTED_FILE_TYPES).toContain("application/pdf")
      expect(INSURANCE_ACCEPTED_FILE_TYPES).toContain("image/png")
      expect(INSURANCE_ACCEPTED_FILE_TYPES).toContain("image/jpeg")
      expect(INSURANCE_ACCEPTED_FILE_TYPES).toContain("image/heic")
    })
  })

  describe("Dashboard configuration", () => {
    it("should have config for all states", () => {
      for (const status of Object.values(InsuranceReadinessStatus)) {
        const config = INSURANCE_DASHBOARD_CONFIG[status]
        expect(config).toBeDefined()
        expect(config.label).toBeTruthy()
        expect(config.ctaLabel).toBeTruthy()
        expect(config.ctaHref).toBeTruthy()
      }
    })

    it("NOT_STARTED shows correct CTA", () => {
      expect(INSURANCE_DASHBOARD_CONFIG.NOT_STARTED.ctaLabel).toBe("Upload Current Insurance")
    })

    it("VERIFIED shows correct label", () => {
      expect(INSURANCE_DASHBOARD_CONFIG.VERIFIED.label).toBe("Verified")
      expect(INSURANCE_DASHBOARD_CONFIG.VERIFIED.variant).toBe("success")
    })

    it("INSURANCE_PENDING shows warning variant", () => {
      expect(INSURANCE_DASHBOARD_CONFIG.INSURANCE_PENDING.variant).toBe("warning")
    })
  })
})

// ─── Buyer Eligibility Tests ───────────────────────────────────────────────

describe("Buyer Eligibility", () => {
  const baseParams = {
    buyerId: "buyer-123",
    shoppingRangeLow: 15000,
    shoppingRangeHigh: 35000,
    shoppingPassIssuedAt: new Date().toISOString(),
    shoppingPassExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    incomeVerified: true,
    manualReviewRequired: false,
    vehicleBudgetCap: 35000,
  }

  describe("PREQUALIFIED status", () => {
    it("should allow shopping, shortlist, and auction", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "PREQUALIFIED",
      })

      expect(result.allowed_to_shop).toBe(true)
      expect(result.allowed_to_shortlist).toBe(true)
      expect(result.allowed_to_trigger_auction).toBe(true)
      expect(result.next_required_action).toBeNull()
    })
  })

  describe("PREQUALIFIED_CONDITIONAL status", () => {
    it("should allow shortlist and auction when shopping pass is valid", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "PREQUALIFIED_CONDITIONAL",
      })

      expect(result.allowed_to_shop).toBe(true)
      expect(result.allowed_to_shortlist).toBe(true)
      expect(result.allowed_to_trigger_auction).toBe(true)
    })

    it("should block auction when shopping pass is expired", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "PREQUALIFIED_CONDITIONAL",
        shoppingPassExpiresAt: new Date(Date.now() - 1000).toISOString(),
      })

      expect(result.allowed_to_shop).toBe(true)
      expect(result.allowed_to_shortlist).toBe(true)
      expect(result.allowed_to_trigger_auction).toBe(false)
      expect(result.next_required_action).toBe("complete_required_step")
    })
  })

  describe("MANUAL_REVIEW status", () => {
    it("should allow shopping and shortlist but block auction", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "MANUAL_REVIEW",
      })

      expect(result.allowed_to_shop).toBe(true)
      expect(result.allowed_to_shortlist).toBe(true)
      expect(result.allowed_to_trigger_auction).toBe(false)
      expect(result.next_required_action).toBe("await_manual_review")
    })
  })

  describe("NOT_PREQUALIFIED status", () => {
    it("should block all actions", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "NOT_PREQUALIFIED",
      })

      expect(result.allowed_to_shop).toBe(false)
      expect(result.allowed_to_shortlist).toBe(false)
      expect(result.allowed_to_trigger_auction).toBe(false)
      expect(result.next_required_action).toBe("retry_prequalification")
    })
  })

  describe("NOT_STARTED status", () => {
    it("should block all actions", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "NOT_STARTED",
      })

      expect(result.allowed_to_shop).toBe(false)
      expect(result.allowed_to_shortlist).toBe(false)
      expect(result.allowed_to_trigger_auction).toBe(false)
      expect(result.next_required_action).toBe("start_prequalification")
    })
  })

  describe("EXPIRED status", () => {
    it("should block all actions with renew message", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "EXPIRED",
      })

      expect(result.allowed_to_shop).toBe(false)
      expect(result.allowed_to_shortlist).toBe(false)
      expect(result.allowed_to_trigger_auction).toBe(false)
      expect(result.next_required_action).toBe("renew_prequalification")
    })
  })

  describe("Insurance independence", () => {
    it("buyer eligibility does not include any insurance-related fields", () => {
      const result = resolveBuyerEligibility({
        ...baseParams,
        prequalStatus: "PREQUALIFIED",
      })

      // Ensure the result contains only the expected fields
      const keys = Object.keys(result)
      expect(keys).not.toContain("insurance_status")
      expect(keys).not.toContain("insurance_verified")
      expect(keys).not.toContain("lender_status")
      expect(keys).not.toContain("financing_approved")

      // Ensure the expected fields are present
      expect(keys).toContain("buyer_id")
      expect(keys).toContain("prequal_status")
      expect(keys).toContain("shopping_range_low")
      expect(keys).toContain("shopping_range_high")
      expect(keys).toContain("shopping_pass_issued_at")
      expect(keys).toContain("shopping_pass_expires_at")
      expect(keys).toContain("income_verified")
      expect(keys).toContain("manual_review_required")
      expect(keys).toContain("allowed_to_shop")
      expect(keys).toContain("allowed_to_shortlist")
      expect(keys).toContain("allowed_to_trigger_auction")
      expect(keys).toContain("vehicle_budget_cap")
      expect(keys).toContain("next_required_action")
    })
  })
})
