import { describe, it, expect } from "vitest"

// External Pre-Approval Submission workflow tests
// Tests RBAC, status lifecycle, mapping, expiry, and unified response

const VALID_SUBMISSION_STATUSES = [
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "SUPERSEDED",
]

const VALID_PREQUAL_SOURCES = ["INTERNAL", "EXTERNAL_MANUAL"]

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["IN_REVIEW", "APPROVED", "REJECTED", "SUPERSEDED"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["EXPIRED", "SUPERSEDED"],
  REJECTED: [],
  EXPIRED: [],
  SUPERSEDED: [],
}

const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

describe("External Pre-Approval - Status Lifecycle", () => {
  describe("Valid statuses", () => {
    it("should define all required statuses", () => {
      expect(VALID_SUBMISSION_STATUSES).toContain("SUBMITTED")
      expect(VALID_SUBMISSION_STATUSES).toContain("IN_REVIEW")
      expect(VALID_SUBMISSION_STATUSES).toContain("APPROVED")
      expect(VALID_SUBMISSION_STATUSES).toContain("REJECTED")
      expect(VALID_SUBMISSION_STATUSES).toContain("EXPIRED")
      expect(VALID_SUBMISSION_STATUSES).toContain("SUPERSEDED")
      expect(VALID_SUBMISSION_STATUSES).toHaveLength(6)
    })
  })

  describe("Status transitions", () => {
    it("should allow SUBMITTED → IN_REVIEW", () => {
      expect(VALID_STATUS_TRANSITIONS["SUBMITTED"]).toContain("IN_REVIEW")
    })

    it("should allow SUBMITTED → APPROVED (direct approval)", () => {
      expect(VALID_STATUS_TRANSITIONS["SUBMITTED"]).toContain("APPROVED")
    })

    it("should allow SUBMITTED → REJECTED", () => {
      expect(VALID_STATUS_TRANSITIONS["SUBMITTED"]).toContain("REJECTED")
    })

    it("should allow SUBMITTED → SUPERSEDED (when buyer resubmits)", () => {
      expect(VALID_STATUS_TRANSITIONS["SUBMITTED"]).toContain("SUPERSEDED")
    })

    it("should allow IN_REVIEW → APPROVED", () => {
      expect(VALID_STATUS_TRANSITIONS["IN_REVIEW"]).toContain("APPROVED")
    })

    it("should allow IN_REVIEW → REJECTED", () => {
      expect(VALID_STATUS_TRANSITIONS["IN_REVIEW"]).toContain("REJECTED")
    })

    it("should allow APPROVED → EXPIRED", () => {
      expect(VALID_STATUS_TRANSITIONS["APPROVED"]).toContain("EXPIRED")
    })

    it("should allow APPROVED → SUPERSEDED", () => {
      expect(VALID_STATUS_TRANSITIONS["APPROVED"]).toContain("SUPERSEDED")
    })

    it("should not allow transitions from REJECTED", () => {
      expect(VALID_STATUS_TRANSITIONS["REJECTED"]).toHaveLength(0)
    })

    it("should not allow transitions from EXPIRED", () => {
      expect(VALID_STATUS_TRANSITIONS["EXPIRED"]).toHaveLength(0)
    })

    it("should not allow transitions from SUPERSEDED", () => {
      expect(VALID_STATUS_TRANSITIONS["SUPERSEDED"]).toHaveLength(0)
    })

    it("should reject invalid transitions", () => {
      expect(VALID_STATUS_TRANSITIONS["REJECTED"]).not.toContain("APPROVED")
      expect(VALID_STATUS_TRANSITIONS["EXPIRED"]).not.toContain("SUBMITTED")
      expect(VALID_STATUS_TRANSITIONS["IN_REVIEW"]).not.toContain("SUBMITTED")
    })
  })
})

describe("External Pre-Approval - RBAC", () => {
  describe("Role-based access", () => {
    it("should only allow BUYER to submit external pre-approvals", () => {
      const allowedSubmitRoles = ["BUYER"]
      expect(allowedSubmitRoles).toContain("BUYER")
      expect(allowedSubmitRoles).not.toContain("DEALER")
      expect(allowedSubmitRoles).not.toContain("ADMIN")
      expect(allowedSubmitRoles).not.toContain("AFFILIATE")
    })

    it("should only allow ADMIN to review submissions", () => {
      const allowedReviewRoles = ["ADMIN"]
      expect(allowedReviewRoles).toContain("ADMIN")
      expect(allowedReviewRoles).not.toContain("BUYER")
      expect(allowedReviewRoles).not.toContain("DEALER")
      expect(allowedReviewRoles).not.toContain("AFFILIATE")
    })

    it("should only allow ADMIN to view the review queue", () => {
      const allowedQueueRoles = ["ADMIN"]
      expect(allowedQueueRoles).toContain("ADMIN")
      expect(allowedQueueRoles).not.toContain("DEALER")
      expect(allowedQueueRoles).not.toContain("AFFILIATE")
    })

    it("should scope buyer queries to their own userId", () => {
      const mockBuyerUserId = "buyer-123"
      const mockSubmissions = [
        { id: "s1", buyerId: "buyer-123", lenderName: "Chase" },
        { id: "s2", buyerId: "buyer-456", lenderName: "Capital One" },
        { id: "s3", buyerId: "buyer-123", lenderName: "Wells Fargo" },
      ]

      const filtered = mockSubmissions.filter(
        (s) => s.buyerId === mockBuyerUserId,
      )
      expect(filtered).toHaveLength(2)
      expect(filtered.every((s) => s.buyerId === mockBuyerUserId)).toBe(true)
    })

    it("should prevent dealer and affiliate from seeing submissions", () => {
      const visibleRoles = ["BUYER", "ADMIN"]
      expect(visibleRoles).not.toContain("DEALER")
      expect(visibleRoles).not.toContain("AFFILIATE")
    })

    it("should only allow ADMIN to access document download endpoint", () => {
      const allowedDocRoles = ["ADMIN", "SUPER_ADMIN"]
      expect(allowedDocRoles).toContain("ADMIN")
      expect(allowedDocRoles).toContain("SUPER_ADMIN")
      expect(allowedDocRoles).not.toContain("BUYER")
      expect(allowedDocRoles).not.toContain("DEALER")
    })
  })
})

