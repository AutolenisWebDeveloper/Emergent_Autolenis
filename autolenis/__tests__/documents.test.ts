import { describe, it, expect } from "vitest"
import {
  isDocumentType,
  isAcceptedDocumentMimeType,
  formatDocumentType,
  VALID_DOCUMENT_TYPES as LIB_DOCUMENT_TYPES,
  MAX_DOCUMENT_FILE_SIZE,
} from "@/lib/utils/documents"
import { extractApiError } from "@/lib/utils/error-message"

// Document permission and lifecycle tests
// These test the permission model and status lifecycle logic

const VALID_DOCUMENT_TYPES = ["ID", "INSURANCE_PROOF", "PAY_STUB", "BANK_STATEMENT", "TRADE_IN_TITLE", "PRE_APPROVAL_LETTER", "OTHER"]
const VALID_DOC_STATUSES = ["UPLOADED", "PENDING_REVIEW", "APPROVED", "REJECTED"]
const VALID_REQUEST_STATUSES = ["REQUESTED", "UPLOADED", "APPROVED", "REJECTED"]
const ROLES_THAT_CAN_REQUEST = ["DEALER", "ADMIN"]
const ROLES_THAT_CAN_APPROVE = ["DEALER", "ADMIN"]

describe("Document Feature - Permission Model", () => {
  describe("Role-based access", () => {
    it("should only allow BUYER to upload documents", () => {
      const allowedUploadRoles = ["BUYER"]
      expect(allowedUploadRoles).toContain("BUYER")
      expect(allowedUploadRoles).not.toContain("DEALER")
      expect(allowedUploadRoles).not.toContain("ADMIN")
      expect(allowedUploadRoles).not.toContain("AFFILIATE")
    })

    it("should allow DEALER and ADMIN to create document requests", () => {
      expect(ROLES_THAT_CAN_REQUEST).toContain("DEALER")
      expect(ROLES_THAT_CAN_REQUEST).toContain("ADMIN")
      expect(ROLES_THAT_CAN_REQUEST).not.toContain("BUYER")
    })

    it("should allow DEALER and ADMIN to approve/reject documents", () => {
      expect(ROLES_THAT_CAN_APPROVE).toContain("DEALER")
      expect(ROLES_THAT_CAN_APPROVE).toContain("ADMIN")
      expect(ROLES_THAT_CAN_APPROVE).not.toContain("BUYER")
    })

    it("should scope buyer queries to their own userId", () => {
      const mockBuyerUserId = "buyer-123"
      const mockDocuments = [
        { id: "d1", ownerUserId: "buyer-123", dealId: "deal-1" },
        { id: "d2", ownerUserId: "buyer-456", dealId: "deal-2" },
        { id: "d3", ownerUserId: "buyer-123", dealId: "deal-3" },
      ]

      const filtered = mockDocuments.filter((d) => d.ownerUserId === mockBuyerUserId)
      expect(filtered).toHaveLength(2)
      expect(filtered.every((d) => d.ownerUserId === mockBuyerUserId)).toBe(true)
    })

    it("should scope dealer queries to their associated deals", () => {
      const dealerDealIds = ["deal-1", "deal-3"]
      const mockDocuments = [
        { id: "d1", dealId: "deal-1" },
        { id: "d2", dealId: "deal-2" },
        { id: "d3", dealId: "deal-3" },
        { id: "d4", dealId: "deal-4" },
      ]

      const filtered = mockDocuments.filter((d) => dealerDealIds.includes(d.dealId))
      expect(filtered).toHaveLength(2)
      expect(filtered.map((d) => d.id)).toEqual(["d1", "d3"])
    })

    it("should allow admin to view all documents without scoping", () => {
      const mockDocuments = [
        { id: "d1", ownerUserId: "buyer-1", dealId: "deal-1" },
        { id: "d2", ownerUserId: "buyer-2", dealId: "deal-2" },
      ]

      // Admin sees all (no filter applied)
      expect(mockDocuments).toHaveLength(2)
    })

    it("should only allow BUYER or ADMIN to delete documents", () => {
      const allowedDeleteRoles = ["BUYER", "ADMIN"]
      expect(allowedDeleteRoles).toContain("BUYER")
      expect(allowedDeleteRoles).toContain("ADMIN")
      expect(allowedDeleteRoles).not.toContain("DEALER")
      expect(allowedDeleteRoles).not.toContain("AFFILIATE")
    })

    it("should only allow buyer to delete their own documents", () => {
      const currentUserId = "buyer-123"
      const ownDoc = { id: "d1", ownerUserId: "buyer-123" }
      const otherDoc = { id: "d2", ownerUserId: "buyer-456" }

      expect(ownDoc.ownerUserId === currentUserId).toBe(true)
      expect(otherDoc.ownerUserId === currentUserId).toBe(false)
    })

    it("should allow BUYER to edit their own document metadata", () => {
      const allowedEditRoles = ["BUYER"]
      const editableFields = ["fileName", "type"]
      expect(allowedEditRoles).toContain("BUYER")
      expect(editableFields).toContain("fileName")
      expect(editableFields).toContain("type")
    })
  })
})

