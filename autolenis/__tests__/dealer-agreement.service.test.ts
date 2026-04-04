import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------
// Mocks — hoisted
// ---------------------------------------------------------------

const { mockPrisma, mockWriteEventAsync, mockCreateDocumentTrustRecordAsync, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    dealer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dealerAgreement: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    docuSignConnectEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
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
    DEALER_AGREEMENT_SENT: "DEALER_AGREEMENT_SENT",
    DEALER_AGREEMENT_VIEWED: "DEALER_AGREEMENT_VIEWED",
    DEALER_AGREEMENT_COMPLETED: "DEALER_AGREEMENT_COMPLETED",
    DEALER_AGREEMENT_DECLINED: "DEALER_AGREEMENT_DECLINED",
    DEALER_AGREEMENT_VOIDED: "DEALER_AGREEMENT_VOIDED",
  },
  EntityType: {
    DEALER_AGREEMENT: "DEALER_AGREEMENT",
  },
  ActorType: {
    SYSTEM: "SYSTEM",
    ADMIN: "ADMIN",
    WEBHOOK: "WEBHOOK",
  },
}))

vi.mock("@/lib/services/trust-infrastructure", () => ({
  createDocumentTrustRecordAsync: mockCreateDocumentTrustRecordAsync,
}))

vi.mock("@/lib/services/trust-infrastructure/types", () => ({
  OwnerEntityType: { DEALER: "DEALER" },
  AccessScope: { ADMIN_ONLY: "ADMIN_ONLY" },
}))

vi.mock("@/lib/services/docusign/envelope.service", () => ({
  createEnvelopeFromTemplate: vi.fn().mockResolvedValue({
    envelopeId: "env-123",
    status: "sent",
    uri: "/envelopes/env-123",
  }),
  downloadSignedDocument: vi.fn().mockResolvedValue(Buffer.from("fake-pdf")),
  voidEnvelope: vi.fn().mockResolvedValue({ envelopeId: "env-123" }),
}))

vi.mock("@/lib/security/webhook-hmac", () => ({
  generateEventHash: vi.fn().mockReturnValue("hash-123"),
  verifyDocuSignHmac: vi.fn().mockReturnValue(true),
}))

