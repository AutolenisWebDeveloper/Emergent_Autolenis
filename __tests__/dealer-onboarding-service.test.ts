import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------
// Mocks — hoisted
// ---------------------------------------------------------------

const { mockPrisma, mockWriteEventAsync, mockCreateDocumentTrustRecordAsync, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    dealerApplication: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    dealer: {
      create: vi.fn(),
      update: vi.fn(),
    },
    dealerUser: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
  },
  mockWriteEventAsync: vi.fn().mockResolvedValue({ success: true }),
  mockCreateDocumentTrustRecordAsync: vi.fn().mockResolvedValue({ success: true, record: { id: "trust-doc-1" }, error: null }),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  getSupabase: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  }),
}))

vi.mock("@/lib/logger", () => ({ logger: mockLogger }))

vi.mock("@/lib/services/event-ledger", () => ({
  writeEventAsync: mockWriteEventAsync,
}))

vi.mock("@/lib/services/event-ledger/types", () => ({
  PlatformEventType: {
    DEALER_APPLICATION_CREATED: "DEALER_APPLICATION_CREATED",
    DEALER_APPLICATION_SUBMITTED: "DEALER_APPLICATION_SUBMITTED",
    DEALER_DOC_UPLOADED: "DEALER_DOC_UPLOADED",
    DEALER_INFO_REQUESTED: "DEALER_INFO_REQUESTED",
    DEALER_AGREEMENT_SENT: "DEALER_AGREEMENT_SENT",
    DEALER_AGREEMENT_SIGNED: "DEALER_AGREEMENT_SIGNED",
    DEALER_APPROVED: "DEALER_APPROVED",
    DEALER_REJECTED: "DEALER_REJECTED",
    DEALER_ACTIVATED: "DEALER_ACTIVATED",
    DEALER_SUSPENDED: "DEALER_SUSPENDED",
  },
  EntityType: {
    DEALER_APPLICATION: "DEALER_APPLICATION",
    DEALER: "DEALER",
  },
  ActorType: {
    BUYER: "BUYER",
    DEALER: "DEALER",
    ADMIN: "ADMIN",
    SYSTEM: "SYSTEM",
    WEBHOOK: "WEBHOOK",
  },
}))

vi.mock("@/lib/services/trust-infrastructure", () => ({
  createDocumentTrustRecordAsync: mockCreateDocumentTrustRecordAsync,
}))

vi.mock("@/lib/services/trust-infrastructure/types", () => ({
  OwnerEntityType: { DEALER: "DEALER", DEALER_APPLICATION: "DEALER_APPLICATION" },
  AccessScope: { ADMIN_ONLY: "ADMIN_ONLY" },
}))

vi.mock("@/lib/services/dealer-onboarding/docusign.service", () => ({
  docuSignService: {
    createEnvelopeForDealerApplication: vi.fn().mockResolvedValue({
      envelopeId: "env-123",
      status: "sent",
      sentAt: new Date().toISOString(),
    }),
    downloadSignedDocument: vi.fn().mockResolvedValue(Buffer.from("fake-pdf")),
    getAgreementStoragePath: vi.fn().mockReturnValue("contracts/dealer-agreements/app-1/env-123.pdf"),
  },
}))

