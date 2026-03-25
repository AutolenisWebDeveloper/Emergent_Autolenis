import { prisma } from "@/lib/db"
import { dealContextService } from "@/lib/services/deal-context.service"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"
import { createDocumentTrustRecordAsync, verifyDocument } from "@/lib/services/trust-infrastructure"
import { TrustDocumentType, OwnerEntityType, AccessScope, DocumentTrustStatus } from "@/lib/services/trust-infrastructure"
import {
  InsuranceReadinessStatus,
  INSURANCE_VALID_TRANSITIONS,
  isInsuranceVerifiedForDelivery,
  type InsuranceDocumentTag,
} from "@/lib/constants/insurance"

// Insurance provider interface for abstraction
interface InsuranceProviderAdapter {
  name: string
  requestQuotes(input: QuoteRequestInput): Promise<ProviderQuoteResponse[]>
  bindPolicy(quoteRef: string, effectiveDate: Date, applicant: ApplicantInfo): Promise<BindPolicyResponse>
}

interface QuoteRequestInput {
  applicant: ApplicantInfo
  vehicle: VehicleInfo
  coveragePreferences?: CoveragePreferences
}

interface ApplicantInfo {
  firstName: string
  lastName: string
  dateOfBirth: string
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
  }
  email?: string
  phone?: string
}

interface VehicleInfo {
  year: number
  make: string
  model: string
  trim?: string
  vin?: string
  isNew: boolean
}

interface CoveragePreferences {
  liabilityLimits?: string
  collisionDeductibleCents?: number
  comprehensiveDeductibleCents?: number
}

interface ProviderQuoteResponse {
  carrierName: string
  productName: string
  premiumMonthlyCents: number
  premiumSemiAnnualCents?: number
  premiumAnnualCents?: number
  coverageJson: Record<string, any>
  quoteRef: string
  validUntil?: Date
}

interface BindPolicyResponse {
  policyNumber: string
  carrierName: string
  effectiveDate: Date
  endDate?: Date
  documentUrl?: string
  rawResponse: Record<string, any>
}

// Default insurance provider adapter (returns estimated quotes; replace with real API integration)
class DefaultInsuranceProvider implements InsuranceProviderAdapter {
  name = "AutoLenis Partner Network"

  async requestQuotes(_input: QuoteRequestInput): Promise<ProviderQuoteResponse[]> {
    return []
  }

  async bindPolicy(_quoteRef: string, _effectiveDate: Date, _applicant: ApplicantInfo): Promise<BindPolicyResponse> {
    throw new Error("Insurance binding not available. Please contact support at info@autolenis.com.")
  }
}

// Get active provider
function getProvider(): InsuranceProviderAdapter {
  // Can be upgraded to load from insurance_providers table
  return new DefaultInsuranceProvider()
}

export class InsuranceService {
  // Log insurance event
  private static async logEvent(
    type: string,
    selectedDealId: string | null,
    userId: string | null,
    providerName: string | null,
    details: Record<string, any>,
  ) {
    await prisma.$executeRaw`
      INSERT INTO "insurance_events" ("id", "selected_deal_id", "user_id", "type", "provider_name", "details", "created_at")
      VALUES (gen_random_uuid()::text, ${selectedDealId}, ${userId}, ${type}, ${providerName}, ${JSON.stringify(details)}::jsonb, NOW())
    `
  }

