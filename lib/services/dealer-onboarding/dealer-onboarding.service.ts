/**
 * Dealer Onboarding Service — Canonical Orchestration Layer
 *
 * Single orchestration layer for the entire dealer onboarding lifecycle.
 * All onboarding state transitions, document uploads, agreement handling,
 * and activation logic flow through this service.
 *
 * Do NOT spread onboarding state logic across route handlers.
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
import { docuSignService } from "./docusign.service"
import {
  DealerApplicationStatus,
  DealerAccessState,
  ALLOWED_STATUS_TRANSITIONS,
  getDealerDocStoragePath,
  type CreateApplicationInput,
  type DealerDocumentType,
} from "./types"
import crypto from "node:crypto"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCorrelationId(): string {
  return crypto.randomUUID()
}

function assertValidTransition(
  currentStatus: string,
  targetStatus: DealerApplicationStatus,
): void {
  const allowed =
    ALLOWED_STATUS_TRANSITIONS[currentStatus as DealerApplicationStatus] ?? []
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid status transition from ${currentStatus} to ${targetStatus}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DealerOnboardingService {
  // =========================================================================
  // 1. Application Lifecycle
  // =========================================================================

  /**
   * Create a new dealer application in DRAFT status.
   */
  async createApplication(input: CreateApplicationInput) {
    const application = await prisma.dealerApplication.create({
      data: {
        legalBusinessName: input.legalBusinessName,
        dbaName: input.dbaName || null,
        entityType: input.entityType || null,
        dealerLicenseNumber: input.dealerLicenseNumber,
        licenseState: input.licenseState,
        taxIdLast4: input.taxIdLast4 || null,
        businessEmail: input.businessEmail,
        businessPhone: input.businessPhone || null,
        websiteUrl: input.websiteUrl || null,
        addressLine1: input.addressLine1 || null,
        addressLine2: input.addressLine2 || null,
        city: input.city || null,
        state: input.state || null,
        zipCode: input.zipCode || null,
        principalName: input.principalName,
        principalEmail: input.principalEmail,
        principalPhone: input.principalPhone || null,
        applicantUserId: input.applicantUserId || null,
        workspaceId: input.workspaceId || null,
        status: DealerApplicationStatus.DRAFT,
        accessState: DealerAccessState.NO_ACCESS,
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_APPLICATION_CREATED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: application.id,
      actorId: input.applicantUserId || "SYSTEM",
      actorType: input.applicantUserId ? ActorType.DEALER : ActorType.SYSTEM,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: {
        legalBusinessName: input.legalBusinessName,
        dealerLicenseNumber: input.dealerLicenseNumber,
        licenseState: input.licenseState,
      },
    })

    return application
  }

  /**
   * Submit a DRAFT application for review.
   */
  async submitApplication(applicationId: string, actorId: string) {
    const application = await this.getApplicationOrThrow(applicationId)

    assertValidTransition(application.status, DealerApplicationStatus.SUBMITTED)

    const updated = await prisma.dealerApplication.update({
      where: { id: applicationId },
      data: {
        status: DealerApplicationStatus.SUBMITTED,
        accessState: DealerAccessState.LIMITED_ACCESS,
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_APPLICATION_SUBMITTED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: applicationId,
      actorId,
      actorType: ActorType.DEALER,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { legalBusinessName: application.legalBusinessName },
    })

    await this.logAdminAudit(null, "DEALER_APPLICATION_RECEIVED", {
      applicationId,
      legalBusinessName: application.legalBusinessName,
    })

    return updated
  }

  /**
   * Upload a dealer onboarding document (license, W-9, insurance, etc.).
   */
  async uploadDealerDocument(
    applicationId: string,
    docType: DealerDocumentType,
    filename: string,
    fileBuffer: Buffer,
    uploaderId: string,
  ) {
    const application = await this.getApplicationOrThrow(applicationId)

    // Only allow uploads in DRAFT, SUBMITTED, DOCS_REQUESTED, UNDER_REVIEW
    const uploadableStatuses: string[] = [
      DealerApplicationStatus.DRAFT,
      DealerApplicationStatus.SUBMITTED,
      DealerApplicationStatus.DOCS_REQUESTED,
      DealerApplicationStatus.UNDER_REVIEW,
    ]
    if (!uploadableStatuses.includes(application.status)) {
      throw new Error(`Cannot upload documents in status ${application.status}`)
    }

    const storagePath = getDealerDocStoragePath(applicationId, docType, filename)

    // Upload to Supabase Storage (service-side)
    const supabaseAdmin = getSupabase()
    const { error: uploadError } = await supabaseAdmin.storage
      .from("dealer-docs")
      .upload(storagePath, fileBuffer, {
        contentType: "application/octet-stream",
        upsert: true,
      })

    if (uploadError) {
      logger.error("Dealer document upload failed", {
        applicationId,
        docType,
        error: uploadError.message,
      })
      throw new Error(`Document upload failed: ${uploadError.message}`)
    }

    // Compute file hash for trust record
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex")

    // Create trusted document record
    await createDocumentTrustRecordAsync({
      ownerEntityId: applicationId,
      ownerEntityType: OwnerEntityType.DEALER_APPLICATION,
      documentType: docType,
      storageSource: "supabase",
      storageReference: storagePath,
      uploaderId,
      fileHash,
      accessScope: AccessScope.ADMIN_ONLY,
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_DOC_UPLOADED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: applicationId,
      actorId: uploaderId,
      actorType: ActorType.DEALER,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { docType, storagePath },
    })

    return { storagePath, fileHash }
  }

  /**
   * Admin requests more info / additional documents from dealer.
   */
  async requestMoreInfo(
    applicationId: string,
    notes: string,
    adminId: string,
  ) {
    const application = await this.getApplicationOrThrow(applicationId)

    assertValidTransition(application.status, DealerApplicationStatus.DOCS_REQUESTED)

    const updated = await prisma.dealerApplication.update({
      where: { id: applicationId },
      data: {
        status: DealerApplicationStatus.DOCS_REQUESTED,
        reviewNotes: notes,
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_INFO_REQUESTED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: applicationId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { notes },
    })

    await this.logAdminAudit(adminId, "DEALER_DOCS_REQUESTED", {
      applicationId,
      notes,
    })

    return updated
  }

  // =========================================================================
  // 2. Agreement Lifecycle
  // =========================================================================

  /**
   * Send dealer agreement via DocuSign.
   * Transitions status to AGREEMENT_SENT.
   */
  async sendDealerAgreement(applicationId: string, adminId: string) {
    const application = await this.getApplicationOrThrow(applicationId)

    assertValidTransition(application.status, DealerApplicationStatus.AGREEMENT_SENT)

    const result = await docuSignService.createEnvelopeForDealerApplication({
      applicationId,
      signerEmail: application.principalEmail,
      signerName: application.principalName,
      legalBusinessName: application.legalBusinessName,
      dealerLicenseNumber: application.dealerLicenseNumber,
      licenseState: application.licenseState,
    })

    const updated = await prisma.dealerApplication.update({
      where: { id: applicationId },
      data: {
        status: DealerApplicationStatus.AGREEMENT_SENT,
        agreementEnvelopeId: result.envelopeId,
        agreementSentAt: new Date(),
        agreementTemplateVersion: "1.0",
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_AGREEMENT_SENT,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: applicationId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { envelopeId: result.envelopeId },
    })

    await this.logAdminAudit(adminId, "DEALER_AGREEMENT_SENT", {
      applicationId,
      envelopeId: result.envelopeId,
    })

    return updated
  }

  /**
   * Handle DocuSign webhook — envelope completed.
   * Downloads signed PDF, stores in Supabase, creates trust record,
   * and advances status to AGREEMENT_SIGNED.
   */
  async handleDocusignEnvelopeCompleted(envelopeId: string) {
    // Find the application by envelope ID
    const application = await prisma.dealerApplication.findFirst({
      where: { agreementEnvelopeId: envelopeId },
    })

    if (!application) {
      logger.warn("DocuSign completed envelope not matched to application", { envelopeId })
      return null
    }

    // Idempotency: already signed
    if (application.agreementSignedAt) {
      logger.info("DocuSign envelope already processed", {
        applicationId: application.id,
        envelopeId,
      })
      return application
    }

    // Download the signed PDF
    const signedPdf = await docuSignService.downloadSignedDocument(envelopeId)

    // Store in Supabase private storage
    const storagePath = docuSignService.getAgreementStoragePath(
      application.id,
      envelopeId,
    )

    const supabaseAdmin = getSupabase()
    const { error: uploadError } = await supabaseAdmin.storage
      .from("contracts")
      .upload(storagePath, signedPdf, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      logger.error("Failed to store signed dealer agreement", {
        applicationId: application.id,
        envelopeId,
        error: uploadError.message,
      })
      throw new Error(`Agreement storage failed: ${uploadError.message}`)
    }

    // Create trusted document record
    const fileHash = crypto.createHash("sha256").update(signedPdf).digest("hex")

    const trustRecord = await createDocumentTrustRecordAsync({
      ownerEntityId: application.id,
      ownerEntityType: OwnerEntityType.DEALER_APPLICATION,
      documentType: "DEALER_AGREEMENT",
      storageSource: "supabase",
      storageReference: storagePath,
      uploaderId: "DOCUSIGN_WEBHOOK",
      fileHash,
      accessScope: AccessScope.ADMIN_ONLY,
    })

    // Update application
    const updated = await prisma.dealerApplication.update({
      where: { id: application.id },
      data: {
        status: DealerApplicationStatus.AGREEMENT_SIGNED,
        agreementSignedAt: new Date(),
        agreementStoragePath: storagePath,
        agreementDocumentId: trustRecord?.record?.id || null,
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_AGREEMENT_SIGNED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: application.id,
      actorId: "DOCUSIGN_WEBHOOK",
      actorType: ActorType.WEBHOOK,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { envelopeId, storagePath },
    })

    await this.logAdminAudit(null, "DEALER_AGREEMENT_COMPLETED", {
      applicationId: application.id,
      envelopeId,
      storagePath,
    })

    return updated
  }

  // =========================================================================
  // 3. Review & Decision
  // =========================================================================

  /**
   * Admin approves a dealer application.
   * Sets status to APPROVED and access_state to FULLY_ACTIVE.
   */
  async approveDealerApplication(applicationId: string, adminId: string) {
    const application = await this.getApplicationOrThrow(applicationId)

    assertValidTransition(application.status, DealerApplicationStatus.APPROVED)

    const updated = await prisma.dealerApplication.update({
      where: { id: applicationId },
      data: {
        status: DealerApplicationStatus.APPROVED,
        accessState: DealerAccessState.FULLY_ACTIVE,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_APPROVED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: applicationId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { legalBusinessName: application.legalBusinessName },
    })

    await this.logAdminAudit(adminId, "DEALER_APPLICATION_APPROVED", {
      applicationId,
      legalBusinessName: application.legalBusinessName,
    })

    return updated
  }

  /**
   * Admin rejects a dealer application.
   */
  async rejectDealerApplication(
    applicationId: string,
    adminId: string,
    reason: string,
  ) {
    const application = await this.getApplicationOrThrow(applicationId)

    assertValidTransition(application.status, DealerApplicationStatus.REJECTED)

    const updated = await prisma.dealerApplication.update({
      where: { id: applicationId },
      data: {
        status: DealerApplicationStatus.REJECTED,
        accessState: DealerAccessState.NO_ACCESS,
        rejectedBy: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_REJECTED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: applicationId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { reason },
    })

    await this.logAdminAudit(adminId, "DEALER_APPLICATION_REJECTED", {
      applicationId,
      reason,
    })

    return updated
  }

  // =========================================================================
  // 4. Activation
  // =========================================================================

  /**
   * Activate a dealer after approval.
   * Creates or finalizes the Dealer entity, ensures DealerUser mapping,
   * and sets full platform access.
   */
  async activateDealer(applicationId: string, adminId: string) {
    const application = await this.getApplicationOrThrow(applicationId)

    if (application.status !== DealerApplicationStatus.APPROVED) {
      throw new Error("Can only activate an APPROVED application")
    }

    let dealerId = application.dealerId

    // The real business/license data from the onboarding application
    const activationData = {
      businessName: application.legalBusinessName,
      legalName: application.legalBusinessName,
      licenseNumber: application.dealerLicenseNumber,
      phone: application.businessPhone || "",
      email: application.businessEmail,
      address: application.addressLine1 || "",
      addressLine2: application.addressLine2 || null,
      city: application.city || "",
      state: application.licenseState,
      zip: application.zipCode || "",
      country: "US",
      verified: true,
      active: true,
      onboardingStatus: DealerApplicationStatus.APPROVED,
      accessState: DealerAccessState.FULLY_ACTIVE,
      agreementSigned: !!application.agreementSignedAt,
      agreementSignedAt: application.agreementSignedAt,
      agreementDocumentId: application.agreementDocumentId,
      complianceApproved: true,
      complianceReviewedAt: new Date(),
      activatedAt: new Date(),
    }

    if (dealerId) {
      // Application already linked to a Dealer — update with real onboarding data
      await prisma.dealer.update({
        where: { id: dealerId },
        data: activationData,
      })
    } else if (application.applicantUserId) {
      // Check if a Dealer already exists for this user (created during signup)
      const existingDealer = await prisma.dealer.findUnique({
        where: { userId: application.applicantUserId },
      })

      if (existingDealer) {
        // Update the existing placeholder Dealer with real onboarding data
        await prisma.dealer.update({
          where: { id: existingDealer.id },
          data: activationData,
        })
        dealerId = existingDealer.id
      } else {
        // No Dealer exists yet — create one
        const dealer = await prisma.dealer.create({
          data: {
            userId: application.applicantUserId,
            workspaceId: application.workspaceId,
            ...activationData,
          },
        })
        dealerId = dealer.id
      }
    }

    // Ensure DealerUser mapping exists
    if (dealerId && application.applicantUserId) {
      const existingMapping = await prisma.dealerUser.findFirst({
        where: {
          userId: application.applicantUserId,
          dealerId,
        },
      })

      if (!existingMapping) {
        await prisma.dealerUser.create({
          data: {
            userId: application.applicantUserId,
            dealerId,
            roleLabel: "OWNER",
            isPrimary: true,
            inviteStatus: "accepted",
            workspaceId: application.workspaceId,
          },
        })
      }
    }

    // Link dealer to application
    await prisma.dealerApplication.update({
      where: { id: applicationId },
      data: { dealerId },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_ACTIVATED,
      entityType: EntityType.DEALER_APPLICATION,
      entityId: applicationId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: {
        dealerId,
        legalBusinessName: application.legalBusinessName,
      },
    })

    await this.logAdminAudit(adminId, "DEALER_ACCOUNT_ACTIVATED", {
      applicationId,
      dealerId,
    })

    return { dealerId, applicationId }
  }

  /**
   * Suspend a dealer.
   */
  async suspendDealer(dealerId: string, adminId: string, reason: string) {
    await prisma.dealer.update({
      where: { id: dealerId },
      data: {
        active: false,
        onboardingStatus: DealerApplicationStatus.SUSPENDED,
        accessState: DealerAccessState.SUSPENDED,
      },
    })

    const correlationId = generateCorrelationId()

    await writeEventAsync({
      eventType: PlatformEventType.DEALER_SUSPENDED,
      entityType: EntityType.DEALER,
      entityId: dealerId,
      actorId: adminId,
      actorType: ActorType.ADMIN,
      sourceModule: "DealerOnboardingService",
      correlationId,
      payload: { reason },
    })

    await this.logAdminAudit(adminId, "DEALER_ACCOUNT_SUSPENDED", {
      dealerId,
      reason,
    })

    return { dealerId, suspended: true }
  }

  // =========================================================================
  // 5. Read Operations
  // =========================================================================

  /**
   * Get a single application by ID.
   */
  async getApplication(applicationId: string) {
    return prisma.dealerApplication.findUnique({
      where: { id: applicationId },
    })
  }

  /**
   * Get application by applicant user ID.
   */
  async getApplicationByUserId(userId: string) {
    return prisma.dealerApplication.findFirst({
      where: { applicantUserId: userId },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * List applications for admin review queue.
   */
  async listApplications(filters?: {
    status?: string
    page?: number
    perPage?: number
  }) {
    const page = filters?.page || 1
    const perPage = filters?.perPage || 25
    const skip = (page - 1) * perPage

    const where = filters?.status ? { status: filters.status } : {}

    const [applications, total] = await Promise.all([
      prisma.dealerApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.dealerApplication.count({ where }),
    ])

    return {
      applications,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    }
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private async getApplicationOrThrow(applicationId: string) {
    const application = await prisma.dealerApplication.findUnique({
      where: { id: applicationId },
    })

    if (!application) {
      throw new Error(`Dealer application not found: ${applicationId}`)
    }

    return application
  }

  private async logAdminAudit(
    adminId: string | null,
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

export const dealerOnboardingService = new DealerOnboardingService()
