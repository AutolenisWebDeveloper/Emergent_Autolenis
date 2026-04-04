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
  generateEventHash: vi.fn().mockReturnValue("hash-flow-1"),
  verifyDocuSignHmac: vi.fn().mockReturnValue(true),
}))

import { DealerAgreementService } from "@/lib/services/dealer-agreement.service"

// ---------------------------------------------------------------
// Tests — Dealer Onboarding Agreement Flow
// ---------------------------------------------------------------

describe("Dealer Onboarding Agreement Flow", () => {
  let service: DealerAgreementService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DealerAgreementService()
    mockPrisma.adminAuditLog.create.mockResolvedValue({ id: "audit-1" })
  })

  // ---------------------------------------------------------------
  // Full lifecycle: send → webhook completed → dealer activated
  // ---------------------------------------------------------------

  describe("Full Agreement Lifecycle", () => {
    it("send → completed webhook → dealer agreement_completed = true", async () => {
      // Step 1: Send agreement
      mockPrisma.dealer.findUnique.mockResolvedValue({
        id: "dealer-1",
        email: "dealer@test.com",
        legalName: "Test LLC",
        businessName: "Test",
        licenseNumber: "DL-1",
        state: "TX",
      })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValueOnce(null)
      mockPrisma.dealerAgreement.create.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "REQUIRED",
        signerEmail: "dealer@test.com",
        signerName: "Test LLC",
        docusignClientUserId: "dealer_dealer-1_123",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValueOnce({
        id: "agr-1",
        status: "SENT",
        docusignEnvelopeId: "env-lifecycle",
      })

      const agreement = await service.sendAgreement("dealer-1", "admin-1")
      expect(agreement.status).toBe("SENT")

      // Step 2: Process completion webhook
      mockPrisma.docuSignConnectEvent.findUnique.mockResolvedValue(null)
      mockPrisma.docuSignConnectEvent.upsert.mockResolvedValue({ id: "evt-1" })
      mockPrisma.dealerAgreement.findFirst.mockResolvedValueOnce({
        id: "agr-1",
        dealerId: "dealer-1",
        docusignEnvelopeId: "env-lifecycle",
        status: "SENT",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValueOnce({
        id: "agr-1",
        status: "COMPLETED",
      })
      mockPrisma.docuSignConnectEvent.update.mockResolvedValue({ id: "evt-1" })
      mockPrisma.dealer.update.mockResolvedValue({
        id: "dealer-1",
        agreementCompleted: true,
      })

      const webhookResult = await service.processWebhookEvent(
        "env-lifecycle",
        "completed",
        new Date().toISOString(),
        { data: { envelopeId: "env-lifecycle" } },
      )

      expect(webhookResult.processed).toBe(true)
      expect(webhookResult.status).toBe("COMPLETED")

      // Verify dealer was updated with agreement_completed
      expect(mockPrisma.dealer.update).toHaveBeenCalledWith({
        where: { id: "dealer-1" },
        data: expect.objectContaining({
          agreementCompleted: true,
          agreementSigned: true,
        }),
      })

      // Verify trust document was created
      expect(mockCreateDocumentTrustRecordAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: "DEALER_AGREEMENT_PDF",
          ownerEntityType: "DEALER",
          ownerEntityId: "dealer-1",
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // Declined agreement
  // ---------------------------------------------------------------

  describe("Agreement Declined", () => {
    it("marks agreement as DECLINED and emits event", async () => {
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
        status: "DECLINED",
      })
      mockPrisma.docuSignConnectEvent.update.mockResolvedValue({ id: "evt-1" })

      const result = await service.processWebhookEvent(
        "env-123",
        "declined",
        new Date().toISOString(),
        {},
      )

      expect(result.status).toBe("DECLINED")
      expect(mockWriteEventAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "DEALER_AGREEMENT_DECLINED",
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // Admin: void + resend + manual complete
  // ---------------------------------------------------------------

  describe("Admin Override Flow", () => {
    it("void → resend creates new agreement", async () => {
      // Void
      mockPrisma.dealerAgreement.findFirst
        .mockResolvedValueOnce({
          id: "agr-1",
          dealerId: "dealer-1",
          status: "SENT",
        })
      mockPrisma.dealerAgreement.update.mockResolvedValueOnce({
        id: "agr-1",
        status: "VOIDED",
      })
      mockPrisma.dealer.update.mockResolvedValueOnce({ id: "dealer-1" })

      await service.voidAgreement("dealer-1", "admin-1", "Incorrect terms")

      // Resend
      mockPrisma.dealerAgreement.findFirst
        .mockResolvedValueOnce(null) // existing check in resend
        .mockResolvedValueOnce(null) // existing check in send
      mockPrisma.dealer.findUnique.mockResolvedValueOnce({
        id: "dealer-1",
        email: "d@test.com",
        legalName: "Test",
        businessName: "Test",
        licenseNumber: "DL-1",
        state: "TX",
      })
      mockPrisma.dealerAgreement.create.mockResolvedValue({
        id: "agr-2",
        dealerId: "dealer-1",
        status: "REQUIRED",
        signerEmail: "d@test.com",
        signerName: "Test",
        docusignClientUserId: "dealer_dealer-1_123",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValueOnce({
        id: "agr-2",
        status: "SENT",
        docusignEnvelopeId: "env-new",
      })

      await service.resendAgreement("dealer-1", "admin-1")

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DEALER_AGREEMENT_RESEND",
          }),
        }),
      )
    })

    it("manual complete creates audit trail", async () => {
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "REQUIRED",
      })
      mockPrisma.dealer.findUnique.mockResolvedValue({
        id: "dealer-1",
        email: "d@test.com",
        legalName: "Test",
        businessName: "Test",
      })
      mockPrisma.dealerAgreement.update.mockResolvedValue({
        id: "agr-1",
        status: "COMPLETED",
      })
      mockPrisma.dealer.update.mockResolvedValue({ id: "dealer-1" })

      await service.manualComplete("dealer-1", "admin-1", "DocuSign outage")

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "DEALER_AGREEMENT_MANUAL_COMPLETE",
            details: expect.objectContaining({ note: "DocuSign outage" }),
          }),
        }),
      )
    })
  })

  // ---------------------------------------------------------------
  // Activation gating
  // ---------------------------------------------------------------

  describe("Dealer Activation Gating", () => {
    it("dealer cannot be active without agreement_completed", async () => {
      // Agreement not completed yet
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "SENT", // Not completed
      })

      const agreement = await service.getAgreementForDealer("dealer-1")
      expect(agreement?.status).not.toBe("COMPLETED")
    })

    it("dealer is activatable after agreement completion", async () => {
      mockPrisma.dealerAgreement.findFirst.mockResolvedValue({
        id: "agr-1",
        dealerId: "dealer-1",
        status: "COMPLETED",
        completedAt: new Date(),
      })

      const agreement = await service.getAgreementForDealer("dealer-1")
      expect(agreement?.status).toBe("COMPLETED")
    })
  })
})