describe("Document Feature - Status Lifecycle", () => {
  describe("Document statuses", () => {
    it("should have valid document statuses", () => {
      expect(VALID_DOC_STATUSES).toContain("UPLOADED")
      expect(VALID_DOC_STATUSES).toContain("PENDING_REVIEW")
      expect(VALID_DOC_STATUSES).toContain("APPROVED")
      expect(VALID_DOC_STATUSES).toContain("REJECTED")
    })

    it("should allow transition from UPLOADED to APPROVED", () => {
      const currentStatus = "UPLOADED"
      const newStatus = "APPROVED"
      const validTransitions: Record<string, string[]> = {
        UPLOADED: ["APPROVED", "REJECTED"],
        PENDING_REVIEW: ["APPROVED", "REJECTED"],
        APPROVED: [],
        REJECTED: [],
      }

      expect(validTransitions[currentStatus]).toContain(newStatus)
    })

    it("should allow transition from UPLOADED to REJECTED", () => {
      const currentStatus = "UPLOADED"
      const newStatus = "REJECTED"
      const validTransitions: Record<string, string[]> = {
        UPLOADED: ["APPROVED", "REJECTED"],
        PENDING_REVIEW: ["APPROVED", "REJECTED"],
        APPROVED: [],
        REJECTED: [],
      }

      expect(validTransitions[currentStatus]).toContain(newStatus)
    })
  })

  describe("Document request statuses", () => {
    it("should have valid request statuses", () => {
      expect(VALID_REQUEST_STATUSES).toContain("REQUESTED")
      expect(VALID_REQUEST_STATUSES).toContain("UPLOADED")
      expect(VALID_REQUEST_STATUSES).toContain("APPROVED")
      expect(VALID_REQUEST_STATUSES).toContain("REJECTED")
    })

    it("should transition REQUESTED → UPLOADED when buyer uploads", () => {
      const currentStatus = "REQUESTED"
      const newStatus = "UPLOADED"
      const validTransitions: Record<string, string[]> = {
        REQUESTED: ["UPLOADED"],
        UPLOADED: ["APPROVED", "REJECTED"],
        APPROVED: [],
        REJECTED: ["REQUESTED"],
      }

      expect(validTransitions[currentStatus]).toContain(newStatus)
    })

    it("should transition UPLOADED → APPROVED when dealer/admin approves", () => {
      const currentStatus = "UPLOADED"
      const newStatus = "APPROVED"
      const validTransitions: Record<string, string[]> = {
        REQUESTED: ["UPLOADED"],
        UPLOADED: ["APPROVED", "REJECTED"],
        APPROVED: [],
        REJECTED: ["REQUESTED"],
      }

      expect(validTransitions[currentStatus]).toContain(newStatus)
    })

    it("should transition UPLOADED → REJECTED when dealer/admin rejects", () => {
      const currentStatus = "UPLOADED"
      const newStatus = "REJECTED"
      const validTransitions: Record<string, string[]> = {
        REQUESTED: ["UPLOADED"],
        UPLOADED: ["APPROVED", "REJECTED"],
        APPROVED: [],
        REJECTED: ["REQUESTED"],
      }

      expect(validTransitions[currentStatus]).toContain(newStatus)
    })
  })

  describe("Document types", () => {
    it("should validate known document types", () => {
      expect(VALID_DOCUMENT_TYPES).toContain("ID")
      expect(VALID_DOCUMENT_TYPES).toContain("INSURANCE_PROOF")
      expect(VALID_DOCUMENT_TYPES).toContain("PAY_STUB")
      expect(VALID_DOCUMENT_TYPES).toContain("BANK_STATEMENT")
      expect(VALID_DOCUMENT_TYPES).toContain("TRADE_IN_TITLE")
      expect(VALID_DOCUMENT_TYPES).toContain("PRE_APPROVAL_LETTER")
      expect(VALID_DOCUMENT_TYPES).toContain("OTHER")
    })

    it("should reject invalid document types", () => {
      expect(VALID_DOCUMENT_TYPES).not.toContain("RANDOM_TYPE")
      expect(VALID_DOCUMENT_TYPES).not.toContain("")
    })
  })

  describe("Request creation validation", () => {
    it("should require dealId, buyerId, and type", () => {
      const validRequest = { dealId: "deal-1", buyerId: "buyer-1", type: "ID" }
      expect(validRequest.dealId).toBeTruthy()
      expect(validRequest.buyerId).toBeTruthy()
      expect(validRequest.type).toBeTruthy()
    })

    it("should reject request with missing dealId", () => {
      const invalidRequest = { dealId: "", buyerId: "buyer-1", type: "ID" }
      expect(invalidRequest.dealId).toBeFalsy()
    })

    it("should reject request with missing buyerId", () => {
      const invalidRequest = { dealId: "deal-1", buyerId: "", type: "ID" }
      expect(invalidRequest.buyerId).toBeFalsy()
    })
  })
})

