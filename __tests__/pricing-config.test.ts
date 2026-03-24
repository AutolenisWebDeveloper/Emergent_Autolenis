import { describe, it, expect } from "vitest"
import {
  PRICING,
  PRICING_DISPLAY,
  PLANS,
  PLAN_LIST,
  depositAppliesTo,
  depositCreditExplanation,
  validatePricingInvariants,
  evaluateRefundEligibility,
  isPricingV2Enabled,
  canUpgrade,
  REFUND_ELIGIBLE_REASONS,
  REFUND_DENIED_REASONS,
  type BuyerPricingState,
} from "@/src/config/pricingConfig"

describe("Pricing Config — V2", () => {
  describe("Amounts", () => {
    it("deposit is $99 (9900 cents)", () => {
      expect(PRICING.depositAmountCents).toBe(9900)
    })
    it("premium fee is $499 (49900 cents)", () => {
      expect(PRICING.premiumFeeCents).toBe(49900)
    })
    it("premium remaining after deposit is $400 (40000 cents)", () => {
      expect(PRICING.premiumFeeRemainingCents).toBe(40000)
    })
    it("deposit label is 'Serious Buyer Deposit'", () => {
      expect(PRICING.depositLabel).toBe("Serious Buyer Deposit")
    })
  })

  describe("Display values", () => {
    it("formats deposit as $99", () => {
      expect(PRICING_DISPLAY.depositAmount).toBe("$99")
    })
    it("formats premium fee as $499", () => {
      expect(PRICING_DISPLAY.premiumFee).toBe("$499")
    })
    it("formats remaining as $400", () => {
      expect(PRICING_DISPLAY.premiumFeeRemaining).toBe("$400")
    })
  })

  describe("Plan definitions", () => {
    it("has exactly two plans", () => {
      expect(PLAN_LIST).toHaveLength(2)
    })
    it("FREE plan has no concierge fee", () => {
      expect(PLANS.FREE.priceCents).toBe(0)
      expect(PLANS.FREE.depositAppliesTo).toBe("PURCHASE_CREDIT")
    })
    it("FREE plan label is 'Standard'", () => {
      expect(PLANS.FREE.label).toBe("Standard")
    })
    it("FREE plan priceLabel is 'Free Plan'", () => {
      expect(PLANS.FREE.priceLabel).toBe("Free Plan")
    })
    it("PREMIUM plan costs $499", () => {
      expect(PLANS.PREMIUM.priceCents).toBe(49900)
      expect(PLANS.PREMIUM.depositAppliesTo).toBe("FEE_CREDIT")
      expect(PLANS.PREMIUM.badge).toBe("Most Popular")
    })
    it("PREMIUM features reference correct Standard plan label", () => {
      expect(PLANS.PREMIUM.features[0]).toBe("Everything in Standard")
    })
    it("PREMIUM features include full-service messaging", () => {
      const features = PLANS.PREMIUM.features
      expect(features).toContain("Full-service buying support from start to finish")
      expect(features).toContain("Dedicated buying specialist")
      expect(features).toContain("Free home delivery")
      expect(features).toContain("Priority support")
    })
    it("PREMIUM features include financing guidance messaging", () => {
      const features = PLANS.PREMIUM.features
      expect(features).toContain("Financing assistance to help find the right loan options")
      expect(features.some(f => f.includes("reduce unnecessary inquiries"))).toBe(true)
    })
    it("PREMIUM has value proposition describing end-to-end service", () => {
      expect(PLANS.PREMIUM.valueProposition).toBeDefined()
      expect(PLANS.PREMIUM.valueProposition).toContain("white-glove")
      expect(PLANS.PREMIUM.valueProposition).toContain("full process")
    })
    it("PREMIUM has delivery text", () => {
      expect(PLANS.PREMIUM.deliveryText).toBeDefined()
      expect(PLANS.PREMIUM.deliveryText).toContain("Free home delivery")
    })
    it("PREMIUM has financing text", () => {
      expect(PLANS.PREMIUM.financingText).toBeDefined()
      expect(PLANS.PREMIUM.financingText).toContain("financing path")
    })
    it("PREMIUM has compliance disclosure text", () => {
      expect(PLANS.PREMIUM.disclosureText).toBeDefined()
      expect(PLANS.PREMIUM.disclosureText).toContain("not a guarantee")
    })
    it("PREMIUM does not contain weak legacy copy", () => {
      const features = PLANS.PREMIUM.features
      expect(features).not.toContain("Extended warranty options")
      expect(features).not.toContain("White-glove concierge service")
      expect(features.some(f => f === "Priority dealer network")).toBe(false)
    })
  })

  describe("Deposit credit rules", () => {
    it("FREE → PURCHASE_CREDIT", () => {
      expect(depositAppliesTo("FREE")).toBe("PURCHASE_CREDIT")
    })
    it("PREMIUM → FEE_CREDIT", () => {
      expect(depositAppliesTo("PREMIUM")).toBe("FEE_CREDIT")
    })
  })

  describe("Deposit credit explanation", () => {
    it("FREE explanation mentions purchase / closing credit", () => {
      const ex = depositCreditExplanation("FREE")
      expect(ex).toContain("purchase")
      expect(ex).toContain("$99")
    })
    it("PREMIUM explanation mentions fee credit and $400 remaining", () => {
      const ex = depositCreditExplanation("PREMIUM")
      expect(ex).toContain("$499")
      expect(ex).toContain("$400")
    })
  })

  describe("State machine invariants", () => {
    it("valid FREE state passes", () => {
      const state: BuyerPricingState = {
        plan: "FREE",
        depositStatus: "PAID",
        depositAppliesTo: "PURCHASE_CREDIT",
        premiumFeeStatus: "NOT_REQUIRED",
        auctionStatus: "ACTIVE",
      }
      expect(validatePricingInvariants(state)).toEqual([])
    })

    it("valid PREMIUM state passes", () => {
      const state: BuyerPricingState = {
        plan: "PREMIUM",
        depositStatus: "PAID",
        depositAppliesTo: "FEE_CREDIT",
        premiumFeeStatus: "DUE",
        auctionStatus: "ACTIVE",
      }
      expect(validatePricingInvariants(state)).toEqual([])
    })

    it("rejects ACTIVE auction without paid deposit", () => {
      const state: BuyerPricingState = {
        plan: "FREE",
        depositStatus: "NOT_PAID",
        depositAppliesTo: "PURCHASE_CREDIT",
        premiumFeeStatus: "NOT_REQUIRED",
        auctionStatus: "ACTIVE",
      }
      expect(validatePricingInvariants(state).length).toBeGreaterThan(0)
    })

    it("rejects PREMIUM plan with PURCHASE_CREDIT", () => {
      const state: BuyerPricingState = {
        plan: "PREMIUM",
        depositStatus: "PAID",
        depositAppliesTo: "PURCHASE_CREDIT",
        premiumFeeStatus: "DUE",
        auctionStatus: "DRAFT",
      }
      expect(validatePricingInvariants(state).length).toBeGreaterThan(0)
    })

    it("rejects FREE plan with FEE_CREDIT", () => {
      const state: BuyerPricingState = {
        plan: "FREE",
        depositStatus: "PAID",
        depositAppliesTo: "FEE_CREDIT",
        premiumFeeStatus: "NOT_REQUIRED",
        auctionStatus: "DRAFT",
      }
      expect(validatePricingInvariants(state).length).toBeGreaterThan(0)
    })

    it("rejects premium fee PAID with PURCHASE_CREDIT deposit", () => {
      const state: BuyerPricingState = {
        plan: "PREMIUM",
        depositStatus: "PAID",
        depositAppliesTo: "PURCHASE_CREDIT",
        premiumFeeStatus: "PAID",
        auctionStatus: "DRAFT",
      }
      expect(validatePricingInvariants(state).length).toBeGreaterThan(0)
    })

    it("rejects FREE plan with premium fee PAID", () => {
      const state: BuyerPricingState = {
        plan: "FREE",
        depositStatus: "PAID",
        depositAppliesTo: "PURCHASE_CREDIT",
        premiumFeeStatus: "PAID",
        auctionStatus: "DRAFT",
      }
      expect(validatePricingInvariants(state).length).toBeGreaterThan(0)
    })
  })

  describe("Refund eligibility", () => {
    it("approves NO_OFFERS", () => {
      expect(evaluateRefundEligibility("NO_OFFERS").eligible).toBe(true)
    })
    it("approves CANCELED_BEFORE_WINNER", () => {
      expect(evaluateRefundEligibility("CANCELED_BEFORE_WINNER").eligible).toBe(true)
    })
    it("denies BUYER_WITHDREW_AFTER_WINNER", () => {
      expect(evaluateRefundEligibility("BUYER_WITHDREW_AFTER_WINNER").eligible).toBe(false)
    })
    it("denies FRAUD", () => {
      expect(evaluateRefundEligibility("FRAUD").eligible).toBe(false)
    })
    it("eligible and denied reason sets are disjoint", () => {
      for (const r of REFUND_ELIGIBLE_REASONS) {
        expect(REFUND_DENIED_REASONS).not.toContain(r)
      }
    })
  })

  describe("Feature flag", () => {
    it("defaults to enabled", () => {
      expect(isPricingV2Enabled()).toBe(true)
      expect(isPricingV2Enabled(null)).toBe(true)
    })
    it("disabled when false/0", () => {
      expect(isPricingV2Enabled(false)).toBe(false)
      expect(isPricingV2Enabled("false")).toBe(false)
      expect(isPricingV2Enabled("0")).toBe(false)
    })
  })

  describe("Upgrade rules", () => {
    it("allows FREE → PREMIUM before deposit", () => {
      expect(canUpgrade("FREE", "BEFORE_DEPOSIT")).toBe(true)
    })
    it("allows FREE → PREMIUM after deposit", () => {
      expect(canUpgrade("FREE", "AFTER_DEPOSIT")).toBe(true)
    })
    it("blocks upgrade after auction active", () => {
      expect(canUpgrade("FREE", "AFTER_AUCTION_ACTIVE")).toBe(false)
    })
    it("blocks upgrade if already PREMIUM", () => {
      expect(canUpgrade("PREMIUM", "BEFORE_DEPOSIT")).toBe(false)
    })
  })

  describe("Public pricing display — no $0", () => {
    it("Standard plan displays 'Free Plan' as priceLabel", () => {
      expect(PLANS.FREE.priceLabel).toBe("Free Plan")
    })
    it("Standard plan priceLabel does not contain '$0'", () => {
      expect(PLANS.FREE.priceLabel).not.toContain("$0")
    })
    it("Premium plan displays '$499' as priceLabel", () => {
      expect(PLANS.PREMIUM.priceLabel).toBe("$499")
    })
    it("no plan in PLAN_LIST renders '$0'", () => {
      for (const plan of PLAN_LIST) {
        expect(plan.priceLabel).not.toContain("$0")
      }
    })
  })
})
