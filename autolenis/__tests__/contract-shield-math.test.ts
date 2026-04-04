import { describe, it, expect } from "vitest"

/**
 * Contract Shield™ math validation tests
 *
 * These tests verify the core math consistency checks that Contract Shield
 * performs when reviewing dealer contracts.
 *
 * NOTE: Contract Shield is an informational tool only. It does not provide
 * legal, tax, or financial advice. It is not guaranteed to catch all issues.
 */

// ──────────────────────────────────────────────────────────────
// Re-implement the pure-math helpers from ContractShieldService
// so we can test them without a database.
// ──────────────────────────────────────────────────────────────

const FLAGGED_ADD_ONS = [
  "nitrogen_tire",
  "vin_etching",
  "market_adjustment",
  "dealer_prep",
  "additional_dealer_markup",
  "addendum_sticker",
  "dealer_add_on",
  "protection_package",
  "paint_protection",
  "fabric_protection",
]

const STATE_DOC_FEE_REFERENCE: Record<string, { typical: number; note: string }> = {
  CA: { typical: 85, note: "CA has a statutory cap" },
  FL: { typical: 999, note: "No statutory cap" },
  TX: { typical: 150, note: "Typical range" },
  NY: { typical: 75, note: "Typical range" },
  GA: { typical: 699, note: "No statutory cap" },
}

type IssueSeverity = "INFO" | "REVIEW" | "IMPORTANT" | "CRITICAL"
interface ShieldIssue {
  severity: IssueSeverity
  category: string
  description: string
}

function checkOtdConsistency(agreedOtdCents: number, offerOtdCents: number): ShieldIssue | null {
  if (Math.abs(agreedOtdCents - offerOtdCents) > 100) {
    return {
      severity: "CRITICAL",
      category: "OTD_DIFFERENCE",
      description: `OTD mismatch: contract $${(agreedOtdCents / 100).toLocaleString()} vs offer $${(offerOtdCents / 100).toLocaleString()}`,
    }
  }
  return null
}

function checkAprConsistency(contractApr: number, financingApr: number): ShieldIssue | null {
  if (Math.abs(contractApr - financingApr) > 0.01) {
    return {
      severity: "CRITICAL",
      category: "APR_DIFFERENCE",
      description: `APR mismatch: contract ${contractApr}% vs financing ${financingApr}%`,
    }
  }
  return null
}

function checkMonthlyPayment(contractPayment: number, expectedPayment: number): ShieldIssue | null {
  if (Math.abs(contractPayment - expectedPayment) > 5) {
    return {
      severity: "CRITICAL",
      category: "PAYMENT_DIFFERENCE",
      description: `Monthly payment mismatch: contract $${contractPayment} vs expected $${expectedPayment}`,
    }
  }
  return null
}

function checkFeeCalculation(basePriceCents: number, totalFeesCents: number, taxCents: number, contractOtdCents: number): ShieldIssue | null {
  const calculatedOtd = basePriceCents + totalFeesCents + taxCents
  if (Math.abs(calculatedOtd - contractOtdCents) > 5000) {
    return {
      severity: "REVIEW",
      category: "FEE_CALCULATION",
      description: "Fee totals may not add up to the final price",
    }
  }
  return null
}

function reviewDocFee(docFeeDollars: number, dealerState: string): ShieldIssue | null {
  const ref = STATE_DOC_FEE_REFERENCE[dealerState]
  if (ref && docFeeDollars > ref.typical * 1.5) {
    return {
      severity: "REVIEW",
      category: "FEE_REVIEW",
      description: `Doc fee ($${docFeeDollars}) exceeds 150% of typical for ${dealerState} ($${ref.typical})`,
    }
  }
  return null
}

function detectFlaggedAddOns(fees: Record<string, number>): string[] {
  const flagged: string[] = []
  for (const [feeKey, feeAmount] of Object.entries(fees)) {
    const normalizedKey = feeKey.toLowerCase().replace(/\s+/g, "_")
    for (const pattern of FLAGGED_ADD_ONS) {
      if (normalizedKey.includes(pattern) && feeAmount > 0) {
        flagged.push(feeKey)
        break
      }
    }
  }
  return flagged
}