  // Get insurance overview for a deal
  static async getInsuranceOverview(userId: string, dealId: string) {
    // Verify ownership
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: userId }, { buyerId: userId }],
      },
      include: {
        insurancePolicy: true,
      },
    })

    if (!deal) {
      throw new Error("Deal not found or unauthorized")
    }

    // Get quotes for this buyer
    const quotes = await prisma.insuranceQuote.findMany({
      where: { buyerId: deal.buyerId || userId },
      orderBy: { createdAt: "desc" },
    })

    // Get policies for this deal
    const policies = await prisma.insurancePolicy.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
    })

    return {
      selectedDeal: {
        id: deal.id,
        insuranceStatus: deal.insurance_status || "NOT_SELECTED",
      },
      quotes: quotes.map((q: any) => ({
        id: q.id,
        carrier: q.carrier,
        productName: q.productName,
        monthlyPremium: q.monthlyPremium,
        sixMonthPremium: q.sixMonthPremium,
        coverageLimits: q.coverageLimits,
        coverageJson: q.coverageJson,
        expiresAt: q.expiresAt,
        createdAt: q.createdAt,
      })),
      policies: policies.map((p: any) => ({
        id: p.id,
        carrier: p.carrier,
        policyNumber: p.policyNumber,
        vehicleVin: p.vehicleVin,
        effectiveDate: p.effectiveDate,
        expirationDate: p.expirationDate,
        documentUrl: p.documentUrl,
        isVerified: p.isVerified,
        status: p.status,
      })),
    }
  }

  // Request insurance quotes from provider
  static async requestQuotes(userId: string, dealId: string, coveragePreferences?: CoveragePreferences) {
    // Verify ownership and get deal details
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: userId }, { buyerId: userId }],
      },
      include: {
        auctionOffer: {
          include: {
            inventoryItem: true,
          },
        },
      },
    })

    if (!deal) {
      throw new Error("Deal not found or unauthorized")
    }

    // Get buyer profile
    const buyerProfile = await prisma.buyerProfile.findFirst({
      where: { userId },
    })

    if (!buyerProfile) {
      throw new Error("Buyer profile not found. Please complete your profile first.")
    }

    // Validate required profile fields
    if (!buyerProfile.firstName || !buyerProfile.lastName) {
      throw new Error("Please complete your name in your profile")
    }

    // Get vehicle info — works for both AUCTION and SOURCED deals
    let vehicle = deal.auctionOffer?.inventoryItem
    let inventoryItem = deal.auctionOffer?.inventoryItem

    // For sourced deals, hydrate vehicle info from DealContext
    if (!vehicle && deal.sourcedOfferId) {
      const ctx = await dealContextService.resolveDealContextForBuyer(userId, dealId)
      if (ctx?.vehicle) {
        // Sourced deals don't have a Vehicle record — construct compatible shape
        vehicle = {
          id: `sourced-${dealId}`,
          year: ctx.vehicle.year ?? 0,
          make: ctx.vehicle.make ?? "",
          model: ctx.vehicle.model ?? "",
          trim: ctx.vehicle.trim,
          vin: ctx.vehicle.vin,
        }
        inventoryItem = {
          vin: ctx.vehicle.vin,
          is_new: ctx.vehicle.condition === "NEW",
          isNew: ctx.vehicle.condition === "NEW",
        }
      }
    }

    if (!vehicle) {
      throw new Error("Vehicle information not found for this deal")
    }

    // Build applicant info
    const applicant: ApplicantInfo = {
      firstName: buyerProfile.firstName,
      lastName: buyerProfile.lastName,
      dateOfBirth: buyerProfile.dateOfBirth?.toISOString() || "",
      address: {
        line1: buyerProfile.address || "",
        line2: buyerProfile.address_line2 || buyerProfile.addressLine2 || undefined,
        city: buyerProfile.city || "",
        state: buyerProfile.state || "",
        postalCode: buyerProfile.postalCode || buyerProfile.zip || "",
      },
      phone: buyerProfile.phone || undefined,
    }

    // Build vehicle info
    const vehicleInfo: VehicleInfo = {
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim || undefined,
      vin: inventoryItem?.vin || vehicle.vin || undefined,
      isNew: inventoryItem?.is_new || inventoryItem?.isNew || false,
    }

    // Log quote request
    await this.logEvent("QUOTE_REQUESTED", dealId, userId, null, {
      applicant: { ...applicant, dateOfBirth: "[REDACTED]" },
      vehicle: vehicleInfo,
      coveragePreferences,
    })

    try {
      // Call provider
      const provider = getProvider()
      const providerQuotes = await provider.requestQuotes({
        applicant,
        vehicle: vehicleInfo,
        coveragePreferences,
      })

      const savedQuotes = await Promise.all(
        providerQuotes.map(async (quote) => {
          return prisma.insuranceQuote.create({
            data: {
              buyerId: userId,
              vehicleId: vehicle.id,
              carrier: quote.carrierName,
              coverageType: quote.productName || "FULL",
              monthlyPremium: quote.premiumMonthlyCents / 100,
              sixMonthPremium: quote.premiumSemiAnnualCents ? quote.premiumSemiAnnualCents / 100 : 0,
              coverageLimits: quote.coverageJson,
              deductibles: {},
              expiresAt: quote.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              productName: quote.productName,
              coverageJson: quote.coverageJson,
            },
          })
        }),
      )

      // Log success
      await this.logEvent("QUOTE_RECEIVED", dealId, userId, getProvider().name, {
        quoteCount: savedQuotes.length,
        carriers: savedQuotes.map((q) => q.carrier),
      })

      return savedQuotes.map((q) => ({
        id: q.id,
        carrier: q.carrier,
        productName: q.productName,
        monthlyPremium: q.monthlyPremium,
        sixMonthPremium: q.sixMonthPremium,
        coverageJson: q.coverageJson,
        expiresAt: q.expiresAt,
      }))
    } catch (error: any) {
      // Log failure
      await this.logEvent("QUOTE_FAILED", dealId, userId, null, {
        error: error.message,
      })
      throw new Error(`Failed to get insurance quotes: ${error.message}`)
    }
  }

  // Select a quote (AutoLenis path)
  static async selectQuote(userId: string, dealId: string, quoteId: string) {
    // Verify deal ownership
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: userId }, { buyerId: userId }],
      },
    })

    if (!deal) {
      throw new Error("Deal not found or unauthorized")
    }

    // Verify quote exists and belongs to this buyer
    const quote = await prisma.insuranceQuote.findUnique({
      where: { id: quoteId },
    })

    if (!quote || quote.buyerId !== userId) {
      throw new Error("Quote not found or does not belong to this buyer")
    }

    // Check if quote is expired
    if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
      throw new Error("This quote has expired. Please request new quotes.")
    }

    // Update deal insurance status
    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: { insurance_status: "SELECTED_AUTOLENIS" },
    })

    // Log event
    await this.logEvent("QUOTE_SELECTED", dealId, userId, null, {
      quoteId,
      carrier: quote.carrier,
      monthlyPremium: quote.monthlyPremium,
    })

    return {
      quoteId,
      carrier: quote.carrier,
      productName: quote.productName,
      monthlyPremium: quote.monthlyPremium,
      insuranceStatus: "SELECTED_AUTOLENIS",
    }
  }

  // Bind policy with provider (AutoLenis path)
  static async bindPolicy(userId: string, dealId: string, quoteId: string, effectiveDate: Date) {
    // Verify deal ownership (no AuctionOffer join needed — bindPolicy uses quote data only)
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: userId }, { buyerId: userId }],
      },
    })

    if (!deal) {
      throw new Error("Deal not found or unauthorized")
    }

    // Verify quote
    const quote = await prisma.insuranceQuote.findUnique({
      where: { id: quoteId },
    })

    if (!quote || quote.buyerId !== userId) {
      throw new Error("Quote not found or does not belong to this buyer")
    }

    // Check expiration
    if (quote.expiresAt && new Date(quote.expiresAt) < new Date()) {
      throw new Error("This quote has expired")
    }

    // Get buyer profile for bind request
    const buyerProfile = await prisma.buyerProfile.findFirst({
      where: { userId },
    })

    if (!buyerProfile) {
      throw new Error("Buyer profile not found")
    }

    const applicant: ApplicantInfo = {
      firstName: buyerProfile.firstName || "",
      lastName: buyerProfile.lastName || "",
      dateOfBirth: buyerProfile.dateOfBirth?.toISOString() || "",
      address: {
        line1: buyerProfile.address || "",
        city: buyerProfile.city || "",
        state: buyerProfile.state || "",
        postalCode: buyerProfile.postalCode || buyerProfile.zip || "",
      },
    }

    try {
      // Call provider to bind
      const provider = getProvider()
      const bindResult = await provider.bindPolicy(quoteId, effectiveDate, applicant)

      const policy = await prisma.insurancePolicy.create({
        data: {
          dealId,
          type: "AUTOLENIS",
          status: "BOUND",
          workspaceId: deal.workspaceId,
          carrier: bindResult.carrierName,
          policyNumber: bindResult.policyNumber,
          effectiveDate: bindResult.effectiveDate,
          expirationDate: bindResult.endDate,
          documentUrl: bindResult.documentUrl,
          rawPolicyJson: bindResult.rawResponse,
          coverageType: quote.productName || "FULL",
          monthlyPremium: quote.monthlyPremium,
        },
      })

      // Update deal status + ensure attachment (idempotent)
      await this.ensurePolicyAttachedToDeal(dealId, policy.id)

      // Log event
      await this.logEvent("POLICY_BOUND", dealId, userId, getProvider().name, {
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        carrier: policy.carrier,
        effectiveDate: bindResult.effectiveDate,
      })

      // Emit canonical platform event (non-blocking)
      writeEventAsync({
        eventType: PlatformEventType.INSURANCE_COMPLETED,
        entityType: EntityType.INSURANCE,
        entityId: policy.id,
        parentEntityId: dealId,
        actorId: userId,
        actorType: ActorType.BUYER,
        sourceModule: "insurance.service",
        correlationId: crypto.randomUUID(),
        idempotencyKey: `insurance-bound-${policy.id}`,
        payload: { carrier: policy.carrier, policyNumber: policy.policyNumber, type: "AUTOLENIS" },
      }).catch(() => { /* non-critical: do not block insurance flow */ })

      return {
        policyId: policy.id,
        policyNumber: policy.policyNumber,
        carrier: policy.carrier,
        effectiveDate: policy.effectiveDate,
        expirationDate: policy.expirationDate,
        documentUrl: policy.documentUrl,
        insuranceStatus: "BOUND",
      }
    } catch (error: any) {
      await this.logEvent("ERROR", dealId, userId, null, {
        action: "BIND_POLICY",
        error: error.message,
        quoteId,
      })
      throw new Error(`Failed to bind policy: ${error.message}`)
    }
  }

  // Upload external insurance proof
  static async uploadExternalProof(
    userId: string,
    dealId: string,
    carrierName: string,
    policyNumber: string,
    effectiveDate: Date,
    expirationDate: Date | null,
    documentUrl: string,
  ) {
    // Verify deal ownership
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: userId }, { buyerId: userId }],
      },
    })

    if (!deal) {
      throw new Error("Deal not found or unauthorized")
    }

    // Upsert policy
    const existingPolicy = await prisma.insurancePolicy.findFirst({
      where: { dealId, type: "EXTERNAL" },
    })

    let policy
    if (existingPolicy) {
      policy = await prisma.insurancePolicy.update({
        where: { id: existingPolicy.id },
        data: {
          carrier: carrierName,
          policyNumber,
          effectiveDate,
          expirationDate,
          documentUrl,
          status: "EXTERNAL_UPLOADED",
          isVerified: false, // Reset verification on update
        },
      })
    } else {
      policy = await prisma.insurancePolicy.create({
        data: {
          dealId,
          type: "EXTERNAL",
          status: "EXTERNAL_UPLOADED",
          workspaceId: deal.workspaceId,
          carrier: carrierName,
          policyNumber,
          effectiveDate,
          expirationDate,
          documentUrl,
          coverageType: "EXTERNAL",
          isVerified: false,
        },
      })
    }

    // Update deal status + ensure attachment (idempotent)
    await this.ensurePolicyAttachedToDeal(dealId, policy.id)

    // Log event
    await this.logEvent("POLICY_UPLOAD", dealId, userId, null, {
      policyId: policy.id,
      carrier: carrierName,
      policyNumber,
      documentUrl,
    })

    // Create document trust record for external insurance proof (non-blocking)
    createDocumentTrustRecordAsync({
      ownerEntityId: dealId,
      ownerEntityType: OwnerEntityType.DEAL,
      documentType: TrustDocumentType.INSURANCE_PROOF,
      storageSource: "EXTERNAL_UPLOAD",
      storageReference: documentUrl,
      uploaderId: userId,
      fileHash: `ext-ins-${dealId}-${Date.now()}`,
      accessScope: AccessScope.DEAL_PARTIES,
    }).catch(() => { /* non-critical: do not block insurance flow */ })

    // Emit canonical platform event (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.INSURANCE_COMPLETED,
      entityType: EntityType.INSURANCE,
      entityId: policy.id,
      parentEntityId: dealId,
      actorId: userId,
      actorType: ActorType.BUYER,
      sourceModule: "insurance.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `insurance-external-upload-${policy.id}`,
      payload: { carrier: carrierName, policyNumber, type: "EXTERNAL", documentUrl },
    }).catch(() => { /* non-critical: do not block insurance flow */ })

    return {
      policyId: policy.id,
      carrier: policy.carrier,
      policyNumber: policy.policyNumber,
      effectiveDate: policy.effectiveDate,
      expirationDate: policy.expirationDate,
      documentUrl: policy.documentUrl,
      isVerified: policy.isVerified,
      insuranceStatus: "EXTERNAL_PROOF_UPLOADED",
    }
  }

  // Dealer view (read-only)
  static async getDealerView(dealerId: string, dealId: string) {
    // Verify dealer owns this deal (using dealerId field on SelectedDeal)
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        dealerId: dealerId,
      },
      include: {
        insurancePolicy: true,
      },
    })

    if (!deal) {
      throw new Error("Deal not found or unauthorized")
    }

    const policy = deal.insurancePolicy

    return {
      insuranceStatus: deal.insurance_status || "NOT_SELECTED",
      policySummary: policy
        ? {
            type: policy.type || "AUTOLENIS",
            carrier: policy.carrier,
            policyNumber: policy.policyNumber,
            effectiveDate: policy.effectiveDate,
            expirationDate: policy.expirationDate,
          }
        : null,
    }
  }

  // Admin: Get full insurance detail
  static async getAdminFullDetail(dealId: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    // Get all quotes for this deal's buyer
    const quotes = await prisma.insuranceQuote.findMany({
      where: { buyerId: deal.buyerId },
      orderBy: { createdAt: "desc" },
    })

    // Get all policies
    const policies = await prisma.insurancePolicy.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
    })

    // Get events
    const eventsResult = await prisma.$queryRaw<any[]>`
      SELECT * FROM "insurance_events"
      WHERE "selected_deal_id" = ${dealId}
      ORDER BY "created_at" DESC
    `

    return {
      deal: {
        id: deal.id,
        insuranceStatus: deal.insurance_status,
        userId: deal.user_id || deal.buyerId,
      },
      quotes: quotes.map((q: any) => ({
        id: q.id,
        carrier: q.carrier,
        productName: q.productName,
        monthlyPremium: q.monthlyPremium,
        sixMonthPremium: q.sixMonthPremium,
        coverageJson: q.coverageJson,
        coverageLimits: q.coverageLimits,
        expiresAt: q.expiresAt,
        createdAt: q.createdAt,
      })),
      policies: policies.map((p: any) => ({
        id: p.id,
        type: p.type,
        carrier: p.carrier,
        policyNumber: p.policyNumber,
        vehicleVin: p.vehicleVin,
        effectiveDate: p.effectiveDate,
        expirationDate: p.expirationDate,
        documentUrl: p.documentUrl,
        rawPolicyJson: p.rawPolicyJson,
        isVerified: p.isVerified,
        status: p.status,
        createdAt: p.createdAt,
      })),
      events: eventsResult,
    }
  }

  // Admin: Verify external policy
  static async verifyExternalPolicy(adminUserId: string, dealId: string, policyId: string, verified: boolean) {
    // Verify policy belongs to deal and is EXTERNAL type
    const policy = await prisma.insurancePolicy.findFirst({
      where: {
        id: policyId,
        dealId,
        type: "EXTERNAL",
      },
    })

    if (!policy) {
      throw new Error("External policy not found for this deal")
    }

    // Update verification status and read back persisted state
    const updatedPolicy = await prisma.insurancePolicy.update({
      where: { id: policyId },
      data: { isVerified: verified },
    })

    // Log event
    await this.logEvent("POLICY_VERIFIED", dealId, adminUserId, null, {
      policyId,
      verified: updatedPolicy.isVerified,
      adminUserId,
    })

    // Emit canonical platform event (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.INSURANCE_COMPLETED,
      entityType: EntityType.INSURANCE,
      entityId: policyId,
      parentEntityId: dealId,
      actorId: adminUserId,
      actorType: ActorType.ADMIN,
      sourceModule: "insurance.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `insurance-verify-${policyId}-${updatedPolicy.isVerified}`,
      payload: { verified: updatedPolicy.isVerified, carrier: policy.carrier, policyNumber: policy.policyNumber },
    }).catch(() => { /* non-critical: do not block insurance flow */ })

    // If verified (per persisted state), update trust record for the insurance document
    if (updatedPolicy.isVerified && policy.documentUrl) {
      const trustRecord = await prisma.documentTrustRecord.findFirst({
        where: {
          ownerEntityId: dealId,
          documentType: TrustDocumentType.INSURANCE_PROOF,
          activeForDecision: true,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      if (trustRecord) {
        verifyDocument({
          documentId: trustRecord.id,
          verifierId: adminUserId,
          status: DocumentTrustStatus.APPROVED,
          verificationMetadata: { adminAction: "EXTERNAL_POLICY_VERIFICATION", policyId },
        })
      }
    }

    return {
      policyId,
      isVerified: updatedPolicy.isVerified,
      carrier: policy.carrier,
      policyNumber: policy.policyNumber,
    }
  }

  // Ensure a policy is attached to the deal (idempotent)
  static async ensurePolicyAttachedToDeal(dealId: string, policyId: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      include: { insurancePolicy: true },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    // Already attached – idempotent
    if (deal.insurancePolicy?.id === policyId) {
      return { attached: true, alreadyAttached: true }
    }

    // If no policy is attached yet, the InsurancePolicy.dealId already links them
    // via the 1-to-1 relation. Just ensure the deal status reflects it.
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id: policyId },
    })

    if (!policy) {
      throw new Error("Policy not found")
    }

    // Update deal status based on policy type
    const insuranceStatus =
      policy.type === "EXTERNAL"
        ? "EXTERNAL_PROOF_UPLOADED"
        : "BOUND"

    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: { insurance_status: insuranceStatus },
    })

    return { attached: true, alreadyAttached: false }
  }

  // Convenience aliases for audit compliance
  static async getQuotes(userId: string, dealId: string, coveragePreferences?: CoveragePreferences) {
    return InsuranceService.requestQuotes(userId, dealId, coveragePreferences)
  }

  static async selectPolicy(userId: string, dealId: string, quoteId: string) {
    return InsuranceService.selectQuote(userId, dealId, quoteId)
  }

  // ─── Insurance Readiness State Machine ─────────────────────────────────

  /** Deal statuses that represent the delivery stage (insurance must be verified) */
  private static readonly DELIVERY_STAGE_STATUSES = ["SIGNED", "PICKUP_SCHEDULED"]

  /**
   * Validate and persist an insurance readiness status transition.
   * Enforces the INSURANCE_VALID_TRANSITIONS map.
   */
  static async transitionInsuranceStatus(
    dealId: string,
    toStatus: InsuranceReadinessStatus,
  ): Promise<{ dealId: string; previousStatus: string; newStatus: string }> {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      select: { id: true, insurance_readiness_status: true, status: true },
    })
    if (!deal) throw new Error("Deal not found")

    const currentStatus = deal.insurance_readiness_status as InsuranceReadinessStatus
    const validTargets = INSURANCE_VALID_TRANSITIONS[currentStatus]
    if (!validTargets || !validTargets.includes(toStatus)) {
      throw new Error(
        `Invalid insurance status transition from ${currentStatus} to ${toStatus}`,
      )
    }

    // Compute delivery_block_flag: if deal is at a delivery stage and insurance is not verified.
    // NOTE: delivery_block_flag is only recomputed during insurance state transitions,
    // NOT during deal status transitions. If a deal moves to a delivery stage
    // (SIGNED, PICKUP_SCHEDULED) while insurance is NOT_STARTED, this flag will
    // remain false. The pickup service and decision engine use
    // isInsuranceVerifiedForDelivery() as defense-in-depth to catch this case.
    // A future enhancement could add a hook in the deal status transition service
    // to recompute this flag when a deal enters a delivery stage.
    const deliveryBlockFlag =
      InsuranceService.DELIVERY_STAGE_STATUSES.includes(deal.status) && !isInsuranceVerifiedForDelivery(toStatus)

    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: {
        insurance_readiness_status: toStatus,
        delivery_block_flag: deliveryBlockFlag,
      },
    })

    return {
      dealId,
      previousStatus: currentStatus,
      newStatus: toStatus,
    }
  }

  /**
   * Upload an insurance document and transition status to CURRENT_INSURANCE_UPLOADED.
   */
  static async uploadInsuranceDocument(
    dealId: string,
    buyerId: string,
    fileUrl: string,
    fileType: string,
    documentTag: InsuranceDocumentTag,
  ) {
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: buyerId }, { buyerId }],
      },
      select: { id: true, workspaceId: true, insurance_readiness_status: true },
    })
    if (!deal) throw new Error("Deal not found or unauthorized")

    // Store the upload record
    const upload = await prisma.insuranceUpload.create({
      data: {
        dealId,
        buyerId,
        workspaceId: deal.workspaceId,
        fileUrl,
        fileType,
        documentTag,
        status: "UPLOADED",
      },
    })

    // Transition status (from any valid source state)
    const currentStatus = deal.insurance_readiness_status as InsuranceReadinessStatus
    const target = InsuranceReadinessStatus.CURRENT_INSURANCE_UPLOADED
    const validTargets = INSURANCE_VALID_TRANSITIONS[currentStatus]
    if (validTargets && validTargets.includes(target)) {
      await prisma.selectedDeal.update({
        where: { id: dealId },
        data: { insurance_readiness_status: target },
      })
    }

    // Emit event (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.INSURANCE_COMPLETED,
      entityType: EntityType.INSURANCE,
      entityId: upload.id,
      parentEntityId: dealId,
      actorId: buyerId,
      actorType: ActorType.BUYER,
      sourceModule: "insurance.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `insurance-upload-${upload.id}`,
      payload: { documentTag, fileType, uploadId: upload.id },
    }).catch(() => {})

    return {
      uploadId: upload.id,
      status: target,
      documentTag,
    }
  }

  /**
   * Mark insurance as pending — buyer acknowledges it will be provided before delivery.
   */
  static async markInsurancePending(dealId: string, buyerId: string) {
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: buyerId }, { buyerId }],
      },
      select: { id: true },
    })
    if (!deal) throw new Error("Deal not found or unauthorized")

    return InsuranceService.transitionInsuranceStatus(dealId, "INSURANCE_PENDING")
  }

  /**
   * Request help with insurance.
   */
  static async requestInsuranceHelp(dealId: string, buyerId: string) {
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: buyerId }, { buyerId }],
      },
      select: { id: true },
    })
    if (!deal) throw new Error("Deal not found or unauthorized")

    return InsuranceService.transitionInsuranceStatus(dealId, "HELP_REQUESTED")
  }

  /**
   * Admin: Verify insurance and transition to VERIFIED.
   */
  static async verifyInsuranceReadiness(dealId: string, reviewerId: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      select: { id: true, insurance_readiness_status: true },
    })
    if (!deal) throw new Error("Deal not found")

    // Move to UNDER_REVIEW first if needed, then VERIFIED
    const current = deal.insurance_readiness_status as InsuranceReadinessStatus
    if (current !== "UNDER_REVIEW" && current !== "CURRENT_INSURANCE_UPLOADED") {
      throw new Error(
        `Cannot verify insurance from status ${current}. Must be CURRENT_INSURANCE_UPLOADED or UNDER_REVIEW.`,
      )
    }

    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: {
        insurance_readiness_status: InsuranceReadinessStatus.VERIFIED,
        delivery_block_flag: false,
      },
    })

    // Mark all uploads as APPROVED
    await prisma.insuranceUpload.updateMany({
      where: { dealId, status: { in: ["UPLOADED", "UNDER_REVIEW"] } },
      data: { reviewedBy: reviewerId, reviewedAt: new Date(), status: "APPROVED" },
    })

    writeEventAsync({
      eventType: PlatformEventType.INSURANCE_COMPLETED,
      entityType: EntityType.INSURANCE,
      entityId: dealId,
      parentEntityId: dealId,
      actorId: reviewerId,
      actorType: ActorType.ADMIN,
      sourceModule: "insurance.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `insurance-verify-readiness-${dealId}`,
      payload: { reviewerId, previousStatus: current, newStatus: "VERIFIED" },
    }).catch(() => {})

    return { dealId, status: "VERIFIED" }
  }

  /**
   * Get the current insurance readiness status and upload history for a deal.
   */
  static async getInsuranceReadinessStatus(dealId: string, buyerId: string) {
    const deal = await prisma.selectedDeal.findFirst({
      where: {
        id: dealId,
        OR: [{ user_id: buyerId }, { buyerId }],
      },
      select: {
        id: true,
        insurance_readiness_status: true,
        delivery_block_flag: true,
        insuranceUploads: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileUrl: true,
            fileType: true,
            documentTag: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })
    if (!deal) throw new Error("Deal not found or unauthorized")

    return {
      dealId: deal.id,
      insuranceReadinessStatus: deal.insurance_readiness_status,
      deliveryBlockFlag: deal.delivery_block_flag,
      uploads: deal.insuranceUploads,
    }
  }
}

export const insuranceService = new InsuranceService()