import { DealerAgreementService } from "@/lib/services/dealer-agreement.service"

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("DealerAgreementService", () => {
  let service: DealerAgreementService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DealerAgreementService()
    mockPrisma.adminAuditLog.create.mockResolvedValue({ id: "audit-1" })
  })

  // ---------------------------------------------------------------
  // sendAgreement
  // ---------------------------------------------------------------

  describe("sendAgreement", () => {
    it("creates agreement and sends DocuSign envelope", async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue({
        id: "dealer-1",
        email: "dealer@test.com",
        legalName: "Test Auto LLC",
        businessName: "Test Auto",
        licenseNumber: "DL-123",
        state: "TX",
      })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue(null)
      mockPrisma.dealerAgreement.create.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "REQUIRED",
        signerEmail: "dealer@test.com",
        signerName: "Test Auto LLC",
        docusignClientUserId: "dealer_dealer-1_123",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "SENT",
        docusignEnvelopeId: "env-123",
      })

      const result = await service.sendAgreement("dealer-1", "admin-1")

      expect(result.status).toBe("SENT")
      expect(result.docusignEnvelopeId).toBe("env-123")
      expect(mockPrisma.dealerAgreement.create).toHaveBeenCalled()
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_AGREEMENT_SENT",
          entityType: "DEALER_AGREEMENT",
        }),
      )
    })

    it("returns existing active agreement without sending new envelope", async () => {
      const existing = {
        id: "agr-existing",
        dealerId: "dealer-1",
        status: "SENT",
        docusignEnvelopeId: "env-existing",
      }
      mockPrisma.dealer.findUnique.mockResolvedValue({ id: "dealer-1" })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue(existing)

      const result = await service.sendAgreement("dealer-1", "admin-1")

      expect(result.id).toBe("agr-existing")
      expect(mockPrisma.dealerAgreement.create).not.toHaveBeenCalled()
    })

    it("throws if dealer not found", async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(null)

      await expect(service.sendAgreement("bad-id", "admin-1")).rejects.toThrow(
        "Dealer not found",
      )
    })
  })

  // ---------------------------------------------------------------
  // processWebhookEvent
  // ---------------------------------------------------------------

  describe("processWebhookEvent", () => {
    it("processes a completed event and stores artifacts", async () => {
      mockPrisma.docuSignConnectEvent.findUnique.mockResolvedValue(null)
      mockPrisma.docuSignConnectEvent.upsert.mockResolvedValue({ id: "evt-1" })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        docusignEnvelopeId: "env-123",
        status: "SENT",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({
        id: "agr-1",
        status: "COMPLETED",
      })
      mockPrisma.docuSignConnectEvent.update.mockResolvedValue({ id: "evt-1" })
      mockPrisma.dealer.update.mockResolvedValue({ id: "dealer-1" })

      const result = await service.processWebhookEvent(
        "env-123",
        "completed",
        new Date().toISOString(),
        { data: { envelopeId: "env-123" } },
      )

      expect(result.processed).toBe(true)
      expect(result.status).toBe("COMPLETED")
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_AGREEMENT_COMPLETED",
        }),
      )
    })

    it("skips already processed events (idempotent)", async () => {
      mockPrisma.docuSignConnectEvent.findUnique.mockResolvedValue({
        id: "evt-1",
        processed: true,
      })

      const result = await service.processWebhookEvent(
        "env-123",
        "completed",
        new Date().toISOString(),
        {},
      )

      expect(result.skipped).toBe(true)
      expect(mockPrisma.dealerAgreement.update).not.toHaveBeenCalled()
    })

    it("handles unknown envelope gracefully", async () => {
      mockPrisma.docuSignConnectEvent.findUnique.mockResolvedValue(null)
      mockPrisma.docuSignConnectEvent.upsert.mockResolvedValue({ id: "evt-1" })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue(null)
      mockPrisma.docuSignConnectEvent.update.mockResolvedValue({ id: "evt-1" })

      const result = await service.processWebhookEvent(
        "env-unknown",
        "completed",
        new Date().toISOString(),
        {},
      )

      expect(result.skipped).toBe(true)
      expect(result.reason).toBe("no_agreement")
    })

    it("maps sent status correctly", async () => {
      mockPrisma.docuSignConnectEvent.findUnique.mockResolvedValue(null)
      mockPrisma.docuSignConnectEvent.upsert.mockResolvedValue({ id: "evt-1" })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        docusignEnvelopeId: "env-123",
        status: "REQUIRED",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({ id: "agr-1", status: "SENT" })
      mockPrisma.docuSignConnectEvent.update.mockResolvedValue({ id: "evt-1" })

      const result = await service.processWebhookEvent(
        "env-123",
        "sent",
        new Date().toISOString(),
        {},
      )

      expect(result.processed).toBe(true)
      expect(result.status).toBe("SENT")
    })

    it("maps declined status correctly", async () => {
      mockPrisma.docuSignConnectEvent.findUnique.mockResolvedValue(null)
      mockPrisma.docuSignConnectEvent.upsert.mockResolvedValue({ id: "evt-1" })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        docusignEnvelopeId: "env-123",
        status: "SENT",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({ id: "agr-1", status: "DECLINED" })
      mockPrisma.docuSignConnectEvent.update.mockResolvedValue({ id: "evt-1" })

      const result = await service.processWebhookEvent(
        "env-123",
        "declined",
        new Date().toISOString(),
        {},
      )

      expect(result.processed).toBe(true)
      expect(result.status).toBe("DECLINED")
    })
  })

  // ---------------------------------------------------------------
  // voidAgreement
  // ---------------------------------------------------------------

  describe("voidAgreement", () => {
    it("voids active agreement and blocks dealer", async () => {
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "SENT",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({
        id: "agr-1",
        status: "VOIDED",
      })
      mockPrisma.dealer.update.mockResolvedValue({ id: "dealer-1" })

      const result = await service.voidAgreement("dealer-1", "admin-1", "Testing")

      expect(result.status).toBe("VOIDED")
      expect(mockPrisma.dealer.update).toHaveBeenCalledWith({
        where: { id: "dealer-1" },
        data: { docusignBlocked: true },
      })
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_AGREEMENT_VOIDED",
        }),
      )
    })

    it("throws if no active agreement", async () => {
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue(null)

      await expect(
        service.voidAgreement("dealer-1", "admin-1"),
      ).rejects.toThrow("No active agreement to void")
    })
  })

  // ---------------------------------------------------------------
  // manualComplete
  // ---------------------------------------------------------------

  describe("manualComplete", () => {
    it("marks agreement completed and unblocks dealer", async () => {
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "REQUIRED",
      })
      mockPrisma.dealer.findUnique.mockResolvedValue({
        id: "dealer-1",
        email: "test@dealer.com",
        legalName: "Test",
        businessName: "Test",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({
        id: "agr-1",
        status: "COMPLETED",
      })
      mockPrisma.dealer.update.mockResolvedValue({ id: "dealer-1" })

      const result = await service.manualComplete(
        "dealer-1",
        "admin-1",
        "DocuSign outage",
        "/path/to/signed.pdf",
      )

      expect(result.status).toBe("COMPLETED")
      expect(mockPrisma.dealer.update).toHaveBeenCalledWith({
        where: { id: "dealer-1" },
        data: expect.objectContaining({
          agreementCompleted: true,
          docusignBlocked: false,
        }),
      })
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_AGREEMENT_COMPLETED",
          payload: expect.objectContaining({ manual: true, note: "DocuSign outage" }),
        }),
      )
      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DEALER_AGREEMENT_MANUAL_COMPLETE",
          }),
        }),
      )
    })

    it("creates agreement record if none exists", async () => {
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue(null)
      mockPrisma.dealer.findUnique.mockResolvedValue({
        id: "dealer-1",
        email: "test@dealer.com",
        legalName: "Test",
        businessName: "Test",
      })
      mockPrisma.dealerAgreement.create.mockResolvedValue({
        id: "agr-new",
        dealerId: "dealer-1",
        status: "REQUIRED",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({
        id: "agr-new",
        status: "COMPLETED",
      })
      mockPrisma.dealer.update.mockResolvedValue({ id: "dealer-1" })

      const result = await service.manualComplete("dealer-1", "admin-1", "Emergency")

      expect(result.status).toBe("COMPLETED")
      expect(mockPrisma.dealerAgreement.create).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------
  // resendAgreement
  // ---------------------------------------------------------------

  describe("resendAgreement", () => {
    it("voids existing agreement and sends new one", async () => {
      // First call for void check
      mockPrisma.dealerAgreement.findFirst
        .mockResolvedValueOnce({
          id: "agr-old",
          dealerId: "dealer-1",
          status: "SENT",
        })
        // Second call for send (no existing active)
        .mockResolvedValueOnce(null)

      mockPrisma.dealerAgreement.update.mockResolvedValue({
        id: "agr-old",
        status: "VOIDED",
      })
      mockPrisma.dealer.findUnique.mockResolvedValue({
        id: "dealer-1",
        email: "dealer@test.com",
        legalName: "Test Auto LLC",
        businessName: "Test Auto",
        licenseNumber: "DL-123",
        state: "TX",
      })
      mockPrisma.dealerAgreement.create.mockResolvedValue({
        id: "agr-new",
        dealerId: "dealer-1",
        status: "REQUIRED",
        signerEmail: "dealer@test.com",
        signerName: "Test Auto LLC",
        docusignClientUserId: "dealer_dealer-1_123",
      })

      // For the update after envelope creation
      mockPrisma.dealerAgreement.update
        .mockResolvedValueOnce({ id: "agr-old", status: "VOIDED" })
        .mockResolvedValueOnce({
          id: "agr-new",
          status: "SENT",
          docusignEnvelopeId: "env-new",
        })

      const result = await service.resendAgreement("dealer-1", "admin-1")

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DEALER_AGREEMENT_RESEND",
          }),
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // getAgreementForDealer
  // ---------------------------------------------------------------

  describe("getAgreementForDealer", () => {
    it("returns latest agreement for dealer", async () => {
      const agreement = {
        id: "agr-1",
        dealerId: "dealer-1",
        status: "COMPLETED",
      }
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue(agreement)

      const result = await service.getAgreementForDealer("dealer-1")

      expect(result).toEqual(agreement)
      expect(mockPrisma.dealerAgreement.findFirst).toHaveBeenCalledWith({
        where: { dealerId: "dealer-1" },
        orderBy: { createdAt: "desc" },
      })
    })

    it("returns null when no agreement exists", async () => {
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue(null)

      const result = await service.getAgreementForDealer("dealer-1")

      expect(result).toBeNull()
    })
  })
})