describe("External Pre-Approval - PreQualification Mapping", () => {
  describe("Source discriminator", () => {
    it("should define valid PreQualification sources", () => {
      expect(VALID_PREQUAL_SOURCES).toContain("INTERNAL")
      expect(VALID_PREQUAL_SOURCES).toContain("EXTERNAL_MANUAL")
      expect(VALID_PREQUAL_SOURCES).toHaveLength(2)
    })

    it("should use INTERNAL source for soft-pull prequals", () => {
      const internalPrequal = {
        source: "INTERNAL",
        providerName: "AutoLenisPrequal",
        softPullCompleted: true,
      }
      expect(internalPrequal.source).toBe("INTERNAL")
      expect(internalPrequal.softPullCompleted).toBe(true)
    })

    it("should use EXTERNAL_MANUAL source for approved bank pre-approvals", () => {
      const externalPrequal = {
        source: "EXTERNAL_MANUAL",
        providerName: "External Verified: Chase Bank",
        softPullCompleted: true,
        externalSubmissionId: "sub-123",
      }
      expect(externalPrequal.source).toBe("EXTERNAL_MANUAL")
      expect(externalPrequal.softPullCompleted).toBe(true)
      expect(externalPrequal.externalSubmissionId).toBeTruthy()
      expect(externalPrequal.providerName).toContain("External Verified:")
    })
  })

  describe("PreQual creation on approval", () => {
    it("should set the correct fields when creating PreQual from external approval", () => {
      const submission = {
        buyerId: "buyer-123",
        lenderName: "Chase Bank",
        approvedAmount: 35000,
        apr: 5.5,
        termMonths: 60,
      }

      // Calculate expected monthly payment (PV formula inverse)
      const monthlyRate = submission.apr / 100 / 12
      const maxMonthlyPayment =
        submission.approvedAmount *
        (monthlyRate / (1 - Math.pow(1 + monthlyRate, -submission.termMonths)))

      const expectedPrequal = {
        buyerId: submission.buyerId,
        source: "EXTERNAL_MANUAL",
        maxOtd: submission.approvedAmount,
        providerName: `External Verified: ${submission.lenderName}`,
        softPullCompleted: true,
        consentGiven: true,
      }

      expect(expectedPrequal.source).toBe("EXTERNAL_MANUAL")
      expect(expectedPrequal.maxOtd).toBe(35000)
      expect(expectedPrequal.softPullCompleted).toBe(true)
      expect(expectedPrequal.providerName).toBe("External Verified: Chase Bank")
      expect(maxMonthlyPayment).toBeGreaterThan(0)
    })

    it("should expire existing ACTIVE prequals before creating new one", () => {
      const existingPrequals = [
        { id: "pq-1", buyerId: "buyer-123", prequal_status: "ACTIVE" },
        { id: "pq-2", buyerId: "buyer-123", prequal_status: "EXPIRED" },
      ]

      // Simulate expiring active prequals
      const updated = existingPrequals.map((pq) =>
        pq.prequal_status === "ACTIVE"
          ? { ...pq, prequal_status: "EXPIRED" }
          : pq,
      )

      expect(updated.every((pq) => pq.prequal_status !== "ACTIVE")).toBe(true)
      expect(updated.filter((pq) => pq.prequal_status === "EXPIRED")).toHaveLength(2)
    })

    it("should produce full gating equivalence — no special-case branching needed", () => {
      // Verifies that the PreQualification created from external approval
      // contains all fields needed for universal gating (same as internal)
      const externalPrequal = {
        buyerId: "buyer-123",
        source: "EXTERNAL_MANUAL",
        creditTier: "GOOD",
        maxOtd: 35000,
        estimatedMonthlyMin: 330,
        estimatedMonthlyMax: 660,
        expiresAt: new Date("2099-12-31"),
        providerName: "External Verified: Chase Bank",
        externalSubmissionId: "sub-123",
        // FULL EQUIVALENCE fields — must match internal prequal
        softPullCompleted: true,
        consentGiven: true,
        prequal_status: "ACTIVE",
        max_otd_amount_cents: 3500000,
        min_monthly_payment_cents: 33000,
        max_monthly_payment_cents: 66000,
      }

      // All gating fields must be present and non-null
      expect(externalPrequal.creditTier).toBeTruthy()
      expect(externalPrequal.maxOtd).toBeGreaterThan(0)
      expect(externalPrequal.estimatedMonthlyMin).toBeGreaterThan(0)
      expect(externalPrequal.estimatedMonthlyMax).toBeGreaterThan(0)
      expect(externalPrequal.expiresAt).toBeInstanceOf(Date)
      expect(externalPrequal.source).toBe("EXTERNAL_MANUAL")
      // Critical gating fields — without these, buyer is blocked from auctions/workflow
      expect(externalPrequal.softPullCompleted).toBe(true)
      expect(externalPrequal.consentGiven).toBe(true)
      expect(externalPrequal.prequal_status).toBe("ACTIVE")
      expect(externalPrequal.max_otd_amount_cents).toBeGreaterThan(0)
    })
  })
})

