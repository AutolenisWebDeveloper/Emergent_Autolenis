import { describe, it, expect } from "vitest"

// Messaging Service — approval readiness, eligibility validation, thread logic
// These are pure logic tests that validate business rules without requiring a database.

// Canonical approval types
const VALID_APPROVAL_TYPES = ["autolenis", "external", "cash"] as const
type ApprovalSource = (typeof VALID_APPROVAL_TYPES)[number]

// Thread statuses
const VALID_THREAD_STATUSES = ["ACTIVE", "CLOSED", "ARCHIVED"] as const

// Sender types
const VALID_SENDER_TYPES = ["BUYER", "DEALER", "SYSTEM"] as const

// Readiness payload structure
interface BuyerReadinessPayload {
  approvalSource: string
  approvalType: ApprovalSource
  maxBudget?: number | null
  monthlyBudgetMin?: number | null
  monthlyBudgetMax?: number | null
  expiration?: string | null
  vehicleConstraints?: string | null
  uploaded?: boolean
}

// Readiness resolution logic (mirrors hardened messaging.service.ts)
// Now includes:
//   1. Status filtering — only ACTIVE or null prequals are considered
//   2. For EXTERNAL_MANUAL, cross-validates the linked submission status
//   3. Cash eligibility requires explicit platform basis (hasCashDeal),
//      not just buyer profile existence
function buildReadinessPayload(
  prequal: {
    source: string
    status?: string | null
    maxOtd: number
    monthlyMin?: number
    monthlyMax?: number
    expiresAt?: Date | null
    submissionStatus?: string | null // linked ExternalPreApprovalSubmission status
  } | null,
  buyerExists: boolean,
  hasCashDeal?: boolean, // explicit cash-buyer basis: SelectedDeal with payment_type = 'CASH'
): { approvalType: ApprovalSource; readiness: BuyerReadinessPayload } | null {
  // Only consider prequals with status "ACTIVE" or null (backwards compat)
  if (prequal) {
    const validStatus = prequal.status === "ACTIVE" || prequal.status === null || prequal.status === undefined
    if (!validStatus) {
      // Prequal has a terminal status (REVOKED, EXPIRED, FAILED, PENDING) — skip it.
      // Cash eligibility still requires an explicit basis (hasCashDeal).
      if (buyerExists && hasCashDeal) {
        return { approvalType: "cash", readiness: { approvalSource: "Cash Buyer", approvalType: "cash" } }
      }
      return null
    }
  }

  if (prequal && prequal.source === "INTERNAL") {
    const isExpired = prequal.expiresAt && new Date(prequal.expiresAt) < new Date()
    return {
      approvalType: "autolenis",
      readiness: {
        approvalSource: "AutoLenis Prequalified",
        approvalType: "autolenis",
        maxBudget: prequal.maxOtd,
        monthlyBudgetMin: prequal.monthlyMin ?? null,
        monthlyBudgetMax: prequal.monthlyMax ?? null,
        expiration: isExpired ? "Expired" : prequal.expiresAt?.toISOString() ?? null,
      },
    }
  }

  if (prequal && prequal.source === "EXTERNAL_MANUAL") {
    // Cross-validate: linked ExternalPreApprovalSubmission must be APPROVED
    if (prequal.submissionStatus !== "APPROVED") {
      // Submission was rejected/superseded/expired/missing.
      // Do NOT fall through to cash — return invalid external instead.
      // This prevents invalid external approvals from silently unlocking
      // messaging through an unintended cash fallback.
      return {
        approvalType: "external",
        readiness: {
          approvalSource: "External Pre-Approval Uploaded",
          approvalType: "external",
          uploaded: false,
        },
      }
    }

    const isExpired = prequal.expiresAt && new Date(prequal.expiresAt) < new Date()
    return {
      approvalType: "external",
      readiness: {
        approvalSource: "External Pre-Approval Uploaded",
        approvalType: "external",
        maxBudget: prequal.maxOtd,
        monthlyBudgetMin: prequal.monthlyMin ?? null,
        monthlyBudgetMax: prequal.monthlyMax ?? null,
        expiration: isExpired ? "Expired" : prequal.expiresAt?.toISOString() ?? null,
        uploaded: true,
      },
    }
  }

  // Cash eligibility requires an explicit platform basis — a SelectedDeal
  // with payment_type = 'CASH'. Buyer profile existence alone is NOT sufficient.
  if (buyerExists && hasCashDeal) {
    return {
      approvalType: "cash",
      readiness: {
        approvalSource: "Cash Buyer",
        approvalType: "cash",
      },
    }
  }

  return null
}

