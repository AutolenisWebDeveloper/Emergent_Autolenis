/**
 * Unified Decision Engine — Unit Tests
 *
 * Tests the centralized decision layer for platform-wide readiness,
 * approval, restriction, hold, and routing decisions.
 */

import { describe, it, expect } from "vitest"
import {
  resolveDecision,
  resolveBuyerReadiness,
  resolveBuyerMessagingEligibility,
  resolveDealerOperationalState,
  resolveDealProgressionState,
  resolveContractResolutionState,
  resolveESignReadiness,
  resolvePickupReadiness,
  resolvePayoutReleaseState,
  resolveRefundHoldState,
  aggregateComplianceHolds,
} from "@/lib/services/decision-engine"
import type {
  BuyerSignals,
  DealerSignals,
  DealSignals,
  AffiliateSignals,
  DecisionInputs,
} from "@/lib/services/decision-engine"

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeBuyerSignals(overrides?: Partial<BuyerSignals>): BuyerSignals {
  return {
    buyerId: "buyer-1",
    profileComplete: true,
    prequal: {
      exists: false,
      source: null,
      status: null,
      creditTier: null,
      maxOtd: null,
      expiresAt: null,
      softPullCompleted: false,
      consentGiven: false,
    },
    externalPreApproval: {
      exists: false,
      status: null,
      approvedAmount: null,
      reviewedAt: null,
    },
    cashBasis: false,
    identityVerified: true,
    complianceFlags: [],
    manualHold: false,
    ...overrides,
  }
}

function makeDealerSignals(overrides?: Partial<DealerSignals>): DealerSignals {
  return {
    dealerId: "dealer-1",
    verified: true,
    integrityScore: 100,
    highRisk: false,
    complianceFlags: [],
    manualHold: false,
    ...overrides,
  }
}

function makeDealSignals(overrides?: Partial<DealSignals>): DealSignals {
  return {
    dealId: "deal-1",
    dealStatus: "SELECTED",
    paymentType: null,
    financingApproved: false,
    feeStatus: null,
    feePaid: false,
    insuranceStatus: null,
    insuranceComplete: false,
    insuranceReadinessStatus: null,
    contractUploaded: false,
    contractScanStatus: null,
    contractScanPassed: false,
    cmaStatus: null,
    cmaApproved: false,
    esignStatus: null,
    esignCompleted: false,
    pickupStatus: null,
    payoutStatus: null,
    refundStatus: null,
    complianceFlags: [],
    manualHold: false,
    ...overrides,
  }
}

function makeAffiliateSignals(overrides?: Partial<AffiliateSignals>): AffiliateSignals {
  return {
    affiliateId: null,
    selfReferral: false,
    fraudDetected: false,
    complianceFlags: [],
    ...overrides,
  }
}