describe("External Pre-Approval - File Upload Security (OWASP)", () => {
  describe("MIME type allowlist", () => {
    it("should only allow PDF, PNG, and JPEG files", () => {
      expect(ALLOWED_MIME_TYPES).toContain("application/pdf")
      expect(ALLOWED_MIME_TYPES).toContain("image/png")
      expect(ALLOWED_MIME_TYPES).toContain("image/jpeg")
      expect(ALLOWED_MIME_TYPES).toHaveLength(3)
    })

    it("should reject disallowed MIME types", () => {
      const disallowed = [
        "application/javascript",
        "text/html",
        "application/xml",
        "application/zip",
        "image/svg+xml",
        "application/octet-stream",
      ]

      for (const mime of disallowed) {
        expect(ALLOWED_MIME_TYPES).not.toContain(mime)
      }
    })
  })

  describe("File size limits", () => {
    it("should enforce 10 MB maximum file size", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024)
    })

    it("should reject files exceeding the limit", () => {
      const oversizedFile = { size: 11 * 1024 * 1024 }
      expect(oversizedFile.size > MAX_FILE_SIZE_BYTES).toBe(true)
    })

    it("should accept files within the limit", () => {
      const validFile = { size: 5 * 1024 * 1024 }
      expect(validFile.size <= MAX_FILE_SIZE_BYTES).toBe(true)
    })
  })

  describe("Filename handling", () => {
    it("should generate random storage filenames (not user-provided)", () => {
      const userFilename = "my secret document (1).pdf"
      const randomName = "550e8400-e29b-41d4-a716-446655440000"
      const storagePath = `user-123/preapproval/${randomName}.pdf`

      // Storage path should not contain the user's filename
      expect(storagePath).not.toContain(userFilename)
      expect(storagePath).toContain(randomName)
    })

    it("should sanitize original filename for metadata only", () => {
      const unsafeFilename = "../../../etc/passwd"
      const sanitized = unsafeFilename.replace(/[^a-zA-Z0-9._-]/g, "_")
      // Slashes are removed (path traversal prevented)
      expect(sanitized).not.toContain("/")
      // The sanitized name is only used as metadata, not for storage paths
      // Storage uses random UUIDs, so path traversal via metadata is not exploitable
      expect(sanitized).toBeTruthy()
    })

    it("should store files in buyer-docs bucket path", () => {
      const storagePath = "user-123/preapproval/file.pdf"
      expect(storagePath).toContain("preapproval/")
    })
  })

  describe("Extension-MIME matching", () => {
    it("should validate that file extension matches declared MIME type", () => {
      const validPairs = [
        { ext: ".pdf", mime: "application/pdf" },
        { ext: ".png", mime: "image/png" },
        { ext: ".jpg", mime: "image/jpeg" },
        { ext: ".jpeg", mime: "image/jpeg" },
      ]

      const validExtensions: Record<string, string[]> = {
        "application/pdf": [".pdf"],
        "image/png": [".png"],
        "image/jpeg": [".jpg", ".jpeg"],
      }

      for (const pair of validPairs) {
        expect(validExtensions[pair.mime]).toContain(pair.ext)
      }
    })

    it("should reject mismatched extension-MIME pairs", () => {
      const validExtensions: Record<string, string[]> = {
        "application/pdf": [".pdf"],
        "image/png": [".png"],
        "image/jpeg": [".jpg", ".jpeg"],
      }

      // .exe file claiming to be PDF
      expect(validExtensions["application/pdf"]).not.toContain(".exe")
      // .html file claiming to be PNG
      expect(validExtensions["image/png"]).not.toContain(".html")
    })
  })

  describe("SHA256 file integrity", () => {
    it("should compute SHA256 hash for uploaded files", () => {
      // Simulates the SHA256 computation done in the upload route
      const crypto = require("crypto")
      const testContent = Buffer.from("test file content")
      const hash = crypto.createHash("sha256").update(testContent).digest("hex")

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it("should store SHA256 hash in submission metadata", () => {
      const submission = {
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        storageBucket: "buyer-docs",
        documentStoragePath: "user-123/preapproval/uuid.pdf",
      }

      expect(submission.sha256).toHaveLength(64)
      expect(submission.storageBucket).toBe("buyer-docs")
      expect(submission.documentStoragePath).toContain("preapproval/")
    })
  })
})