import { DealerOnboardingService } from "@/lib/services/dealer-onboarding/dealer-onboarding.service"

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("DealerOnboardingService", () => {
  let service: DealerOnboardingService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DealerOnboardingService()
    mockPrisma.adminAuditLog.create.mockResolvedValue({ id: "audit-1" })
  })

  // ---------------------------------------------------------------
  // createApplication
  // ---------------------------------------------------------------

  describe("createApplication", () => {
    it("creates a DRAFT application and emits event", async () => {
      const fakeApp = {
        id: "app-1",
        legalBusinessName: "Test Dealer LLC",
        dealerLicenseNumber: "DL-12345",
        licenseState: "TX",
        businessEmail: "test@dealer.com",
        principalName: "John Doe",
        principalEmail: "john@dealer.com",
        status: "DRAFT",
        accessState: "NO_ACCESS",
      }
      mockPrisma.dealerApplication.create.mockResolvedValue(fakeApp)

      const result = await service.createApplication({
        legalBusinessName: "Test Dealer LLC",
        dealerLicenseNumber: "DL-12345",
        licenseState: "TX",
        businessEmail: "test@dealer.com",
        principalName: "John Doe",
        principalEmail: "john@dealer.com",
        applicantUserId: "user-1",
      })

      expect(result.id).toBe("app-1")
      expect(result.status).toBe("DRAFT")

      expect(mockPrisma.dealerApplication.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          legalBusinessName: "Test Dealer LLC",
          status: "DRAFT",
          accessState: "NO_ACCESS",
        }),
      })

      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_APPLICATION_CREATED",
          entityType: "DEALER_APPLICATION",
          entityId: "app-1",
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // submitApplication
  // ---------------------------------------------------------------

  describe("submitApplication", () => {
    it("transitions DRAFT → SUBMITTED", async () => {
      mockPrisma.dealerApplication.findUnique.mockResolvedValue({
        id: "app-1",
        status: "DRAFT",
        legalBusinessName: "Test Dealer",
      })
      mockPrisma.dealerApplication.update.mockResolvedValue({
        id: "app-1",
        status: "SUBMITTED",
        accessState: "LIMITED_ACCESS",
      })

      const result = await service.submitApplication("app-1", "user-1")

      expect(result.status).toBe("SUBMITTED")
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_APPLICATION_SUBMITTED",
        }),
      )
    })

    it("rejects invalid transitions", async () => {
      mockPrisma.dealerApplication.findUnique.mockResolvedValue({
        id: "app-1",
        status: "APPROVED",
        legalBusinessName: "Test Dealer",
      })

      await expect(
        service.submitApplication("app-1", "user-1"),
      ).rejects.toThrow("Invalid status transition")
    })
  })

  // ---------------------------------------------------------------
  // requestMoreInfo
  // ---------------------------------------------------------------

  describe("requestMoreInfo", () => {
    it("transitions UNDER_REVIEW → DOCS_REQUESTED", async () => {
      mockPrisma.dealerApplication.findUnique.mockResolvedValue({
        id: "app-1",
        status: "UNDER_REVIEW",
      })
      mockPrisma.dealerApplication.update.mockResolvedValue({
        id: "app-1",
        status: "DOCS_REQUESTED",
        reviewNotes: "Need W-9",
      })

      const result = await service.requestMoreInfo("app-1", "Need W-9", "admin-1")

      expect(result.status).toBe("DOCS_REQUESTED")
      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DEALER_DOCS_REQUESTED",
          }),
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // approveDealerApplication
  // ---------------------------------------------------------------

  describe("approveDealerApplication", () => {
    it("transitions COMPLIANCE_REVIEW → APPROVED and sets access FULLY_ACTIVE", async () => {
      mockPrisma.dealerApplication.findUnique.mockResolvedValue({
        id: "app-1",
        status: "COMPLIANCE_REVIEW",
        legalBusinessName: "Test Dealer",
      })
      mockPrisma.dealerApplication.update.mockResolvedValue({
        id: "app-1",
        status: "APPROVED",
        accessState: "FULLY_ACTIVE",
        approvedBy: "admin-1",
      })

      const result = await service.approveDealerApplication("app-1", "admin-1")

      expect(result.status).toBe("APPROVED")
      expect(mockPrisma.dealerApplication.update).toHaveBeenCalledWith({
        where: { id: "app-1" },
        data: expect.objectContaining({
          status: "APPROVED",
          accessState: "FULLY_ACTIVE",
          approvedBy: "admin-1",
        }),
      })
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_APPROVED",
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // rejectDealerApplication
  // ---------------------------------------------------------------

  describe("rejectDealerApplication", () => {
    it("transitions UNDER_REVIEW → REJECTED", async () => {
      mockPrisma.dealerApplication.findUnique.mockResolvedValue({
        id: "app-1",
        status: "UNDER_REVIEW",
      })
      mockPrisma.dealerApplication.update.mockResolvedValue({
        id: "app-1",
        status: "REJECTED",
        rejectionReason: "Incomplete docs",
      })

      const result = await service.rejectDealerApplication(
        "app-1",
        "admin-1",
        "Incomplete docs",
      )

      expect(result.status).toBe("REJECTED")
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_REJECTED",
          payload: { reason: "Incomplete docs" },
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // activateDealer
  // ---------------------------------------------------------------

  describe("activateDealer", () => {
    it("creates dealer entity and DealerUser when no existing dealer", async () => {
      mockPrisma.dealerApplication.findUnique.mockResolvedValue({
        id: "app-1",
        status: "APPROVED",
        dealerId: null,
        applicantUserId: "user-1",
        legalBusinessName: "Test Dealer LLC",
        dealerLicenseNumber: "DL-12345",
        licenseState: "TX",
        businessEmail: "test@dealer.com",
        businessPhone: "555-1234",
        addressLine1: "123 Main St",
        city: "Houston",
        zipCode: "77001",
        agreementSignedAt: new Date(),
        agreementDocumentId: "doc-1",
        workspaceId: null,
      })
      mockPrisma.dealer.create.mockResolvedValue({ id: "dealer-1" })
      mockPrisma.dealerUser.findFirst.mockResolvedValue(null)
      mockPrisma.dealerUser.create.mockResolvedValue({ id: "du-1" })
      mockPrisma.dealerApplication.update.mockResolvedValue({
        id: "app-1",
        dealerId: "dealer-1",
      })

      const result = await service.activateDealer("app-1", "admin-1")

      expect(result.dealerId).toBe("dealer-1")
      expect(mockPrisma.dealer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          businessName: "Test Dealer LLC",
          verified: true,
          active: true,
          onboardingStatus: "APPROVED",
          accessState: "FULLY_ACTIVE",
        }),
      })
      expect(mockPrisma.dealerUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          dealerId: "dealer-1",
          roleLabel: "OWNER",
          isPrimary: true,
        }),
      })
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_ACTIVATED",
        }),
      )
    })

    it("rejects activation if application is not APPROVED", async () => {
      mockPrisma.dealerApplication.findUnique.mockResolvedValue({
        id: "app-1",
        status: "SUBMITTED",
      })

      await expect(
        service.activateDealer("app-1", "admin-1"),
      ).rejects.toThrow("Can only activate an APPROVED application")
    })
  })

  // ---------------------------------------------------------------
  // suspendDealer
  // ---------------------------------------------------------------

  describe("suspendDealer", () => {
    it("suspends dealer and emits event", async () => {
      mockPrisma.dealer.update.mockResolvedValue({
        id: "dealer-1",
        active: false,
        onboardingStatus: "SUSPENDED",
      })

      const result = await service.suspendDealer("dealer-1", "admin-1", "Policy violation")

      expect(result.suspended).toBe(true)
      expect(mockPrisma.dealer.update).toHaveBeenCalledWith({
        where: { id: "dealer-1" },
        data: expect.objectContaining({
          active: false,
          onboardingStatus: "SUSPENDED",
          accessState: "SUSPENDED",
        }),
      })
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_SUSPENDED",
          payload: { reason: "Policy violation" },
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // handleDocusignEnvelopeCompleted
  // ---------------------------------------------------------------

  describe("handleDocusignEnvelopeCompleted", () => {
    it("processes completed envelope and updates application", async () => {
      mockPrisma.dealerApplication.findFirst.mockResolvedValue({
        id: "app-1",
        agreementEnvelopeId: "env-123",
        agreementSignedAt: null,
      })
      mockPrisma.dealerApplication.update.mockResolvedValue({
        id: "app-1",
        status: "AGREEMENT_SIGNED",
        agreementSignedAt: new Date(),
      })

      const result = await service.handleDocusignEnvelopeCompleted("env-123")

      expect(result).not.toBeNull()
      expect(result?.status).toBe("AGREEMENT_SIGNED")
      expect(mockCreateDocumentTrustRecordAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: "DEALER_AGREEMENT",
          ownerEntityType: "DEALER_APPLICATION",
        }),
      )
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_AGREEMENT_SIGNED",
        }),
      )
    })

    it("skips processing if already signed (idempotent)", async () => {
      mockPrisma.dealerApplication.findFirst.mockResolvedValue({
        id: "app-1",
        agreementEnvelopeId: "env-123",
        agreementSignedAt: new Date(),
      })

      const result = await service.handleDocusignEnvelopeCompleted("env-123")

      expect(result?.id).toBe("app-1")
      expect(mockPrisma.dealerApplication.update).not.toHaveBeenCalled()
    })

    it("returns null for unknown envelope", async () => {
      mockPrisma.dealerApplication.findFirst.mockResolvedValue(null)

      const result = await service.handleDocusignEnvelopeCompleted("env-unknown")

      expect(result).toBeNull()
    })
  })
})