function makeDecisionInputs(overrides?: Partial<DecisionInputs>): DecisionInputs {
  return {
    buyer: makeBuyerSignals(),
    dealer: null,
    deal: null,
    affiliate: null,
    timestamp: new Date().toISOString(),
    correlationId: "test-corr-id",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Buyer Readiness Tests
// ---------------------------------------------------------------------------

describe("Unified Decision Engine", () => {
  describe("resolveBuyerReadiness", () => {
    it("returns PREQUAL_REQUIRED when no prequal exists and no cash basis", () => {
      const buyer = makeBuyerSignals()
      expect(resolveBuyerReadiness(buyer)).toBe("PREQUAL_REQUIRED")
    })

    it("returns PROFILE_INCOMPLETE when profile is incomplete", () => {
      const buyer = makeBuyerSignals({ profileComplete: false })
      expect(resolveBuyerReadiness(buyer)).toBe("PROFILE_INCOMPLETE")
    })

    it("returns HOLD when manual hold is set", () => {
      const buyer = makeBuyerSignals({ manualHold: true })
      expect(resolveBuyerReadiness(buyer)).toBe("HOLD")
    })

    it("returns HOLD when compliance flags exist", () => {
      const buyer = makeBuyerSignals({ complianceFlags: ["MANUAL_HOLD"] })
      expect(resolveBuyerReadiness(buyer)).toBe("HOLD")
    })

    it("returns PREQUAL_ACTIVE for internal prequal with soft pull and consent", () => {
      const buyer = makeBuyerSignals({
        prequal: {
          exists: true,
          source: "INTERNAL",
          status: "ACTIVE",
          creditTier: "GOOD",
          maxOtd: 30000,
          expiresAt: null,
          softPullCompleted: true,
          consentGiven: true,
        },
      })
      expect(resolveBuyerReadiness(buyer)).toBe("PREQUAL_ACTIVE")
    })

    it("returns PREQUAL_PENDING when prequal exists but soft pull incomplete", () => {
      const buyer = makeBuyerSignals({
        prequal: {
          exists: true,
          source: "INTERNAL",
          status: "ACTIVE",
          creditTier: null,
          maxOtd: null,
          expiresAt: null,
          softPullCompleted: false,
          consentGiven: true,
        },
      })
      expect(resolveBuyerReadiness(buyer)).toBe("PREQUAL_PENDING")
    })

    it("returns EXTERNAL_PREAPPROVAL_APPROVED for approved external", () => {
      const buyer = makeBuyerSignals({
        externalPreApproval: {
          exists: true,
          status: "APPROVED",
          approvedAmount: 25000,
          reviewedAt: new Date().toISOString(),
        },
      })
      expect(resolveBuyerReadiness(buyer)).toBe("EXTERNAL_PREAPPROVAL_APPROVED")
    })

    it("returns EXTERNAL_PREAPPROVAL_PENDING for submitted external", () => {
      const buyer = makeBuyerSignals({
        externalPreApproval: {
          exists: true,
          status: "SUBMITTED",
          approvedAmount: null,
          reviewedAt: null,
        },
      })
      expect(resolveBuyerReadiness(buyer)).toBe("EXTERNAL_PREAPPROVAL_PENDING")
    })

    it("returns CASH_DECLARED for cash basis buyers", () => {
      const buyer = makeBuyerSignals({ cashBasis: true })
      expect(resolveBuyerReadiness(buyer)).toBe("CASH_DECLARED")
    })
  })

  // ---------------------------------------------------------------------------
  // Buyer Messaging Eligibility Tests
  // ---------------------------------------------------------------------------

  describe("resolveBuyerMessagingEligibility", () => {
    it("returns ELIGIBLE for internal prequal active", () => {
      const buyer = makeBuyerSignals({
        prequal: {
          exists: true,
          source: "INTERNAL",
          status: "ACTIVE",
          creditTier: "GOOD",
          maxOtd: 30000,
          expiresAt: null,
          softPullCompleted: true,
          consentGiven: true,
        },
      })
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("ELIGIBLE")
    })

    it("returns ELIGIBLE for approved external preapproval", () => {
      const buyer = makeBuyerSignals({
        externalPreApproval: {
          exists: true,
          status: "APPROVED",
          approvedAmount: 25000,
          reviewedAt: new Date().toISOString(),
        },
      })
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("ELIGIBLE")
    })

    it("returns ELIGIBLE for cash basis", () => {
      const buyer = makeBuyerSignals({ cashBasis: true })
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("ELIGIBLE")
    })

    it("returns INELIGIBLE_REJECTED for rejected external preapproval", () => {
      const buyer = makeBuyerSignals({
        externalPreApproval: {
          exists: true,
          status: "REJECTED",
          approvedAmount: null,
          reviewedAt: new Date().toISOString(),
        },
      })
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("INELIGIBLE_REJECTED")
    })

    it("returns INELIGIBLE_EXPIRED for expired external preapproval", () => {
      const buyer = makeBuyerSignals({
        externalPreApproval: {
          exists: true,
          status: "EXPIRED",
          approvedAmount: null,
          reviewedAt: null,
        },
      })
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("INELIGIBLE_EXPIRED")
    })

    it("returns INELIGIBLE_NO_APPROVAL when nothing qualifies", () => {
      const buyer = makeBuyerSignals()
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("INELIGIBLE_NO_APPROVAL")
    })

    it("returns INELIGIBLE_HOLD when manual hold is set", () => {
      const buyer = makeBuyerSignals({
        manualHold: true,
        prequal: {
          exists: true,
          source: "INTERNAL",
          status: "ACTIVE",
          creditTier: "GOOD",
          maxOtd: 30000,
          expiresAt: null,
          softPullCompleted: true,
          consentGiven: true,
        },
      })
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("INELIGIBLE_HOLD")
    })

    it("returns INELIGIBLE_REJECTED for external manual prequal without approved submission", () => {
      const buyer = makeBuyerSignals({
        prequal: {
          exists: true,
          source: "EXTERNAL_MANUAL",
          status: "ACTIVE",
          creditTier: null,
          maxOtd: null,
          expiresAt: null,
          softPullCompleted: false,
          consentGiven: false,
        },
        externalPreApproval: {
          exists: false,
          status: null,
          approvedAmount: null,
          reviewedAt: null,
        },
      })
      expect(resolveBuyerMessagingEligibility(buyer)).toBe("INELIGIBLE_REJECTED")
    })
  })

  // ---------------------------------------------------------------------------
  // Dealer Operational State Tests
  // ---------------------------------------------------------------------------

  describe("resolveDealerOperationalState", () => {
    it("returns ACTIVE for verified dealer with good score", () => {
      const dealer = makeDealerSignals()
      expect(resolveDealerOperationalState(dealer)).toBe("ACTIVE")
    })

    it("returns PENDING_VERIFICATION for unverified dealer", () => {
      const dealer = makeDealerSignals({ verified: false })
      expect(resolveDealerOperationalState(dealer)).toBe("PENDING_VERIFICATION")
    })

    it("returns HIGH_RISK for high-risk flagged dealer", () => {
      const dealer = makeDealerSignals({ highRisk: true })
      expect(resolveDealerOperationalState(dealer)).toBe("HIGH_RISK")
    })

    it("returns SUSPENDED when integrity score is below threshold", () => {
      const dealer = makeDealerSignals({ integrityScore: 40 })
      expect(resolveDealerOperationalState(dealer)).toBe("SUSPENDED")
    })

    it("returns SUSPENDED for manual hold", () => {
      const dealer = makeDealerSignals({ manualHold: true })
      expect(resolveDealerOperationalState(dealer)).toBe("SUSPENDED")
    })
  })

  // ---------------------------------------------------------------------------
  // Deal Progression State Tests
  // ---------------------------------------------------------------------------

  describe("resolveDealProgressionState", () => {
    it("maps SELECTED to SELECTED", () => {
      const deal = makeDealSignals({ dealStatus: "SELECTED" })
      expect(resolveDealProgressionState(deal)).toBe("SELECTED")
    })

    it("maps FINANCING_PENDING to FINANCING", () => {
      const deal = makeDealSignals({ dealStatus: "FINANCING_PENDING" })
      expect(resolveDealProgressionState(deal)).toBe("FINANCING")
    })

    it("maps FEE_PENDING to FEE_STAGE", () => {
      const deal = makeDealSignals({ dealStatus: "FEE_PENDING" })
      expect(resolveDealProgressionState(deal)).toBe("FEE_STAGE")
    })

    it("maps CONTRACT_REVIEW to CONTRACT_STAGE", () => {
      const deal = makeDealSignals({ dealStatus: "CONTRACT_REVIEW" })
      expect(resolveDealProgressionState(deal)).toBe("CONTRACT_STAGE")
    })

    it("maps SIGNING_PENDING to SIGNING_STAGE", () => {
      const deal = makeDealSignals({ dealStatus: "SIGNING_PENDING" })
      expect(resolveDealProgressionState(deal)).toBe("SIGNING_STAGE")
    })

    it("maps PICKUP_SCHEDULED to PICKUP_STAGE", () => {
      const deal = makeDealSignals({ dealStatus: "PICKUP_SCHEDULED" })
      expect(resolveDealProgressionState(deal)).toBe("PICKUP_STAGE")
    })

    it("maps COMPLETED to COMPLETED", () => {
      const deal = makeDealSignals({ dealStatus: "COMPLETED" })
      expect(resolveDealProgressionState(deal)).toBe("COMPLETED")
    })

    it("maps CANCELLED to CANCELLED", () => {
      const deal = makeDealSignals({ dealStatus: "CANCELLED" })
      expect(resolveDealProgressionState(deal)).toBe("CANCELLED")
    })

    it("returns HOLD when compliance flags exist", () => {
      const deal = makeDealSignals({
        dealStatus: "FINANCING_PENDING",
        complianceFlags: ["CIRCUMVENTION_ALERT"],
      })
      expect(resolveDealProgressionState(deal)).toBe("HOLD")
    })
  })

  // ---------------------------------------------------------------------------
  // Contract Resolution State Tests
  // ---------------------------------------------------------------------------

  describe("resolveContractResolutionState", () => {
    it("returns NOT_STARTED when contract not uploaded and not at contract stage", () => {
      const deal = makeDealSignals({ dealStatus: "FINANCING_PENDING" })
      expect(resolveContractResolutionState(deal)).toBe("NOT_STARTED")
    })

    it("returns PENDING_UPLOAD when at contract stage but not uploaded", () => {
      const deal = makeDealSignals({ dealStatus: "CONTRACT_PENDING" })
      expect(resolveContractResolutionState(deal)).toBe("PENDING_UPLOAD")
    })

    it("returns SCANNING when contract uploaded and scanning", () => {
      const deal = makeDealSignals({
        contractUploaded: true,
        contractScanStatus: "SCANNING",
      })
      expect(resolveContractResolutionState(deal)).toBe("SCANNING")
    })

    it("returns PASSED when contract scan passed", () => {
      const deal = makeDealSignals({
        contractUploaded: true,
        contractScanPassed: true,
        contractScanStatus: "PASSED",
      })
      expect(resolveContractResolutionState(deal)).toBe("PASSED")
    })

    it("returns FAILED when contract scan failed", () => {
      const deal = makeDealSignals({
        contractUploaded: true,
        contractScanStatus: "FAILED",
      })
      expect(resolveContractResolutionState(deal)).toBe("FAILED")
    })

    it("returns MANUAL_REVIEW_REQUIRED when CMA is open", () => {
      const deal = makeDealSignals({
        contractUploaded: true,
        cmaStatus: "OPEN",
      })
      expect(resolveContractResolutionState(deal)).toBe("MANUAL_REVIEW_REQUIRED")
    })

    it("returns APPROVED when CMA approved", () => {
      const deal = makeDealSignals({
        contractUploaded: true,
        cmaApproved: true,
      })
      expect(resolveContractResolutionState(deal)).toBe("APPROVED")
    })
  })

  // ---------------------------------------------------------------------------
  // E-Sign Readiness Tests
  // ---------------------------------------------------------------------------

  describe("resolveESignReadiness", () => {
    it("returns NOT_READY when contract not approved", () => {
      const deal = makeDealSignals({ dealStatus: "CONTRACT_REVIEW" })
      expect(resolveESignReadiness(deal)).toBe("NOT_READY")
    })

    it("returns READY when contract approved and no esign yet", () => {
      const deal = makeDealSignals({
        dealStatus: "CONTRACT_APPROVED",
        esignStatus: null,
      })
      expect(resolveESignReadiness(deal)).toBe("READY")
    })

    it("returns SENT when esign sent", () => {
      const deal = makeDealSignals({
        dealStatus: "SIGNING_PENDING",
        esignStatus: "SENT",
      })
      expect(resolveESignReadiness(deal)).toBe("SENT")
    })

    it("returns COMPLETED when esign completed", () => {
      const deal = makeDealSignals({
        dealStatus: "SIGNED",
        esignStatus: "COMPLETED",
      })
      expect(resolveESignReadiness(deal)).toBe("COMPLETED")
    })

    it("returns BLOCKED when compliance flags present", () => {
      const deal = makeDealSignals({
        dealStatus: "CONTRACT_APPROVED",
        complianceFlags: ["MANUAL_HOLD"],
      })
      expect(resolveESignReadiness(deal)).toBe("BLOCKED")
    })
  })

  // ---------------------------------------------------------------------------
  // Pickup Readiness Tests
  // ---------------------------------------------------------------------------

  describe("resolvePickupReadiness", () => {
    it("returns NOT_READY when deal not signed", () => {
      const deal = makeDealSignals({ dealStatus: "SIGNING_PENDING" })
      expect(resolvePickupReadiness(deal)).toBe("NOT_READY")
    })

    it("returns READY when deal signed, insurance verified, and no pickup scheduled", () => {
      const deal = makeDealSignals({ dealStatus: "SIGNED", insuranceReadinessStatus: "VERIFIED" })
      expect(resolvePickupReadiness(deal)).toBe("READY")
    })

    it("returns SCHEDULED when pickup is scheduled and insurance verified", () => {
      const deal = makeDealSignals({
        dealStatus: "PICKUP_SCHEDULED",
        pickupStatus: "SCHEDULED",
        insuranceReadinessStatus: "VERIFIED",
      })
      expect(resolvePickupReadiness(deal)).toBe("SCHEDULED")
    })

    it("returns COMPLETED when pickup completed and insurance verified", () => {
      const deal = makeDealSignals({
        dealStatus: "PICKUP_SCHEDULED",
        pickupStatus: "COMPLETED",
        insuranceReadinessStatus: "VERIFIED",
      })
      expect(resolvePickupReadiness(deal)).toBe("COMPLETED")
    })

    it("returns INSURANCE_REQUIRED when deal signed but insurance not verified", () => {
      const deal = makeDealSignals({ dealStatus: "SIGNED", insuranceReadinessStatus: null })
      expect(resolvePickupReadiness(deal)).toBe("INSURANCE_REQUIRED")
    })
  })

  // ---------------------------------------------------------------------------
  // Payout Release State Tests
  // ---------------------------------------------------------------------------

  describe("resolvePayoutReleaseState", () => {
    it("returns NOT_APPLICABLE when no affiliate", () => {
      const deal = makeDealSignals()
      expect(resolvePayoutReleaseState(deal, null)).toBe("NOT_APPLICABLE")
    })

    it("returns BLOCKED when self-referral detected", () => {
      const deal = makeDealSignals()
      const affiliate = makeAffiliateSignals({
        affiliateId: "aff-1",
        selfReferral: true,
      })
      expect(resolvePayoutReleaseState(deal, affiliate)).toBe("BLOCKED")
    })

    it("returns BLOCKED when affiliate fraud detected", () => {
      const deal = makeDealSignals()
      const affiliate = makeAffiliateSignals({
        affiliateId: "aff-1",
        fraudDetected: true,
      })
      expect(resolvePayoutReleaseState(deal, affiliate)).toBe("BLOCKED")
    })

    it("returns HELD when payout pending", () => {
      const deal = makeDealSignals({ payoutStatus: "PENDING" })
      const affiliate = makeAffiliateSignals({ affiliateId: "aff-1" })
      expect(resolvePayoutReleaseState(deal, affiliate)).toBe("HELD")
    })

    it("returns RELEASED when payout completed", () => {
      const deal = makeDealSignals({ payoutStatus: "COMPLETED" })
      const affiliate = makeAffiliateSignals({ affiliateId: "aff-1" })
      expect(resolvePayoutReleaseState(deal, affiliate)).toBe("RELEASED")
    })
  })

  // ---------------------------------------------------------------------------
  // Refund Hold State Tests
  // ---------------------------------------------------------------------------

  describe("resolveRefundHoldState", () => {
    it("returns NONE when no refund", () => {
      const deal = makeDealSignals()
      expect(resolveRefundHoldState(deal)).toBe("NONE")
    })

    it("returns REQUESTED when refund pending", () => {
      const deal = makeDealSignals({ refundStatus: "PENDING" })
      expect(resolveRefundHoldState(deal)).toBe("REQUESTED")
    })

    it("returns COMPLETED when refund succeeded", () => {
      const deal = makeDealSignals({ refundStatus: "SUCCEEDED" })
      expect(resolveRefundHoldState(deal)).toBe("COMPLETED")
    })

    it("returns DENIED when refund cancelled", () => {
      const deal = makeDealSignals({ refundStatus: "CANCELLED" })
      expect(resolveRefundHoldState(deal)).toBe("DENIED")
    })
  })

  // ---------------------------------------------------------------------------
  // Compliance Hold Aggregation Tests
  // ---------------------------------------------------------------------------

  describe("aggregateComplianceHolds", () => {
    it("returns empty when no holds", () => {
      const inputs = makeDecisionInputs()
      expect(aggregateComplianceHolds(inputs)).toEqual([])
    })

    it("includes IDENTITY_UNVERIFIED when buyer not verified", () => {
      const inputs = makeDecisionInputs({
        buyer: makeBuyerSignals({ identityVerified: false }),
      })
      const holds = aggregateComplianceHolds(inputs)
      expect(holds).toContain("IDENTITY_UNVERIFIED")
    })

    it("includes MANUAL_HOLD from buyer", () => {
      const inputs = makeDecisionInputs({
        buyer: makeBuyerSignals({ manualHold: true }),
      })
      const holds = aggregateComplianceHolds(inputs)
      expect(holds).toContain("MANUAL_HOLD")
    })

    it("includes HIGH_RISK_DEALER from dealer", () => {
      const inputs = makeDecisionInputs({
        dealer: makeDealerSignals({ highRisk: true }),
      })
      const holds = aggregateComplianceHolds(inputs)
      expect(holds).toContain("HIGH_RISK_DEALER")
    })

    it("includes SELF_REFERRAL_DETECTED from affiliate", () => {
      const inputs = makeDecisionInputs({
        affiliate: makeAffiliateSignals({ selfReferral: true }),
      })
      const holds = aggregateComplianceHolds(inputs)
      expect(holds).toContain("SELF_REFERRAL_DETECTED")
    })

    it("includes PREQUAL_EXPIRED when prequal expired", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      const inputs = makeDecisionInputs({
        buyer: makeBuyerSignals({
          prequal: {
            exists: true,
            source: "INTERNAL",
            status: "ACTIVE",
            creditTier: "GOOD",
            maxOtd: 30000,
            expiresAt: pastDate,
            softPullCompleted: true,
            consentGiven: true,
          },
        }),
      })
      const holds = aggregateComplianceHolds(inputs)
      expect(holds).toContain("PREQUAL_EXPIRED")
    })

    it("deduplicates hold codes", () => {
      const inputs = makeDecisionInputs({
        buyer: makeBuyerSignals({
          manualHold: true,
          complianceFlags: ["MANUAL_HOLD"],
        }),
      })
      const holds = aggregateComplianceHolds(inputs)
      const manualHoldCount = holds.filter((h) => h === "MANUAL_HOLD").length
      expect(manualHoldCount).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Master Decision Resolution Tests
  // ---------------------------------------------------------------------------

  describe("resolveDecision", () => {
    it("produces a complete decision output with correlationId", () => {
      const inputs = makeDecisionInputs()
      const result = resolveDecision(inputs)

      expect(result.correlationId).toBe("test-corr-id")
      expect(result.buyerReadinessState).toBeDefined()
      expect(result.buyerMessagingEligibilityState).toBeDefined()
      expect(result.resolvedAt).toBe(inputs.timestamp)
    })

    it("includes all canonical output fields", () => {
      const inputs = makeDecisionInputs({
        dealer: makeDealerSignals(),
        deal: makeDealSignals(),
        affiliate: makeAffiliateSignals(),
      })
      const result = resolveDecision(inputs)

      expect(result).toHaveProperty("buyerReadinessState")
      expect(result).toHaveProperty("buyerMessagingEligibilityState")
      expect(result).toHaveProperty("dealerOperationalState")
      expect(result).toHaveProperty("dealProgressionState")
      expect(result).toHaveProperty("contractResolutionState")
      expect(result).toHaveProperty("esignReadinessState")
      expect(result).toHaveProperty("pickupReadinessState")
      expect(result).toHaveProperty("payoutReleaseState")
      expect(result).toHaveProperty("refundHoldState")
      expect(result).toHaveProperty("manualReviewRequired")
      expect(result).toHaveProperty("complianceHoldReasonCodes")
      expect(result).toHaveProperty("decisionSourceSummary")
    })

    it("sets manualReviewRequired when CMA is open", () => {
      const inputs = makeDecisionInputs({
        deal: makeDealSignals({ cmaStatus: "OPEN" }),
      })
      const result = resolveDecision(inputs)
      expect(result.manualReviewRequired).toBe(true)
    })

    it("returns null for dealer/deal/affiliate outputs when not provided", () => {
      const inputs = makeDecisionInputs()
      const result = resolveDecision(inputs)

      expect(result.dealerOperationalState).toBeNull()
      expect(result.dealProgressionState).toBeNull()
      expect(result.contractResolutionState).toBeNull()
      expect(result.esignReadinessState).toBeNull()
      expect(result.pickupReadinessState).toBeNull()
      expect(result.payoutReleaseState).toBeNull()
      expect(result.refundHoldState).toBeNull()
    })

    it("populates decisionSourceSummary with buyer signals", () => {
      const inputs = makeDecisionInputs({
        buyer: makeBuyerSignals({
          prequal: {
            exists: true,
            source: "INTERNAL",
            status: "ACTIVE",
            creditTier: "GOOD",
            maxOtd: 30000,
            expiresAt: null,
            softPullCompleted: true,
            consentGiven: true,
          },
        }),
      })
      const result = resolveDecision(inputs)
      const prequal = result.decisionSourceSummary.find((s) => s.signal === "prequal")
      expect(prequal).toBeDefined()
      expect(prequal?.source).toBe("buyer")
      expect(prequal?.value).toContain("INTERNAL")
    })

    it("full deal lifecycle — happy path outputs correct states", () => {
      const inputs = makeDecisionInputs({
        buyer: makeBuyerSignals({
          prequal: {
            exists: true,
            source: "INTERNAL",
            status: "ACTIVE",
            creditTier: "GOOD",
            maxOtd: 30000,
            expiresAt: null,
            softPullCompleted: true,
            consentGiven: true,
          },
        }),
        dealer: makeDealerSignals(),
        deal: makeDealSignals({
          dealStatus: "SIGNED",
          financingApproved: true,
          feePaid: true,
          insuranceComplete: true,
          insuranceReadinessStatus: "VERIFIED",
          contractUploaded: true,
          contractScanPassed: true,
          cmaApproved: true,
          esignStatus: "COMPLETED",
          esignCompleted: true,
        }),
      })
      const result = resolveDecision(inputs)

      expect(result.buyerReadinessState).toBe("PREQUAL_ACTIVE")
      expect(result.buyerMessagingEligibilityState).toBe("ELIGIBLE")
      expect(result.dealerOperationalState).toBe("ACTIVE")
      expect(result.dealProgressionState).toBe("SIGNING_STAGE")
      expect(result.contractResolutionState).toBe("APPROVED")
      expect(result.esignReadinessState).toBe("COMPLETED")
      expect(result.pickupReadinessState).toBe("READY")
      expect(result.manualReviewRequired).toBe(false)
      expect(result.complianceHoldReasonCodes).toEqual([])
    })
  })
})