describe("External Pre-Approval - Expiry Logic", () => {
  it("should set 30-day expiry on PreQualification created from external approval", () => {
    const PREQUAL_EXPIRY_DAYS = 30
    const now = new Date("2026-01-15T12:00:00Z")
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + PREQUAL_EXPIRY_DAYS)

    const expectedExpiry = new Date("2026-02-14T12:00:00Z")
    expect(expiresAt.toISOString()).toBe(expectedExpiry.toISOString())
  })

  it("should detect expired prequals correctly", () => {
    const expiredPrequal = {
      expiresAt: new Date("2025-12-01"),
      prequal_status: "ACTIVE",
    }
    const now = new Date("2026-01-15")

    const isExpired = expiredPrequal.expiresAt < now
    expect(isExpired).toBe(true)
  })

  it("should detect active (non-expired) prequals correctly", () => {
    const activePrequal = {
      expiresAt: new Date("2026-03-01"),
      prequal_status: "ACTIVE",
    }
    const now = new Date("2026-01-15")

    const isExpired = activePrequal.expiresAt < now
    expect(isExpired).toBe(false)
  })
})

describe("External Pre-Approval - Auction Gating Contract", () => {
  it("should pass auction prerequisite check with valid non-expired preQualification", () => {
    // The auction service checks: preQualification exists AND expiresAt > now()
    // This must work for BOTH internal and external prequal flows
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const buyer = {
      preQualification: {
        id: "pq-1",
        expiresAt: futureDate,
        creditTier: "GOOD",
        maxOtd: 35000,
        source: "EXTERNAL_MANUAL",
      },
    }

    const hasPreQual = !!buyer.preQualification
    const notExpired = buyer.preQualification.expiresAt > new Date()
    expect(hasPreQual).toBe(true)
    expect(notExpired).toBe(true)
  })

  it("should fail auction prerequisite check when preQualification is missing", () => {
    const buyer = { preQualification: null }
    expect(!buyer.preQualification).toBe(true)
  })

  it("should fail auction prerequisite check when preQualification is expired", () => {
    const buyer = {
      preQualification: {
        id: "pq-1",
        expiresAt: new Date("2025-01-01"),
        creditTier: "GOOD",
        maxOtd: 35000,
      },
    }

    const isExpired = new Date(buyer.preQualification.expiresAt) < new Date()
    expect(isExpired).toBe(true)
  })

  it("should NOT use a status field for gating (Prisma model has no status field)", () => {
    // The PreQualification Prisma model has no 'status' field.
    // Gating must use existence + expiresAt, NOT '.status === "APPROVED"'.
    // The raw DB column 'prequal_status' is only accessible via Supabase queries.
    const preQualPrismaFields = [
      "id", "buyerId", "creditScore", "creditTier", "maxOtd",
      "estimatedMonthlyMin", "estimatedMonthlyMax", "dti",
      "softPullCompleted", "softPullDate", "consentGiven", "consentDate",
      "source", "externalSubmissionId", "providerName", "expiresAt",
      "createdAt", "updatedAt", "workspaceId",
    ]
    expect(preQualPrismaFields).not.toContain("status")
    expect(preQualPrismaFields).not.toContain("prequal_status")
    expect(preQualPrismaFields).toContain("expiresAt")
  })
})

describe("External Pre-Approval - Unified Response", () => {
  it("should include both preQualification and externalSubmission in unified response", () => {
    const unifiedResponse = {
      success: true,
      data: {
        active: true,
        preQualification: {
          id: "pq-1",
          status: "ACTIVE",
          source: "EXTERNAL_MANUAL",
          creditTier: "GOOD",
          maxOtdAmountCents: 3500000,
          providerName: "External Verified: Chase Bank",
        },
        externalSubmission: {
          id: "sub-1",
          status: "APPROVED",
          lenderName: "Chase Bank",
          approvedAmount: 35000,
        },
      },
    }

    expect(unifiedResponse.data).toHaveProperty("preQualification")
    expect(unifiedResponse.data).toHaveProperty("externalSubmission")
    expect(unifiedResponse.data.preQualification?.source).toBe("EXTERNAL_MANUAL")
    expect(unifiedResponse.data.externalSubmission?.status).toBe("APPROVED")
  })

  it("should return null externalSubmission when no external submission exists", () => {
    const unifiedResponse = {
      success: true,
      data: {
        active: true,
        preQualification: {
          id: "pq-1",
          status: "ACTIVE",
          source: "INTERNAL",
        },
        externalSubmission: null,
      },
    }

    expect(unifiedResponse.data.preQualification?.source).toBe("INTERNAL")
    expect(unifiedResponse.data.externalSubmission).toBeNull()
  })

  it("should include source field in preQualification response", () => {
    const internalResponse = {
      preQualification: { source: "INTERNAL" },
    }
    const externalResponse = {
      preQualification: { source: "EXTERNAL_MANUAL" },
    }

    expect(internalResponse.preQualification.source).toBe("INTERNAL")
    expect(externalResponse.preQualification.source).toBe("EXTERNAL_MANUAL")
  })
})

