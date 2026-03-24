/**
 * Dealer Agreement Service — DocuSign-backed Agreement Orchestration
 *
 * Canonical service for the dealer participation agreement lifecycle.
 * Handles: creation, sending, embedded signing, webhook processing,
 * artifact storage, and completion gating.
 *
 * This service works alongside DealerOnboardingService but owns the
 * agreement-specific logic.
 */

import { prisma, getSupabase } from "@/lib/db"
import { logger } from "@/lib/logger"
import { writeEventAsync } from "@/lib/services/event-ledger"
import {
  PlatformEventType,
  EntityType,
  ActorType,
} from "@/lib/services/event-ledger/types"
import { createDocumentTrustRecordAsync } from "@/lib/services/trust-infrastructure"
import { OwnerEntityType, AccessScope } from "@/lib/services/trust-infrastructure/types"
import {
  createEnvelopeFromTemplate,
  voidEnvelope,
  downloadSignedDocument,
} from "@/lib/services/docusign/envelope.service"
import {
  DealerAgreementStatus,
  DOCUSIGN_STATUS_MAP,
  DEALER_AGREEMENT_VERSION,
  DEALER_AGREEMENT_NAME,
  DEALER_AGREEMENT_TYPE,
} from "@/lib/constants/docusign"
import { generateEventHash } from "@/lib/security/webhook-hmac"
import crypto from "node:crypto"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function correlationId(): string {
  return crypto.randomUUID()
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DealerAgreementService {
  // =========================================================================
  // 1. Send Agreement
  // =========================================================================

  /**
   * Create a dealer agreement record and send a DocuSign envelope.
   * Idempotent: if a non-completed agreement exists, reuse it.
   */
  async sendAgreement(dealerId: string, actorId: string) {
    // Fetch dealer
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } })
    if (!dealer) {
      throw new Error(`Dealer not found: ${dealerId}`)
    }

    // Check for existing active agreement
    const existing = await prisma.dealerAgreement.findFirst({
      where: {
        dealerId,
        status: {
          in: [
            DealerAgreementStatus.SENT,
            DealerAgreementStatus.DELIVERED,
            DealerAgreementStatus.VIEWED,
            DealerAgreementStatus.SIGNED,
          ],
        },
      },
    })

    if (existing) {
      return existing
    }

    // Create agreement record
    const clientUserId = `dealer_${dealerId}_${Date.now()}`
    const agreement = await prisma.dealerAgreement.create({
      data: {
        dealerId,
        version: DEALER_AGREEMENT_VERSION,
        agreementName: DEALER_AGREEMENT_NAME,
        agreementType: DEALER_AGREEMENT_TYPE,
        status: DealerAgreementStatus.REQUIRED,
        signerEmail: dealer.email || "",
        signerName: dealer.legalName || dealer.businessName,
        docusignClientUserId: clientUserId,
        createdBy: actorId,
      },
    })

    // Send envelope via DocuSign (canonical envelope service)
    const envelopeResult = await createEnvelopeFromTemplate({
      signerEmail: agreement.signerEmail,
      signerName: agreement.signerName,
      clientUserId: clientUserId,
      legalBusinessName: dealer.legalName || dealer.businessName,
      dealershipName: dealer.businessName,
      dealerLicenseNumber: dealer.licenseNumber,
      licenseState: dealer.state,
      dealerId: dealerId,
      agreementId: agreement.id,
    })

    // Update agreement with envelope metadata
    const updated = await prisma.dealerAgreement.update({
      where: { id: agreement.id },
      data: {
        status: DealerAgreementStatus.SENT,
        docusignEnvelopeId: envelopeResult.envelopeId,
        docusignAccountId: process.env.DOCUSIGN_ACCOUNT_ID || null,
        docusignTemplateId: process.env.DOCUSIGN_DEALER_TEMPLATE_ID || null,
        sentAt: new Date(),
        updatedBy: actorId,
      },
    })

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_AGREEMENT_SENT,
      entityType: EntityType.DEALER_AGREEMENT,
      entityId: agreement.id,
      parentEntityId: dealerId,
      actorId,
      actorType: ActorType.SYSTEM,
      sourceModule: "DealerAgreementService",
      correlationId: correlationId(),
      payload: { envelopeId: envelopeResult.envelopeId, dealerId },
    })

    return updated
  }

  // =========================================================================
  // 2. Embedded Signing View
  // =========================================================================

  /**
   * Generate an embedded signing URL for a dealer agreement.
   * The dealer signs within the AutoLenis portal using DocuSign recipient view.
   */
  async getSigningUrl(agreementId: string, returnUrl: string) {
    const agreement = await this.getAgreementOrThrow(agreementId)

    if (!agreement.docusignEnvelopeId) {
      throw new Error("Agreement has no DocuSign envelope")
    }

    const sentStatuses: string[] = [
      DealerAgreementStatus.SENT,
      DealerAgreementStatus.DELIVERED,
      DealerAgreementStatus.VIEWED,
    ]
    if (!sentStatuses.includes(agreement.status)) {
      throw new Error(`Cannot sign agreement in status: ${agreement.status}`)
    }

    const { createRecipientView } = await import("@/lib/services/docusign/recipient-view.service")

    const result = await createRecipientView({
      envelopeId: agreement.docusignEnvelopeId,
      signerEmail: agreement.signerEmail,
      signerName: agreement.signerName,
      clientUserId: agreement.docusignClientUserId || "",
      returnUrl,
    })

    return { url: result.url }
  }

  // =========================================================================
  // 3. Agreement Status
  // =========================================================================

  /**
   * Get the current agreement status for a dealer.
   */
  async getAgreementForDealer(dealerId: string) {
    return prisma.dealerAgreement.findFirst({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
    })
  }

  // =========================================================================
  // 4. Webhook Processing
  // =========================================================================

  /**
   * Process a DocuSign Connect webhook event.
   * Idempotent via event hash deduplication.
   */
  async processWebhookEvent(
    envelopeId: string,
    eventType: string,
    eventTime: string,
    payload: Record<string, unknown>,
  ) {
    // Idempotency: check if event already processed
    const eventHash = generateEventHash(envelopeId, eventType, eventTime)

    const existingEvent = await prisma.docuSignConnectEvent.findUnique({
      where: { eventHash },
    })

    if (existingEvent?.processed) {
      logger.info("DocuSign webhook event already processed", { eventHash, envelopeId })
      return { skipped: true }
    }

    // Insert event into ledger
    const connectEvent = await prisma.docuSignConnectEvent.upsert({
      where: { eventHash },
      create: {
        eventHash,
        envelopeId,
        eventType,
        eventTime: new Date(eventTime),
        payload: JSON.parse(JSON.stringify(payload)),
      },
      update: {},
    })

    // Find agreement by envelope ID
    const agreement = await prisma.dealerAgreement.findFirst({
      where: { docusignEnvelopeId: envelopeId },
    })

    if (!agreement) {
      logger.warn("DocuSign webhook: no agreement found for envelope", { envelopeId })
      await prisma.docuSignConnectEvent.update({
        where: { id: connectEvent.id },
        data: {
          processed: true,
          processedAt: new Date(),
          processingError: "No matching agreement found",
        },
      })
      return { skipped: true, reason: "no_agreement" }
    }

    // Map DocuSign status to agreement status
    const mappedStatus = DOCUSIGN_STATUS_MAP[eventType]
    if (!mappedStatus) {
      await prisma.docuSignConnectEvent.update({
        where: { id: connectEvent.id },
        data: { processed: true, processedAt: new Date() },
      })
      return { skipped: true, reason: "unmapped_event" }
    }

    // Update agreement status and timestamps
    const updateData: Record<string, unknown> = {
      status: mappedStatus,
      lastWebhookAt: new Date(),
      webhookStatus: eventType,
      webhookPayload: JSON.parse(JSON.stringify(payload)),
    }

    const now = new Date()
    const eventTimestamp = eventTime ? new Date(eventTime) : now
    if (mappedStatus === DealerAgreementStatus.SENT && !agreement.sentAt) updateData.sentAt = eventTimestamp
    if (mappedStatus === DealerAgreementStatus.DELIVERED) updateData.deliveredAt = eventTimestamp
    if (mappedStatus === DealerAgreementStatus.COMPLETED) {
      updateData.completedAt = eventTimestamp
      updateData.signedAt = eventTimestamp
    }
    if (mappedStatus === DealerAgreementStatus.DECLINED) updateData.voidedAt = eventTimestamp
    if (mappedStatus === DealerAgreementStatus.VOIDED) updateData.voidedAt = eventTimestamp

    await prisma.dealerAgreement.update({
      where: { id: agreement.id },
      data: updateData,
    })

    // Emit platform event
    const platformEventType = this.mapToPlatformEvent(mappedStatus)
    if (platformEventType) {
      await writeEventAsync({
        eventType: platformEventType,
        entityType: EntityType.DEALER_AGREEMENT,
        entityId: agreement.id,
        parentEntityId: agreement.dealerId,
        actorId: "DOCUSIGN_CONNECT",
        actorType: ActorType.WEBHOOK,
        sourceModule: "DealerAgreementService",
        correlationId: correlationId(),
        payload: { envelopeId, eventType, dealerId: agreement.dealerId },
      })
    }

    // If completed, download and store artifacts
    if (mappedStatus === DealerAgreementStatus.COMPLETED) {
      await this.handleCompletion(agreement.id, agreement.dealerId, envelopeId)
    }

    // Mark event as processed
    await prisma.docuSignConnectEvent.update({
      where: { id: connectEvent.id },
      data: { processed: true, processedAt: new Date() },
    })

    return { processed: true, agreementId: agreement.id, status: mappedStatus }
  }

  // =========================================================================
  // 5. Completion Handling
  // =========================================================================

  /**
   * Handle agreement completion:
   * - Download signed PDF + certificate
   * - Store in Supabase private bucket
   * - Create trusted document records
   * - Update dealer agreement_completed flags
   */
  private async handleCompletion(
    agreementId: string,
    dealerId: string,
    envelopeId: string,
  ) {
    try {
      // Download signed PDF (canonical envelope service)
      const signedPdf = await downloadSignedDocument(envelopeId)

      const supabaseAdmin = getSupabase()

      // Store signed document
      const signedPath = `dealer/${dealerId}/agreements/${agreementId}/signed.pdf`
      const { error: uploadError } = await supabaseAdmin.storage
        .from("dealer-agreements")
        .upload(signedPath, signedPdf, {
          contentType: "application/pdf",
          upsert: true,
        })

      if (uploadError) {
        logger.error("Failed to store signed agreement", { agreementId, error: uploadError.message })
      }

      // Create file hash for trust record
      const fileHash = crypto.createHash("sha256").update(signedPdf).digest("hex")

      // Write trusted document records (non-blocking — trusted_documents is optional)
      try {
        await createDocumentTrustRecordAsync({
          ownerEntityId: dealerId,
          ownerEntityType: OwnerEntityType.DEALER,
          documentType: "DEALER_AGREEMENT_PDF",
          storageSource: "supabase",
          storageReference: signedPath,
          uploaderId: "DOCUSIGN_CONNECT",
          fileHash,
          accessScope: AccessScope.ADMIN_ONLY,
        })
      } catch (trustErr) {
        // trusted_documents is optional — do not block completion on failure
        logger.warn("Trusted document record creation failed (non-blocking)", {
          agreementId,
          error: trustErr,
        })
      }

      // Update agreement with storage paths
      await prisma.dealerAgreement.update({
        where: { id: agreementId },
        data: {
          signedDocumentStoragePath: signedPath,
        },
      })

      // Mark dealer as agreement completed
      await prisma.dealer.update({
        where: { id: dealerId },
        data: {
          agreementCompleted: true,
          agreementCompletedAt: new Date(),
          agreementSigned: true,
          agreementSignedAt: new Date(),
          onboardingStatus: "AGREEMENT_COMPLETED",
        },
      })

      logger.info("Dealer agreement completion processed", { agreementId, dealerId })
    } catch (err) {
      logger.error("Agreement completion handling failed", {
        agreementId,
        dealerId,
        error: err,
      })
    }
  }

  // =========================================================================
  // 6. Admin Actions
  // =========================================================================

  /**
   * Resend agreement: void the old envelope and create a new one.
   */
  async resendAgreement(dealerId: string, adminId: string) {
    // Void existing agreement if present
    const existing = await prisma.dealerAgreement.findFirst({
      where: {
        dealerId,
        status: {
          in: [
            DealerAgreementStatus.SENT,
            DealerAgreementStatus.DELIVERED,
            DealerAgreementStatus.VIEWED,
          ],
        },
      },
    })

    if (existing) {
      // Void the existing DocuSign envelope
      if (existing.docusignEnvelopeId) {
        try {
          await voidEnvelope(existing.docusignEnvelopeId, "Resending agreement")
        } catch (err) {
          logger.warn("Failed to void old DocuSign envelope on resend", {
            envelopeId: existing.docusignEnvelopeId,
            error: err,
          })
        }
      }

      await prisma.dealerAgreement.update({
        where: { id: existing.id },
        data: {
          status: DealerAgreementStatus.VOIDED,
          voidedAt: new Date(),
          updatedBy: adminId,
        },
      })
    }

    // Send new agreement
    const result = await this.sendAgreement(dealerId, adminId)

    await this.logAdminAudit(adminId, "DEALER_AGREEMENT_RESEND", {
      dealerId,
      previousAgreementId: existing?.id || null,
      newAgreementId: result.id,
    })

    return result
  }

  /**
   * Void an active agreement envelope.
   */
  async voidAgreement(dealerId: string, adminId: string, reason?: string) {
    const agreement = await prisma.dealerAgreement.findFirst({
      where: {
        dealerId,
        status: {
          in: [
            DealerAgreementStatus.SENT,
            DealerAgreementStatus.DELIVERED,
            DealerAgreementStatus.VIEWED,
            DealerAgreementStatus.SIGNED,
          ],
        },
      },
    })

    if (!agreement) {
      throw new Error("No active agreement to void")
    }

    // Void the DocuSign envelope if it exists
    if (agreement.docusignEnvelopeId) {
      try {
        await voidEnvelope(agreement.docusignEnvelopeId, reason || "Admin voided")
      } catch (err) {
        logger.warn("Failed to void DocuSign envelope (may already be voided)", {
          envelopeId: agreement.docusignEnvelopeId,
          error: err,
        })
      }
    }

    const updated = await prisma.dealerAgreement.update({
      where: { id: agreement.id },
      data: {
        status: DealerAgreementStatus.VOIDED,
        voidedAt: new Date(),
        updatedBy: adminId,
      },
    })

    // Mark dealer blocked until corrected
    await prisma.dealer.update({
      where: { id: dealerId },
      data: { docusignBlocked: true },
    })

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_AGREEMENT_VOIDED,
      entityType: EntityType.DEALER_AGREEMENT,
      entityId: agreement.id,
      parentEntityId: dealerId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerAgreementService",
      correlationId: correlationId(),
      payload: { reason: reason || "Admin voided", dealerId },
    })

    await this.logAdminAudit(adminId, "DEALER_AGREEMENT_VOID", {
      dealerId,
      agreementId: agreement.id,
      reason,
    })

    return updated
  }

  /**
   * Admin manual complete — emergency override.
   * Requires admin note and creates full audit trail.
   */
  async manualComplete(
    dealerId: string,
    adminId: string,
    note: string,
    signedDocumentPath?: string,
  ) {
    // Find or create agreement record
    let agreement = await prisma.dealerAgreement.findFirst({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
    })

    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } })
    if (!dealer) throw new Error("Dealer not found")

    if (!agreement) {
      agreement = await prisma.dealerAgreement.create({
        data: {
          dealerId,
          version: DEALER_AGREEMENT_VERSION,
          agreementName: DEALER_AGREEMENT_NAME,
          agreementType: DEALER_AGREEMENT_TYPE,
          status: DealerAgreementStatus.REQUIRED,
          signerEmail: dealer.email || "",
          signerName: dealer.legalName || dealer.businessName,
          createdBy: adminId,
        },
      })
    }

    const updated = await prisma.dealerAgreement.update({
      where: { id: agreement.id },
      data: {
        status: DealerAgreementStatus.COMPLETED,
        completedAt: new Date(),
        signedAt: new Date(),
        signedDocumentStoragePath: signedDocumentPath || null,
        updatedBy: adminId,
      },
    })

    // Mark dealer as agreement completed
    await prisma.dealer.update({
      where: { id: dealerId },
      data: {
        agreementCompleted: true,
        agreementCompletedAt: new Date(),
        agreementSigned: true,
        agreementSignedAt: new Date(),
        docusignBlocked: false,
      },
    })

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_AGREEMENT_COMPLETED,
      entityType: EntityType.DEALER_AGREEMENT,
      entityId: agreement.id,
      parentEntityId: dealerId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerAgreementService",
      correlationId: correlationId(),
      payload: { manual: true, note, dealerId },
    })

    await this.logAdminAudit(adminId, "DEALER_AGREEMENT_MANUAL_COMPLETE", {
      dealerId,
      agreementId: agreement.id,
      note,
      signedDocumentPath,
    })

    return updated
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private async getAgreementOrThrow(agreementId: string) {
    const agreement = await prisma.dealerAgreement.findUnique({
      where: { id: agreementId },
    })
    if (!agreement) {
      throw new Error(`Agreement not found: ${agreementId}`)
    }
    return agreement
  }

  private mapToPlatformEvent(
    status: DealerAgreementStatus,
  ): PlatformEventType | null {
    switch (status) {
      case DealerAgreementStatus.SENT:
        return PlatformEventType.DEALER_AGREEMENT_SENT
      case DealerAgreementStatus.VIEWED:
        return PlatformEventType.DEALER_AGREEMENT_VIEWED
      case DealerAgreementStatus.COMPLETED:
        return PlatformEventType.DEALER_AGREEMENT_COMPLETED
      case DealerAgreementStatus.DECLINED:
        return PlatformEventType.DEALER_AGREEMENT_DECLINED
      case DealerAgreementStatus.VOIDED:
        return PlatformEventType.DEALER_AGREEMENT_VOIDED
      default:
        return null
    }
  }

  private async logAdminAudit(
    adminId: string,
    action: string,
    details: Record<string, unknown>,
    workspaceId?: string | null,
  ) {
    try {
      await prisma.adminAuditLog.create({
        data: {
          userId: adminId,
          action,
          details,
          workspaceId: workspaceId ?? null, // FIX 16
        },
      })
    } catch (err) {
      logger.error("Failed to write admin audit log", { action, error: err })
    }
  }
}

export const dealerAgreementService = new DealerAgreementService()