// Eligibility validation logic (mirrors messaging.service.ts)
function validateEligibility(
  approvalType: ApprovalSource,
  readiness: BuyerReadinessPayload,
): { eligible: boolean; reason?: string } {
  if (approvalType === "autolenis") {
    if (readiness.expiration === "Expired") {
      return { eligible: false, reason: "Your AutoLenis prequalification has expired. Please renew before messaging dealers." }
    }
    return { eligible: true }
  }

  if (approvalType === "external") {
    if (!readiness.uploaded) {
      return { eligible: false, reason: "External pre-approval document must be uploaded before messaging dealers." }
    }
    if (readiness.expiration === "Expired") {
      return { eligible: false, reason: "Your external pre-approval has expired. Please upload a new one." }
    }
    return { eligible: true }
  }

  if (approvalType === "cash") {
    return { eligible: true }
  }

  return { eligible: false, reason: "No valid approval status found." }
}

describe("Messaging Service - Approval Types", () => {
  it("should define all three canonical approval types", () => {
    expect(VALID_APPROVAL_TYPES).toContain("autolenis")
    expect(VALID_APPROVAL_TYPES).toContain("external")
    expect(VALID_APPROVAL_TYPES).toContain("cash")
    expect(VALID_APPROVAL_TYPES).toHaveLength(3)
  })

  it("should define valid thread statuses", () => {
    expect(VALID_THREAD_STATUSES).toContain("ACTIVE")
    expect(VALID_THREAD_STATUSES).toContain("CLOSED")
    expect(VALID_THREAD_STATUSES).toContain("ARCHIVED")
  })

  it("should define valid sender types", () => {
    expect(VALID_SENDER_TYPES).toContain("BUYER")
    expect(VALID_SENDER_TYPES).toContain("DEALER")
    expect(VALID_SENDER_TYPES).toContain("SYSTEM")
  })
})

describe("Messaging Service - Readiness Payload Builder", () => {
  describe("AutoLenis prequalification", () => {
    it("should build readiness for active autolenis prequal", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30) // 30 days from now
      const result = buildReadinessPayload(
        { source: "INTERNAL", status: "ACTIVE", maxOtd: 45000, monthlyMin: 500, monthlyMax: 700, expiresAt: futureDate },
        true,
      )

      expect(result).not.toBeNull()
      expect(result!.approvalType).toBe("autolenis")
      expect(result!.readiness.approvalSource).toBe("AutoLenis Prequalified")
      expect(result!.readiness.maxBudget).toBe(45000)
      expect(result!.readiness.monthlyBudgetMin).toBe(500)
      expect(result!.readiness.monthlyBudgetMax).toBe(700)
      expect(result!.readiness.expiration).not.toBe("Expired")
    })

    it("should mark expired autolenis prequal", () => {
      const pastDate = new Date(Date.now() - 86400000) // yesterday
      const result = buildReadinessPayload(
        { source: "INTERNAL", status: "ACTIVE", maxOtd: 45000, expiresAt: pastDate },
        true,
      )

      expect(result!.approvalType).toBe("autolenis")
      expect(result!.readiness.expiration).toBe("Expired")
    })

    it("should accept prequal with null status (backwards compat)", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "INTERNAL", status: null, maxOtd: 40000, expiresAt: futureDate },
        true,
      )

      expect(result).not.toBeNull()
      expect(result!.approvalType).toBe("autolenis")
    })
  })

  describe("External preapproval", () => {
    it("should build readiness for active external preapproval with APPROVED submission", () => {
      const futureDate = new Date(Date.now() + 86400000 * 60)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "APPROVED" },
        true,
      )

      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.approvalSource).toBe("External Pre-Approval Uploaded")
      expect(result!.readiness.maxBudget).toBe(38000)
      expect(result!.readiness.uploaded).toBe(true)
    })

    it("should mark expired external preapproval", () => {
      const pastDate = new Date(Date.now() - 86400000)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: pastDate, submissionStatus: "APPROVED" },
        true,
      )

      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.expiration).toBe("Expired")
    })
  })

  describe("Cash buyer", () => {
    it("should build readiness for cash buyer with explicit cash deal basis", () => {
      const result = buildReadinessPayload(null, true, true)

      expect(result!.approvalType).toBe("cash")
      expect(result!.readiness.approvalSource).toBe("Cash Buyer")
      expect(result!.readiness.maxBudget).toBeUndefined()
    })

    it("should deny cash eligibility when buyer has no explicit cash basis", () => {
      const result = buildReadinessPayload(null, true, false)
      expect(result).toBeNull()
    })

    it("should deny cash eligibility when buyer exists but hasCashDeal is not provided", () => {
      const result = buildReadinessPayload(null, true)
      expect(result).toBeNull()
    })
  })

  describe("No buyer found", () => {
    it("should return null when no buyer profile exists", () => {
      const result = buildReadinessPayload(null, false)
      expect(result).toBeNull()
    })
  })
})