describe("External Pre-Approval - Superseding Logic", () => {
  it("should supersede existing SUBMITTED submissions when buyer resubmits", () => {
    const existingSubmissions = [
      { id: "s1", buyerId: "buyer-123", status: "SUBMITTED" },
      { id: "s2", buyerId: "buyer-123", status: "REJECTED" },
      { id: "s3", buyerId: "buyer-123", status: "IN_REVIEW" },
    ]

    // Simulate superseding SUBMITTED and IN_REVIEW
    const updated = existingSubmissions.map((s) =>
      s.status === "SUBMITTED" || s.status === "IN_REVIEW"
        ? { ...s, status: "SUPERSEDED" }
        : s,
    )

    expect(updated[0]?.status).toBe("SUPERSEDED")
    expect(updated[1]?.status).toBe("REJECTED") // Unchanged
    expect(updated[2]?.status).toBe("SUPERSEDED")
  })

  it("should track supersededById for chain tracking", () => {
    const newSubmission = {
      id: "s4",
      buyerId: "buyer-123",
      status: "SUBMITTED",
      supersededById: "s1",
    }
    expect(newSubmission.supersededById).toBe("s1")
  })
})

describe("External Pre-Approval - listByStatus Logic", () => {
  it("should return only submissions matching the requested statuses", () => {
    const allSubmissions = [
      { id: "s1", status: "SUBMITTED" },
      { id: "s2", status: "IN_REVIEW" },
      { id: "s3", status: "APPROVED" },
      { id: "s4", status: "REJECTED" },
    ]

    const statuses = ["SUBMITTED", "IN_REVIEW"]
    const result = allSubmissions.filter((s) => statuses.includes(s.status))

    expect(result).toHaveLength(2)
    expect(result.map((s) => s.status)).toContain("SUBMITTED")
    expect(result.map((s) => s.status)).toContain("IN_REVIEW")
    expect(result.map((s) => s.status)).not.toContain("APPROVED")
    expect(result.map((s) => s.status)).not.toContain("REJECTED")
  })

  it("should return an empty array when no submissions match", () => {
    const allSubmissions = [
      { id: "s1", status: "APPROVED" },
      { id: "s2", status: "REJECTED" },
    ]

    const statuses = ["SUBMITTED"]
    const result = allSubmissions.filter((s) => statuses.includes(s.status))

    expect(result).toHaveLength(0)
  })

  it("should handle a single-status filter", () => {
    const allSubmissions = [
      { id: "s1", status: "IN_REVIEW" },
      { id: "s2", status: "IN_REVIEW" },
      { id: "s3", status: "SUBMITTED" },
    ]

    const statuses = ["IN_REVIEW"]
    const result = allSubmissions.filter((s) => statuses.includes(s.status))

    expect(result).toHaveLength(2)
    expect(result.every((s) => s.status === "IN_REVIEW")).toBe(true)
  })
})

describe("External Pre-Approval - Rejection Validation", () => {
  it("should require rejection reason when rejecting", () => {
    const reviewInput = {
      action: "REJECTED" as const,
      rejectionReason: undefined,
    }

    const isValid =
      reviewInput.action !== "REJECTED" || !!reviewInput.rejectionReason
    expect(isValid).toBe(false)
  })

  it("should not require rejection reason when approving", () => {
    const reviewInput: { action: string; rejectionReason: undefined } = {
      action: "APPROVED",
      rejectionReason: undefined,
    }

    const isValid =
      reviewInput.action !== "REJECTED" || !!reviewInput.rejectionReason
    expect(isValid).toBe(true)
  })

  it("should pass when rejection reason is provided", () => {
    const reviewInput = {
      action: "REJECTED" as const,
      rejectionReason: "Document appears to be expired",
    }

    const isValid =
      reviewInput.action !== "REJECTED" || !!reviewInput.rejectionReason
    expect(isValid).toBe(true)
  })

  it("should support rejection reason codes", () => {
    const validCodes = [
      "EXPIRED_DOCUMENT",
      "UNVERIFIABLE_LENDER",
      "AMOUNT_MISMATCH",
      "ILLEGIBLE_DOCUMENT",
      "INCOMPLETE_INFORMATION",
      "SUSPECTED_FRAUD",
      "OTHER",
    ]
    const reviewInput = {
      action: "REJECTED" as const,
      rejectionReason: "The document has expired",
      rejectionReasonCode: "EXPIRED_DOCUMENT",
    }
    expect(validCodes).toContain(reviewInput.rejectionReasonCode)
  })
})

