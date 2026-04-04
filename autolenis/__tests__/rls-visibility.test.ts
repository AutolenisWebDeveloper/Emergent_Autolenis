import { describe, it, expect } from "vitest"
import {
  isDealerVisibleStatus,
  DEALER_ACTIVE_PIPELINE_STATUSES,
} from "@/lib/constants/deal-visibility"
import {
  isBuyer,
  isDealer,
  isAdmin,
  isAffiliate,
  canWriteFinancingOffer,
  canWriteContractDocument,
  canWriteESignEnvelope,
  canWriteInsurancePolicy,
} from "@/lib/utils/role-detection"
import type { PayoutDeal, PayoutWithDeal, Commission, Payout } from "@/lib/types"

describe("Deal Visibility Constants", () => {
  it("should include all expected active pipeline statuses", () => {
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
      "CONTRACT_APPROVED",
      "SIGNING_PENDING",
      "SIGNED",
      "PICKUP_SCHEDULED",
    ]

    for (const status of expected) {
      expect(DEALER_ACTIVE_PIPELINE_STATUSES).toContain(status)
    }
  })

  it("should NOT include terminal statuses like COMPLETED or CANCELLED", () => {
    expect(DEALER_ACTIVE_PIPELINE_STATUSES).not.toContain("COMPLETED")
    expect(DEALER_ACTIVE_PIPELINE_STATUSES).not.toContain("CANCELLED")
  })

  it("isDealerVisibleStatus returns true for active pipeline statuses", () => {
    expect(isDealerVisibleStatus("SELECTED")).toBe(true)
    expect(isDealerVisibleStatus("FINANCING_PENDING")).toBe(true)
    expect(isDealerVisibleStatus("PICKUP_SCHEDULED")).toBe(true)
  })

  it("isDealerVisibleStatus returns false for COMPLETED and CANCELLED", () => {
    expect(isDealerVisibleStatus("COMPLETED")).toBe(false)
    expect(isDealerVisibleStatus("CANCELLED")).toBe(false)
  })

  it("isDealerVisibleStatus returns false for unknown statuses", () => {
    expect(isDealerVisibleStatus("INVALID_STATUS")).toBe(false)
    expect(isDealerVisibleStatus("")).toBe(false)
  })
})

describe("Role Detection", () => {
  it("isBuyer correctly identifies buyer role", () => {
    expect(isBuyer("BUYER")).toBe(true)
    expect(isBuyer("DEALER")).toBe(false)
    expect(isBuyer("ADMIN")).toBe(false)
    expect(isBuyer(undefined)).toBe(false)
  })

  it("isDealer correctly identifies dealer roles", () => {
    expect(isDealer("DEALER")).toBe(true)
    expect(isDealer("DEALER_USER")).toBe(true)
    expect(isDealer("BUYER")).toBe(false)
    expect(isDealer("ADMIN")).toBe(false)
    expect(isDealer(undefined)).toBe(false)
  })

  it("isAdmin correctly identifies admin roles", () => {
    expect(isAdmin("ADMIN")).toBe(true)
    expect(isAdmin("SUPER_ADMIN")).toBe(true)
    expect(isAdmin("BUYER")).toBe(false)
    expect(isAdmin("DEALER")).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
  })

  it("isAffiliate correctly identifies affiliate roles", () => {
    expect(isAffiliate("AFFILIATE")).toBe(true)
    expect(isAffiliate("AFFILIATE_ONLY")).toBe(true)
    expect(isAffiliate("BUYER", true)).toBe(true)
    expect(isAffiliate("BUYER", false)).toBe(false)
    expect(isAffiliate("DEALER")).toBe(false)
    expect(isAffiliate(undefined)).toBe(false)
  })

  describe("Write permission checks", () => {
    it("only buyers can write FinancingOffer", () => {
      expect(canWriteFinancingOffer("BUYER")).toBe(true)
      expect(canWriteFinancingOffer("DEALER")).toBe(false)
      expect(canWriteFinancingOffer("ADMIN")).toBe(false)
    })

    it("only dealers can write ContractDocument", () => {
      expect(canWriteContractDocument("DEALER")).toBe(true)
      expect(canWriteContractDocument("DEALER_USER")).toBe(true)
      expect(canWriteContractDocument("BUYER")).toBe(false)
      expect(canWriteContractDocument("ADMIN")).toBe(false)
    })

    it("only admins can write ESignEnvelope", () => {
      expect(canWriteESignEnvelope("ADMIN")).toBe(true)
      expect(canWriteESignEnvelope("SUPER_ADMIN")).toBe(true)
      expect(canWriteESignEnvelope("BUYER")).toBe(false)
      expect(canWriteESignEnvelope("DEALER")).toBe(false)
    })

    it("only admins can write InsurancePolicy", () => {
      expect(canWriteInsurancePolicy("ADMIN")).toBe(true)
      expect(canWriteInsurancePolicy("SUPER_ADMIN")).toBe(true)
      expect(canWriteInsurancePolicy("BUYER")).toBe(false)
      expect(canWriteInsurancePolicy("DEALER")).toBe(false)
    })
  })
})

describe("Payout-Deal Linkage Types", () => {
  it("PayoutDeal interface has required fields", () => {
    const payoutDeal: PayoutDeal = {
      id: "pd-1",
      payoutId: "payout-1",
      selectedDealId: "deal-1",
      allocatedAmountCents: 5000,
      createdAt: new Date(),
    }

    expect(payoutDeal.id).toBe("pd-1")
    expect(payoutDeal.payoutId).toBe("payout-1")
    expect(payoutDeal.selectedDealId).toBe("deal-1")
    expect(payoutDeal.allocatedAmountCents).toBe(5000)
    expect(payoutDeal.createdAt).toBeInstanceOf(Date)
  })

  it("PayoutWithDeal extends Payout with dealId", () => {
    const payoutWithDeal: PayoutWithDeal = {
      id: "payout-1",
      affiliateId: "aff-1",
      amount: 50,
      status: "PENDING",
      method: "STRIPE",
      createdAt: new Date(),
      dealId: "deal-123",
    }

    expect(payoutWithDeal.dealId).toBe("deal-123")
    expect(payoutWithDeal.amount).toBe(50)
  })

  it("PayoutWithDeal allows null dealId", () => {
    const payoutWithDeal: PayoutWithDeal = {
      id: "payout-2",
      affiliateId: "aff-1",
      amount: 25,
      status: "COMPLETED",
      method: "PAYPAL",
      createdAt: new Date(),
      dealId: null,
    }

    expect(payoutWithDeal.dealId).toBeNull()
  })

  it("Commission supports optional selected_deal_id", () => {
    const commissionWithDeal: Commission = {
      id: "comm-1",
      affiliateId: "aff-1",
      referralId: "ref-1",
      amount: 49.5,
      status: "EARNED",
      period: "2026-02",
      createdAt: new Date(),
      selected_deal_id: "deal-123",
    }

    expect(commissionWithDeal.selected_deal_id).toBe("deal-123")

    const commissionWithout: Commission = {
      id: "comm-2",
      affiliateId: "aff-1",
      referralId: "ref-2",
      amount: 20,
      status: "PENDING",
      period: "2026-02",
      createdAt: new Date(),
    }

    expect(commissionWithout.selected_deal_id).toBeUndefined()
  })
})
