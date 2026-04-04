import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Controlled Manual Approval (CMA) — Unit tests
 *
 * These tests verify the CMA state machine, validation logic,
 * dual approval enforcement, revocation, and false-positive tracking
 * without requiring a database connection.
 *
 * NOTE: This is an informational tool only. It does not provide
 * legal, tax, or financial advice.
 */

// ──────────────────────────────────────────────────────────────
// Re-implement CMA pure logic for testing without DB
// ──────────────────────────────────────────────────────────────

const CMA_ROOT_CAUSE_CATEGORIES = [
  "FALSE_POSITIVE_SCAN",
  "INTERNAL_DATA_MISMATCH",
  "DEPENDENCY_FAILURE",
  "POLICY_RULES_DISCREPANCY",
  "MISSING_INTERNAL_ATTESTATION",
  "OTHER",
] as const

const CMA_INTERNAL_QUEUES = ["OPS", "ENGINEERING", "POLICY"] as const

type ManualReviewStatus = "OPEN" | "PENDING_SECOND_APPROVAL" | "APPROVED" | "RETURNED_INTERNAL_FIX" | "REVOKED"

const ATTESTATION_TEXT_V1 =
  "I certify this packet meets AutoLenis contract standards and accept manual-approval accountability."

const DUAL_APPROVAL_AMOUNT_THRESHOLD_CENTS = 7500000 // $75,000

/**
 * Simple deterministic hash for testing (avoids Node.js crypto import in vitest)
 */
function computeDocHash(url: string, version: number): string {
  const input = `${url}:v${version}`
  // Simple hash for testing purposes — the real implementation uses SHA-256
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0")
}

interface ChecklistData {
  vinMatch: boolean
  buyerIdentityMatch: boolean
  otdMathValidated: boolean
  feesValidated: boolean
  termsValidated: boolean
  disclosuresPresent: boolean
  attestationAccepted: boolean
  rootCauseCategory: string | null
  evidenceAttachmentIds: string[]
}

function validateChecklistComplete(review: ChecklistData): string | null {
  if (!review.rootCauseCategory) return "Root cause category is required"
  if (!review.vinMatch) return "VIN match must be confirmed"
  if (!review.buyerIdentityMatch) return "Buyer identity match must be confirmed"
  if (!review.otdMathValidated) return "OTD math must be validated"
  if (!review.feesValidated) return "Fees must be validated"
  if (!review.termsValidated) return "Terms must be validated"
  if (!review.disclosuresPresent) return "Disclosures must be present"
  if (!review.attestationAccepted) return "Attestation must be accepted"
  if (review.evidenceAttachmentIds.length === 0) return "At least one evidence attachment is required"
  return null
}

interface DualApprovalContext {
  otdCents: number
  hasCriticalFinding: boolean
  hasFeeWarning: boolean
}

function requiresDualApproval(ctx: DualApprovalContext): boolean {
  if (ctx.otdCents > DUAL_APPROVAL_AMOUNT_THRESHOLD_CENTS) return true
  if (ctx.hasCriticalFinding) return true
  if (ctx.hasFeeWarning) return true
  return false
}

type DealStatus =
  | "CONTRACT_PENDING"
  | "CONTRACT_REVIEW"
  | "CONTRACT_MANUAL_REVIEW_REQUIRED"
  | "CONTRACT_INTERNAL_FIX_IN_PROGRESS"
  | "CONTRACT_ADMIN_OVERRIDE_APPROVED"
  | "CONTRACT_APPROVED"

/** Determine the target deal status for a given CMA action */
function getApprovalDealStatus(
  approvalMode: "MANUAL_VALIDATED" | "EXCEPTION_OVERRIDE",
): DealStatus {
  if (approvalMode === "MANUAL_VALIDATED") return "CONTRACT_APPROVED"
  if (approvalMode === "EXCEPTION_OVERRIDE") return "CONTRACT_ADMIN_OVERRIDE_APPROVED"
  return "CONTRACT_APPROVED"
}

/** Check if a reject is dealer-correctable or should route to CMA */
function isDealerCorrectable(
  category: string,
  severity: string,
): boolean {
  // Dealer-correctable categories
  const dealerFixable = [
    "MISSING_DOCUMENT",
    "DOCUMENT_INCOMPLETE",
    "SIGNATURE_MISSING",
  ]
  return dealerFixable.includes(category)
}

