import { describe, it, expect } from "vitest"

import {
  resolvePickupReadiness,
  resolveBuyerReadiness,
} from "@/lib/services/decision-engine/engine"

import type {
  DealSignals,
  BuyerSignals,
} from "@/lib/services/decision-engine/types"

// ─── Pickup Readiness with Insurance Gating ────────────────────────────────

describe("resolvePickupReadiness — Insurance Gating", () => {
  const baseDealSignals: DealSignals = {
    dealId: "deal-1",
    dealStatus: "SIGNED",
    paymentType: "CASH",
    financingApproved: true,
    feeStatus: "PAID",
    feePaid: true,
    insuranceStatus: "BOUND",
    insuranceComplete: true,
    insuranceReadinessStatus: "VERIFIED",
    deliveryBlockFlag: false,
    contractUploaded: true,
    contractScanStatus: "PASSED",
    contractScanPassed: true,
    cmaStatus: null,
    cmaApproved: false,
    esignStatus: "COMPLETED",
    esignCompleted: true,
    pickupStatus: null,
    payoutStatus: null,
    refundStatus: null,
    complianceFlags: [],
    manualHold: false,
  }

  it("should return READY when deal is SIGNED and insurance is VERIFIED", () => {
    const result = resolvePickupReadiness(baseDealSignals)
    expect(result).toBe("READY")
  })

  it("should return INSURANCE_REQUIRED when deal is SIGNED but insurance is NOT_STARTED", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      insuranceReadinessStatus: "NOT_STARTED",
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return INSURANCE_REQUIRED when deal is SIGNED but insurance is INSURANCE_PENDING", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      insuranceReadinessStatus: "INSURANCE_PENDING",
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return INSURANCE_REQUIRED when deal is SIGNED but insurance is CURRENT_INSURANCE_UPLOADED", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      insuranceReadinessStatus: "CURRENT_INSURANCE_UPLOADED",
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return INSURANCE_REQUIRED when deal is SIGNED but insurance is UNDER_REVIEW", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      insuranceReadinessStatus: "UNDER_REVIEW",
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return INSURANCE_REQUIRED when deal is SIGNED but insurance is HELP_REQUESTED", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      insuranceReadinessStatus: "HELP_REQUESTED",
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return INSURANCE_REQUIRED when deal is SIGNED but insurance is REQUIRED_BEFORE_DELIVERY", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      insuranceReadinessStatus: "REQUIRED_BEFORE_DELIVERY",
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return INSURANCE_REQUIRED when insuranceReadinessStatus is null", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      insuranceReadinessStatus: null,
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return NOT_READY when deal is not SIGNED regardless of insurance", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      dealStatus: "CONTRACT_PENDING",
      insuranceReadinessStatus: "VERIFIED",
    })
    expect(result).toBe("NOT_READY")
  })

  it("should return SCHEDULED when insurance is VERIFIED and pickup is SCHEDULED", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      pickupStatus: "SCHEDULED",
    })
    expect(result).toBe("SCHEDULED")
  })

  it("should return COMPLETED when insurance is VERIFIED and pickup is COMPLETED", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      pickupStatus: "COMPLETED",
    })
    expect(result).toBe("COMPLETED")
  })
})

// ─── Buyer Readiness — No Insurance Dependency ─────────────────────────────

describe("resolveBuyerReadiness — Insurance Independence", () => {
  const baseBuyerSignals: BuyerSignals = {
    buyerId: "buyer-1",
    profileComplete: true,
    prequal: {
      exists: true,
      source: "INTERNAL",
      status: "ACTIVE",
      creditTier: "GOOD",
      maxOtd: 30000,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      softPullCompleted: true,
      consentGiven: true,
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
  }

  it("should resolve to PREQUAL_ACTIVE regardless of insurance status", () => {
    // Insurance is not a signal in BuyerSignals — buyer readiness is
    // independent of insurance status
    const result = resolveBuyerReadiness(baseBuyerSignals)
    expect(result).toBe("PREQUAL_ACTIVE")
  })

  it("PREQUAL_ACTIVE should not require insurance for shortlist/auction eligibility", () => {
    // Verify there's no insurance field in BuyerSignals type
    const signalKeys = Object.keys(baseBuyerSignals)
    expect(signalKeys).not.toContain("insuranceStatus")
    expect(signalKeys).not.toContain("insuranceComplete")
    expect(signalKeys).not.toContain("insuranceReadinessStatus")
  })

  it("should resolve PREQUAL_REQUIRED when no prequal exists", () => {
    const result = resolveBuyerReadiness({
      ...baseBuyerSignals,
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
    })
    expect(result).toBe("PREQUAL_REQUIRED")
  })

  it("should resolve CASH_DECLARED for cash basis buyers", () => {
    const result = resolveBuyerReadiness({
      ...baseBuyerSignals,
      cashBasis: true,
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
    })
    expect(result).toBe("CASH_DECLARED")
  })
})

// ─── delivery_block_flag as canonical gate ──────────────────────────────────

describe("resolvePickupReadiness — delivery_block_flag", () => {
  const baseDealSignals: DealSignals = {
    dealId: "deal-1",
    dealStatus: "SIGNED",
    paymentType: "CASH",
    financingApproved: true,
    feeStatus: "PAID",
    feePaid: true,
    insuranceStatus: "BOUND",
    insuranceComplete: true,
    insuranceReadinessStatus: "VERIFIED",
    deliveryBlockFlag: false,
    contractUploaded: true,
    contractScanStatus: "PASSED",
    contractScanPassed: true,
    cmaStatus: null,
    cmaApproved: false,
    esignStatus: "COMPLETED",
    esignCompleted: true,
    pickupStatus: null,
    payoutStatus: null,
    refundStatus: null,
    complianceFlags: [],
    manualHold: false,
  }

  it("should return READY when deliveryBlockFlag is false and insurance is VERIFIED", () => {
    const result = resolvePickupReadiness(baseDealSignals)
    expect(result).toBe("READY")
  })

  it("should return INSURANCE_REQUIRED when deliveryBlockFlag is true even if insurance status is VERIFIED", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      deliveryBlockFlag: true,
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })

  it("should return INSURANCE_REQUIRED when deliveryBlockFlag is true and insurance is NOT_STARTED", () => {
    const result = resolvePickupReadiness({
      ...baseDealSignals,
      deliveryBlockFlag: true,
      insuranceReadinessStatus: "NOT_STARTED",
    })
    expect(result).toBe("INSURANCE_REQUIRED")
  })
})