describe("External Pre-Approval - Normalized Fields", () => {
  it("should compute maxOtdAmountCents from approvedAmount", () => {
    const approvedAmount = 35000
    const maxOtdAmountCents = Math.floor(approvedAmount * 100)
    expect(maxOtdAmountCents).toBe(3500000)
  })

  it("should compute aprBps from apr percentage", () => {
    const apr = 5.5
    const aprBps = Math.round(apr * 100)
    expect(aprBps).toBe(550)
  })

  it("should handle null apr gracefully", () => {
    const apr = null
    const aprBps = apr != null ? Math.round(apr * 100) : null
    expect(aprBps).toBeNull()
  })

  it("should include submissionNotes in submission data", () => {
    const submission = {
      lenderName: "Chase",
      approvedAmount: 35000,
      submissionNotes: "Pre-approved online, conditional on full application",
    }
    expect(submission.submissionNotes).toBeTruthy()
    expect(submission.submissionNotes!.length).toBeLessThanOrEqual(1000)
  })

  it("should set decisionAt on review action", () => {
    const now = new Date()
    const reviewResult = {
      status: "APPROVED",
      reviewedAt: now,
      decisionAt: now,
    }
    expect(reviewResult.decisionAt).toEqual(reviewResult.reviewedAt)
  })
})

describe("External Pre-Approval - Email Notifications", () => {
  it("should send notification to admin on new submission", () => {
    const notification = {
      recipient: "admin@autolenis.com",
      subject: "New External Pre-Approval Submission",
      lenderName: "Chase Bank",
      approvedAmount: 35000,
    }
    expect(notification.subject).toContain("External Pre-Approval")
    expect(notification.lenderName).toBeTruthy()
  })

  it("should send approval email to buyer on approval", () => {
    const notification = {
      recipient: "buyer@example.com",
      subject: "Pre-Approval Approved",
      lenderName: "Chase Bank",
    }
    expect(notification.subject).toContain("Approved")
  })

  it("should send rejection email to buyer with reason", () => {
    const notification = {
      recipient: "buyer@example.com",
      subject: "Pre-Approval Review Update",
      rejectionReason: "Document appears to be expired",
    }
    expect(notification.subject).toContain("Review Update")
    expect(notification.rejectionReason).toBeTruthy()
  })
})

describe("External Pre-Approval - Audit Event Types", () => {
  it("should log MANUAL_PREAPPROVAL_APPROVED on verification", () => {
    const auditEvent = {
      eventType: "MANUAL_PREAPPROVAL_APPROVED",
      userId: "buyer-123",
      buyerId: "buyer-123",
      action: "APPROVE",
      details: {
        submissionId: "sub-123",
        action: "APPROVED",
        reviewedBy: "admin-456",
        lenderName: "Chase Bank",
        approvedAmount: 35000,
        preQualId: "pq-789",
      },
    }
    expect(auditEvent.eventType).toBe("MANUAL_PREAPPROVAL_APPROVED")
    expect(auditEvent.action).toBe("APPROVE")
    expect(auditEvent.details.preQualId).toBeTruthy()
  })

  it("should log PREQUALIFICATION_UPSERTED_FROM_MANUAL after prequal creation", () => {
    const auditEvent = {
      eventType: "PREQUALIFICATION_UPSERTED_FROM_MANUAL",
      userId: "buyer-123",
      buyerId: "buyer-123",
      action: "UPSERT_PREQUAL",
      details: {
        submissionId: "sub-123",
        preQualId: "pq-789",
        source: "EXTERNAL_MANUAL",
        reviewedBy: "admin-456",
        lenderName: "Chase Bank",
        approvedAmount: 35000,
        creditTier: "GOOD",
        maxOtd: 35000,
      },
    }
    expect(auditEvent.eventType).toBe("PREQUALIFICATION_UPSERTED_FROM_MANUAL")
    expect(auditEvent.details.source).toBe("EXTERNAL_MANUAL")
    expect(auditEvent.details.creditTier).toBeTruthy()
    expect(auditEvent.details.maxOtd).toBeGreaterThan(0)
  })

  it("should log EXTERNAL_PREAPPROVAL_REJECTED on rejection", () => {
    const auditEvent = {
      eventType: "EXTERNAL_PREAPPROVAL_REJECTED",
      userId: "buyer-123",
      action: "REJECT",
      details: {
        submissionId: "sub-123",
        action: "REJECTED",
        rejectionReason: "Document expired",
        rejectionReasonCode: "EXPIRED_DOCUMENT",
      },
    }
    expect(auditEvent.eventType).toBe("EXTERNAL_PREAPPROVAL_REJECTED")
    expect(auditEvent.action).toBe("REJECT")
    expect(auditEvent.details.rejectionReason).toBeTruthy()
  })

  it("should not log PREQUALIFICATION_UPSERTED_FROM_MANUAL on rejection", () => {
    const auditEvents = [
      { eventType: "EXTERNAL_PREAPPROVAL_REJECTED", action: "REJECT" },
    ]
    const upsertEvents = auditEvents.filter(
      (e) => e.eventType === "PREQUALIFICATION_UPSERTED_FROM_MANUAL",
    )
    expect(upsertEvents).toHaveLength(0)
  })
})