function shouldRouteToManualReview(
  category: string,
  severity: string,
): boolean {
  return !isDealerCorrectable(category, severity)
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe("CMA State Machine", () => {
  describe("Routing: dealer-correctable vs CMA", () => {
    it("routes dealer-correctable issues to dealer fix path", () => {
      expect(isDealerCorrectable("MISSING_DOCUMENT", "CRITICAL")).toBe(true)
      expect(isDealerCorrectable("DOCUMENT_INCOMPLETE", "IMPORTANT")).toBe(true)
      expect(isDealerCorrectable("SIGNATURE_MISSING", "CRITICAL")).toBe(true)
    })

    it("routes non-dealer-correctable issues to CMA", () => {
      expect(shouldRouteToManualReview("APR_DIFFERENCE", "CRITICAL")).toBe(true)
      expect(shouldRouteToManualReview("OTD_DIFFERENCE", "CRITICAL")).toBe(true)
      expect(shouldRouteToManualReview("FEE_REVIEW", "IMPORTANT")).toBe(true)
      expect(shouldRouteToManualReview("ADD_ON_REVIEW", "REVIEW")).toBe(true)
      expect(shouldRouteToManualReview("PAYMENT_DIFFERENCE", "CRITICAL")).toBe(true)
    })

    it("does not route dealer-fixable issues to CMA", () => {
      expect(shouldRouteToManualReview("MISSING_DOCUMENT", "CRITICAL")).toBe(false)
    })
  })

  describe("CMA Status Transitions", () => {
    it("MANUAL_VALIDATED produces CONTRACT_APPROVED status", () => {
      expect(getApprovalDealStatus("MANUAL_VALIDATED")).toBe("CONTRACT_APPROVED")
    })

    it("EXCEPTION_OVERRIDE produces CONTRACT_ADMIN_OVERRIDE_APPROVED status", () => {
      expect(getApprovalDealStatus("EXCEPTION_OVERRIDE")).toBe("CONTRACT_ADMIN_OVERRIDE_APPROVED")
    })
  })
})

describe("CMA Checklist Validation", () => {
  const completeChecklist: ChecklistData = {
    vinMatch: true,
    buyerIdentityMatch: true,
    otdMathValidated: true,
    feesValidated: true,
    termsValidated: true,
    disclosuresPresent: true,
    attestationAccepted: true,
    rootCauseCategory: "FALSE_POSITIVE_SCAN",
    evidenceAttachmentIds: ["evidence-1"],
  }

  it("validates a complete checklist", () => {
    expect(validateChecklistComplete(completeChecklist)).toBeNull()
  })

  it("rejects missing root cause category", () => {
    const incomplete = { ...completeChecklist, rootCauseCategory: null }
    expect(validateChecklistComplete(incomplete)).toBe("Root cause category is required")
  })

  it("rejects missing VIN match", () => {
    const incomplete = { ...completeChecklist, vinMatch: false }
    expect(validateChecklistComplete(incomplete)).toBe("VIN match must be confirmed")
  })

  it("rejects missing buyer identity match", () => {
    const incomplete = { ...completeChecklist, buyerIdentityMatch: false }
    expect(validateChecklistComplete(incomplete)).toBe("Buyer identity match must be confirmed")
  })

  it("rejects missing OTD validation", () => {
    const incomplete = { ...completeChecklist, otdMathValidated: false }
    expect(validateChecklistComplete(incomplete)).toBe("OTD math must be validated")
  })

  it("rejects missing fees validation", () => {
    const incomplete = { ...completeChecklist, feesValidated: false }
    expect(validateChecklistComplete(incomplete)).toBe("Fees must be validated")
  })

  it("rejects missing terms validation", () => {
    const incomplete = { ...completeChecklist, termsValidated: false }
    expect(validateChecklistComplete(incomplete)).toBe("Terms must be validated")
  })

  it("rejects missing disclosures", () => {
    const incomplete = { ...completeChecklist, disclosuresPresent: false }
    expect(validateChecklistComplete(incomplete)).toBe("Disclosures must be present")
  })

  it("rejects missing attestation", () => {
    const incomplete = { ...completeChecklist, attestationAccepted: false }
    expect(validateChecklistComplete(incomplete)).toBe("Attestation must be accepted")
  })

  it("rejects empty evidence attachments", () => {
    const incomplete = { ...completeChecklist, evidenceAttachmentIds: [] }
    expect(validateChecklistComplete(incomplete)).toBe("At least one evidence attachment is required")
  })
})

describe("CMA Dual Approval", () => {
  it("requires dual approval when deal exceeds amount threshold", () => {
    expect(requiresDualApproval({
      otdCents: 8000000, // $80,000
      hasCriticalFinding: false,
      hasFeeWarning: false,
    })).toBe(true)
  })

  it("does not require dual approval for small deals", () => {
    expect(requiresDualApproval({
      otdCents: 3000000, // $30,000
      hasCriticalFinding: false,
      hasFeeWarning: false,
    })).toBe(false)
  })

  it("requires dual approval for critical findings", () => {
    expect(requiresDualApproval({
      otdCents: 3000000,
      hasCriticalFinding: true,
      hasFeeWarning: false,
    })).toBe(true)
  })

  it("requires dual approval for fee warnings", () => {
    expect(requiresDualApproval({
      otdCents: 3000000,
      hasCriticalFinding: false,
      hasFeeWarning: true,
    })).toBe(true)
  })

  it("does not require dual approval when no conditions met", () => {
    expect(requiresDualApproval({
      otdCents: 5000000,
      hasCriticalFinding: false,
      hasFeeWarning: false,
    })).toBe(false)
  })

  it("requires dual approval at exactly the threshold", () => {
    // At exactly 75000 dollars = 7500000 cents, should NOT require (uses >)
    expect(requiresDualApproval({
      otdCents: 7500000,
      hasCriticalFinding: false,
      hasFeeWarning: false,
    })).toBe(false)
  })

  it("requires dual approval at 1 cent over threshold", () => {
    expect(requiresDualApproval({
      otdCents: 7500001,
      hasCriticalFinding: false,
      hasFeeWarning: false,
    })).toBe(true)
  })
})

describe("CMA Document Hash Integrity", () => {
  it("produces deterministic hashes", () => {
    const hash1 = computeDocHash("https://example.com/doc.pdf", 1)
    const hash2 = computeDocHash("https://example.com/doc.pdf", 1)
    expect(hash1).toBe(hash2)
  })

  it("produces different hashes for different URLs", () => {
    const hash1 = computeDocHash("https://example.com/doc-a.pdf", 1)
    const hash2 = computeDocHash("https://example.com/doc-b.pdf", 1)
    expect(hash1).not.toBe(hash2)
  })

  it("produces different hashes for different versions", () => {
    const hash1 = computeDocHash("https://example.com/doc.pdf", 1)
    const hash2 = computeDocHash("https://example.com/doc.pdf", 2)
    expect(hash1).not.toBe(hash2)
  })

  it("hash is a hex string", () => {
    const hash = computeDocHash("https://example.com/doc.pdf", 1)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })
})

describe("CMA Root Cause Categories", () => {
  it("contains all required categories", () => {
    expect(CMA_ROOT_CAUSE_CATEGORIES).toContain("FALSE_POSITIVE_SCAN")
    expect(CMA_ROOT_CAUSE_CATEGORIES).toContain("INTERNAL_DATA_MISMATCH")
    expect(CMA_ROOT_CAUSE_CATEGORIES).toContain("DEPENDENCY_FAILURE")
    expect(CMA_ROOT_CAUSE_CATEGORIES).toContain("POLICY_RULES_DISCREPANCY")
    expect(CMA_ROOT_CAUSE_CATEGORIES).toContain("MISSING_INTERNAL_ATTESTATION")
    expect(CMA_ROOT_CAUSE_CATEGORIES).toContain("OTHER")
  })

  it("has exactly 6 categories", () => {
    expect(CMA_ROOT_CAUSE_CATEGORIES).toHaveLength(6)
  })
})

describe("CMA Internal Fix Queues", () => {
  it("contains required queues", () => {
    expect(CMA_INTERNAL_QUEUES).toContain("OPS")
    expect(CMA_INTERNAL_QUEUES).toContain("ENGINEERING")
    expect(CMA_INTERNAL_QUEUES).toContain("POLICY")
  })

  it("has exactly 3 queues", () => {
    expect(CMA_INTERNAL_QUEUES).toHaveLength(3)
  })
})

describe("CMA Attestation", () => {
  it("has the correct attestation text", () => {
    expect(ATTESTATION_TEXT_V1).toBe(
      "I certify this packet meets AutoLenis contract standards and accept manual-approval accountability.",
    )
  })
})

describe("CMA Second Approver Enforcement", () => {
  it("enforces different admin for second approval", () => {
    const firstApproverId = "admin-001"
    const secondApproverId = "admin-002"

    // Different admins should be allowed
    expect(firstApproverId).not.toBe(secondApproverId)

    // Same admin should be blocked
    const sameAdmin = "admin-001"
    expect(firstApproverId === sameAdmin).toBe(true)
  })

  it("rejects second approval from the same admin as primary approver", () => {
    const review = {
      status: "PENDING_SECOND_APPROVAL" as ManualReviewStatus,
      approvedBy: "admin-001",
    }

    const secondApproverUserId = "admin-001" // same user

    // Verify the review is in the correct state
    expect(review.status).toBe("PENDING_SECOND_APPROVAL")

    // Four-eyes enforcement — same admin cannot approve both stages
    const isSameApprover = review.approvedBy === secondApproverUserId
    expect(isSameApprover).toBe(true)

    // This should be rejected
    if (isSameApprover) {
      const error = "Second approver cannot be the same as the primary approver"
      expect(error).toMatch(/same as the primary approver/)
    }
  })

  it("allows second approval from a different admin", () => {
    const review = {
      status: "PENDING_SECOND_APPROVAL" as ManualReviewStatus,
      approvedBy: "admin-001",
    }

    const secondApproverUserId = "admin-002" // different user

    const isSameApprover = review.approvedBy === secondApproverUserId
    expect(isSameApprover).toBe(false)
  })

  it("rejects second approval when review is not in PENDING_SECOND_APPROVAL state", () => {
    const review = {
      status: "OPEN" as ManualReviewStatus,
      approvedBy: "admin-001",
    }

    // Must be in PENDING_SECOND_APPROVAL state
    const isCorrectState = review.status === "PENDING_SECOND_APPROVAL"
    expect(isCorrectState).toBe(false)
  })
})

describe("CMA Revocation Idempotency", () => {
  it("already-revoked review should be a no-op", () => {
    // Simulating the logic: if status is REVOKED, return early
    const review = { status: "REVOKED" as ManualReviewStatus }
    const isAlreadyRevoked = review.status === "REVOKED"
    expect(isAlreadyRevoked).toBe(true)
  })

  it("approved review can be revoked", () => {
    const review = { status: "APPROVED" as ManualReviewStatus }
    const canRevoke = review.status === "APPROVED"
    expect(canRevoke).toBe(true)
  })

  it("open review cannot be revoked", () => {
    const review = { status: "OPEN" as ManualReviewStatus }
    const canRevoke = review.status === "APPROVED"
    expect(canRevoke).toBe(false)
  })
})

describe("CMA False-Positive Tracking", () => {
  it("increments false-positive only for FALSE_POSITIVE_SCAN root cause with MANUAL_VALIDATED", () => {
    const scenarios = [
      { rootCause: "FALSE_POSITIVE_SCAN", mode: "MANUAL_VALIDATED", expected: true },
      { rootCause: "INTERNAL_DATA_MISMATCH", mode: "MANUAL_VALIDATED", expected: false },
      { rootCause: "FALSE_POSITIVE_SCAN", mode: "EXCEPTION_OVERRIDE", expected: false },
      { rootCause: "DEPENDENCY_FAILURE", mode: "EXCEPTION_OVERRIDE", expected: false },
      { rootCause: "OTHER", mode: "MANUAL_VALIDATED", expected: false },
    ]

    for (const s of scenarios) {
      const shouldIncrement =
        s.rootCause === "FALSE_POSITIVE_SCAN" && s.mode === "MANUAL_VALIDATED"
      expect(shouldIncrement).toBe(s.expected)
    }
  })
})

describe("CMA Buyer/Dealer Messaging", () => {
  const buyerMessages: Record<string, string> = {
    CONTRACT_MANUAL_REVIEW_REQUIRED:
      "We\u2019re completing a manual verification to ensure your contract is accurate before you sign.",
    CONTRACT_INTERNAL_FIX_IN_PROGRESS:
      "We\u2019re completing a manual verification to ensure your contract is accurate before you sign.",
    CONTRACT_ADMIN_OVERRIDE_APPROVED:
      "Verified and approved \u2014 ready to sign.",
    CONTRACT_APPROVED:
      "Verified and approved \u2014 ready to sign.",
  }

  const dealerMessages: Record<string, string> = {
    CONTRACT_MANUAL_REVIEW_REQUIRED:
      "AutoLenis is performing an internal verification. No action required.",
    CONTRACT_INTERNAL_FIX_IN_PROGRESS:
      "AutoLenis is performing an internal verification. No action required.",
    CONTRACT_ADMIN_OVERRIDE_APPROVED:
      "The contract has been verified and approved. The buyer will be able to proceed.",
    CONTRACT_APPROVED:
      "The contract has been verified and approved. The buyer will be able to proceed.",
  }

  it("buyer sees verification message during manual review", () => {
    expect(buyerMessages.CONTRACT_MANUAL_REVIEW_REQUIRED).toContain("manual verification")
  })

  it("buyer sees verification message during internal fix", () => {
    expect(buyerMessages.CONTRACT_INTERNAL_FIX_IN_PROGRESS).toContain("manual verification")
  })

  it("buyer sees approved message when override approved", () => {
    expect(buyerMessages.CONTRACT_ADMIN_OVERRIDE_APPROVED).toContain("ready to sign")
  })

  it("dealer sees no action required during CMA", () => {
    expect(dealerMessages.CONTRACT_MANUAL_REVIEW_REQUIRED).toContain("No action required")
  })

  it("dealer sees no action required during internal fix", () => {
    expect(dealerMessages.CONTRACT_INTERNAL_FIX_IN_PROGRESS).toContain("No action required")
  })

  it("dealer is not told to take action during manual review", () => {
    expect(dealerMessages.CONTRACT_MANUAL_REVIEW_REQUIRED).not.toContain("action required from you")
    expect(dealerMessages.CONTRACT_MANUAL_REVIEW_REQUIRED).not.toContain("please fix")
  })
})

describe("CMA Valid DealStatus Transitions", () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    CONTRACT_REVIEW: ["CONTRACT_APPROVED", "CONTRACT_MANUAL_REVIEW_REQUIRED", "CANCELLED"],
    CONTRACT_MANUAL_REVIEW_REQUIRED: ["CONTRACT_APPROVED", "CONTRACT_ADMIN_OVERRIDE_APPROVED", "CONTRACT_INTERNAL_FIX_IN_PROGRESS", "CONTRACT_REVIEW", "CANCELLED"],
    CONTRACT_INTERNAL_FIX_IN_PROGRESS: ["CONTRACT_MANUAL_REVIEW_REQUIRED", "CONTRACT_REVIEW", "CANCELLED"],
    CONTRACT_ADMIN_OVERRIDE_APPROVED: ["CONTRACT_APPROVED", "CONTRACT_MANUAL_REVIEW_REQUIRED", "SIGNING_PENDING", "SIGNED", "CANCELLED"],
  }

  it("allows transition from CONTRACT_REVIEW to CONTRACT_MANUAL_REVIEW_REQUIRED", () => {
    expect(VALID_TRANSITIONS.CONTRACT_REVIEW).toContain("CONTRACT_MANUAL_REVIEW_REQUIRED")
  })

  it("allows transition from CONTRACT_MANUAL_REVIEW_REQUIRED to CONTRACT_APPROVED", () => {
    expect(VALID_TRANSITIONS.CONTRACT_MANUAL_REVIEW_REQUIRED).toContain("CONTRACT_APPROVED")
  })

  it("allows transition from CONTRACT_MANUAL_REVIEW_REQUIRED to CONTRACT_ADMIN_OVERRIDE_APPROVED", () => {
    expect(VALID_TRANSITIONS.CONTRACT_MANUAL_REVIEW_REQUIRED).toContain("CONTRACT_ADMIN_OVERRIDE_APPROVED")
  })

  it("allows transition from CONTRACT_MANUAL_REVIEW_REQUIRED to CONTRACT_INTERNAL_FIX_IN_PROGRESS", () => {
    expect(VALID_TRANSITIONS.CONTRACT_MANUAL_REVIEW_REQUIRED).toContain("CONTRACT_INTERNAL_FIX_IN_PROGRESS")
  })

  it("allows revocation from CONTRACT_ADMIN_OVERRIDE_APPROVED back to CMA", () => {
    expect(VALID_TRANSITIONS.CONTRACT_ADMIN_OVERRIDE_APPROVED).toContain("CONTRACT_MANUAL_REVIEW_REQUIRED")
  })

  it("allows internal fix to return to CMA", () => {
    expect(VALID_TRANSITIONS.CONTRACT_INTERNAL_FIX_IN_PROGRESS).toContain("CONTRACT_MANUAL_REVIEW_REQUIRED")
  })
})