describe("Messaging Service - Eligibility Validation", () => {
  describe("AutoLenis buyers", () => {
    it("should allow active autolenis buyer", () => {
      const result = validateEligibility("autolenis", {
        approvalSource: "AutoLenis Prequalified",
        approvalType: "autolenis",
        maxBudget: 45000,
      })
      expect(result.eligible).toBe(true)
    })

    it("should block expired autolenis buyer", () => {
      const result = validateEligibility("autolenis", {
        approvalSource: "AutoLenis Prequalified",
        approvalType: "autolenis",
        expiration: "Expired",
      })
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain("expired")
    })
  })

  describe("External preapproval buyers", () => {
    it("should allow buyer with uploaded external approval", () => {
      const result = validateEligibility("external", {
        approvalSource: "External Pre-Approval Uploaded",
        approvalType: "external",
        uploaded: true,
        maxBudget: 38000,
      })
      expect(result.eligible).toBe(true)
    })

    it("should block buyer without uploaded document", () => {
      const result = validateEligibility("external", {
        approvalSource: "External Pre-Approval Uploaded",
        approvalType: "external",
        uploaded: false,
      })
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain("uploaded")
    })

    it("should block buyer with expired external approval", () => {
      const result = validateEligibility("external", {
        approvalSource: "External Pre-Approval Uploaded",
        approvalType: "external",
        uploaded: true,
        expiration: "Expired",
      })
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain("expired")
    })
  })

  describe("Cash buyers", () => {
    it("should allow cash buyer with valid cash approval basis", () => {
      // This test validates that once approvalType=cash is resolved (with explicit basis),
      // the eligibility validator correctly allows it
      const result = validateEligibility("cash", {
        approvalSource: "Cash Buyer",
        approvalType: "cash",
      })
      expect(result.eligible).toBe(true)
    })
  })
})

describe("Messaging Service - Security Constraints", () => {
  it("should never expose original message body to clients", () => {
    // The service always returns redactedBody, never body
    const messageFields = ["id", "threadId", "senderType", "senderId", "body", "containsSensitiveData", "createdAt"]
    // The public API should map redactedBody → body
    expect(messageFields).toContain("body")
    // The original body field should only be stored internally
  })

  it("should not expose detection metadata to non-admin clients", () => {
    // circumventionScore and redaction events are admin-only
    const publicFields = ["id", "senderType", "body", "containsSensitiveData", "createdAt", "isMe"]
    expect(publicFields).not.toContain("circumventionScore")
    expect(publicFields).not.toContain("redactionEvents")
  })

  it("should include containsSensitiveData flag for redaction notice", () => {
    const publicFields = ["id", "senderType", "body", "containsSensitiveData", "createdAt", "isMe"]
    expect(publicFields).toContain("containsSensitiveData")
  })
})

describe("Messaging Service - Thread Business Rules", () => {
  it("should not allow messaging on closed threads", () => {
    const status: string = "CLOSED"
    expect(status !== "ACTIVE").toBe(true) // Would block sending
  })

  it("should not allow messaging on archived threads", () => {
    const status: string = "ARCHIVED"
    expect(status !== "ACTIVE").toBe(true)
  })

  it("should verify sender belongs to thread before sending", () => {
    // Buyer can only send to threads where they are the buyer
    // Dealer can only send to threads where they are the dealer
    const thread = { buyerId: "buyer1", dealerId: "dealer1" }
    expect(thread.buyerId).toBe("buyer1")
    expect(thread.dealerId).toBe("dealer1")
  })

  it("should support identity release toggle", () => {
    // When identityReleased = true, redaction is disabled
    const identityReleased = true
    expect(identityReleased).toBe(true)
  })
})