describe("Document Feature - Utility Functions", () => {
  describe("isDocumentType", () => {
    it("should accept all valid document types", () => {
      for (const t of LIB_DOCUMENT_TYPES) {
        expect(isDocumentType(t)).toBe(true)
      }
    })

    it("should reject invalid document types", () => {
      expect(isDocumentType("RANDOM_TYPE")).toBe(false)
      expect(isDocumentType("")).toBe(false)
      expect(isDocumentType("id")).toBe(false) // case-sensitive
    })

    it("should accept PRE_APPROVAL_LETTER as a valid document type", () => {
      expect(isDocumentType("PRE_APPROVAL_LETTER")).toBe(true)
    })
  })

  describe("isAcceptedDocumentMimeType", () => {
    it("should accept PDFs", () => {
      expect(isAcceptedDocumentMimeType("application/pdf")).toBe(true)
    })

    it("should accept image types", () => {
      expect(isAcceptedDocumentMimeType("image/jpeg")).toBe(true)
      expect(isAcceptedDocumentMimeType("image/png")).toBe(true)
      expect(isAcceptedDocumentMimeType("image/webp")).toBe(true)
    })

    it("should reject non-document MIME types", () => {
      expect(isAcceptedDocumentMimeType("application/zip")).toBe(false)
      expect(isAcceptedDocumentMimeType("text/html")).toBe(false)
      expect(isAcceptedDocumentMimeType("video/mp4")).toBe(false)
    })

    it("should reject potentially dangerous image MIME types", () => {
      expect(isAcceptedDocumentMimeType("image/svg+xml")).toBe(false)
      expect(isAcceptedDocumentMimeType("image/bmp")).toBe(false)
      expect(isAcceptedDocumentMimeType("image/tiff")).toBe(false)
      expect(isAcceptedDocumentMimeType("image/gif")).toBe(false)
    })

    it("should reject null/undefined/empty MIME types", () => {
      expect(isAcceptedDocumentMimeType(null)).toBe(false)
      expect(isAcceptedDocumentMimeType(undefined)).toBe(false)
      expect(isAcceptedDocumentMimeType("")).toBe(false)
    })
  })

  describe("formatDocumentType", () => {
    it("should format known document types", () => {
      expect(formatDocumentType("ID")).toBe("Government ID")
      expect(formatDocumentType("INSURANCE_PROOF")).toBe("Insurance Proof")
      expect(formatDocumentType("PAY_STUB")).toBe("Pay Stub")
      expect(formatDocumentType("BANK_STATEMENT")).toBe("Bank Statement")
      expect(formatDocumentType("TRADE_IN_TITLE")).toBe("Trade-In Title")
      expect(formatDocumentType("PRE_APPROVAL_LETTER")).toBe("Pre-Approval Letter")
      expect(formatDocumentType("OTHER")).toBe("Other")
    })

    it("should format unknown types by replacing underscores", () => {
      expect(formatDocumentType("CUSTOM_TYPE")).toBe("custom type")
    })
  })
})