function determineScanStatus(criticalCount: number, importantCount: number, reviewCount: number): "PASS" | "REVIEW_READY" | "FAIL" {
  if (criticalCount > 0) return "FAIL"
  if (importantCount > 0 || reviewCount > 0) return "REVIEW_READY"
  return "PASS"
}

function calculateScanScore(status: "PASS" | "REVIEW_READY" | "FAIL", criticalCount: number, importantCount: number, reviewCount: number): number {
  if (status === "PASS") return 100
  if (status === "FAIL") return Math.max(0, 100 - criticalCount * 25 - importantCount * 10)
  return Math.max(50, 100 - importantCount * 10 - reviewCount * 2)
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe("Contract Shield™ Math Validation", () => {
  describe("OTD Price Consistency", () => {
    it("passes when OTD matches within $1 tolerance", () => {
      expect(checkOtdConsistency(2500000, 2500000)).toBeNull()
      expect(checkOtdConsistency(2500050, 2500000)).toBeNull()
      expect(checkOtdConsistency(2500100, 2500000)).toBeNull()
    })

    it("flags CRITICAL when OTD differs by more than $1", () => {
      const result = checkOtdConsistency(2500101, 2500000)
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("CRITICAL")
      expect(result!.category).toBe("OTD_DIFFERENCE")
    })

    it("detects large OTD discrepancy", () => {
      const result = checkOtdConsistency(3000000, 2500000) // $5000 difference
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("CRITICAL")
    })

    it("handles symmetric difference (contract lower than offer)", () => {
      const result = checkOtdConsistency(2400000, 2500000) // offer is higher
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("CRITICAL")
    })
  })

  describe("APR Consistency", () => {
    it("passes when APR matches within 0.01% tolerance", () => {
      expect(checkAprConsistency(5.99, 5.99)).toBeNull()
      expect(checkAprConsistency(5.99, 5.985)).toBeNull()
      expect(checkAprConsistency(5.99, 6.0)).toBeNull()
    })

    it("flags CRITICAL when APR differs by more than 0.01%", () => {
      const result = checkAprConsistency(6.5, 5.99)
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("CRITICAL")
      expect(result!.category).toBe("APR_DIFFERENCE")
    })

    it("catches small but meaningful APR difference", () => {
      const result = checkAprConsistency(5.99, 5.49) // 0.5% higher
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("CRITICAL")
    })

    it("handles zero APR (0% financing)", () => {
      expect(checkAprConsistency(0, 0)).toBeNull()
      const result = checkAprConsistency(0.5, 0)
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("CRITICAL")
    })
  })

  describe("Monthly Payment Verification", () => {
    it("passes when monthly payment matches within $5 tolerance", () => {
      expect(checkMonthlyPayment(450, 450)).toBeNull()
      expect(checkMonthlyPayment(453, 450)).toBeNull()
      expect(checkMonthlyPayment(455, 450)).toBeNull()
    })

    it("flags CRITICAL when monthly payment differs by more than $5", () => {
      const result = checkMonthlyPayment(460, 450)
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("CRITICAL")
      expect(result!.category).toBe("PAYMENT_DIFFERENCE")
    })

    it("detects overcharge on monthly payment", () => {
      const result = checkMonthlyPayment(500, 450)
      expect(result).not.toBeNull()
    })
  })

  describe("Fee Calculation Check", () => {
    it("passes when fees add up correctly", () => {
      // base: $25,000, fees: $500, tax: $1,500, OTD: $27,000
      expect(checkFeeCalculation(2500000, 50000, 150000, 2700000)).toBeNull()
    })

    it("flags REVIEW when fee totals don't match OTD", () => {
      // base: $25,000, fees: $500, tax: $1,500 = $27,000, but contract says $27,100
      const result = checkFeeCalculation(2500000, 50000, 150000, 2710100)
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("REVIEW")
      expect(result!.category).toBe("FEE_CALCULATION")
    })
  })

  describe("Doc Fee Review", () => {
    it("does not flag doc fees within typical range", () => {
      expect(reviewDocFee(80, "CA")).toBeNull()
      expect(reviewDocFee(127, "CA")).toBeNull() // Exactly at 1.5x
    })

    it("flags doc fee exceeding 150% of typical for CA", () => {
      const result = reviewDocFee(150, "CA") // typical $85, 150% = $127.50
      expect(result).not.toBeNull()
      expect(result!.severity).toBe("REVIEW")
      expect(result!.category).toBe("FEE_REVIEW")
    })

    it("handles states with higher typical fees", () => {
      expect(reviewDocFee(999, "FL")).toBeNull() // FL typical $999
      const result = reviewDocFee(1600, "FL") // 150% of $999 = $1498.50
      expect(result).not.toBeNull()
    })

    it("does not flag unknown states", () => {
      expect(reviewDocFee(5000, "ZZ")).toBeNull()
    })
  })

  describe("Add-On Detection", () => {
    it("detects flagged add-ons", () => {
      const fees = {
        nitrogen_tire_fill: 299,
        vin_etching_fee: 199,
        doc_fee: 85,
      }
      const flagged = detectFlaggedAddOns(fees)
      expect(flagged).toContain("nitrogen_tire_fill")
      expect(flagged).toContain("vin_etching_fee")
      expect(flagged).not.toContain("doc_fee")
    })

    it("ignores zero-amount flagged items", () => {
      const fees = {
        nitrogen_tire_fill: 0,
        doc_fee: 85,
      }
      const flagged = detectFlaggedAddOns(fees)
      expect(flagged).toHaveLength(0)
    })

    it("handles mixed case and spaces in fee names", () => {
      const fees = {
        "Paint Protection Package": 799,
        "Fabric Protection": 399,
      }
      const flagged = detectFlaggedAddOns(fees)
      expect(flagged).toContain("Paint Protection Package")
      expect(flagged).toContain("Fabric Protection")
    })

    it("returns empty array when no flagged add-ons present", () => {
      const fees = {
        sales_tax: 1500,
        registration: 350,
        doc_fee: 85,
      }
      const flagged = detectFlaggedAddOns(fees)
      expect(flagged).toHaveLength(0)
    })
  })

  describe("Scan Status Determination", () => {
    it("returns PASS when no issues found", () => {
      expect(determineScanStatus(0, 0, 0)).toBe("PASS")
    })

    it("returns FAIL when critical issues exist", () => {
      expect(determineScanStatus(1, 0, 0)).toBe("FAIL")
      expect(determineScanStatus(3, 2, 1)).toBe("FAIL")
    })

    it("returns REVIEW_READY when important or review issues exist", () => {
      expect(determineScanStatus(0, 1, 0)).toBe("REVIEW_READY")
      expect(determineScanStatus(0, 0, 1)).toBe("REVIEW_READY")
      expect(determineScanStatus(0, 2, 3)).toBe("REVIEW_READY")
    })
  })

  describe("Scan Score Calculation", () => {
    it("gives 100 for PASS status", () => {
      expect(calculateScanScore("PASS", 0, 0, 0)).toBe(100)
    })

    it("deducts 25 per critical issue for FAIL", () => {
      expect(calculateScanScore("FAIL", 1, 0, 0)).toBe(75)
      expect(calculateScanScore("FAIL", 2, 0, 0)).toBe(50)
      expect(calculateScanScore("FAIL", 4, 0, 0)).toBe(0)
    })

    it("deducts 10 per important + 25 per critical for FAIL", () => {
      expect(calculateScanScore("FAIL", 1, 2, 0)).toBe(55)
    })

    it("never goes below 0 for FAIL", () => {
      expect(calculateScanScore("FAIL", 10, 10, 10)).toBe(0)
    })

    it("deducts 10 per important + 2 per review for REVIEW_READY", () => {
      expect(calculateScanScore("REVIEW_READY", 0, 1, 0)).toBe(90)
      expect(calculateScanScore("REVIEW_READY", 0, 0, 5)).toBe(90)
      expect(calculateScanScore("REVIEW_READY", 0, 2, 5)).toBe(70)
    })

    it("never goes below 50 for REVIEW_READY", () => {
      expect(calculateScanScore("REVIEW_READY", 0, 10, 10)).toBe(50)
    })
  })
})