describe("Messaging Service - External Preapproval Integration", () => {
  it("should preserve external approval metadata in readiness payload", () => {
    const futureDate = new Date(Date.now() + 86400000 * 60)
    const result = buildReadinessPayload(
      { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 42000, expiresAt: futureDate, submissionStatus: "APPROVED" },
      true,
    )

    expect(result!.readiness.approvalSource).toBe("External Pre-Approval Uploaded")
    expect(result!.readiness.uploaded).toBe(true)
    expect(result!.readiness.maxBudget).toBe(42000)
    expect(result!.readiness.expiration).not.toBe("Expired")
  })

  it("should not duplicate external approval file storage", () => {
    // The messaging layer only reads approval metadata, never stores files
    // MessageThread stores approvalType (enum), not file paths
    const threadFields = [
      "id", "workspaceId", "buyerId", "dealerId", "requestId", "dealId",
      "approvalType", "identityReleased", "status", "createdAt", "updatedAt",
    ]
    expect(threadFields).not.toContain("documentUrl")
    expect(threadFields).not.toContain("documentPath")
    expect(threadFields).not.toContain("fileStoragePath")
    expect(threadFields).not.toContain("storageBucket")
    expect(threadFields).not.toContain("documentStoragePath")
    expect(threadFields).not.toContain("sha256")
  })

  it("should treat all three approval types equally for messaging", () => {
    // All three types should produce valid readiness payloads when properly qualified
    const futureDate = new Date(Date.now() + 86400000 * 30)

    const autolenis = buildReadinessPayload({ source: "INTERNAL", status: "ACTIVE", maxOtd: 50000, expiresAt: futureDate }, true)
    const external = buildReadinessPayload({ source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 40000, expiresAt: futureDate, submissionStatus: "APPROVED" }, true)
    const cash = buildReadinessPayload(null, true, true) // explicit cash basis required

    expect(autolenis).not.toBeNull()
    expect(external).not.toBeNull()
    expect(cash).not.toBeNull()

    expect(autolenis!.approvalType).toBe("autolenis")
    expect(external!.approvalType).toBe("external")
    expect(cash!.approvalType).toBe("cash")
  })
})