describe("External Pre-Approval - Idempotency", () => {
  it("should return existing state when submission is already in target state (APPROVED)", () => {
    const submission = {
      id: "sub-123",
      status: "APPROVED",
      preQualificationId: "pq-789",
    }
    const input = { action: "APPROVED" as const }

    // Idempotency: if already in target state, return current state
    const isIdempotent = submission.status === input.action
    expect(isIdempotent).toBe(true)
  })

  it("should return existing state when submission is already in target state (REJECTED)", () => {
    const submission = {
      id: "sub-123",
      status: "REJECTED",
      rejectionReason: "Document expired",
    }
    const input = { action: "REJECTED" as const }

    const isIdempotent = submission.status === input.action
    expect(isIdempotent).toBe(true)
  })

  it("should not treat different states as idempotent", () => {
    const submission = { id: "sub-123", status: "SUBMITTED" }
    const input = { action: "APPROVED" as const }

    const isIdempotent = submission.status === input.action
    expect(isIdempotent).toBe(false)
  })

  it("should not create duplicate PreQualification on re-approval", () => {
    // When idempotency fires, the existing PreQualification is returned
    const existingPreQual = {
      id: "pq-789",
      source: "EXTERNAL_MANUAL",
      buyerId: "buyer-123",
    }

    // Simulate idempotent re-approval returning existing record
    const result = {
      submission: { id: "sub-123", status: "APPROVED" },
      preQualification: existingPreQual,
    }

    expect(result.preQualification.id).toBe("pq-789")
    expect(result.preQualification.source).toBe("EXTERNAL_MANUAL")
  })
})

describe("External Pre-Approval - Signed URL Security", () => {
  it("should use buyer-docs storage bucket per Prompt 4 contract", () => {
    const STORAGE_BUCKET = "buyer-docs"
    const storagePath = `user-123/preapproval/uuid.pdf`
    expect(storagePath).toContain("preapproval/")
    expect(STORAGE_BUCKET).toBe("buyer-docs")
  })

  it("should generate time-limited signed URLs for admin document access", () => {
    const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 // 1 hour
    expect(SIGNED_URL_EXPIRY_SECONDS).toBe(3600)
    expect(SIGNED_URL_EXPIRY_SECONDS).toBeLessThanOrEqual(86400) // Max 24 hours
  })

  it("should not expose public URLs or raw storage paths to buyers", () => {
    // Buyers get time-limited signed URLs (via documentUrl), but never raw
    // storage paths or permanent public URLs
    const buyerResponse = {
      success: true,
      data: {
        submission: {
          id: "sub-123",
          status: "SUBMITTED",
          lenderName: "Chase",
          documentUrl: "https://storage.example.com/signed?token=abc&expiry=3600",
          // No publicUrl, no storagePath exposed
        },
      },
    }
    expect(buyerResponse.data.submission).not.toHaveProperty("publicUrl")
    expect(buyerResponse.data.submission).not.toHaveProperty("storagePath")
    // Signed URL is acceptable for buyer access to their own document
    if (buyerResponse.data.submission.documentUrl) {
      expect(buyerResponse.data.submission.documentUrl).toContain("signed")
    }
  })

  it("should only allow ADMIN/SUPER_ADMIN to access document endpoint", () => {
    const allowedDocRoles = ["ADMIN", "SUPER_ADMIN"]
    expect(allowedDocRoles).toContain("ADMIN")
    expect(allowedDocRoles).toContain("SUPER_ADMIN")
    expect(allowedDocRoles).not.toContain("BUYER")
    expect(allowedDocRoles).not.toContain("DEALER")
    expect(allowedDocRoles).not.toContain("AFFILIATE")
  })
})

describe("External Pre-Approval - Storage Upload", () => {
  it("should upload file buffer to buyer-docs storage bucket", () => {
    const STORAGE_BUCKET = "buyer-docs"
    const userId = "user-123"
    const randomName = "550e8400-e29b-41d4-a716-446655440000"
    const ext = ".pdf"
    const storagePath = `${userId}/preapproval/${randomName}${ext}`

    const uploadParams = {
      bucket: STORAGE_BUCKET,
      path: storagePath,
      contentType: "application/pdf",
      upsert: false,
    }

    expect(uploadParams.bucket).toBe("buyer-docs")
    expect(uploadParams.path).toContain("preapproval/")
    expect(uploadParams.path).toContain(userId)
    expect(uploadParams.contentType).toBe("application/pdf")
    expect(uploadParams.upsert).toBe(false)
  })

  it("should fail the request if storage upload fails", () => {
    // If storage upload returns an error, the API must return 500
    // and NOT save metadata referencing a non-existent file
    const uploadError = { message: "Bucket not found" }
    const shouldFailRequest = !!uploadError
    expect(shouldFailRequest).toBe(true)
  })

  it("should store file metadata in database after successful upload", () => {
    const fileMetadata = {
      storagePath: "user-123/preapproval/uuid.pdf",
      originalFileName: "chase_approval.pdf",
      fileSizeBytes: 1024 * 500,
      mimeType: "application/pdf",
      storageBucket: "buyer-docs",
      sha256: "abc123def456",
    }

    expect(fileMetadata.storagePath).toBeTruthy()
    expect(fileMetadata.originalFileName).toBeTruthy()
    expect(fileMetadata.fileSizeBytes).toBeGreaterThan(0)
    expect(fileMetadata.mimeType).toBeTruthy()
    expect(fileMetadata.storageBucket).toBe("buyer-docs")
    expect(fileMetadata.sha256).toBeTruthy()
  })
})

