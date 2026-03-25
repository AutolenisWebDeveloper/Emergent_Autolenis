/**
 * Insurance Service Integration Tests
 *
 * Tests for the insurance readiness state machine integration in the service layer.
 * Validates state transitions, upload handling, and delivery gating.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock Prisma (hoisted) ─────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  selectedDeal: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  insuranceUpload: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  insuranceQuote: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  insurancePolicy: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  buyerProfile: {
    findFirst: vi.fn(),
  },
  documentTrustRecord: {
    findFirst: vi.fn(),
  },
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))

vi.mock("@/lib/services/deal-context.service", () => ({
  dealContextService: { resolveDealContextForBuyer: vi.fn() },
}))

vi.mock("@/lib/services/event-ledger", () => ({
  writeEventAsync: vi.fn().mockResolvedValue(undefined),
  PlatformEventType: { INSURANCE_COMPLETED: "INSURANCE_COMPLETED" },
  EntityType: { INSURANCE: "INSURANCE" },
  ActorType: { BUYER: "BUYER", ADMIN: "ADMIN" },
}))

vi.mock("@/lib/services/trust-infrastructure", () => ({
  createDocumentTrustRecordAsync: vi.fn().mockResolvedValue(undefined),
  verifyDocument: vi.fn().mockResolvedValue(undefined),
  TrustDocumentType: { INSURANCE_PROOF: "INSURANCE_PROOF" },
  OwnerEntityType: { DEAL: "DEAL" },
  AccessScope: { DEAL_PARTIES: "DEAL_PARTIES" },
  DocumentTrustStatus: { APPROVED: "APPROVED" },
}))

// ─── Import after mocks ────────────────────────────────────────────────

import { InsuranceService } from "@/lib/services/insurance.service"

// ─── Tests ─────────────────────────────────────────────────────────────

describe("InsuranceService — State Transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("transitionInsuranceStatus", () => {
    it("transitions from NOT_STARTED to CURRENT_INSURANCE_UPLOADED", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
        status: "SELECTED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      const result = await InsuranceService.transitionInsuranceStatus(
        "deal-1",
        "CURRENT_INSURANCE_UPLOADED",
      )

      expect(result.previousStatus).toBe("NOT_STARTED")
      expect(result.newStatus).toBe("CURRENT_INSURANCE_UPLOADED")
      expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
        where: { id: "deal-1" },
        data: {
          insurance_readiness_status: "CURRENT_INSURANCE_UPLOADED",
          delivery_block_flag: false,
        },
      })
    })

    it("transitions from NOT_STARTED to INSURANCE_PENDING", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
        status: "SELECTED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      const result = await InsuranceService.transitionInsuranceStatus(
        "deal-1",
        "INSURANCE_PENDING",
      )

      expect(result.newStatus).toBe("INSURANCE_PENDING")
    })

    it("transitions from NOT_STARTED to HELP_REQUESTED", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
        status: "SELECTED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      const result = await InsuranceService.transitionInsuranceStatus(
        "deal-1",
        "HELP_REQUESTED",
      )

      expect(result.newStatus).toBe("HELP_REQUESTED")
    })

    it("rejects invalid transition from NOT_STARTED to VERIFIED", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
        status: "SELECTED",
      })

      await expect(
        InsuranceService.transitionInsuranceStatus("deal-1", "VERIFIED"),
      ).rejects.toThrow("Invalid insurance status transition from NOT_STARTED to VERIFIED")
    })

    it("rejects invalid transition from VERIFIED (terminal state)", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "VERIFIED",
        status: "SIGNED",
      })

      await expect(
        InsuranceService.transitionInsuranceStatus("deal-1", "NOT_STARTED"),
      ).rejects.toThrow("Invalid insurance status transition")
    })

    it("sets delivery_block_flag when at delivery stage without verified insurance", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
        status: "SIGNED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      await InsuranceService.transitionInsuranceStatus("deal-1", "INSURANCE_PENDING")

      expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
        where: { id: "deal-1" },
        data: {
          insurance_readiness_status: "INSURANCE_PENDING",
          delivery_block_flag: true,
        },
      })
    })

    it("clears delivery_block_flag when transitioning to VERIFIED from UNDER_REVIEW", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "UNDER_REVIEW",
        status: "SIGNED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      await InsuranceService.transitionInsuranceStatus("deal-1", "VERIFIED")

      expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
        where: { id: "deal-1" },
        data: {
          insurance_readiness_status: "VERIFIED",
          delivery_block_flag: false,
        },
      })
    })

    it("throws when deal not found", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue(null)

      await expect(
        InsuranceService.transitionInsuranceStatus("missing", "INSURANCE_PENDING"),
      ).rejects.toThrow("Deal not found")
    })
  })

  describe("uploadInsuranceDocument", () => {
    it("creates upload record and transitions status", async () => {
      mockPrisma.selectedDeal.findFirst.mockResolvedValue({
        id: "deal-1",
        workspaceId: "ws-1",
        insurance_readiness_status: "NOT_STARTED",
      })
      mockPrisma.insuranceUpload.create.mockResolvedValue({
        id: "upload-1",
        dealId: "deal-1",
        buyerId: "buyer-1",
        fileUrl: "https://example.com/file.pdf",
        fileType: "application/pdf",
        documentTag: "insurance_card",
        status: "UPLOADED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      const result = await InsuranceService.uploadInsuranceDocument(
        "deal-1",
        "buyer-1",
        "https://example.com/file.pdf",
        "application/pdf",
        "insurance_card",
      )

      expect(result.uploadId).toBe("upload-1")
      expect(result.status).toBe("CURRENT_INSURANCE_UPLOADED")
      expect(result.documentTag).toBe("insurance_card")
      expect(mockPrisma.insuranceUpload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dealId: "deal-1",
          buyerId: "buyer-1",
          fileType: "application/pdf",
          documentTag: "insurance_card",
        }),
      })
    })

    it("throws when deal not found or unauthorized", async () => {
      mockPrisma.selectedDeal.findFirst.mockResolvedValue(null)

      await expect(
        InsuranceService.uploadInsuranceDocument(
          "deal-1",
          "buyer-1",
          "url",
          "pdf",
          "insurance_card",
        ),
      ).rejects.toThrow("Deal not found or unauthorized")
    })
  })

  describe("markInsurancePending", () => {
    it("transitions to INSURANCE_PENDING", async () => {
      mockPrisma.selectedDeal.findFirst.mockResolvedValue({ id: "deal-1" })
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
        status: "SELECTED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      const result = await InsuranceService.markInsurancePending("deal-1", "buyer-1")
      expect(result.newStatus).toBe("INSURANCE_PENDING")
    })

    it("throws when deal not found", async () => {
      mockPrisma.selectedDeal.findFirst.mockResolvedValue(null)

      await expect(
        InsuranceService.markInsurancePending("missing", "buyer-1"),
      ).rejects.toThrow("Deal not found or unauthorized")
    })
  })

  describe("requestInsuranceHelp", () => {
    it("transitions to HELP_REQUESTED", async () => {
      mockPrisma.selectedDeal.findFirst.mockResolvedValue({ id: "deal-1" })
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
        status: "SELECTED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})

      const result = await InsuranceService.requestInsuranceHelp("deal-1", "buyer-1")
      expect(result.newStatus).toBe("HELP_REQUESTED")
    })
  })

  describe("verifyInsuranceReadiness", () => {
    it("verifies insurance from CURRENT_INSURANCE_UPLOADED", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "CURRENT_INSURANCE_UPLOADED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})
      mockPrisma.insuranceUpload.updateMany.mockResolvedValue({ count: 1 })

      const result = await InsuranceService.verifyInsuranceReadiness("deal-1", "admin-1")
      expect(result.status).toBe("VERIFIED")
    })

    it("verifies insurance from UNDER_REVIEW", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "UNDER_REVIEW",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})
      mockPrisma.insuranceUpload.updateMany.mockResolvedValue({ count: 1 })

      const result = await InsuranceService.verifyInsuranceReadiness("deal-1", "admin-1")
      expect(result.status).toBe("VERIFIED")
      expect(mockPrisma.selectedDeal.update).toHaveBeenCalledWith({
        where: { id: "deal-1" },
        data: {
          insurance_readiness_status: "VERIFIED",
          delivery_block_flag: false,
        },
      })
    })

    it("rejects verification from NOT_STARTED", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "NOT_STARTED",
      })

      await expect(
        InsuranceService.verifyInsuranceReadiness("deal-1", "admin-1"),
      ).rejects.toThrow("Cannot verify insurance from status NOT_STARTED")
    })

    it("marks uploads as APPROVED with reviewer info", async () => {
      mockPrisma.selectedDeal.findUnique.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "CURRENT_INSURANCE_UPLOADED",
      })
      mockPrisma.selectedDeal.update.mockResolvedValue({})
      mockPrisma.insuranceUpload.updateMany.mockResolvedValue({ count: 2 })

      await InsuranceService.verifyInsuranceReadiness("deal-1", "admin-1")

      expect(mockPrisma.insuranceUpload.updateMany).toHaveBeenCalledWith({
        where: { dealId: "deal-1", status: { in: ["UPLOADED", "UNDER_REVIEW"] } },
        data: expect.objectContaining({
          reviewedBy: "admin-1",
          status: "APPROVED",
        }),
      })
    })
  })

  describe("getInsuranceReadinessStatus", () => {
    it("returns status and uploads for a deal", async () => {
      mockPrisma.selectedDeal.findFirst.mockResolvedValue({
        id: "deal-1",
        insurance_readiness_status: "CURRENT_INSURANCE_UPLOADED",
        delivery_block_flag: false,
        insuranceUploads: [
          {
            id: "upload-1",
            fileUrl: "https://example.com/file.pdf",
            fileType: "application/pdf",
            documentTag: "insurance_card",
            status: "UPLOADED",
            createdAt: new Date(),
          },
        ],
      })

      const result = await InsuranceService.getInsuranceReadinessStatus("deal-1", "buyer-1")
      expect(result.insuranceReadinessStatus).toBe("CURRENT_INSURANCE_UPLOADED")
      expect(result.uploads).toHaveLength(1)
      expect(result.uploads[0].documentTag).toBe("insurance_card")
    })

    it("throws when deal not found", async () => {
      mockPrisma.selectedDeal.findFirst.mockResolvedValue(null)

      await expect(
        InsuranceService.getInsuranceReadinessStatus("missing", "buyer-1"),
      ).rejects.toThrow("Deal not found or unauthorized")
    })
  })
})