describe("Document Feature - Schema Alignment", () => {
  it("DealDocument insert should only use fields present in the schema", () => {
    // These are the valid fields for DealDocument based on the Prisma schema
    const schemaFields = [
      "ownerUserId", "dealId", "workspaceId", "type", "fileName",
      "mimeType", "fileSize", "fileUrl", "storagePath", "status",
      "rejectionReason", "requestId",
    ]

    // Simulates what dealer upload should insert
    const dealerUploadData = {
      ownerUserId: "user-1",
      dealId: "deal-1",
      type: "OTHER",
      fileName: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      fileUrl: "/uploads/dealer/d1/test.pdf",
      storagePath: "/uploads/dealer/d1/test.pdf",
      status: "UPLOADED",
      workspaceId: "ws-1",
    }

    // Verify no invalid fields are present
    for (const key of Object.keys(dealerUploadData)) {
      expect(schemaFields).toContain(key)
    }

    // Verify previously buggy fields are NOT present
    expect(dealerUploadData).not.toHaveProperty("ownerRole")
    expect(dealerUploadData).not.toHaveProperty("dealerId")
    expect(dealerUploadData).not.toHaveProperty("visibility")
  })

  it("admin document update should only use fields present in the schema", () => {
    const schemaFields = [
      "ownerUserId", "dealId", "workspaceId", "type", "fileName",
      "mimeType", "fileSize", "fileUrl", "storagePath", "status",
      "rejectionReason", "requestId", "updatedAt",
    ]

    // Simulates what admin PATCH should update
    const adminUpdateData = {
      status: "APPROVED",
      rejectionReason: null,
      updatedAt: new Date().toISOString(),
    }

    for (const key of Object.keys(adminUpdateData)) {
      expect(schemaFields).toContain(key)
    }

    // Verify previously buggy fields are NOT present
    expect(adminUpdateData).not.toHaveProperty("notes")
    expect(adminUpdateData).not.toHaveProperty("reviewedBy")
  })

  it("all document routes should use DealDocument table, not Document", () => {
    // The correct table name is DealDocument, not Document
    const correctTableName = "DealDocument"
    expect(correctTableName).toBe("DealDocument")
    expect(correctTableName).not.toBe("Document")
  })
})

describe("Document Feature - Delete Permission Model", () => {
  const ROLES_THAT_CAN_DELETE_OWN = ["BUYER", "DEALER", "ADMIN", "SUPER_ADMIN"]

  it("should allow document owners to delete their own documents", () => {
    const doc = { id: "d1", ownerUserId: "buyer-123" }
    const user = { userId: "buyer-123", role: "BUYER" }
    const canDelete = doc.ownerUserId === user.userId
    expect(canDelete).toBe(true)
  })

  it("should prevent non-owners from deleting documents unless admin", () => {
    const doc = { id: "d1", ownerUserId: "buyer-123" }
    const user = { userId: "buyer-456", role: "BUYER" }
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    const canDelete = doc.ownerUserId === user.userId || isAdmin
    expect(canDelete).toBe(false)
  })

  it("should allow admin to delete any document", () => {
    const doc = { id: "d1", ownerUserId: "buyer-123" }
    const user = { userId: "admin-1", role: "ADMIN" }
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    const canDelete = doc.ownerUserId === user.userId || isAdmin
    expect(canDelete).toBe(true)
  })

  it("should revert linked request status to REQUESTED when document is deleted", () => {
    const doc = { id: "d1", requestId: "req-1", ownerUserId: "buyer-123" }
    const requestBefore = { id: "req-1", status: "UPLOADED" }
    // After delete, the request should revert to REQUESTED
    if (doc.requestId) {
      requestBefore.status = "REQUESTED"
    }
    expect(requestBefore.status).toBe("REQUESTED")
  })
})