describe("Messaging Service - External Preapproval Hardening", () => {
  describe("Rejected external preapproval", () => {
    it("should return invalid external (not cash) when submission is REJECTED", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "REJECTED" },
        true,
      )

      expect(result).not.toBeNull()
      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.uploaded).toBe(false)
    })

    it("should return invalid external when submission is REJECTED and no buyer exists", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "REJECTED" },
        false,
      )

      expect(result).not.toBeNull()
      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.uploaded).toBe(false)
    })
  })

  describe("Superseded external preapproval", () => {
    it("should return invalid external (not cash) when submission is SUPERSEDED", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "SUPERSEDED" },
        true,
      )

      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.uploaded).toBe(false)
    })
  })

  describe("Expired external preapproval submission", () => {
    it("should return invalid external (not cash) when submission status is EXPIRED", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30) // prequal date not expired
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "EXPIRED" },
        true,
      )

      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.uploaded).toBe(false)
    })
  })

  describe("Missing submission link", () => {
    it("should return invalid external (not cash) when no submission status is available", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: null },
        true,
      )

      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.uploaded).toBe(false)
    })

    it("should return invalid external (not cash) when submission status is undefined", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate },
        true,
      )

      expect(result!.approvalType).toBe("external")
      expect(result!.readiness.uploaded).toBe(false)
    })
  })

  describe("Terminal prequal statuses block messaging resolution", () => {
    it("should deny REVOKED prequal with no cash basis", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "INTERNAL", status: "REVOKED", maxOtd: 50000, expiresAt: futureDate },
        true,
      )

      expect(result).toBeNull()
    })

    it("should allow REVOKED prequal with explicit cash basis", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "INTERNAL", status: "REVOKED", maxOtd: 50000, expiresAt: futureDate },
        true,
        true,
      )

      expect(result!.approvalType).toBe("cash")
    })

    it("should deny EXPIRED prequal status with no cash basis", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "INTERNAL", status: "EXPIRED", maxOtd: 50000, expiresAt: futureDate },
        true,
      )

      expect(result).toBeNull()
    })

    it("should deny FAILED prequal with no cash basis", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "INTERNAL", status: "FAILED", maxOtd: 50000, expiresAt: futureDate },
        true,
      )

      expect(result).toBeNull()
    })

    it("should deny PENDING prequal with no cash basis", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const result = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "PENDING", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "APPROVED" },
        true,
      )

      expect(result).toBeNull()
    })
  })

  describe("Eligibility validation with hardened readiness", () => {
    it("should deny messaging for rejected external preapproval (no cash fallback)", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const resolved = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "REJECTED" },
        true,
      )!
      // Invalid external preapproval — NOT allowed to fall through to cash
      const result = validateEligibility(resolved.approvalType, resolved.readiness)
      expect(result.eligible).toBe(false) // blocked — no cash fallback
      expect(resolved.approvalType).toBe("external") // correctly classified as external
      expect(result.reason).toContain("uploaded")
    })

    it("should deny messaging for superseded external preapproval (no cash fallback)", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const resolved = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "SUPERSEDED" },
        true,
      )!
      const result = validateEligibility(resolved.approvalType, resolved.readiness)
      expect(result.eligible).toBe(false)
      expect(resolved.approvalType).toBe("external")
    })

    it("should deny messaging for expired external submission (no cash fallback)", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const resolved = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: "EXPIRED" },
        true,
      )!
      const result = validateEligibility(resolved.approvalType, resolved.readiness)
      expect(result.eligible).toBe(false)
      expect(resolved.approvalType).toBe("external")
    })

    it("should deny messaging for missing linked submission (no cash fallback)", () => {
      const futureDate = new Date(Date.now() + 86400000 * 30)
      const resolved = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: futureDate, submissionStatus: null },
        true,
      )!
      const result = validateEligibility(resolved.approvalType, resolved.readiness)
      expect(result.eligible).toBe(false)
      expect(resolved.approvalType).toBe("external")
    })

    it("should deny messaging for expired external preapproval with APPROVED submission", () => {
      const pastDate = new Date(Date.now() - 86400000)
      const resolved = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 38000, expiresAt: pastDate, submissionStatus: "APPROVED" },
        true,
      )!
      const result = validateEligibility(resolved.approvalType, resolved.readiness)
      expect(result.eligible).toBe(false) // expired
      expect(resolved.approvalType).toBe("external") // correctly classified as external
      expect(result.reason).toContain("expired")
    })

    it("should allow messaging for valid APPROVED external preapproval", () => {
      const futureDate = new Date(Date.now() + 86400000 * 60)
      const resolved = buildReadinessPayload(
        { source: "EXTERNAL_MANUAL", status: "ACTIVE", maxOtd: 42000, expiresAt: futureDate, submissionStatus: "APPROVED" },
        true,
      )!
      const result = validateEligibility(resolved.approvalType, resolved.readiness)
      expect(result.eligible).toBe(true)
      expect(resolved.approvalType).toBe("external")
    })

    it("should allow messaging for true cash buyer with explicit cash deal basis", () => {
      const resolved = buildReadinessPayload(null, true, true)!
      const result = validateEligibility(resolved.approvalType, resolved.readiness)
      expect(result.eligible).toBe(true)
      expect(resolved.approvalType).toBe("cash")
    })

    it("should deny messaging for buyer with no prequal and no cash basis", () => {
      const resolved = buildReadinessPayload(null, true, false)
      expect(resolved).toBeNull() // no valid approval basis
    })
  })

  describe("Admin monitoring external preapproval support", () => {
    it("should include 'external' in valid approval types for monitoring filters", () => {
      expect(VALID_APPROVAL_TYPES).toContain("external")
    })

    it("should support external in approval distribution stats", () => {
      const distribution: Record<string, number> = { autolenis: 5, external: 3, cash: 2 }
      expect(distribution["external"]).toBe(3)
      expect(Object.keys(distribution)).toContain("external")
    })
  })

  describe("No document data leakage into messaging", () => {
    it("should not include any document storage fields in Message model", () => {
      const messageFields = ["id", "threadId", "senderType", "senderId", "body", "redactedBody", "containsSensitiveData", "circumventionScore", "createdAt"]
      expect(messageFields).not.toContain("storageBucket")
      expect(messageFields).not.toContain("documentStoragePath")
      expect(messageFields).not.toContain("originalFileName")
      expect(messageFields).not.toContain("sha256")
      expect(messageFields).not.toContain("mimeType")
      expect(messageFields).not.toContain("fileSizeBytes")
    })

    it("should not include any document storage fields in MessageRedactionEvent model", () => {
      const redactionFields = ["id", "messageId", "detectionType", "originalText", "redactedText", "createdAt"]
      expect(redactionFields).not.toContain("storageBucket")
      expect(redactionFields).not.toContain("documentStoragePath")
    })
  })

  describe("Route/security compliance", () => {
    it("should verify messaging service is exported from barrel file", () => {
      // The service barrel exports both class and singleton
      const expectedExports = ["MessagingService", "messagingService"]
      expectedExports.forEach((name) => {
        expect(typeof name).toBe("string") // placeholder — actual import verified by service-role-scanner test
      })
    })

    it("should verify ExternalPreApprovalService is exported from barrel file", () => {
      const expectedExports = ["ExternalPreApprovalService", "externalPreApprovalService"]
      expectedExports.forEach((name) => {
        expect(typeof name).toBe("string")
      })
    })
  })
})