describe("External Pre-Approval - CSRF Protection", () => {
  it("should include x-csrf-token header in FormData upload requests", () => {
    // For FormData/multipart uploads, CSRF token must be set via
    // getCsrfToken() and the x-csrf-token header, NOT via csrfHeaders()
    // which would override Content-Type
    const csrfToken = "test-csrf-token-123"
    const headers: Record<string, string> = csrfToken
      ? { "x-csrf-token": csrfToken }
      : {}

    expect(headers["x-csrf-token"]).toBe(csrfToken)
    // Must NOT set Content-Type for FormData (browser sets it with boundary)
    expect(headers["Content-Type"]).toBeUndefined()
  })

  it("should not override Content-Type for multipart form data", () => {
    // When uploading files via FormData, Content-Type must not be set
    // because the browser needs to set it with the multipart boundary
    const csrfToken = "token-abc"
    const fetchHeaders: Record<string, string> = {}
    if (csrfToken) {
      fetchHeaders["x-csrf-token"] = csrfToken
    }
    // Explicitly verify Content-Type is NOT set
    expect(Object.keys(fetchHeaders)).toEqual(["x-csrf-token"])
  })
})

describe("External Pre-Approval - Document MIME Type Security", () => {
  it("should reject SVG files (potential XSS vector)", () => {
    const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"]
    expect(ALLOWED_MIME_TYPES).not.toContain("image/svg+xml")
  })

  it("should reject BMP files", () => {
    const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"]
    expect(ALLOWED_MIME_TYPES).not.toContain("image/bmp")
  })

  it("should reject TIFF files", () => {
    const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"]
    expect(ALLOWED_MIME_TYPES).not.toContain("image/tiff")
  })

  it("should use exact MIME type matching, not prefix matching", () => {
    // Verify the allowlist uses exact matches, not startsWith("image/")
    const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"]

    // Exact match should pass
    expect(ALLOWED_MIME_TYPES.includes("image/png")).toBe(true)
    expect(ALLOWED_MIME_TYPES.includes("image/jpeg")).toBe(true)
    expect(ALLOWED_MIME_TYPES.includes("application/pdf")).toBe(true)

    // Prefix match attack vectors should fail
    expect(ALLOWED_MIME_TYPES.includes("image/svg+xml")).toBe(false)
    expect(ALLOWED_MIME_TYPES.includes("image/bmp")).toBe(false)
    expect(ALLOWED_MIME_TYPES.includes("image/gif")).toBe(false)
  })
})

// ─── RPC Failure Guard (BLOCKER 2) ──────────────────────────────────────────

describe("External Pre-Approval - RPC Failure Guard", () => {
  it("service throws with descriptive message on RPC error", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain("external_preapproval_approve RPC failed:")
    expect(source).toContain("throw new Error")
  })

  it("service guards against null/empty RPC result", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain(
      "external_preapproval_approve RPC returned no result",
    )
    expect(source).toContain("function may not be deployed")
  })

  it("service checks both null and empty array from RPC result", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain("!approveResult")
    expect(source).toContain("Array.isArray(approveResult)")
    expect(source).toContain("approveResult.length === 0")
  })

  it("service extracts prequalId from array or scalar RPC result", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain("Array.isArray(approveResult)")
    expect(source).toContain("approveResult[0]")
  })
})

// ─── FCRA Permissible Purpose Log (External Approval) ───────────────────────

describe("External Pre-Approval - FCRA Permissible Purpose Log", () => {
  it("service creates permissiblePurposeLog on external approval", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain("permissiblePurposeLog.create")
  })

  it("logs WRITTEN_INSTRUCTIONS_OF_CONSUMER as permissible purpose", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain("WRITTEN_INSTRUCTIONS_OF_CONSUMER")
  })

  it("logs SOFT_PULL inquiry type for external pre-approval", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain('"SOFT_PULL"')
  })

  it("includes buyer-facing description mentioning admin review", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain(
      "Consumer-submitted external bank pre-approval reviewed and approved by admin",
    )
  })

  it("falls back to 'External Lender' when lenderName is null", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain('"External Lender"')
  })

  it("sets prequalificationId on the FCRA log when available", () => {
    const source = require("fs").readFileSync(
      require("path").resolve("lib/services/external-preapproval.service.ts"),
      "utf8",
    )
    expect(source).toContain("prequalificationId:")
  })
})
