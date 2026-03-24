/**
 * Document and Identity Trust Infrastructure — Unit Tests
 *
 * Tests the canonical trust layer for documents and identity artifacts,
 * including version control, hash integrity, verification, and revocation.
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  createDocumentTrustRecord,
  verifyDocument,
  revokeDocument,
  getActiveDocumentTrust,
  getDocumentVersionChain,
  hasDocumentHashChanged,
  getDocumentById,
  resetDocumentStore,
  getDocumentStore,
  upsertIdentityTrust,
  verifyIdentity,
  suspendIdentity,
  flagForManualReview,
  getIdentityTrust,
  isIdentityVerified,
  resetIdentityStore,
  getIdentityStore,
  DocumentTrustStatus,
  TrustDocumentType,
  OwnerEntityType,
  AccessScope,
  IdentityTrustStatus,
  VerificationSource,
} from "@/lib/services/trust-infrastructure"
import type {
  DocumentTrustInput,
} from "@/lib/services/trust-infrastructure"

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeDocInput(overrides?: Partial<DocumentTrustInput>): DocumentTrustInput {
  return {
    ownerEntityId: "deal-1",
    ownerEntityType: OwnerEntityType.DEAL,
    documentType: TrustDocumentType.CONTRACT,
    storageSource: "supabase",
    storageReference: "contracts/deal-1/v1.pdf",
    uploaderId: "dealer-1",
    fileHash: "sha256:abc123",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Document Trust Tests
// ---------------------------------------------------------------------------

describe("Trust Infrastructure", () => {
  beforeEach(() => {
    resetDocumentStore()
    resetIdentityStore()
  })

  describe("Document Trust", () => {
    describe("createDocumentTrustRecord", () => {
      it("creates a new document trust record", () => {
        const result = createDocumentTrustRecord(makeDocInput())

        expect(result.success).toBe(true)
        expect(result.record).not.toBeNull()
        expect(result.error).toBeNull()
      })

      it("assigns an ID", () => {
        const result = createDocumentTrustRecord(makeDocInput())
        expect(result.record?.id).toBeDefined()
        expect(typeof result.record?.id).toBe("string")
      })

      it("sets status to UPLOADED", () => {
        const result = createDocumentTrustRecord(makeDocInput())
        expect(result.record?.status).toBe(DocumentTrustStatus.UPLOADED)
      })

      it("sets version number to 1 for first upload", () => {
        const result = createDocumentTrustRecord(makeDocInput())
        expect(result.record?.versionNumber).toBe(1)
      })

      it("sets activeForDecision to true", () => {
        const result = createDocumentTrustRecord(makeDocInput())
        expect(result.record?.activeForDecision).toBe(true)
      })

      it("preserves file hash", () => {
        const result = createDocumentTrustRecord(
          makeDocInput({ fileHash: "sha256:xyz789" })
        )
        expect(result.record?.fileHash).toBe("sha256:xyz789")
      })

      it("sets default access scope to DEAL_PARTIES", () => {
        const result = createDocumentTrustRecord(makeDocInput())
        expect(result.record?.accessScope).toBe(AccessScope.DEAL_PARTIES)
      })

      it("allows custom access scope", () => {
        const result = createDocumentTrustRecord(
          makeDocInput({ accessScope: AccessScope.ADMIN_ONLY })
        )
        expect(result.record?.accessScope).toBe(AccessScope.ADMIN_ONLY)
      })

      it("rejects missing ownerEntityId", () => {
        const result = createDocumentTrustRecord(
          makeDocInput({ ownerEntityId: "" })
        )
        expect(result.success).toBe(false)
        expect(result.error).toContain("ownerEntityId")
      })

      it("rejects missing fileHash", () => {
        const result = createDocumentTrustRecord(
          makeDocInput({ fileHash: "" })
        )
        expect(result.success).toBe(false)
        expect(result.error).toContain("fileHash")
      })

      it("rejects missing uploaderId", () => {
        const result = createDocumentTrustRecord(
          makeDocInput({ uploaderId: "" })
        )
        expect(result.success).toBe(false)
        expect(result.error).toContain("uploaderId")
      })
    })

    describe("version control", () => {
      it("increments version number on subsequent uploads", () => {
        const v1 = createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v1" }))
        const v2 = createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v2" }))

        expect(v1.record?.versionNumber).toBe(1)
        expect(v2.record?.versionNumber).toBe(2)
      })

      it("marks previous version as SUPERSEDED on new upload", () => {
        createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v1" }))
        createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v2" }))

        const chain = getDocumentVersionChain(
          "deal-1",
          OwnerEntityType.DEAL,
          TrustDocumentType.CONTRACT
        )
        expect(chain[0].status).toBe(DocumentTrustStatus.SUPERSEDED)
        expect(chain[0].activeForDecision).toBe(false)
        expect(chain[1].status).toBe(DocumentTrustStatus.UPLOADED)
        expect(chain[1].activeForDecision).toBe(true)
      })

      it("sets supersededById on previous version", () => {
        const v1 = createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v1" }))
        const v2 = createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v2" }))

        const chain = getDocumentVersionChain(
          "deal-1",
          OwnerEntityType.DEAL,
          TrustDocumentType.CONTRACT
        )
        expect(chain[0].supersededById).toBe(v2.record?.id)
      })

      it("only the latest version is activeForDecision", () => {
        createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v1" }))
        createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v2" }))
        createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v3" }))

        const active = getActiveDocumentTrust(
          "deal-1",
          OwnerEntityType.DEAL,
          TrustDocumentType.CONTRACT
        )
        expect(active?.versionNumber).toBe(3)
        expect(active?.fileHash).toBe("hash-v3")
      })
    })

    describe("verification", () => {
      it("verifies a document", () => {
        const created = createDocumentTrustRecord(makeDocInput())
        const result = verifyDocument({
          documentId: created.record!.id,
          verifierId: "admin-1",
          status: DocumentTrustStatus.VERIFIED,
          verificationMetadata: { method: "manual" },
        })

        expect(result.success).toBe(true)
        expect(result.record?.status).toBe(DocumentTrustStatus.VERIFIED)
        expect(result.record?.verifierId).toBe("admin-1")
        expect(result.record?.verifiedAt).toBeDefined()
      })

      it("approves a document", () => {
        const created = createDocumentTrustRecord(makeDocInput())
        const result = verifyDocument({
          documentId: created.record!.id,
          verifierId: "admin-1",
          status: DocumentTrustStatus.APPROVED,
        })

        expect(result.success).toBe(true)
        expect(result.record?.status).toBe(DocumentTrustStatus.APPROVED)
        expect(result.record?.activeForDecision).toBe(true)
      })

      it("rejects verification of superseded document", () => {
        createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v1" }))
        const v1Chain = getDocumentVersionChain(
          "deal-1",
          OwnerEntityType.DEAL,
          TrustDocumentType.CONTRACT
        )

        createDocumentTrustRecord(makeDocInput({ fileHash: "hash-v2" }))

        const result = verifyDocument({
          documentId: v1Chain[0].id,
          verifierId: "admin-1",
          status: DocumentTrustStatus.APPROVED,
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain("SUPERSEDED")
      })

      it("rejects verification of non-existent document", () => {
        const result = verifyDocument({
          documentId: "nonexistent",
          verifierId: "admin-1",
          status: DocumentTrustStatus.APPROVED,
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain("not found")
      })
    })

    describe("revocation", () => {
      it("revokes a document", () => {
        const created = createDocumentTrustRecord(makeDocInput())
        const result = revokeDocument(
          created.record!.id,
          "admin-1",
          "Fraudulent document detected"
        )

        expect(result.success).toBe(true)
        expect(result.record?.status).toBe(DocumentTrustStatus.REVOKED)
        expect(result.record?.revokedById).toBe("admin-1")
        expect(result.record?.revocationReason).toBe("Fraudulent document detected")
        expect(result.record?.activeForDecision).toBe(false)
      })

      it("revoked document is no longer active for decision", () => {
        const created = createDocumentTrustRecord(makeDocInput())
        revokeDocument(created.record!.id, "admin-1", "Reason")

        const active = getActiveDocumentTrust(
          "deal-1",
          OwnerEntityType.DEAL,
          TrustDocumentType.CONTRACT
        )
        expect(active).toBeNull()
      })

      it("rejects double revocation", () => {
        const created = createDocumentTrustRecord(makeDocInput())
        revokeDocument(created.record!.id, "admin-1", "First revoke")
        const result = revokeDocument(created.record!.id, "admin-2", "Second revoke")

        expect(result.success).toBe(false)
        expect(result.error).toContain("already revoked")
      })
    })

    describe("hash integrity", () => {
      it("detects hash change from active version", () => {
        createDocumentTrustRecord(makeDocInput({ fileHash: "sha256:original" }))

        expect(
          hasDocumentHashChanged(
            "deal-1",
            OwnerEntityType.DEAL,
            TrustDocumentType.CONTRACT,
            "sha256:modified"
          )
        ).toBe(true)
      })

      it("returns false when hash matches", () => {
        createDocumentTrustRecord(makeDocInput({ fileHash: "sha256:original" }))

        expect(
          hasDocumentHashChanged(
            "deal-1",
            OwnerEntityType.DEAL,
            TrustDocumentType.CONTRACT,
            "sha256:original"
          )
        ).toBe(false)
      })

      it("returns false when no active document exists", () => {
        expect(
          hasDocumentHashChanged(
            "deal-1",
            OwnerEntityType.DEAL,
            TrustDocumentType.CONTRACT,
            "sha256:any"
          )
        ).toBe(false)
      })
    })

    describe("getDocumentById", () => {
      it("retrieves document by ID", () => {
        const created = createDocumentTrustRecord(makeDocInput())
        const found = getDocumentById(created.record!.id)
        expect(found).not.toBeNull()
        expect(found?.id).toBe(created.record!.id)
      })

      it("returns null for non-existent ID", () => {
        expect(getDocumentById("nonexistent")).toBeNull()
      })
    })

    describe("document type isolation", () => {
      it("maintains separate version chains per document type", () => {
        createDocumentTrustRecord(
          makeDocInput({
            documentType: TrustDocumentType.CONTRACT,
            fileHash: "contract-hash",
          })
        )
        createDocumentTrustRecord(
          makeDocInput({
            documentType: TrustDocumentType.INSURANCE_PROOF,
            fileHash: "insurance-hash",
          })
        )

        const contractActive = getActiveDocumentTrust(
          "deal-1",
          OwnerEntityType.DEAL,
          TrustDocumentType.CONTRACT
        )
        const insuranceActive = getActiveDocumentTrust(
          "deal-1",
          OwnerEntityType.DEAL,
          TrustDocumentType.INSURANCE_PROOF
        )

        expect(contractActive?.fileHash).toBe("contract-hash")
        expect(insuranceActive?.fileHash).toBe("insurance-hash")
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Identity Trust Tests
  // ---------------------------------------------------------------------------

  describe("Identity Trust", () => {
    describe("upsertIdentityTrust", () => {
      it("creates a new identity trust record", () => {
        const result = upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })

        expect(result.success).toBe(true)
        expect(result.record).not.toBeNull()
        expect(result.record?.status).toBe(IdentityTrustStatus.UNVERIFIED)
      })

      it("assigns an ID", () => {
        const result = upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })
        expect(result.record?.id).toBeDefined()
        expect(typeof result.record?.id).toBe("string")
      })

      it("updates existing record on second call", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
          trustFlags: ["flag-1"],
        })
        const result = upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
          trustFlags: ["flag-2"],
        })

        expect(result.success).toBe(true)
        expect(result.record?.trustFlags).toEqual(["flag-2"])
        expect(getIdentityStore().length).toBe(1)
      })

      it("rejects missing entityId", () => {
        const result = upsertIdentityTrust({
          entityId: "",
          entityType: OwnerEntityType.BUYER,
        })
        expect(result.success).toBe(false)
        expect(result.error).toContain("entityId")
      })
    })

    describe("verifyIdentity", () => {
      it("marks identity as verified", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })

        const result = verifyIdentity(
          "buyer-1",
          OwnerEntityType.BUYER,
          "admin-1",
          VerificationSource.MANUAL_ADMIN
        )

        expect(result.success).toBe(true)
        expect(result.record?.status).toBe(IdentityTrustStatus.VERIFIED)
        expect(result.record?.verifierId).toBe("admin-1")
        expect(result.record?.verifiedAt).toBeDefined()
        expect(result.record?.verificationSource).toBe(VerificationSource.MANUAL_ADMIN)
      })

      it("sets KYC status when provided", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })

        const result = verifyIdentity(
          "buyer-1",
          OwnerEntityType.BUYER,
          "admin-1",
          VerificationSource.KYC_PROVIDER,
          { kycStatus: "PASSED" }
        )

        expect(result.record?.kycStatus).toBe("PASSED")
      })

      it("clears manualReviewRequired on verification", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })
        flagForManualReview("buyer-1", OwnerEntityType.BUYER, ["suspicious-activity"])
        verifyIdentity(
          "buyer-1",
          OwnerEntityType.BUYER,
          "admin-1",
          VerificationSource.MANUAL_ADMIN
        )

        const record = getIdentityTrust("buyer-1", OwnerEntityType.BUYER)
        expect(record?.manualReviewRequired).toBe(false)
      })

      it("fails for non-existent identity", () => {
        const result = verifyIdentity(
          "nonexistent",
          OwnerEntityType.BUYER,
          "admin-1",
          VerificationSource.MANUAL_ADMIN
        )
        expect(result.success).toBe(false)
        expect(result.error).toContain("not found")
      })
    })

    describe("suspendIdentity", () => {
      it("suspends an identity", () => {
        upsertIdentityTrust({
          entityId: "dealer-1",
          entityType: OwnerEntityType.DEALER,
        })

        const result = suspendIdentity(
          "dealer-1",
          OwnerEntityType.DEALER,
          "Compliance violation"
        )

        expect(result.success).toBe(true)
        expect(result.record?.status).toBe(IdentityTrustStatus.SUSPENDED)
        expect(result.record?.riskFlags).toContain("Compliance violation")
      })
    })

    describe("flagForManualReview", () => {
      it("flags identity for manual review", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })

        const result = flagForManualReview("buyer-1", OwnerEntityType.BUYER, [
          "suspicious-activity",
          "unusual-pattern",
        ])

        expect(result.success).toBe(true)
        expect(result.record?.manualReviewRequired).toBe(true)
        expect(result.record?.riskFlags).toContain("suspicious-activity")
        expect(result.record?.riskFlags).toContain("unusual-pattern")
      })

      it("deduplicates risk flags", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
          riskFlags: ["existing-flag"],
        })

        flagForManualReview("buyer-1", OwnerEntityType.BUYER, [
          "existing-flag",
          "new-flag",
        ])

        const record = getIdentityTrust("buyer-1", OwnerEntityType.BUYER)
        const flagCount = record?.riskFlags.filter(
          (f) => f === "existing-flag"
        ).length
        expect(flagCount).toBe(1)
      })
    })

    describe("isIdentityVerified", () => {
      it("returns true for verified identity", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })
        verifyIdentity(
          "buyer-1",
          OwnerEntityType.BUYER,
          "admin-1",
          VerificationSource.MANUAL_ADMIN
        )

        expect(isIdentityVerified("buyer-1", OwnerEntityType.BUYER)).toBe(true)
      })

      it("returns false for unverified identity", () => {
        upsertIdentityTrust({
          entityId: "buyer-1",
          entityType: OwnerEntityType.BUYER,
        })

        expect(isIdentityVerified("buyer-1", OwnerEntityType.BUYER)).toBe(false)
      })

      it("returns false for non-existent identity", () => {
        expect(isIdentityVerified("nonexistent", OwnerEntityType.BUYER)).toBe(false)
      })

      it("returns false for suspended identity", () => {
        upsertIdentityTrust({
          entityId: "dealer-1",
          entityType: OwnerEntityType.DEALER,
        })
        verifyIdentity(
          "dealer-1",
          OwnerEntityType.DEALER,
          "admin-1",
          VerificationSource.MANUAL_ADMIN
        )
        suspendIdentity("dealer-1", OwnerEntityType.DEALER, "Violation")

        expect(isIdentityVerified("dealer-1", OwnerEntityType.DEALER)).toBe(false)
      })
    })

    describe("entity type isolation", () => {
      it("maintains separate records for different entity types", () => {
        upsertIdentityTrust({
          entityId: "entity-1",
          entityType: OwnerEntityType.BUYER,
        })
        upsertIdentityTrust({
          entityId: "entity-1",
          entityType: OwnerEntityType.DEALER,
        })

        const buyer = getIdentityTrust("entity-1", OwnerEntityType.BUYER)
        const dealer = getIdentityTrust("entity-1", OwnerEntityType.DEALER)

        expect(buyer).not.toBeNull()
        expect(dealer).not.toBeNull()
        expect(buyer?.id).not.toBe(dealer?.id)
      })
    })
  })
})