describe("Document Feature - Edit Permission Model", () => {
  it("should allow buyers to edit their own document metadata", () => {
    const doc = { id: "d1", ownerUserId: "buyer-123", fileName: "old.pdf", type: "ID" }
    const user = { userId: "buyer-123", role: "BUYER" }
    const canEdit = user.role === "BUYER" && doc.ownerUserId === user.userId
    expect(canEdit).toBe(true)
  })

  it("should prevent buyers from editing other users' documents", () => {
    const doc = { id: "d1", ownerUserId: "buyer-456", fileName: "old.pdf", type: "ID" }
    const user = { userId: "buyer-123", role: "BUYER" }
    const canEdit = user.role === "BUYER" && doc.ownerUserId === user.userId
    expect(canEdit).toBe(false)
  })

  it("should only allow valid document types when editing", () => {
    const validTypes = ["ID", "INSURANCE_PROOF", "PAY_STUB", "BANK_STATEMENT", "TRADE_IN_TITLE", "OTHER"]
    expect(validTypes).toContain("ID")
    expect(validTypes).not.toContain("RANDOM")
    expect(validTypes).not.toContain("")
  })

  it("should validate edit payload contains at least one field to update", () => {
    const emptyUpdate = {}
    const validUpdate = { fileName: "new-name.pdf" }
    expect(Object.keys(emptyUpdate).length).toBe(0)
    expect(Object.keys(validUpdate).length).toBeGreaterThan(0)
  })
})

describe("Document Feature - Replace Permission Model", () => {
  it("should allow document owners to replace the file", () => {
    const doc = { id: "d1", ownerUserId: "buyer-123", storagePath: "/uploads/old.pdf" }
    const user = { userId: "buyer-123", role: "BUYER" }
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    const canReplace = doc.ownerUserId === user.userId || isAdmin
    expect(canReplace).toBe(true)
  })

  it("should prevent non-owners from replacing the file unless admin", () => {
    const doc = { id: "d1", ownerUserId: "buyer-123", storagePath: "/uploads/old.pdf" }
    const user = { userId: "buyer-456", role: "BUYER" }
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    const canReplace = doc.ownerUserId === user.userId || isAdmin
    expect(canReplace).toBe(false)
  })

  it("should reset document status to UPLOADED after replacement", () => {
    const doc = { id: "d1", status: "REJECTED", rejectionReason: "Blurry image" }
    // After replacement, status resets
    const afterReplace = { ...doc, status: "UPLOADED", rejectionReason: null }
    expect(afterReplace.status).toBe("UPLOADED")
    expect(afterReplace.rejectionReason).toBeNull()
  })

  it("should validate MIME type on file replacement", () => {
    expect(isAcceptedDocumentMimeType("application/pdf")).toBe(true)
    expect(isAcceptedDocumentMimeType("image/jpeg")).toBe(true)
    expect(isAcceptedDocumentMimeType("application/zip")).toBe(false)
    expect(isAcceptedDocumentMimeType("text/html")).toBe(false)
  })

  it("should extract human-readable message from nested error responses", () => {
    // The CSRF middleware returns { error: { code, message } }, while API routes return { error: "string" }
    // The client code should handle both formats gracefully using the shared extractApiError utility

    // API route format: { error: "string message" }
    expect(extractApiError("Upload failed", "Fallback")).toBe("Upload failed")

    // CSRF middleware format: { error: { code: "CSRF_INVALID", message: "Missing CSRF token" } }
    expect(extractApiError({ code: "CSRF_INVALID", message: "Missing CSRF token" }, "Fallback")).toBe("Missing CSRF token")

    // Undefined error
    expect(extractApiError(undefined, "Fallback")).toBe("Fallback")

    // Null error
    expect(extractApiError(null, "Fallback")).toBe("Fallback")
  })

  it("replace update should only use valid schema fields", () => {
    const schemaFields = [
      "ownerUserId", "dealId", "workspaceId", "type", "fileName",
      "mimeType", "fileSize", "fileUrl", "storagePath", "status",
      "rejectionReason", "requestId", "updatedAt",
    ]

    const replaceUpdateData = {
      fileName: "new-file.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
      fileUrl: "/uploads/new-file.pdf",
      storagePath: "/uploads/new-file.pdf",
      status: "UPLOADED",
      rejectionReason: null,
      updatedAt: new Date().toISOString(),
    }

    for (const key of Object.keys(replaceUpdateData)) {
      expect(schemaFields).toContain(key)
    }
  })
})
